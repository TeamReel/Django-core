/**
 * Retry with Exponential Backoff and Jitter
 *
 * Implements exponential backoff retry logic with jitter to prevent
 * thundering herd problem.
 *
 * Strategy:
 * - Retry delays: 1s, 2s, 4s (exponential: 2^attempt * baseDelay)
 * - Max retries: 3 (default)
 * - Jitter: ±20% random variation to prevent synchronized retries
 * - Skip retry for client errors (4xx) except 429 (rate limit)
 */

import { ApiError } from '@/context/apiClient';

export interface RetryOptions {
  maxRetries?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms (1 second)
  jitterPercent?: number; // Default: 0.2 (±20%)
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

/**
 * Add jitter to delay to prevent thundering herd
 *
 * @param delay Base delay in milliseconds
 * @param jitterPercent Jitter percentage (0.2 = ±20%)
 * @returns Delay with jitter applied
 */
function addJitter(delay: number, jitterPercent: number): number {
  const jitter = delay * jitterPercent;
  const randomOffset = (Math.random() * 2 - 1) * jitter; // Random value between -jitter and +jitter
  return Math.round(delay + randomOffset);
}

/**
 * Check if error should be retried
 *
 * @param error Error object
 * @returns True if error should be retried
 */
function shouldRetryError(error: Error): boolean {
  const apiError = error as ApiError;

  // No status code - likely network error, retry
  if (!apiError.status) {
    return true;
  }

  // Retry server errors (5xx) and rate limit (429)
  // Don't retry client errors (4xx) except 429
  return apiError.status >= 500 || apiError.status === 429;
}

/**
 * Execute async function with exponential backoff retry
 *
 * @param fn Async function to execute
 * @param options Retry configuration options
 * @returns Promise resolving to function result
 * @throws Last error if all retries exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    jitterPercent = 0.2,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error should be retried
      if (!shouldRetryError(lastError)) {
        console.log(`[F04] Error not retryable, throwing immediately:`, lastError);
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.log(`[F04] Max retries (${maxRetries}) exhausted`);
        break;
      }

      // Calculate exponential backoff delay: 1s, 2s, 4s
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const delayWithJitter = addJitter(exponentialDelay, jitterPercent);

      console.log(
        `[F04] Retry attempt ${attempt + 1}/${maxRetries} after ${delayWithJitter}ms (base: ${exponentialDelay}ms)`
      );

      // Call optional retry callback for observability
      if (onRetry) {
        onRetry(attempt + 1, delayWithJitter, lastError);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayWithJitter));
    }
  }

  // All retries exhausted, throw last error
  throw lastError;
}

/**
 * Convenience wrapper for retrying fetch operations
 *
 * @param fn Async fetch function
 * @param context Context for logging (e.g., "fetch_notifications")
 * @returns Promise resolving to fetch result
 */
export async function retryFetch<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 1000,
    jitterPercent: 0.2,
    onRetry: (attempt, delay, error) => {
      console.warn(`[F04] ${context}: Retry ${attempt}/3 after ${delay}ms`, error);
    },
  });
}
