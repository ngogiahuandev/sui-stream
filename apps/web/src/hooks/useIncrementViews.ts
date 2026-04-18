'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { buildIncrementViewsTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import {
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';

const VIEW_THRESHOLD_RATIO = 2 / 3;

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
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const firingRef = useRef(false);
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    if (clipId) {
      firingRef.current = false;
      setHasFired(false);
    }
  }, [clipId]);

  const notifyTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!enabled) return;
      if (!clipId) return;
      if (!account) return;
      if (!durationSeconds) return;
      if (firingRef.current || hasFired) return;
      if (sessionFiredClips.has(clipId)) return;

      const threshold = durationSeconds * VIEW_THRESHOLD_RATIO;
      if (currentTime < threshold) return;

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
    [enabled, clipId, account, durationSeconds, suiClient, hasFired]
  );

  return { notifyTimeUpdate };
}
