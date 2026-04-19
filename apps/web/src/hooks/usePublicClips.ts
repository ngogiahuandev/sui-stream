'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  CLIP_CREATED_EVENT_TYPE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import { parseClipObject } from '@/lib/sui';
import type { Clip } from '@/types/clip';

interface ClipCreatedEventPayload {
  id: string;
  owner: string;
  visibility: number | string;
  blob_id: string;
  thumbnail_blob_id: string;
  duration_seconds: string;
  created_at_ms: string;
}

const PAGE_LIMIT = 50;

export function usePublicClips() {
  const suiClient = useSuiClient();

  return useQuery<Clip[]>({
    queryKey: ['public-clips', SUI_STREAM_PACKAGE_ID],
    enabled: Boolean(SUI_STREAM_PACKAGE_ID),
    staleTime: 15_000,
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: { MoveEventType: CLIP_CREATED_EVENT_TYPE },
        order: 'descending',
        limit: PAGE_LIMIT,
      });

      const ids = new Set<string>();
      for (const ev of events.data) {
        const payload = ev.parsedJson as ClipCreatedEventPayload | undefined;
        if (!payload) continue;
        if (payload.id) ids.add(payload.id);
      }

      if (ids.size === 0) return [];

      const objects = await suiClient.multiGetObjects({
        ids: Array.from(ids),
        options: { showContent: true, showOwner: true },
      });

      console.info('[public-clips] queryEvents result', {
        eventCount: events.data.length,
        objectCount: objects.length,
      });

      const clips: Clip[] = [];
      for (const obj of objects) {
        const parsed = parseClipObject(obj);
        if (parsed) clips.push(parsed);
      }

      clips.sort((a, b) => b.createdAtMs - a.createdAtMs);
      return clips;
    },
  });
}
