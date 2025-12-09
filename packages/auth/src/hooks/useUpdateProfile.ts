import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import type { User, ApiError } from '../types';

/**
 * Data payload for profile update requests.
 */
export interface UpdateProfileData {
  /** User's first name */
  first_name?: string;
  /** User's last name */
  last_name?: string;
  /** Current password required for verification */
  current_password: string;
}

/**
 * Return type for the useUpdateProfile hook.
 */
export interface UseUpdateProfileResult {
  /** Function to trigger profile update */
  mutate: (data: UpdateProfileData) => Promise<User>;
  /** True while the update request is in progress */
  loading: boolean;
  /** Error object if the update failed */
  error: ApiError | null;
  /** True if the last update succeeded */
  success: boolean;
}

/**
 * Hook for updating the authenticated user's profile.
 *
 * Wraps the PATCH /auth/profile endpoint and automatically updates
 * AuthContext with the new user data on success.
 *
 * @example
 * ```tsx
 * const { mutate, loading, error, success } = useUpdateProfile();
 *
 * const handleSubmit = async () => {
 *   try {
 *     await mutate({
 *       first_name: 'John',
 *       last_name: 'Doe',
 *       current_password: 'secret123'
 *     });
 *     console.log('Profile updated!');
 *   } catch (err) {
 *     console.error('Update failed:', err);
 *   }
 * };
 * ```
 *
 * @security
 * - Requires valid session (HTTP-only cookie)
 * - Current password must be provided for verification
 * - Generic error on incorrect password prevents enumeration
 *
 * @throws {ApiError} If the update fails (validation, auth, network)
 */
export const useUpdateProfile = (): UseUpdateProfileResult => {
  const { setUser, handleApiError, config } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  // Prevent duplicate requests using ref (more reliable than loading state)
  const isUpdatingRef = useRef(false);

  const mutate = useCallback(
    async (data: UpdateProfileData): Promise<User> => {
      // Prevent duplicate concurrent requests
      if (isUpdatingRef.current) {
        throw new Error('Profile update already in progress');
      }

      isUpdatingRef.current = true;
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = config.apiBaseUrl + config.endpoints.profile;
        const response = await apiClient(url, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const apiError = await handleApiError(response);
          setError(apiError);
          throw apiError;
        }

        const responseData = await response.json();
        const updatedUser: User = responseData.data || responseData; // Handle B13 envelope or direct user object

        // Update AuthContext with new user data
        setUser(updatedUser);
        setSuccess(true);

        return updatedUser;
      } catch (err) {
        // If it's already an ApiError, just re-throw
        if (err && typeof err === 'object' && 'status' in err) {
          setError(err as ApiError);
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
        setLoading(false);
        isUpdatingRef.current = false;
      }
    },
    [setUser, handleApiError, config]
  );

  return { mutate, loading, error, success };
};
