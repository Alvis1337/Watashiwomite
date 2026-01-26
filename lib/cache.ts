/**
 * Simple in-memory cache with TTL (Time To Live)
 * For production, consider Redis or similar distributed cache
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 600000) {
    // 10 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTLMs;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
    }
  }

  /**
   * Get or set pattern - fetch if not in cache
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttlMs);

    return value;
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  tvdbToken: () => 'tvdb:token',
  malAnimeList: (username: string) => `mal:animelist:${username}`,
  sonarrSeries: (username: string) => `sonarr:series:${username}`,
  sonarrRootFolders: () => 'sonarr:rootfolders',
  tvdbSearch: (query: string) => `tvdb:search:${encodeURIComponent(query)}`,
};

// Cache TTLs (in milliseconds)
export const CacheTTL = {
  tvdbToken: 3600000, // 1 hour (TVDB tokens expire after 24h, refresh hourly)
  malAnimeList: 600000, // 10 minutes
  sonarrSeries: 300000, // 5 minutes
  sonarrRootFolders: 3600000, // 1 hour (rarely changes)
  tvdbSearch: 86400000, // 24 hours (search results stable)
};

export default cache;
