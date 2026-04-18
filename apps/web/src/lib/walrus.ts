import {
  DEFAULT_WALRUS_EPOCHS,
  WALRUS_AGGREGATOR_URL,
  WALRUS_PUBLISHER_URL,
} from '@/lib/constants';

export interface WalrusUploadResult {
  blobId: string;
  endEpoch: number;
}

interface NewlyCreatedResponse {
  newlyCreated: {
    blobObject: {
      blobId: string;
      storage: { endEpoch: number };
    };
  };
}

interface AlreadyCertifiedResponse {
  alreadyCertified: {
    blobId: string;
    endEpoch: number;
  };
}

type WalrusPublishResponse = NewlyCreatedResponse | AlreadyCertifiedResponse;

export async function uploadBlobToWalrus(
  blob: Blob,
  epochs: number = DEFAULT_WALRUS_EPOCHS
): Promise<WalrusUploadResult> {
  const url = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`;
  const response = await fetch(url, {
    method: 'PUT',
    body: blob,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Walrus upload failed (${response.status}): ${text || response.statusText}`
    );
  }

  const data = (await response.json()) as WalrusPublishResponse;

  if ('newlyCreated' in data) {
    return {
      blobId: data.newlyCreated.blobObject.blobId,
      endEpoch: data.newlyCreated.blobObject.storage.endEpoch,
    };
  }
  if ('alreadyCertified' in data) {
    return {
      blobId: data.alreadyCertified.blobId,
      endEpoch: data.alreadyCertified.endEpoch,
    };
  }

  throw new Error('Walrus upload returned an unexpected response shape');
}

export function getWalrusBlobUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
}
