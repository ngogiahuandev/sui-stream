'use client';

import { Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VideoMetadata } from '@/lib/video-thumbnail';

interface FileInfoBarProps {
  fileName: string;
  fileSizeBytes: number;
  metadata: VideoMetadata | null;
  isProcessing: boolean;
  onClear: () => void;
  className?: string;
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

export function FileInfoBar({
  fileName,
  fileSizeBytes,
  metadata,
  isProcessing,
  onClear,
  className,
}: FileInfoBarProps) {
  return (
    <div
      className={cn(
        'bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3',
        className
      )}
    >
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
  );
}
