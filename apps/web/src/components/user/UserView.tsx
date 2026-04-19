'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import {
  BellIcon,
  BellOffIcon,
  Loader2Icon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UploadCloudIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { ClipGridSkeleton } from '@/components/clips/ClipGridSkeleton';
import { CopyButton } from '@/components/common/CopyButton';
import { BackButton } from '@/components/common/BackButton';
import { useUserClips } from '@/hooks/useUserClips';
import { useUserVoteTotals } from '@/hooks/useUserVoteTotals';
import { useSubscription } from '@/hooks/useSubscriptions';
import { SUI_STREAM_PACKAGE_ID } from '@/lib/constants';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UserViewProps {
  address: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatCount(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return value.toLocaleString();
}

export function UserView({ address }: UserViewProps) {
  const account = useCurrentAccount();
  const { clips, isLoading, isError, refetch, isFetching } =
    useUserClips(address);

  const clipIds = useMemo(() => clips.map((c) => c.id), [clips]);
  const { upvotes, downvotes } = useUserVoteTotals(clipIds);

  const {
    isSubscribed,
    subscriberCount,
    isLoading: subsLoading,
    toggle: toggleSubscription,
  } = useSubscription(address);

  const [isToggling, setIsToggling] = useState(false);
  const subscribeDisabled = subsLoading || isToggling;

  const handleToggleSubscription = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await toggleSubscription();
    } finally {
      setIsToggling(false);
    }
  };

  const isSelf =
    account?.address?.toLowerCase() === address.toLowerCase();

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
      <BackButton label="Back to Discover" />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex min-w-0 items-center gap-4">
            <Avatar
              address={address}
              className="size-12 shrink-0 overflow-hidden rounded-full"
            />
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="text-foreground font-mono text-sm"
                title={address}
              >
                {shortAddress(address)}
              </span>
              <CopyButton value={address} label="Copy address" />
            </div>
          </CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading clips…'
              : clips.length === 1
                ? '1 published clip'
                : `${clips.length} published clips`}
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {!isSelf ? (
                <Button
                  type="button"
                  variant={isSubscribed ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => void handleToggleSubscription()}
                  disabled={subscribeDisabled}
                  className="gap-1.5"
                >
                  {subscribeDisabled ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : isSubscribed ? (
                    <BellOffIcon className="size-3.5" />
                  ) : (
                    <BellIcon className="size-3.5" />
                  )}
                  {isToggling
                    ? isSubscribed
                      ? 'Unsubscribing…'
                      : 'Subscribing…'
                    : isSubscribed
                      ? 'Subscribed'
                      : 'Subscribe'}
                </Button>
              ) : null}
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
            </div>
          </CardAction>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatPill
          icon={<UsersIcon className="size-4" />}
          label="Subscribers"
          value={formatCount(subscriberCount)}
        />
        <StatPill
          icon={<ThumbsUpIcon className="size-4" />}
          label="Upvotes"
          value={formatCount(upvotes)}
          tone="primary"
        />
        <StatPill
          icon={<ThumbsDownIcon className="size-4" />}
          label="Downvotes"
          value={formatCount(downvotes)}
          tone="destructive"
        />
      </div>

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

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'primary' | 'destructive';
}) {
  return (
    <Card
      size="sm"
      className={cn(
        tone === 'primary' && 'ring-primary/30 bg-primary/5',
        tone === 'destructive' && 'ring-destructive/30 bg-destructive/5'
      )}
    >
      <CardContent className="flex items-center justify-between gap-3">
        <div
          className={cn(
            'text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase',
            tone === 'primary' && 'text-primary',
            tone === 'destructive' && 'text-destructive'
          )}
        >
          {icon}
          {label}
        </div>
        <span className="text-lg font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
