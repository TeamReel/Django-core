/**
 * React Context AuthProvider Implementation
 *
 * This implementation wraps the vanilla TypeScript AuthProvider
 * in React Context to provide authentication state throughout your app.
 *
 * Use this as a starting point for React applications.
 * For other frameworks, follow the vanilla.ts pattern instead.
 */

import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

import type { AuthProvider, User } from '../contracts';
import { createAuthProvider } from './vanilla';

/**
 * React Context for authentication
 * @private - Use useAuth() hook instead
 */
const AuthContext = createContext<AuthProvider | null>(null);

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
  baseURL?: string;
  onLogin?: (user: User) => void;
  onLogout?: () => void;
}

/**
 * React component providing authentication to child tree
 *
 * @example
 * ```tsx
 * import { AuthProvider, useAuth } from './auth-example/react';
 *
 * function App() {
 *   return (
 *     <AuthProvider baseURL="/api">
 *       <MainLayout />
 *     </AuthProvider>
 *   );
 * }
 *
 * function MainLayout() {
 *   const auth = useAuth();
 *
 *   if (auth.isLoading) return <LoadingSpinner />;
 *   if (!auth.isAuthenticated) return <LoginForm />;
 *
 *   return (
 *     <div>
 *       <h1>Welcome {auth.user?.name}</h1>
 *       <button onClick={() => auth.logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function AuthProviderComponent({
  children,
  baseURL,
  onLogin,
  onLogout,
}: AuthProviderProps): JSX.Element {
  const [authProvider] = React.useState(() =>
    createAuthProvider({
      baseURL,
      onStateChange: (state) => {
        if (state.status === 'success' && onLogin) {
          onLogin(state.data);
        }
        if (state.status === 'idle' && onLogout) {
          onLogout();
        }
      },
    }),
  );

  // Attempt to restore session on mount
  useEffect(() => {
    authProvider.refresh().catch(() => {
      // Session expired or invalid - user stays logged out
    });
  }, [authProvider]);

  return <AuthContext.Provider value={authProvider}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be called from within <AuthProvider>
 *
 * @returns AuthProvider interface instance
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const auth = useAuth();
 *   const [email, setEmail] = React.useState('');
 *   const [password, setPassword] = React.useState('');
 *   const [error, setError] = React.useState('');
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       await auth.login({ email, password });
 *       // Router will redirect to dashboard on successful login
 *     } catch (err) {
 *       setError(err instanceof Error ? err.message : 'Login failed');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={email} onChange={(e) => setEmail(e.target.value)} />
 *       <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
 *       <button type="submit" disabled={auth.isLoading}>
 *         {auth.isLoading ? 'Logging in...' : 'Login'}
 *       </button>
 *       {error && <div style={{ color: 'red' }}>{error}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthProvider {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be called from within <AuthProvider>');
  }
  return context;
}

/**
 * React Router Protected Route Component
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router-dom';
 * import { ProtectedRoute } from './auth-example/react';
 *
 * function AppRouter() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         <Route path="/login" element={<LoginPage />} />
 *         <Route
 *           path="/dashboard"
 *           element={
 *             <ProtectedRoute>
 *               <DashboardPage />
 *             </ProtectedRoute>
 *           }
 *         />
 *       </Routes>
 *     </BrowserRouter>
 *   );
 * }
 * ```
 */
export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element | null {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    // In real app, use React Router navigate
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}

/**
 * Example Login Form Component
 */
export function LoginForm(): JSX.Element {
  const auth = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    try {
      await auth.login({ email, password });
      // Router will handle redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
      <button type="submit" disabled={auth.isLoading} onClick={(e) => void handleSubmit(e as React.FormEvent)}>
        {auth.isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

/**
 * Example Profile Component
 */
export function UserProfile(): JSX.Element {
  const auth = useAuth();

  if (!auth.user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome {auth.user.name}</h1>
      <p>Email: {auth.user.email}</p>
      <p>Permissions: {auth.user.permissions.join(', ')}</p>
      <button
        onClick={() => {
          void auth.logout();
          window.location.href = '/login';
        }}
      >
        Logout
      </button>
    </div>
  );
}
