# Recommended Videos Guide

This guide covers the recommendation algorithm for SuiStream clips. Uses tag-based and view-based signals.

---

## Architecture Overview

```
Clips Query → Score by tags/views/history
             → Sort by score
             → Display as recommended
```

Recommendation is computed server-side from indexer data.

---

## 1. Recommendation Signals

### A. Tag-Based Similarity

```
For current clip with tags: [tag1, tag2, tag3]

Find clips that share tags:
- 3/3 match: score = 100
- 2/3 match: score = 60
- 1/3 match: score = 20
- 0/3 match: score = 0
```

### B. View-Based Popularity

```
Base score: log2(views + 1) * 10

Recent boost (clips created in last 7 days):
- day 0: +20
- day 1: +15
- day 2: +12
- day 3-7: linear decay
```

### C. Watch History Affinity

```
If user has watched clips by creator X:
- +10 score for other clips by creator X
- +5 score for clips with same tags as watched
```

### D. Following Boost

```
If user follows creator X:
- +15 score for creator X's uploads
```

---

## 2. Scoring Algorithm

### Composite Score

```typescript
function computeScore(clip, userContext) {
  let score = 0;

  // Tag similarity
  score += tagSimilarityScore(clip.tags, currentClipTags);

  // View-based
  score += viewBasedScore(clip.views, clip.createdAtMs);

  // Watch history (if logged in)
  if (userContext?.history) {
    score += historyAffinityScore(clip, userContext.history);
  }

  // Following (if logged in)
  if (userContext?.following) {
    score += followingBoost(clip.creator, userContext.following);
  }

  // Recency boost
  score += recencyBoost(clip.createdAtMs);

  return score;
}
```

### Ranking

- Sort by score descending
- Dedupe: exclude current clip
- Exclude user's own clips (optional)

---

## 3. API Endpoint

### Request

```
GET /api/recommendations
  ?currentClipId=xxx
  &limit=20
  &cursor=xxx
```

### Response

```json
{
  "clips": [
    {
      "id": "clip-xxx",
      "score": 85,
      "reason": "tag_match|popular|following|history"
    }
  ],
  "nextCursor": "..."
}
```

### Reason Attribution

- `tag_match`: shares tags with current video
- `popular`: high view count
- `following`: follows the creator
- `history`: watched similar content
- `recent`: newly uploaded

---

## 4. UI Display

### "Recommended for You"

- Show on discover page
- Score + reason shown on hover (debug)

### "More from [Creator]"

- When viewing a clip, show more from same creator
- Query by creator address, exclude current clip

### "Trending Now"

- Sort by view-based score only
- Time-weighted recent views (last 24h)

---

## 5. Implementation

### Server-Side (API Route)

- Aggregate scores from indexer queries
- Cache results (5 min TTL)
- Return paginated list

### Client-Side (Hook)

```
useRecommendations(clipId, limit?)
  → { clips, isLoading, refetch }
```

---

## 6. Best Practices

### Performance

- Pre-compute top clips daily (batch job)
- Cache recommendations per clip
- Paginate with cursor

### Relevance

- Exclude current clip from recommendations
- Exclude muted/removed clips
- Weight recent content higher

### Diversity

- Max 3 clips from same creator in top 20
- Mix category tags in results

### Cold Start (No History)

- Show trending (view-based)
- Show recent (time-based)
- No personalized signals

### Logging

- Log recommendation impressions
- Track click-through rate
- Iterate on weights based on data
