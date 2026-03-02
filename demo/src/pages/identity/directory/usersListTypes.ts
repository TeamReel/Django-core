/**
 * Types, constants, and inline styles for UsersList and its sub-components.
 *
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import type React from 'react';
import type { Organisation as SharedOrganisation } from '../../../types';

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organisations?: { id: string; name: string; slug: string; role: string }[];
}

export type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string };
  parent_id?: string | number | null;
  parent_project?: any;
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
