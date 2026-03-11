/**
 * Pure helpers for the detail/UsersTable component.
 *
 * None of these close over component state — they receive all data via arguments.
 */

import type { MembershipItem, MembershipItemUser, ProjectMembershipRecord, TeamRecord } from './UsersTable.types';

// ── Style constant ───────────────────────────────────────────────
export const noBorderBadgeStyle: React.CSSProperties = {
  border: 'none',
  borderColor: 'transparent',
  boxShadow: 'none',
  outline: 'none',
};

// ── Small pure utilities ─────────────────────────────────────────
export const looksLikeUuid = (value: string): boolean => {
  const v = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
};

export const normalizeRoleName = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase();

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

export const mapMembershipToTeamreelRole = (membershipRoleRaw: unknown, kind: 'team' | 'club'): string => {
  const membershipRole = normalizeRoleName(membershipRoleRaw);
  const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
  if (kind === 'team') return isAdminLike ? 'Team Admin' : 'Team Member';
  return isAdminLike ? 'Club Admin' : 'Supporter';
};

// ── Membership accessors ─────────────────────────────────────────
export const getMemberProjectMemberships = (item: MembershipItem): ProjectMembershipRecord[] => {
  const u: MembershipItem | MembershipItemUser = item?.user || item;
  const list =
    item?.project_memberships ||
    u?.project_memberships ||
    item?.project_membership_details ||
    u?.project_membership_details ||
    [];
  return Array.isArray(list) ? list : [];
};

export const getPmTeamId = (pm: ProjectMembershipRecord): string =>
  String(pm?.project_id ?? pm?.project?.id ?? '');

export const getPmClubId = (pm: ProjectMembershipRecord): string =>
  String(
    pm?.club_id ??
      pm?.club?.id ??
      pm?.project?.parent_id ??
      pm?.project?.parent?.id ??
      pm?.project?.parent_project_id ??
      '',
  );

// ── Role display resolution ──────────────────────────────────────
export function getRoleDisplay(
  item: MembershipItem,
  isTeamRoute: boolean,
  currentProjectId: string,
  currentClubId: string,
  teamById: Map<string, TeamRecord>,
): { label: string; title: string } {
  const userObj = item?.user || item;
  if (!userObj) return { label: '-', title: '' };

  const roles: string[] = [];

  const isSuper = Boolean(userObj?.is_superuser) || normalizeRoleName(userObj?.role) === 'superadmin';
  if (isSuper) return { label: 'Superadmin', title: 'Superadmin' };

  const orgMembershipRole = normalizeRoleName(item?.role);
  if (orgMembershipRole === 'admin') roles.push('Land Admin');

  const pms = getMemberProjectMemberships(item);
  const scopedPms = pms.filter((pm) => {
    if (isTeamRoute && currentProjectId) {
      return getPmTeamId(pm) === String(currentProjectId);
    }
    if (currentClubId) {
      const teamId = getPmTeamId(pm);
      const clubId = getPmClubId(pm);
      return String(teamId) === String(currentClubId) || String(clubId) === String(currentClubId);
    }
    return true;
  });

  for (const pm of scopedPms) {
    const roleRaw = pm?.role;
    if (!String(roleRaw ?? '').trim()) continue;
    const teamId = getPmTeamId(pm);
    const team = teamId ? teamById.get(String(teamId)) : null;
    const hasParent = Boolean(
      team?.parent_id ?? team?.parent_project_id ?? team?.parent?.id,
    );
    roles.push(mapMembershipToTeamreelRole(roleRaw, hasParent ? 'team' : 'club'));
  }

  const uniqueByKey = new Map<string, string>();
  for (const r of roles) {
    const key = normalizeRoleName(r);
    if (!key) continue;
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, r);
  }
  const unique = Array.from(uniqueByKey.values());
  if (unique.length === 0) return { label: 'User', title: 'User' };

  const best = [...unique].sort(
    (a, b) => (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) - (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0),
  )[0];
  const title = [...unique].sort((a, b) => a.localeCompare(b)).join(', ');
  const label = unique.length === 1 ? best : `${best} +${unique.length - 1}`;
  return { label, title };
}

// ── Functional role resolution ───────────────────────────────────
export const getFunctionalRolesForProjectMembership = (pm: ProjectMembershipRecord): string[] => {
  const roles = pm?.functional_roles ?? pm?.functionalRoles;
  if (Array.isArray(roles)) return roles.map((r) => String(r || '').trim()).filter(Boolean);

  const meta = pm?.metadata || {};
  const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
  return legacy ? [legacy] : [];
};

// ── Inline PM accessors used in the render ───────────────────────
export const getTeamNameFromPm = (pm: ProjectMembershipRecord): string =>
  String(pm?.project?.name ?? pm?.project_name ?? pm?.project?.title ?? '').trim();

export const getTeamSlugFromPm = (pm: ProjectMembershipRecord): string =>
  String(pm?.project?.slug ?? pm?.project_slug ?? '').trim();
