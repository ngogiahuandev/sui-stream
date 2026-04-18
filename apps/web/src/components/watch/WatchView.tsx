'use client';

import Link from 'next/link';
import { ArrowLeftIcon, EyeIcon, HeartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/common/CopyButton';
import { VideoPlayer } from '@/components/watch/VideoPlayer';
import { useClip } from '@/hooks/useClip';
import { useIncrementViews } from '@/hooks/useIncrementViews';
import { getWalrusBlobUrl } from '@/lib/walrus';

interface WatchViewProps {
  id: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WatchView({ id }: WatchViewProps) {
  const { clip, isLoading, isError } = useClip(id);
  const { notifyTimeUpdate } = useIncrementViews({
    clipId: clip?.id,
    durationSeconds: clip?.durationSeconds,
  });

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6 p-4 md:p-6">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </section>
    );
  }

  if (isError || !clip) {
    return (
      <section className="flex flex-col items-center gap-3 p-12 text-center">
        <h2 className="text-lg font-semibold">Clip not found</h2>
        <p className="text-muted-foreground text-sm">
          The clip you're looking for doesn't exist or is no longer available.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/discover" className="gap-1.5">
            <ArrowLeftIcon className="size-4" />
            Back to Discover
          </Link>
        </Button>
      </section>
    );
  }

  const posterUrl = getWalrusBlobUrl(clip.thumbnailBlobId);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
      <Button asChild size="sm" variant="ghost" className="gap-1.5 self-start">
        <Link href="/dashboard/discover">
          <ArrowLeftIcon className="size-4" />
          Back
        </Link>
      </Button>

      <VideoPlayer
        src={getWalrusBlobUrl(clip.blobId)}
        poster={posterUrl}
        onTimeUpdate={notifyTimeUpdate}
      />

      <header className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {clip.title}
        </h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <EyeIcon className="size-4" />
            {clip.views.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" />
            {clip.likes.toLocaleString()} likes
          </span>
          <span className="bg-border/60 inline-block h-4 w-px" />
          <div className="flex items-center gap-1.5">
            <span>by</span>
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {shortAddress(clip.owner)}
            </code>
            <CopyButton value={clip.owner} />
          </div>
        </div>
      </header>

      {clip.description ? (
        <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
          {clip.description}
        </p>
      ) : null}

      {clip.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {clip.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-muted-foreground rounded-full"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}
