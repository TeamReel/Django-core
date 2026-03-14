import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import styles from './UsersTable.module.css';
import type { UsersTableProps } from './UsersTable.types';
import {
  noBorderBadgeStyle,
  looksLikeUuid,
  getRoleDisplay,
  getMemberProjectMemberships,
  getPmTeamId,
  getFunctionalRolesForProjectMembership,
  getTeamNameFromPm,
  getTeamSlugFromPm,
} from './UsersTable.helpers';

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
}: UsersTableProps) {
  return (
    <Card>
      <Table className="detail-table">
        <colgroup>
          {isTeamRoute ? (
            <>
              <col className={styles.colUser} />
              <col className={styles.colEmail} />
              <col className={styles.colRole} />
              <col className={styles.colFunctional} />
              <col className={styles.colActions} />
            </>
          ) : (
            <>
              <col className={styles.colUser} />
              <col className={styles.colEmail} />
              <col className={styles.colRole} />
              <col className={styles.colActions} />
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
          {pageItems.map((item) => {
            const userObj = item.user || item;
            const membershipId = String(item?.organisation_membership_id || item?.organisationMembershipId || item.id);
            const hasOrgMembership = looksLikeUuid(membershipId);

            const roleDisplay = getRoleDisplay(item, isTeamRoute, currentProjectId, currentClubId, teamById);

            const pms = getMemberProjectMemberships(item);

            const rawProjectIds = Array.from(
              new Set(pms.map((pm) => String(pm?.project_id ?? pm?.project?.id ?? '')).filter(Boolean))
            );

            const scopedTeamPm = isTeamRoute
              ? pms.find((pm) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(currentProjectId))
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
              const pm = pms.find((p) => String(p?.project_id ?? p?.project?.id ?? '') === String(id));
              const parentId = String(pm?.project?.parent_id ?? pm?.project?.parent_project_id ?? pm?.project?.parent?.id ?? '').trim();
              if (parentId && currentClubId && parentId === String(currentClubId)) return true;
              return false;
            });

            const teamId = teamIds.length === 1 ? teamIds[0] : '';

            const team = teamId ? teamById.get(String(teamId)) : null;
            const pmForTeam = teamId ? pms.find((pm) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(teamId)) : null;
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
                const pm = pms.find((p) => String(p?.project_id ?? p?.project?.id ?? '') === String(id));
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
                      <div className={styles.functionalRolesRow}>
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
