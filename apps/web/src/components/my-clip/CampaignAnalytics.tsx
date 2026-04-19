'use client';

import { useMemo, useState } from 'react';
import { Avatar } from 'web3-avatar-react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarIcon,
  CoinsIcon,
  GiftIcon,
  RefreshCwIcon,
  UsersIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useCampaignForClip } from '@/hooks/useCampaignForClip';
import { useCampaignClaims } from '@/hooks/useCampaignClaims';
import { MIST_PER_SUI } from '@/lib/constants';
import type { TimelinePoint } from '@/hooks/useClipAnalytics';

interface CampaignAnalyticsProps {
  clipId: string;
  createdAtMs: number;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function daysLeft(expiresAtMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 86_400_000));
}

function padSeries(
  series: TimelinePoint[],
  startMs: number,
  endMs: number
): TimelinePoint[] {
  if (series.length === 0) {
    return [
      { timestampMs: startMs, value: 0 },
      { timestampMs: endMs, value: 0 },
    ];
  }
  const first = series[0];
  const last = series[series.length - 1];
  const points: TimelinePoint[] = [
    { timestampMs: Math.min(startMs, first.timestampMs), value: 0 },
    ...series,
  ];
  if (last.timestampMs < endMs) {
    points.push({ timestampMs: endMs, value: last.value });
  }
  return points;
}

function formatTick(ts: number, spanMs: number): string {
  const d = new Date(ts);
  const day = 86_400_000;
  if (spanMs < 2 * day) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const CLAIMS_COLOR = 'var(--chart-5, #a855f7)';

const chartConfig: ChartConfig = {
  value: { label: 'Claims', color: CLAIMS_COLOR },
};

export function CampaignAnalytics({ clipId, createdAtMs }: CampaignAnalyticsProps) {
  const { data: campaign, isLoading: campaignLoading } = useCampaignForClip(clipId);
  const {
    data: claimsData,
    isLoading: claimsLoading,
    isFetching,
    refetch,
  } = useCampaignClaims(campaign?.id);
  const [showAll, setShowAll] = useState(false);

  const isLoading = campaignLoading || claimsLoading;
  const now = Date.now();
  const start = createdAtMs > 0
    ? createdAtMs
    : (claimsData.timeline[0]?.timestampMs ?? now);
  const spanMs = Math.max(1, now - start);

  const chartData = useMemo(
    () =>
      padSeries(claimsData.timeline, start, now).map((p) => ({
        t: p.timestampMs,
        value: p.value,
      })),
    [claimsData.timeline, start, now]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <CoinsIcon className="text-muted-foreground size-8" />
        <h3 className="font-semibold">No campaign on this clip</h3>
        <p className="text-muted-foreground max-w-xs text-sm">
          Add a reward campaign when uploading a clip to incentivise viewers.
        </p>
      </div>
    );
  }

  const rewardSui = Number(campaign.rewardPerClaimMist) / MIST_PER_SUI;
  const progressPct =
    campaign.maxClaims === 0
      ? 0
      : Math.min(100, Math.round((campaign.claimsMade / campaign.maxClaims) * 100));
  const remaining = daysLeft(campaign.expiresAtMs);
  const expired = now >= campaign.expiresAtMs;

  const visibleClaims = showAll
    ? claimsData.claims
    : claimsData.claims.slice(-10).reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Campaign</h2>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              expired || !campaign.active
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary'
            )}
          >
            {expired ? 'Ended' : !campaign.active ? 'Paused' : 'Active'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<GiftIcon className="size-4" />}
          label="Claimed"
          value={`${campaign.claimsMade} / ${campaign.maxClaims}`}
        />
        <StatCard
          icon={<UsersIcon className="size-4" />}
          label="Slots Left"
          value={campaign.claimsRemaining.toString()}
        />
        <StatCard
          icon={<CalendarIcon className="size-4" />}
          label="Days Left"
          value={expired ? 'Ended' : `${remaining}d`}
        />
        <StatCard
          icon={<CoinsIcon className="size-4" />}
          label="Per Claim"
          value={`${rewardSui.toFixed(4)} SUI`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{campaign.claimsMade} / {campaign.maxClaims} claimed</span>
            <span>{progressPct}%</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <GiftIcon className="size-4" />
            Claims over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={[start, now]}
                scale="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatTick(v, spanMs)}
                minTickGap={40}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tickMargin={4}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(Number(value)).toLocaleString()
                    }
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <UsersIcon className="size-4" />
            Claimants ({claimsData.totalClaims})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claimsData.claims.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <UsersIcon className="size-6 opacity-50" />
              No claims yet.
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y">
                {visibleClaims.map((c, i) => (
                  <li
                    key={`${c.viewer}-${c.claimedAtMs}-${i}`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar
                      address={c.viewer}
                      className="size-9 shrink-0 overflow-hidden rounded-full"
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span
                        className="font-mono text-xs font-medium truncate"
                        title={c.viewer}
                      >
                        {shortAddress(c.viewer)}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-primary text-xs font-semibold tabular-nums">
                          +{(Number(c.rewardMist) / MIST_PER_SUI).toFixed(4)} SUI
                        </span>
                        <span
                          className="text-muted-foreground text-xs"
                          title={
                            c.claimedAtMs
                              ? new Date(c.claimedAtMs).toLocaleString()
                              : ''
                          }
                        >
                          {c.claimedAtMs
                            ? formatDistanceToNowStrict(new Date(c.claimedAtMs), {
                                addSuffix: true,
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {claimsData.claims.length > 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full text-xs"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll
                    ? 'Show less'
                    : `Show all ${claimsData.claims.length} claimants`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1 rounded-xl p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
