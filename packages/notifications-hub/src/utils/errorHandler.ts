/**
 * Error Handler Utility
 *
 * Maps API error codes to user-friendly messages and provides
 * error categorization for observability.
 */

import { ApiError } from '@/context/apiClient';

export interface UserFriendlyError {
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  retry: boolean; // Whether the operation should be retried
  code?: string; // Optional error code for observability
  details?: Record<string, any>; // Original error details
}

/**
 * Map HTTP status code to user-friendly error message
 *
 * @param status HTTP status code
 * @returns User-friendly error message
 */
function getMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Session expired. Please sign in again.';
    case 403:
      return 'Access denied. You do not have permission to view these notifications.';
    case 404:
      return 'Notifications not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Retrying...';
    default:
      if (status >= 500) {
        return 'Server error. Retrying...';
      } else if (status >= 400) {
        return 'Request failed. Please try again.';
      }
      return 'An unexpected error occurred.';
  }
}

/**
 * Determine error severity based on status code
 *
 * @param status HTTP status code
 * @returns Severity level
 */
function getSeverityForStatus(status: number): UserFriendlyError['severity'] {
  if (status === 401 || status === 403) {
    return 'warning';
  } else if (status >= 500) {
    return 'error';
  } else if (status === 429) {
    return 'warning';
  } else if (status >= 400) {
    return 'error';
  }
  return 'error';
}

/**
 * Determine if operation should be retried based on status code
 *
 * @param status HTTP status code
 * @returns Whether to retry
 */
function shouldRetry(status: number): boolean {
  // Retry server errors (5xx) and rate limit (429)
  // Don't retry client errors (4xx) except 429
  return status >= 500 || status === 429;
}

/**
 * Convert API error to user-friendly error
 *
 * @param error ApiError or generic Error
 * @returns UserFriendlyError with message and metadata
 */
export function handleError(error: Error | ApiError): UserFriendlyError {
  // Check if error is an ApiError with status
  const apiError = error as ApiError;

  if (apiError.status) {
    return {
      message: getMessageForStatus(apiError.status),
      severity: getSeverityForStatus(apiError.status),
      retry: shouldRetry(apiError.status),
      code: apiError.code,
      details: apiError.details,
    };
  }

  // Generic error (network failure, etc.)
  return {
    message: 'Network error. Please check your connection and try again.',
    severity: 'error',
    retry: true,
    details: { originalMessage: error.message },
  };
}

/**
 * Special handling for authentication errors (401)
 *
 * This function should trigger F02 re-authentication flow.
 * Implementation depends on F02 auth context API.
 *
 * @param error ApiError
 * @returns True if error is 401, false otherwise
 */
export function isAuthenticationError(error: Error | ApiError): boolean {
  const apiError = error as ApiError;
  return apiError.status === 401;
}

/**
 * Special handling for authorization errors (403)
 *
 * @param error ApiError
 * @returns True if error is 403, false otherwise
 */
export function isAuthorizationError(error: Error | ApiError): boolean {
  const apiError = error as ApiError;
  return apiError.status === 403;
}

/**
 * Check if error is a server error (5xx)
 *
 * @param error ApiError
 * @returns True if error is 5xx, false otherwise
 */
export function isServerError(error: Error | ApiError): boolean {
  const apiError = error as ApiError;
  return apiError.status !== undefined && apiError.status >= 500;
}

/**
 * Format error for logging/observability
 *
 * @param context Operation context (e.g., "fetch_notifications", "mark_as_read")
 * @param error Error object
 * @returns Structured log object
 */
export function formatErrorForLogging(
  context: string,
  error: Error | ApiError
): Record<string, any> {
  const apiError = error as ApiError;

  return {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      status: apiError.status,
      code: apiError.code,
      details: apiError.details,
      stack: error.stack,
    },
  };
}
