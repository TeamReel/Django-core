/**
 * useRequestPasswordReset hook - Handle password reset request flow.
 *
 * Provides mutation function for POST /auth/password-reset/ with loading, error, and success states.
 * Always shows generic success message to prevent email enumeration.
 *
 * @example
 * ```tsx
 * const { requestReset, isLoading, error, success } = useRequestPasswordReset();
 *
 * const handleSubmit = async (email: string) => {
 *   try {
 *     await requestReset(email);
 *     // Success state will be true
 *   } catch (err) {
 *     console.error('Request failed:', err);
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import type { ApiError } from '../types';

export interface UseRequestPasswordResetResult {
  /**
   * Request password reset for given email.
   * Always succeeds (200) to prevent email enumeration.
   */
  requestReset: (email: string) => Promise<void>;

  /**
   * Whether request is in progress.
   */
  isLoading: boolean;

  /**
   * Error from last failed request.
   */
  error: ApiError | null;

  /**
   * Whether request completed successfully.
   */
  success: boolean;

  /**
   * Clear error and success states.
   */
  reset: () => void;
}

/**
 * Hook for requesting password reset.
 */
export function useRequestPasswordReset(): UseRequestPasswordResetResult {
  const { handleApiError, config } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const requestReset = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = config.apiBaseUrl + config.endpoints.requestPasswordReset;
        const response = await apiClient(url, {
          method: 'POST',
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const apiError = await handleApiError(response);
          setError(apiError);
          throw apiError;
        }

        // Success - backend always returns 200 to prevent email enumeration
        setSuccess(true);
      } catch (err) {
        // If it's already an ApiError, just re-throw
        if (err && typeof err === 'object' && 'status' in err) {
          throw err;
        }

        // Network or other error
        const networkError: ApiError = {
          status: 0,
          fieldErrors: {},
          formErrors: [err instanceof Error ? err.message : 'Network error occurred'],
        };
        setError(networkError);
        throw networkError;
      } finally {
        setIsLoading(false);
      }
    },
    [handleApiError, config]
  );

  return { requestReset, isLoading, error, success, reset };
}
