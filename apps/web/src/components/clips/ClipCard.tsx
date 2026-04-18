'use client';

import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, HeartIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getWalrusBlobUrl } from '@/lib/walrus';
import { useImageAspectRatio } from '@/hooks/useImageAspectRatio';
import { cn } from '@/lib/utils';
import type { Clip } from '@/types/clip';

interface ClipCardProps {
  clip: Clip;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCount(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

interface ClipCardBentoProps {
  clip: Clip;
  className?: string;
  large?: boolean;
}

export function ClipCardBento({ clip, className, large }: ClipCardBentoProps) {
  const thumbnailUrl = getWalrusBlobUrl(clip.thumbnailBlobId);
  const { ratio, isLoaded } = useImageAspectRatio(thumbnailUrl);
  const aspectStyle =
    isLoaded && ratio
      ? { aspectRatio: String(ratio) }
      : { aspectRatio: '16 / 9' };

  return (
    <Link
      href={`/dashboard/watch/${clip.id}`}
      style={aspectStyle}
      className={cn(
        'group bg-muted relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl',
        large ? 'md:col-span-2 md:row-span-2' : '',
        className
      )}
      aria-label={`Watch ${clip.title}`}
    >
      <Image
        src={thumbnailUrl}
        alt={clip.title}
        fill
        sizes={
          large
            ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
            : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
        }
        className="object-cover transition group-hover:scale-[1.03]"
        unoptimized
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
        <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
          <PlayIcon className="size-6" />
        </span>
      </div>
      <Badge
        variant="secondary"
        className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-white"
      >
        {formatDuration(clip.durationSeconds)}
      </Badge>
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition group-hover:opacity-100">
        <h3 className="line-clamp-2 text-sm font-medium text-white">
          {clip.title}
        </h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
          <span className="flex items-center gap-1">
            <EyeIcon className="size-3" />
            {formatCount(clip.views)}
          </span>
          <span className="flex items-center gap-1">
            <HeartIcon className="size-3" />
            {formatCount(clip.likes)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ClipCard({ clip, className }: ClipCardProps) {
  const thumbnailUrl = getWalrusBlobUrl(clip.thumbnailBlobId);
  const { ratio, isLoaded } = useImageAspectRatio(thumbnailUrl);
  const aspectStyle =
    isLoaded && ratio
      ? { aspectRatio: String(ratio) }
      : { aspectRatio: '16 / 9' };

  return (
    <Link
      href={`/dashboard/watch/${clip.id}`}
      className={cn('group block overflow-hidden rounded-xl', className)}
      aria-label={`Watch ${clip.title}`}
    >
      <div
        style={aspectStyle}
        className="bg-muted relative w-full overflow-hidden rounded-xl"
      >
        <Image
          src={thumbnailUrl}
          alt={clip.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition group-hover:scale-[1.03]"
          unoptimized
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
            <PlayIcon className="size-6" />
          </span>
        </div>
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-white"
        >
          {formatDuration(clip.durationSeconds)}
        </Badge>
        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition group-hover:opacity-100">
          <h3 className="line-clamp-2 text-sm font-medium text-white">
            {clip.title}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
            <span className="flex items-center gap-1">
              <EyeIcon className="size-3" />
              {formatCount(clip.views)}
            </span>
            <span className="flex items-center gap-1">
              <HeartIcon className="size-3" />
              {formatCount(clip.likes)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
