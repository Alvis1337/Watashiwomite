/**
 * Real tests for lib/rate-limiter.ts
 * Tests actual RateLimiter class and utilities
 */

import { rateLimiters, getClientIdentifier, rateLimitResponse, delay, rateLimitedFetch } from '@/lib/rate-limiter';

describe('Rate Limiter - REAL', () => {
  // Use fake timers for testing
  beforeEach(() => {
    jest.useFakeTimers();
    // Clear all rate limiters
    Object.values(rateLimiters).forEach(limiter => {
      limiter.reset('test-user');
      limiter.reset('global');
      limiter.reset('user1');
      limiter.reset('user2');
      limiter.reset('user3');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RateLimiter class', () => {
    it('should allow requests within limit', () => {
      const limiter = rateLimiters.api;
      limiter.reset('user1');
      
      // First requests should be allowed
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(true);
    });

    it('should block requests after limit exceeded', () => {
      const limiter = rateLimiters.oauth; // 10 requests per minute
      limiter.reset('user1');
      
      // Use up all 10 requests
      for (let i = 0; i < 10; i++) {
        expect(limiter.check('user1')).toBe(true);
      }
      
      // 11th request should be blocked
      expect(limiter.check('user1')).toBe(false);
    });

    it('should reset after time window', () => {
      const limiter = rateLimiters.oauth;
      limiter.reset('user1');
      
      // Use up limit
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1')).toBe(false);
      
      // Advance time past window (60 seconds)
      jest.advanceTimersByTime(61000);
      
      // Should be allowed again
      expect(limiter.check('user1')).toBe(true);
    });

    it('should track different users separately', () => {
      const limiter = rateLimiters.oauth;
      limiter.reset('user1');
      limiter.reset('user2');
      
      // Use up user1 limit
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1')).toBe(false);
      
      // user2 should still be allowed
      expect(limiter.check('user2')).toBe(true);
    });

    it('should return correct remaining count', () => {
      const limiter = rateLimiters.oauth; // 10 max
      limiter.reset('user1');
      
      expect(limiter.remaining('user1')).toBe(10);
      
      limiter.check('user1');
      expect(limiter.remaining('user1')).toBe(9);
      
      limiter.check('user1');
      expect(limiter.remaining('user1')).toBe(8);
    });

    it('should return 0 remaining when limit hit', () => {
      const limiter = rateLimiters.oauth;
      limiter.reset('user1');
      
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      
      expect(limiter.remaining('user1')).toBe(0);
    });

    it('should return resetIn time', () => {
      const limiter = rateLimiters.oauth; // 60000ms window
      limiter.reset('user1');
      
      limiter.check('user1');
      
      const resetTime = limiter.resetIn('user1');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });

    it('should return 0 for resetIn when no entry', () => {
      const limiter = rateLimiters.api;
      
      expect(limiter.resetIn('nonexistent')).toBe(0);
    });

    it('should reset specific user', () => {
      const limiter = rateLimiters.oauth;
      limiter.reset('user1');
      
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1')).toBe(false);
      
      limiter.reset('user1');
      
      expect(limiter.check('user1')).toBe(true);
    });

    it('should provide stats', () => {
      const limiter = rateLimiters.api;
      limiter.reset('user1');
      limiter.reset('user2');
      limiter.reset('user3');
      
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');
      
      const stats = limiter.stats();
      
      expect(stats.active).toBeGreaterThanOrEqual(3);
      expect(stats.identifiers).toContain('user1');
      expect(stats.identifiers).toContain('user2');
      expect(stats.identifiers).toContain('user3');
    });
  });

  describe('getClientIdentifier()', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockReq = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1, 10.0.0.1'),
        },
      } as unknown as Request;
      
      const identifier = getClientIdentifier(mockReq);
      
      expect(identifier).toBe('192.168.1.1');
    });

    it('should return unknown when no IP found', () => {
      const mockReq = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as Request;
      
      const identifier = getClientIdentifier(mockReq);
      
      expect(identifier).toBe('unknown');
    });

    it('should handle single IP in forwarded header', () => {
      const mockReq = {
        headers: {
          get: jest.fn().mockReturnValue('203.0.113.42'),
        },
      } as unknown as Request;
      
      const identifier = getClientIdentifier(mockReq);
      
      expect(identifier).toBe('203.0.113.42');
    });
  });

  describe('rateLimitResponse()', () => {
    it('should return correct headers', () => {
      const limiter = rateLimiters.api;
      limiter.reset('user1');
      
      limiter.check('user1');
      
      const headers = rateLimitResponse('user1', limiter);
      
      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should show decreasing remaining count', () => {
      const limiter = rateLimiters.oauth;
      limiter.reset('user1');
      
      limiter.check('user1');
      const headers1 = rateLimitResponse('user1', limiter);
      
      limiter.check('user1');
      const headers2 = rateLimitResponse('user1', limiter);
      
      expect(parseInt(headers2['X-RateLimit-Remaining'])).toBeLessThan(
        parseInt(headers1['X-RateLimit-Remaining'])
      );
    });
  });

  describe('delay()', () => {
    it('should wait for specified time', async () => {
      const promise = delay(1000);
      
      jest.advanceTimersByTime(1000);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('rateLimitedFetch()', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
    });

    it('should make fetch when not rate limited', async () => {
      const limiter = rateLimiters.tvdb;
      limiter.reset('global');
      
      await rateLimitedFetch('https://api.example.com', limiter);
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', undefined);
    });
  });

  describe('Predefined rate limiters', () => {
    it('should have api limiter with correct config', () => {
      expect(rateLimiters.api).toBeDefined();
      expect(rateLimiters.api.remaining('test')).toBeGreaterThan(0);
    });

    it('should have oauth limiter with correct config', () => {
      expect(rateLimiters.oauth).toBeDefined();
      rateLimiters.oauth.reset('test');
      expect(rateLimiters.oauth.remaining('test')).toBe(10);
    });

    it('should have tvdb limiter', () => {
      expect(rateLimiters.tvdb).toBeDefined();
      rateLimiters.tvdb.reset('test');
      expect(rateLimiters.tvdb.remaining('test')).toBe(50);
    });

    it('should have mal limiter', () => {
      expect(rateLimiters.mal).toBeDefined();
      rateLimiters.mal.reset('test');
      expect(rateLimiters.mal.remaining('test')).toBe(90);
    });

    it('should have sonarr limiter', () => {
      expect(rateLimiters.sonarr).toBeDefined();
      rateLimiters.sonarr.reset('test');
      expect(rateLimiters.sonarr.remaining('test')).toBe(100);
    });
  });
});
