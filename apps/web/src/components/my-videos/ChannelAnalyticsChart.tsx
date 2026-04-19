'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { TimelinePoint } from '@/hooks/useUserAnalytics';

interface ChannelAnalyticsChartProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  series: TimelinePoint[];
  startMs: number;
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

export function ChannelAnalyticsChart({
  label,
  color,
  icon,
  series,
  startMs,
}: ChannelAnalyticsChartProps) {
  const now = Date.now();
  const start = startMs > 0 ? startMs : (series[0]?.timestampMs ?? now);
  const spanMs = Math.max(1, now - start);

  const chartData = useMemo(
    () =>
      padSeries(series, start, now).map((p) => ({
        t: p.timestampMs,
        value: p.value,
      })),
    [series, start, now]
  );

  const chartConfig: ChartConfig = {
    value: { label, color },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {label} over time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
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
  );
}
