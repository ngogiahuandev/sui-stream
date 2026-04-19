'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  CAMPAIGN_CREATED_EVENT_TYPE,
  SUI_STREAM_CAMPAIGN_ORIGINAL_ID,
} from '@/lib/constants';

export interface CampaignSummary {
  id: string;
  clipId: string;
  creator: string;
  rewardPerClaimMist: bigint;
  maxClaims: number;
  claimsMade: number;
  claimsRemaining: number;
  requiredMask: number;
  expiresAtMs: number;
  createdAtMs: number;
  active: boolean;
  balanceMist: bigint;
}

interface CampaignCreatedPayload {
  campaign_id: string;
  clip_id: string;
  creator: string;
  reward_per_claim: string;
  max_claims: string;
  required_mask: number | string;
  total_locked: string;
  expires_at_ms: string;
  created_at_ms: string;
}

interface CampaignFields {
  id: { id: string };
  clip_id: string;
  creator: string;
  balance: string;
  reward_per_claim: string;
  max_claims: string;
  claims_made: string;
  required_mask: number | string;
  expires_at_ms: string;
  created_at_ms: string;
  active: boolean;
}

export function useCampaignForClip(clipId: string | undefined) {
  const suiClient = useSuiClient();

  return useQuery<CampaignSummary | null>({
    queryKey: ['campaign-for-clip', clipId],
    enabled:
      Boolean(clipId) &&
      Boolean(CAMPAIGN_CREATED_EVENT_TYPE) &&
      Boolean(SUI_STREAM_CAMPAIGN_ORIGINAL_ID),
    staleTime: 15_000,
    queryFn: async () => {
      if (!clipId) return null;

      let campaignId: string | null = null;
      let latestCreatedAt = 0;
      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;

      for (let i = 0; i < 10; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CAMPAIGN_CREATED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'descending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as CampaignCreatedPayload | null;
          if (!p || p.clip_id !== clipId) continue;
          const createdAt = Number(p.created_at_ms ?? 0);
          if (createdAt >= latestCreatedAt) {
            latestCreatedAt = createdAt;
            campaignId = p.campaign_id;
          }
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }

      if (!campaignId) return null;

      const obj = await suiClient.getObject({
        id: campaignId,
        options: { showContent: true },
      });
      const content = obj.data?.content;
      if (!content || content.dataType !== 'moveObject') return null;
      const fields = content.fields as unknown as CampaignFields;
      if (!fields?.id?.id) return null;

      const maxClaims = Number(fields.max_claims);
      const claimsMade = Number(fields.claims_made);

      return {
        id: fields.id.id,
        clipId: fields.clip_id,
        creator: fields.creator,
        rewardPerClaimMist: BigInt(fields.reward_per_claim),
        maxClaims,
        claimsMade,
        claimsRemaining: Math.max(0, maxClaims - claimsMade),
        requiredMask: Number(fields.required_mask) & 0xff,
        expiresAtMs: Number(fields.expires_at_ms),
        createdAtMs: Number(fields.created_at_ms),
        active: Boolean(fields.active),
        balanceMist: BigInt(fields.balance),
      };
    },
  });
}
