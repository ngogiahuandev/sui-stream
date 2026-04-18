# Private Video Upload & Streaming Guide (Seal-encrypted, pay-to-unlock)

This guide covers private clips on SuiStream: videos that are **encrypted with Seal**, stored on Walrus, and unlockable by paying the creator in SUI. Once unlocked, a viewer can re-watch forever — they own a non-transferable `ClipAccess` object that the Seal key servers honor on every decryption request.

---

## Architecture Overview

```
Creator                                                 Viewer (first time)
─────────                                                ─────────────────────
1. Encrypt video (Seal)                                  1. Open clip page
2. Upload ciphertext → Walrus                            2. See locked + price
3. create_private_clip on Sui                            3. Pay SUI → unlock_clip
                                                         4. Receive ClipAccess
                                                         5. Request key shares
            Sui chain ◄──── Key servers ◄────  6. Servers run seal_approve_unlock
                                                         7. Decrypt + play

                                                         Replay (forever)
                                                         ─────────────────
                                                         1. ClipAccess still owned
                                                         2. seal_approve_unlock passes
                                                         3. Re-fetch key shares
                                                         4. Decrypt + play
```

Three layers of trust:
- **Walrus** stores opaque ciphertext — even a malicious Walrus operator learns nothing.
- **Sui** holds the policy: who paid, who owns. Single source of truth for access control.
- **Seal key servers** (threshold, e.g. 2-of-3) hold key shares. They check the on-chain policy before issuing a share. No single server can decrypt alone.

---

## 1. Smart contract changes

The current Move package (`apps/contract/sources/clip.move`) already has `create_private_clip` and a `price_mist` field. To support Seal + payment we add:

### New `Clip` field
- `seal_id: vector<u8>` — the Seal identity bound to this clip's ciphertext (32-byte nonce). Stored so `seal_approve_*` can verify the requester is asking for this clip's key, not someone else's.

### New module `sui_stream::access`

Holds the `ClipAccess` object plus the entry functions key servers and clients call.

```
public struct ClipAccess has key {
    id: UID,
    clip_id: ID,
    viewer: address,
    unlocked_at_ms: u64,
}
```

`ClipAccess` has `key` only (no `store`) → **non-transferable**. The viewer can never give it away or sell it.

### Entry functions

- `unlock_clip(clip: &mut Clip, payment: Coin<SUI>, clock: &Clock, ctx)`
  - Asserts `clip.visibility == VISIBILITY_PRIVATE`.
  - Asserts `coin::value(&payment) >= clip.price_mist`.
  - Splits the exact `price_mist` and `transfer::public_transfer`s it to `clip.owner`.
  - Returns any change to the buyer (rounds gracefully).
  - Mints `ClipAccess { clip_id: object::id(clip), viewer: sender, unlocked_at_ms: clock.timestamp_ms() }` and transfers it to the buyer.
  - Emits `ClipUnlocked { clip_id, viewer, paid_mist }`.

- `seal_approve_unlock(seal_id: vector<u8>, clip: &Clip, access: &ClipAccess, ctx: &TxContext)`
  - **Read-only entry function** invoked by Seal key servers via `dryRunTransactionBlock`. Must NOT abort for the share to be released.
  - Checks (any failure aborts with a clear error code):
    1. `clip.seal_id == seal_id`
    2. `access.clip_id == object::id(clip)`
    3. `access.viewer == tx_context::sender(ctx)`

- `seal_approve_owner(seal_id: vector<u8>, clip: &Clip, ctx: &TxContext)`
  - Short-circuit for the creator so they can always preview their own upload without paying themselves.
  - Checks `clip.seal_id == seal_id` and `clip.owner == sender`.

### Updated `create_private_clip`
- Adds `seal_id: vector<u8>` parameter and stores it on the new `Clip`.
- Validate `seal_id` length (e.g. exactly 32 bytes) to prevent malformed identities.
- Allow `price_mist == 0`? Reject — public clips already cover the free case.

### Bookkeeping (optional, keep MVP small)
- `set_price(clip: &mut Clip, new_price_mist: u64, ctx)` — owner-only. Existing `ClipAccess` stays valid.
- Don't add a refund function — the on-chain access object is the receipt.

---

## 2. Seal setup

### Pick a key server set
- Use the Mysten-published key server registry on testnet to start.
- Threshold: **2-of-3** for MVP (1 server failure = still decryptable; 2 collusions = compromise).
- Hardcode the key server `ObjectId`s in `apps/web/src/lib/constants.ts` so you can audit and rotate.

### Identity scheme
- Each clip gets a fresh **32-byte random nonce** generated client-side at upload time.
- Seal identity = `<package_id_bytes> || <nonce>` — namespacing by package prevents one app's identity from being valid in another.
- Store the nonce in `Clip.seal_id`.
- The `seal_approve_*` functions take the same identity bytes and verify they match `clip.seal_id`.

### Where the SDK lives
Add `@mysten/seal` to `apps/web`. New library files:
- `apps/web/src/lib/seal-client.ts` — singleton `SealClient` configured with key servers + threshold + Sui client.
- `apps/web/src/lib/seal-encrypt.ts` — pure helpers: `encryptClipBlob(blob, sealId) → Uint8Array`, `decryptClipBlob(ciphertext, txBytes) → Uint8Array`.

The SDK takes care of share fetching, threshold reconstruction, AES-GCM under the hood.

---

## 3. Upload flow (private)

```
User connects wallet
  → Selects video file (validate ≤ 60s, ≤ 100MB, supported MIME)
  → Selects visibility = private + sets unlock price (in SUI)
  → Client extracts thumbnail (left UNENCRYPTED — it's marketing)
  → Client extracts keyframes for AI metadata
  → POST /api/generate-metadata → { title, description, tags }
  → Generate seal_id = crypto.getRandomValues(new Uint8Array(32))
  → Encrypt video bytes with Seal (identity = pkg || seal_id)
  → Upload ciphertext to Walrus → blob_id
  → Upload thumbnail to Walrus → thumbnail_blob_id  (PUBLIC)
  → Build create_private_clip(title, description, tags,
                              blob_id, thumbnail_blob_id,
                              duration_seconds, price_mist, seal_id, &Clock)
  → Sponsor + sign + execute (existing /api/sponsor flow)
  → Redirect to clip page
```

Key points:
- **Encryption happens before Walrus upload.** Walrus only ever sees ciphertext.
- **Thumbnail stays public.** Without it, no discovery → no sales. If you need a "blurred" preview, encrypt a low-res version and serve a placeholder until unlock.
- **AI metadata uses keyframes from plaintext** before encryption — server route never sees the encrypted output.
- **`seal_id` is stored on-chain** so anyone (including key servers) can verify the binding.

### New hook
`apps/web/src/hooks/usePrivateClipUpload.ts` — mirrors the existing `useClipUpload`, but inserts the encryption step between thumbnail extraction and Walrus upload, and calls `create_private_clip` with `seal_id` + `price_mist`.

(Strongly consider keeping `useClipUpload` unchanged and adding the private variant alongside it — separation matches CLAUDE.md's one-feature-one-hook rule.)

---

## 4. Watch flow

### A. Owner viewing their own clip

```
Open /dashboard/watch/[id]
  → useClip(id) → Clip with visibility = private
  → If clip.owner == account.address:
      → Build dummy tx that calls seal_approve_owner(seal_id, clip)
      → SealClient.fetchKeys(...) → key shares
      → Fetch ciphertext from Walrus
      → Decrypt locally → playable Blob URL
      → Play
  → Fire increment_views (sponsored) at watch threshold
```

No payment, no `ClipAccess` needed — `seal_approve_owner` short-circuits.

### B. Viewer who hasn't unlocked

```
Open /dashboard/watch/[id]
  → useClip(id) → Clip
  → Query for ClipAccess where viewer = me, clip_id = clip.id
  → None found → render <UnlockPrompt price={clip.priceMist} />
  → User clicks "Unlock for X SUI"
  → Build tx:
      coin = tx.splitCoins(tx.gas, [price_mist])    // pay from user's SUI
      tx.moveCall({
        target: `${pkg}::access::unlock_clip`,
        arguments: [tx.object(clip.id), coin, tx.object(SUI_CLOCK_OBJECT_ID)]
      })
  → Sponsor flow: server pays GAS, user still pays the unlock SUI.
  → User signs → execute → wait for ClipAccess in effects.created
  → Decrypt & play (same as owner flow but seal_approve_unlock with the new ClipAccess)
```

The **gas** is sponsored. The **unlock price** is paid by the user — that's the whole point.

### C. Viewer replaying

```
Open /dashboard/watch/[id]
  → useClip(id) → Clip
  → Query for ClipAccess for me + clip.id → found
  → Build dry-run tx: seal_approve_unlock(seal_id, clip, access)
  → SealClient.fetchKeys(...)
  → Fetch ciphertext, decrypt, play
  → Optionally cache decryption key in sessionStorage keyed by clip.id
    so subsequent plays in the same session skip the key-server round-trip.
```

Replays are **free and unlimited**. As long as `ClipAccess` still exists (which it does, forever — it's a key-only object) the key servers will keep approving.

### Hooks to add
- `apps/web/src/hooks/useClipAccess.ts` — `useQuery` looking up `ClipAccess` objects owned by the connected wallet, filtered by `clip_id`.
- `apps/web/src/hooks/useUnlockClip.ts` — orchestrates the unlock tx (sponsor + sign + execute) and invalidates the access query on success.
- `apps/web/src/hooks/useDecryptedClipUrl.ts` — fetches ciphertext, requests Seal keys, decrypts, returns a blob URL. Cleans up on unmount (`URL.revokeObjectURL`). Caches per `clip.id` in a ref to survive remounts.

### UI components
- `apps/web/src/components/watch/UnlockPrompt.tsx` — locked state with price + "Unlock" CTA.
- `apps/web/src/components/watch/PrivateVideoPlayer.tsx` — accepts a decrypted blob URL; otherwise renders `UnlockPrompt` or a "Decrypting…" skeleton.
- `apps/web/src/components/watch/WatchView.tsx` — branches on `clip.visibility` to render the public or private player path.

---

## 5. Best Practices

### Encryption
- **One identity per clip.** Never reuse a `seal_id` across clips — compromise of one would expose the other.
- **Encrypt the whole file**, not chunks (chunked encryption is a future optimization once you support HLS).
- **Don't encrypt thumbnails.** They're marketing; encrypting them kills discovery.
- **Generate the nonce client-side** with `crypto.getRandomValues` — never let a server choose it.
- **Validate `seal_id` length on-chain** (exactly 32 bytes) so a malicious caller can't smuggle huge identities.

### On-chain access
- **`ClipAccess` is `key` only**, no `store` → cannot be transferred. Prevents resale of access.
- **Bind to address, not wallet.** `access.viewer = tx_context::sender(ctx)` — losing the wallet means losing access. Document this clearly.
- **Permanent access.** Don't add an expiry timestamp for MVP. Adds tax to the user, kills the "buy once, watch forever" promise.
- **Owner short-circuit.** Always allow the creator to view their own work without paying themselves.

### Payment
- **Exact-amount transfers, not approve/transfer.** `unlock_clip` accepts a `Coin<SUI>` and splits the exact `price_mist` to the owner; refund the dust to the buyer in the same call.
- **Sponsor the gas, not the unlock.** Letting your sponsor pay the unlock would let anyone drain it.
- **Server-side allowlist enforcement.** The `/api/sponsor` route must explicitly allow `unlock_clip` and reject any tx that tries to transfer SUI from the sponsor.
- **Round prices in the UI** (e.g. min 0.1 SUI). Sub-mist rounding errors confuse users.

### Decryption
- **Decrypt in the browser only.** Never send plaintext or keys to your server.
- **Cache decrypted keys in `sessionStorage`** keyed by `clip.id`. Cleared on tab close. Don't persist in `localStorage` — too much liability.
- **Decrypt to a `Blob` URL**, not data URL. Memory-efficient for 100 MB videos.
- **Always `URL.revokeObjectURL` on unmount**, otherwise you leak hundreds of MB per watch.
- **Stream decryption** when the SDK supports it (currently full-file). Treat as a future optimization.

### Key servers
- **Threshold ≥ 2.** A 1-of-N setup means any single server can decrypt everything — defeats Seal's purpose.
- **Mix operators.** Don't use 3 key servers run by the same org.
- **Pin server `ObjectId`s** in `lib/constants.ts`. Treat rotation as a code change with PR review.
- **Handle key-server downtime** with a clear toast: "Decryption servers are unreachable, please retry." Don't silently retry forever.
- **Monitor key request latency.** If servers are slow, watch UX dies.

### Walrus
- **Long retention for encrypted blobs.** A buyer who paid and then can't watch because the blob expired = refund disputes. Use a higher `epochs` value than public clips (e.g. 100 vs 5) and warn creators about expiry.
- **Renewal flow.** When epoch is within 10 of expiry, surface a creator-facing "Renew storage" action that calls Walrus to extend.
- **Server-side upload route for encrypted blobs.** Encrypted bytes are still binary — same Walrus path as public uploads. Same WAL-funding concern (see SPONSOR_ENOKI.md §9).

### UI/UX
- **Show price prominently** on every locked surface (card, watch page).
- **Unlock = single click** after wallet sign. Don't make users sign twice for the same purchase.
- **Optimistic decrypt.** Once `unlock_clip` is in `effects.created` (don't wait for finality), kick off the key fetch + decrypt in parallel with the toast confirmation. Cuts perceived latency in half.
- **"You own this" badge** on cards/watch page once `ClipAccess` is detected — gives the user confidence.
- **Sort the user's "Vault" page** by `unlocked_at_ms` desc, not by clip creation time.

---

## 6. Threats & Limitations

Document these honestly to the user — don't pretend Seal is DRM:

- **Plaintext leak after decrypt.** Once decrypted in the browser, a determined viewer can record the screen / dump the blob with devtools. Seal protects the *transport and storage* layer, not the rendering layer. There is **no DRM on the open web** — accept this.
- **Key sharing.** A buyer can share their `ClipAccess` wallet's seed phrase with friends. Bind to address means anyone with the wallet has access. Mitigation: require active wallet signature per session (already true — wallet must be connected). Not a fix, just friction.
- **Lost wallet = lost access.** If the buyer loses their wallet, their `ClipAccess` is gone. We cannot reissue. Document this in a tooltip near the unlock button.
- **Public metadata.** Title, description, tags, duration, price, owner, `seal_id`, blob_id — all public on Sui. The *video bytes* are private; everything else isn't. Set creator expectations.
- **Walrus blob deletion / expiry.** If the blob disappears, even paying viewers can't watch. Renew aggressively or set retention very high.
- **Key-server collusion above threshold.** A 2-of-3 setup is broken if any 2 servers collude. Pick servers run by independent operators.
- **No refunds on-chain.** Once `unlock_clip` succeeds, the SUI is the creator's. Don't promise refunds you can't atomically deliver.
- **No retroactive private → public.** Flipping visibility doesn't decrypt existing buyers' downloads (they already have the key); but you'd need to re-upload an unencrypted blob to make it freely streamable. Treat visibility as immutable for MVP.

---

## 7. Files to add / modify

**Move (`apps/contract/`)**
- Edit `sources/clip.move` — add `seal_id` field, update `create_private_clip` signature.
- New `sources/access.move` — `ClipAccess`, `unlock_clip`, `seal_approve_unlock`, `seal_approve_owner`.
- New `tests/access_tests.move` — happy path unlock, owner short-circuit, wrong viewer rejection, insufficient payment rejection.

**Web (`apps/web/`)**
- `package.json` — add `@mysten/seal`.
- `src/lib/constants.ts` — add `SEAL_KEY_SERVERS: ObjectId[]`, `SEAL_THRESHOLD: number`.
- `src/lib/seal-client.ts` — `SealClient` singleton.
- `src/lib/seal-encrypt.ts` — `encryptClipBlob`, `decryptClipBlob`.
- `src/lib/sui.ts` — add `buildUnlockClipTx`, update `buildCreateClipTx` to include `seal_id`.
- `src/lib/sponsor-server.ts` — extend `ALLOWED_TARGETS` with `::access::unlock_clip`.
- `src/types/clip.ts` — extend `Clip` with `sealId: string` (hex), add `ClipAccess` type.
- `src/hooks/usePrivateClipUpload.ts` — encryption pipeline.
- `src/hooks/useClipAccess.ts` — query for owned `ClipAccess` objects.
- `src/hooks/useUnlockClip.ts` — pay + execute.
- `src/hooks/useDecryptedClipUrl.ts` — fetch + decrypt + blob URL.
- `src/components/watch/UnlockPrompt.tsx`
- `src/components/watch/PrivateVideoPlayer.tsx`
- `src/components/watch/WatchView.tsx` — branch on visibility.
- `src/components/upload/UploadForm.tsx` — visibility radio (public/private), price input shown when private.
- `src/app/dashboard/vault/page.tsx` — "My Vault": list of clips the user has unlocked.

---

## 8. Verification Checklist

**Contract**
- [ ] `sui move build` clean.
- [ ] `sui move test` — at minimum: unlock happy path, owner preview without payment, wrong viewer rejected, underpayment rejected.

**Upload**
- [ ] Encrypt → upload → publish a private clip with price 0.5 SUI.
- [ ] Inspect the Walrus blob with the aggregator URL — confirm bytes are NOT a valid mp4 (entropy check).
- [ ] Inspect the on-chain Clip — `seal_id` non-empty, `price_mist == 500_000_000`, `visibility == 1`.

**Owner watch**
- [ ] Sign in as the creator → open the clip → video plays without an unlock prompt.
- [ ] Confirm `seal_approve_owner` is the path used (network tab to key servers).

**Viewer first-watch**
- [ ] Sign in as a different wallet with ≥ price + small buffer → see locked state with correct price.
- [ ] Click Unlock → wallet popup → confirm → SUI moves to creator → `ClipAccess` minted → video decrypts and plays.
- [ ] Inspect: creator address balance increased by exactly `price_mist` (not paying gas — sponsor covered it).

**Viewer replay**
- [ ] Reload the watch page → no unlock prompt → video plays again.
- [ ] Disconnect + reconnect → still plays.
- [ ] Sign in from a fresh browser profile with the same wallet → still plays (access is on-chain, not local).

**Negative cases**
- [ ] Try to call `seal_approve_unlock` from a wallet that didn't pay → key servers refuse → toast "Access denied".
- [ ] Try to underpay (`coin.value < price_mist`) → tx aborts.
- [ ] Try to call `unlock_clip` on a public clip → tx aborts.
- [ ] Try to send a `ClipAccess` to another address → tx fails (object lacks `store`).
- [ ] Stop one of the 3 key servers → decryption still works (2-of-3 threshold).

**Sponsor allowlist**
- [ ] Confirm `/api/sponsor` accepts `unlock_clip` and rejects `pay::send` or arbitrary transfers.
- [ ] Confirm `/api/sponsor` cannot be tricked into paying the unlock price (it should only sign the gas object, never approve a SUI transfer from itself).

---

## 9. Future work (out of scope for MVP)

- **Subscription pricing** — pay once for N days of access. Add `expires_at_ms` to `ClipAccess` and check in `seal_approve_unlock`.
- **Bundle pricing** — pay once for a creator's whole catalog.
- **Tipping** — pay extra above `price_mist`; route surplus to creator with no extra access semantics.
- **Refunds within 24h** — burn `ClipAccess`, return SUI minus a small fee.
- **HLS segment-level encryption** — encrypt each segment individually; lets you stream + decrypt incrementally instead of full-file at once. Big win for >60s formats if you ever drop the duration cap.
- **zkLogin path** — once Seal supports zkLogin sender derivation, combine with the Enoki guide to deliver "sign in with Google + watch private clip" in one shot, no wallet popups.
