'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';
import { buildUpdateMetadataTx } from '@/lib/sui';
import { executeAsSponsor } from '@/lib/sponsor-client';
import { SUI_STREAM_MODULE, SUI_STREAM_PACKAGE_ID } from '@/lib/constants';
import type { Clip } from '@/types/clip';

export interface UpdateClipMetadataInput {
  title: string;
  description: string;
  tags: string[];
}

export interface UseUpdateClipMetadataResult {
  submit: (input: UpdateClipMetadataInput) => Promise<boolean>;
  isSubmitting: boolean;
  isOwner: boolean;
}

export function useUpdateClipMetadata(
  clip: Clip | null
): UseUpdateClipMetadataResult {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = Boolean(
    account && clip && account.address.toLowerCase() === clip.owner.toLowerCase()
  );

  const submit = useCallback(
    async (input: UpdateClipMetadataInput): Promise<boolean> => {
      if (!clip) return false;
      if (!account) {
        toast.error('Connect your wallet to update this clip.');
        return false;
      }
      if (!isOwner) {
        toast.error('Only the clip owner can edit its metadata.');
        return false;
      }

      setIsSubmitting(true);
      try {
        const tx = buildUpdateMetadataTx({
          clipId: clip.id,
          title: input.title.trim(),
          description: input.description.trim(),
          tags: input.tags,
        });
        const target = `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::update_metadata`;

        await executeAsSponsor({
          transaction: tx,
          client: suiClient,
          allowedMoveCallTargets: [target],
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));
        await queryClient.invalidateQueries({ queryKey: ['public-clips'] });
        await queryClient.invalidateQueries({
          queryKey: ['getObject', { id: clip.id }],
        });
        toast.success('Clip metadata updated.');
        return true;
      } catch (error) {
        console.error('[my-clip] update metadata failed', error);
        toast.error(
          error instanceof Error ? error.message : 'Could not update metadata.'
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, clip, isOwner, queryClient, suiClient]
  );

  return { submit, isSubmitting, isOwner };
}
