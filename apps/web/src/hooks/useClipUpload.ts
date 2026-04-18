'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { extractThumbnail, getVideoMetadata } from '@/lib/video-thumbnail';
import type { VideoMetadata, VideoThumbnail } from '@/lib/video-thumbnail';
import { uploadBlobToWalrus } from '@/lib/walrus';
import { buildCreateClipTx } from '@/lib/sui';
import {
  parseTags,
  uploadFormSchema,
  type UploadFormValues,
} from '@/lib/validation/upload-schema';
import {
  ACCEPTED_VIDEO_MIME_TYPES,
  CLIP_LIMITS,
  type ClipVisibility,
} from '@/types/clip';

export interface UseClipUploadResult {
  form: UseFormReturn<UploadFormValues>;
  file: File | null;
  videoUrl: string | null;
  metadata: VideoMetadata | null;
  thumbnail: VideoThumbnail | null;
  visibility: ClipVisibility;

  isProcessing: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  canSubmit: boolean;

  onFileSelected: (file: File | null) => Promise<void>;
  clearFile: () => void;

  onSubmit: (values: UploadFormValues) => Promise<void>;
}

function validateFile(file: File): string | null {
  const acceptedMimeTypes: readonly string[] = ACCEPTED_VIDEO_MIME_TYPES;
  if (!acceptedMimeTypes.includes(file.type) && !file.type.startsWith('video/')) {
    return 'Please select a supported video file (mp4, mov, webm).';
  }
  if (file.size > CLIP_LIMITS.maxSizeBytes) {
    return `Video must be under ${Math.round(
      CLIP_LIMITS.maxSizeBytes / (1024 * 1024)
    )} MB.`;
  }
  return null;
}

export function useClipUpload(): UseClipUploadResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      tagsInput: '',
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(null);
  const [visibility] = useState<ClipVisibility>('public');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const videoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const resetFileState = useCallback(() => {
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setThumbnail(null);
    setValidationError(null);
  }, []);

  const clearFile = useCallback(() => {
    resetFileState();
    form.reset({ title: '', description: '', tagsInput: '' });
  }, [resetFileState, form]);

  const onFileSelected = useCallback(
    async (nextFile: File | null) => {
      if (!nextFile) {
        resetFileState();
        return;
      }

      const fileError = validateFile(nextFile);
      if (fileError) {
        setValidationError(fileError);
        toast.error(fileError);
        return;
      }

      setIsProcessing(true);
      setValidationError(null);

      try {
        const nextUrl = URL.createObjectURL(nextFile);
        if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = nextUrl;

        const probed = await getVideoMetadata(nextFile);
        if (probed.durationSeconds > CLIP_LIMITS.maxDurationSeconds) {
          const message = `Clips must be ${CLIP_LIMITS.maxDurationSeconds} seconds or shorter.`;
          setValidationError(message);
          toast.error(message);
          URL.revokeObjectURL(nextUrl);
          videoUrlRef.current = null;
          setIsProcessing(false);
          return;
        }

        const frame = await extractThumbnail(nextFile);

        setFile(nextFile);
        setVideoUrl(nextUrl);
        setMetadata(probed);
        setThumbnail(frame);
      } catch (error) {
        console.error('[upload] failed to process video', error);
        toast.error('Could not read this video file. Try another clip.');
        setValidationError('Could not read this video file.');
      } finally {
        setIsProcessing(false);
      }
    },
    [resetFileState]
  );

  const canSubmit =
    Boolean(file) &&
    Boolean(thumbnail) &&
    Boolean(metadata) &&
    !isProcessing &&
    !isSubmitting;

  const onSubmit = useCallback(
    async (values: UploadFormValues) => {
      if (!file || !thumbnail || !metadata) return;

      if (!account) {
        toast.error('Connect your wallet before publishing a clip.');
        return;
      }

      setIsSubmitting(true);
      const submitToast = toast.loading('Uploading clip to Walrus…');

      try {
        const [videoUpload, thumbUpload] = await Promise.all([
          uploadBlobToWalrus(file),
          uploadBlobToWalrus(thumbnail.blob),
        ]);

        toast.loading('Publishing on Sui…', { id: submitToast });

        const tx = buildCreateClipTx({
          title: values.title.trim(),
          description: values.description.trim(),
          tags: parseTags(values.tagsInput),
          blobId: videoUpload.blobId,
          thumbnailBlobId: thumbUpload.blobId,
          durationSeconds: Math.max(1, Math.round(metadata.durationSeconds)),
          visibility,
        });

        // TODO(sponsor): swap to sponsored tx once the gas station is wired up.
        await signAndExecute({ transaction: tx });

        await queryClient.invalidateQueries({ queryKey: ['public-clips'] });

        toast.success('Clip published!', { id: submitToast });
        clearFile();
        router.push('/dashboard/discover');
      } catch (error) {
        console.error('[upload] failed to publish clip', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Could not publish your clip. Please try again.';
        toast.error(message, { id: submitToast });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      file,
      thumbnail,
      metadata,
      visibility,
      account,
      signAndExecute,
      queryClient,
      clearFile,
      router,
    ]
  );

  return {
    form,
    file,
    videoUrl,
    metadata,
    thumbnail,
    visibility,
    isProcessing,
    isSubmitting,
    validationError,
    canSubmit,
    onFileSelected,
    clearFile,
    onSubmit,
  };
}
