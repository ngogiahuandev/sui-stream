'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COMMENT_CREATED_EVENT_TYPE,
  COMMENT_DELETED_EVENT_TYPE,
  MAX_COMMENT_WORDS,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import { buildCreateCommentTx, buildDeleteCommentTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';

export interface Comment {
  commentId: string;
  clipId: string;
  author: string;
  content: string;
  createdAtMs: number;
}

interface CommentCreatedPayload {
  comment_id: string;
  clip_id: string;
  author: string;
  content: string;
  created_at_ms: string | number;
}

interface CommentDeletedPayload {
  comment_id: string;
  clip_id: string;
  author: string;
  removed_at_ms: string | number;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function fetchAllEvents<T>(
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

export interface UseCommentsResult {
  comments: Comment[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  createComment: (content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  maxWords: number;
}

export function useComments(clipId: string | undefined): UseCommentsResult {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabled = Boolean(clipId && COMMENT_CREATED_EVENT_TYPE);

  const query = useQuery<Comment[]>({
    queryKey: ['clip-comments', clipId ?? ''],
    enabled,
    staleTime: 15_000,
    queryFn: async () => {
      const [created, deleted] = await Promise.all([
        fetchAllEvents<CommentCreatedPayload>(
          suiClient,
          COMMENT_CREATED_EVENT_TYPE
        ),
        fetchAllEvents<CommentDeletedPayload>(
          suiClient,
          COMMENT_DELETED_EVENT_TYPE
        ),
      ]);

      const removed = new Set<string>();
      for (const d of deleted) removed.add(d.comment_id);

      const items: Comment[] = [];
      const targetClip = clipId?.toLowerCase();
      for (const c of created) {
        if (removed.has(c.comment_id)) continue;
        if (targetClip && c.clip_id.toLowerCase() !== targetClip) continue;
        items.push({
          commentId: c.comment_id,
          clipId: c.clip_id,
          author: c.author,
          content: c.content,
          createdAtMs: Number(c.created_at_ms ?? 0),
        });
      }

      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      return items;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clip-comments', clipId ?? ''] });
  }, [queryClient, clipId]);

  const createComment = useCallback(
    async (content: string): Promise<boolean> => {
      if (!clipId) return false;
      if (!account) {
        toast.error('Connect your wallet to comment.');
        return false;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        toast.error('Comment cannot be empty.');
        return false;
      }

      const words = countWords(trimmed);
      if (words > MAX_COMMENT_WORDS) {
        toast.error(`Comments are limited to ${MAX_COMMENT_WORDS} words.`);
        return false;
      }

      setIsSubmitting(true);
      try {
        const tx = buildCreateCommentTx({
          clipId,
          author: account.address,
          content: trimmed,
        });
        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [
            `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::create_comment`,
          ],
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        invalidate();
        toast.success('Comment posted.');
        return true;
      } catch (error) {
        console.error('[comment] create failed', error);
        toast.error(
          error instanceof Error ? error.message : 'Could not post comment.'
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, clipId, suiClient, invalidate]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!clipId || !account) return;
      setIsSubmitting(true);
      try {
        const tx = buildDeleteCommentTx(commentId, clipId, account.address);
        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [
            `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::delete_comment`,
          ],
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        invalidate();
        toast.success('Comment deleted.');
      } catch (error) {
        console.error('[comment] delete failed', error);
        toast.error(
          error instanceof Error ? error.message : 'Could not delete comment.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, clipId, suiClient, invalidate]
  );

  return useMemo(
    () => ({
      comments: query.data ?? [],
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      refetch: () => {
        query.refetch();
      },
      createComment,
      deleteComment,
      isSubmitting,
      maxWords: MAX_COMMENT_WORDS,
    }),
    [query, createComment, deleteComment, isSubmitting]
  );
}
