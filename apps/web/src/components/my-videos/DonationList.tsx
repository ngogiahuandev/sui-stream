'use client';

import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { HeartHandshakeIcon, PlayIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DonationEntry } from '@/hooks/useDonationsReceived';
import type { Clip } from '@/types/clip';

interface DonationListProps {
  donations: DonationEntry[];
  recipientAddress?: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatSui(amount: number): string {
  if (amount >= 1) return `${amount.toFixed(2)} SUI`;
  if (amount >= 0.01) return `${amount.toFixed(3)} SUI`;
  return `${amount.toFixed(6)} SUI`;
}

export function DonationList({
  donations,
  recipientAddress,
}: DonationListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeartHandshakeIcon className="size-4" />
          Donations ({donations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <HeartHandshakeIcon className="size-6 opacity-50" />
            No donations yet.
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {donations.map((d) => (
              <li
                key={`${d.digest ?? d.donor}-${d.createdAtMs}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex shrink-0 flex-col gap-1">
                  <Avatar
                    address={d.donor}
                    className="size-10 shrink-0 overflow-hidden rounded-full"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="font-mono text-xs font-medium"
                      title={d.donor}
                    >
                      {shortAddress(d.donor)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-primary text-sm font-semibold tabular-nums">
                        {formatSui(d.amountSui)}
                      </span>
                      <span
                        className="text-muted-foreground text-xs"
                        title={new Date(d.createdAtMs).toLocaleString()}
                      >
                        {formatDistanceToNowStrict(new Date(d.createdAtMs), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {d.message ? (
                    <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {d.message}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">
                      (no message)
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
