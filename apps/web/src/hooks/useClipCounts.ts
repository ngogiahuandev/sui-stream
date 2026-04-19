'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  CLIP_VIEWED_EVENT_TYPE,
  VOTE_CAST_EVENT_TYPE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
} from '@/lib/constants';

interface ClipCountsMap {
  views: Record<string, number>;
  likes: Record<string, number>;
}

interface ViewedPayload {
  id: string;
}
interface VoteCastPayload {
  vote_id: string;
  clip_id: string;
  vote_type: number | string;
}
interface VoteRemovedPayload {
  vote_id: string;
  clip_id: string;
}

async function fetchAll<T>(
  client: ReturnType<typeof useSuiClient>,
  eventType: string
): Promise<T[]> {
  if (!eventType) return [];
  const results: T[] = [];
  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 30; i += 1) {
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

function useClipCountsMap() {
  const suiClient = useSuiClient();
  return useQuery<ClipCountsMap>({
    queryKey: ['clip-counts-map'],
    enabled: Boolean(CLIP_VIEWED_EVENT_TYPE),
    staleTime: 30_000,
    queryFn: async () => {
      const [viewedRaw, votesCastRaw, votesRemovedRaw] = await Promise.all([
        fetchAll<ViewedPayload>(suiClient, CLIP_VIEWED_EVENT_TYPE),
        fetchAll<VoteCastPayload>(suiClient, VOTE_CAST_EVENT_TYPE),
        fetchAll<VoteRemovedPayload>(suiClient, VOTE_REMOVED_EVENT_TYPE),
      ]);

      const views: Record<string, number> = {};
      for (const ev of viewedRaw) {
        const id = ev?.id?.toLowerCase();
        if (!id) continue;
        views[id] = (views[id] ?? 0) + 1;
      }

      const removed = new Set<string>();
      for (const ev of votesRemovedRaw) {
        if (ev?.vote_id) removed.add(ev.vote_id);
      }

      const likes: Record<string, number> = {};
      for (const ev of votesCastRaw) {
        if (!ev?.clip_id) continue;
        if (removed.has(ev.vote_id)) continue;
        const vt =
          typeof ev.vote_type === 'string' ? Number(ev.vote_type) : ev.vote_type;
        if (vt !== VOTE_UPVOTE) continue;
        const id = ev.clip_id.toLowerCase();
        likes[id] = (likes[id] ?? 0) + 1;
      }

      return { views, likes };
    },
  });
}

export interface UseClipCountsResult {
  views: number;
  likes: number;
  isLoading: boolean;
}

export function useClipCounts(
  clipId: string | undefined,
  fallbackViews = 0,
  fallbackLikes = 0
): UseClipCountsResult {
  const query = useClipCountsMap();
  const id = clipId?.toLowerCase();
  const views = id ? (query.data?.views[id] ?? 0) : 0;
  const likes = id ? (query.data?.likes[id] ?? 0) : 0;
  return {
    views: Math.max(views, fallbackViews),
    likes: Math.max(likes, fallbackLikes),
    isLoading: query.isLoading,
  };
}
