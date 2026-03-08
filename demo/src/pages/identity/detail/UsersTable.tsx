import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';

type Props = {
  isTeamRoute: boolean;
  pageItems: any[];
  currentOrgSlug: string;
  currentClubSlugOrId: string;
  currentClubId: string;
  currentProjectId: string;
  teamById: Map<string, any>;
  userCanManageMembers: boolean;
  seasonId?: string;
  onOpenAssignSeason?: (item: any) => void;
  onOpenUnassignSeason?: (item: any) => void;
  onViewUser?: (user: any) => void;
  onViewMembership: (membershipId: string) => void;
  onEditMembership: (args: { item: any; teamId?: string }) => void;
  onRemoveMembership: (membershipId: string, email: string) => Promise<void>;
};

export default function UsersTable({
  isTeamRoute,
  pageItems,
  currentOrgSlug,
  currentClubSlugOrId,
  currentClubId,
  currentProjectId,
  teamById,
  userCanManageMembers,
  seasonId,
  onOpenAssignSeason,
  onOpenUnassignSeason,
  onViewUser,
  onViewMembership,
  onEditMembership,
  onRemoveMembership,
}: Props) {
  const noBorderBadgeStyle: React.CSSProperties = {
    border: 'none',
    borderColor: 'transparent',
    boxShadow: 'none',
    outline: 'none',
  };

  const looksLikeUuid = (value: string): boolean => {
    const v = String(value || '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  };
  const normalizeRoleName = (value: unknown) => String(value ?? '').trim().toLowerCase();
  const TEAMREEL_ROLE_RANK: Record<string, number> = {
    superadmin: 100,
    'land admin': 90,
    'club admin': 80,
    'team admin': 70,
    'team member': 60,
    supporter: 50,
    user: 10,
  };

  const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);

  const mapMembershipToTeamreelRole = (membershipRoleRaw: unknown, kind: 'team' | 'club') => {
    const membershipRole = normalizeRoleName(membershipRoleRaw);
    const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
    if (kind === 'team') return isAdminLike ? 'Team Admin' : 'Team Member';
    return isAdminLike ? 'Club Admin' : 'Supporter';
  };

  const getMemberProjectMemberships = (item: any): any[] => {
    const u = item?.user || item;
    const list =
      item?.project_memberships ||
      u?.project_memberships ||
      item?.project_membership_details ||
      u?.project_membership_details ||
      [];
    return Array.isArray(list) ? list : [];
  };

  const getPmTeamId = (pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '');
  const getPmClubId = (pm: any) =>
    String(
      pm?.club_id ??
        pm?.club?.id ??
        pm?.project?.parent_id ??
        pm?.project?.parent?.id ??
        pm?.project?.parent_project_id ??
        ''
    );

  // seasonId is optional context (e.g. current filter) but the actual Assign/Unassign
  // selection happens in the modal, not inline.

  const getRoleDisplay = (item: any): { label: string; title: string } => {
    const userObj = item?.user || item;
    if (!userObj) return { label: '-', title: '' };

    const roles: string[] = [];

    const isSuper = Boolean(userObj?.is_superuser) || normalizeRoleName(userObj?.role) === 'superadmin';
    if (isSuper) return { label: 'Superadmin', title: 'Superadmin' };

    // Organisation membership role: admin == Land Admin
    const orgMembershipRole = normalizeRoleName(item?.role);
    if (orgMembershipRole === 'admin') roles.push('Land Admin');

    const pms = getMemberProjectMemberships(item);
    const scopedPms = pms.filter((pm: any) => {
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
        team?.parent_id ?? team?.parent_project_id ?? team?.parent?.id
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
      (a, b) => (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) - (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0)
    )[0];
    const title = [...unique].sort((a, b) => a.localeCompare(b)).join(', ');
    const label = unique.length === 1 ? best : `${best} +${unique.length - 1}`;
    return { label, title };
  };

  const getFunctionalRolesForProjectMembership = (pm: any): string[] => {
    const roles = pm?.functional_roles ?? pm?.functionalRoles;
    if (Array.isArray(roles)) return roles.map((r) => String(r || '').trim()).filter(Boolean);

    const meta = pm?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  return (
    <Card>
      <Table className="detail-table">
        <colgroup>
          {isTeamRoute ? (
            <>
              <col style={{ width: '260px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '330px' }} />
            </>
          ) : (
            <>
              <col style={{ width: '260px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '330px' }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th className="detail-th">User</th>
            <th className="detail-th">Email</th>
            <th className="detail-th">Role</th>
            {isTeamRoute ? <th className="detail-th">Functional</th> : null}
            <th className="detail-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item: any) => {
            const userObj = item.user || item;
            const membershipId = String(item?.organisation_membership_id || item?.organisationMembershipId || item.id);
            const hasOrgMembership = looksLikeUuid(membershipId);

            const roleDisplay = getRoleDisplay(item);

            const pms = (() => {
              const u = item?.user || item;
              const list =
                item?.project_memberships ||
                u?.project_memberships ||
                item?.project_membership_details ||
                u?.project_membership_details ||
                [];
              return Array.isArray(list) ? list : [];
            })();

            const rawProjectIds = Array.from(
              new Set(pms.map((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '')).filter(Boolean))
            );

            const scopedTeamPm = isTeamRoute
              ? pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(currentProjectId))
              : null;
            const functionalRoles = scopedTeamPm ? getFunctionalRolesForProjectMembership(scopedTeamPm) : [];

            // The People table "Team" column should show teams, not the club.
            // Users can have a direct club membership AND a team membership (or multiple season memberships
            // for the same team). We filter out the club project id so that multiple seasons don't look like
            // "multiple teams".
            const teamIds = rawProjectIds.filter((id) => {
              if (!id) return false;
              if (currentClubId && String(id) === String(currentClubId)) return false;
              // Prefer IDs we can resolve to a team.
              if (teamById.has(String(id))) return true;

              // Fallback: if the membership payload includes project info with a parent, treat it as a team.
              const pm = pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(id));
              const parentId = String(pm?.project?.parent_id ?? pm?.project?.parent_project_id ?? pm?.project?.parent?.id ?? '').trim();
              if (parentId && currentClubId && parentId === String(currentClubId)) return true;
              return false;
            });

            const teamId = teamIds.length === 1 ? teamIds[0] : '';

            const getTeamNameFromPm = (pm: any): string =>
              String(pm?.project?.name ?? pm?.project_name ?? pm?.project?.title ?? '').trim();
            const getTeamSlugFromPm = (pm: any): string =>
              String(pm?.project?.slug ?? pm?.project_slug ?? '').trim();

            const team = teamId ? teamById.get(String(teamId)) : null;
            const pmForTeam = teamId ? pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(teamId)) : null;
            const teamSlugOrId =
              (team ? String(team.slug || team.id || '') : '') ||
              (pmForTeam ? getTeamSlugFromPm(pmForTeam) : '') ||
              teamId;
            const teamName = (team ? String(team.name || '').trim() : '') || (pmForTeam ? getTeamNameFromPm(pmForTeam) : '') || teamId;

            const canViewUser = typeof onViewUser === 'function';
            const canViewMembership = hasOrgMembership && typeof onViewMembership === 'function';

            const teamEntries = teamIds
              .map((id) => {
                const t = teamById.get(String(id));
                const pm = pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(id));
                const name =
                  String(t?.name || '').trim() ||
                  String(pm?.project?.name ?? pm?.project_name ?? '').trim() ||
                  id;
                const slugOrId =
                  String(t?.slug || '').trim() ||
                  String(pm?.project?.slug ?? pm?.project_slug ?? '').trim() ||
                  id;
                return { id, name, slugOrId };
              })
              .filter((x) => Boolean(String(x.slugOrId || '').trim()));

            return (
              <tr key={String(userObj.id)}>
                <td className="detail-td-text">
                  <Link to={`/users/${userObj.id}`} className="text-blue-600 hover:underline">
                    {`${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email}
                  </Link>
                </td>
                <td className="detail-td">
                  <Badge variant="default" title={String(userObj.email || '')} style={noBorderBadgeStyle}>
                    {String(userObj.email || '—')}
                  </Badge>
                </td>
                <td className="detail-td">
                  <Badge variant="default" title={roleDisplay.title} style={noBorderBadgeStyle}>
                    {roleDisplay.label}
                  </Badge>
                </td>
                {isTeamRoute ? (
                  <td className="detail-td">
                    {functionalRoles.length ? (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {functionalRoles.map((r) => (
                          <Badge key={r} variant="default" style={noBorderBadgeStyle}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
                <td className="detail-td">
                  {userCanManageMembers ? (
                    <div className="detail-actions">
                      <button
                        type="button"
                        disabled={!canViewUser && !canViewMembership}
                        onClick={() => {
                          if (canViewUser) return onViewUser(userObj);
                          if (canViewMembership) return onViewMembership(membershipId);
                        }}
                        className="app-action-button action-btn action-btn-primary"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={!userCanManageMembers}
                        onClick={() => {
                          const scopedTeamId = isTeamRoute ? String(currentProjectId || '').trim() : String(teamId || '').trim();
                          onEditMembership({ item, teamId: scopedTeamId || undefined });
                        }}
                        className="app-action-button action-btn action-btn-warning"
                        title={
                          isTeamRoute
                            ? 'Edit team access + functional roles'
                            : teamId
                              ? 'Edit team access + functional roles'
                              : hasOrgMembership
                                ? 'Edit federation role'
                                : 'Select a team (or open a user) to edit roles'
                        }
                      >
                        Edit
                      </button>
                      {onOpenAssignSeason ? (
                        <button
                          type="button"
                          onClick={() => onOpenAssignSeason(item)}
                          className="app-action-button action-btn action-btn-success"
                          title={String(seasonId || '').trim() ? `Assign (filter: ${String(seasonId)})` : 'Assign to a season'}
                        >
                          Assign
                        </button>
                      ) : null}
                      {onOpenUnassignSeason ? (
                        <button
                          type="button"
                          onClick={() => onOpenUnassignSeason(item)}
                          className="app-action-button action-btn action-btn-neutral"
                          title={String(seasonId || '').trim() ? `Unassign (filter: ${String(seasonId)})` : 'Unassign from a season'}
                        >
                          Unassign
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={!hasOrgMembership}
                        onClick={async () => {
                          if (!hasOrgMembership) return;
                          if (!window.confirm(`Remove ${userObj.email} from federation?`)) return;
                          await onRemoveMembership(membershipId, String(userObj.email || ''));
                        }}
                        className="app-action-button action-btn action-btn-danger"
                        title={!hasOrgMembership ? 'User has no direct federation membership to remove' : undefined}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
