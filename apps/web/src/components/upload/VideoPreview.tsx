'use client';

import Image from 'next/image';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VideoMetadata, VideoThumbnail } from '@/lib/video-thumbnail';

interface VideoPreviewProps {
  videoUrl: string;
  fileName: string;
  fileSizeBytes: number;
  metadata: VideoMetadata | null;
  thumbnail: VideoThumbnail | null;
  isProcessing: boolean;
  onClear: () => void;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoPreview({
  videoUrl,
  fileName,
  fileSizeBytes,
  metadata,
  thumbnail,
  isProcessing,
  onClear,
}: VideoPreviewProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            className="aspect-video w-full bg-black object-contain"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted">
            {thumbnail ? (
              <Image
                src={thumbnail.dataUrl}
                alt="Video thumbnail"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Generating thumbnail…
              </div>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Thumbnail
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium" title={fileName}>
            {fileName}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-full">
              {formatDuration(metadata?.durationSeconds ?? 0)}
            </Badge>
            {metadata ? (
              <span>
                {metadata.width}×{metadata.height}
              </span>
            ) : null}
            <span>{formatSize(fileSizeBytes)}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={isProcessing}
        >
          <Trash2Icon className="size-3.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}
