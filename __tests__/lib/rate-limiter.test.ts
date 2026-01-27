/**
 * Tests for Rate Limiter
 */

// Mock Date.now for time-based tests
let mockNow = Date.now();
jest.spyOn(Date, 'now').mockImplementation(() => mockNow);

class MockRateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  tryRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    mockNow = Date.now();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const limiter = new MockRateLimiter(5, 1000);

      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new MockRateLimiter(3, 1000);

      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(false); // Exceeded
    });

    it('should reset after time window', () => {
      const limiter = new MockRateLimiter(2, 1000);

      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(false);

      // Advance time by 1001ms
      mockNow += 1001;

      expect(limiter.tryRequest()).toBe(true); // Should work again
    });
  });

  describe('Remaining Requests', () => {
    it('should calculate remaining requests correctly', () => {
      const limiter = new MockRateLimiter(5, 1000);

      expect(limiter.getRemainingRequests()).toBe(5);
      limiter.tryRequest();
      expect(limiter.getRemainingRequests()).toBe(4);
      limiter.tryRequest();
      expect(limiter.getRemainingRequests()).toBe(3);
    });

    it('should never go negative', () => {
      const limiter = new MockRateLimiter(2, 1000);

      limiter.tryRequest();
      limiter.tryRequest();
      limiter.tryRequest(); // Over limit
      
      expect(limiter.getRemainingRequests()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Time Window Sliding', () => {
    it('should use sliding window', () => {
      const limiter = new MockRateLimiter(3, 1000);

      limiter.tryRequest(); // t=0
      mockNow += 200;
      limiter.tryRequest(); // t=200
      mockNow += 200;
      limiter.tryRequest(); // t=400
      
      expect(limiter.tryRequest()).toBe(false); // Still within window

      mockNow += 601; // t=1001, first request expired
      expect(limiter.tryRequest()).toBe(true); // Should work now
    });

    it('should handle rapid requests', () => {
      const limiter = new MockRateLimiter(100, 1000);

      for (let i = 0; i < 100; i++) {
        expect(limiter.tryRequest()).toBe(true);
      }
      expect(limiter.tryRequest()).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all requests', () => {
      const limiter = new MockRateLimiter(2, 1000);

      limiter.tryRequest();
      limiter.tryRequest();
      expect(limiter.tryRequest()).toBe(false);

      limiter.reset();
      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.getRemainingRequests()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max requests', () => {
      const limiter = new MockRateLimiter(0, 1000);
      
      expect(limiter.tryRequest()).toBe(false);
      expect(limiter.getRemainingRequests()).toBe(0);
    });

    it('should handle very small time window', () => {
      const limiter = new MockRateLimiter(5, 10);

      limiter.tryRequest();
      limiter.tryRequest();
      
      mockNow += 11;
      expect(limiter.tryRequest()).toBe(true);
    });

    it('should handle very large time window', () => {
      const limiter = new MockRateLimiter(1, 86400000); // 24 hours

      expect(limiter.tryRequest()).toBe(true);
      expect(limiter.tryRequest()).toBe(false);
      
      // Even after 1 hour, still blocked
      mockNow += 3600000;
      expect(limiter.tryRequest()).toBe(false);
    });
  });

  describe('Multiple Instances', () => {
    it('should track requests independently', () => {
      const limiter1 = new MockRateLimiter(2, 1000);
      const limiter2 = new MockRateLimiter(3, 1000);

      limiter1.tryRequest();
      limiter1.tryRequest();
      
      limiter2.tryRequest();
      limiter2.tryRequest();
      limiter2.tryRequest();

      expect(limiter1.tryRequest()).toBe(false);
      expect(limiter2.tryRequest()).toBe(false);
    });
  });
});
