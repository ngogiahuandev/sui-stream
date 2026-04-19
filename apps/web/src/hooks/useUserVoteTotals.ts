'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  VOTE_CAST_EVENT_TYPE,
  VOTE_DOWNVOTE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
} from '@/lib/constants';

interface VoteCastPayload {
  vote_id: string;
  clip_id: string;
  voter: string;
  vote_type: number | string;
  created_at_ms: string | number;
}

interface VoteRemovedPayload {
  vote_id: string;
  clip_id: string;
  voter: string;
  vote_type: number | string;
  removed_at_ms: string | number;
}

async function fetchAll<T>(
  client: ReturnType<typeof useSuiClient>,
  eventType: string
): Promise<T[]> {
  if (!eventType) return [];
  const results: T[] = [];
  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 20; i += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: eventType },
      cursor,
      limit: 200,
      order: 'ascending',
    });
    for (const ev of page.data) {
      if (ev.parsedJson) results.push(ev.parsedJson as T);
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return results;
}

export function useUserVoteTotals(clipIds: string[]): {
  upvotes: number;
  downvotes: number;
  isLoading: boolean;
} {
  const suiClient = useSuiClient();
  const key = [...clipIds].sort().join(',');

  const query = useQuery({
    queryKey: ['user-vote-totals', key],
    enabled: Boolean(VOTE_CAST_EVENT_TYPE && clipIds.length > 0),
    staleTime: 15_000,
    queryFn: async () => {
      const ids = new Set(clipIds);
      const [casts, removals] = await Promise.all([
        fetchAll<VoteCastPayload>(suiClient, VOTE_CAST_EVENT_TYPE),
        fetchAll<VoteRemovedPayload>(suiClient, VOTE_REMOVED_EVENT_TYPE),
      ]);

      const removed = new Set<string>();
      for (const r of removals) removed.add(r.vote_id);

      const latestPerVoter = new Map<string, number>();
      for (const c of casts) {
        if (!ids.has(c.clip_id)) continue;
        if (removed.has(c.vote_id)) continue;
        const type =
          typeof c.vote_type === 'string' ? Number(c.vote_type) : c.vote_type;
        const key = `${c.clip_id}:${c.voter}`;
        latestPerVoter.set(key, type);
      }

      let upvotes = 0;
      let downvotes = 0;
      for (const type of latestPerVoter.values()) {
        if (type === VOTE_UPVOTE) upvotes += 1;
        else if (type === VOTE_DOWNVOTE) downvotes += 1;
      }
      return { upvotes, downvotes };
    },
  });

  return {
    upvotes: query.data?.upvotes ?? 0,
    downvotes: query.data?.downvotes ?? 0,
    isLoading: query.isLoading,
  };
}
