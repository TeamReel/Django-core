/**
 * useAuthStatus hook - Convenient access to authentication status.
 *
 * @returns Object with boolean flags for each status state
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading, isError } = useAuthStatus();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <Navigate to="/login" />;
 * return <Dashboard />;
 * ```
 */

import { useAuth } from './useAuth';

export interface AuthStatusFlags {
  isAuthenticated: boolean;
  isUnauthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function useAuthStatus(): AuthStatusFlags {
  const { status } = useAuth();

  return {
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    isLoading: status === 'loading',
    isError: status === 'error',
  };
}
