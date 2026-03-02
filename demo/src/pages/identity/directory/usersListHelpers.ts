/**
 * Pure helper functions for UsersList.
 *
 * All functions are stateless — they receive explicit arguments instead of
 * relying on React component closures. Extracted during Phase 24.
 */
import { ADMIN_LIKE_PROJECT_ROLES, TEAMREEL_ROLE_RANK } from './usersListTypes';

// ────────────────────────────────────────────────────────────
//  Token / ID helpers
// ────────────────────────────────────────────────────────────

export const getCsrfToken = (): string =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';

export const isNumericId = (value: unknown): boolean =>
  /^\d+$/.test(String(value ?? '').trim());

export const isUuid = (value: unknown): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );

// ────────────────────────────────────────────────────────────
//  Role helpers
// ────────────────────────────────────────────────────────────

export const normalizeRoleName = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase();

export const parseAssignmentRoleLabel = (raw: unknown): string => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const beforeParen = s.split('(')[0]?.trim();
  return beforeParen || s;
};

export const mapMembershipToTeamreelRole = (
  membershipRoleRaw: unknown,
  hasParentProject: boolean,
): string => {
  const membershipRole = normalizeRoleName(membershipRoleRaw);
  const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
  if (isAdminLike) return hasParentProject ? 'Team Admin' : 'Club Admin';
  return hasParentProject ? 'Team Member' : 'Supporter';
};

// ────────────────────────────────────────────────────────────
//  Display helpers
// ────────────────────────────────────────────────────────────

export const summarizeNames = (
  names: string[],
): { label: string; title: string } => {
  const cleaned = names.map((n) => String(n || '').trim()).filter(Boolean);
  if (cleaned.length === 0) return { label: '-', title: '' };
  const unique = Array.from(new Set(cleaned));
  if (unique.length === 1) return { label: unique[0], title: unique[0] };
  return {
    label: `${unique[0]} +${unique.length - 1}`,
    title: unique.join(', '),
  };
};

/**
 * Derive all TeamReel RBAC role names for a user, scoped to the
 * currently selected team / club.
 */
export const getUserTeamreelRoleNames = (
  user: any,
  selectedTeamId: string,
  selectedClubId: string,
): string[] => {
  if (!user) return [];
  const roles: string[] = [];

  const isSuper =
    Boolean(user?.is_superuser) ||
    normalizeRoleName(user?.role) === 'superadmin';
  if (isSuper) {
    roles.push('Superadmin');
    return roles;
  }

  const membershipSource = normalizeRoleName(user?.membership?.source);
  const membershipRoleRaw = user?.membership?.role;
  if (membershipSource === 'assignment') {
    const assignmentLabel = parseAssignmentRoleLabel(membershipRoleRaw);
    if (assignmentLabel) roles.push(assignmentLabel);
  } else {
    const orgMembershipRole = normalizeRoleName(membershipRoleRaw);
    if (orgMembershipRole === 'admin') roles.push('Land Admin');
  }

  const memberships = Array.isArray(user?.project_memberships)
    ? user.project_memberships
    : [];
  const scopedMemberships = memberships.filter((m: any) => {
    const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
    if (!projectId) return false;
    if (selectedTeamId) return projectId === String(selectedTeamId);
    if (selectedClubId) return projectId === String(selectedClubId);
    return true;
  });

  for (const m of scopedMemberships) {
    const roleRaw = String(m?.role ?? '').trim();
    if (!roleRaw) continue;
    const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
    const hasParentProject = Boolean(parentIdRaw);
    roles.push(mapMembershipToTeamreelRole(roleRaw, hasParentProject));
  }

  const uniqueByKey = new Map<string, string>();
  for (const r of roles) {
    const key = normalizeRoleName(r);
    if (!key) continue;
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, r);
  }
  return Array.from(uniqueByKey.values());
};

/**
 * Derive the best role label + tooltip for a user row.
 */
export const getUserRoleDisplay = (
  user: any,
  selectedTeamId: string,
  selectedClubId: string,
): { label: string; title: string } => {
  if (!user) return { label: '-', title: '' };
  const roles = getUserTeamreelRoleNames(user, selectedTeamId, selectedClubId);
  if (roles.length > 0) {
    const best = [...roles].sort(
      (a, b) =>
        (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) -
        (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0),
    )[0];
    const title = [...roles]
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
    const label =
      roles.length === 1 ? best : `${best} +${roles.length - 1}`;
    return { label, title };
  }
  return { label: 'User', title: 'User' };
};
