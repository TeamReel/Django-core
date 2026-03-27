/**
 * userEditTypes.ts — Shared types, constants, and RBAC utilities for UserEditModal.
 */
import type { User as BaseUser } from '@/types/api/user';

export interface User extends Omit<BaseUser, 'organisations' | 'projects'> {
  avatar_url?: string;
  organisations?: Array<{ id: string | number; slug?: string; name?: string; membership_id?: string | number; role?: string }>;
  projects?: Array<{ id?: string | number; slug?: string | null; name?: string; membership_id?: string | number | null }>;
  project_memberships?: Array<Record<string, unknown>>;
}

export interface UserEditModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userData: Partial<User>) => Promise<void>;
  onSaved?: () => Promise<void> | void;
  organisationSlug?: string;
  scopeProjectKey?: string;
}

export type ProjectChoice = {
  key: string;
  name: string;
  isTeam?: boolean;
  parentKey?: string;
};

export type OrgProjectChoice = {
  key: string;
  name: string;
  parentName?: string | null;
  parentKey?: string | null;
  isTeam: boolean;
};

export const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'keeper', label: 'Keeper' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'verzorger', label: 'Verzorger' },
  { value: 'supporter', label: 'Supporter' },
  { value: 'manager', label: 'Manager' },
];

export const ADMIN_LIKE_ROLES = new Set(['admin', 'editor', 'owner', 'manager', 'coach']);

export const getRbacLabel = (accessRole: string, isTeam: boolean): string => {
  const isAdmin = ADMIN_LIKE_ROLES.has(accessRole);
  if (isAdmin) return isTeam ? 'Team Admin' : 'Club Admin';
  return isTeam ? 'Team Member' : 'Supporter';
};

export const getRbacColor = (label: string): string => {
  switch (label) {
    case 'Club Admin': return 'var(--color-amber-400)';
    case 'Team Admin': return 'var(--color-blue-500)';
    case 'Team Member': return 'var(--color-green-400)';
    case 'Supporter': return '#8b5cf6';
    case 'Land Admin': return 'var(--color-red-500)';
    default: return 'var(--app-muted-text)';
  }
};

export function RbacBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
      padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)',
      color: 'var(--color-white, #fff)', backgroundColor: getRbacColor(label), letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}

export const readFunctionalRolesFromMembership = (m: Record<string, unknown>): string[] => {
  const direct = (m as Record<string, unknown>)?.functional_roles ?? (m as Record<string, unknown>)?.functionalRoles;
  if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);
  const meta = (m.metadata as Record<string, unknown>) || {};
  const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
  return legacy ? [legacy] : [];
};
