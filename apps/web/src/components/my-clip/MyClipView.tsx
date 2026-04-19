'use client';

import Image from 'next/image';
import { BarChart3Icon, PencilIcon } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/common/BackButton';
import { EditClipForm } from '@/components/my-clip/EditClipForm';
import { ClipAnalytics } from '@/components/my-clip/ClipAnalytics';
import { useClip } from '@/hooks/useClip';
import { getWalrusBlobUrl } from '@/lib/walrus';

interface MyClipViewProps {
  id: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MyClipView({ id }: MyClipViewProps) {
  const account = useCurrentAccount();
  const { clip, isLoading, isError } = useClip(id);

  if (isLoading) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-10 w-full" />
      </section>
    );
  }

  if (isError || !clip) {
    return (
      <section className="flex flex-col items-center gap-3 p-12 text-center">
        <h2 className="text-lg font-semibold">Clip not found</h2>
        <p className="text-muted-foreground text-sm">
          The clip you&apos;re looking for doesn&apos;t exist or is no longer
          available.
        </p>
        <BackButton label="Back" variant="outline" />
      </section>
    );
  }

  const isOwner =
    Boolean(account) &&
    account?.address.toLowerCase() === clip.owner.toLowerCase();

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
      <BackButton label="Back to My Videos" />

      <header className="flex flex-col gap-3 md:flex-row md:items-start md:gap-5">
        <div className="bg-muted relative h-32 w-full shrink-0 overflow-hidden rounded-xl md:w-56">
          <Image
            src={getWalrusBlobUrl(clip.thumbnailBlobId)}
            alt={clip.title}
            fill
            sizes="(max-width: 768px) 100vw, 224px"
            className="object-cover"
            unoptimized
          />
          <Badge
            variant="secondary"
            className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-white"
          >
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="line-clamp-2 text-xl font-semibold tracking-tight md:text-2xl">
            {clip.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage metadata and monitor how your clip is performing.
          </p>
          {!isOwner ? (
            <p className="text-destructive mt-2 text-xs">
              You are not the owner of this clip. Editing is disabled.
            </p>
          ) : null}
        </div>
      </header>

      <Tabs defaultValue="edit" className="gap-4">
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5">
            <PencilIcon className="size-3.5" />
            Edit metadata
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3Icon className="size-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <EditClipForm clip={clip} />
        </TabsContent>
        <TabsContent value="analytics">
          <ClipAnalytics
            clipId={clip.id}
            clipOwner={clip.owner}
            createdAtMs={clip.createdAtMs}
            fallbackViews={clip.views}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
