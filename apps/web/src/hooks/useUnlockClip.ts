'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { buildUnlockClipTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import {
  SUI_STREAM_ACCESS_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';

interface UseUnlockClipResult {
  unlock: (args: { clipId: string; priceMist: bigint }) => Promise<void>;
  isUnlocking: boolean;
}

export function useUnlockClip(): UseUnlockClipResult {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const unlock = useCallback(
    async ({
      clipId,
      priceMist,
    }: {
      clipId: string;
      priceMist: bigint;
    }) => {
      if (!account) {
        toast.error('Connect your wallet to unlock this clip.');
        return;
      }

      setIsUnlocking(true);
      const id = toast.loading('Unlocking clip…');

      try {
        const tx = buildUnlockClipTx({
          clipId,
          priceMist,
          viewer: account.address,
        });

        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [
            `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_ACCESS_MODULE}::unlock_clip`,
          ],
        });

        await queryClient.invalidateQueries({ queryKey: ['getOwnedObjects'] });

        toast.success('Unlocked! Decrypting…', { id });
      } catch (error) {
        console.error('[unlock] failed', error);
        const message =
          error instanceof Error ? error.message : 'Failed to unlock clip.';
        toast.error(message, { id });
        throw error;
      } finally {
        setIsUnlocking(false);
      }
    },
    [account, suiClient, queryClient]
  );

  return { unlock, isUnlocking };
}
