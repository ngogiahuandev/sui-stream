import 'server-only';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';

const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY ?? '';
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet') as
  | 'testnet'
  | 'mainnet'
  | 'devnet';
const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_STREAM_PACKAGE ?? '';
const DEFAULT_GAS_BUDGET = 100_000_000n;

const ALLOWED_TARGETS = new Set(
  PACKAGE_ID
    ? [
        `${PACKAGE_ID}::clip::create_clip`,
        `${PACKAGE_ID}::clip::increment_views`,
        `${PACKAGE_ID}::clip::like_clip`,
      ]
    : []
);

let cachedKeypair: Ed25519Keypair | null = null;
let cachedClient: SuiJsonRpcClient | null = null;

function getKeypair(): Ed25519Keypair {
  if (cachedKeypair) return cachedKeypair;
  if (!SPONSOR_PRIVATE_KEY) {
    throw new Error('SPONSOR_PRIVATE_KEY is not configured');
  }
  cachedKeypair = Ed25519Keypair.fromSecretKey(SPONSOR_PRIVATE_KEY);
  return cachedKeypair;
}

function getClient(): SuiJsonRpcClient {
  if (cachedClient) return cachedClient;
  cachedClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(SUI_NETWORK),
    network: SUI_NETWORK,
  });
  return cachedClient;
}

function assertAllowedTargets(requested: string[] | undefined) {
  if (ALLOWED_TARGETS.size === 0) {
    throw new Error(
      'Sponsor allowlist is empty (NEXT_PUBLIC_SUI_STREAM_PACKAGE not set)'
    );
  }
  if (!requested || requested.length === 0) {
    throw new Error('allowedMoveCallTargets must be provided');
  }
  for (const target of requested) {
    if (!ALLOWED_TARGETS.has(target)) {
      throw new Error(`Move target not allowed: ${target}`);
    }
  }
}

export interface SponsorRequest {
  txKindBytes: string;
  allowedMoveCallTargets: string[];
}

export interface SponsorResponse {
  digest: string;
  sponsorAddress: string;
}

export async function signAndExecuteAsSponsor({
  txKindBytes,
  allowedMoveCallTargets,
}: SponsorRequest): Promise<SponsorResponse> {
  assertAllowedTargets(allowedMoveCallTargets);

  const keypair = getKeypair();
  const client = getClient();
  const sponsorAddress = keypair.toSuiAddress();

  const tx = Transaction.fromKind(fromBase64(txKindBytes));
  tx.setSender(sponsorAddress);
  tx.setGasBudget(DEFAULT_GAS_BUDGET);

  const builtBytes = await tx.build({ client });
  const { signature } = await keypair.signTransaction(builtBytes);

  const result = await client.executeTransactionBlock({
    transactionBlock: builtBytes,
    signature,
    options: { showEffects: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(
      `Sponsor execution failed: ${result.effects?.status?.error ?? 'unknown'}`
    );
  }

  return { digest: result.digest, sponsorAddress };
}
