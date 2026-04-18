'use client';

import Link from 'next/link';
import { CompassIcon, RefreshCwIcon, UploadCloudIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { ClipGridSkeleton } from '@/components/clips/ClipGridSkeleton';
import { usePublicClips } from '@/hooks/usePublicClips';
import { SUI_STREAM_PACKAGE_ID } from '@/lib/constants';

export function DiscoverView() {
  const { data: clips, isLoading, isError, refetch, isFetching } =
    usePublicClips();

  if (!SUI_STREAM_PACKAGE_ID) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <CompassIcon className="text-muted-foreground size-8" />
        <h2 className="text-lg font-semibold">Package not configured</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Set <code>NEXT_PUBLIC_SUI_STREAM_PACKAGE</code> in
          <code> apps/web/.env.local</code> after deploying the Move package.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="text-muted-foreground text-sm">
            Fresh public clips from the SuiStream community.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCwIcon
            className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
          />
          Refresh
        </Button>
      </header>

      {isLoading ? (
        <ClipGridSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
          <h2 className="text-base font-semibold">Could not load clips</h2>
          <p className="text-muted-foreground text-sm">
            Check your network connection and try again.
          </p>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      ) : !clips || clips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <CompassIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No clips yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Be the first to publish — your clip will appear here for everyone on
            SuiStream.
          </p>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/dashboard/upload">
              <UploadCloudIcon className="size-4" />
              Upload a clip
            </Link>
          </Button>
        </div>
      ) : (
        <ClipGrid clips={clips} />
      )}
    </section>
  );
}
