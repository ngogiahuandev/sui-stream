import { NextResponse } from 'next/server';
import {
  signAndExecuteAsSponsor,
  type SponsorRequest,
} from '@/lib/sponsor-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: SponsorRequest;
  try {
    body = (await request.json()) as SponsorRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.txKindBytes) {
    return NextResponse.json(
      { error: 'txKindBytes is required' },
      { status: 400 }
    );
  }

  try {
    const result = await signAndExecuteAsSponsor(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Sponsor request failed';
    console.error('[sponsor] failed', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
