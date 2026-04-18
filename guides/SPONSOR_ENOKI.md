# Sponsored Transactions with Enoki

This guide describes how SuiStream uses **Enoki** (Mysten Labs' hosted sponsorship service) to pay gas on behalf of users. Users keep using their own wallets — they only sign; Enoki pays.

> Wallet model is unchanged: users still connect via `@mysten/dapp-kit` and sign with their own wallet. Enoki only sponsors the **gas object** so users never need testnet/mainnet SUI to interact with SuiStream.

---

## Why Enoki

- Hosted sponsor — no custody of a sponsor keypair, no gas-coin pool to babysit.
- Per-app allowlist of Move targets prevents abuse of your sponsor budget.
- Free tier on testnet; usage-based pricing on mainnet.
- Drop-in: replaces the two `// TODO(sponsor)` sites in `useClipUpload` and `useIncrementViews` without touching the Move package.

---

## 1. Account & Project Setup

1. Create an Enoki account at the Enoki Portal.
2. Create a new project and add SuiStream as an app.
3. Generate two API keys for the project:
   - **Public key** — safe to expose, used by the client SDK.
   - **Secret key** — server-only, used by the Next.js API route.
4. Add allowed sponsorable Move targets (one entry per function we sponsor):
   - `<PACKAGE_ID>::clip::create_clip`
   - `<PACKAGE_ID>::clip::increment_views`
   - `<PACKAGE_ID>::clip::like_clip`
5. Pick the network for the project (testnet first, mainnet later).
6. Fund the project's sponsor balance (testnet: free credits; mainnet: top up SUI).

---

## 2. Environment Variables

Add to `apps/web/.env.local`:

- `ENOKI_SECRET_KEY` — server-only, never exposed to the browser.
- `NEXT_PUBLIC_ENOKI_PUBLIC_KEY` — client-side.
- `NEXT_PUBLIC_SUI_NETWORK` — must match the network configured in Enoki.

Add the same keys (without values) to `apps/web/.env.example` so other contributors know they exist.

---

## 3. Architecture

```
Browser (wallet-connected)
    │   build Transaction (no gas budget set)
    ▼
POST /api/sponsor              ──► Enoki API (sponsor signature)
    │   { txBytes, sender }         { sponsoredBytes, sponsorSignature }
    ◄──────────────────────────────
    │   user signs sponsoredBytes with their wallet
    ▼
suiClient.executeTransactionBlock({ transactionBlock, signature: [userSig, sponsorSig] })
```

Two signatures, one transaction. Enoki provides the sponsor signature; the user provides the sender signature.

### Pieces to build

- **`apps/web/src/lib/enoki.ts`** — pure client wrapper around the Enoki SDK + thin helper that POSTs to the sponsor route.
- **`apps/web/src/app/api/sponsor/route.ts`** — Next.js Route Handler. Receives `{ txBytes, sender, allowedMoveCallTargets }`, calls Enoki with the **secret** key, returns the sponsored bytes + sponsor signature.
- **`apps/web/src/hooks/useSponsoredTransaction.ts`** — single source of truth for "build → sponsor → user-sign → execute". Both `useClipUpload` and `useIncrementViews` consume it.

---

## 4. Sponsorship Flow per Action

### A. Publishing a clip (`useClipUpload`)

1. Client uploads video + thumbnail to Walrus → `blobId`, `thumbnailBlobId`.
2. Client builds `create_clip` transaction (existing `buildCreateClipTx`). **Do not call** `signAndExecuteTransaction` — instead serialize to bytes.
3. Client calls `useSponsoredTransaction.sponsor(tx, { allowedMoveCallTargets: ['<PKG>::clip::create_clip'] })`.
4. Hook posts to `/api/sponsor` → server forwards to Enoki → returns sponsored bytes + sponsor sig.
5. Hook prompts user wallet to sign the sponsored bytes.
6. Hook executes via `suiClient.executeTransactionBlock` with both signatures.
7. On success → invalidate `['clips']` query, redirect to `/dashboard/discover`.

Replace the `signAndExecute({ transaction: tx })` call in `useClipUpload.ts` with the sponsored-execute hook.

### B. Counting a view (`useIncrementViews`)

1. After the watch threshold trips, hook builds `increment_views` tx with the clip object id.
2. Same sponsor → user-sign → execute path as above, with `allowedMoveCallTargets: ['<PKG>::clip::increment_views']`.
3. Failures here are silent (best-effort); existing dedupe + `sessionFiredClips` logic stays as-is.

### C. (Future) Likes — same shape, allow `like_clip`.

---

## 5. Security & Abuse Prevention

The sponsor pays for _every_ sponsored transaction, so the API route is your money tap. Treat it accordingly:

- **Restrict allowed targets per request.** Always pass `allowedMoveCallTargets` to Enoki — never sponsor an arbitrary tx.
- **Bind sender to the request.** Server should verify the connected wallet's address (e.g. signed nonce or a session) so a third party can't spend your sponsor on someone else's tx.
- **Rate limit** the route per wallet address and per IP:
  - Uploads: e.g. 5 per wallet per hour.
  - Views: e.g. 60 per wallet per hour, 1 per `(wallet, clipId)` per session (already enforced client-side, repeat server-side).
- **Cap object inputs.** Reject txs whose serialized size exceeds a sane upper bound to block griefers stuffing huge txs.
- **Network gate.** Server checks `NEXT_PUBLIC_SUI_NETWORK` matches the Enoki project network before sponsoring; otherwise refuse.
- **Telemetry.** Log every sponsored tx (sender, target, digest) so you can spot abuse and reconcile spend.
- **Kill switch.** Env-flag `SPONSOR_DISABLED=true` makes the route 503 — use it if you see abuse before you can ship a fix.

---

## 6. Wallet UX Notes

- Users still see a wallet popup to sign — sponsorship only removes the _gas_ requirement. The signing prompt and clip-creation transaction details are unchanged.
- The wallet shows "0 SUI" gas in the prompt because the sponsor's gas object is attached. Some wallets render this as "sponsored"; others hide gas — both are fine.
- `DashboardGuard` already gates the dashboard on a connected wallet — no change needed.

---

## 7. Testing Checklist

- [ ] Connect a brand-new testnet wallet with **0 SUI**.
- [ ] Upload a clip → tx succeeds → wallet balance still 0.
- [ ] Open the clip on `/dashboard/watch/[id]` → after the watch threshold, view count increments → wallet balance still 0.
- [ ] Try to call the `/api/sponsor` route from `curl` with a Move target _not_ in the allowlist → expect a 4xx from Enoki, no sponsorship.
- [ ] Trigger rate limit (e.g. 6th upload in an hour) → expect a 429 from the route, clear toast on the client.
- [ ] Disconnect wallet mid-flow → upload should fail cleanly with a "Connect your wallet" toast (already implemented).
- [ ] Switch `NEXT_PUBLIC_SUI_NETWORK` mismatch with Enoki project → route should refuse.

---

## 8. Rollout Order

1. Land the `/api/sponsor` route + `useSponsoredTransaction` hook with the kill switch flag defaulting to **off** (sponsor disabled, falls back to user-paid gas).
2. Smoke-test on a single dev wallet by flipping the flag locally.
3. Enable in preview deployments (Vercel preview env), test with multiple wallets.
4. Enable in production once rate limits + telemetry are confirmed.
5. Once stable for a week, remove the user-paid fallback so all flows are guaranteed sponsored.

---

## 9. Out of Scope (for now)

- **zkLogin / Enoki social sign-in** — Enoki also offers a wallet abstraction, but SuiStream stays on standard wallet connect for the MVP. Revisit after sponsorship is stable.
- **Walrus storage fees** — Enoki sponsors _Sui gas only_. Walrus blob fees (WAL + tip) are a separate problem, solved by either a server-side upload route or by funding user wallets with WAL. See the upload guide.
