/**
 * Rate limiting utilities
 * Prevents API abuse and manages external API rate limits
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if identifier is rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @returns true if allowed, false if rate limited
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No entry or expired window - allow and create new entry
    if (!entry || now > entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Within window - check count
    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  remaining(identifier: string): number {
    const entry = this.limits.get(identifier);

    if (!entry || Date.now() > entry.resetAt) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get time until reset (in ms)
   */
  resetIn(identifier: string): number {
    const entry = this.limits.get(identifier);

    if (!entry) {
      return 0;
    }

    return Math.max(0, entry.resetAt - Date.now());
  }

  /**
   * Reset limit for identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.limits.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
    }
  }

  /**
   * Get statistics
   */
  stats(): { active: number; identifiers: string[] } {
    return {
      active: this.limits.size,
      identifiers: Array.from(this.limits.keys()),
    };
  }
}

// Rate limiters for different use cases
export const rateLimiters = {
  // API endpoint rate limiting (per IP)
  api: new RateLimiter(100, 60000), // 100 requests per minute

  // OAuth endpoints (stricter)
  oauth: new RateLimiter(10, 60000), // 10 requests per minute

  // External API rate limiting (global)
  tvdb: new RateLimiter(50, 1000), // 50 requests per second (TVDB limit)
  mal: new RateLimiter(90, 60000), // 90 requests per minute (MAL limit)
  sonarr: new RateLimiter(100, 60000), // 100 requests per minute (reasonable)
};

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // In production, use proper IP extraction considering proxies
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

/**
 * Rate limit middleware response helper
 */
export function rateLimitResponse(identifier: string, limiter: RateLimiter) {
  return {
    'X-RateLimit-Limit': limiter['maxRequests'].toString(),
    'X-RateLimit-Remaining': limiter.remaining(identifier).toString(),
    'X-RateLimit-Reset': new Date(Date.now() + limiter.resetIn(identifier)).toISOString(),
  };
}

/**
 * Simple delay function for rate limiting external APIs
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch wrapper for external APIs
 */
export async function rateLimitedFetch(
  url: string,
  limiter: RateLimiter,
  init?: RequestInit
): Promise<Response> {
  // Wait if rate limited
  let attempts = 0;
  while (!limiter.check('global')) {
    attempts++;
    if (attempts > 10) {
      throw new Error('Rate limit exceeded, too many retries');
    }
    const waitTime = limiter.resetIn('global');
    await delay(Math.min(waitTime, 1000)); // Wait max 1 second at a time
  }

  return fetch(url, init);
}

export default rateLimiters;
