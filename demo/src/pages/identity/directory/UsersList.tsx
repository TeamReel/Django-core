/**
 * UsersList — thin orchestration shell.
 *
 * All state, data-fetching, and helper logic lives in `useUsersListData`.
 * All presentation is delegated to `UsersListFilters` and `UsersListTable`.
 *
 * Refactored during Phase 24 of the frontend refactoring plan.
 */
import React from 'react';
import { Alert } from '@django-core/design-system';
import { SkeletonList } from '@/components/Skeleton';
import SmartEmptyState from '@/components/SmartEmptyState';
import UserDetailModal from '../UserDetailModal';
import UserEditModal from '../UserEditModal';
import AddMemberModal from '../AddMemberModal';
import { MemberBatchActionModal } from '../MemberBatchActionModal';
import type { UsersListProps } from './usersListTypes';
import { useUsersListData } from './useUsersListData';
import { UsersListFilters } from './UsersListFilters';
import { UsersListTable } from './UsersListTable';

export const UsersList: React.FC<UsersListProps> = (props) => {
  const data = useUsersListData(props);

  const {
    // Filter props
    isSuperAdmin, orgLocked, clubLocked, teamLocked,
    selectedOrgId, selectedClubId, selectedTeamId,
    statusFilter, roleFilter,
    organisations, clubs, teams, availableRoles,
    onOrgChange, onClubChange, onTeamChange,
    onStatusChange, onRoleChange, onClearFilters, onAddMember,
    // Data
    isLoading, error, hasUsers, sortedUsers,
    // Modals
    detailUser, isDetailModalOpen, setIsDetailModalOpen,
    editUser, isEditModalOpen, setIsEditModalOpen,
    isAddMemberOpen, setIsAddMemberOpen,
    isBatchModalOpen, setIsBatchModalOpen,
    // Handlers
    handleSaveUser, getSelectedUsers, refreshData,
    setSelectedIds,
    getSelectedOrgSlug,
    // Props passthrough
    preselectedClubId, preselectedTeamId,
  } = data;

  const resolvedOrgSlug =
    organisations.find(
      (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
    )?.slug || selectedOrgId;

  return (
    <div>
      <UsersListFilters
        isSuperAdmin={isSuperAdmin}
        orgLocked={orgLocked}
        clubLocked={clubLocked}
        teamLocked={teamLocked}
        filterState={{ selectedOrgId, selectedClubId, selectedTeamId, statusFilter, roleFilter }}
        filterHandlers={{ onOrgChange, onClubChange, onTeamChange, onStatusChange, onRoleChange, onClearFilters }}
        filterOptions={{ organisations, clubs, teams, availableRoles }}
        onAddMember={onAddMember}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={refreshData}
        contextLevel={teamLocked ? 'team' : clubLocked ? 'club' : 'organisation'}
        orgSlug={resolvedOrgSlug}
        clubProjectId={preselectedClubId}
        teamProjectId={preselectedTeamId}
      />

      {isLoading && <SkeletonList count={5} variant="row" />}
      {error && <Alert variant="error">{error}</Alert>}
      {!isLoading && !error && !hasUsers && (
        <SmartEmptyState type="users" hideActions />
      )}

      <MemberBatchActionModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        members={getSelectedUsers() as any}
        contextLevel={teamLocked ? 'team' : clubLocked ? 'club' : 'organisation'}
        clubProjectId={preselectedClubId}
        teamProjectId={preselectedTeamId}
        orgSlug={resolvedOrgSlug}
        teams={teams}
        onComplete={() => {
          setSelectedIds(new Set());
          refreshData();
        }}
      />

      {!isLoading && !error && hasUsers && <UsersListTable data={data} />}

      <UserDetailModal
        user={detailUser as any}
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <UserEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editUser as any}
        onSave={handleSaveUser as any}
        onSaved={refreshData}
        organisationSlug={String(getSelectedOrgSlug() || '')}
        scopeProjectKey={preselectedTeamId || preselectedClubId || ''}
      />
    </div>
  );
};
