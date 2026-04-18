# Video Resume (Continue Watching) Guide

This guide covers the resume feature allowing users to continue watching from where they left off.

---

## Architecture Overview

```
WatchHistory Entry → Resume Position → VideoPlayer
                                          ↓
                                Save progress on timeupdate
```

Resume position is stored as part of watch history.

---

## 1. Data Storage

### Resume Data Model

```typescript
interface ResumePosition {
  clipId: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAtMs: number;
}
```

### Storage Locations

1. **Client localStorage** — primary source (immediate)
2. **Off-chain indexer/API** — persistent across devices

### Keys

```
localStorage: 'sui-stream-watch-history'
API: POST /api/watch-history
```

---

## 2. Resume Logic

### On Clip Load

1. Fetch clip metadata (get duration)
2. Check watch history for clipId
3. If history exists with position > 0:
   - Option A: Auto-resume (default)
   - Option B: Show "Resume from X:XX" overlay

### Resume Overlay

```
┌─────────────────────────────┐
│  [▶ Continue watching]      │
│  from 0:30                │
│                             │
│  [Start from beginning]     │
└─────────────────────────────┘
```

- Timer: auto-dismiss after 5 seconds if no action
- Keyboard: 1 = continue, 2 = restart

### On Video Play

```
video.currentTime = savedPosition;
video.play();
```

---

## 3. Saving Progress

### TimeUpdate Handler

```typescript
const handleTimeUpdate = useCallback(
  (currentTime: number) => {
    if (!clipId || !duration) return;

    // Debounce: only save every 5 seconds
    setLastSaveTime((prev) => {
      if (now - prev < 5000) return prev;
      // Save to localStorage
      savePositionToLocal(clipId, currentTime);
      return now;
    });
  },
  [clipId, duration],
);
```

### Save Events

- Every 5 seconds during playback
- On pause
- On tab close (beforeunload)
- On navigation away
- When completion threshold crossed (>90%)

---

## 4. Hook Design

### useClipResume Hook

```typescript
interface UseClipResumeOptions {
  clipId: string;
  autoResume?: boolean;
}

interface UseClipResumeResult {
  resumePosition: number;
  shouldResume: boolean;
  savePosition: (seconds: number) => void;
  clearResume: () => void;
}

function useClipResume({
  clipId,
  autoResume = true,
}: UseClipResumeOptions): UseClipResumeResult;
```

### useWatchHistory Hook

```typescript
function useWatchHistory() {
  // Existing from WATCH_HISTORY.md
  // Provides: trackProgress(), getLastPosition()
}
```

---

## 5. UI Components

### ResumeOverlay

- Shows saved position time
- Continue button
- Start over button
- Countdown timer (auto-skip)

### Progress Indicator

- Saved position shown as progress bar fill (different color)
- Hover shows "Resume from X:XX"

### Settings Toggle

- "Auto-resume videos" toggle in settings
- Default: enabled

---

## 6. Best Practices

### Position Storage

- Use integer seconds (not float)
- Don't save on every timeupdate (debounce)
- Save on pause, close, completion
- Handle localStorage quota

### Resume UX

- Show clear prompt, not silent auto-resume
- Allow both options (restart or resume)
- Timeout auto-selection (default to continue)
- Visual indicator of saved position

### Edge Cases

- Clip duration changed (metadata update): cap at new duration
- No history: start from beginning
- Resume beyond duration: start from beginning
- Multiple devices: server wins for syncing

### Completion

- On >90% watched: clear resume position
- Consider video "completed"
- Don't show resume option for completed videos

### Privacy

- Watch history is private
- Resume position doesn't expose to others
- Clear option available
