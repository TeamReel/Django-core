import { User } from './User';
import { ApiError } from './ApiError';

/**
 * Authentication state managed by AuthProvider.
 */
export interface AuthState {
  /** Current authenticated user (null if not authenticated) */
  user: User | null;
  /** Authentication status */
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'error';
  /** Whether an authentication operation is in progress */
  isLoading: boolean;
  /** Last error that occurred during authentication */
  error: ApiError | null;
  /** Timestamp of last successful session verification (milliseconds since epoch) */
  lastVerified: number | null;
}
