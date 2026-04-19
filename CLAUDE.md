# CLAUDE.md — SuiStream

## Project Overview

**SuiStream** is a decentralized short video platform (≤ 60 minutes, ≤ 1GB) built on the **Sui blockchain**. Users upload, watch, discover, and share short-form video clips. Videos are stored on **Walrus** (decentralized blob storage), with **AI** generating title, description, and tags. All gas fees are **sponsored** by the platform.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Wallet Integration:** `@mysten/dapp-kit` for Sui wallet connection
- **Video Player:** Custom HTML5 `<video>`
- **Form Handling:** React Hook Form + Zod validation

### Blockchain

- **Network:** Sui (testnet for dev, mainnet for prod)
- **Smart Contracts:** Move language
- **SDK:** `@mysten/sui` (TypeScript SDK)
- **Wallet Standard:** Sui Wallet Standard (supports Sui Wallet, Suiet, Ethos, etc.)
- **Gas Sponsorship:** All user transactions are sponsored via `/api/sponsor` endpoint

### Storage

- **Video Storage:** Walrus (decentralized blob storage on Sui)
- **Upload/Download:** Direct HTTP API to Walrus Publisher/Aggregator
- **Metadata:** On-chain (Sui objects) for video metadata

### AI

- **Purpose:** Auto-generate title, description, and tags for uploaded videos + AI-powered video discovery
- **SDK:** Vercel AI SDK (`ai` package) with OpenAI provider
- **Flow:** Extract keyframes from uploaded video → send to vision model → returns title, description, tags

---

## Implemented Features

### Upload

- Client-side video validation (duration ≤ 60m, file size ≤ 1GB)
- Thumbnail extraction via canvas capture
- AI metadata generation via `/api/generate-metadata`
- Video upload to Walrus
- Sui transaction to mint Clip object (sponsored)

### Watch

- Video playback from Walrus aggregator
- View count tracking (debounced, after 3s watch)
- Like/Dislike voting system (upvote/downvote)
- Threaded comments
- Direct donations to creators
- Portrait/landscape responsive layouts

### Discover

- Home feed with recent clips
- Tag-based filtering
- AI-powered video discovery ("Surprise me" feature)
- Search by tags

### Subscriptions

- Follow/unfollow creators
- Following feed

### Creator Tools

- Profile pages showing creator's clips
- Upload management (my videos)
- Channel analytics (views, watch time)
- Donation earnings tracking

### Mission Rewards (Campaigns)

- Creators can create campaigns with Sui rewards
- VIEW, LIKE, COMMENT missions
- Users complete missions to claim rewards
- Claims tracked per user per campaign

---

## Sui Move Contracts

### Key Functions

- `create_clip(...)` — Mint a new Clip object
- `vote_clip(clip: &mut Clip, vote_type: u8)` — Cast upvote (+1) or downvote (-1)
- `remove_vote(clip: &mut Clip)` — Remove vote
- `increment_views(clip: &mut Clip)` — Increment view count
- `update_metadata(clip: &mut Clip, title: String, description: String, tags: vector<String>)` — Update metadata
- `follow_creator(creator: address)` — Follow a creator
- `unfollow_creator(creator: address)` — Unfollow a creator
- `delete_clip(clip: Clip)` — Burn clip object (owner only)
- `create_campaign(...)` — Create a reward campaign
- `claim_reward(...)` — Claim campaign rewards

### Conventions

- Emit events for indexing: `ClipCreated`, `ClipVoted`, `ClipViewed`, `Followed`, `Unfollowed`, `CampaignCreated`, `RewardClaimed`
- Package ID stored in `lib/constants.ts`
- Use **Sponsored Transactions** for all user operations

---

## Coding Conventions

### Architecture — Strict Logic / UI Separation

- **`/apps/web/src/app/*` is for routing ONLY.** Page files must contain zero business logic. Example:
  ```tsx
  import { UploadView } from "@/components/upload/UploadView";
  export default function UploadPage() {
    return <UploadView />;
  }
  ```
- **Components are UI only.** Components receive data and callbacks via props or by calling custom hooks.
- **All logic lives in custom hooks.** Every feature's state management, data fetching, mutations, transaction building, and side effects must be in dedicated hooks under `/hooks`.
- **One feature = one hook + one (or more) UI component(s).**

### File Organization

- Every distinct feature, utility, type definition, and hook goes in its own file
- Never put multiple hooks in one file
- Lib files (`/lib`) are pure functions — no React, no hooks
- Type definitions: one file per domain with barrel export from `types/index.ts`

### TypeScript

- Strict mode enabled, no `any` types
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer named exports over default exports (except `page.tsx`)

### React / Next.js

- Use Server Components by default; add `"use client"` only when needed
- Use Suspense boundaries with skeleton loaders
- File naming: PascalCase for components, camelCase for utilities/hooks
- Keep components under 150 lines
- API routes (`route.ts`) are the only place server-side secrets and AI SDK calls should live

### Styling

- Tailwind CSS only — no CSS modules, no styled-components
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Dark mode support via `dark:` variant

### Transactions (Sui)

- All transaction builders go in `/lib/sui.ts` as pure functions
- Hooks consume these builders
- Use `Transaction` from `@mysten/sui/transactions`
- **All user transactions MUST be sponsored**
- Handle transaction errors with user-friendly toast messages

### Error Handling

- Use toast notifications for user-facing errors (sonner)
- Never expose raw blockchain errors to users

---

## Homepage Best Practices

The homepage is at `/` and is the **public-facing landing page** (not in dashboard). It uses these components:

- `Hero` — Main headline, tagline, CTA buttons (Connect Wallet, Upload)
- `Features` — Key platform features (Decentralized, AI-powered, Sponsored Gas)
- `HowItWorks` — Step-by-step explanation (Upload → AI generates metadata → Earn rewards)
- `CTASection` — Final call to action

**Do:**

- Keep the hero headline short and punchy (≤ 10 words)
- Lead with the value proposition, not technical details
- Use the logo and brand colors consistently
- Make CTAs prominent and above the fold
- Show wallet connection early

**Don't:**

- Don't include dashboard-specific UI (sidebars, nav menus meant for app)
- Don't load heavy data on the homepage (keep it static)
- Don't put login forms — wallet connection is the entry point
- Don't explain gas sponsorship in detail — just say "gas fees sponsored"

---

## API Routes

- `GET /api/discover` — Query clips from indexer (requires indexer service)
- `POST /api/generate-metadata` — AI generates title, description, tags from video keyframes
- `POST /api/generate-thumbnail` — Generate thumbnail from video
- `POST /api/sponsor` — Sponsored transaction endpoint
- `POST /api/campaign/[campaignId]/claim-attest` — Submit claim attestation

---

## Commands

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun build

# Run type checking
bun run check-types
```

---

## Do Not

- Do NOT add live streaming features
- Do NOT use `any` type in TypeScript
- Do NOT store video files on-chain — only metadata and blob references
- Do NOT call AI APIs from the client �� always proxy through Next.js API routes
- Do NOT skip wallet connection checks before transactions
- Do NOT hardcode package IDs — always read from constants.ts / env
- Do NOT ignore Walrus blob epoch expiry
- Do NOT upload unvalidated video files (check ≤ 60m, ≤1GB client-side AND in Move contract)
- Do NOT put business logic in components — that belongs in hooks
- Do NOT put UI rendering in lib files
- Do NOT put anything other than route wiring in `/apps/web/src/app/*` page files
- Do NOT combine multiple features into a single file
- Do NOT write code comments
- Do NOT skip gas sponsorship on user transactions
