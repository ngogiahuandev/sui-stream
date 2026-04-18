# sui_stream Move package

Move smart contract for SuiStream's `Clip` object.

## Build & test

```bash
cd apps/contract
sui move build
sui move test
```

## Publish (testnet)

```bash
sui client switch --env testnet
sui client publish --gas-budget 200000000
```

Copy the returned `packageId` into `apps/web/.env.local`:

```
NEXT_PUBLIC_SUI_STREAM_PACKAGE=0x...
```

## Module reference

Module: `sui_stream::clip`

Entry functions:

- `create_public_clip(title, description, tags, blob_id, thumbnail_blob_id, duration_seconds, &Clock, &mut TxContext)`
- `create_private_clip(..., price_mist, &Clock, &mut TxContext)`
- `increment_views(&mut Clip)`
- `like_clip(&mut Clip)`
- `update_metadata(&mut Clip, title, description, tags, &TxContext)` — owner only
- `delete_clip(Clip, &TxContext)` — owner only

Events: `ClipCreated`, `ClipViewed`, `ClipLiked`, `ClipUpdated`, `ClipDeleted`.

Limits (mirrored in `apps/web/src/types/clip.ts`):

- duration ≤ 60 s
- title ≤ 80 chars (non-empty)
- description ≤ 500 chars
- ≤ 8 tags, each ≤ 24 chars
