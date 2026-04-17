# CLAUDE.md — SealPass

## Project Overview

**SealPass** is a decentralized password manager built on the Sui blockchain, using **Seal** for client-side encryption policy enforcement and **Walrus** for decentralized encrypted blob storage. Users authenticate via their Sui wallet — no email, no master password, no centralized server holding secrets.

**Hackathon context**: CommandOSS Hackathon, April 2026. Topic #13 from the list: "Password Manager using Walrus + Seal."

---

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Framework      | Next.js 14+ (App Router, `src/` directory)   |
| Language       | TypeScript (strict mode)                     |
| Styling        | Tailwind CSS + shadcn/ui components          |
| State          | Zustand for client-side vault state          |
| Wallet         | `@mysten/dapp-kit` + `@mysten/sui` SDK       |
| Encryption     | `@mysten/seal` (client-side encrypt/decrypt) |
| Storage        | Walrus SDK (encrypted blob store)            |
| Smart Contract | Move (Sui) — vault access policy contracts   |
| Package Mgr    | pnpm                                         |
| Linting        | ESLint + Prettier                            |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                │
│                                                  │
│  ┌────────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Next.js   │  │  Zustand   │  │  Seal SDK  │  │
│  │  App UI    │◄─┤  Store     │  │  (encrypt/ │  │
│  │            │  │  (vault    │  │   decrypt)  │  │
│  └─────┬──────┘  │   state)   │  └─────┬──────┘  │
│        │         └───────────┘        │          │
│        │                              │          │
│  ┌─────▼──────────────────────────────▼───────┐  │
│  │          Sui Wallet (dapp-kit)              │  │
│  │  - Signs transactions                      │  │
│  │  - Identity = wallet address               │  │
│  └─────┬──────────────────────────────┬───────┘  │
│        │                              │          │
└────────┼──────────────────────────────┼──────────┘
         │                              │
    ┌────▼─────┐                 ┌──────▼──────┐
    │   Sui    │                 │   Walrus    │
    │ Network  │                 │   Storage   │
    │          │                 │             │
    │ - Vault  │                 │ - Encrypted │
    │   policy │                 │   password  │
    │   objects│                 │   blobs     │
    │ - Access │                 │             │
    │   control│                 │             │
    └──────────┘                 └─────────────┘
```

### Key Principle: Zero-Knowledge Architecture

- **ALL encryption/decryption happens client-side** in the browser.
- The Walrus network only ever stores encrypted blobs — it never sees plaintext.
- Sui stores access policies and vault metadata (blob IDs, labels) — never secrets.
- No backend server. The Next.js app is fully static/client-rendered for vault operations.

---

## Project Structure

```
sealpass/
├── CLAUDE.md
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                  # Sui network, Walrus endpoint configs
│
├── move/                       # Sui Move smart contracts
│   ├── Move.toml
│   └── sources/
│       └── vault_policy.move   # On-chain vault access policy
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + providers
│   │   ├── page.tsx            # Landing / connect wallet page
│   │   ├── vault/
│   │   │   └── page.tsx        # Main vault dashboard (protected)
│   │   └── vault/
│   │       └── [id]/
│   │           └── page.tsx    # Single credential detail view
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── header.tsx      # Top nav + wallet status
│   │   │   └── sidebar.tsx     # Folder navigation
│   │   ├── vault/
│   │   │   ├── credential-card.tsx
│   │   │   ├── credential-form.tsx
│   │   │   ├── credential-list.tsx
│   │   │   ├── vault-search.tsx
│   │   │   └── folder-manager.tsx
│   │   ├── auth/
│   │   │   └── connect-wallet-button.tsx
│   │   └── password-generator/
│   │       └── password-generator.tsx
│   │
│   ├── lib/
│   │   ├── seal.ts             # Seal encrypt/decrypt wrappers
│   │   ├── walrus.ts           # Walrus blob upload/download helpers
│   │   ├── sui.ts              # Sui transaction builders
│   │   ├── crypto.ts           # Additional client-side crypto utils
│   │   └── constants.ts        # Network endpoints, package IDs
│   │
│   ├── stores/
│   │   └── vault-store.ts      # Zustand store for vault state
│   │
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   │
│   └── hooks/
│       ├── use-vault.ts        # Vault CRUD operations hook
│       ├── use-seal.ts         # Seal encryption hook
│       └── use-walrus.ts       # Walrus storage hook
│
└── public/
    └── logo.svg
```

---

## Data Models

### Credential Entry (Client-Side, Pre-Encryption)

```typescript
interface Credential {
  id: string; // UUID, generated client-side
  siteName: string; // e.g. "GitHub"
  siteUrl: string; // e.g. "https://github.com"
  username: string;
  password: string; // plaintext, only exists in memory
  notes?: string;
  folderId?: string; // for folder organization
  createdAt: number; // Unix timestamp
  updatedAt: number;
}
```

### Vault Index (Stored On-Chain as Sui Object)

```typescript
// This is the on-chain metadata — NO secrets here
interface VaultIndex {
  owner: string; // Sui wallet address
  entries: VaultEntryMeta[]; // list of entry references
}

interface VaultEntryMeta {
  entryId: string; // matches Credential.id
  label: string; // encrypted or plaintext site label (for search)
  walrusBlobId: string; // pointer to encrypted blob on Walrus
  createdAt: number;
  updatedAt: number;
}
```

### Encrypted Blob (Stored on Walrus)

The entire `Credential` object is JSON-serialized, encrypted via Seal, then uploaded as a single blob to Walrus. The `walrusBlobId` returned is stored in the on-chain VaultIndex.

---

## MVP Features (Scope)

### F1: Wallet-Based Authentication

- User lands on `/` and clicks "Connect Wallet."
- Use `@mysten/dapp-kit` `ConnectButton` and wallet hooks.
- After connection, redirect to `/vault`.
- No signup flow, no email, no password. Wallet address = user identity.
- Protect `/vault/*` routes — redirect to `/` if no wallet connected.

### F2: Vault CRUD (Create, Read, Update, Delete)

- **Create**: User fills a form (site name, URL, username, password, notes, folder). Client encrypts the full credential via Seal → uploads encrypted blob to Walrus → stores blob reference on-chain in VaultIndex.
- **Read**: Fetch VaultIndex from chain → for each entry, fetch encrypted blob from Walrus → decrypt client-side via Seal → display in UI.
- **Update**: Decrypt existing → modify fields → re-encrypt → re-upload to Walrus (new blob ID) → update on-chain reference.
- **Delete**: Remove entry from on-chain VaultIndex. Optionally request Walrus blob deletion (if supported).

### F3: Client-Side Encryption via Seal

- All encryption uses Seal SDK with policies tied to the user's wallet address.
- Encryption policy: "only the wallet address that created this entry can decrypt it."
- Encrypt flow: `plaintext → Seal.encrypt(data, policy) → ciphertext blob`
- Decrypt flow: `ciphertext blob → Seal.decrypt(blob, wallet) → plaintext`
- **Never store or transmit plaintext.**

### F4: Walrus Blob Storage

- Encrypted credential blobs are stored on Walrus.
- Use Walrus HTTP Publisher API or SDK for upload/download.
- Store/retrieve by blob ID.
- Handle blob not found errors gracefully.

### F5: Password Generator

- Modal/popover accessible from the credential form.
- Options: length (8–64), uppercase, lowercase, numbers, symbols.
- One-click copy to clipboard.
- Auto-fill into the password field when generating from the form.
- Show password strength indicator (weak/medium/strong/very strong).

### F6: Search & Folder Organization

- **Search**: Client-side text search across decrypted credential labels/site names.
- **Folders**: User can create folders (e.g. "Work", "Personal", "Finance").
- Folder data stored as part of the vault index.
- Credentials can be assigned to a folder.
- Sidebar displays folder tree; clicking a folder filters the credential list.

---

## Move Smart Contract (Vault Policy)

The Move module manages vault ownership and entry metadata on-chain.

### Key Objects

```move
/// The user's vault — one per wallet address
struct Vault has key, store {
    id: UID,
    owner: address,
    entries: vector<EntryMeta>,
}

/// Metadata for a single credential entry (NO secrets)
struct EntryMeta has store, copy, drop {
    entry_id: vector<u8>,       // UUID bytes
    label: vector<u8>,          // site label (could be encrypted)
    walrus_blob_id: vector<u8>, // Walrus blob reference
    created_at: u64,
    updated_at: u64,
}
```

### Key Functions

```move
/// Create a new vault for the caller
public entry fun create_vault(ctx: &mut TxContext)

/// Add a credential entry reference to the vault
public entry fun add_entry(
    vault: &mut Vault,
    entry_id: vector<u8>,
    label: vector<u8>,
    walrus_blob_id: vector<u8>,
    ctx: &mut TxContext,
)

/// Update an existing entry's blob reference (after re-encryption)
public entry fun update_entry(
    vault: &mut Vault,
    entry_id: vector<u8>,
    new_label: vector<u8>,
    new_walrus_blob_id: vector<u8>,
    ctx: &mut TxContext,
)

/// Remove an entry from the vault
public entry fun remove_entry(
    vault: &mut Vault,
    entry_id: vector<u8>,
    ctx: &mut TxContext,
)
```

All mutating functions assert `tx_context::sender(ctx) == vault.owner`.

---

## User Flows

### Flow 1: First-Time User

1. User visits SealPass → sees landing page.
2. Clicks "Connect Wallet" → Sui wallet popup.
3. After connecting, app checks if a Vault object exists for this address on-chain.
4. If no vault → call `create_vault` transaction.
5. Redirect to `/vault` → empty state with "Add your first password" CTA.

### Flow 2: Add a Credential

1. User clicks "+ Add" → credential form opens.
2. Fills in site name, URL, username.
3. Either types a password or clicks "Generate" → password generator popover.
4. Optionally selects a folder, adds notes.
5. Clicks "Save":
   - Client serializes the credential to JSON.
   - Encrypts via Seal (policy: owner-only).
   - Uploads encrypted blob to Walrus → gets blob ID.
   - Sends Sui transaction: `add_entry(vault, id, label, blobId)`.
6. Entry appears in the vault list.

### Flow 3: View/Copy a Credential

1. User sees list of credentials (labels visible).
2. Clicks an entry → app fetches encrypted blob from Walrus.
3. Decrypts via Seal using connected wallet.
4. Shows username/password (masked by default).
5. Click to reveal, click to copy.

### Flow 4: Edit a Credential

1. From detail view, clicks "Edit."
2. Modifies fields → "Save."
3. Re-encrypt → upload new blob → update on-chain entry with new blob ID.

### Flow 5: Delete a Credential

1. From detail view or list, clicks "Delete" → confirmation dialog.
2. Sends `remove_entry` transaction on-chain.
3. Entry removed from vault list.

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_PACKAGE_ID=0x...        # Deployed Move package address
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...       # Seal package ID on testnet
```

---

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint check
sui move build        # Compile Move contracts (from /move directory)
sui client publish    # Deploy Move package to testnet
```

---

## Coding Conventions

- Use **functional components** with hooks only. No class components.
- File names: `kebab-case.tsx` for components, `camelCase.ts` for utils/hooks.
- Prefer `async/await` over `.then()` chains.
- All Sui/Walrus/Seal interactions go through `src/lib/` wrappers — components never call SDKs directly.
- Type everything. No `any`. Use `unknown` + type guards where needed.
- Error handling: wrap all blockchain/network calls in try-catch. Show toast notifications for errors (use shadcn `sonner` or `toast`).
- Keep components small. If a component exceeds ~150 lines, split it.
- All encryption must happen before data leaves the component calling the save action.

---

## Security Rules

1. **Never log, persist, or transmit plaintext credentials.** Not in console.log, not in localStorage, not in any network request.
2. **Never store decrypted vault data in Zustand across page navigations.** Decrypt on-demand, hold in local component state, clear on unmount.
3. **Always validate wallet ownership** before any write operation (enforced on-chain in Move, but also assert client-side).
4. **Clipboard writes** should be auto-cleared after 30 seconds.
5. **Session timeout**: if the wallet disconnects or the tab is inactive for 15 minutes, clear all in-memory decrypted data.

---

## Non-Goals (Out of MVP Scope)

- Social recovery / threshold decryption (future wow feature)
- Digital inheritance / dead man's switch (future wow feature)
- Time-locked sharing (future wow feature)
- Browser extension / autofill
- Mobile app
- Import/export from other password managers
- Multi-device sync (inherently handled by wallet + on-chain, but not explicitly designed for in MVP)
- Biometric auth
