'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
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
import { buildCreateCampaignTx, buildCreateClipTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import {
  MIST_PER_SUI,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import { base64ToBytes } from '@/lib/attestation';
import { useExistingTags } from '@/hooks/useExistingTags';
import {
  durationDaysToMs,
  parseTags,
  uploadFormSchema,
  type UploadFormValues,
} from '@/lib/validation/upload-schema';
import { ACCEPTED_VIDEO_MIME_TYPES, CLIP_LIMITS } from '@/types/clip';

export type UploadStepId =
  | 'walrus'
  | 'publish'
  | 'campaign'
  | 'index'
  | 'redirect';
export type UploadStepStatus = 'pending' | 'active' | 'complete' | 'error';

export interface UploadStep {
  id: UploadStepId;
  label: string;
  status: UploadStepStatus;
}

const INITIAL_UPLOAD_STEPS: UploadStep[] = [
  { id: 'walrus', label: 'Uploading video & thumbnail to Walrus', status: 'pending' },
  { id: 'publish', label: 'Publishing clip on Sui', status: 'pending' },
  { id: 'campaign', label: 'Funding reward campaign', status: 'pending' },
  { id: 'index', label: 'Indexing new clip', status: 'pending' },
  { id: 'redirect', label: 'Redirecting to Discover', status: 'pending' },
];

const INITIAL_DEFAULTS: UploadFormValues = {
  title: '',
  description: '',
  tagsInput: '',
  missionsEnabled: false,
  includeLike: false,
  includeComment: false,
  rewardSui: 0.01,
  maxClaims: 100,
  durationDays: '30',
};

export interface UseClipUploadResult {
  form: UseFormReturn<UploadFormValues>;
  file: File | null;
  videoUrl: string | null;
  metadata: VideoMetadata | null;
  thumbnail: VideoThumbnail | null;

  isProcessing: boolean;
  isGenerating: boolean;
  isGeneratingThumbnail: boolean;
  isSubmitting: boolean;
  uploadSteps: UploadStep[];
  validationError: string | null;
  canSubmit: boolean;

  onFileSelected: (file: File | null) => Promise<void>;
  clearFile: () => void;
  generateWithAI: () => Promise<void>;
  generateThumbnailWithAI: () => Promise<void>;

  onSubmit: (values: UploadFormValues) => Promise<void>;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load generated image'));
    img.src = dataUrl;
  });
}

async function cropImageToAspect(
  sourceDataUrl: string,
  targetAspect: number,
  mimeType = 'image/jpeg',
  quality = 0.9
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const img = await loadImage(sourceDataUrl);
  const srcWidth = img.naturalWidth;
  const srcHeight = img.naturalHeight;
  const srcAspect = srcWidth / srcHeight;

  let sx = 0;
  let sy = 0;
  let sw = srcWidth;
  let sh = srcHeight;
  if (srcAspect > targetAspect) {
    sw = Math.round(srcHeight * targetAspect);
    sx = Math.round((srcWidth - sw) / 2);
  } else if (srcAspect < targetAspect) {
    sh = Math.round(srcWidth / targetAspect);
    sy = Math.round((srcHeight - sh) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const dataUrl = canvas.toDataURL(mimeType, quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      mimeType,
      quality
    );
  });
  return { blob, dataUrl, width: sw, height: sh };
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
  const existingTags = useExistingTags();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: INITIAL_DEFAULTS,
  });
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(null);
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>(INITIAL_UPLOAD_STEPS);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setStepStatus = useCallback(
    (id: UploadStepId, status: UploadStepStatus) => {
      setUploadSteps((prev) =>
        prev.map((step) => (step.id === id ? { ...step, status } : step))
      );
    },
    []
  );

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
    form.reset(INITIAL_DEFAULTS);
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
    !isGeneratingThumbnail &&
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
      if (existingTags.length > 0) {
        formData.append('existingTags', JSON.stringify(existingTags));
      }

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
  }, [file, frames, form, existingTags]);

  const generateThumbnailWithAI = useCallback(async () => {
    if (!file || frames.length === 0 || !metadata) {
      toast.error('No video selected');
      return;
    }

    setIsGeneratingThumbnail(true);
    const genToast = toast.loading('Generating thumbnail with AI...');

    try {
      const videoWidth = metadata.width || 16;
      const videoHeight = metadata.height || 9;
      const targetAspect = videoWidth / videoHeight;
      const aspectLabel =
        targetAspect < 0.9 ? '9:16' : targetAspect > 1.1 ? '16:9' : '1:1';

      const formData = new FormData();
      formData.append('frames', JSON.stringify(frames));
      formData.append('title', form.getValues('title') ?? '');
      formData.append('description', form.getValues('description') ?? '');
      formData.append('aspectRatio', aspectLabel);
      formData.append('aspectWidth', String(videoWidth));
      formData.append('aspectHeight', String(videoHeight));

      const response = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || result.error || !result.dataUrl) {
        throw new Error(result.error || 'Failed to generate thumbnail');
      }

      const cropped = await cropImageToAspect(result.dataUrl, targetAspect);

      setThumbnail({
        blob: cropped.blob,
        dataUrl: cropped.dataUrl,
        width: cropped.width,
        height: cropped.height,
        timestampSeconds: 0,
      });

      toast.success('Thumbnail generated!', { id: genToast });
    } catch (error) {
      console.error('[generate-thumbnail] failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate thumbnail',
        { id: genToast }
      );
    } finally {
      setIsGeneratingThumbnail(false);
    }
  }, [file, frames, metadata, form]);

  const onSubmit = useCallback(
    async (values: UploadFormValues) => {
      if (!file || !thumbnail || !metadata) return;

      if (!account) {
        toast.error('Connect your wallet before publishing a clip.');
        return;
      }

      setUploadSteps(INITIAL_UPLOAD_STEPS);
      setIsSubmitting(true);

      try {
        setStepStatus('walrus', 'active');
        const [videoUpload, thumbUpload] = await Promise.all([
          uploadBlobToWalrus(file),
          uploadBlobToWalrus(thumbnail.blob),
        ]);
        setStepStatus('walrus', 'complete');

        setStepStatus('publish', 'active');
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
        const publishResult = await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [target],
        });
        setStepStatus('publish', 'complete');

        if (values.missionsEnabled) {
          setStepStatus('campaign', 'active');
          try {
            await suiClient
              .waitForTransaction({ digest: publishResult.digest })
              .catch(() => undefined);
            const txData = await suiClient.getTransactionBlock({
              digest: publishResult.digest,
              options: { showObjectChanges: true },
            });
            const clipChange = txData.objectChanges?.find(
              (c) =>
                c.type === 'created' &&
                typeof c.objectType === 'string' &&
                c.objectType.endsWith('::clip::Clip')
            );
            if (!clipChange || clipChange.type !== 'created') {
              throw new Error('Could not locate new clip on chain');
            }
            const clipId = clipChange.objectId;

            const pubkeyB64 = process.env.NEXT_PUBLIC_ATTESTATION_PUBKEY ?? '';
            if (!pubkeyB64) {
              throw new Error('NEXT_PUBLIC_ATTESTATION_PUBKEY is not set');
            }
            const attestationPubkey = base64ToBytes(pubkeyB64);

            const rewardMist = BigInt(
              Math.round(values.rewardSui * MIST_PER_SUI)
            );
            const maxClaims = BigInt(values.maxClaims);
            const totalDepositMist = rewardMist * maxClaims;
            const expiresAtMs = BigInt(
              Date.now() + durationDaysToMs(values.durationDays)
            );

            const campTx = buildCreateCampaignTx({
              creator: account.address,
              clipId,
              rewardPerClaimMist: rewardMist,
              maxClaims,
              includeLike: values.includeLike,
              includeComment: values.includeComment,
              attestationPubkey,
              expiresAtMs,
              totalDepositMist,
            });
            const chain = `sui:${process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet'}` as `${string}:${string}`;
            const result = await signAndExecute({
              transaction: campTx,
              chain,
            });
            await suiClient
              .waitForTransaction({ digest: result.digest })
              .catch(() => undefined);
            setStepStatus('campaign', 'complete');
            toast.success('Reward campaign funded.');
          } catch (error) {
            console.error('[campaign] failed to create', error);
            setStepStatus('campaign', 'error');
            toast.error(
              error instanceof Error
                ? `Clip published, but campaign failed: ${error.message}`
                : 'Clip published, but campaign creation failed.'
            );
          }
        } else {
          setStepStatus('campaign', 'complete');
        }

        setStepStatus('index', 'active');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await queryClient.refetchQueries({
          queryKey: ['public-clips', SUI_STREAM_PACKAGE_ID],
        });
        setStepStatus('index', 'complete');

        setStepStatus('redirect', 'active');
        router.push('/dashboard/discover');
      } catch (error) {
        console.error('[upload] failed to publish clip', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Could not publish your clip. Please try again.';
        toast.error(message);
        setUploadSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' ? { ...step, status: 'error' } : step
          )
        );
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
      router,
      setStepStatus,
      signAndExecute,
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
    isGeneratingThumbnail,
    isSubmitting,
    uploadSteps,
    validationError,
    canSubmit,
    onFileSelected,
    clearFile,
    generateWithAI,
    generateThumbnailWithAI,
    onSubmit,
  };
}
