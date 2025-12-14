/**
 * Authentication Provider Interface
 *
 * Implement this interface to integrate authentication with Core-App backend.
 * Supports multiple state management libraries (React Context, Zustand, Redux, etc.)
 *
 * @see {@link https://docs.django-core.example.com/integration-guides/auth | Authentication Guide}
 * @packageDocumentation
 */

import type { User, Credentials, RequestState } from './types';

/**
 * Core authentication provider interface
 *
 * This interface defines the contract for authentication state and operations.
 * Implementations MUST handle:
 * - Token storage (secure, httpOnly cookies preferred)
 * - Token refresh (automatic, before expiry)
 * - CSRF token injection (via meta tag or cookie)
 *
 * @example React Context Implementation
 * ```typescript
 * const AuthContext = createContext<AuthProvider | null>(null);
 *
 * function AuthProviderImpl({ children }: { children: ReactNode }) {
 *   const [state, setState] = useState<RequestState<User>>({ status: 'idle' });
 *
 *   const login = async (credentials: Credentials) => {
 *     setState({ status: 'loading' });
 *     try {
 *       const response = await fetch('/api/auth/login', {
 *         method: 'POST',
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'X-CSRFToken': getCsrfToken(),
 *         },
 *         body: JSON.stringify(credentials),
 *         credentials: 'include', // Send cookies
 *       });
 *       const user = await response.json();
 *       setState({ status: 'success', data: user });
 *     } catch (error) {
 *       setState({ status: 'error', error });
 *     }
 *   };
 *
 *   return (
 *     <AuthContext.Provider value={{ state, login, logout, refresh }}>
 *       {children}
 *     </AuthContext.Provider>
 *   );
 * }
 * ```
 */
export interface AuthProvider {
  /**
   * Current authentication state
   *
   * - `idle`: Initial state, no auth check performed
   * - `loading`: Auth check or operation in progress
   * - `success`: User authenticated, `state.data` contains user info
   * - `error`: Auth failed, `state.error` contains error details
   */
  readonly state: RequestState<User>;

  /**
   * Convenience accessor: true if user is authenticated
   *
   * @example
   * ```typescript
   * if (auth.isAuthenticated) {
   *   return <Dashboard />;
   * }
   * return <LoginForm />;
   * ```
   */
  readonly isAuthenticated: boolean;

  /**
   * Convenience accessor: true if loading initial auth state or during operations
   */
  readonly isLoading: boolean;

  /**
   * Convenience accessor: currently authenticated user (undefined if not authenticated)
   */
  readonly user: User | undefined;

  /**
   * Authenticate user with credentials
   *
   * Implementation MUST:
   * - Send credentials to `POST /api/auth/login`
   * - Include CSRF token in `X-CSRFToken` header
   * - Set `credentials: 'include'` to receive httpOnly cookies
   * - Handle 401 (invalid credentials), 429 (rate limit), 5xx (server errors)
   *
   * @param credentials - Email and password
   * @returns Promise resolving to authenticated user
   * @throws {ClientError} 401 - Invalid credentials
   * @throws {ServerError} 5xx - Server error
   */
  login(credentials: Credentials): Promise<User>;

  /**
   * Log out current user
   *
   * Implementation MUST:
   * - Send request to `POST /api/auth/logout`
   * - Clear local state immediately (optimistic update)
   * - Handle errors gracefully (logout locally even if backend fails)
   *
   * @returns Promise resolving when logout completes
   */
  logout(): Promise<void>;

  /**
   * Refresh authentication state (check if session is still valid)
   *
   * Use this to:
   * - Verify session on app mount
   * - Refresh user data after profile updates
   * - Check session validity after long inactivity
   *
   * Implementation MUST:
   * - Send request to `GET /api/auth/session`
   * - Return current user if session valid
   * - Throw error if session expired (401)
   *
   * @returns Promise resolving to current user
   * @throws {ClientError} 401 - Session expired
   */
  refresh(): Promise<User>;

  /**
   * Check if user has specific permission
   *
   * @param permission - Permission string (e.g., "projects.create")
   * @returns true if user has permission, false otherwise
   *
   * @example
   * ```typescript
   * if (auth.hasPermission('projects.delete')) {
   *   return <DeleteButton />;
   * }
   * ```
   */
  hasPermission(permission: string): boolean;
}

/**
 * Hook signature for React-based implementations
 *
 * @example
 * ```typescript
 * function LoginPage() {
 *   const auth = useAuth();
 *
 *   const handleSubmit = async (email: string, password: string) => {
 *     try {
 *       await auth.login({ email, password });
 *       navigate('/dashboard');
 *     } catch (error) {
 *       setError('Invalid credentials');
 *     }
 *   };
 *
 *   return <LoginForm onSubmit={handleSubmit} />;
 * }
 * ```
 */
export type UseAuth = () => AuthProvider;
