'use client';

import { useMemo, useState } from 'react';
import {
  EyeIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChannelAnalyticsChart } from '@/components/my-videos/ChannelAnalyticsChart';
import { DonationList } from '@/components/my-videos/DonationList';
import { useClipAnalytics, type TimelinePoint } from '@/hooks/useClipAnalytics';
import { useDonationsReceived } from '@/hooks/useDonationsReceived';
import { cn } from '@/lib/utils';

type MetricKey = 'views' | 'likes' | 'comments' | 'donations';

interface ClipAnalyticsProps {
  clipId: string;
  clipOwner: string;
  createdAtMs: number;
  fallbackViews: number;
}

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
  const points: TimelinePoint[] = [];
  points.push({
    timestampMs: Math.min(startMs, first.timestampMs),
    value: 0,
  });
  for (const p of series) points.push(p);
  if (last.timestampMs < endMs) {
    points.push({ timestampMs: endMs, value: last.value });
  }
  return points;
}

function formatTick(ts: number, spanMs: number): string {
  const d = new Date(ts);
  const day = 24 * 60 * 60 * 1000;
  if (spanMs < 2 * day) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ClipAnalytics({
  clipId,
  clipOwner,
  createdAtMs,
  fallbackViews,
}: ClipAnalyticsProps) {
  const { data, isLoading, isFetching, refetch } = useClipAnalytics(clipId);
  const { data: donationData, refetch: refetchDonations } =
    useDonationsReceived(clipOwner, clipId);
  const [selected, setSelected] = useState<MetricKey>('views');

  const now = Date.now();
  const start =
    createdAtMs > 0 ? createdAtMs : (data.views[0]?.timestampMs ?? now);
  const spanMs = Math.max(1, now - start);

  const totalViews = Math.max(data.totalViews, fallbackViews);

  const series = useMemo(() => {
    const raw =
      selected === 'views'
        ? data.views
        : selected === 'likes'
          ? data.likes
          : data.comments;
    return padSeries(raw, start, now).map((p) => ({
      t: p.timestampMs,
      value: p.value,
    }));
  }, [data, selected, start, now]);

  const metric = METRICS[selected];

  const chartConfig: ChartConfig = {
    value: {
      label: metric.label,
      color: metric.color,
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Performance</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { refetch(); refetchDonations(); }}
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
        <MetricCard
          metricKey="views"
          label={METRICS.views.label}
          icon={METRICS.views.icon}
          value={totalViews}
          selected={selected === 'views'}
          onSelect={() => setSelected('views')}
          isLoading={isLoading}
        />
        <MetricCard
          metricKey="likes"
          label={METRICS.likes.label}
          icon={METRICS.likes.icon}
          value={data.totalLikes}
          selected={selected === 'likes'}
          onSelect={() => setSelected('likes')}
          isLoading={isLoading}
        />
        <MetricCard
          metricKey="comments"
          label={METRICS.comments.label}
          icon={METRICS.comments.icon}
          value={data.totalComments}
          selected={selected === 'comments'}
          onSelect={() => setSelected('comments')}
          isLoading={isLoading}
        />
        <MetricCard
          metricKey="donations"
          label={METRICS.donations.label}
          icon={METRICS.donations.icon}
          value={donationData.totalSui}
          displayValue={`${formatSuiTotal(donationData.totalSui)} SUI`}
          selected={selected === 'donations'}
          onSelect={() => setSelected('donations')}
          isLoading={isLoading}
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
              donationData.timeline[0]?.timestampMs ?? createdAtMs
            }
          />
          <DonationList
            donations={donationData.donations}
            recipientAddress={clipOwner}
          />
        </div>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {metric.icon}
            {metric.label} over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart
              data={series}
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
      )}
    </div>
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
  isLoading: boolean;
}

function MetricCard({
  label,
  icon,
  value,
  displayValue,
  selected,
  onSelect,
  isLoading,
}: MetricCardProps) {
  return (
    <Card
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'bg-card ring-border/60 hover:ring-primary/50 flex flex-col gap-1 rounded-xl p-4 text-left ring-1 transition',
        selected && 'ring-primary ring-2'
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {isLoading ? '—' : (displayValue ?? value.toLocaleString())}
      </div>
    </Card>
  );
}
