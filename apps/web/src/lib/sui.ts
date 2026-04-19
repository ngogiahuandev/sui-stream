import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import type { SuiObjectResponse } from '@mysten/sui/jsonRpc';
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_STREAM_MODULE,
  SUI_STREAM_PACKAGE_ID,
} from '@/lib/constants';
import type { Clip } from '@/types/clip';

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
  recipient: string;
}

export function buildCreateClipTx(input: CreateClipTxInput): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();

  const tagsArg = tx.pure(bcs.vector(bcs.string()).serialize(input.tags));

  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::create_clip`,
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

  return tx;
}

export interface UpdateMetadataTxInput {
  clipId: string;
  title: string;
  description: string;
  tags: string[];
}

export function buildUpdateMetadataTx(input: UpdateMetadataTxInput): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  const tagsArg = tx.pure(bcs.vector(bcs.string()).serialize(input.tags));
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::update_metadata`,
    arguments: [
      tx.object(input.clipId),
      tx.pure.string(input.title),
      tx.pure.string(input.description),
      tagsArg,
    ],
  });
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

export function buildTrackViewTx(clipId: string, viewer: string): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::track_view`,
    arguments: [tx.pure.id(clipId), tx.pure.address(viewer)],
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

export type VoteType = 1 | 2;

export interface VoteClipTxInput {
  clipId: string;
  voter: string;
  voteType: VoteType;
  existingVoteId?: string | null;
}

export function buildVoteClipTx(input: VoteClipTxInput): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();

  if (input.existingVoteId) {
    tx.moveCall({
      target: `${pkg}::${SUI_STREAM_MODULE}::remove_vote`,
      arguments: [
        tx.object(input.existingVoteId),
        tx.pure.id(input.clipId),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::cast_vote`,
    arguments: [
      tx.pure.id(input.clipId),
      tx.pure.address(input.voter),
      tx.pure.u8(input.voteType),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildRemoveVoteTx(
  clipId: string,
  voteId: string
): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::remove_vote`,
    arguments: [
      tx.object(voteId),
      tx.pure.id(clipId),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildSubscribeTx(
  subscriber: string,
  target: string
): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::subscribe`,
    arguments: [
      tx.pure.address(subscriber),
      tx.pure.address(target),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export interface CreateCommentTxInput {
  clipId: string;
  author: string;
  content: string;
}

export function buildCreateCommentTx(input: CreateCommentTxInput): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::create_comment`,
    arguments: [
      tx.pure.id(input.clipId),
      tx.pure.address(input.author),
      tx.pure.string(input.content),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildDeleteCommentTx(
  commentId: string,
  clipId: string,
  author: string
): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::delete_comment`,
    arguments: [
      tx.object(commentId),
      tx.pure.id(clipId),
      tx.pure.address(author),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildUnsubscribeTx(
  subscriber: string,
  subscriptionId: string
): Transaction {
  const pkg = requirePackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::${SUI_STREAM_MODULE}::unsubscribe`,
    arguments: [
      tx.object(subscriptionId),
      tx.pure.address(subscriber),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
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
  likes: string;
  views: string;
  created_at_ms: string;
}

export function parseClipObject(obj: SuiObjectResponse): Clip | null {
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields as unknown as RawClipFields;
  if (!fields?.id?.id) return null;

  return {
    id: fields.id.id,
    owner: fields.owner,
    title: fields.title,
    description: fields.description,
    tags: fields.tags ?? [],
    blobId: fields.blob_id,
    thumbnailBlobId: fields.thumbnail_blob_id,
    durationSeconds: Number(fields.duration_seconds),
    likes: Number(fields.likes),
    views: Number(fields.views),
    createdAtMs: Number(fields.created_at_ms),
  };
}
