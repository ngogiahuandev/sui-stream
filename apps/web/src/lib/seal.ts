import { SealClient, SessionKey } from '@mysten/seal';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import {
  SEAL_ID_BYTES,
  SEAL_KEY_SERVERS,
  SEAL_SESSION_TTL_MIN,
  SEAL_THRESHOLD,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';

export function generateSealId(): Uint8Array {
  const bytes = new Uint8Array(SEAL_ID_BYTES);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function createSealClient(
  suiClient: SuiJsonRpcClient
): SealClient {
  if (SEAL_KEY_SERVERS.length === 0) {
    throw new Error(
      'No Seal key servers configured (NEXT_PUBLIC_SEAL_KEY_SERVERS)'
    );
  }
  return new SealClient({
    suiClient: suiClient as never,
    serverConfigs: SEAL_KEY_SERVERS.map((objectId) => ({
      objectId,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
}

export interface EncryptResult {
  ciphertext: Uint8Array;
  sealIdHex: string;
  sealIdBytes: Uint8Array;
}

export async function encryptClipBytes(
  client: SealClient,
  data: Uint8Array
): Promise<EncryptResult> {
  if (!SUI_STREAM_PACKAGE_ID) throw new Error('Package id not set');
  const sealIdBytes = generateSealId();
  const sealIdHex = bytesToHex(sealIdBytes);

  const { encryptedObject } = await client.encrypt({
    threshold: SEAL_THRESHOLD,
    packageId: SUI_STREAM_PACKAGE_ID,
    id: sealIdHex,
    data,
  });

  return { ciphertext: encryptedObject, sealIdHex, sealIdBytes };
}

export {
  SealClient,
  SessionKey,
  SEAL_SESSION_TTL_MIN,
  SEAL_THRESHOLD,
};
