# Mission Rewards Guide

This guide covers the **Mission Rewards** feature: when a creator uploads a clip they can open a **campaign** that locks SUI into a smart-contract-owned vault. Viewers who complete **all** of the campaign's missions earn the reward — once each. No creator custody, no manual payouts, no per-mission micro-claims.

---

## Business Rules (v1)

These rules are load-bearing and every other section flows from them.

1. **Campaign = one reward pot per clip.** One clip can have at most one active campaign.
2. **Missions inside a campaign are AND-gated.** A viewer must complete every enabled mission to claim.
3. **View is always required.** The system includes VIEW in every campaign. Creators cannot disable it.
4. **Like and Comment are optional creator opt-ins.** If enabled, each counts once per viewer.
5. **Each mission kind counts once per viewer.** Repeat likes / repeat comments do not unlock anything extra.
6. **One claim per viewer per campaign.** After a viewer claims, they are marked and can never claim again on that campaign, regardless of further activity.
7. **Single reward amount, single cap.** The campaign has one `reward_per_claim` (SUI) and one `max_claims` (integer). Max viewers rewarded = `max_claims`.
8. **Creator pre-funds the full total.** `total_locked = reward_per_claim × max_claims`. The Move transaction fails unless the supplied coin equals that amount exactly.
9. **Funds are custodied by the Move contract.** The vault is a **shared object** with `Balance<SUI>`; no address "owns" it. Only contract functions can move funds out — one path to viewers on valid claim, one path to creator after expiry.
10. **Creator can only reclaim after expiry.** No mid-life withdrawal, no pause-and-drain. Creators can pause *new* claims (`active=false`) but cannot touch the balance until `clock > expires_at_ms`.
11. **Share mission is not in v1.** Weakest verification; deferred.

---

## Scope (v1)

In scope:
- Per-clip `Campaign` shared Move object, custodied by the contract
- Mandatory VIEW mission + optional LIKE, COMMENT (creator-enabled)
- AND-gated claim: server issues one composite attestation proving all required missions are done
- Gas-sponsored claim transaction (viewer is sender, sponsor pays gas only)
- Creator dashboard surfaces campaign status, claims made, balance remaining
- Expiry + leftover reclaim for the creator

Out of scope (deferred):
- Share mission
- Partial / pro-rata claims
- Mid-life creator withdrawal
- Non-SUI reward tokens
- Multiple campaigns per clip
- Cross-clip or "creator-wide" pooled budgets

---

## Architecture Overview

```
Creator                Viewer                         Platform
   │                     │                               │
   │ 1. fund vault       │                               │
   ▼                     │                               │
Campaign  ◄──────────────┼─── attestation service ───────┤ checks view+like+comment
(shared Move obj,        │    signs composite attestation│ signs (campaign,viewer,nonce,exp)
 vault balance)          │                               │
   ▲                     │ 2. claim tx                   │
   │                     ▼                               │
   │              sender:  viewer   ◄─── Enoki ──────────┤ sponsors gas
   │              gas:     sponsor                       │
   │                     │                               │
   │              contract verifies sig + claim record + │
   │              slots → transfers reward_per_claim     │
   │                     ▼                               │
   │              viewer receives SUI (once)             │
   │                                                     │
   └── after expires_at_ms: creator withdraws remainder  │
```

Two key invariants:
- The **vault is contract-custodied**: no private key can sign a transfer out — only the Move module's allowed code paths.
- The **sponsor never touches reward SUI** — its sole job is gas abstraction on the claim transaction.

---

## 1. Smart Contract Changes

New Move module: `sui_stream::campaign` (do not mutate the existing `mission` module — treat the old one as superseded).

### Data Schema

**`Campaign` (shared object, vault):**

```
- id: UID
- clip_id: ID
- creator: address
- balance: Balance<SUI>                 (locked reward funds; only contract moves these)
- reward_per_claim: u64                 (MIST)
- max_claims: u64
- claims_made: u64
- required_mask: u8                     (bitmask: bit 0 VIEW always set;
                                         bit 1 LIKE if opted-in;
                                         bit 2 COMMENT if opted-in)
- attestation_pubkey: vector<u8>        (Ed25519, 32 bytes, immutable)
- expires_at_ms: u64
- created_at_ms: u64
- active: bool                          (creator toggle; pauses new claims only)
```

**`ClaimKey` (dynamic field on the campaign):**

Keyed by `viewer: address` **only** (no mission_kind — a viewer claims once per campaign total). The dynamic field's mere existence is the anti-double-claim guard.

### Mission kind constants (for bitmask and attestation)

```
MISSION_KIND_VIEW    = 0   // bit 0
MISSION_KIND_LIKE    = 1   // bit 1
MISSION_KIND_COMMENT = 2   // bit 2
REQUIRED_MASK_VIEW_ONLY  = 0b001
LIKE_BIT                  = 0b010
COMMENT_BIT               = 0b100
```

At `create_campaign` time, the contract **forces** `bit 0` on. Creator passes only whether they want to also enable like and/or comment.

### Key Functions

Creator-only:

```
- create_campaign(
    clip_id: ID,
    reward_per_claim: u64,
    max_claims: u64,
    include_like: bool,
    include_comment: bool,
    attestation_pubkey: vector<u8>,
    expires_at_ms: u64,
    deposit: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
  ) → share_object(campaign)
- set_campaign_active(campaign: &mut Campaign, active: bool, ctx)
- withdraw_remaining(campaign: &mut Campaign, clock: &Clock, ctx)
    → Coin<SUI> transferred to creator; only after expiry
```

Viewer-facing (entry fun, gas-sponsored):

```
- claim_reward(
    campaign: &mut Campaign,
    nonce: vector<u8>,
    expiry_ms: u64,
    signature: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
  ) → Coin<SUI> transferred to sender
```

`claim_reward` must:

1. Assert `campaign.active`.
2. Assert `clock.timestamp_ms() < campaign.expires_at_ms`.
3. Assert `clock.timestamp_ms() < expiry_ms` (attestation not stale).
4. Assert `campaign.claims_made < campaign.max_claims`.
5. Assert `!has_claim_record(campaign, sender)`.
6. Verify `signature` over canonical bytes:
   `campaign_id (32) || viewer (32) || required_mask (1) || nonce (16) || expiry_ms_le (8)` = 89 bytes.
   Include `required_mask` in the signed bytes so a stolen attestation for a different campaign's mission set cannot be replayed.
7. Assert `balance.value() >= reward_per_claim` (race guard).
8. Split `reward_per_claim` from balance, transfer `Coin<SUI>` to sender.
9. Increment `claims_made`; add `ClaimKey(sender)` dynamic field; emit `RewardClaimed`.
10. If `claims_made == max_claims`, emit `CampaignExhausted`.

**No mid-life withdraw path.** The only exits from `Campaign.balance` are `claim_reward` (drip to viewers) and `withdraw_remaining` (post-expiry to creator). There is intentionally no "refund", "reduce max", or "take back" function.

### Invariants guaranteed on-chain

- Creator cannot reduce `max_claims` or `reward_per_claim` after creation.
- Creator cannot remove VIEW from `required_mask` (it's set by the contract, not the caller).
- `required_mask` is immutable after creation — creator cannot later add or drop like/comment.
- The only address that can receive funds from `balance` is (a) the claiming viewer for exactly `reward_per_claim`, or (b) the `creator`, and only after expiry.

### Events

```
- CampaignCreated  { campaign_id, clip_id, creator, reward_per_claim, max_claims,
                     required_mask, total_locked, expires_at_ms, created_at_ms }
- CampaignToggled  { campaign_id, active }
- RewardClaimed    { campaign_id, clip_id, viewer, amount,
                     claims_made, claims_remaining, claimed_at_ms }
- CampaignExhausted{ campaign_id }
- CampaignWithdrawn{ campaign_id, creator, amount, withdrawn_at_ms }
```

### Errors (named constants)

```
- E_NOT_CREATOR
- E_CAMPAIGN_INACTIVE
- E_CAMPAIGN_EXPIRED
- E_CAMPAIGN_NOT_EXPIRED        (withdraw called too early)
- E_CAMPAIGN_EXHAUSTED
- E_ALREADY_CLAIMED
- E_INVALID_SIGNATURE
- E_ATTESTATION_EXPIRED
- E_INSUFFICIENT_BALANCE
- E_INVALID_PUBKEY_LEN
- E_INVALID_SIGNATURE_LEN
- E_INVALID_NONCE_LEN
- E_ZERO_REWARD
- E_ZERO_CLAIMS
- E_DEPOSIT_MISMATCH            (deposit != reward * max_claims exactly)
- E_EXPIRY_OUT_OF_RANGE         (must be within [1h, 1y])
- E_CAMPAIGN_CLIP_MISMATCH
```

### Sanity limits (on-chain asserts)

- `reward_per_claim ∈ [1, 100 SUI]` (MIST)
- `max_claims ∈ [1, 1_000_000]`
- `expires_at_ms ∈ [now + 1h, now + 1y]`
- Attestation pubkey is exactly 32 bytes; signature 64 bytes; nonce 16 bytes
- `required_mask` bit 0 always set (programmatically — not taken from caller)

---

## 2. Off-Chain Services

### A. Attestation Service

One endpoint — `POST /api/campaign/:campaignId/claim-attest` — that returns a composite attestation signature iff the viewer has completed **every** required mission. There are no per-mission claim endpoints; a viewer cannot partially redeem.

Inputs from client:
```
{ viewerAddress, sessionToken }
```

Server does, in order:
1. Load campaign from indexer; reject if `!active`, expired, or already exhausted.
2. Reject if indexer shows a `RewardClaimed` for `(campaign, viewer)`.
3. For each bit set in `required_mask`, run the matching check below.
4. If any check fails, respond `409` with a per-mission status object so the UI can render "Comment required to unlock reward."
5. If all pass, apply per-viewer and per-IP rate limits (same caps as the v0 guide).
6. Sign canonical bytes with `ATTESTATION_SIGNING_KEY`; store the signature in `attestation_log`.
7. Return `{ signature, nonce, expiryMs, requiredMask }`.

Per-mission checks:

- **VIEW**: a server-tracked watch session exists for `(viewer, clip)` with `watched_seconds ≥ NEXT_PUBLIC_REWARD_VIEW_REQUIRED_SECONDS`. The session was issued by the player, not created client-side.
- **LIKE**: indexer shows a current `VoteCast { voter=viewer, clip, vote_type=UPVOTE }` with no subsequent `VoteRemoved`.
- **COMMENT**: indexer shows at least one `CommentCreated { author=viewer, clip }` that is not soft-deleted and has content length ≥ min (e.g. 10 chars).

### B. Canonical signing bytes (MUST match Move verifier)

```
campaign_id_bytes (32)
|| viewer_address_bytes (32)
|| required_mask (1 byte)
|| nonce (16 bytes, random per request)
|| expiry_ms (8 bytes, little-endian u64)
```

Total = 89 bytes. Sign with Ed25519 over the concatenation (no hashing layer). Lock this in `apps/web/src/lib/attestation.ts` — one helper that both the `/api/...` route and tests import.

### C. Rate limits (unchanged from v0 model)

Redis/KV-backed:
```
- viewer:{addr}:claims_today
- viewer:{addr}:campaigns_attempted_today
- ip:{hash}:claims_today
- campaign:{id}:attestations_hourly   (circuit breaker)
```

Limits are now **per-claim-attempt**, since a viewer is either fully eligible or not — there's no per-mission throttle.

### D. Indexer tables

```
campaigns
  campaign_id (pk) | clip_id | creator | reward_per_claim | max_claims |
  claims_made | required_mask | balance_mist | expires_at_ms | active |
  created_at_ms

campaign_claims
  campaign_id | viewer | amount | tx_digest | claimed_at_ms
  PRIMARY KEY (campaign_id, viewer)

campaign_withdrawals
  campaign_id (pk) | amount | withdrawn_at_ms | tx_digest

attestation_log
  id | viewer | campaign_id | nonce | signed_at_ms | ip_hash | used (bool)
```

- `campaigns` derived from `CampaignCreated`, `CampaignToggled`, `CampaignExhausted` events.
- `campaign_claims` derived from `RewardClaimed`.
- `campaign_withdrawals` derived from `CampaignWithdrawn`.
- `attestation_log` written directly by the attestation service; mark `used=true` when the indexer observes the matching `RewardClaimed`.

Also maintain a **mission-progress** read model so the UI can render "View ✓ · Like ✗ · Comment ✓" without hitting the attestation service:

```
viewer_mission_progress
  clip_id | viewer | view_seconds | has_upvote | has_comment |
  is_eligible (computed) | updated_at_ms
```

---

## 3. Sponsored Transactions

Add to the Enoki allowlist:
```
<PACKAGE_ID>::campaign::create_campaign
<PACKAGE_ID>::campaign::set_campaign_active
<PACKAGE_ID>::campaign::withdraw_remaining
<PACKAGE_ID>::campaign::claim_reward
```

Sponsor covers gas on all four. Reward SUI is provided by the **creator** on `create_campaign` (a separate coin input on the PTB); viewers never pay gas and never receive a coin from anyone but the campaign vault itself.

See `guides/SPONSOR_ENOKI.md` for the build → sponsor → user-sign → execute flow. No new sponsorship plumbing — the existing `useSponsoredTransaction` hook handles it.

---

## 4. Data Flows

### A. Creator opens a campaign (during upload or later)

```
1. Clip has been created on-chain (Clip object exists)
2. Creator toggles "Offer viewer reward" in the Mission tab of the upload form
3. Creator picks:
     - include_like (bool), include_comment (bool)     — VIEW is pre-selected and disabled
     - reward_per_claim (SUI input, converted to MIST)
     - max_claims (integer)
     - duration_days (7 / 30 / 90)
4. UI computes total_locked = reward_per_claim × max_claims and shows it
5. User clicks "Publish clip". Client:
     - splits a SUI coin of exactly total_locked from their wallet
     - builds a PTB that: (a) executes create_clip, (b) takes the resulting ID,
       (c) calls create_campaign(clip_id, reward_per_claim, max_claims,
           include_like, include_comment, attestation_pubkey, expires_at_ms,
           deposit_coin, clock)
6. Tx is gas-sponsored; the funding coin comes from the creator
7. On success:
     - CampaignCreated event → indexer → creator dashboard picks it up
     - Balance leaves creator's wallet; lives in the shared Campaign object from now on
```

### B. Viewer earns the reward

```
1. Viewer opens the clip page
2. UI renders mission progress derived from viewer_mission_progress:
     - VIEW: playback timer runs; server receives watch pings via existing session mechanism
     - LIKE (if required): progress flips when VoteCast event for this viewer lands
     - COMMENT (if required): progress flips when CommentCreated for this viewer lands
3. When all required missions are ✓ locally, "Claim reward" button enables
4. Viewer clicks Claim:
     - client POST /api/campaign/:campaignId/claim-attest { viewerAddress, sessionToken }
     - server re-verifies each mission server-side (truth), signs attestation
5. Client builds claim_reward tx and submits via useSponsoredTransaction
6. Move verifies signature, inserts ClaimKey(viewer), transfers reward
7. UI optimistically shows "Reward claimed · 0.01 SUI" → toast + viewer earnings tab
```

### C. Pausing a campaign

```
1. Creator flips "Pause new claims" on the campaign card
2. set_campaign_active(false) — sponsored tx
3. Existing attestations already signed will still pass on-chain until expiry,
   but the UI hides the Claim button platform-wide for any viewer who hasn't
   requested an attestation yet
```

Pausing does **not** touch the balance. Creator cannot cash out until expiry.

### D. Withdrawing after expiry

```
1. clock.timestamp_ms() >= expires_at_ms
2. Creator dashboard shows "Withdraw remaining" on the campaign card
3. withdraw_remaining(campaign, clock) — sponsored tx
4. Contract asserts expiry + creator ownership; transfers Coin<SUI> of the
   whole remaining balance to the creator
5. CampaignWithdrawn event → indexer marks campaign as withdrawn (UI archives it)
```

---

## 5. Frontend Architecture

Per the repo's logic/UI separation rules (CLAUDE.md): transaction builders in `lib/sui.ts`, logic in hooks, components are render-only.

### Transaction builders (`apps/web/src/lib/sui.ts`)

```
- buildCreateCampaignTx(args)        → PTB: create_clip + create_campaign chained
- buildSetCampaignActiveTx(args)
- buildWithdrawCampaignTx(args)
- buildClaimRewardTx(args)
```

The **upload submit** uses `buildCreateCampaignTx` when `missionsEnabled` is true, else the existing `buildCreateClipTx`. This keeps the create-clip + create-campaign in one atomic PTB so we never ship a clip with a half-created campaign (or vice versa).

### Hooks (`apps/web/src/hooks`, one per file)

```
- useCreateCampaign.ts          — wrapped into the upload flow when missionsEnabled
- useSetCampaignActive.ts       — pause toggle
- useWithdrawCampaign.ts        — post-expiry reclaim
- useClaimReward.ts             — fetches attestation → submits claim
- useCampaign.ts                — read single campaign
- useCampaigns.ts               — read creator's list (dashboard)
- useMissionProgress.ts         — read viewer's progress on a campaign
- useMyEarnings.ts              — read viewer's claim history
```

### Upload form changes

The Mission tab of the upload form now renders:

- **Master switch**: "Offer viewer reward"
- **Required missions** (read-only, shown as checked chips):
  - `View` — "Always required. Viewer watches 30s."
- **Optional missions**:
  - `Upvote` toggle — counts once per viewer
  - `Comment` toggle — counts once per viewer (≥ 10 chars)
- **Reward per claim (SUI)** — number input
- **Max claims** — integer input
- **Pool duration** — 7 / 30 / 90 days toggle group
- **Total locked** — live computed summary: `reward × max_claims`
- Warning: "This SUI leaves your wallet when you publish. You can reclaim unused rewards after the pool ends."

UI must make clear that **VIEW cannot be toggled off**. Render its row with a disabled switch and a lock icon rather than omitting it — so the viewer rule is visible at upload time.

### Viewer clip page

- `CampaignProgressPanel`: lists required missions with per-mission status (✓/✗/in-progress), a progress bar for `claims_made / max_claims`, and the Claim button.
- Claim button states:
  - **Missions incomplete** — disabled, shows "2 of 3 missions complete".
  - **Ready to claim** — active, shows "Claim 0.01 SUI".
  - **Claimed** — success chip with amount; persists.
  - **Exhausted** — "All rewards claimed for this clip."
  - **Expired / paused** — "Rewards ended" / "Rewards paused."

### Creator dashboard

- `CampaignCard` per clip with active campaign: total locked, spent, remaining, `claims_made / max_claims`, expiry countdown, pause toggle, post-expiry withdraw.
- Empty state explains the one-campaign-per-clip rule.

### Pages (routing only)

- `app/dashboard/upload/page.tsx` — existing; upload form consumes `useCreateCampaign` internally when the toggle is on.
- `app/dashboard/campaigns/page.tsx` — new route rendering `<CreatorCampaignsView />`.
- `app/profile/earnings/page.tsx` — new route rendering `<MyEarningsView />`.

---

## 6. Validation (client)

Zod schema extension on the existing `uploadFormSchema`:

- `missionsEnabled: boolean`
- `includeLike: boolean`
- `includeComment: boolean`
- `rewardSui: number` — `min(MIN_REWARD_PER_CLAIM_SUI)`, `max(MAX_REWARD_PER_CLAIM_SUI)`
- `maxClaims: number` — `int()`, `min(1)`, `max(MAX_CLAIMS_PER_MISSION)`
- `durationDays: '7' | '30' | '90'`

`superRefine`:
- If `missionsEnabled`, require `rewardSui * maxClaims > 0` (both must be non-zero).
- No requirement to enable LIKE or COMMENT — VIEW alone is a valid campaign.

VIEW is not a form field — it is always on when `missionsEnabled` is true.

---

## 7. Security & Anti-Abuse

### Hard guarantees (Move-enforced)

- Only the contract can move funds out of `Campaign.balance`.
- No function reduces `max_claims`, `reward_per_claim`, or drops a bit from `required_mask`.
- Creator cannot withdraw before expiry.
- One claim per viewer — `ClaimKey(viewer)` dynamic field.
- Attestation sig verified on-chain; `required_mask` is part of the signed bytes, so an attestation issued for a view-only campaign cannot be replayed against a view+like campaign with different requirements.
- Every amount check uses `balance::value(&campaign.balance) >= reward_per_claim` to survive claim races.

### Soft guarantees (attestation service)

- Composite attestation only — viewer cannot half-complete and claim.
- VIEW check reads server-tracked watch session, not client-reported time.
- LIKE check reads current on-chain state (vote not removed).
- COMMENT check requires non-deleted, non-empty content ≥ min chars.
- Per-viewer / per-IP daily caps.
- Minimum profile age gate (configurable).

### Operational

- `ATTESTATION_SIGNING_KEY` server-only (KMS in prod).
- Per-campaign `attestation_pubkey` is immutable. Key rotation = new campaigns sign with a new key; old campaigns finish their lifecycle on the old key.
- Circuit breaker on per-campaign attestation rate.
- `NEXT_PUBLIC_REWARD_MISSION_FEATURE` kill switch remains.

### Sponsor role

- Sponsor wallet signs gas only on `claim_reward`, `create_campaign`, `set_campaign_active`, `withdraw_remaining`.
- Sponsor never sees or moves reward SUI.
- Enoki allowlist restricts sponsored Move targets so a malicious client cannot route other package calls through the sponsor.

---

## 8. Environment Variables

To add in Phase 2 (attestation service). Generate an Ed25519 keypair per network — the public key is passed to `create_campaign` and stored on-chain per campaign.

```
# server-only
ATTESTATION_SIGNING_KEY=                  # base64 of 32-byte Ed25519 seed
REWARDS_RATE_LIMIT_REDIS_URL=
REWARDS_PER_DAY_PER_VIEWER=20
REWARDS_PER_DAY_PER_IP=40

# client
NEXT_PUBLIC_ATTESTATION_PUBKEY=           # base64 of 32-byte Ed25519 public key
NEXT_PUBLIC_REWARD_VIEW_REQUIRED_SECONDS=30
NEXT_PUBLIC_REWARD_MIN_PROFILE_AGE_DAYS=1
NEXT_PUBLIC_REWARD_MISSION_FEATURE=1      # kill switch
```

Generate the keypair with:
```
node -e "const c=require('crypto');const {publicKey,privateKey}=c.generateKeyPairSync('ed25519');console.log('pub',publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64'));console.log('priv',privateKey.export({type:'pkcs8',format:'der'}).subarray(-32).toString('base64'));"
```

Do **not** reuse the keypair across networks. Rotating the key only affects new campaigns — old campaigns keep signing and claiming under their stored pubkey until they expire.

Rename / add in `constants.ts`:
```
SUI_STREAM_CAMPAIGN_MODULE = 'campaign'
CAMPAIGN_CREATED_EVENT_TYPE
CAMPAIGN_TOGGLED_EVENT_TYPE
REWARD_CLAIMED_EVENT_TYPE
CAMPAIGN_EXHAUSTED_EVENT_TYPE
CAMPAIGN_WITHDRAWN_EVENT_TYPE
CAMPAIGN_OBJECT_TYPE
MISSION_KIND_VIEW / _LIKE / _COMMENT
REQUIRED_MASK_VIEW_ONLY / _LIKE_BIT / _COMMENT_BIT
MIN_REWARD_PER_CLAIM_SUI / MAX_REWARD_PER_CLAIM_SUI / MAX_CLAIMS_PER_MISSION
```

Event type tags use `SUI_STREAM_PACKAGE_ORIGINAL_ID` (original-id, per Sui convention).

---

## 9. Rollout Plan

Phase 1 — Move module `campaign` (1 PR):
- Full implementation + unit tests (success paths and every failure code)
- Contract upgrade; `Published.toml` + env update
- Enoki allowlist additions for the new Move targets

Phase 2 — Attestation service + indexer (1 PR):
- `/api/campaign/:id/claim-attest` composite endpoint
- `campaigns`, `campaign_claims`, `viewer_mission_progress` tables
- Event handlers for all five new events
- Shared signing helper `lib/attestation.ts`

Phase 3 — Upload flow (1 PR):
- Mission tab on upload form (replaces the partial v0 tab work)
- `useCreateCampaign` hook + atomic `create_clip + create_campaign` PTB
- Creator dashboard skeleton

Phase 4 — Viewer claim (1 PR):
- `CampaignProgressPanel` on watch page
- `useMissionProgress`, `useClaimReward`, `useMyEarnings`
- Full earnings tab on profile

Phase 5 — Creator controls (1 PR):
- Pause / unpause
- Post-expiry withdraw UI
- Campaign analytics + anomaly alerting

---

## 10. Testing Checklist

### Move unit tests

- `create_campaign` succeeds with `deposit.value == reward * max_claims`; rejects any other amount.
- Contract forces bit 0 of `required_mask` on regardless of caller inputs.
- `claim_reward` success: valid sig, all three missions required, single viewer claims once.
- `claim_reward` fails on each error code: bad sig, stale attestation, expired campaign, paused campaign, exhausted, already claimed, insufficient balance, campaign_clip mismatch, wrong `required_mask` in the signed bytes.
- `withdraw_remaining` fails before expiry; succeeds after; rejects non-creator sender.
- No code path reduces `max_claims`, `reward_per_claim`, or `required_mask`.
- Race: two viewers submit valid attestations for the last claim slot — exactly one succeeds; other fails `E_CAMPAIGN_EXHAUSTED`.

### Integration tests

- End-to-end claim on testnet with sponsored gas.
- Viewer removes their upvote after receiving an attestation but before submitting → claim still succeeds on-chain, but attestation service will refuse future attestations if asked again (irrelevant since claim record exists).
- Pause mid-life → outstanding attestations are still honored on-chain; UI hides claim button for new viewers.
- Creator cannot create a second campaign for the same clip (enforced in the indexer + upload UI; on-chain is technically permissive but UI gates it).

### UI

- VIEW row renders as locked/required; no way to toggle off.
- Total locked recomputes live.
- "Reward claimed" state persists across reloads.
- Kill switch hides the Mission tab + viewer claim panel entirely.

---

## 11. Do / Don't

Do:
- Keep funds in the Move-custodied `Campaign.balance`. No creator-owned escrow, no sponsor-held pool.
- Gate the claim on a **single composite attestation** that proves all required missions.
- Include `required_mask` in the signed bytes to block cross-campaign replays.
- Force VIEW into every campaign inside the contract, not just the UI.
- Use one atomic PTB for `create_clip + create_campaign`.
- Respect the existing hook/component/lib boundaries (CLAUDE.md).

Don't:
- Don't add a mid-life withdraw path. Creators commit funds until expiry; the vault is not a wallet.
- Don't allow any function that reduces `max_claims` or `reward_per_claim`.
- Don't let the attestation service issue a signature unless **all** required missions pass at that moment.
- Don't sign per-mission attestations — there is no per-mission claim in v1.
- Don't trust client-reported watch time.
- Don't reuse the attestation signing key across networks.
- Don't let the sponsor wallet ever hold or transfer reward SUI.
- Don't ship the share mission in v1.
