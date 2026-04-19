import 'server-only';
import crypto from 'node:crypto';
import { base64ToBytes } from '@/lib/attestation';

const PKCS8_ED25519_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex'
);

let cachedPrivateKey: crypto.KeyObject | null = null;

function getPrivateKey(): crypto.KeyObject {
  if (cachedPrivateKey) return cachedPrivateKey;
  const raw = process.env.ATTESTATION_SIGNING_KEY ?? '';
  if (!raw) {
    throw new Error('ATTESTATION_SIGNING_KEY is not configured');
  }
  const seed = Buffer.from(base64ToBytes(raw));
  if (seed.length !== 32) {
    throw new Error(
      `ATTESTATION_SIGNING_KEY must decode to 32 bytes (got ${seed.length})`
    );
  }
  const pkcs8 = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  cachedPrivateKey = crypto.createPrivateKey({
    key: pkcs8,
    format: 'der',
    type: 'pkcs8',
  });
  return cachedPrivateKey;
}

export function signAttestation(message: Uint8Array): Uint8Array {
  const key = getPrivateKey();
  const sig = crypto.sign(null, Buffer.from(message), key);
  return new Uint8Array(sig);
}

export function randomNonce(length: number): Uint8Array {
  const buf = crypto.randomBytes(length);
  return new Uint8Array(buf);
}
