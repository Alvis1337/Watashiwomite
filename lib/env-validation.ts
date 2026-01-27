import { z } from 'zod';

/**
 * Schema for required environment variables
 */
const envSchema = z.object({
  // Database
  POSTGRES_PRISMA_URL: z.string().url('Invalid PostgreSQL Prisma URL'),
  POSTGRES_URL_NON_POOLING: z.string().url('Invalid PostgreSQL non-pooling URL'),

  // MyAnimeList OAuth (optional - can be configured in app settings)
  MAL_CLIENT_ID: z.string().optional(),
  MAL_CLIENT_SECRET: z.string().optional(),
  MAL_REDIRECT_URI: z.string().url('Invalid MAL redirect URI').optional(),

  // Sonarr (optional - can be configured in app settings)
  SONARR_API_KEY: z.string().optional(),
  SONARR_URL: z.string().url('Invalid Sonarr URL').optional(),

  // TVDB (optional - can be configured in app settings)
  TVDBID_API_KEY: z.string().optional(),

  // Optional but recommended
  NEXT_PUBLIC_BASE_URL: z.string().url('Invalid base URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the schema
 * @returns Parsed and validated environment object
 * @throws ZodError if validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => `  - ${err.path.join('.')}: ${err.message}`);
      console.error('❌ Environment variable validation failed:\n' + missingVars.join('\n'));
      throw new Error('Invalid environment configuration. Check your .env file.');
    }
    throw error;
  }
}

/**
 * Gets a validated environment variable
 * Type-safe access to environment variables
 */
export function getEnv(): Env {
  return validateEnv();
}

/**
 * Run validation on startup
 * Call this in your app initialization
 */
export function runStartupValidation(): void {

  try {
    const env = validateEnv();

    // Warn about optional variables
    if (!env.NEXT_PUBLIC_BASE_URL) {
      console.warn('⚠️  NEXT_PUBLIC_BASE_URL is not set (optional but recommended)');
    }

    if (!env.NODE_ENV) {
      console.warn('⚠️  NODE_ENV is not set (optional, defaults to development)');
    }
  } catch (error) {
    console.error('💥 Environment validation failed. Application cannot start.');
    throw error;
  }
}
