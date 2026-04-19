'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { parseClipObject } from '@/lib/sui';
import { getWatchHistory } from '@/lib/watch-history-store';
import type { Clip } from '@/types/clip';

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

export function useWatchHistory(): UseWatchHistoryResult {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();

  const query = useQuery<WatchHistoryEntry[]>({
    queryKey: ['watch-history', account?.address],
    enabled: Boolean(account?.address),
    staleTime: 10_000,
    queryFn: async () => {
      const records = getWatchHistory();
      if (records.length === 0) return [];

      const clipIds = records.map((r) => r.clipId);
      const tsMap = new Map(records.map((r) => [r.clipId, r.lastWatchedAtMs]));

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
          lastWatchedAtMs: tsMap.get(clip.id) ?? 0,
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
