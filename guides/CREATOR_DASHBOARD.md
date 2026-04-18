# Creator Dashboard Guide

This guide covers the creator analytics dashboard showing views, watch time, and earnings for SuiStream clips.

---

## Architecture Overview

```
Sui Events → Indexer/Aggregator → Dashboard UI
                     ↓
            Views | Watch Time | Earnings
```

Data is aggregated from smart contract events and stored in off-chain indexer for querying.

---

## 1. Metrics Tracked

### Views

- Total views per clip
- Unique views (wallet-based dedupe)
- Views over time (daily/weekly)

### Watch Time

- Total watch time per clip (seconds)
- Average watch time per view
- Watch time by percentage (0-25%, 25-50%, 50-75%, 75-100%)
- Total creator watch time (sum across clips)

### Earnings (Future)

- Revenue per clip
- Ad revenue vs tips
- Total earnings
- Payout history

---

## 2. Data Aggregation

### Event Collection

```
Subscribe to events:
- ClipCreated (clip_id, creator, timestamp)
- ClipViewed (clip_id, viewer, watch_duration)
- VoteCast (clip_id, voter, vote_type)
- (Future) TipSent (clip_id, sender, amount)
```

### Indexing

```
API: POST /api/analytics/ingest
  → Aggregate events into stats

Tables:
- clip_stats (clip_id, views, watch_time, votes, earnings)
- creator_stats (creator, total_views, total_watch_time, total_earnings)
- daily_stats (date, views, watch_time)
```

---

## 3. Dashboard UI

### Overview Tab

```
┌─────────────────────────────┐
│  Views      Watch Time  │
│  12,450    8h 23m    │
│                             │
│  ┌─────────────────┐    │
│  │ Views Chart    │    │
│  │ (last 30 days) │    │
│  └─────────────────┘    │
│                             │
│  ┌─────────────────┐    │
│  │ Watch Time    │    │
│  │ Chart       │    │
│  └─────────────────┘    │
└─────────────────────────────┘
```

### Clips Tab

```
┌─────────────────────────────┐
│  Your Clips              │
├─────────────────────────────────│
│ Video │ Views │ Watch │ Earns │
│ ─────────────────────────  │
│ ▶ A   │ 1,200│ 45m   │ $12   │
│ ▶ B   │ 890  │ 32m   │ $8    │
│ ▶ C   │ 650  │ 18m   │ $0    │
└─────────────────────────────────│
```

### Earnings Tab (Future)

```
┌─────────────────────────────┐
│  Balance: $24.50           │
│                             │
│  This Month: $12.00         │
│  Pending: $4.50             │
│                             │
│  [Request Payout]           │
└─────────────────────────────┘
```

---

## 4. API Endpoints

### Dashboard Data

```
GET /api/creator/stats?creator=xxx&period=30d
  → {
      totalViews,
      totalWatchTimeSeconds,
      totalEarnings,
      dailyStats: [{ date, views, watchTime }],
      clips: [{ id, title, views, watchTime, earnings }]
    }
```

### Clip-Level Stats

```
GET /api/clip/[id]/stats
  → {
      views,
      uniqueViewers,
      totalWatchTime,
      avgWatchTime,
      watchDistribution, // 0-25%, 25-50%, etc.
      votes
    }
```

---

## 5. Hook Design

```typescript
useCreatorStats(period?: '7d' | '30d' | 'all')
  → {
      stats: { views, watchTime, earnings },
      dailyChart: [{ date, views, watchTime }],
      isLoading,
      refetch
    }

useClipStats(clipId: string)
  → {
      stats: { views, uniqueViewers, avgWatchTime },
      watchDistribution,
      isLoading
    }
```

---

## 6. Best Practices

### Charting

- Show last 7/30 days by default
- Tooltip on hover
- Responsive (mobile-friendly)
- Color-coded by metric

### Performance

- Cache stats (5 min TTL)
- Lazy load per-clip stats
- Paginate clip list

### Privacy

- Don't expose wallet addresses in public profile stats
- Creator sees own stats only (authenticated)
- Aggregate vs individual data

### Monetization (Future)

- Track tips/earnings per clip
- Minimum payout threshold
- Payment method integration

### Best Practices

- Real-time-ish (events processed within minutes)
- Accurate deduplication (wallet-based)
- Handle deleted clips gracefully
