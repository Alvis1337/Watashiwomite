import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    cache.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should handle different value types', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);
      cache.set('boolean', true);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('boolean')).toBe(true);
    });

    it('should check if key exists', () => {
      cache.set('exists', 'value');
      
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });

    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');

      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cache.set('expires', 'value', 1000); // 1 second TTL

      expect(cache.get('expires')).toBe('value');

      // Advance time by 500ms - should still exist
      jest.advanceTimersByTime(500);
      expect(cache.get('expires')).toBe('value');

      // Advance time by another 600ms - should be expired
      jest.advanceTimersByTime(600);
      expect(cache.get('expires')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cache.set('default', 'value'); // Uses default 10 minutes

      // Should still exist after 5 minutes
      jest.advanceTimersByTime(300000);
      expect(cache.get('default')).toBe('value');

      // Should be expired after 11 minutes
      jest.advanceTimersByTime(360000);
      expect(cache.get('default')).toBeNull();
    });

    it('should handle custom TTL per entry', () => {
      cache.set('short', 'value1', 1000); // 1 second
      cache.set('long', 'value2', 5000); // 5 seconds

      jest.advanceTimersByTime(2000); // 2 seconds

      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBe('value2');

      jest.advanceTimersByTime(4000); // 4 more seconds (6 total)

      expect(cache.get('long')).toBeNull();
    });

    it('should handle has() with expired entries', () => {
      cache.set('expires', 'value', 1000);

      expect(cache.has('expires')).toBe(true);

      jest.advanceTimersByTime(2000);

      expect(cache.has('expires')).toBe(false);
    });
  });

  describe('Stats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.stats();

      expect(stats.size).toBe(3);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.keys).toContain('key3');
    });

    it('should update stats after deletions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');

      const stats = cache.stats();

      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('key2');
      expect(stats.keys).not.toContain('key1');
    });
  });

  describe('getOrSet()', () => {
    it('should fetch and cache on first call', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fetched value');

      const result = await cache.getOrSet('key', fetchFn);

      expect(result).toBe('fetched value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.get('key')).toBe('fetched value');
    });

    it('should return cached value on subsequent calls', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fetched value');

      const result1 = await cache.getOrSet('key', fetchFn);
      const result2 = await cache.getOrSet('key', fetchFn);
      const result3 = await cache.getOrSet('key', fetchFn);

      expect(result1).toBe('fetched value');
      expect(result2).toBe('fetched value');
      expect(result3).toBe('fetched value');
      expect(fetchFn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should refetch after TTL expires', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2');

      const result1 = await cache.getOrSet('key', fetchFn, 1000);
      expect(result1).toBe('value1');

      jest.advanceTimersByTime(2000); // Expire the cache

      const result2 = await cache.getOrSet('key', fetchFn, 1000);
      expect(result2).toBe('value2');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should handle async errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cache.getOrSet('key', fetchFn)).rejects.toThrow('Fetch failed');
      expect(cache.get('key')).toBeNull();
    });
  });

  describe('CacheKeys', () => {
    it('should generate correct cache keys', () => {
      expect(CacheKeys.tvdbToken()).toBe('tvdb:token');
      expect(CacheKeys.malAnimeList('testuser')).toBe('mal:animelist:testuser');
      expect(CacheKeys.sonarrSeries('testuser')).toBe('sonarr:series:testuser');
      expect(CacheKeys.sonarrRootFolders()).toBe('sonarr:rootfolders');
      expect(CacheKeys.tvdbSearch('Attack on Titan')).toBe('tvdb:search:Attack%20on%20Titan');
    });

    it('should encode special characters in search queries', () => {
      expect(CacheKeys.tvdbSearch('One Piece: Film Red')).toBe(
        'tvdb:search:One%20Piece%3A%20Film%20Red'
      );
    });
  });

  describe('CacheTTL', () => {
    it('should define appropriate TTL values', () => {
      expect(CacheTTL.tvdbToken).toBe(3600000); // 1 hour
      expect(CacheTTL.malAnimeList).toBe(600000); // 10 minutes
      expect(CacheTTL.sonarrSeries).toBe(300000); // 5 minutes
      expect(CacheTTL.sonarrRootFolders).toBe(3600000); // 1 hour
      expect(CacheTTL.tvdbSearch).toBe(86400000); // 24 hours
    });
  });

  describe('cleanup()', () => {
    it('should remove expired entries', () => {
      cache.set('short1', 'value1', 1000);
      cache.set('short2', 'value2', 1000);
      cache.set('long', 'value3', 10000);

      jest.advanceTimersByTime(2000); // Expire short TTL entries

      cache.cleanup();

      expect(cache.get('short1')).toBeNull();
      expect(cache.get('short2')).toBeNull();
      expect(cache.get('long')).toBe('value3');
    });

    it('should not remove non-expired entries', () => {
      cache.set('key1', 'value1', 5000);
      cache.set('key2', 'value2', 5000);

      jest.advanceTimersByTime(2000); // Not enough to expire

      cache.cleanup();

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should handle empty cache', () => {
      cache.clear();
      expect(() => cache.cleanup()).not.toThrow();
    });

    it('should handle cache with no expired entries', () => {
      cache.set('key1', 'value1', 10000);
      cache.cleanup();
      expect(cache.get('key1')).toBe('value1');
    });
  });
});
