import { z } from 'zod';

/**
 * API Request Validation Schemas
 * Used to validate incoming API requests with Zod
 */

// Auth schemas
export const authCheckSchema = z.object({
  // No params needed for auth check
});

// OAuth schemas
export const oauthStep1Schema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
});

export const oauthStep2Schema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  username: z.string().min(1, 'Username is required'),
});

// MAL schemas
export const malAnimeListSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
});

// Sonarr schemas
export const sonarrSyncSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
});

export const sonarrDatabaseSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
});

// Sync schemas
export const syncDiffSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
  diff: z.enum(['true', 'false']).optional(),
});

/**
 * Query parameter schemas
 */
export const usernameQuerySchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

export const diffQuerySchema = z.object({
  username: z.string().min(1, 'Username is required'),
  diff: z.string().optional(),
});

/**
 * Helper to validate query parameters from NextRequest
 * @param searchParams - URLSearchParams from NextRequest
 * @param schema - Zod schema to validate against
 * @returns Validated data or throws ZodError
 */
export function validateQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

/**
 * Helper to validate request body
 * @param body - Request body object
 * @param schema - Zod schema to validate against
 * @returns Validated data or throws ZodError
 */
export function validateRequestBody<T extends z.ZodType>(body: unknown, schema: T): z.infer<T> {
  return schema.parse(body);
}

/**
 * Helper to create error response from Zod validation error
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}
