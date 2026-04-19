'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  CAMPAIGN_CREATED_EVENT_TYPE,
  SUI_STREAM_CAMPAIGN_ORIGINAL_ID,
} from '@/lib/constants';

export function useClipHasCampaign(clipId: string | undefined): boolean {
  const suiClient = useSuiClient();

  const { data } = useQuery<boolean>({
    queryKey: ['clip-has-campaign', clipId],
    enabled:
      Boolean(clipId) &&
      Boolean(CAMPAIGN_CREATED_EVENT_TYPE) &&
      Boolean(SUI_STREAM_CAMPAIGN_ORIGINAL_ID),
    staleTime: 30_000,
    queryFn: async () => {
      if (!clipId) return false;

      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;
      for (let i = 0; i < 5; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CAMPAIGN_CREATED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'descending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as { clip_id?: string; campaign_id?: string } | null;
          if (!p || p.clip_id !== clipId) continue;
          if (!p.campaign_id) continue;
          const obj = await suiClient.getObject({
            id: p.campaign_id,
            options: { showContent: true },
          });
          const content = obj.data?.content;
          if (!content || content.dataType !== 'moveObject') continue;
          const fields = content.fields as {
            active?: boolean;
            expires_at_ms?: string;
            claims_made?: string;
            max_claims?: string;
          };
          const active = Boolean(fields.active);
          const expired = Date.now() >= Number(fields.expires_at_ms ?? 0);
          const exhausted =
            Number(fields.claims_made ?? 0) >= Number(fields.max_claims ?? 0);
          if (active && !expired && !exhausted) return true;
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return false;
    },
  });

  return Boolean(data);
}
