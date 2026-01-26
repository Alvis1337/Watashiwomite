import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from './rate-limit-middleware';
import { formatZodError } from './validation-schemas';

/**
 * Standard API response wrapper
 * Ensures consistent response format across all endpoints
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, message?: string): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
  });
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  error?: string
): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(error && { error }),
    },
    { status }
  );
}

/**
 * Wrapper for API handlers with common middleware
 * - Rate limiting
 * - Error handling
 * - Validation
 */
export function withAPIMiddleware<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse<APIResponse<T>>>,
  options: {
    rateLimit?: boolean;
    rateLimitType?: 'api' | 'oauth';
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse<APIResponse<T>>> => {
    try {
      // Rate limiting
      if (options.rateLimit !== false) {
        const rateLimitResult = checkRateLimit(req, options.rateLimitType);
        if (rateLimitResult) {
          return rateLimitResult as NextResponse<APIResponse<T>>;
        }
      }

      // Execute handler
      return await handler(req);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return errorResponse('Validation error', 400, formatZodError(error));
      }

      // Handle general errors
      console.error('API error:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return errorResponse(message, 500);
    }
  };
}

/**
 * Helper to safely parse JSON body
 */
export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
