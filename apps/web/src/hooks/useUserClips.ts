'use client';

import { useMemo } from 'react';
import { usePublicClips } from '@/hooks/usePublicClips';
import type { Clip } from '@/types/clip';

export interface UseUserClipsResult {
  clips: Clip[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
}

export function useUserClips(address: string): UseUserClipsResult {
  const query = usePublicClips();

  const clips = useMemo(() => {
    if (!query.data) return [];
    const normalized = address.toLowerCase();
    return query.data.filter((clip) => clip.owner.toLowerCase() === normalized);
  }, [query.data, address]);

  return {
    clips,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      query.refetch();
    },
    isFetching: query.isFetching,
  };
}
