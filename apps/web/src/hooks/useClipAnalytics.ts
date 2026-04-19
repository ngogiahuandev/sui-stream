'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  CLIP_VIEWED_EVENT_TYPE,
  COMMENT_CREATED_EVENT_TYPE,
  COMMENT_DELETED_EVENT_TYPE,
  VOTE_CAST_EVENT_TYPE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
} from '@/lib/constants';

export interface TimelinePoint {
  timestampMs: number;
  value: number;
}

export interface ClipAnalyticsData {
  views: TimelinePoint[];
  likes: TimelinePoint[];
  comments: TimelinePoint[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

interface RawEvent {
  timestampMs: string | null | undefined;
  parsedJson: unknown;
}

async function fetchEvents(
  client: ReturnType<typeof useSuiClient>,
  eventType: string
): Promise<RawEvent[]> {
  if (!eventType) return [];
  const results: RawEvent[] = [];
  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 20; i += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: eventType },
      cursor,
      limit: 200,
      order: 'ascending',
    });
    for (const ev of page.data) {
      results.push({
        timestampMs: ev.timestampMs,
        parsedJson: ev.parsedJson ?? null,
      });
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return results;
}

function toCumulative(events: { timestampMs: number; delta: number }[]): TimelinePoint[] {
  const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);
  const points: TimelinePoint[] = [];
  let running = 0;
  for (const ev of sorted) {
    running += ev.delta;
    points.push({ timestampMs: ev.timestampMs, value: running });
  }
  return points;
}

interface ViewedPayload {
  id: string;
}
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
  removed_at_ms: string | number;
}
interface CommentCreatedPayload {
  comment_id: string;
  clip_id: string;
  created_at_ms: string | number;
}
interface CommentDeletedPayload {
  comment_id: string;
  clip_id: string;
  removed_at_ms: string | number;
}

export interface UseClipAnalyticsResult {
  data: ClipAnalyticsData;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

export function useClipAnalytics(
  clipId: string | undefined
): UseClipAnalyticsResult {
  const suiClient = useSuiClient();

  const query = useQuery<ClipAnalyticsData>({
    queryKey: ['clip-analytics', clipId ?? ''],
    enabled: Boolean(clipId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!clipId) {
        return {
          views: [],
          likes: [],
          comments: [],
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
        };
      }
      const target = clipId.toLowerCase();

      const [
        viewedRaw,
        votesCastRaw,
        votesRemovedRaw,
        commentsCreatedRaw,
        commentsDeletedRaw,
      ] = await Promise.all([
        fetchEvents(suiClient, CLIP_VIEWED_EVENT_TYPE),
        fetchEvents(suiClient, VOTE_CAST_EVENT_TYPE),
        fetchEvents(suiClient, VOTE_REMOVED_EVENT_TYPE),
        fetchEvents(suiClient, COMMENT_CREATED_EVENT_TYPE),
        fetchEvents(suiClient, COMMENT_DELETED_EVENT_TYPE),
      ]);

      const viewEvents: { timestampMs: number; delta: number }[] = [];
      for (const ev of viewedRaw) {
        const payload = ev.parsedJson as ViewedPayload | null;
        if (!payload || payload.id?.toLowerCase() !== target) continue;
        const ts = Number(ev.timestampMs ?? 0);
        if (!ts) continue;
        viewEvents.push({ timestampMs: ts, delta: 1 });
      }

      const removedVoteIds = new Set<string>();
      for (const ev of votesRemovedRaw) {
        const payload = ev.parsedJson as VoteRemovedPayload | null;
        if (!payload || payload.clip_id?.toLowerCase() !== target) continue;
        removedVoteIds.add(payload.vote_id);
      }

      const likeEvents: { timestampMs: number; delta: number }[] = [];
      let totalLikes = 0;
      for (const ev of votesCastRaw) {
        const payload = ev.parsedJson as VoteCastPayload | null;
        if (!payload || payload.clip_id?.toLowerCase() !== target) continue;
        const vt =
          typeof payload.vote_type === 'string'
            ? Number(payload.vote_type)
            : payload.vote_type;
        if (vt !== VOTE_UPVOTE) continue;
        if (removedVoteIds.has(payload.vote_id)) continue;
        const ts = Number(payload.created_at_ms ?? ev.timestampMs ?? 0);
        if (!ts) continue;
        likeEvents.push({ timestampMs: ts, delta: 1 });
        totalLikes += 1;
      }

      const deletedCommentIds = new Set<string>();
      for (const ev of commentsDeletedRaw) {
        const payload = ev.parsedJson as CommentDeletedPayload | null;
        if (!payload || payload.clip_id?.toLowerCase() !== target) continue;
        deletedCommentIds.add(payload.comment_id);
      }

      const commentEvents: { timestampMs: number; delta: number }[] = [];
      let totalComments = 0;
      for (const ev of commentsCreatedRaw) {
        const payload = ev.parsedJson as CommentCreatedPayload | null;
        if (!payload || payload.clip_id?.toLowerCase() !== target) continue;
        if (deletedCommentIds.has(payload.comment_id)) continue;
        const ts = Number(payload.created_at_ms ?? ev.timestampMs ?? 0);
        if (!ts) continue;
        commentEvents.push({ timestampMs: ts, delta: 1 });
        totalComments += 1;
      }

      return {
        views: toCumulative(viewEvents),
        likes: toCumulative(likeEvents),
        comments: toCumulative(commentEvents),
        totalViews: viewEvents.length,
        totalLikes,
        totalComments,
      };
    },
  });

  const empty: ClipAnalyticsData = {
    views: [],
    likes: [],
    comments: [],
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  };

  return useMemo(
    () => ({
      data: query.data ?? empty,
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
