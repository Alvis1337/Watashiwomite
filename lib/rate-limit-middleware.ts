import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIdentifier, rateLimitResponse } from './rate-limiter';

/**
 * Rate limiting middleware for API routes
 * Usage: wrap your API handler with this function
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiterType: 'api' | 'oauth' = 'api'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const limiter = rateLimiters[limiterType];
    const identifier = getClientIdentifier(req);

    // Check rate limit
    if (!limiter.check(identifier)) {
      const headers = rateLimitResponse(identifier, limiter);
      const resetIn = limiter.resetIn(identifier);

      return NextResponse.json(
        {
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(resetIn / 1000), // seconds
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil(resetIn / 1000).toString(),
          },
        }
      );
    }

    // Execute handler
    const response = await handler(req);

    // Add rate limit headers to response
    const headers = rateLimitResponse(identifier, limiter);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Simple rate limit check for use in route handlers
 * Returns error response if rate limited, null if allowed
 */
export function checkRateLimit(
  req: NextRequest,
  limiterType: 'api' | 'oauth' = 'api'
): NextResponse | null {
  const limiter = rateLimiters[limiterType];
  const identifier = getClientIdentifier(req);

  if (!limiter.check(identifier)) {
    const headers = rateLimitResponse(identifier, limiter);
    const resetIn = limiter.resetIn(identifier);

    return NextResponse.json(
      {
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': Math.ceil(resetIn / 1000).toString(),
        },
      }
    );
  }

  return null;
}
