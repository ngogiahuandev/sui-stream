'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import {
  COMMENT_CREATED_EVENT_TYPE,
  COMMENT_DELETED_EVENT_TYPE,
  MISSION_COMMENT_BIT,
  MISSION_LIKE_BIT,
  MISSION_VIEW_BIT,
  VOTE_CAST_EVENT_TYPE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
  computeViewRequiredSeconds,
} from '@/lib/constants';

export interface MissionProgress {
  viewRequired: boolean;
  likeRequired: boolean;
  commentRequired: boolean;
  viewDone: boolean;
  likeDone: boolean;
  commentDone: boolean;
  allDone: boolean;
  viewRequiredSeconds: number;
  isLoading: boolean;
}

interface Args {
  clipId?: string;
  viewer?: string;
  requiredMask?: number;
  watchedSeconds: number;
  clipDurationSeconds?: number;
}

export function useMissionProgress({
  clipId,
  viewer,
  requiredMask,
  watchedSeconds,
  clipDurationSeconds,
}: Args): MissionProgress {
  const suiClient = useSuiClient();

  const viewRequired = ((requiredMask ?? 0) & MISSION_VIEW_BIT) !== 0;
  const likeRequired = ((requiredMask ?? 0) & MISSION_LIKE_BIT) !== 0;
  const commentRequired = ((requiredMask ?? 0) & MISSION_COMMENT_BIT) !== 0;

  const likeQuery = useQuery<boolean>({
    queryKey: ['mission-progress-like', clipId, viewer],
    enabled: Boolean(clipId && viewer && likeRequired && VOTE_CAST_EVENT_TYPE),
    staleTime: 10_000,
    queryFn: async () => {
      if (!clipId || !viewer) return false;

      const removed = new Set<string>();
      if (VOTE_REMOVED_EVENT_TYPE) {
        const rem = await suiClient.queryEvents({
          query: { MoveEventType: VOTE_REMOVED_EVENT_TYPE },
          limit: 200,
          order: 'descending',
        });
        for (const ev of rem.data) {
          const p = ev.parsedJson as {
            vote_id?: string;
            clip_id?: string;
            voter?: string;
          } | null;
          if (p?.clip_id === clipId && p.voter === viewer && p.vote_id) {
            removed.add(p.vote_id);
          }
        }
      }

      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;
      for (let i = 0; i < 6; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: VOTE_CAST_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'descending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as {
            vote_id?: string;
            clip_id?: string;
            voter?: string;
            vote_type?: number | string;
          } | null;
          if (!p) continue;
          if (p.clip_id !== clipId || p.voter !== viewer) continue;
          if (Number(p.vote_type) !== VOTE_UPVOTE) continue;
          if (p.vote_id && removed.has(p.vote_id)) continue;
          return true;
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return false;
    },
  });

  const commentQuery = useQuery<boolean>({
    queryKey: ['mission-progress-comment', clipId, viewer],
    enabled:
      Boolean(clipId && viewer && commentRequired && COMMENT_CREATED_EVENT_TYPE),
    staleTime: 10_000,
    queryFn: async () => {
      if (!clipId || !viewer) return false;

      const deleted = new Set<string>();
      if (COMMENT_DELETED_EVENT_TYPE) {
        const del = await suiClient.queryEvents({
          query: { MoveEventType: COMMENT_DELETED_EVENT_TYPE },
          limit: 200,
          order: 'descending',
        });
        for (const ev of del.data) {
          const p = ev.parsedJson as {
            comment_id?: string;
            clip_id?: string;
            author?: string;
          } | null;
          if (p?.clip_id === clipId && p.author === viewer && p.comment_id) {
            deleted.add(p.comment_id);
          }
        }
      }

      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;
      for (let i = 0; i < 6; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: COMMENT_CREATED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'descending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as {
            comment_id?: string;
            clip_id?: string;
            author?: string;
            content?: string;
          } | null;
          if (!p) continue;
          if (p.clip_id !== clipId || p.author !== viewer) continue;
          if (p.comment_id && deleted.has(p.comment_id)) continue;
          if ((p.content ?? '').trim().length < 1) continue;
          return true;
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return false;
    },
  });

  const viewRequiredSeconds = computeViewRequiredSeconds(
    clipDurationSeconds ?? 0
  );
  const viewDone = !viewRequired || watchedSeconds >= viewRequiredSeconds;
  const likeDone = !likeRequired || Boolean(likeQuery.data);
  const commentDone = !commentRequired || Boolean(commentQuery.data);
  const allDone = viewDone && likeDone && commentDone;

  return {
    viewRequired,
    likeRequired,
    commentRequired,
    viewDone,
    likeDone,
    commentDone,
    allDone,
    viewRequiredSeconds,
    isLoading: likeQuery.isLoading || commentQuery.isLoading,
  };
}
