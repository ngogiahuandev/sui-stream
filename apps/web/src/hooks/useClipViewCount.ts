'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { CLIP_VIEWED_EVENT_TYPE } from '@/lib/constants';

interface ClipViewedPayload {
  id: string;
}

export function useClipViewCount(
  clipId: string | undefined,
  fallback = 0
): { views: number; isLoading: boolean } {
  const suiClient = useSuiClient();

  const query = useQuery<number>({
    queryKey: ['clip-view-count', clipId],
    enabled: Boolean(clipId && CLIP_VIEWED_EVENT_TYPE),
    staleTime: 15_000,
    queryFn: async () => {
      if (!clipId) return 0;

      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;
      let count = 0;
      for (let i = 0; i < 20; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CLIP_VIEWED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'ascending',
        });
        for (const ev of page.data) {
          const payload = ev.parsedJson as ClipViewedPayload | undefined;
          if (payload?.id === clipId) count += 1;
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return count;
    },
  });

  return {
    views: Math.max(query.data ?? 0, fallback),
    isLoading: query.isLoading,
  };
}
