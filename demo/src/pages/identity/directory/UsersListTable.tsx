/**
 * UsersListTable — data table (with batch action bar) for UsersList.
 *
 * Receives all data + helpers from `useUsersListData` via the `data` prop.
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import React from 'react';
import { Badge, Button, Card } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
  actionButtonStyle,
} from '../../../utils/directoryStyles';
import {
  linkButtonStyle,
  badgeButtonStyle,
  badgeNoBorderStyle,
} from './usersListTypes';
import { isUuid, getUserRoleDisplay } from './usersListHelpers';
import type { UsersListData } from './useUsersListData';

interface UsersListTableProps {
  data: UsersListData;
}

export const UsersListTable: React.FC<UsersListTableProps> = ({ data }) => {
  const {
    sortedUsers,
    selectedIds,
    setSelectedIds,
    allSelected,
    someSelected,
    handleSelectAll,
    handleSelectOne,
    setIsBatchModalOpen,
    orgLocked,
    clubLocked,
    teamLocked,
    scopedLocked,
    selectedTeamId,
    selectedClubId,
    preselectedTeamId,
    preselectedClubId,
    navigate,
    handleEditClick,
    setDetailUser,
    setIsDetailModalOpen,
    // Row helpers
    getFederationNameForRow,
    getClubAndTeamForRow,
    getOrganisationLinkForRow,
    getClubAndTeamLinksForRow,
    getUserDetailHrefForRow,
    getUserSeasonCompetitionMatchCounts,
    buildOrgScopedDirectoryHref,
    handleDeleteOrgMember,
    handleDeleteTeamMember,
  } = data;

  return (
    <Card>
      {/* ── Batch action bar ────────────────────────────── */}
      {someSelected && (
        <div
          className="flex-row flex-wrap gap-8 py-8 px-12 mb-4 rounded-6"
          style={{
            background: 'var(--app-surface-alt, rgba(59,130,246,0.08))',
            border: '1px solid var(--app-border, #333)',
          }}
        >
          <span
            className="fs-13 fw-500"
            style={{ color: 'var(--app-text, #fff)' }}
          >
            {selectedIds.size} geselecteerd
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
          >
            ⚡ Batch Actie ({selectedIds.size})
          </Button>
          <button
            className="ml-auto border-none cursor-pointer fs-13"
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: 'none',
              color: 'var(--app-muted-text, #888)',
              textDecoration: 'underline',
            }}
          >
            Deselecteren
          </button>
        </div>
      )}

      <div
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}
      >
        <Table style={compactTableStyle}>
          <thead>
            <tr>
              <th
                style={{
                  ...compactThStyle,
                  width: 36,
                  textAlign: 'center',
                  padding: '4px',
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                  style={{ accentColor: 'var(--color-blue-500)' }}
                  title={allSelected ? 'Deselecteer alles' : 'Selecteer alles'}
                />
              </th>
              {!orgLocked && (
                <th style={{ ...compactThStyle, width: '14%' }}>Federation</th>
              )}
              {!clubLocked && (
                <th style={{ ...compactThStyle, width: '14%' }}>Club</th>
              )}
              {!teamLocked && (
                <th style={{ ...compactThStyle, width: '14%' }}>Team</th>
              )}
              <th style={{ ...compactThStyle, width: '12%' }}>Username</th>
              <th style={{ ...compactThStyle, width: '14%' }}>Email</th>
              <th style={{ ...compactThStyle, width: '10%' }}>Season</th>
              <th style={{ ...compactThStyle, width: '10%' }}>Competition</th>
              <th style={{ ...compactThStyle, width: '10%' }}>Match</th>
              <th style={{ ...compactThStyle, width: '8%' }}>Role</th>
              <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
              <th style={{ ...compactThStyle, width: '10%' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedUsers.map((u) => {
              const orgName = getFederationNameForRow(u);
              const scoped = getClubAndTeamForRow(u);
              const orgHref = getOrganisationLinkForRow(u);
              const { clubHref, teamHref } = getClubAndTeamLinksForRow(u);

              // Membership ID logic
              let membershipId = null;
              if (teamLocked) {
                membershipId =
                  u?.project_membership_id ?? u?.membership?.id ?? null;
              } else {
                membershipId =
                  u?.membership?.id ?? u?.membership_id ?? u?.member_id ?? null;
              }
              const source = String(
                u?.membership?.source ?? u?.source ?? '',
              ).toLowerCase();
              const isDirectMembership =
                Boolean(membershipId) && isUuid(membershipId) && !source;
              const hasValidTeamMembershipId =
                teamLocked &&
                Boolean(u?.project_membership_id) &&
                isUuid(u?.project_membership_id);

              // Debug logging for team members
              if (teamLocked) {
                console.log('🔍 Team member check:', {
                  userId: u.id,
                  projectMembershipId: u?.project_membership_id,
                  membershipId,
                  teamLocked,
                  hasValidTeamMembershipId,
                  isDirectMembership,
                  source,
                });
              }

              const usernameLabel =
                String((u as any)?.username || '').trim() ||
                `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                (String(u.email || '').includes('@')
                  ? String(u.email || '').split('@')[0]
                  : String(u.email || ''));
              const roleDisplay = getUserRoleDisplay(
                u,
                selectedTeamId,
                selectedClubId,
              );
              const counts = getUserSeasonCompetitionMatchCounts(u);

              return (
                <tr
                  key={u.id}
                  style={
                    selectedIds.has(String(u.id))
                      ? { backgroundColor: 'rgba(59,130,246,0.08)' }
                      : undefined
                  }
                >
                  <td
                    style={{
                      ...compactTdStyle,
                      textAlign: 'center',
                      padding: '4px',
                      width: 36,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(String(u.id))}
                      onChange={() => handleSelectOne(String(u.id))}
                      className="cursor-pointer"
                      style={{ accentColor: 'var(--color-blue-500)' }}
                    />
                  </td>

                  {/* Federation */}
                  {!orgLocked && (
                    <td style={compactTextTdStyle} title={orgName}>
                      {orgHref && orgName !== '-' ? (
                        <button
                          style={linkButtonStyle}
                          onClick={() => navigate(orgHref)}
                        >
                          {orgName}
                        </button>
                      ) : (
                        orgName
                      )}
                    </td>
                  )}

                  {/* Club */}
                  {!clubLocked && (
                    <td style={compactTextTdStyle} title={scoped.club.title}>
                      {clubHref && scoped.club.label !== '-' ? (
                        <button
                          style={linkButtonStyle}
                          onClick={() => navigate(clubHref)}
                        >
                          {scoped.club.label}
                        </button>
                      ) : (
                        scoped.club.label
                      )}
                    </td>
                  )}

                  {/* Team */}
                  {!teamLocked && (
                    <td style={compactTextTdStyle} title={scoped.team.title}>
                      {teamHref && scoped.team.label !== '-' ? (
                        <button
                          style={linkButtonStyle}
                          onClick={() => navigate(teamHref)}
                        >
                          {scoped.team.label}
                        </button>
                      ) : (
                        scoped.team.label
                      )}
                    </td>
                  )}

                  {/* Username */}
                  <td style={compactTextTdStyle} className="font-medium">
                    {u?.id ? (
                      <button
                        style={linkButtonStyle}
                        onClick={() => {
                          const href = getUserDetailHrefForRow(u);
                          if (href) navigate(href);
                        }}
                        title="Open user"
                      >
                        {usernameLabel}
                      </button>
                    ) : (
                      usernameLabel
                    )}
                  </td>

                  {/* Email */}
                  <td
                    style={compactTextTdStyle}
                    title={String(u.email || '')}
                  >
                    {u.email}
                  </td>

                  {/* Season */}
                  <td style={compactTdStyle}>
                    <button
                      type="button"
                      style={badgeButtonStyle}
                      title="View seasons"
                      onClick={() => {
                        const href = buildOrgScopedDirectoryHref('seasons', u);
                        if (href) navigate(href);
                      }}
                    >
                      <Badge
                        variant="default"
                        style={scopedLocked ? badgeNoBorderStyle : undefined}
                      >
                        {counts.seasonsCount}
                      </Badge>
                    </button>
                  </td>

                  {/* Competition */}
                  <td style={compactTdStyle}>
                    <button
                      type="button"
                      style={badgeButtonStyle}
                      title="View competitions"
                      onClick={() => {
                        const href = buildOrgScopedDirectoryHref(
                          'competitions',
                          u,
                        );
                        if (href) navigate(href);
                      }}
                    >
                      <Badge
                        variant="default"
                        style={scopedLocked ? badgeNoBorderStyle : undefined}
                      >
                        {counts.competitionsCount}
                      </Badge>
                    </button>
                  </td>

                  {/* Match */}
                  <td style={compactTdStyle}>
                    <button
                      type="button"
                      style={badgeButtonStyle}
                      title="View matches"
                      onClick={() => {
                        const href = buildOrgScopedDirectoryHref('matches', u);
                        if (href) navigate(href);
                      }}
                    >
                      <Badge
                        variant="default"
                        style={scopedLocked ? badgeNoBorderStyle : undefined}
                      >
                        {counts.matchesCount}
                      </Badge>
                    </button>
                  </td>

                  {/* Role */}
                  <td style={compactTdStyle} title={roleDisplay.title}>
                    <Badge
                      variant="default"
                      style={scopedLocked ? badgeNoBorderStyle : undefined}
                    >
                      {roleDisplay.label}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td style={compactTdStyle}>
                    <Badge
                      variant={u.is_active ? 'success' : 'warning'}
                      style={scopedLocked ? badgeNoBorderStyle : undefined}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td style={compactTdStyle}>
                    <div style={compactActionsStyle}>
                      <button
                        onClick={() => {
                          setDetailUser(u);
                          setIsDetailModalOpen(true);
                        }}
                        style={actionButtonStyle('primary')}
                      >
                        View
                      </button>

                      {isDirectMembership && (
                        <button
                          onClick={() => handleEditClick(u)}
                          style={actionButtonStyle('warning')}
                        >
                          Edit
                        </button>
                      )}

                      {isDirectMembership && (
                        <button
                          onClick={() =>
                            handleDeleteOrgMember(
                              membershipId!,
                              usernameLabel,
                              orgName,
                            )
                          }
                          style={actionButtonStyle('danger')}
                        >
                          Delete
                        </button>
                      )}

                      {hasValidTeamMembershipId && (
                        <button
                          onClick={() =>
                            handleDeleteTeamMember(
                              u?.project_membership_id,
                              usernameLabel,
                              scoped.team.label,
                            )
                          }
                          style={actionButtonStyle('danger')}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};
