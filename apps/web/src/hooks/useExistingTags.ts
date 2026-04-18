'use client';

import { useMemo } from 'react';
import { usePublicClips } from '@/hooks/usePublicClips';

const MAX_TAGS_TO_SUGGEST = 50;

export function useExistingTags(): string[] {
  const { data: clips } = usePublicClips();

  return useMemo(() => {
    if (!clips || clips.length === 0) return [];

    const counts = new Map<string, number>();
    for (const clip of clips) {
      for (const raw of clip.tags) {
        const tag = raw.toLowerCase().trim();
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_TAGS_TO_SUGGEST)
      .map(([tag]) => tag);
  }, [clips]);
}
