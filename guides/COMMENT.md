# Comments & Threaded Replies Guide

This guide covers the comment system with threaded replies for SuiStream clips.

---

## Architecture Overview

```
Clip → Comments (ordered by time)
     ↘ Comment (has parent_id)
         ↘ Reply (parent_id = comment.id)
              ↘ Nested Reply (parent_id = reply.id)
```

Comments are stored off-chain in an indexer/DB for query performance. On-chain storage is too expensive for comment text.

---

## 1. Data Schema

### Comment Table (Off-chain)

```
- id: string (ULID)
- clip_id: string (indexed)
- author_wallet: string
- parent_id: string | null (null = top-level)
- content: string (max 500 chars)
- created_at_ms: number
- updated_at_ms: number
```

Index on `(clip_id, created_at_ms)` for efficient listing.

### Key Functions (Off-chain API)

```
POST /api/comments
  → { clipId, content, parentId? }

GET /api/comments?clipId=xxx&limit=20&cursor=xxx
  → { comments[], nextCursor }

DELETE /api/comments/:id
  → (owner only, soft delete)
```

---

## 2. Smart Contract (Optional On-Chain)

For on-chain comments (if needed):

```
Comment object:
- id: UID
- clip_id: ID
- author: address
- parent_id: IDs (nullable for threading)
- content: string (max 500)
- created_at: u64
```

---

## 3. Reply Threading

### Nesting Structure

- Top-level comments: parent_id = null
- Direct replies: parent_id = comment.id
- Nested replies: parent_id = another reply.id (max 2 levels deep)

### Display

- Show top-level comments sorted by recent
- Indent replies with visual hierarchy
- "N replies" link to expand thread

### Collapse/Expand

- Default: show max 3 top-level comments
- "Show more comments" loads next batch
- "View replies" expands individual threads

---

## 4. UX & Interactions

### Comment Input

- Logged-in users only
- Multi-line with character count (500 max)
- Placeholder: "Add a comment..."

### Reply Input

- Inline reply form under parent comment
- Cancel/Submit buttons
- Auto-focus on open

### Actions

- Delete: owner only (soft delete, shows "[deleted]")
- Report: flag for moderation (future)

---

## 5. Hook Design

```
useComments(clipId)
  → { comments, isLoading, error, addComment(), addReply(), deleteComment() }
```

---

## 6. Best Practices

### Performance

- Paginate comments (20 at a time)
- Lazy load replies (expand on click)
- Cache comments in React Query
- Index on (clip_id, created_at_ms)

### Validation

- Content: 1-500 characters, trim whitespace
- No empty submissions
- Rate limit: 10 comments/min/wallet

### Moderation

- Auto-filter obvious spam (server-side)
- Soft delete for owner
- Future: report + mod queue

### Security

- Verify wallet matches author for delete
- Sanitize HTML in content (text only)
- No user mentions in comment text (privacy)

### Gas

- All comment operations sponsored
- On-chain comments: batched in future
- Off-chain comments: no gas
