'use client';

import { useMemo } from 'react';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { CLIP_ACCESS_TYPE } from '@/lib/constants';
import { parseClipAccessObject } from '@/lib/sui';
import type { ClipAccess } from '@/types/clip';

interface UseClipAccessOptions {
  clipId: string | undefined;
  viewerAddress: string | undefined;
}

interface UseClipAccessResult {
  access: ClipAccess | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useClipAccess({
  clipId,
  viewerAddress,
}: UseClipAccessOptions): UseClipAccessResult {
  const enabled = Boolean(clipId && viewerAddress && CLIP_ACCESS_TYPE);

  const { data, isLoading, isError, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: viewerAddress ?? '',
      filter: { StructType: CLIP_ACCESS_TYPE },
      options: { showContent: true, showType: true },
    },
    { enabled, staleTime: 10_000 }
  );

  const access = useMemo<ClipAccess | null>(() => {
    if (!clipId || !data) return null;
    for (const item of data.data ?? []) {
      const parsed = parseClipAccessObject(item);
      if (parsed && parsed.clipId === clipId) return parsed;
    }
    return null;
  }, [data, clipId]);

  return {
    access,
    isLoading,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
