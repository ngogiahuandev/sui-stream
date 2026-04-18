export interface ClipFormValues {
  title: string;
  description: string;
  tags: string[];
}

export const CLIP_LIMITS = {
  maxDurationSeconds: 60,
  maxSizeBytes: 100 * 1024 * 1024,
  maxTitleLength: 80,
  maxDescriptionLength: 500,
  maxTags: 3,
  maxTagLength: 24,
} as const;

export const ACCEPTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
] as const;

export interface Clip {
  id: string;
  owner: string;
  title: string;
  description: string;
  tags: string[];
  blobId: string;
  thumbnailBlobId: string;
  durationSeconds: number;
  likes: number;
  views: number;
  createdAtMs: number;
}
