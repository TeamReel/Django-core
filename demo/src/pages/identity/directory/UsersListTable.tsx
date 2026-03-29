/**
 * UsersListTable — data table (with batch action bar) for UsersList.
 *
 * Receives all data + helpers from `useUsersListData` via the `data` prop.
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import React from 'react';
import { Zap } from 'lucide-react';
import { Badge } from '@django-core/design-system';
import { Table } from '@/shims/design-system';

import { isUuid, getUserRoleDisplay } from './usersListHelpers';
import { UsersMobileCards } from './UsersMobileCards';
import { UsersDesktopTable } from './UsersDesktopTable';
import styles from './UsersListTable.module.css';
import dp from './DirectoryPremium.module.css';
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
    <div className={dp.tableCard}>
      {/* ── Batch action bar ────────────────────────────── */}
      {someSelected && (
        <div className={dp.batchBar}>
          <span className={dp.batchLabel}>
            {selectedIds.size} geselecteerd
          </span>
          <button
            type="button"
            className={dp.batchBtn}
            onClick={() => setIsBatchModalOpen(true)}
          >
            <Zap size={14} /> Batch Actie ({selectedIds.size})
          </button>
          <button
            type="button"
            className={dp.deselectBtn}
            onClick={() => setSelectedIds(new Set())}
          >
            Deselecteren
          </button>
        </div>
      )}

      {/* ── Mobile card layout (< 640px) ── */}
            <UsersMobileCards data={data} />
      <UsersDesktopTable data={data} />
    </div>
  );
};
