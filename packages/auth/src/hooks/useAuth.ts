/**
 * useAuth hook - Access authentication context.
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * const { user, status, initializeSession } = useAuth();
 *
 * if (status === 'loading') return <Spinner />;
 * if (status === 'unauthenticated') return <LoginPrompt />;
 * return <div>Welcome, {user.email}</div>;
 * ```
 */

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../components/AuthProvider';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
