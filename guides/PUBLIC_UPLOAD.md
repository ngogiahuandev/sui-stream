# Public Video Upload & Streaming Guide

This guide covers the best practices for uploading and streaming public videos on SuiStream using Walrus storage and Sui smart contracts.

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Walrus    │────▶│   Playback │
│  (Upload)   │     │  (Storage)  │     │  (HLS/MP4) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Sui Chain   │◀────│  Contract  │────▶│   Indexer   │
│ (Metadata)  │     │  (Clip)     │     │  (Query)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 1. Video Upload Flow

### 1.1 Client-Side Validation

Before uploading, validate the video client-side:

```typescript
// lib/validation/video.ts
import { CLIP_LIMITS } from "@/types/clip";

export function validateVideoFile(file: File): string | null {
  const acceptedTypes = ["video/mp4", "video/quicktime", "video/webm"];
  if (!acceptedTypes.includes(file.type)) {
    return "Unsupported video format. Use MP4, MOV, or WebM.";
  }
  if (file.size > CLIP_LIMITS.maxSizeBytes) {
    return `File must be under ${CLIP_LIMITS.maxSizeBytes / 1024 / 1024}MB`;
  }
  return null;
}

export async function validateVideoDuration(
  file: File,
): Promise<string | null> {
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  await new Promise((r) => (video.onloadedmetadata = r));
  URL.revokeObjectURL(video.src);

  if (video.duration > CLIP_LIMITS.maxDurationSeconds) {
    return `Video must be ${CLIP_LIMITS.maxDurationSeconds}s or shorter`;
  }
  return null;
}
```

### 1.2 Upload to Walrus

Use Walrus Publisher API for uploading. Store only the `blob_id`, never the full URL.

```typescript
// lib/walrus.ts
const WALRUS_PUBLISHER_URL = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL!;
const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL!;

export interface WalrusUploadResult {
  blobId: string;
  NCTime: number;
  expiryEpoch: number;
}

export async function uploadToWalrus(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<WalrusUploadResult> {
  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Walrus upload failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    blobId: data.blobId,
    NCTime: data.NCTime,
    expiryEpoch: data.expiryEpoch,
  };
}

export function getWalrusUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
}
```

**Important:**

- Always use object-sized uploads (PUT /v1/blobs) for videos
- Track `expiryEpoch` - renew storage before expiry
- Never hardcode Walrus URLs - read from env

---

## 2. Smart Contract Integration

### 2.1 Clip Object Schema

```move
// sources/clip.move
module sui_stream::clip {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer::public_transfer;
    use sui::coin::Coin;
    use sui::sui::SUI;

    const MAX_DURATION_SECONDS: u64 = 60;
    const MAX_TITLE_LENGTH: u64 = 80;
    const MAX_DESCRIPTION_LENGTH: u64 = 500;
    const MAX_TAGS: u64 = 8;

    struct Clip has key, store {
        id: UID,
        owner: address,
        title: vector<u8>,
        description: vector<u8>,
        tags: vector<vector<u8>>,
        blob_id: vector<u8>,
        thumbnail_blob_id: vector<u8>,
        duration_seconds: u64,
        visibility: u8, // 0 = public, 1 = private
        price_mist: u64,
        likes: u64,
        views: u64,
        created_at: u64,
    }

    public entry fun create_clip(
        title: vector<u8>,
        description: vector<u8>,
        tags: vector<vector<u8>>,
        blob_id: vector<u8>,
        thumbnail_blob_id: vector<u8>,
        duration_seconds: u64,
        ctx: &mut TxContext
    ) {
        assert!(duration_seconds <= MAX_DURATION_SECONDS, 0);
        assert!(vector::length(&title) <= MAX_TITLE_LENGTH, 1);

        let clip = Clip {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            title,
            description,
            tags,
            blob_id,
            thumbnail_blob_id,
            duration_seconds,
            visibility: 0, // public
            price_mist: 0,
            likes: 0,
            views: 0,
            created_at: tx_context::epoch(ctx),
        };
        public_transfer(clip, tx_context::sender(ctx));
    }

    public entry fun increment_views(clip: &mut Clip) {
        clip.views = clip.views + 1;
    }

    public entry fun like_clip(clip: &mut Clip) {
        clip.likes = clip.likes + 1;
    }
}
```

### 2.2 Transaction Building

All user transactions MUST be sponsored. Use gas sponsorship:

```typescript
// lib/sui/transactions.ts
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLIP_PACKAGE_ID } from "@/lib/constants";

export function buildCreateClipTransaction(
  signer: string,
  title: string,
  description: string,
  tags: string[],
  blobId: string,
  thumbnailBlobId: string,
  durationSeconds: number,
) {
  const tx = new Transaction();
  tx.setSender(signer);

  tx.moveCall({
    target: `${SUI_CLIP_PACKAGE_ID}::clip::create_clip`,
    arguments: [
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.vector(tx.pure.string, tags),
      tx.pure.string(blobId),
      tx.pure.string(thumbnailBlobId),
      tx.pure.u64(durationSeconds),
    ],
  });

  return tx;
}

export function buildIncrementViewsTransaction(signer: string, clipId: string) {
  const tx = new Transaction();
  tx.setSender(signer);

  tx.moveCall({
    target: `${SUI_CLIP_PACKAGE_ID}::clip::increment_views`,
    arguments: [tx.object(clipId)],
  });

  return tx;
}
```

---

## 3. Streaming & Playback

### 3.1 Video Playback

For public videos, directly stream from Walrus:

```typescript
// hooks/useVideoPlayer.ts
import { useRef, useState, useCallback, useEffect } from "react";
import { getWalrusUrl } from "@/lib/walrus";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { buildIncrementViewsTransaction } from "@/lib/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";

export function useVideoPlayer(blobId: string, clipId: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { currentWallet } = useWalletConnection();

  const incrementViews = useCallback(async () => {
    if (!clipId || !currentWallet || hasViewed) return;
    setHasViewed(true);

    try {
      const tx = buildIncrementViewsTransaction(currentWallet, clipId);
      await signAndExecute({ transaction: tx });
    } catch (error) {
      console.error("Failed to increment views:", error);
    }
  }, [clipId, currentWallet, signAndExecute, hasViewed]);

  useEffect(() => {
    if (!videoRef.current || !blobId) return;
    const video = videoRef.current;
    let tracked = false;

    const handleTimeUpdate = () => {
      if (!tracked && video.currentTime >= 3 && !hasViewed) {
        tracked = true;
        incrementViews();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [blobId, incrementViews, hasViewed]);

  const play = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  return {
    videoRef,
    src: blobId ? getWalrusUrl(blobId) : null,
    isPlaying,
    play,
    pause,
  };
}
```

### 3.2 Video Player Component

```typescript
// components/video/VideoPlayer.tsx
"use client";

import { useVideoPlayer } from '@/hooks/useVideoPlayer';

interface VideoPlayerProps {
  blobId: string;
  clipId: string;
}

export function VideoPlayer({ blobId, clipId }: VideoPlayerProps) {
  const { videoRef, src, isPlaying, play, pause } = useVideoPlayer(blobId, clipId);

  if (!src) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      playsInline
      className="w-full aspect-video rounded-lg bg-black"
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
    />
  );
}
```

---

## 4. Complete Upload Flow

```typescript
// hooks/useClipUpload.ts (updated)
export async function submit(): Promise<void> {
  if (!file || !thumbnail) return;

  setIsUploading(true);
  try {
    // 1. Upload video to Walrus
    const { blobId } = await uploadToWalrus(file);

    // 2. Upload thumbnail to Walrus
    const { blobId: thumbnailBlobId } = await uploadToWalrus(
      new File([thumbnail.blob], "thumbnail.jpg", { type: "image/jpeg" }),
    );

    // 3. Generate metadata via AI (server-side)
    const metadata = await generateMetadata(file);

    // 4. Build sponsoring transaction
    const tx = await sponsorTransaction(
      buildCreateClipTransaction(
        walletAddress,
        metadata.title,
        metadata.description,
        metadata.tags,
        blobId,
        thumbnailBlobId,
        metadata.duration,
      ),
    );

    // 5. Execute sponsored transaction
    const result = await signAndExecute({ transaction: tx });
    console.success("Clip created:", result.digest);
  } finally {
    setIsUploading(false);
  }
}
```

---

## 5. Best Practices Summary

### Upload

- [x] Validate file type, size, duration client-side
- [x] Use Walrus PUT /v1/blobs for object storage
- [x] Track expiry epoch for renewal
- [x] Generate AI metadata before on-chain transaction

### Smart Contract

- [x] Validate all inputs in Move contract
- [x] Use sponsored transactions for all user ops
- [x] Emit events for indexing

### Playback

- [x] Stream directly from Walrus aggregator
- [x] Debounce view count increment (after 3s)
- [x] Handle network errors gracefully

### Security

- [x] Never store video data on-chain
- [x] Never hardcode package IDs
- [x] Proxy AI calls through server-side API
