'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE } from '@/lib/constants';
import type { TimelinePoint } from '@/hooks/useClipAnalytics';

export interface ClaimEntry {
  viewer: string;
  claimedAtMs: number;
  rewardMist: bigint;
  digest?: string;
}

export interface CampaignClaimsData {
  claims: ClaimEntry[];
  timeline: TimelinePoint[];
  totalClaims: number;
}

const EMPTY: CampaignClaimsData = { claims: [], timeline: [], totalClaims: 0 };

export function useCampaignClaims(campaignId: string | undefined) {
  const suiClient = useSuiClient();

  const query = useQuery<CampaignClaimsData>({
    queryKey: ['campaign-claims', campaignId],
    enabled: Boolean(campaignId) && Boolean(CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE),
    staleTime: 15_000,
    queryFn: async () => {
      if (!campaignId) return EMPTY;

      const entries: ClaimEntry[] = [];
      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;

      for (let i = 0; i < 20; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'ascending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as {
            campaign_id?: string;
            viewer?: string;
            reward_mist?: string;
            claimed_at_ms?: string;
          } | null;
          if (!p || p.campaign_id !== campaignId) continue;
          const ts = Number(p.claimed_at_ms ?? ev.timestampMs ?? 0);
          entries.push({
            viewer: p.viewer ?? '',
            claimedAtMs: ts,
            rewardMist: BigInt(p.reward_mist ?? 0),
            digest: (ev.id as { txDigest?: string } | undefined)?.txDigest,
          });
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }

      const sorted = [...entries].sort((a, b) => a.claimedAtMs - b.claimedAtMs);
      let running = 0;
      const timeline: TimelinePoint[] = sorted.map((e) => {
        running += 1;
        return { timestampMs: e.claimedAtMs, value: running };
      });

      return { claims: sorted, timeline, totalClaims: entries.length };
    },
  });

  return {
    data: query.data ?? EMPTY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: () => { void query.refetch(); },
  };
}
