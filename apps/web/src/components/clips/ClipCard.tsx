'use client';

import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, HeartIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getWalrusBlobUrl } from '@/lib/walrus';
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

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ClipCard({ clip, className }: ClipCardProps) {
  const thumbnailUrl = getWalrusBlobUrl(clip.thumbnailBlobId);

  return (
    <Link
      href={`/dashboard/watch/${clip.id}`}
      className={cn('group block', className)}
      aria-label={`Watch ${clip.title}`}
    >
      <Card className="flex flex-col gap-3 overflow-hidden border-border/60 bg-card p-3 transition hover:border-primary/40 hover:shadow-md">
        <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
          <Image
            src={thumbnailUrl}
            alt={clip.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-[1.03]"
            unoptimized
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
              <PlayIcon className="size-5" />
            </span>
          </div>
          <Badge
            variant="secondary"
            className="absolute right-2 bottom-2 rounded-full bg-black/70 text-white"
          >
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {clip.title}
          </h3>
          <p className="text-muted-foreground text-xs">
            {shortAddress(clip.owner)}
          </p>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
      </Card>
    </Link>
  );
}
