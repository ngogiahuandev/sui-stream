'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SUBSCRIBED_EVENT_TYPE,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
  UNSUBSCRIBED_EVENT_TYPE,
} from '@/lib/constants';
import { buildSubscribeTx, buildUnsubscribeTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';

interface SubscribedPayload {
  subscription_id: string;
  subscriber: string;
  target: string;
  created_at_ms: string | number;
}

interface UnsubscribedPayload {
  subscription_id: string;
  subscriber: string;
  target: string;
  removed_at_ms: string | number;
}

interface ActiveSubscription {
  subscriptionId: string;
  subscriber: string;
  target: string;
  createdAtMs: number;
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

function useActiveSubscriptions() {
  const suiClient = useSuiClient();

  return useQuery<ActiveSubscription[]>({
    queryKey: ['subscriptions-active'],
    enabled: Boolean(SUBSCRIBED_EVENT_TYPE),
    staleTime: 15_000,
    queryFn: async () => {
      const [subs, unsubs] = await Promise.all([
        fetchAllEvents<SubscribedPayload>(suiClient, SUBSCRIBED_EVENT_TYPE),
        fetchAllEvents<UnsubscribedPayload>(
          suiClient,
          UNSUBSCRIBED_EVENT_TYPE
        ),
      ]);
      const removed = new Set<string>();
      for (const u of unsubs) removed.add(u.subscription_id);

      const byPair = new Map<string, ActiveSubscription>();
      for (const s of subs) {
        if (removed.has(s.subscription_id)) continue;
        const key = `${s.subscriber.toLowerCase()}->${s.target.toLowerCase()}`;
        const createdAtMs = Number(s.created_at_ms ?? 0);
        const prev = byPair.get(key);
        if (!prev || createdAtMs >= prev.createdAtMs) {
          byPair.set(key, {
            subscriptionId: s.subscription_id,
            subscriber: s.subscriber,
            target: s.target,
            createdAtMs,
          });
        }
      }
      return Array.from(byPair.values());
    },
  });
}

export interface UseSubscriptionResult {
  isSubscribed: boolean;
  subscriberCount: number;
  subscribingCount: number;
  subscriptionId: string | null;
  isLoading: boolean;
  isPending: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  toggle: () => Promise<void>;
}

export function useSubscription(
  target: string | undefined
): UseSubscriptionResult {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const active = useActiveSubscriptions();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions-active'] });
  }, [queryClient]);

  const targetLower = target?.toLowerCase();
  const selfLower = account?.address?.toLowerCase();

  const { userEntry, subscriberCount, subscribingCount } = useMemo(() => {
    const list = active.data ?? [];
    let count = 0;
    let outgoing = 0;
    let entry: ActiveSubscription | undefined;
    for (const s of list) {
      if (targetLower && s.target.toLowerCase() === targetLower) count += 1;
      if (selfLower && s.subscriber.toLowerCase() === selfLower) outgoing += 1;
      if (
        selfLower &&
        targetLower &&
        s.subscriber.toLowerCase() === selfLower &&
        s.target.toLowerCase() === targetLower
      ) {
        entry = s;
      }
    }
    return { userEntry: entry, subscriberCount: count, subscribingCount: outgoing };
  }, [active.data, targetLower, selfLower]);

  const subscribe = useCallback(async () => {
    if (!target) return;
    if (!account) {
      toast.error('Connect your wallet to subscribe.');
      return;
    }
    if (account.address.toLowerCase() === target.toLowerCase()) {
      toast.error("You can't subscribe to yourself.");
      return;
    }
    if (userEntry) return;

    const tx = buildSubscribeTx(account.address, target);
    try {
      await executeAsSponsor({
        transaction: tx,
        client: suiClient,
        allowedMoveCallTargets: [
          `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::subscribe`,
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      invalidate();
      toast.success('Subscribed.');
    } catch (error) {
      console.error('[subscribe] failed', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not subscribe.'
      );
    }
  }, [account, target, suiClient, userEntry, invalidate]);

  const unsubscribe = useCallback(async () => {
    if (!account || !userEntry) return;

    const tx = buildUnsubscribeTx(account.address, userEntry.subscriptionId);
    try {
      await executeAsSponsor({
        transaction: tx,
        client: suiClient,
        allowedMoveCallTargets: [
          `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::unsubscribe`,
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      invalidate();
      toast.success('Unsubscribed.');
    } catch (error) {
      console.error('[unsubscribe] failed', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not unsubscribe.'
      );
    }
  }, [account, userEntry, suiClient, invalidate]);

  const toggle = useCallback(async () => {
    if (userEntry) await unsubscribe();
    else await subscribe();
  }, [userEntry, subscribe, unsubscribe]);

  return {
    isSubscribed: Boolean(userEntry),
    subscriberCount,
    subscribingCount,
    subscriptionId: userEntry?.subscriptionId ?? null,
    isLoading: active.isLoading,
    isPending: active.isFetching,
    subscribe,
    unsubscribe,
    toggle,
  };
}

export interface UseSubscribedAddressesResult {
  addresses: string[];
  isLoading: boolean;
  refetch: () => void;
  isFetching: boolean;
}

export function useSubscribedAddresses(): UseSubscribedAddressesResult {
  const account = useCurrentAccount();
  const active = useActiveSubscriptions();

  const addresses = useMemo(() => {
    if (!account?.address) return [];
    const selfLower = account.address.toLowerCase();
    const list = active.data ?? [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of list) {
      if (s.subscriber.toLowerCase() !== selfLower) continue;
      if (seen.has(s.target.toLowerCase())) continue;
      seen.add(s.target.toLowerCase());
      out.push(s.target);
    }
    return out;
  }, [active.data, account?.address]);

  return {
    addresses,
    isLoading: active.isLoading,
    refetch: () => {
      active.refetch();
    },
    isFetching: active.isFetching,
  };
}
