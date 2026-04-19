'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  DONATION_SENT_EVENT_TYPE,
  MIST_PER_SUI,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
  SUI_STREAM_PACKAGE_ORIGINAL_ID,
} from '@/lib/constants';
import type { TimelinePoint } from '@/hooks/useUserAnalytics';

function normalizeAddress(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (hex.length === 0 || !/^[0-9a-f]+$/.test(hex)) return '';
  return '0x' + hex.padStart(64, '0');
}

export interface DonationEntry {
  donor: string;
  recipient: string;
  amountMist: bigint;
  amountSui: number;
  message: string;
  createdAtMs: number;
  digest?: string;
}

export interface DonationsReceivedData {
  donations: DonationEntry[];
  totalMist: bigint;
  totalSui: number;
  timeline: TimelinePoint[];
}

interface DonationPayload {
  donor: string;
  recipient: string;
  amount: string | number;
  message: string;
  created_at_ms: string | number;
}

async function fetchAllDonations(
  client: ReturnType<typeof useSuiClient>
): Promise<
  { payload: DonationPayload; timestampMs: number; digest: string }[]
> {
  const results: {
    payload: DonationPayload;
    timestampMs: number;
    digest: string;
  }[] = [];

  const donationSuffix = `::${SUI_STREAM_MODULE}::DonationSent`;
  const tryFilters: Parameters<typeof client.queryEvents>[0]['query'][] = [];

  console.info('[donations] trying filters', {
    DONATION_SENT_EVENT_TYPE,
    SUI_STREAM_PACKAGE_ORIGINAL_ID,
    SUI_STREAM_PACKAGE_ID,
  });

  if (DONATION_SENT_EVENT_TYPE) {
    tryFilters.push({ MoveEventType: DONATION_SENT_EVENT_TYPE });
  }
  if (SUI_STREAM_PACKAGE_ORIGINAL_ID) {
    tryFilters.push({
      MoveEventModule: {
        package: SUI_STREAM_PACKAGE_ORIGINAL_ID,
        module: SUI_STREAM_MODULE,
      },
    });
  }
  if (SUI_STREAM_PACKAGE_ID) {
    tryFilters.push({
      MoveEventModule: {
        package: SUI_STREAM_PACKAGE_ID,
        module: SUI_STREAM_MODULE,
      },
    });
  }

  for (const query of tryFilters) {
    const pageResults: {
      payload: DonationPayload;
      timestampMs: number;
      digest: string;
    }[] = [];
    let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
    try {
      for (let i = 0; i < 30; i += 1) {
        const page = await client.queryEvents({
          query,
          cursor,
          limit: 200,
          order: 'ascending',
        });
        for (const ev of page.data) {
          if (!ev.parsedJson) continue;
          if (!ev.type?.endsWith(donationSuffix)) continue;
          const payload = ev.parsedJson as DonationPayload;
          const ts = Number(payload.created_at_ms ?? ev.timestampMs ?? 0);
          if (!ts) continue;
          pageResults.push({
            payload,
            timestampMs: ts,
            digest: ev.id.txDigest,
          });
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
    } catch (error) {
      console.warn('[donations] event query failed, trying next filter', error);
      continue;
    }
    if (pageResults.length > 0) {
      console.info('[donations] events found', {
        count: pageResults.length,
        query,
      });
      const seen = new Set<string>();
      for (const r of pageResults) {
        const key = `${r.digest}:${r.payload.donor}:${r.payload.amount}:${r.timestampMs}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
      console.info('[donations] results after dedup', {
        count: results.length,
      });
      break;
    }
  }

  if (results.length === 0) {
    console.info('[donations] no results after trying all filters', {
      tryFilters,
    });
  }

  return results;
}

export interface UseDonationsReceivedResult {
  data: DonationsReceivedData;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

const EMPTY: DonationsReceivedData = {
  donations: [],
  totalMist: 0n,
  totalSui: 0,
  timeline: [],
};

export function useDonationsReceived(
  recipient: string | undefined
): UseDonationsReceivedResult {
  const suiClient = useSuiClient();
  const target = normalizeAddress(recipient);

  const query = useQuery<DonationsReceivedData>({
    queryKey: ['donations-received', target],
    enabled: Boolean(target),
    staleTime: 15_000,
    queryFn: async () => {
      const all = await fetchAllDonations(suiClient);

      if (all.length === 0) {
        console.info('[donations] no DonationSent events found on chain', {
          target,
          eventType: DONATION_SENT_EVENT_TYPE,
        });
      } else {
        console.info('[donations] fetched events', {
          count: all.length,
          target,
          firstRecipient: all[0]?.payload.recipient,
        });
      }

      const filtered = all
        .filter((ev) => {
          const recipientNorm = normalizeAddress(ev.payload.recipient);
          const matches = recipientNorm === target;
          if (!matches) {
            console.info('[donations] recipient mismatch', {
              raw: ev.payload.recipient,
              normalized: recipientNorm,
              target,
            });
          }
          return matches;
        })
        .sort((a, b) => a.timestampMs - b.timestampMs);

      const donations: DonationEntry[] = [];
      let totalMist = 0n;
      const timeline: TimelinePoint[] = [];
      let runningSui = 0;

      for (const ev of filtered) {
        const amountMist = BigInt(ev.payload.amount ?? 0);
        const amountSui = Number(amountMist) / MIST_PER_SUI;
        totalMist += amountMist;
        runningSui += amountSui;
        donations.push({
          donor: ev.payload.donor,
          recipient: ev.payload.recipient,
          amountMist,
          amountSui,
          message: ev.payload.message ?? '',
          createdAtMs: ev.timestampMs,
          digest: ev.digest,
        });
        timeline.push({
          timestampMs: ev.timestampMs,
          value: Number(runningSui.toFixed(6)),
        });
      }

      donations.reverse();

      return {
        donations,
        totalMist,
        totalSui: Number(totalMist) / MIST_PER_SUI,
        timeline,
      };
    },
  });

  return useMemo(
    () => ({
      data: query.data ?? EMPTY,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      refetch: () => {
        void query.refetch();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, query.isLoading, query.isFetching]
  );
}
