/**
 * User profile data from backend.
 * Matches the response from GET /auth/me and PATCH /auth/profile endpoints.
 */
export interface User {
  /** Unique user ID */
  id: number;
  /** User's email address */
  email: string;
  /** User's first name */
  first_name: string;
  /** User's last name */
  last_name: string;
  /** User's role */
  role: 'superadmin' | 'admin' | 'user';
  /** Whether email has been verified */
  email_verified: boolean;
  /** Whether the user account is active */
  is_active: boolean;
}
