'use client';

import { useMemo } from 'react';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { parseClipObject } from '@/lib/sui';
import type { Clip } from '@/types/clip';

interface UseClipResult {
  clip: Clip | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useClip(clipId: string | undefined): UseClipResult {
  const { data, isLoading, isError, refetch } = useSuiClientQuery(
    'getObject',
    {
      id: clipId ?? '',
      options: { showContent: true, showOwner: true },
    },
    { enabled: Boolean(clipId), staleTime: 15_000 }
  );

  const clip = useMemo(() => (data ? parseClipObject(data) : null), [data]);

  return {
    clip,
    isLoading,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
