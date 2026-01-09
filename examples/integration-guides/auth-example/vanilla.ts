/**
 * Vanilla TypeScript AuthProvider Implementation
 *
 * This implementation demonstrates the AuthProvider interface pattern
 * without any framework dependencies (no React, Vue, Angular).
 *
 * Use this as a reference for implementing authentication in non-React environments,
 * or as a base layer to wrap in framework-specific context/store solutions.
 */

import type {
  AuthProvider,
  Credentials,
  RequestState,
  User,
} from '../contracts';

/**
 * Extract CSRF token from HTML meta tag
 * Backend should include: <meta name="csrf-token" content="...">
 */
function getCsrfToken(): string {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (!token) {
    throw new Error(
      'CSRF token not found. Ensure your HTML includes: <meta name="csrf-token" content="...">',
    );
  }
  return token;
}

/**
 * Factory function to create an AuthProvider implementation
 *
 * @example
 * ```typescript
 * const authProvider = createAuthProvider({
 *   baseURL: 'https://api.example.com',
 *   onStateChange: (newState) => console.log('Auth state changed:', newState),
 * });
 *
 * await authProvider.login({ email: 'user@example.com', password: 'secret' });
 * console.log('Logged in as:', authProvider.user);
 * ```
 */
export function createAuthProvider(options: {
  baseURL?: string;
  onStateChange?: (state: RequestState<User>) => void;
}): AuthProvider {
  const baseURL = options.baseURL || '';
  let state: RequestState<User> = { status: 'idle' };

  function setState(newState: RequestState<User>): void {
    state = newState;
    options.onStateChange?.(newState);
  }

  /**
   * Perform authenticated API request with automatic CSRF token injection
   */
  async function apiRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Inject CSRF token for mutating requests
    if (method !== 'GET') {
      headers['X-CSRFToken'] = getCsrfToken();
    }

    const response = await fetch(`${baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // CRITICAL: Send session cookies
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(
        `Request failed (${response.status}): ${String(errorData['detail']) || response.statusText}`,
      );
    }

    return (response.json() as Promise<T>);
  }

  return {
    get state(): RequestState<User> {
      return state;
    },

    get isAuthenticated(): boolean {
      return state.status === 'success';
    },

    get isLoading(): boolean {
      return state.status === 'loading';
    },

    get user(): User | undefined {
      return state.status === 'success' ? state.data : undefined;
    },

    async login(credentials: Credentials): Promise<User> {
      setState({ status: 'loading' });

      try {
        const user = await apiRequest<User>('/api/auth/login', 'POST', credentials);
        setState({ status: 'success', data: user });
        return user;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ status: 'error', error: err });
        throw err;
      }
    },

    async logout(): Promise<void> {
      // Optimistic: clear state immediately
      setState({ status: 'idle' });

      try {
        // Attempt server-side logout
        await apiRequest('/api/auth/logout', 'POST');
      } catch (error) {
        // Log but don't throw - user is logged out locally
        console.error('Server-side logout failed:', error);
      }
    },

    async refresh(): Promise<User> {
      try {
        const user = await apiRequest<User>('/api/auth/session', 'GET');
        setState({ status: 'success', data: user });
        return user;
      } catch (error) {
        setState({ status: 'idle' });
        throw error;
      }
    },

    hasPermission(permission: string): boolean {
      if (!this.user) return false;
      return this.user.permissions.includes(permission);
    },
  };
}

/**
 * Example Usage
 *
 * HTML Setup:
 * ```html
 * <meta name="csrf-token" content="abc123...">
 * ```
 *
 * TypeScript:
 * ```typescript
 * const auth = createAuthProvider({ baseURL: '/api' });
 *
 * // Login
 * try {
 *   await auth.login({ email: 'user@example.com', password: 'secret' });
 *   console.log('Welcome:', auth.user?.name);
 * } catch (error) {
 *   console.error('Login failed:', error);
 * }
 *
 * // Check permission
 * if (auth.hasPermission('projects.create')) {
 *   // Show create button
 * }
 *
 * // Logout
 * await auth.logout();
 * ```
 */
