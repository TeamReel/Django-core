/**
 * userEditTypes.ts — Shared types, constants, and RBAC utilities for UserEditModal.
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role?: string;
  organisations?: any[];
  projects?: any[];
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
    case 'Club Admin': return '#f59e0b';
    case 'Team Admin': return '#3b82f6';
    case 'Team Member': return '#10b981';
    case 'Supporter': return '#8b5cf6';
    case 'Land Admin': return '#ef4444';
    default: return '#6b7280';
  }
};

export function RbacBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
      color: '#fff', backgroundColor: getRbacColor(label), letterSpacing: '0.02em',
    }}>
      🔰 {label}
    </span>
  );
}

export const readFunctionalRolesFromMembership = (m: any): string[] => {
  const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
  if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);
  const meta = (m as any)?.metadata || {};
  const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
  return legacy ? [legacy] : [];
};
