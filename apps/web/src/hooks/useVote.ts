'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
  VOTE_CAST_EVENT_TYPE,
  VOTE_DOWNVOTE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
} from '@/lib/constants';
import { buildRemoveVoteTx, buildVoteClipTx, type VoteType } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';

interface VoteCastEventPayload {
  vote_id: string;
  clip_id: string;
  voter: string;
  vote_type: number | string;
  created_at_ms: string | number;
}

interface VoteRemovedEventPayload {
  vote_id: string;
  clip_id: string;
  voter: string;
  vote_type: number | string;
  removed_at_ms: string | number;
}

interface ClipVoteTotals {
  upvotes: number;
  downvotes: number;
  activeVotes: Map<string, { voteId: string; voteType: number }>;
}

export interface UseVoteResult {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  isUpvoted: boolean;
  isDownvoted: boolean;
  userVoteId: string | null;
  isLoading: boolean;
  isPending: boolean;
  upvote: () => Promise<void>;
  downvote: () => Promise<void>;
  clearVote: () => Promise<void>;
}

function normalizeVoteType(raw: number | string): number {
  return typeof raw === 'string' ? Number(raw) : raw;
}

async function fetchAllEvents<T>(
  client: ReturnType<typeof useSuiClient>,
  eventType: string
): Promise<{ parsedJson: T }[]> {
  if (!eventType) return [];
  const results: { parsedJson: T }[] = [];
  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 20; i += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: eventType },
      cursor,
      limit: 200,
      order: 'ascending',
    });
    for (const ev of page.data) {
      if (ev.parsedJson) {
        results.push({ parsedJson: ev.parsedJson as T });
      }
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return results;
}

export function useVote(clipId: string | undefined): UseVoteResult {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  const totalsQuery = useQuery<ClipVoteTotals>({
    queryKey: ['clip-vote-totals', clipId],
    enabled: Boolean(clipId && VOTE_CAST_EVENT_TYPE),
    staleTime: 15_000,
    queryFn: async () => {
      const empty: ClipVoteTotals = {
        upvotes: 0,
        downvotes: 0,
        activeVotes: new Map(),
      };
      if (!clipId) return empty;

      const [casts, removals] = await Promise.all([
        fetchAllEvents<VoteCastEventPayload>(suiClient, VOTE_CAST_EVENT_TYPE),
        fetchAllEvents<VoteRemovedEventPayload>(
          suiClient,
          VOTE_REMOVED_EVENT_TYPE
        ),
      ]);

      const removedVoteIds = new Set<string>();
      for (const { parsedJson } of removals) {
        if (parsedJson.clip_id === clipId) removedVoteIds.add(parsedJson.vote_id);
      }

      const activeVotes = new Map<
        string,
        { voteId: string; voteType: number; createdAtMs: number }
      >();
      for (const { parsedJson } of casts) {
        if (parsedJson.clip_id !== clipId) continue;
        if (removedVoteIds.has(parsedJson.vote_id)) continue;
        const voteType = normalizeVoteType(parsedJson.vote_type);
        const createdAtMs = Number(parsedJson.created_at_ms ?? 0);
        const prev = activeVotes.get(parsedJson.voter);
        if (!prev || createdAtMs >= prev.createdAtMs) {
          activeVotes.set(parsedJson.voter, {
            voteId: parsedJson.vote_id,
            voteType,
            createdAtMs,
          });
        }
      }

      let upvotes = 0;
      let downvotes = 0;
      const flat = new Map<string, { voteId: string; voteType: number }>();
      for (const [voter, entry] of activeVotes) {
        flat.set(voter, { voteId: entry.voteId, voteType: entry.voteType });
        if (entry.voteType === VOTE_UPVOTE) upvotes += 1;
        else if (entry.voteType === VOTE_DOWNVOTE) downvotes += 1;
      }

      return { upvotes, downvotes, activeVotes: flat };
    },
  });

  const upvotes = totalsQuery.data?.upvotes ?? 0;
  const downvotes = totalsQuery.data?.downvotes ?? 0;
  const userEntry =
    account?.address && totalsQuery.data?.activeVotes
      ? totalsQuery.data.activeVotes.get(account.address)
      : undefined;
  const isUpvoted = userEntry?.voteType === VOTE_UPVOTE;
  const isDownvoted = userEntry?.voteType === VOTE_DOWNVOTE;
  const userVoteId = userEntry?.voteId ?? null;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clip-vote-totals', clipId] });
  }, [queryClient, clipId]);

  const clearVote = useCallback(async () => {
    if (!clipId || !account || !userEntry?.voteId) return;

    const tx = buildRemoveVoteTx(clipId, userEntry.voteId);
    const removeTarget = `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::remove_vote`;
    try {
      await executeAsSponsor({
        transaction: tx,
        client: suiClient,
        allowedMoveCallTargets: [removeTarget],
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      invalidate();
    } catch (error) {
      console.error('[vote] failed to remove vote', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not remove vote.'
      );
    }
  }, [clipId, account, suiClient, userEntry?.voteId, invalidate]);

  const cast = useCallback(
    async (voteType: VoteType) => {
      if (!clipId) return;
      if (!account) {
        toast.error('Connect your wallet to vote.');
        return;
      }
      if (userEntry?.voteType === voteType) {
        await clearVote();
        return;
      }

      const tx = buildVoteClipTx({
        clipId,
        voter: account.address,
        voteType,
        existingVoteId: userEntry?.voteId ?? null,
      });
      const castTarget = `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::cast_vote`;
      const removeTarget = `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::remove_vote`;
      const allowedMoveCallTargets = userEntry?.voteId
        ? [castTarget, removeTarget]
        : [castTarget];

      try {
        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets,
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        invalidate();
      } catch (error) {
        console.error('[vote] failed to cast vote', error);
        toast.error(
          error instanceof Error ? error.message : 'Could not submit vote.'
        );
      }
    },
    [clipId, account, suiClient, userEntry, invalidate, clearVote]
  );

  const upvote = useCallback(() => cast(VOTE_UPVOTE as VoteType), [cast]);
  const downvote = useCallback(() => cast(VOTE_DOWNVOTE as VoteType), [cast]);

  return useMemo(
    () => ({
      upvotes,
      downvotes,
      netVotes: upvotes - downvotes,
      isUpvoted,
      isDownvoted,
      userVoteId,
      isLoading: totalsQuery.isLoading,
      isPending: totalsQuery.isFetching,
      upvote,
      downvote,
      clearVote,
    }),
    [
      upvotes,
      downvotes,
      isUpvoted,
      isDownvoted,
      userVoteId,
      totalsQuery.isLoading,
      totalsQuery.isFetching,
      upvote,
      downvote,
      clearVote,
    ]
  );
}
