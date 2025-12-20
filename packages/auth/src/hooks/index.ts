/**
 * Authentication hooks - convenient access to auth state.
 */

export { useAuth } from './useAuth';
export { useAuthStatus, type AuthStatusFlags } from './useAuthStatus';
export { useCurrentUser } from './useCurrentUser';
export { useSignIn, type UseSignInResult } from './useSignIn';
export { useSignUp, type UseSignUpResult } from './useSignUp';
export { useSignOut, type UseSignOutResult } from './useSignOut';
export { useRequestPasswordReset, type UseRequestPasswordResetResult } from './useRequestPasswordReset';
export { useConfirmPasswordReset, type UseConfirmPasswordResetResult } from './useConfirmPasswordReset';
export { useUpdateProfile, type UseUpdateProfileResult } from './useUpdateProfile';
