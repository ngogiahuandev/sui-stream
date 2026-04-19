'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNowStrict } from 'date-fns';
import { EyeIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getWalrusBlobUrl } from '@/lib/walrus';
import type { WatchHistoryEntry } from '@/hooks/useWatchHistory';

interface HistoryCardProps {
  entry: WatchHistoryEntry;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HistoryCard({ entry }: HistoryCardProps) {
  const { clip, lastWatchedAtMs } = entry;
  const thumbnailUrl = getWalrusBlobUrl(clip.thumbnailBlobId);

  return (
    <Card size="sm" className="hover:bg-muted/40 group transition-colors">
      <CardContent>
        <Link
          href={`/dashboard/watch/${clip.id}`}
          className="flex gap-3"
          aria-label={`Watch ${clip.title}`}
        >
          <div className="relative w-40 shrink-0 overflow-hidden rounded-xl sm:w-48">
            <div className="bg-muted relative aspect-video w-full">
              <Image
                src={thumbnailUrl}
                alt={clip.title}
                fill
                sizes="(max-width: 640px) 40vw, 200px"
                className="object-cover transition group-hover:scale-[1.03]"
                unoptimized
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                  <PlayIcon className="size-5" />
                </span>
              </div>
              <Badge
                variant="secondary"
                className="absolute right-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white"
              >
                {formatDuration(clip.durationSeconds)}
              </Badge>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium">
              {clip.title || 'Untitled clip'}
            </h3>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <EyeIcon className="size-3" />
                {clip.views.toLocaleString()} views
              </span>
              {lastWatchedAtMs > 0 ? (
                <span title={new Date(lastWatchedAtMs).toLocaleString()}>
                  Watched{' '}
                  {formatDistanceToNowStrict(new Date(lastWatchedAtMs), {
                    addSuffix: true,
                  })}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
