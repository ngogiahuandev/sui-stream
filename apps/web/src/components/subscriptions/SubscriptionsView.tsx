'use client';

import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import { BellIcon, RefreshCwIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscribedAddresses } from '@/hooks/useSubscriptions';

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function SubscriptionsView() {
  const { addresses, isLoading, refetch, isFetching } = useSubscribedAddresses();

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
            <BellIcon className="size-5" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight">
              Subscriptions
            </h1>
            <p className="text-muted-foreground text-sm">
              Creators you follow across SuiStream.
            </p>
          </div>
        </div>
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
      </header>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <UserIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No subscriptions yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Open a creator's profile and tap Subscribe to follow them. They'll
            show up here.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/discover">Browse creators</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={address}
              size="sm"
              className="hover:bg-muted/40 transition-colors"
            >
              <CardContent>
                <Link
                  href={`/dashboard/user/${address}`}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    address={address}
                    className="size-10 shrink-0 overflow-hidden rounded-full"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-mono text-sm">
                      {shortAddress(address)}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      View profile
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
