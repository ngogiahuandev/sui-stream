'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { base64ToBytes } from '@/lib/attestation';
import { buildClaimRewardTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import {
  SUI_STREAM_CAMPAIGN_MODULE,
  SUI_STREAM_CAMPAIGN_PACKAGE_ID,
} from '@/lib/constants';

interface ClaimArgs {
  campaignId: string;
  clipId: string;
  watchedSeconds: number;
}

interface AttestResponse {
  nonce: string;
  signature: string;
  expiryMs: string;
  requiredMask: number;
  clipId: string;
  error?: string;
  progress?: Record<string, boolean>;
}

export interface UseClaimRewardResult {
  isPending: boolean;
  claim: (args: ClaimArgs) => Promise<string | null>;
}

export function useClaimReward(): UseClaimRewardResult {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const claim = useCallback(
    async ({
      campaignId,
      clipId,
      watchedSeconds,
    }: ClaimArgs): Promise<string | null> => {
      if (!account) {
        toast.error('Connect your wallet to claim.');
        return null;
      }
      setIsPending(true);

      try {
        const attestRes = await fetch(
          `/api/campaign/${campaignId}/claim-attest`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              viewer: account.address,
              watchedSeconds,
            }),
          }
        );
        const attest = (await attestRes.json()) as AttestResponse;
        if (!attestRes.ok) {
          throw new Error(attest.error || 'Attestation failed');
        }

        const tx = buildClaimRewardTx({
          campaignId,
          viewer: account.address,
          clipId,
          nonce: base64ToBytes(attest.nonce),
          expiryMs: BigInt(attest.expiryMs),
          signature: base64ToBytes(attest.signature),
        });
        const target = `${SUI_STREAM_CAMPAIGN_PACKAGE_ID}::${SUI_STREAM_CAMPAIGN_MODULE}::claim_reward_for`;
        const result = await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [target],
        });

        await suiClient
          .waitForTransaction({ digest: result.digest })
          .catch(() => undefined);
        await new Promise((r) => setTimeout(r, 1500));
        await queryClient.invalidateQueries({
          queryKey: ['campaign-for-clip', clipId],
        });

        toast.success('Reward claimed!');
        return result.digest;
      } catch (error) {
        console.error('[claim-reward] failed', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not claim reward. Complete all missions first.'
        );
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [account, suiClient, queryClient]
  );

  return { isPending, claim };
}
