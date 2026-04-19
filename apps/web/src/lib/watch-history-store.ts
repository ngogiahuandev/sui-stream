const STORAGE_KEY = 'suistream:watch-history';
const MAX_ENTRIES = 200;

export interface WatchHistoryRecord {
  clipId: string;
  lastWatchedAtMs: number;
}

function readAll(): WatchHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchHistoryRecord[];
  } catch {
    return [];
  }
}

function writeAll(entries: WatchHistoryRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded — silently drop
  }
}

export function getWatchHistory(): WatchHistoryRecord[] {
  return readAll();
}

export function addWatchHistoryEntry(clipId: string) {
  const entries = readAll();
  const now = Date.now();
  const existing = entries.findIndex((e) => e.clipId === clipId);
  if (existing !== -1) {
    entries[existing].lastWatchedAtMs = now;
  } else {
    entries.push({ clipId, lastWatchedAtMs: now });
  }
  entries.sort((a, b) => b.lastWatchedAtMs - a.lastWatchedAtMs);
  writeAll(entries.slice(0, MAX_ENTRIES));
}
