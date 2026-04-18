'use client';

import { useMemo } from 'react';
import { useSuiClientQuery } from '@mysten/dapp-kit';

/** 1 SUI = 10^9 MIST. */
const MIST_PER_SUI = 1_000_000_000n;

export interface UseSuiBalanceResult {
  /** Raw balance in MIST as a bigint, or null while loading / disconnected. */
  mist: bigint | null;
  /** Balance in SUI as a number (may lose precision — display only). */
  sui: number | null;
  /** Formatted balance string like "1.2345 SUI" or null while loading. */
  formatted: string | null;
  /** True while the RPC query is in-flight. */
  isLoading: boolean;
  /** Whether the balance query errored. */
  isError: boolean;
  /** Refetch the balance. */
  refetch: () => void;
}

function formatSui(mist: bigint, fractionDigits = 4): string {
  const whole = mist / MIST_PER_SUI;
  const remainder = mist % MIST_PER_SUI;

  if (remainder === 0n) return `${whole.toString()} SUI`;

  // Pad to 9 digits, trim to requested fractionDigits, strip trailing zeroes.
  const fraction = remainder
    .toString()
    .padStart(9, '0')
    .slice(0, fractionDigits)
    .replace(/0+$/, '');

  return fraction.length > 0
    ? `${whole.toString()}.${fraction} SUI`
    : `${whole.toString()} SUI`;
}

interface UseSuiBalanceOptions {
  /** Override the address — defaults to empty so the hook is a no-op until an address is provided. */
  address: string | null | undefined;
  /** Coin type. Defaults to native SUI. */
  coinType?: string;
  /** Formatted string precision. Default 4. */
  fractionDigits?: number;
}

/**
 * Fetches a Sui address's balance for a given coin type (defaults to native SUI).
 * Returns both raw mist and a human-friendly formatted string.
 */
export function useSuiBalance({
  address,
  coinType,
  fractionDigits = 4,
}: UseSuiBalanceOptions): UseSuiBalanceResult {
  const query = useSuiClientQuery(
    'getBalance',
    { owner: address ?? '', ...(coinType ? { coinType } : {}) },
    {
      enabled: Boolean(address),
      staleTime: 15_000,
      refetchInterval: 30_000,
    }
  );

  const { mist, sui, formatted } = useMemo(() => {
    if (!query.data?.totalBalance) {
      return { mist: null, sui: null, formatted: null };
    }
    try {
      const raw = BigInt(query.data.totalBalance);
      return {
        mist: raw,
        sui: Number(raw) / Number(MIST_PER_SUI),
        formatted: formatSui(raw, fractionDigits),
      };
    } catch (error) {
      console.error('[sui-balance] failed to parse totalBalance', error);
      return { mist: null, sui: null, formatted: null };
    }
  }, [query.data?.totalBalance, fractionDigits]);

  return {
    mist,
    sui,
    formatted,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
