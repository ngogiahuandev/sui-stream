# Like/Dislike (Vote) System Guide

This guide covers the vote system (like/upvote) for SuiStream clips. Replaces simple "like" with a bidirectional vote that allows users to express positive or negative sentiment.

---

## Architecture Overview

```
User Wallet → Vote Transaction → Sui Contract
                              ↓
                    Off-chain Indexer (votes table)
                              ↓
                    UI: Display upvote count + user vote state
```

---

## 1. Smart Contract Changes

### New Data Schema

**Vote Object:**

```
- id: UID
- clip_id: ID (reference to Clip)
- voter: address
- vote_type: u8 (1 = upvote, -1 = downvote)
- created_at: u64 (epoch)
```

**Updated Clip Object:**

```
- upvotes: u64 (new field, replaces/displaces likes)
- downvotes: u64 (new field)
- upvote_count: u64 (computed: upvotes - downvotes)
```

### Key Functions

```
- vote_clip(clip: &mut Clip, vote_type: u8) — cast/update vote
- remove_vote(clip: &mut Clip) — remove vote
- get_vote_status(clip_id, voter) → (vote_type | none)
```

### Events

```
- VoteCast(voter, clip_id, vote_type, timestamp)
- VoteRemoved(voter, clip_id, timestamp)
```

---

## 2. Data Flow

### A. User Casts Vote

1. User clicks upvote/downvote button
2. Client checks wallet connection
3. Build vote transaction with vote_type (+1 or -1)
4. Execute sponsored transaction
5. Update local state optimistically
6. Refetch to confirm on-chain state

### B. User Removes Vote

1. User clicks the same vote button again (toggle off)
2. Build remove_vote transaction
3. Execute sponsored transaction
4. Update local state

### C. Display Logic

- Show +1/-1 next to each button
- Show net vote count (upvotes - downvotes)
- Highlight active vote button (filled vs outline)

---

## 3. UI Components

### VoteButton

- Two buttons: upvote (↑), downvote (↓)
- States: default, hovered, active (user voted)
- Optimistic updates on click
- Debounce rapid clicks (500ms)

### VoteDisplay

- Net count: `(upvotes - downvotes)`
- Show "+1.2K" format for large numbers

---

## 4. Hook Design

```
useVote(clipId, initialUpvotes, initialDownvotes)
  → { upvote(), downvote(), removeVote(), isUpvoted, isDownvoted, netVotes }
```

---

## 5. Best Practices

### UX

- Immediate visual feedback (optimistic)
- Disable button while tx pending
- Handle errors with toast
- Debounce rapid clicks

### Smart Contract

- One vote per (voter, clip) — upsert on repeat vote
- Emit events for indexer
- Validate vote_type is +1 or -1 only

### Security

- Use sponsored transactions
- Verify sender matches wallet
- Rate limit vote operations (max 10/min/wallet)

### Analytics

- Track vote events for recommendations
- Store votes in off-chain indexer for query performance
