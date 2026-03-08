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
  /** Whether user has superuser permissions */
  is_superuser?: boolean;
  /** Whether user has staff permissions */
  is_staff?: boolean;
  /** Profile photo URL */
  avatar_url?: string | null;
  /** Full display name (computed by backend) */
  name?: string;
  /** Username (if set) */
  username?: string;
  /** Whether two-factor authentication is enabled */
  two_factor_enabled?: boolean;
  /** Last login timestamp */
  last_login?: string | null;
  /** User's organisations (embedded in /auth/me response) */
  organisations?: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    membership_id?: string;
  }>;
  /** User's projects (embedded in /auth/me response) */
  projects?: Array<{
    id: number;
    name: string;
    slug: string;
    role: string;
    parent?: number | null;
    parent_name?: string | null;
    membership_id?: number;
  }>;
}
