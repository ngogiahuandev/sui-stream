'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { buildIncrementViewsTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import {
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';

const VIEW_THRESHOLD_RATIO = 2 / 3;
const MAX_TIMEUPDATE_DELTA_SECONDS = 1.5;

const sessionFiredClips = new Set<string>();

interface UseIncrementViewsOptions {
  clipId: string | undefined;
  durationSeconds: number | undefined;
  enabled?: boolean;
}

interface UseIncrementViewsResult {
  notifyTimeUpdate: (currentTime: number) => void;
}

export function useIncrementViews({
  clipId,
  durationSeconds,
  enabled = true,
}: UseIncrementViewsOptions): UseIncrementViewsResult {
  const suiClient = useSuiClient();
  const firingRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const watchedRef = useRef(0);
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    if (!clipId) return;
    firingRef.current = false;
    lastTimeRef.current = null;
    watchedRef.current = 0;
    setHasFired(false);
  }, [clipId]);

  const notifyTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!enabled) return;
      if (!clipId) return;
      if (!durationSeconds || durationSeconds <= 0) return;
      if (firingRef.current || hasFired) return;
      if (sessionFiredClips.has(clipId)) return;

      const last = lastTimeRef.current;
      if (last !== null) {
        const delta = currentTime - last;
        if (delta > 0 && delta <= MAX_TIMEUPDATE_DELTA_SECONDS) {
          watchedRef.current += delta;
        }
      }
      lastTimeRef.current = currentTime;

      const threshold = durationSeconds * VIEW_THRESHOLD_RATIO;
      if (watchedRef.current < threshold) return;

      firingRef.current = true;
      sessionFiredClips.add(clipId);
      setHasFired(true);

      const tx = buildIncrementViewsTx(clipId);
      executeAsSponsor({
        transaction: tx,
        client: suiClient,
        allowedMoveCallTargets: [
          `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::increment_views`,
        ],
      }).catch((error) => {
        console.warn('[views] failed to increment views', error);
        sessionFiredClips.delete(clipId);
        firingRef.current = false;
        setHasFired(false);
      });
    },
    [enabled, clipId, durationSeconds, suiClient, hasFired]
  );

  return { notifyTimeUpdate };
}
