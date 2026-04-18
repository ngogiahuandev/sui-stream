# Public Video Upload & Streaming Guide

This guide covers the data flows and best practices for uploading and streaming public videos on SuiStream using Walrus storage and Sui smart contracts.

---

## Architecture Overview

```
Client (Upload) → Walrus (Storage) → Playback
     ↓                      ↓
  Sui Chain ← Contract → Indexer
```

---

## 1. Video Upload Data Flow

### Step 1: Client-Side Validation

- Validate file type: MP4, MOV, WebM only
- Validate file size: max 100MB
- Validate duration: max 60 seconds

### Step 2: Extract Media

- Extract thumbnail at 1 second mark
- Extract 3-5 keyframes for AI metadata generation

### Step 3: Upload to Walrus

- Upload video file to Walrus Publisher API → returns blob_id
- Upload thumbnail to Walrus → returns thumbnail_blob_id
- Store blob_id and thumbnail_blob_id (NOT full URLs)
- Track expiry_epoch for renewal

### Step 4: AI Metadata Generation

- Send keyframes to server-side API
- AI returns: title, description, tags
- Do NOT call AI from client

### Step 5: Smart Contract Transaction

- Build create_clip transaction with:
  - title, description, tags
  - blob_id, thumbnail_blob_id
  - duration_seconds
  - visibility = public
- Use sponsored transactions (user pays no gas)

### Step 6: On-Chain Confirmation

- Clip object created with metadata
- Events emitted for indexing
- User redirected to clip page

---

## 2. Smart Contract Data Schema

### Clip Object Fields

- id: UID (unique identifier)
- owner: address (creator wallet)
- title: string (max 80 chars)
- description: string (max 500 chars)
- tags: string[] (max 8 tags)
- blob_id: string (Walrus reference)
- thumbnail_blob_id: string (Walrus reference)
- duration_seconds: u64 (max 60)
- visibility: u8 (0 = public, 1 = private)
- price_mist: u64 (unlock price in MIST)
- likes: u64
- views: u64
- created_at: u64 (epoch)

### Key Functions

- create_clip: mint new Clip, validate duration ≤ 60s
- increment_views: +1 view count
- like_clip: +1 likes
- update_metadata: set title, description, tags
- delete_clip: burn clip (owner only)

---

## 3. Streaming & Playback Data Flow

### Step 1: Fetch Clip

- Query Sui RPC or indexer for Clip object
- Extract blob_id from Clip

### Step 2: Stream Video

- Build Walrus aggregator URL: /v1/blobs/{blob_id}
- Play video directly from Walrus

### Step 3: Track Views

- Debounce: only increment after 3 seconds watched
- Fire increment_views transaction (sponsored)
- One view per session (track locally)

---

## 4. Best Practices

### Upload

- Always validate file type, size, duration client-side before upload
- Never store full Walrus URLs on-chain, only blob_id
- Track expiry_epoch and renew before expiration
- Generate AI metadata server-side, never call AI from client
- Use sponsored transactions for all user operations

### Smart Contract

- Validate duration ≤ 60 seconds in Move contract
- Validate all string lengths in Move contract
- Emit events for efficient indexing
- Use entry functions with proper capability checks

### Playback

- Stream directly from Walrus aggregator
- Debounce view increments (after 3s watch time)
- Handle network errors gracefully with retry logic

### Security

- Never store video data on-chain, only metadata
- Never hardcode package IDs, read from constants/env
- Proxy all AI API calls through server-side routes
- Validate file type and size before any upload attempt

### Wallet

- Always check wallet connection before transactions
- Use gas sponsorship for all user operations
- Handle transaction errors with user-friendly messages
