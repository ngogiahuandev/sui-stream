import { NextResponse } from 'next/server';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import {
  buildAttestationMessage,
  bytesToBase64,
  isCommentRequired,
  isLikeRequired,
  isViewRequired,
} from '@/lib/attestation';
import { signAttestation, randomNonce } from '@/lib/attestation-server';
import {
  CAMPAIGN_ATTESTATION_NONCE_BYTES,
  COMMENT_CREATED_EVENT_TYPE,
  COMMENT_DELETED_EVENT_TYPE,
  VOTE_CAST_EVENT_TYPE,
  VOTE_REMOVED_EVENT_TYPE,
  VOTE_UPVOTE,
  computeViewRequiredSeconds,
} from '@/lib/constants';

export const runtime = 'nodejs';

const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet') as
  | 'testnet'
  | 'mainnet'
  | 'devnet';

const ATTESTATION_TTL_MS = 120_000;

interface CampaignFields {
  id: { id: string };
  clip_id: string;
  creator: string;
  reward_per_claim: string;
  max_claims: string;
  claims_made: string;
  required_mask: number;
  expires_at_ms: string;
  active: boolean;
}

let cachedClient: SuiJsonRpcClient | null = null;
function getClient(): SuiJsonRpcClient {
  if (cachedClient) return cachedClient;
  cachedClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(SUI_NETWORK),
    network: SUI_NETWORK,
  });
  return cachedClient;
}

async function loadCampaign(
  campaignId: string
): Promise<CampaignFields | null> {
  const client = getClient();
  const obj = await client.getObject({
    id: campaignId,
    options: { showContent: true, showType: true },
  });
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') return null;
  return content.fields as unknown as CampaignFields;
}

async function loadClipDuration(clipId: string): Promise<number> {
  const client = getClient();
  try {
    const obj = await client.getObject({
      id: clipId,
      options: { showContent: true },
    });
    const content = obj.data?.content;
    if (!content || content.dataType !== 'moveObject') return 0;
    const fields = content.fields as { duration_seconds?: string | number };
    return Number(fields.duration_seconds ?? 0);
  } catch {
    return 0;
  }
}

async function hasActiveUpvote(
  viewer: string,
  clipId: string
): Promise<boolean> {
  if (!VOTE_CAST_EVENT_TYPE) return false;
  const client = getClient();

  const removed = new Set<string>();
  if (VOTE_REMOVED_EVENT_TYPE) {
    const rem = await client.queryEvents({
      query: { MoveEventType: VOTE_REMOVED_EVENT_TYPE },
      limit: 200,
      order: 'descending',
    });
    for (const ev of rem.data) {
      const p = ev.parsedJson as {
        vote_id?: string;
        clip_id?: string;
        voter?: string;
      } | null;
      if (p?.clip_id === clipId && p.voter === viewer && p.vote_id) {
        removed.add(p.vote_id);
      }
    }
  }

  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 10; i += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: VOTE_CAST_EVENT_TYPE },
      cursor,
      limit: 200,
      order: 'descending',
    });
    for (const ev of page.data) {
      const p = ev.parsedJson as {
        vote_id?: string;
        clip_id?: string;
        voter?: string;
        vote_type?: number | string;
      } | null;
      if (!p) continue;
      if (p.clip_id !== clipId || p.voter !== viewer) continue;
      if (Number(p.vote_type) !== VOTE_UPVOTE) continue;
      if (p.vote_id && removed.has(p.vote_id)) continue;
      return true;
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return false;
}

async function hasLiveComment(
  viewer: string,
  clipId: string
): Promise<boolean> {
  if (!COMMENT_CREATED_EVENT_TYPE) return false;
  const client = getClient();

  const deleted = new Set<string>();
  if (COMMENT_DELETED_EVENT_TYPE) {
    const del = await client.queryEvents({
      query: { MoveEventType: COMMENT_DELETED_EVENT_TYPE },
      limit: 200,
      order: 'descending',
    });
    for (const ev of del.data) {
      const p = ev.parsedJson as {
        comment_id?: string;
        clip_id?: string;
        author?: string;
      } | null;
      if (p?.clip_id === clipId && p.author === viewer && p.comment_id) {
        deleted.add(p.comment_id);
      }
    }
  }

  let cursor: Parameters<typeof client.queryEvents>[0]['cursor'] = null;
  for (let i = 0; i < 10; i += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: COMMENT_CREATED_EVENT_TYPE },
      cursor,
      limit: 200,
      order: 'descending',
    });
    for (const ev of page.data) {
      const p = ev.parsedJson as {
        comment_id?: string;
        clip_id?: string;
        author?: string;
        content?: string;
      } | null;
      if (!p) continue;
      if (p.clip_id !== clipId || p.author !== viewer) continue;
      if (p.comment_id && deleted.has(p.comment_id)) continue;
      if ((p.content ?? '').trim().length < 1) continue;
      return true;
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return false;
}

interface RequestBody {
  viewer: string;
  watchedSeconds?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.viewer) {
    return NextResponse.json({ error: 'viewer required' }, { status: 400 });
  }

  const campaign = await loadCampaign(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  if (!campaign.active) {
    return NextResponse.json({ error: 'Campaign paused' }, { status: 409 });
  }
  const now = Date.now();
  if (now >= Number(campaign.expires_at_ms)) {
    return NextResponse.json({ error: 'Campaign expired' }, { status: 409 });
  }
  if (Number(campaign.claims_made) >= Number(campaign.max_claims)) {
    return NextResponse.json({ error: 'Campaign exhausted' }, { status: 409 });
  }

  const requiredMask = Number(campaign.required_mask) & 0xff;
  const clipId = campaign.clip_id;
  const viewer = body.viewer;
  const progress: Record<string, boolean> = {};

  if (isViewRequired(requiredMask)) {
    const duration = await loadClipDuration(clipId);
    const threshold = computeViewRequiredSeconds(duration);
    progress.view = (body.watchedSeconds ?? 0) >= threshold;
  }
  if (isLikeRequired(requiredMask)) {
    progress.like = await hasActiveUpvote(viewer, clipId);
  }
  if (isCommentRequired(requiredMask)) {
    progress.comment = await hasLiveComment(viewer, clipId);
  }

  const allDone = Object.values(progress).every(Boolean);
  if (!allDone) {
    return NextResponse.json(
      { error: 'Missions incomplete', progress },
      { status: 409 }
    );
  }

  const nonce = randomNonce(CAMPAIGN_ATTESTATION_NONCE_BYTES);
  const expiryMs = BigInt(now + ATTESTATION_TTL_MS);

  const message = buildAttestationMessage({
    campaignId,
    viewer,
    requiredMask,
    nonce,
    expiryMs,
  });
  const signature = signAttestation(message);

  return NextResponse.json({
    nonce: bytesToBase64(nonce),
    signature: bytesToBase64(signature),
    expiryMs: expiryMs.toString(),
    requiredMask,
    clipId,
  });
}
