import { CAMPAIGN_ATTESTATION_NONCE_BYTES } from '@/lib/constants';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${hex}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function addressToBytes(address: string): Uint8Array {
  const clean = address.startsWith('0x') ? address.slice(2) : address;
  const padded = clean.padStart(64, '0');
  return hexToBytes(padded);
}

function u64LeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export interface AttestationInput {
  campaignId: string;
  viewer: string;
  requiredMask: number;
  nonce: Uint8Array;
  expiryMs: bigint;
}

export function buildAttestationMessage(
  input: AttestationInput
): Uint8Array {
  if (input.nonce.length !== CAMPAIGN_ATTESTATION_NONCE_BYTES) {
    throw new Error(
      `nonce must be ${CAMPAIGN_ATTESTATION_NONCE_BYTES} bytes (got ${input.nonce.length})`
    );
  }
  const campaignBytes = addressToBytes(input.campaignId);
  const viewerBytes = addressToBytes(input.viewer);
  const expiryBytes = u64LeBytes(input.expiryMs);

  const out = new Uint8Array(
    campaignBytes.length +
      viewerBytes.length +
      1 +
      input.nonce.length +
      expiryBytes.length
  );
  let off = 0;
  out.set(campaignBytes, off);
  off += campaignBytes.length;
  out.set(viewerBytes, off);
  off += viewerBytes.length;
  out[off] = input.requiredMask & 0xff;
  off += 1;
  out.set(input.nonce, off);
  off += input.nonce.length;
  out.set(expiryBytes, off);
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  return Buffer.from(bytes).toString('base64');
}

export function isViewRequired(mask: number): boolean {
  return (mask & 1) !== 0;
}
export function isLikeRequired(mask: number): boolean {
  return (mask & 2) !== 0;
}
export function isCommentRequired(mask: number): boolean {
  return (mask & 4) !== 0;
}
