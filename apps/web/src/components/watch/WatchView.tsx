'use client';

import { useCallback, useState } from 'react';
import { CalendarIcon, EyeIcon } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/common/BackButton';
import { VideoPlayer } from '@/components/watch/VideoPlayer';
import { ClipOwnerCard } from '@/components/watch/ClipOwnerCard';
import { VoteButtons } from '@/components/watch/VoteButtons';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useClip } from '@/hooks/useClip';
import { useClipViewCount } from '@/hooks/useClipViewCount';
import { useIncrementViews } from '@/hooks/useIncrementViews';
import { getWalrusBlobUrl } from '@/lib/walrus';
import { isPortraitVideo } from '@/lib/video-aspect';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WatchViewProps {
  id: string;
}

export function WatchView({ id }: WatchViewProps) {
  const { clip, isLoading, isError } = useClip(id);
  const { notifyTimeUpdate } = useIncrementViews({
    clipId: clip?.id,
    durationSeconds: clip?.durationSeconds,
  });
  const { views } = useClipViewCount(clip?.id, clip?.views ?? 0);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleDimensionsDetected = useCallback(
    (width: number, height: number) => {
      setDimensions({ width, height });
    },
    []
  );

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
        <BackButton label="Back to Discover" variant="outline" />
      </section>
    );
  }

  const posterUrl = getWalrusBlobUrl(clip.thumbnailBlobId);
  const isPortrait = isPortraitVideo(dimensions?.width, dimensions?.height);

  const backButton = <BackButton />;

  const videoPlayer = (
    <VideoPlayer
      src={getWalrusBlobUrl(clip.blobId)}
      poster={posterUrl}
      onTimeUpdate={notifyTimeUpdate}
      onDimensionsDetected={handleDimensionsDetected}
    />
  );

  const details = (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {clip.title}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ClipOwnerCard owner={clip.owner} />
          <VoteButtons clipId={clip.id} />
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <EyeIcon className="size-4" />
            {views.toLocaleString()} views
          </span>
          {Number.isFinite(clip.createdAtMs) && clip.createdAtMs > 0 ? (
            <span
              className="flex items-center gap-1.5"
              title={new Date(clip.createdAtMs).toLocaleString()}
            >
              <CalendarIcon className="size-4" />
              {formatDistanceToNowStrict(new Date(clip.createdAtMs), {
                addSuffix: true,
              })}
            </span>
          ) : null}
        </div>
      </header>

      {clip.description ? (
        <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
          {clip.description}
        </p>
      ) : null}

      {clip.tags.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {clip.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="shrink-0 rounded-full"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );

  const comments = <CommentsSection clipId={clip.id} clipOwner={clip.owner} />;

  if (isPortrait) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
        {backButton}
        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
          <div className="grid-cols-1 md:sticky md:top-4 md:self-start">
            {videoPlayer}
          </div>
          <div className="grid-cols-2 flex flex-col gap-6">
            {details}
            {comments}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
      {backButton}
      {videoPlayer}
      {details}
      {comments}
    </section>
  );
}
