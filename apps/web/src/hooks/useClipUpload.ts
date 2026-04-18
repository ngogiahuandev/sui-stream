'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { extractThumbnail, getVideoMetadata } from '@/lib/video-thumbnail';
import type { VideoMetadata, VideoThumbnail } from '@/lib/video-thumbnail';
import {
  parseTags,
  uploadFormSchema,
  type UploadFormValues,
} from '@/lib/validation/upload-schema';
import {
  ACCEPTED_VIDEO_MIME_TYPES,
  CLIP_LIMITS,
  type ClipFormValues,
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

      const draft: ClipFormValues = {
        title: values.title,
        description: values.description,
        tags: parseTags(values.tagsInput),
        visibility,
      };

      setIsSubmitting(true);
      try {
        console.info('[upload] submit draft (UI-only stub)', {
          draft,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
          metadata,
          thumbnail: {
            width: thumbnail.width,
            height: thumbnail.height,
            timestampSeconds: thumbnail.timestampSeconds,
            byteSize: thumbnail.blob.size,
          },
        });
        toast.success('Clip draft logged to console.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [file, thumbnail, metadata, visibility]
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
