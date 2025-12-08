/**
 * @teamreel/auth - Authentication library for TeamReel frontend.
 *
 * Provides React components, hooks, and utilities for:
 * - User authentication (sign in, sign out, session management)
 * - Password reset flows
 * - Profile management
 * - CSRF-protected API calls
 * - B13 error envelope handling
 *
 * @example
 * ```tsx
 * import { AuthProvider, useAuth } from '@teamreel/auth';
 *
 * function App() {
 *   return (
 *     <AuthProvider config={authConfig}>
 *       <Dashboard />
 *     </AuthProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { user, status } = useAuth();
 *   if (status === 'loading') return <Spinner />;
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */

// Core provider and context
export { AuthProvider, AuthContext, type AuthProviderProps, type AuthContextValue } from './components/AuthProvider';

// Hooks
export {
  useAuth,
  useAuthStatus,
  useCurrentUser,
  useSignIn,
  useRequestPasswordReset,
  useConfirmPasswordReset,
  type AuthStatusFlags,
  type UseSignInResult,
  type UseRequestPasswordResetResult,
  type UseConfirmPasswordResetResult
} from './hooks';

// Components
export {
  SignInForm,
  SignInPage,
  RequestPasswordResetForm,
  RequestPasswordResetPage,
  ConfirmPasswordResetForm,
  ConfirmPasswordResetPage,
  type SignInFormProps,
  type SignInPageProps,
  type RequestPasswordResetFormProps,
  type RequestPasswordResetPageProps,
  type ConfirmPasswordResetFormProps,
  type ConfirmPasswordResetPageProps
} from './components';

// Types
export type { AuthConfig, AuthState, User, ApiError } from './types';

export const version = '1.0.0';
