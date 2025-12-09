/**
 * Sign-out hook for authentication.
 *
 * Provides functionality to sign out users by calling POST /auth/sign-out/,
 * clearing authentication state, and redirecting to the configured after-logout page.
 *
 * @module useSignOut
 */

import { useCallback, useContext, useRef, useState } from 'react';
import { AuthContext } from '../components/AuthProvider';
import { apiClient } from '../lib/apiClient';
import type { ApiError } from '../types';

/**
 * Result of the useSignOut hook
 */
export interface UseSignOutResult {
  /**
   * Trigger sign-out action
   */
  signOut: () => Promise<void>;

  /**
   * Loading state during sign-out request
   */
  loading: boolean;

  /**
   * Error that occurred during sign-out (if any)
   * Note: Sign-out will proceed even if an error occurs
   */
  error: ApiError | null;
}

/**
 * Hook for signing out the current user.
 *
 * Handles POST /auth/sign-out/ request, clears authentication state,
 * and redirects to the configured after-logout page (default: "/").
 *
 * **Security Considerations**:
 * - Local state is authoritative - always clears state even on network failure
 * - 401 responses (already logged out) are treated as success
 * - Uses hard redirect (window.location.href) to clear all state
 *
 * **Error Handling**:
 * - Network failures don't block sign-out
 * - Errors are logged but state is still cleared
 * - Loading state prevents duplicate requests
 *
 * @example
 * ```tsx
 * function SignOutButton() {
 *   const { signOut, loading } = useSignOut();
 *
 *   return (
 *     <button onClick={signOut} disabled={loading}>
 *       {loading ? 'Signing out...' : 'Sign Out'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @returns Sign-out function, loading state, and error state
 */
export const useSignOut = (): UseSignOutResult => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useSignOut must be used within an AuthProvider');
  }

  const { clearAuth, config } = context;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const isSigningOut = useRef(false);

  const signOut = useCallback(async (): Promise<void> => {
    // Prevent duplicate requests using ref (synchronous check)
    if (isSigningOut.current) {
      return;
    }

    isSigningOut.current = true;
    setLoading(true);
    setError(null);

    try {
      const url = config.apiBaseUrl + config.endpoints.signOut;
      await apiClient(url, {
        method: 'POST',
        credentials: 'include', // Include cookies for session-based auth
      });
    } catch (err) {
      // Handle 401 (already logged out) as success
      if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
        // Already logged out - this is fine, just clear state
        console.debug('[useSignOut] User already logged out (401), clearing state');
      } else {
        // Network error or other failure
        // Log the error but don't block sign-out
        console.error('[useSignOut] Error during sign-out request:', err);
        const normalizedError: ApiError = {
          status: 0,
          fieldErrors: {},
          formErrors: [err instanceof Error ? err.message : 'Network error occurred'],
        };
        setError(normalizedError);
      }
    } finally {
      // ALWAYS clear state and redirect, regardless of API response
      // Local state is authoritative - we trust the client decision to sign out
      clearAuth();
      isSigningOut.current = false;
      setLoading(false);

      // Hard redirect to clear all state (not React Router navigation)
      // This ensures complete state reset and prevents any authenticated UI flash
      const redirectUrl = config.routes?.afterLogout || '/';
      window.location.href = redirectUrl;
    }
  }, [clearAuth, config]);

  return {
    signOut,
    loading,
    error,
  };
};
