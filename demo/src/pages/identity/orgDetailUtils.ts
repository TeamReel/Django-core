import React from 'react';

// ── Period hierarchy helpers ──

export const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

export const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

export const isSeasonPeriod = (p: any): boolean => {
  // TeamReel hierarchy: Season is a root Period (no parent_period).
  // Do NOT infer by name; rely on parent/type.
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;

  // Guard against misconfigured root competitions.
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

  return true;
};

export const isCompetitionPeriod = (p: any): boolean => {
  const parentId = getPeriodParentId(p);
  if (parentId) return true;

  const type = getPeriodType(p);
  // Allow explicit typing when present
  return ['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type);
};

// ── Table style constants ──

export const compactTableStyle: React.CSSProperties = { tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' };
export const compactThStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.8rem', textAlign: 'left', borderBottom: '2px solid var(--app-border)' };
export const compactTdStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.85rem', verticalAlign: 'middle', borderBottom: '1px solid var(--app-border)' };
export const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
};
export const compactActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  flexWrap: 'wrap',
};

// ── Text / sort helpers ──

export const compareText = (a: unknown, b: unknown) =>
  String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });

export const normalizeRoleName = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const TEAMREEL_ROLE_RANK: Record<string, number> = {
  superadmin: 100,
  'land admin': 90,
  'club admin': 80,
  'team admin': 70,
  'team member': 60,
  supporter: 50,
  user: 10,
};

export const TEAMREEL_ROLE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'superadmin', label: 'Superadmin' },
  { key: 'land admin', label: 'Land Admin' },
  { key: 'club admin', label: 'Club Admin' },
  { key: 'team admin', label: 'Team Admin' },
  { key: 'team member', label: 'Team Member' },
  { key: 'supporter', label: 'Supporter' },
  { key: 'user', label: 'User' },
];

export const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);

export const mapMembershipToTeamreelRole = (membershipRoleRaw: unknown, hasParentProject: boolean) => {
  const membershipRole = normalizeRoleName(membershipRoleRaw);
  const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
  if (isAdminLike) return hasParentProject ? 'Team Admin' : 'Club Admin';
  return hasParentProject ? 'Team Member' : 'Supporter';
};

export const getTeamreelRoleDisplay = (user: any, orgMembership: any, projectMemberships: any[]) => {
  const roles: string[] = [];

  const isSuper = Boolean(user?.is_superuser) || normalizeRoleName(user?.role) === 'superadmin';
  if (isSuper) return { bestKey: 'superadmin', label: 'Superadmin', title: 'Superadmin' };

  const orgMembershipRole = normalizeRoleName(orgMembership?.role);
  if (orgMembershipRole === 'admin') roles.push('Land Admin');

  for (const pm of projectMemberships || []) {
    const roleRaw = String(pm?.role ?? '').trim();
    if (!roleRaw) continue;
    const parentIdRaw = pm?.project?.parent_id ?? pm?.project?.parent?.id ?? pm?.project?.parent_project_id;
    const hasParentProject = Boolean(parentIdRaw);
    roles.push(mapMembershipToTeamreelRole(roleRaw, hasParentProject));
  }

  const uniqueByKey = new Map<string, string>();
  for (const r of roles) {
    const key = normalizeRoleName(r);
    if (!key) continue;
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, r);
  }
  const unique = Array.from(uniqueByKey.values());
  if (unique.length === 0) return { bestKey: 'user', label: 'User', title: 'User' };

  const best = [...unique].sort(
    (a, b) => (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) - (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0)
  )[0];
  const title = [...unique].sort((a, b) => a.localeCompare(b)).join(', ');
  const label = unique.length === 1 ? best : `${best} +${unique.length - 1}`;
  return { bestKey: normalizeRoleName(best), label, title };
};

// ── API response envelope parser ──

export const parseListEnvelope = (raw: any): { results: any[]; count: number } => {
  const envelope = raw?.data ?? raw;
  const results =
    envelope?.results ??
    envelope?.data ??
    raw?.results ??
    raw?.data ??
    raw ??
    [];

  const list = Array.isArray(results) ? results : [];
  const count =
    typeof envelope?.count === 'number'
      ? envelope.count
      : typeof raw?.count === 'number'
        ? raw.count
        : list.length;
  return { results: list, count };
};
