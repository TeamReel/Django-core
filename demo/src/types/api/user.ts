/**
 * User & Account types.
 * Mirrors: src/accounts/serializers.py
 */

import type { OrgRef, ProjectRef } from './common';

/* ------------------------------------------------------------------ */
/*  Nested shapes embedded in User responses                           */
/* ------------------------------------------------------------------ */

export interface UserOrgEntry {
  id: string;           // org UUID
  name: string;
  slug: string;
  role: string;
  membership_id?: string;
  project_membership_id?: string;
}

export interface UserProjectEntry {
  id: number;
  name: string;
  slug: string;
  role: string;
  parent?: number | null;
  parent_name?: string | null;
  membership_id?: number;
  period?: string | null;
}

/* ------------------------------------------------------------------ */
/*  User                                                               */
/* ------------------------------------------------------------------ */

/** User list shape (UserListSerializer). */
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  avatar_url: string | null;
  two_factor_enabled: boolean;
  is_active: boolean;
  email_verified: boolean;
  date_joined: string;
  last_login: string | null;
  organisations: UserOrgEntry[];
  projects: UserProjectEntry[];
}

/** User detail shape (UserDetailSerializer) — extends list. */
export interface UserDetail extends User {
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
}
