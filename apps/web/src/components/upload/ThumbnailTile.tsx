'use client';

import Image from 'next/image';
import { Loader2Icon, WandSparklesIcon } from 'lucide-react';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { cn } from '@/lib/utils';
import type { VideoThumbnail } from '@/lib/video-thumbnail';

interface ThumbnailTileProps {
  thumbnail: VideoThumbnail | null;
  aspectClass: string;
  isProcessing: boolean;
  isGeneratingThumbnail: boolean;
  onGenerateThumbnail: () => void;
  className?: string;
}

export function ThumbnailTile({
  thumbnail,
  aspectClass,
  isProcessing,
  isGeneratingThumbnail,
  onGenerateThumbnail,
  className,
}: ThumbnailTileProps) {
  const aspectLabel = aspectClass === 'aspect-[9/16]' ? '9:16' : '16:9';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'bg-muted relative overflow-hidden rounded-2xl border',
          aspectClass
        )}
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
        {isGeneratingThumbnail ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-medium text-white backdrop-blur-sm">
            <Loader2Icon className="size-5 animate-spin" />
            Generating with AI…
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          Thumbnail ({aspectLabel})
        </span>
        <HoverBorderGradient
          as="button"
          type="button"
          onClick={onGenerateThumbnail}
          disabled={isProcessing || isGeneratingThumbnail}
          containerClassName="rounded-full disabled:pointer-events-none disabled:opacity-50"
          className="flex items-center gap-1.5 bg-black px-3 py-1.5 text-xs font-semibold text-white"
        >
          {isGeneratingThumbnail ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <WandSparklesIcon className="size-3.5" />
          )}
          <span>Generate with AI</span>
        </HoverBorderGradient>
      </div>
    </div>
  );
}
