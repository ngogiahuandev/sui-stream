'use client';

import { useCallback, useState } from 'react';
import {
  CalendarIcon,
  EyeIcon,
  MessageCircleIcon,
  HeartHandshakeIcon,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/common/BackButton';
import { VideoPlayer } from '@/components/watch/VideoPlayer';
import { ClipOwnerCard } from '@/components/watch/ClipOwnerCard';
import { VoteButtons } from '@/components/watch/VoteButtons';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { DonationList } from '@/components/my-videos/DonationList';
import { DonateButton } from '@/components/donate/DonateButton';
import { useClip } from '@/hooks/useClip';
import { useClipViewCount } from '@/hooks/useClipViewCount';
import { useIncrementViews } from '@/hooks/useIncrementViews';
import { useDonationsReceived } from '@/hooks/useDonationsReceived';
import { getWalrusBlobUrl } from '@/lib/walrus';
import { isPortraitVideo } from '@/lib/video-aspect';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WatchViewProps {
  id: string;
}

export function WatchView({ id }: WatchViewProps) {
  const { clip, isLoading, isError } = useClip(id);
  const [viewBump, setViewBump] = useState(0);
  const { notifyTimeUpdate } = useIncrementViews({
    clipId: clip?.id,
    durationSeconds: clip?.durationSeconds,
    onViewTracked: useCallback(() => setViewBump(1), []),
  });
  const { views } = useClipViewCount(clip?.id, clip?.views ?? 0);
  const [isPortrait, setIsPortrait] = useState(false);
  const { data: donationData } = useDonationsReceived(
    isLoading || isError || !clip ? undefined : clip.owner,
    clip?.id
  );

  const handleDimensionsDetected = useCallback(
    (width: number, height: number) => {
      setIsPortrait(isPortraitVideo(width, height));
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
          <div className="flex items-center gap-2">
            <ClipOwnerCard owner={clip.owner} />
            <DonateButton clipId={clip.id} recipient={clip.owner} iconOnly variant="outline" />
          </div>
          <VoteButtons clipId={clip.id} />
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <EyeIcon className="size-4" />
            {(views + viewBump).toLocaleString()} views
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

  const tabContent = (
    <Tabs defaultValue="comments" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="comments" className="gap-2">
          <MessageCircleIcon className="size-4" />
          Comments
        </TabsTrigger>
        <TabsTrigger value="donations" className="gap-2">
          <HeartHandshakeIcon className="size-4" />
          Donations
          {donationData && donationData.totalSui > 0
            ? ` (${donationData.totalSui.toFixed(1)})`
            : null}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="comments" className="mt-4">
        <CommentsSection clipId={clip.id} clipOwner={clip.owner} />
      </TabsContent>
      <TabsContent value="donations" className="mt-4">
        <DonationList
          donations={donationData?.donations ?? []}
          recipientAddress={clip.owner}
        />
      </TabsContent>
    </Tabs>
  );

  if (isPortrait) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
        {backButton}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)]">
          <div className="mx-auto w-full max-w-[260px] md:max-w-none">
            {videoPlayer}
          </div>
          <div className="flex flex-col gap-6 overflow-hidden">
            {details}
            {tabContent}
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
      {tabContent}
    </section>
  );
}
