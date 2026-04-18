import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import type { SuiObjectResponse } from '@mysten/sui/jsonRpc';
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_STREAM_ACCESS_MODULE,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import type { Clip, ClipAccess, ClipVisibility } from '@/types/clip';

function requirePackageId(): string {
  if (!SUI_STREAM_PACKAGE_ID) {
    throw new Error(
      'NEXT_PUBLIC_SUI_STREAM_PACKAGE is not set. Deploy the Move package and set the env var.'
    );
  }
  return SUI_STREAM_PACKAGE_ID;
}

export interface CreateClipTxInput {
  title: string;
  description: string;
  tags: string[];
  blobId: string;
  thumbnailBlobId: string;
  durationSeconds: number;
  visibility: ClipVisibility;
  recipient: string;
  priceMist?: bigint;
  sealIdBytes?: Uint8Array;
}

export function buildCreateClipTx(input: CreateClipTxInput): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();

  const tagsArg = tx.pure(bcs.vector(bcs.string()).serialize(input.tags));

  if (input.visibility === 'public') {
    tx.moveCall({
      target: `${pkg}::${SUI_STREAM_MODULE}::create_public_clip`,
      arguments: [
        tx.pure.string(input.title),
        tx.pure.string(input.description),
        tagsArg,
        tx.pure.string(input.blobId),
        tx.pure.string(input.thumbnailBlobId),
        tx.pure.u64(BigInt(input.durationSeconds)),
        tx.pure.address(input.recipient),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  } else {
    if (input.priceMist === undefined || !input.sealIdBytes) {
      throw new Error('priceMist and sealIdBytes are required for private clips');
    }
    const sealIdArg = tx.pure(
      bcs.vector(bcs.u8()).serialize(Array.from(input.sealIdBytes))
    );
    tx.moveCall({
      target: `${pkg}::${SUI_STREAM_MODULE}::create_private_clip`,
      arguments: [
        tx.pure.string(input.title),
        tx.pure.string(input.description),
        tagsArg,
        tx.pure.string(input.blobId),
        tx.pure.string(input.thumbnailBlobId),
        tx.pure.u64(BigInt(input.durationSeconds)),
        tx.pure.u64(input.priceMist),
        sealIdArg,
        tx.pure.address(input.recipient),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  return tx;
}

export function buildIncrementViewsTx(clipId: string): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::increment_views`,
    arguments: [tx.object(clipId)],
  });
  return tx;
}

export function buildLikeClipTx(clipId: string): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::like_clip`,
    arguments: [tx.object(clipId)],
  });
  return tx;
}

export function buildUnlockClipTx(input: {
  clipId: string;
  priceMist: bigint;
  viewer: string;
}): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(input.priceMist)]);
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_ACCESS_MODULE}::unlock_clip`,
    arguments: [
      tx.object(input.clipId),
      payment,
      tx.pure.address(input.viewer),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build the (read-only) Seal approve transaction. Used as `txBytes` input to
 * SealClient.fetchKeys / decrypt — never executed on-chain.
 */
export function buildSealApproveTx(input: {
  sealIdBytes: Uint8Array;
  clipId: string;
  accessId?: string;
  isOwner: boolean;
}): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  const sealIdArg = tx.pure(
    bcs.vector(bcs.u8()).serialize(Array.from(input.sealIdBytes))
  );

  if (input.isOwner) {
    tx.moveCall({
      target: `${pkg}::${SUI_STREAM_ACCESS_MODULE}::seal_approve_owner`,
      arguments: [sealIdArg, tx.object(input.clipId)],
    });
  } else {
    if (!input.accessId) {
      throw new Error('accessId required for viewer seal approve');
    }
    tx.moveCall({
      target: `${pkg}::${SUI_STREAM_ACCESS_MODULE}::seal_approve_unlock`,
      arguments: [
        sealIdArg,
        tx.object(input.clipId),
        tx.object(input.accessId),
      ],
    });
  }
  return tx;
}

interface RawClipFields {
  id: { id: string };
  owner: string;
  title: string;
  description: string;
  tags: string[];
  blob_id: string;
  thumbnail_blob_id: string;
  duration_seconds: string;
  visibility: number;
  price_mist: string;
  seal_id: number[];
  likes: string;
  views: string;
  created_at_ms: string;
}

export function parseClipObject(obj: SuiObjectResponse): Clip | null {
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields as unknown as RawClipFields;
  if (!fields?.id?.id) return null;

  const sealIdBytes = Array.isArray(fields.seal_id) ? fields.seal_id : [];
  const sealIdHex = sealIdBytes
    .map((b) => Number(b).toString(16).padStart(2, '0'))
    .join('');

  return {
    id: fields.id.id,
    owner: fields.owner,
    title: fields.title,
    description: fields.description,
    tags: fields.tags ?? [],
    blobId: fields.blob_id,
    thumbnailBlobId: fields.thumbnail_blob_id,
    durationSeconds: Number(fields.duration_seconds),
    visibility: fields.visibility === 1 ? 'private' : 'public',
    priceMist: fields.price_mist,
    sealIdHex,
    likes: Number(fields.likes),
    views: Number(fields.views),
    createdAtMs: Number(fields.created_at_ms),
  };
}

interface RawAccessFields {
  id: { id: string };
  clip_id: string;
  viewer: string;
  unlocked_at_ms: string;
  paid_mist: string;
}

export function parseClipAccessObject(
  obj: SuiObjectResponse
): ClipAccess | null {
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') return null;
  const fields = content.fields as unknown as RawAccessFields;
  if (!fields?.id?.id) return null;
  return {
    id: fields.id.id,
    clipId: fields.clip_id,
    viewer: fields.viewer,
    unlockedAtMs: Number(fields.unlocked_at_ms),
    paidMist: fields.paid_mist,
  };
}
