'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import {
  EyeIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  UploadCloudIcon,
  VideoIcon,
} from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/common/BackButton';
import { CopyButton } from '@/components/common/CopyButton';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { ChannelAnalyticsChart } from '@/components/my-videos/ChannelAnalyticsChart';
import { DonationList } from '@/components/my-videos/DonationList';
import { useUserClips } from '@/hooks/useUserClips';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { useDonationsReceived } from '@/hooks/useDonationsReceived';
import { cn } from '@/lib/utils';

type MetricKey = 'views' | 'likes' | 'comments' | 'donations';

const METRICS: Record<
  MetricKey,
  { label: string; color: string; icon: React.ReactNode }
> = {
  views: {
    label: 'Views',
    color: 'var(--primary)',
    icon: <EyeIcon className="size-4" />,
  },
  likes: {
    label: 'Likes',
    color: 'var(--chart-2, #10b981)',
    icon: <ThumbsUpIcon className="size-4" />,
  },
  comments: {
    label: 'Comments',
    color: 'var(--chart-3, #f59e0b)',
    icon: <MessageCircleIcon className="size-4" />,
  },
  donations: {
    label: 'Donations',
    color: 'var(--chart-4, #ec4899)',
    icon: <HeartHandshakeIcon className="size-4" />,
  },
};

function formatSuiTotal(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 100) return amount.toFixed(0);
  if (amount >= 1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(3);
  return amount.toFixed(6);
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

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
          Connect your Sui wallet to see and manage your channel.
        </p>
      </section>
    );
  }

  return <ChannelView address={account.address} />;
}

function ChannelView({ address }: { address: string }) {
  const { clips, isLoading, isError, refetch, isFetching } =
    useUserClips(address);
  const clipIds = useMemo(() => clips.map((c) => c.id), [clips]);
  const { data, refetch: refetchAnalytics } = useUserAnalytics(clipIds);
  const { data: donationData, refetch: refetchDonations } =
    useDonationsReceived(address);
  const [selected, setSelected] = useState<MetricKey | null>(null);

  const earliestClipMs = useMemo(() => {
    if (clips.length === 0) return 0;
    return clips.reduce(
      (min, c) =>
        c.createdAtMs > 0 && c.createdAtMs < min ? c.createdAtMs : min,
      clips[0].createdAtMs || Date.now()
    );
  }, [clips]);

  const handleRefresh = () => {
    refetch();
    refetchAnalytics();
    refetchDonations();
  };

  const handleToggleMetric = (metric: MetricKey) => {
    setSelected((prev) => (prev === metric ? null : metric));
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <BackButton label="Back" />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex min-w-0 items-center gap-4">
            <Avatar
              address={address}
              className="size-12 shrink-0 overflow-hidden rounded-full"
            />
            <div>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="text-foreground font-mono text-sm"
                  title={address}
                >
                  {shortAddress(address)}
                </span>
                <CopyButton value={address} label="Copy address" />
              </div>
              <CardDescription>
                {isLoading
                  ? 'Loading clips…'
                  : clips.length === 1
                    ? '1 published clip'
                    : `${clips.length} published clips`}
              </CardDescription>
            </div>
          </CardTitle>

          <CardAction>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/dashboard/upload">
                  <UploadCloudIcon className="size-3.5" />
                  Upload
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          metricKey="views"
          label={METRICS.views.label}
          icon={METRICS.views.icon}
          value={data.totalViews}
          selected={selected === 'views'}
          onSelect={() => handleToggleMetric('views')}
        />
        <MetricCard
          metricKey="likes"
          label={METRICS.likes.label}
          icon={METRICS.likes.icon}
          value={data.totalLikes}
          selected={selected === 'likes'}
          onSelect={() => handleToggleMetric('likes')}
        />
        <MetricCard
          metricKey="comments"
          label={METRICS.comments.label}
          icon={METRICS.comments.icon}
          value={data.totalComments}
          selected={selected === 'comments'}
          onSelect={() => handleToggleMetric('comments')}
        />
        <MetricCard
          metricKey="donations"
          label={METRICS.donations.label}
          icon={METRICS.donations.icon}
          value={donationData.totalSui}
          displayValue={`${formatSuiTotal(donationData.totalSui)} SUI`}
          selected={selected === 'donations'}
          onSelect={() => handleToggleMetric('donations')}
        />
      </div>

      {selected === 'donations' ? (
        <div className="flex flex-col gap-4">
          <ChannelAnalyticsChart
            label="SUI donated"
            color={METRICS.donations.color}
            icon={METRICS.donations.icon}
            series={donationData.timeline}
            startMs={
              donationData.timeline[0]?.timestampMs ?? earliestClipMs
            }
          />
          <DonationList donations={donationData.donations} />
        </div>
      ) : selected ? (
        <ChannelAnalyticsChart
          label={METRICS[selected].label}
          color={METRICS[selected].color}
          icon={METRICS[selected].icon}
          series={data[selected]}
          startMs={earliestClipMs}
        />
      ) : isLoading ? (
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
        <ClipGrid clips={clips} mode="edit" />
      )}
    </section>
  );
}

interface MetricCardProps {
  metricKey: MetricKey;
  label: string;
  icon: React.ReactNode;
  value: number;
  displayValue?: string;
  selected: boolean;
  onSelect: () => void;
}

function MetricCard({
  label,
  icon,
  value,
  displayValue,
  selected,
  onSelect,
}: MetricCardProps) {
  return (
    <Card
      onClick={onSelect}
      aria-pressed={selected}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'bg-card ring-border/60 hover:ring-primary/50 flex cursor-pointer flex-col gap-1 rounded-xl p-4 text-left ring-1 transition',
        selected && 'ring-primary ring-2'
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {displayValue ?? value.toLocaleString()}
      </div>
    </Card>
  );
}
