/**
 * Types, constants, and inline styles for UsersList and its sub-components.
 *
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import type React from 'react';
import type { Organisation as SharedOrganisation } from '@/types';
import type { User as BaseUser } from '@/types/api/user';

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

export interface User extends Omit<BaseUser, 'organisations' | 'projects'> {
  organisations?: { id: string; name: string; slug: string; role: string }[];
  username?: string;
  project_membership_id?: string;
  membership_id?: string;
  member_id?: string;
  membership?: { id?: string; role?: string; source?: string; joined_at?: string };
  source?: string;
  projects?: Record<string, unknown>[];
  project_memberships?: Record<string, unknown>[];
  [key: string]: unknown;
}

export type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string; name?: string; slug?: string };
  organisation_id?: string;
  parent_id?: string | number | null;
  parent_project?: { id?: string | number; name?: string } | null;
  parent_project_id?: string | number | null;
  is_active?: boolean;
  seasons_count?: number;
  competitions_count?: number;
  matches_count?: number;
};

export interface UsersListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
}

// ────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────

export const TEAMREEL_ROLE_RANK: Record<string, number> = {
  superadmin: 100,
  'land admin': 90,
  'club admin': 80,
  'team admin': 70,
  'team member': 60,
  supporter: 50,
  user: 10,
};

export const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);

export const AVAILABLE_ROLES = [
  'Land Admin',
  'Club Admin',
  'Team Admin',
  'Team Member',
  'Supporter',
] as const;

// ────────────────────────────────────────────────────────────
//  Inline Styles
// ────────────────────────────────────────────────────────────

export const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  color: 'var(--app-link, #0b5ed7)',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
  textDecoration: 'underline',
};

export const badgeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
};

export const badgeNoBorderStyle: React.CSSProperties = {
  border: 'none',
  borderColor: 'transparent',
  boxShadow: 'none',
  outline: 'none',
};
