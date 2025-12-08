/**
 * useSignIn hook - Handle sign-in authentication flow.
 *
 * Provides mutation function for POST /auth/sign-in/ with loading and error states.
 * Updates AuthContext on successful authentication.
 *
 * @example
 * ```tsx
 * const { signIn, isLoading, error } = useSignIn();
 *
 * const handleSubmit = async (email: string, password: string) => {
 *   try {
 *     const user = await signIn(email, password);
 *     console.log('Signed in:', user);
 *   } catch (err) {
 *     console.error('Sign in failed:', err);
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import type { User, ApiError } from '../types';

export interface UseSignInResult {
  /**
   * Sign in with email and password.
   * Returns user object on success, throws ApiError on failure.
   */
  signIn: (email: string, password: string) => Promise<User>;

  /**
   * Whether sign-in request is in progress.
   */
  isLoading: boolean;

  /**
   * Normalized error from last failed sign-in attempt.
   */
  error: ApiError | null;

  /**
   * Clear error state.
   */
  clearError: () => void;
}

/**
 * Hook for handling user sign-in.
 */
export function useSignIn(): UseSignInResult {
  const { setUser, handleApiError, config } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<User> => {
      setIsLoading(true);
      setError(null);

      try {
        const url = config.apiBaseUrl + config.endpoints.signIn;
        const response = await apiClient(url, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const apiError = await handleApiError(response);
          setError(apiError);
          throw apiError;
        }

        const data = await response.json();
        const user: User = data.data || data; // Handle B13 envelope or direct user object

        // Update AuthContext with authenticated user
        setUser(user);

        return user;
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
    [setUser, handleApiError, config]
  );

  return {
    signIn,
    isLoading,
    error,
    clearError,
  };
}
