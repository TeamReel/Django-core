/**
 * AuthProvider - Core authentication context provider.
 *
 * Manages:
 * - Authentication state (user, status, error)
 * - Session initialization (/auth/me on mount)
 * - Token management (CSRF via apiClient)
 * - Error handling with B13 envelope normalization
 * - Automatic redirect on 401/403
 */

import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AuthConfig, AuthState, User, ApiError } from '../types';
import { apiClient } from '../lib/apiClient';
import { errorNormalizer } from '../lib/errorNormalizer';
import { shouldRedirectToLogin, redirectToLogin } from '../lib/redirectHelper';

/**
 * AuthContext shape - provides state and actions.
 */
export interface AuthContextValue extends AuthState {
  /**
   * Authentication configuration.
   */
  config: AuthConfig;

  /**
   * Initialize session (call /auth/me).
   * Returns user on success, null on failure.
   */
  initializeSession: () => Promise<User | null>;

  /**
   * Clear authentication state (e.g., on sign out).
   */
  clearAuth: () => void;

  /**
   * Handle API error - normalize and update state.
   * Redirects to login on 401/403.
   */
  handleApiError: (response: Response) => Promise<ApiError>;

  /**
   * Set authenticated user and update state.
   */
  setUser: (user: User) => void;
}

/**
 * AuthContext - React Context for authentication state.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider props.
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  config: AuthConfig;
  /**
   * Skip automatic session initialization on mount.
   * Useful for testing or manual session management.
   */
  skipInitialLoad?: boolean;
}

/**
 * AuthProvider - Provides authentication state and utilities.
 *
 * @example
 * ```tsx
 * const authConfig = {
 *   apiBaseUrl: 'http://localhost:8000',
 *   endpoints: {
 *     signIn: '/auth/sign-in/',
 *     signOut: '/auth/sign-out/',
 *     me: '/auth/me/',
 *     // ...
 *   },
 *   routes: {
 *     login: '/login',
 *     defaultAfterLogin: '/dashboard',
 *     afterLogout: '/',
 *   },
 * };
 *
 * <AuthProvider config={authConfig}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  config,
  skipInitialLoad = false,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: 'loading',
    isLoading: true,
    error: null,
    lastVerified: null,
  });

  const configRef = useRef(config);
  configRef.current = config;

  /**
   * Initialize session by calling /auth/me endpoint.
   */
  const initializeSession = useCallback(async (): Promise<User | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const url = `${configRef.current.apiBaseUrl}${configRef.current.endpoints.me}`;
      const response = await apiClient(url, { method: 'GET' });

      if (!response.ok) {
        // Handle unauthenticated (401) or forbidden (403)
        if (shouldRedirectToLogin(response.status)) {
          setState({
            user: null,
            status: 'unauthenticated',
            isLoading: false,
            error: null,
            lastVerified: Date.now(),
          });
          return null;
        }

        // Other errors
        const error = await errorNormalizer(response);
        setState({
          user: null,
          status: 'error',
          isLoading: false,
          error,
          lastVerified: Date.now(),
        });
        return null;
      }

      const data = await response.json();
      const user: User = data.data || data; // Handle B13 envelope or direct user object

      setState({
        user,
        status: 'authenticated',
        isLoading: false,
        error: null,
        lastVerified: Date.now(),
      });

      return user;
    } catch (err) {
      setState({
        user: null,
        status: 'error',
        isLoading: false,
        error: {
          status: 0,
          fieldErrors: {},
          formErrors: [err instanceof Error ? err.message : 'Network error'],
        },
        lastVerified: Date.now(),
      });
      return null;
    }
  }, []);

  /**
   * Clear authentication state.
   */
  const clearAuth = useCallback(() => {
    setState({
      user: null,
      status: 'unauthenticated',
      isLoading: false,
      error: null,
      lastVerified: Date.now(),
    });
  }, []);

  /**
   * Handle API error response.
   * Normalizes error and redirects on 401/403.
   */
  const handleApiError = useCallback(async (response: Response): Promise<ApiError> => {
    const error = await errorNormalizer(response);

    // Redirect to login on 401/403
    if (shouldRedirectToLogin(response.status)) {
      clearAuth();
      redirectToLogin(configRef.current.routes.login);
    }

    setState((prev) => ({
      ...prev,
      error,
      status: shouldRedirectToLogin(response.status) ? 'unauthenticated' : 'error',
    }));

    return error;
  }, [clearAuth]);

  /**
   * Set authenticated user.
   */
  const setUser = useCallback((user: User) => {
    setState({
      user,
      status: 'authenticated',
      isLoading: false,
      error: null,
      lastVerified: Date.now(),
    });
  }, []);

  /**
   * Initialize session on mount (unless skipInitialLoad is true).
   */
  useEffect(() => {
    if (!skipInitialLoad) {
      initializeSession();
    } else {
      // Set to unauthenticated immediately if skipping
      setState({
        user: null,
        status: 'unauthenticated',
        isLoading: false,
        error: null,
        lastVerified: null,
      });
    }
  }, [skipInitialLoad, initializeSession]);

  /**
   * Optional: Session polling (if enabled in config).
   */
  useEffect(() => {
    if (!config.security?.enableSessionPolling) return;

    const interval = config.security.sessionPollingInterval || 60000; // Default 60s
    const timerId = setInterval(() => {
      if (state.status === 'authenticated') {
        initializeSession(); // Re-verify session
      }
    }, interval);

    return () => clearInterval(timerId);
  }, [config.security, state.status, initializeSession]);

  const value: AuthContextValue = {
    ...state,
    config,
    initializeSession,
    clearAuth,
    handleApiError,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
