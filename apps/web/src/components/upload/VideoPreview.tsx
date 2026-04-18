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

function getAspectRatioClass(width?: number, height?: number): string {
  if (!width || !height) return 'aspect-video';
  const ratio = width / height;
  if (ratio > 1.1) return 'aspect-video';
  if (ratio < 0.9) return 'aspect-[9/16]';
  return 'aspect-video';
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
  const videoAspectClass = getAspectRatioClass(
    metadata?.width,
    metadata?.height
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            className={`w-full bg-black object-contain ${videoAspectClass}`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div
            className={`bg-muted relative overflow-hidden rounded-2xl border ${videoAspectClass}`}
          >
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
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                Generating thumbnail…
              </div>
            )}
          </div>
          <span className="text-muted-foreground text-xs font-medium">
            Thumbnail ({videoAspectClass === 'aspect-[9/16]' ? '9:16' : '16:9'})
          </span>
        </div>
      </div>

      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium" title={fileName}>
            {fileName}
          </span>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
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
          className="text-destructive hover:text-destructive gap-1.5"
          disabled={isProcessing}
        >
          <Trash2Icon className="size-3.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}
