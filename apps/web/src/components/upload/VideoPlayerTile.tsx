'use client';

import { cn } from '@/lib/utils';

interface VideoPlayerTileProps {
  videoUrl: string;
  aspectClass: string;
  className?: string;
}

export function VideoPlayerTile({
  videoUrl,
  aspectClass,
  className,
}: VideoPlayerTileProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-2xl border bg-black', className)}
    >
      <video
        src={videoUrl}
        controls
        playsInline
        className={cn('w-full bg-black object-contain', aspectClass)}
      />
    </div>
  );
}
