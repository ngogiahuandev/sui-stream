# Watch History Guide

This guide covers tracking and displaying user watch history for SuiStream clips.

---

## Architecture Overview

```
Watch Clip → Track Progress → Local Storage
                            ↘ Off-chain (indexer)
                            ↘ Display History Page
```

Watch history is stored client-side first (localStorage) with optional off-chain sync.

---

## 1. Data Schema

### WatchHistoryEntry (Client)

```
interface WatchHistoryEntry {
  clipId: string;
  lastPositionSeconds: number;
  totalWatchedSeconds: number;
  completed: boolean; // watched >90%
  lastWatchedAtMs: number;
}
```

### WatchHistoryStats (Off-chain / API)

```
GET /api/watch-history?wallet=xxx
  → { entries[], limit, cursor }
```

---

## 2. Local Storage Strategy

### Storage Key

```
localStorage key: 'sui-stream-watch-history'
```

### Structure

```typescript
const watchHistory: Record<string, WatchHistoryEntry> = {
  "clip-id-1": {
    lastPosition: 30,
    totalWatched: 45,
    completed: false,
    lastWatchedAtMs: 1234567890,
  },
  "clip-id-2": {
    lastPosition: 58,
    totalWatched: 58,
    completed: true,
    lastWatchedAtMs: 1234567891,
  },
};
```

### Sync with Server

- On load: fetch merged history from server
- On watch: debounce save to server (every 30 seconds or on pause)
- On completion: immediate sync

---

## 3. Data Flow

### A. Track Watch Progress

1. Video plays → onTimeUpdate fires
2. Update local storage (immediate)
3. Update totalWatchedSeconds += delta
4. Check completion threshold (>90% watched)
5. Trigger sync if significant change (10+ sec new watch time)

### B. Resume from History

1. User clicks clip from history
2. Fetch clip → open player
3. Seek to lastPositionSeconds from history
4. Auto-resume playback

### C. Clear History

1. User clicks "Clear watch history"
2. Confirm dialog
3. Clear localStorage + API
4. Refresh UI

---

## 4. UI Components

### WatchHistoryPage

- List of watched clips (most recent first)
- Sort by: recent / most watched
- Filter by: completed / in-progress

### HistoryCard

- Thumbnail
- Title
- Progress bar (percentage watched)
- Last watched date
- Resume button

---

## 5. Hook Design

```
useWatchHistory()
  → {
      entries,
      trackProgress(clipId, seconds, duration),
      getLastPosition(clipId): number,
      clearHistory(),
      isLoaded
    }
```

### useClipResume Hook

```
useClipResume(clipId)
  → { lastPositionSeconds, shouldResume, onWatched(savePosition) }
```

- Checks local + server history
- Returns lastPosition to seek to

---

## 6. Best Practices

### Tracking

- Debounce updates (every 5 seconds during playback)
- Don't track seek events (only real watch time)
- Track completion when >90% watched

### Storage

- Limit local history to 500 clips (LRU eviction)
- Serialize with JSON, parse on read
- Handle localStorage quota exceeded

### Sync

- Sync on app load
- Sync on pause / close tab
- Sync on completion (marked completed)
- Conflict resolution: server wins for position, union for completions

### UX

- Auto-resume from last position
- Show progress indicator on cards
- "Continue watching" section on home
- Clear history option in settings

### Privacy

- Watch history is private (not visible to others)
- Stored client-side, optional sync
- Clear history option always available
