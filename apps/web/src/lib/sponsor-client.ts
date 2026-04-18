import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

interface ExecuteAsSponsorInput {
  transaction: Transaction;
  client: SuiJsonRpcClient;
  allowedMoveCallTargets: string[];
}

interface ExecuteAsSponsorResult {
  digest: string;
  sponsorAddress: string;
}

export async function executeAsSponsor({
  transaction,
  client,
  allowedMoveCallTargets,
}: ExecuteAsSponsorInput): Promise<ExecuteAsSponsorResult> {
  const kindBytes = await transaction.build({
    client,
    onlyTransactionKind: true,
  });

  const response = await fetch('/api/sponsor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txKindBytes: toBase64(kindBytes),
      allowedMoveCallTargets,
    }),
  });

  if (!response.ok) {
    let message = `Sponsor request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as ExecuteAsSponsorResult;
}
