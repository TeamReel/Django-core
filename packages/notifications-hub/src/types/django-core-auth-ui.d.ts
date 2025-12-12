/**
 * Type stub for @django-core/auth-ui
 * TODO: Remove when F02 package is available
 */

declare module '@django-core/auth-ui' {
  export interface User {
    id: string;
    email: string;
    displayName: string;
  }

  export interface AuthContextValue {
    isAuthenticated: boolean;
    user: User | null;
  }

  export function useAuth(): AuthContextValue;
}
