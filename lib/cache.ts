import type { WebsiteAnalysis } from "./analysis-types";

const TTL = 300_000; // 5 minutes
const MAX_ENTRIES = 50;

type CacheEntry = { data: WebsiteAnalysis; timestamp: number };

const store = new Map<string, CacheEntry>();

export function getCached(url: string): WebsiteAnalysis | null {
  const entry = store.get(url);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) {
    store.delete(url);
    return null;
  }
  return entry.data;
}

export function setCache(url: string, data: WebsiteAnalysis): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict oldest entry
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of store) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(url, { data, timestamp: Date.now() });
}
