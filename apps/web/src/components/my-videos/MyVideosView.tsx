'use client';

import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, PencilIcon, UploadCloudIcon, VideoIcon } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserClips } from '@/hooks/useUserClips';
import { getWalrusBlobUrl } from '@/lib/walrus';
import type { Clip } from '@/types/clip';

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MyVideosView() {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 p-12 text-center">
        <VideoIcon className="text-muted-foreground size-8" />
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-muted-foreground text-sm">
          Connect your Sui wallet to see and manage your clips.
        </p>
      </section>
    );
  }

  return <MyVideosList address={account.address} />;
}

function MyVideosList({ address }: { address: string }) {
  const { clips, isLoading, isError } = useUserClips(address);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            My Videos
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage metadata and view analytics for clips you have uploaded.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/dashboard/upload">
            <UploadCloudIcon className="size-4" />
            Upload new clip
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="border-destructive/30 bg-destructive/5 rounded-2xl border p-10 text-center text-sm">
          Could not load your clips. Try refreshing the page.
        </div>
      ) : clips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <VideoIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No clips yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            You haven&apos;t uploaded any clips yet. Upload your first video to
            see it here.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/dashboard/upload">
              <UploadCloudIcon className="size-4" />
              Upload a clip
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <MyClipRow key={clip.id} clip={clip} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MyClipRow({ clip }: { clip: Clip }) {
  const thumbnail = getWalrusBlobUrl(clip.thumbnailBlobId);

  return (
    <li>
      <Card size="sm" className="group h-full gap-3 py-0 pt-0!">
        <Link
          href={`/dashboard/watch/${clip.id}`}
          className="relative block aspect-video w-full overflow-hidden"
          aria-label={`Watch ${clip.title}`}
        >
          <Image
            src={thumbnail}
            alt={clip.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition group-hover:scale-[1.03]"
            unoptimized
          />
          <Badge
            variant="secondary"
            className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-white"
          >
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </Link>
        <CardHeader>
          <CardTitle className="line-clamp-2 text-sm">{clip.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <EyeIcon className="size-3" />
            {clip.views.toLocaleString()} views
          </span>
        </CardContent>
        <CardFooter>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
          >
            <Link href={`/dashboard/my-videos/${clip.id}`}>
              <PencilIcon className="size-3.5" />
              Manage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </li>
  );
}
