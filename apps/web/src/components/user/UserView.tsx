'use client';

import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { ClipGridSkeleton } from '@/components/clips/ClipGridSkeleton';
import { CopyButton } from '@/components/common/CopyButton';
import { useUserClips } from '@/hooks/useUserClips';
import { SUI_STREAM_PACKAGE_ID } from '@/lib/constants';

interface UserViewProps {
  address: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function UserView({ address }: UserViewProps) {
  const { clips, isLoading, isError, refetch, isFetching } =
    useUserClips(address);

  if (!SUI_STREAM_PACKAGE_ID) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <UserIcon className="text-muted-foreground size-8" />
        <h2 className="text-lg font-semibold">Package not configured</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Set <code>NEXT_PUBLIC_SUI_STREAM_PACKAGE</code> in
          <code> apps/web/.env.local</code> after deploying the Move package.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Button asChild size="sm" variant="ghost" className="gap-1.5 self-start">
        <Link href="/dashboard/discover">
          <ArrowLeftIcon className="size-4" />
          Back to Discover
        </Link>
      </Button>

      <header className="bg-muted/20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            address={address}
            className="size-14 shrink-0 overflow-hidden rounded-full"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <code
                className="bg-muted rounded-full px-2 py-0.5 font-mono text-xs"
                title={address}
              >
                {shortAddress(address)}
              </code>
              <CopyButton value={address} label="Copy address" />
            </div>
            <span className="text-muted-foreground text-sm">
              {isLoading
                ? 'Loading clips…'
                : clips.length === 1
                  ? '1 published clip'
                  : `${clips.length} published clips`}
            </span>
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
        <ClipGridSkeleton />
      ) : isError ? (
        <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <h2 className="text-base font-semibold">Could not load clips</h2>
          <p className="text-muted-foreground text-sm">
            Check your network connection and try again.
          </p>
          <Button onClick={refetch} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      ) : clips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <UserIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No clips yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            This creator hasn't published any clips yet.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/dashboard/upload">
              <UploadCloudIcon className="size-4" />
              Upload your own
            </Link>
          </Button>
        </div>
      ) : (
        <ClipGrid clips={clips} />
      )}
    </section>
  );
}
