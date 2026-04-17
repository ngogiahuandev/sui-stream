# CLAUDE.md — SuiStream

## Project Overview

**SuiStream** is a decentralized short video platform (≤ 60 seconds) built on the **Sui blockchain**. Users upload, watch, discover, and share short-form video clips. Videos are stored on **Walrus** (decentralized storage), optionally encrypted with **Seal** (for private/gated content), and automatically tagged by **AI** for discovery.

This is the **MVP scope**. Do not add features beyond what is described here.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Wallet Integration:** `@mysten/dapp-kit` for Sui wallet connection
- **Video Player:** vidstack or custom HTML5 `<video>` with HLS support if needed
- **Form Handling:** React Hook Form + Zod validation

### Blockchain

- **Network:** Sui (testnet for dev, mainnet for prod)
- **Smart Contracts:** Move language
- **SDK:** `@mysten/sui` (TypeScript SDK)
- **Wallet Standard:** Sui Wallet Standard (supports Sui Wallet, Suiet, Ethos, etc.)

### Storage

- **Video Storage:** Walrus (decentralized blob storage on Sui)
- **Walrus SDK:** `@mysten/walrus` or direct HTTP publisher/aggregator API
- **Metadata:** On-chain (Sui objects) for video metadata; off-chain indexer for queries

### Encryption

- **Seal Protocol:** Used for encrypting private video content
- **Flow:** Encrypt blob before uploading to Walrus → store decryption policy on-chain → authorized users decrypt via Seal

### AI

- **Purpose:** Auto-tag uploaded videos (content labels, categories, scene detection)
- **SDK:** Vercel AI SDK (`ai` package) with provider of choice (OpenAI, Google, Anthropic, etc.)
- **Flow:** Extract keyframes from uploaded video → send to vision model via Vercel AI SDK → store returned tags as metadata on-chain

---

## Sui Move Contracts

### Key Functions

- `create_clip(...)` — Mint a new Clip object (validate duration ≤ 60s)
- `like_clip(clip: &mut Clip)` — Increment likes
- `increment_views(clip: &mut Clip)` — Increment view count
- `update_tags(clip: &mut Clip, tags: vector<String>)` — Set AI-generated tags
- `create_profile(...)` — Create user profile
- `delete_clip(clip: Clip)` — Burn clip object (owner only)

### Conventions

- All entry functions should use `entry fun` with proper capability checks
- Use `tx_context::sender(ctx)` for ownership verification
- Emit events for indexing: `ClipCreated`, `ClipLiked`, `ClipViewed`
- Package ID stored in `lib/constants.ts` — update after each deploy

---

## Core User Flows

### 1. Upload Flow

```
User connects wallet
  → Selects video file (client validates ≤ 60s, max 100MB)
  → Client extracts thumbnail + keyframes
  → Client calls /api/tag with keyframes → receives AI tags
  → If private: encrypt video blob via Seal
  → Upload video blob to Walrus → get blob_id
  → Upload thumbnail to Walrus → get thumbnail_blob_id
  → Build & execute Sui transaction: create_clip(...)
  → Show success + link to clip
```

### 2. Watch Flow

```
User opens clip page or scrolls feed
  → Fetch Clip object from Sui (or indexer)
  → If not encrypted: fetch blob from Walrus aggregator → play
  → If encrypted: check Seal policy → decrypt via Seal → play
  → Fire increment_views transaction (debounced, after 3s watch)
```

### 3. Discovery Flow

```
Home feed: query indexer for recent clips, sorted by created_at
  → Filter by tags / categories
  → Search by tag keywords
  → Profile pages show user's clips
```

---

## Coding Conventions

### Architecture — Strict Logic / UI Separation

- **`/apps/web/src/app/*` is for routing ONLY.** Page files (`page.tsx`, `layout.tsx`) must contain zero business logic, zero state, zero data fetching. They import a view component and render it — nothing else. Example:
  ```tsx
  // apps/web/src/app/upload/page.tsx — CORRECT
  import { UploadView } from "@/components/upload/UploadView";
  export default function UploadPage() {
    return <UploadView />;
  }
  ```
- **Components are UI only.** Components receive data and callbacks via props or by calling custom hooks. They handle rendering, layout, and user interaction (onClick, onChange). They do NOT contain: fetch calls, transaction building, encryption logic, direct Zustand access, or any business logic.
- **All logic lives in custom hooks.** Every feature's state management, data fetching, mutations, transaction building, side effects, and derived state must be in dedicated hooks under `/hooks`. Hooks are the single source of truth for "what happens when."
- **One feature = one hook + one (or more) UI component(s).** Example: `useClipUpload` hook handles the entire upload pipeline (validate → extract keyframes → tag → encrypt → upload → transact). `ClipUploader.tsx` just renders the form and calls the hook.

### File Organization

- Every distinct feature, utility, type definition, and hook goes in its own file — no mega-files combining unrelated concerns
- Never put multiple hooks in one file. One hook per file, named after the hook: `useClip.ts`, `useWalrus.ts`, `useSeal.ts`
- Never put multiple components in one file unless they are small private sub-components used only by the parent in the same file
- Lib files (`/lib`) are pure functions and client configs — no React, no hooks, no state. These are importable by both hooks and server-side code
- Type definitions: one file per domain (`clip.ts`, `profile.ts`) with barrel export from `types/index.ts`

### TypeScript

- Strict mode enabled, no `any` types
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer named exports over default exports (except `page.tsx` which requires default)
- All async functions must have explicit error handling (try/catch or Result pattern)
- Use barrel exports from `types/index.ts`

### React / Next.js

- Use Server Components by default; add `"use client"` only when needed (interactivity, hooks, wallet)
- Use Suspense boundaries with skeleton loaders for async content
- File naming: PascalCase for components, camelCase for utilities/hooks
- Keep components under 150 lines; extract sub-components if larger
- API routes (`route.ts`) are the only place server-side secrets and Vercel AI SDK server calls should live

### Styling

- Tailwind CSS only — no CSS modules, no styled-components
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Dark mode support via `dark:` variant from day one

### Transactions (Sui)

- All transaction builders go in `/lib/sui.ts` as pure functions
- Hooks consume these builders — components never import from `/lib/sui.ts` directly
- Use `Transaction` from `@mysten/sui/transactions`
- Always use `dryRunTransactionBlock` before executing in dev
- Handle transaction errors with user-friendly toast messages

### Error Handling

- Use toast notifications for user-facing errors (sonner)
- Log detailed errors to console in development
- Never expose raw blockchain errors to users — map to friendly messages in hooks before passing to UI

---

## Key Technical Decisions

### Video Processing (Client-Side)

- Validate duration using `HTMLVideoElement.duration` before upload
- Extract thumbnail at 1s mark using `<canvas>` capture
- Extract 3-5 keyframes evenly distributed for AI tagging
- Compress/transcode if needed using FFmpeg.wasm (only if file > 50MB)

### Walrus Integration

- Upload via Walrus Publisher HTTP API (PUT /v1/blobs)
- Download via Walrus Aggregator HTTP API (GET /v1/blobs/{blobId})
- Store `blobId` on-chain, never the full URL
- Handle epochs: Walrus blobs have storage duration — track expiry

### Seal Integration

- Encrypt the video blob client-side before uploading to Walrus
- Create a Seal policy on-chain defining who can decrypt (e.g., owner-only, allowlist)
- Decryption happens client-side: fetch encrypted blob → Seal decrypt → play
- Use `@aspect-build/seal-sdk` or direct Seal contract calls

### AI Tagging

- Server-side API route `/api/tag` using Vercel AI SDK (`generateObject` or `generateText` with structured output)
- Send keyframe images (base64) to vision model via Vercel AI SDK provider (OpenAI, Google, etc.)
- Return structured tags: `{ categories: string[], objects: string[], mood: string, description: string }`
- Store flattened tag strings on-chain for discoverability
- Rate limit: max 1 tagging request per upload

### Indexing

- MVP: Use Sui RPC `queryEvents` + `getOwnedObjects` for basic queries
- Structure events for efficient filtering by tag, owner, timestamp
- If performance is insufficient: add a lightweight indexer (Sui indexer framework or custom with PostgreSQL)

---

## Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Deploy Move contracts (testnet)
pnpm run deploy:contracts

# Run type checking
pnpm typecheck

# Lint
pnpm lint
```

---

## Do Not

- Do NOT add features beyond MVP scope (no comments, no playlists, no monetization, no live streaming)
- Do NOT use `any` type in TypeScript
- Do NOT store video files on-chain — only metadata and blob references
- Do NOT call AI APIs from the client — always proxy through Next.js API routes using Vercel AI SDK
- Do NOT skip wallet connection checks before transactions
- Do NOT hardcode package IDs — always read from constants.ts / env
- Do NOT ignore Walrus blob epoch expiry in the upload flow
- Do NOT upload unvalidated video files (always check duration ≤ 60s client-side AND in Move contract)
- Do NOT put business logic, state, data fetching, or side effects in components — that belongs in hooks
- Do NOT put UI rendering, JSX, or React hooks in lib files — those are pure utility functions
- Do NOT put anything other than route wiring (import view + render) in `/apps/web/src/app/*` page files
- Do NOT combine multiple features, hooks, or unrelated logic into a single file
