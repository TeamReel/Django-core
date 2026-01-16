import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detailStyles';

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
  onEditMembership: (item: any) => void;
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
      (item as any)?.project_memberships ||
      (u as any)?.project_memberships ||
      (item as any)?.project_membership_details ||
      (u as any)?.project_membership_details ||
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
        (team as any)?.parent_id ?? (team as any)?.parent_project_id ?? (team as any)?.parent?.id
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

  return (
    <Card>
      <Table style={compactTableStyle}>
        <colgroup>
          {isTeamRoute ? (
            <>
              <col style={{ width: '260px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '330px' }} />
            </>
          ) : (
            <>
              <col style={{ width: '220px' }} />
              <col style={{ width: '240px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '330px' }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            {!isTeamRoute && <th style={compactThStyle}>Team</th>}
            <th style={compactThStyle}>User</th>
            <th style={compactThStyle}>Email</th>
            <th style={compactThStyle}>Role</th>
            <th style={compactThStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item: any) => {
            const userObj = item.user || item;
            const membershipId = String((item as any)?.organisation_membership_id || (item as any)?.organisationMembershipId || item.id);
            const hasOrgMembership = looksLikeUuid(membershipId);

            const roleDisplay = getRoleDisplay(item);

            const pms = (() => {
              const u = item?.user || item;
              const list =
                (item as any)?.project_memberships ||
                (u as any)?.project_memberships ||
                (item as any)?.project_membership_details ||
                (u as any)?.project_membership_details ||
                [];
              return Array.isArray(list) ? list : [];
            })();

            const rawProjectIds = Array.from(
              new Set(pms.map((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '')).filter(Boolean))
            );

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
              (team ? String((team as any).slug || (team as any).id || '') : '') ||
              (pmForTeam ? getTeamSlugFromPm(pmForTeam) : '') ||
              teamId;
            const teamName = (team ? String((team as any).name || '').trim() : '') || (pmForTeam ? getTeamNameFromPm(pmForTeam) : '') || teamId;

            const canViewUser = typeof onViewUser === 'function';
            const canViewMembership = hasOrgMembership && typeof onViewMembership === 'function';

            const teamEntries = teamIds
              .map((id) => {
                const t = teamById.get(String(id));
                const pm = pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(id));
                const name =
                  String((t as any)?.name || '').trim() ||
                  String(pm?.project?.name ?? pm?.project_name ?? '').trim() ||
                  id;
                const slugOrId =
                  String((t as any)?.slug || '').trim() ||
                  String(pm?.project?.slug ?? pm?.project_slug ?? '').trim() ||
                  id;
                return { id, name, slugOrId };
              })
              .filter((x) => Boolean(String(x.slugOrId || '').trim()));

            return (
              <tr key={String(userObj.id)}>
                {!isTeamRoute && (
                  <td style={compactTextTdStyle}>
                    {teamEntries.length > 1 ? (
                      <>
                        {teamEntries.map((t, idx) => (
                          <React.Fragment key={t.id}>
                            {idx > 0 ? '; ' : null}
                            <Link
                              to={`/organisations/${currentOrgSlug}/projects/${currentClubSlugOrId}/teams/${t.slugOrId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {t.name}
                            </Link>
                          </React.Fragment>
                        ))}
                      </>
                    ) : teamSlugOrId ? (
                      <Link
                        to={`/organisations/${currentOrgSlug}/projects/${currentClubSlugOrId}/teams/${teamSlugOrId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {teamName}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td style={compactTextTdStyle}>
                  <Link to={`/users/${userObj.id}`} className="text-blue-600 hover:underline">
                    {`${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email}
                  </Link>
                </td>
                <td style={compactTdStyle}>
                  <Badge variant="default" title={String(userObj.email || '')}>
                    {String(userObj.email || '—')}
                  </Badge>
                </td>
                <td style={compactTdStyle}>
                  <Badge variant="default" title={roleDisplay.title}>
                    {roleDisplay.label}
                  </Badge>
                </td>
                <td style={compactTdStyle}>
                  {userCanManageMembers ? (
                    <div style={compactActionsStyle}>
                      <button
                        type="button"
                        disabled={!canViewUser && !canViewMembership}
                        onClick={() => {
                          if (canViewUser) return onViewUser(userObj);
                          if (canViewMembership) return onViewMembership(membershipId);
                        }}
                        className="app-action-button"
                        style={actionButtonStyle('primary')}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={!hasOrgMembership}
                        onClick={() => {
                          if (!hasOrgMembership) return;
                          onEditMembership(item);
                        }}
                        className="app-action-button"
                        style={actionButtonStyle('warning')}
                        title={!hasOrgMembership ? 'User has no direct federation membership to edit' : undefined}
                      >
                        Edit
                      </button>
                      {onOpenAssignSeason ? (
                        <button
                          type="button"
                          onClick={() => onOpenAssignSeason(item)}
                          className="app-action-button"
                          style={actionButtonStyle('success')}
                          title={String(seasonId || '').trim() ? `Assign (filter: ${String(seasonId)})` : 'Assign to a season'}
                        >
                          Assign
                        </button>
                      ) : null}
                      {onOpenUnassignSeason ? (
                        <button
                          type="button"
                          onClick={() => onOpenUnassignSeason(item)}
                          className="app-action-button"
                          style={actionButtonStyle('neutral')}
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
                        className="app-action-button"
                        style={actionButtonStyle('danger')}
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
