/**
 * useCurrentUser hook - Access current authenticated user.
 *
 * @returns Current user or null if unauthenticated
 *
 * @example
 * ```tsx
 * const user = useCurrentUser();
 *
 * if (!user) return <LoginPrompt />;
 *
 * return (
 *   <div>
 *     <h1>Welcome, {user.first_name}</h1>
 *     <p>Email: {user.email}</p>
 *   </div>
 * );
 * ```
 */

import { useAuth } from './useAuth';
import type { User } from '../types';

export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}
