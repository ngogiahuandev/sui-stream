'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useSuiClient,
} from '@mysten/dapp-kit';
import {
  SEAL_SESSION_TTL_MIN,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import { createSealClient, hexToBytes, SessionKey } from '@/lib/seal';
import { buildSealApproveTx } from '@/lib/sui';
import { getWalrusBlobUrl } from '@/lib/walrus';
import type { Clip, ClipAccess } from '@/types/clip';

interface UseDecryptedClipUrlOptions {
  clip: Clip | null;
  access: ClipAccess | null;
  isOwner: boolean;
  enabled: boolean;
}

interface UseDecryptedClipUrlResult {
  url: string | null;
  isPreparing: boolean;
  error: string | null;
  start: () => Promise<void>;
}

export function useDecryptedClipUrl({
  clip,
  access,
  isOwner,
  enabled,
}: UseDecryptedClipUrlOptions): UseDecryptedClipUrlResult {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [url, setUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setUrl(null);
    setError(null);
  }, [clip?.id]);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (inFlightRef.current) return;
    if (!clip || clip.visibility !== 'private') return;
    if (!account) {
      setError('Connect your wallet to watch this clip.');
      return;
    }
    if (!isOwner && !access) {
      setError('Unlock the clip to watch.');
      return;
    }

    inFlightRef.current = true;
    setIsPreparing(true);
    setError(null);

    try {
      const sealClient = createSealClient(suiClient);

      const sessionKey = await SessionKey.create({
        address: account.address,
        packageId: SUI_STREAM_PACKAGE_ID,
        ttlMin: SEAL_SESSION_TTL_MIN,
        suiClient: suiClient as never,
      });

      const personalMessage = sessionKey.getPersonalMessage();
      const { signature } = await signPersonalMessage({
        message: personalMessage,
      });
      await sessionKey.setPersonalMessageSignature(signature);

      const sealIdBytes = hexToBytes(clip.sealIdHex);

      const approveTx = buildSealApproveTx({
        sealIdBytes,
        clipId: clip.id,
        accessId: isOwner ? undefined : access?.id,
        isOwner,
      });

      const txBytes = await approveTx.build({
        client: suiClient,
        onlyTransactionKind: true,
      });

      const ciphertextResponse = await fetch(getWalrusBlobUrl(clip.blobId));
      if (!ciphertextResponse.ok) {
        throw new Error(`Could not fetch encrypted blob (${ciphertextResponse.status})`);
      }
      const ciphertext = new Uint8Array(await ciphertextResponse.arrayBuffer());

      const plaintext = await sealClient.decrypt({
        data: ciphertext,
        sessionKey,
        txBytes,
      });

      const blob = new Blob([new Uint8Array(plaintext)], { type: 'video/mp4' });
      const objectUrl = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
    } catch (err) {
      console.error('[decrypt] failed', err);
      const message =
        err instanceof Error ? err.message : 'Failed to decrypt clip.';
      setError(message);
    } finally {
      setIsPreparing(false);
      inFlightRef.current = false;
    }
  }, [
    enabled,
    clip,
    account,
    isOwner,
    access,
    suiClient,
    signPersonalMessage,
  ]);

  return { url, isPreparing, error, start };
}
