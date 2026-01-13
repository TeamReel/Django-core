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
  onViewMembership,
  onEditMembership,
  onRemoveMembership,
}: Props) {
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
            const membershipId = String(item.id);

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

            const teamIds = Array.from(
              new Set(pms.map((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '')).filter(Boolean))
            );
            const teamId = teamIds.length === 1 ? teamIds[0] : '';
            const team = teamId ? teamById.get(String(teamId)) : null;
            const teamSlugOrId = team ? (team as any).slug || String((team as any).id) : teamId;

            return (
              <tr key={String(userObj.id)}>
                {!isTeamRoute && (
                  <td style={compactTextTdStyle}>
                    {teamIds.length > 1 ? (
                      <span title={teamIds.map((id) => teamById.get(String(id))?.name || id).join(', ')}>Multiple</span>
                    ) : teamSlugOrId ? (
                      <Link
                        to={`/organisations/${currentOrgSlug}/projects/${currentClubSlugOrId}/teams/${teamSlugOrId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {team?.name || teamId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td style={compactTextTdStyle}>
                  <Link to={`/organisations/${currentOrgSlug}/users/${userObj.id}`} className="text-blue-600 hover:underline">
                    {`${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email}
                  </Link>
                </td>
                <td style={compactTextTdStyle}>{userObj.email}</td>
                <td style={compactTdStyle}>
                  <Badge variant="default" title={roleDisplay.title}>
                    {roleDisplay.label}
                  </Badge>
                </td>
                <td style={compactTdStyle}>
                  {userCanManageMembers ? (
                    <div style={compactActionsStyle}>
                      <button onClick={() => onViewMembership(membershipId)} style={actionButtonStyle('primary')}>
                        View
                      </button>
                      <button onClick={() => onEditMembership(item)} style={actionButtonStyle('warning')}>
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Remove ${userObj.email} from federation?`)) return;
                          await onRemoveMembership(membershipId, String(userObj.email || ''));
                        }}
                        style={actionButtonStyle('danger')}
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
