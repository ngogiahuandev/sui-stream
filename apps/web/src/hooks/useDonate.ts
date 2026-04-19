'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { MIST_PER_SUI } from '@/lib/constants';
import { buildDonateTx } from '@/lib/sui';

export const DONATE_MESSAGE_WORD_LIMIT = 200;

export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function suiToMist(amountSui: number): bigint {
  if (!Number.isFinite(amountSui) || amountSui <= 0) {
    throw new Error('Enter a positive SUI amount.');
  }
  const mist = Math.round(amountSui * MIST_PER_SUI);
  if (!Number.isSafeInteger(mist) || mist <= 0) {
    throw new Error('Amount is too small or too large.');
  }
  return BigInt(mist);
}

export interface DonateInput {
  clipId: string;
  recipient: string;
  amountSui: number;
  message?: string;
}

export interface UseDonateResult {
  isPending: boolean;
  donate: (input: DonateInput) => Promise<string | null>;
}

export function useDonate(): UseDonateResult {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isPending, setIsPending] = useState(false);

  const donate = useCallback(
    async (input: DonateInput): Promise<string | null> => {
      if (!account) {
        toast.error('Connect your wallet to donate.');
        return null;
      }

      const recipient = input.recipient?.trim();
      if (!recipient) {
        toast.error('Missing recipient address.');
        return null;
      }
      if (recipient.toLowerCase() === account.address.toLowerCase()) {
        toast.error("You can't donate to yourself.");
        return null;
      }

      const message = input.message?.trim() ?? '';
      if (countWords(message) > DONATE_MESSAGE_WORD_LIMIT) {
        toast.error(`Message must be ${DONATE_MESSAGE_WORD_LIMIT} words or fewer.`);
        return null;
      }

      let amountMist: bigint;
      try {
        amountMist = suiToMist(input.amountSui);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Invalid amount.'
        );
        return null;
      }

      setIsPending(true);
      const chain = `sui:${process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet'}` as `${string}:${string}`;
      const maxAttempts = 3;
      try {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            const tx = buildDonateTx({
              donor: account.address,
              clipId: input.clipId,
              recipient,
              amountMist,
              message,
            });
            const result = await signAndExecute({ transaction: tx, chain });

            await suiClient
              .waitForTransaction({ digest: result.digest })
              .catch(() => undefined);

            await new Promise((r) => setTimeout(r, 1500));
            await queryClient.invalidateQueries({
              queryKey: ['donations-received'],
            });

            toast.success('Donation sent. Thank you!');
            return result.digest;
          } catch (error) {
            lastError = error;
            const raw = error instanceof Error ? error.message : '';
            const stale = /needs to be rebuilt|unavailable for consumption|version/i.test(raw);
            if (!stale || attempt === maxAttempts - 1) break;
            await new Promise((r) => setTimeout(r, 400 + attempt * 400));
          }
        }

        console.error('[donate] failed', lastError);
        const raw = lastError instanceof Error ? lastError.message : '';
        const friendly = /reject|denied|cancel/i.test(raw)
          ? 'Donation cancelled.'
          : /insufficient|balance/i.test(raw)
            ? 'Insufficient SUI balance for this donation.'
            : /needs to be rebuilt|unavailable for consumption/i.test(raw)
              ? 'Wallet is busy with another transaction — please try again.'
              : 'Could not send donation.';
        toast.error(friendly);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [account, signAndExecute, suiClient, queryClient]
  );

  return { isPending, donate };
}
