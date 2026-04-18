'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Clip } from '@/types/clip';

export interface AiDiscoverPicks {
  query: string;
  clipIds: string[];
  explanation: string;
}

export interface UseAiDiscoverResult {
  picks: AiDiscoverPicks | null;
  isSuggesting: boolean;
  suggest: (query: string, clips: Clip[]) => Promise<void>;
  clear: () => void;
}

const MAX_CATALOG_CLIPS = 150;

export function useAiDiscover(): UseAiDiscoverResult {
  const [picks, setPicks] = useState<AiDiscoverPicks | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const suggest = useCallback(async (query: string, clips: Clip[]) => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error('Describe what you want to watch.');
      return;
    }
    if (clips.length === 0) {
      toast.error('No clips are available to search.');
      return;
    }

    setIsSuggesting(true);
    const toastId = toast.loading('Asking AI to pick clips for you…');

    try {
      const catalog = clips.slice(0, MAX_CATALOG_CLIPS).map((clip) => ({
        id: clip.id,
        title: clip.title,
        description: clip.description,
        tags: clip.tags,
        durationSeconds: clip.durationSeconds,
      }));

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, clips: catalog }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'AI discovery failed');
      }

      const clipIds: string[] = Array.isArray(result.clipIds) ? result.clipIds : [];
      const explanation: string =
        typeof result.explanation === 'string' ? result.explanation : '';

      if (clipIds.length === 0) {
        toast.info(explanation || 'AI found no matching clips.', { id: toastId });
        setPicks({ query: trimmed, clipIds: [], explanation });
        return;
      }

      toast.success(`AI picked ${clipIds.length} clip${clipIds.length === 1 ? '' : 's'}.`, {
        id: toastId,
      });
      setPicks({ query: trimmed, clipIds, explanation });
    } catch (error) {
      console.error('[ai-discover] failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'AI discovery failed',
        { id: toastId }
      );
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  const clear = useCallback(() => setPicks(null), []);

  return { picks, isSuggesting, suggest, clear };
}
