'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import {
  extractThumbnail,
  extractFramesAtIntervals,
  getVideoMetadata,
} from '@/lib/video-thumbnail';
import type {
  VideoMetadata,
  VideoThumbnail,
  VideoFrame,
} from '@/lib/video-thumbnail';
import { uploadBlobToWalrus } from '@/lib/walrus';
import { buildCreateClipTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import { SUI_STREAM_MODULE, SUI_STREAM_PACKAGE_ID } from '@/lib/constants';
import {
  parseTags,
  uploadFormSchema,
  type UploadFormValues,
} from '@/lib/validation/upload-schema';
import { ACCEPTED_VIDEO_MIME_TYPES, CLIP_LIMITS } from '@/types/clip';

export interface UseClipUploadResult {
  form: UseFormReturn<UploadFormValues>;
  file: File | null;
  videoUrl: string | null;
  metadata: VideoMetadata | null;
  thumbnail: VideoThumbnail | null;

  isProcessing: boolean;
  isGenerating: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  canSubmit: boolean;

  onFileSelected: (file: File | null) => Promise<void>;
  clearFile: () => void;
  generateWithAI: () => Promise<void>;

  onSubmit: (values: UploadFormValues) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? '' : 's'}`;
  }
  if (seconds >= 60) {
    const mins = Math.round(seconds / 60);
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }
  return `${seconds} seconds`;
}

function validateFile(file: File): string | null {
  const acceptedMimeTypes: readonly string[] = ACCEPTED_VIDEO_MIME_TYPES;
  if (
    !acceptedMimeTypes.includes(file.type) &&
    !file.type.startsWith('video/')
  ) {
    return 'Please select a supported video file (mp4, mov, webm).';
  }
  if (file.size > CLIP_LIMITS.maxSizeBytes) {
    return `Video must be ${formatBytes(CLIP_LIMITS.maxSizeBytes)} or smaller. Your file is ${formatBytes(file.size)}.`;
  }
  return null;
}

export function useClipUpload(): UseClipUploadResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

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
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
    setFrames([]);
    setValidationError(null);
  }, []);

  const clearFile = useCallback(() => {
    resetFileState();
    form.reset({
      title: '',
      description: '',
      tagsInput: '',
    });
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
          const message = `Clips must be ${formatDuration(CLIP_LIMITS.maxDurationSeconds)} or shorter. This video is ${formatDuration(Math.round(probed.durationSeconds))}.`;
          setValidationError(message);
          toast.error(message);
          URL.revokeObjectURL(nextUrl);
          videoUrlRef.current = null;
          setIsProcessing(false);
          return;
        }

        const [frame, extractedFrames] = await Promise.all([
          extractThumbnail(nextFile),
          extractFramesAtIntervals(nextFile),
        ]);

        setFile(nextFile);
        setVideoUrl(nextUrl);
        setMetadata(probed);
        setThumbnail(frame);
        setFrames(extractedFrames);
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
    !isGenerating &&
    !isSubmitting;

  const generateWithAI = useCallback(async () => {
    if (!file || frames.length === 0) {
      toast.error('No video selected');
      return;
    }

    setIsGenerating(true);
    const genToast = toast.loading('Analyzing video with AI...');

    try {
      const formData = new FormData();
      formData.append('frames', JSON.stringify(frames));
      formData.append('hasAudio', 'false');

      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to generate metadata');
      }

      form.setValue('title', result.title || '', { shouldValidate: true });
      form.setValue('description', result.description || '', {
        shouldValidate: true,
      });
      form.setValue('tagsInput', (result.tags || []).join(', '), {
        shouldValidate: true,
      });

      toast.success('Metadata generated!', { id: genToast });
    } catch (error) {
      console.error('[generate-ai] failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate with AI',
        { id: genToast }
      );
    } finally {
      setIsGenerating(false);
    }
  }, [file, frames, form]);

  const onSubmit = useCallback(
    async (values: UploadFormValues) => {
      if (!file || !thumbnail || !metadata) return;

      if (!account) {
        toast.error('Connect your wallet before publishing a clip.');
        return;
      }

      setIsSubmitting(true);
      const submitToast = toast.loading('Preparing upload…');

      try {
        toast.loading('Uploading to Walrus…', { id: submitToast });

        const [videoUpload, thumbUpload] = await Promise.all([
          uploadBlobToWalrus(file),
          uploadBlobToWalrus(thumbnail.blob),
        ]);

        const tx = buildCreateClipTx({
          title: values.title.trim(),
          description: values.description.trim(),
          tags: parseTags(values.tagsInput),
          blobId: videoUpload.blobId,
          thumbnailBlobId: thumbUpload.blobId,
          durationSeconds: Math.max(1, Math.round(metadata.durationSeconds)),
          recipient: account.address,
        });

        const target = `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::create_clip`;

        toast.loading('Publishing on Sui…', { id: submitToast });

        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [target],
        });

        toast.success('Clip published!', { id: submitToast });
        clearFile();

        await new Promise((resolve) => setTimeout(resolve, 2500));
        await queryClient.refetchQueries({
          queryKey: ['public-clips', SUI_STREAM_PACKAGE_ID],
        });
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
      account,
      suiClient,
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
    isProcessing,
    isGenerating,
    isSubmitting,
    validationError,
    canSubmit,
    onFileSelected,
    clearFile,
    generateWithAI,
    onSubmit,
  };
}
