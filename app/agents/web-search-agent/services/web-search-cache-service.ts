import { WebSearchResponse } from '../types';

interface CacheEntry {
  response: WebSearchResponse;
  timestamp: number;
  expiresAt: number;
}

export class WebSearchCacheService {
  private static TTL = 3600 * 1000; // 1 hour in milliseconds
  private static MAX_ENTRIES = 100;
  private cache: Map<string, CacheEntry>;

  constructor() {
    this.cache = new Map();
  }

  private generateCacheKey(query: string, settings?: Record<string, any>): string {
    const settingsStr = settings ? JSON.stringify(settings) : '';
    return `${query}:${settingsStr}`;
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    Array.from(this.cache.keys()).forEach(key => {
      const entry = this.cache.get(key);
      if (entry && entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    });
  }

  private enforceMaxEntries() {
    if (this.cache.size > WebSearchCacheService.MAX_ENTRIES) {
      // Remove oldest entries first
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = entries.slice(0, entries.length - WebSearchCacheService.MAX_ENTRIES);
      entriesToRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  public set(query: string, response: WebSearchResponse, settings?: Record<string, any>): void {
    this.cleanupExpiredEntries();

    const key = this.generateCacheKey(query, settings);
    const now = Date.now();
    
    this.cache.set(key, {
      response,
      timestamp: now,
      expiresAt: now + WebSearchCacheService.TTL
    });

    this.enforceMaxEntries();
  }

  public get(query: string, settings?: Record<string, any>): WebSearchResponse | null {
    this.cleanupExpiredEntries();

    const key = this.generateCacheKey(query, settings);
    const entry = this.cache.get(key);

    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    return entry.response;
  }

  public clear(): void {
    this.cache.clear();
  }

  public getCacheStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    this.cleanupExpiredEntries();

    let oldestTimestamp = Infinity;
    let newestTimestamp = -Infinity;

    Array.from(this.cache.values()).forEach(entry => {
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    });

    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp === Infinity ? null : oldestTimestamp,
      newestEntry: newestTimestamp === -Infinity ? null : newestTimestamp
    };
  }
} 