'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { CLIP_VIEWED_EVENT_TYPE } from '@/lib/constants';
import { parseClipObject } from '@/lib/sui';
import type { Clip } from '@/types/clip';

interface ClipViewedPayload {
  id: string;
}

export interface WatchHistoryEntry {
  clip: Clip;
  lastWatchedAtMs: number;
}

interface UseWatchHistoryResult {
  entries: WatchHistoryEntry[];
  isLoading: boolean;
  isFetching: boolean;
  isConnected: boolean;
  refetch: () => void;
}

const MAX_EVENT_PAGES = 20;
const EVENT_PAGE_LIMIT = 200;

export function useWatchHistory(): UseWatchHistoryResult {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const viewer = account?.address?.toLowerCase();

  const query = useQuery<WatchHistoryEntry[]>({
    queryKey: ['watch-history', viewer],
    enabled: Boolean(viewer && CLIP_VIEWED_EVENT_TYPE),
    staleTime: 15_000,
    queryFn: async () => {
      if (!viewer) return [];

      const latestByClip = new Map<string, number>();
      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;

      for (let i = 0; i < MAX_EVENT_PAGES; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CLIP_VIEWED_EVENT_TYPE },
          cursor,
          limit: EVENT_PAGE_LIMIT,
          order: 'descending',
        });
        for (const ev of page.data) {
          if (!ev.sender || ev.sender.toLowerCase() !== viewer) continue;
          const payload = ev.parsedJson as ClipViewedPayload | undefined;
          const clipId = payload?.id;
          if (!clipId) continue;
          const ts = Number(ev.timestampMs ?? 0);
          const prev = latestByClip.get(clipId) ?? 0;
          if (ts > prev) latestByClip.set(clipId, ts);
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }

      const clipIds = Array.from(latestByClip.keys());
      if (clipIds.length === 0) return [];

      const objects = await suiClient.multiGetObjects({
        ids: clipIds,
        options: { showContent: true, showOwner: true },
      });

      const entries: WatchHistoryEntry[] = [];
      for (const obj of objects) {
        const clip = parseClipObject(obj);
        if (!clip) continue;
        entries.push({
          clip,
          lastWatchedAtMs: latestByClip.get(clip.id) ?? 0,
        });
      }

      entries.sort((a, b) => b.lastWatchedAtMs - a.lastWatchedAtMs);
      return entries;
    },
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isConnected: Boolean(account?.address),
    refetch: () => {
      void query.refetch();
    },
  };
}
