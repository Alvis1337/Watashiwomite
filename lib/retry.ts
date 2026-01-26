/**
 * Retry utility for handling transient failures in API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, opts);

      // Call onRetry callback
      opts.onRetry(attempt, lastError);

      console.warn(
        `Retry attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry fetch requests with exponential backoff
 * @param url - URL to fetch
 * @param init - Fetch init options
 * @param options - Retry options
 * @returns Fetch Response
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, init);

    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Retry on server errors (5xx) and rate limits (429)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, options);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'network',
    'timeout',
    'rate limit',
  ];

  return retryableMessages.some(msg => error.message.toLowerCase().includes(msg.toLowerCase()));
}
