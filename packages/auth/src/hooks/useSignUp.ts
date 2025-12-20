/**
 * useSignUp hook - Handle user registration flow.
 *
 * Provides mutation function for POST /auth/register/ with loading and error states.
 * Updates AuthContext on successful registration and auto-login.
 *
 * @example
 * ```tsx
 * const { signUp, isLoading, error } = useSignUp();
 *
 * const handleSubmit = async (email: string, password: string, firstName: string, lastName: string) => {
 *   try {
 *     const user = await signUp(email, password, firstName, lastName);
 *     console.log('Signed up and logged in:', user);
 *   } catch (err) {
 *     console.error('Sign up failed:', err);
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import type { User, ApiError } from '../types';

export interface UseSignUpResult {
  /**
   * Sign up with email, password and optional name fields.
   * Returns user object on success, throws ApiError on failure.
   */
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<User>;

  /**
   * Whether sign-up request is in progress.
   */
  isLoading: boolean;

  /**
   * Normalized error from last failed sign-up attempt.
   */
  error: ApiError | null;

  /**
   * Clear error state.
   */
  clearError: () => void;
}

/**
 * Hook for handling user registration.
 */
export function useSignUp(): UseSignUpResult {
  const { setUser, handleApiError, config } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string): Promise<User> => {
      if (!config.endpoints.signUp) {
        const configError: ApiError = {
          status: 0,
          fieldErrors: {},
          formErrors: ['Registration is not configured in this application'],
        };
        setError(configError);
        throw configError;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = config.apiBaseUrl + config.endpoints.signUp;
        const response = await apiClient(url, {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            first_name: firstName || '',
            last_name: lastName || ''
          }),
        });

        if (!response.ok) {
          const apiError = await handleApiError(response);
          setError(apiError);
          throw apiError;
        }

        const data = await response.json();
        const user: User = data.data || data; // Handle B13 envelope or direct user object

        // Update AuthContext with authenticated user (auto-login after registration)
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
    [config.apiBaseUrl, config.endpoints.signUp, setUser, handleApiError]
  );

  return {
    signUp,
    isLoading,
    error,
    clearError,
  };
}
