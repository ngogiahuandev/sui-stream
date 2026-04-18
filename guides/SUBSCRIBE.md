# Subscribe/Follow Creator Guide

This guide covers the follow system where users can subscribe to creators and receive updates.

---

## Architecture Overview

```
User Wallet → Follow Transaction → Sui Contract
                                    ↓
                          Off-chain Indexer (follows table)
                                    ↓
                          Creator Profile → Subscriber Count
```

---

## 1. Smart Contract Changes

### Follow Object

```
- id: UID
- creator: address
- follower: address
- created_at: u64 (epoch)
```

Unique constraint: (creator, follower) — one follow per user per creator.

### Profile Object (Updated)

```
- address: address (key)
- username: string (unique)
- bio: string
- avatar_blob_id: string
- follower_count: u64
- following_count: u64
- created_at: u64
```

### Key Functions

```
- create_profile(username) — initialize profile
- follow_creator(creator) — follow a creator
- unfollow_creator(creator) — unfollow
- is_following(follower, creator) → bool
- get_follower_count(creator) → u64
```

### Events

```
- ProfileCreated(address, username, timestamp)
- Followed(follower, creator, timestamp)
- Unfollowed(follower, creator, timestamp)
```

---

## 2. Data Flow

### A. Create Profile

1. User first-time clicks "Set up profile"
2. Prompt for username (unique), bio, avatar
3. Build create_profile transaction
4. Execute sponsored transaction
5. Store profile in local state + query cache

### B. Follow Creator

1. User clicks "Follow" button on creator profile
2. Check wallet connection
3. Build follow_creator transaction
4. Execute sponsored transaction
5. Optimistic update: follower_count +1
6. Add to following list (local + indexer)

### C. Unfollow Creator

1. User clicks "Following" button (toggle off)
2. Build unfollow_creator transaction
3. Execute sponsored transaction
4. Optimistic update: follower_count -1

---

## 3. UI Components

### ProfileCard

- Avatar (from blob)
- Username
- Follower count
- Follow/Unfollow button

### FollowButton

- States: default, following, loading
- Optimistic toggle
- Shows "Follow" / "Following" / "Unfollow"

### FollowingList (off-chain)

```
GET /api/following?wallet=xxx
  → { creators[], cursor }

GET /api/followers?creator=xxx
  → { followers[], cursor }
```

---

## 4. Hook Design

```
useProfile(walletAddress)
  → { profile, isOwner, updateProfile() }

useFollow(creatorAddress)
  → { isFollowing, follow(), unfollow(), followerCount }
```

---

## 5. Best Practices

### Profile

- Username: 3-20 chars, alphanumeric + underscore
- Bio: max 150 chars
- Avatar: 256x256 recommended, stored on Walrus

### Follow

- Prevent self-follow
- One follow per (follower, creator)
- Optimistic updates

### Indexing

- Off-chain followers table for queries
- Trigger on events for sync
- Index on (creator, created_at) for feed

### UX

- Show "New uploads from creators you follow" in feed
- Notification on new upload (future: push)

### Security

- Sponsor all transactions
- Rate limit: 20 follows/min/wallet
- Validate username uniqueness before tx
