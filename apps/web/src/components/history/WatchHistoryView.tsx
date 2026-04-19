'use client';

import Link from 'next/link';
import { HistoryIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HistoryCard } from '@/components/history/HistoryCard';
import { useWatchHistory } from '@/hooks/useWatchHistory';

export function WatchHistoryView() {
  const { entries, isLoading, isFetching, isConnected, refetch } =
    useWatchHistory();

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
            <HistoryIcon className="size-5" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight">
              Watch history
            </h1>
            <p className="text-muted-foreground text-sm">
              Clips you've watched, read from the Sui chain.
            </p>
          </div>
        </div>

        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCwIcon
              className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
            />
            Refresh
          </Button>
        ) : null}
      </header>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <HistoryIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">Connect your wallet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Watch history is tied to your wallet. Connect to see the clips
            you've viewed.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <HistoryIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No watch history yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Watch a clip long enough to register a view on chain and it'll
            show up here.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/discover">Browse clips</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <HistoryCard key={entry.clip.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
