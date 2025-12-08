/**
 * useConfirmPasswordReset hook - Handle password reset confirmation flow.
 *
 * Provides mutation function for POST /auth/password-reset-confirm/ with loading and error states.
 * Validates token and sets new password.
 *
 * @example
 * ```tsx
 * const { confirmReset, isLoading, error, success } = useConfirmPasswordReset();
 *
 * const handleSubmit = async (uidb64: string, token: string, password: string) => {
 *   try {
 *     await confirmReset(uidb64, token, password);
 *     // Redirect to sign-in
 *   } catch (err) {
 *     console.error('Confirmation failed:', err);
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import type { ApiError } from '../types';

export interface UseConfirmPasswordResetResult {
  /**
   * Confirm password reset with token and new password.
   */
  confirmReset: (uidb64: string, token: string, newPassword: string) => Promise<void>;

  /**
   * Whether confirmation is in progress.
   */
  isLoading: boolean;

  /**
   * Error from last failed confirmation.
   */
  error: ApiError | null;

  /**
   * Whether confirmation completed successfully.
   */
  success: boolean;

  /**
   * Clear error and success states.
   */
  reset: () => void;
}

/**
 * Hook for confirming password reset.
 */
export function useConfirmPasswordReset(): UseConfirmPasswordResetResult {
  const { handleApiError, config } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const confirmReset = useCallback(
    async (uidb64: string, token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = config.apiBaseUrl + config.endpoints.confirmPasswordReset;
        const response = await apiClient(url, {
          method: 'POST',
          body: JSON.stringify({
            uidb64,
            token,
            new_password: newPassword,
          }),
        });

        if (!response.ok) {
          const apiError = await handleApiError(response);
          setError(apiError);
          throw apiError;
        }

        // Success
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

  return { confirmReset, isLoading, error, success, reset };
}
