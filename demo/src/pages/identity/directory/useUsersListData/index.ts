/**
 * useUsersListData — Orchestrator hook
 * Composes state, handlers, derived values, and fetchers.
 */
import { useEffect } from 'react';
import { api } from '@/api/client';
import type { User, ProjectOption, UsersListProps, OrganisationOption } from '../usersListTypes';
import { AVAILABLE_ROLES } from '../usersListTypes';
import { useUsersListFetchers } from '../useUsersListFetchers';
import { useUsersListState } from './state';
import { useUsersListHandlers, type UserRow } from './handlers';
import { useUsersListDerived } from './derived';
import {
  getUserSeasonCompetitionMatchCounts as _getUserSCMC,
  buildOrgScopedDirectoryHref as _buildHref,
  getFederationNameForRow as _getFedName,
  getOrganisationLinkForRow as _getOrgLink,
  getUserDetailHrefForRow,
  getClubAndTeamLinksForRow as _getCTLinks,
  getClubAndTeamForRow as _getCTForRow,
  type UsersRowContext,
} from '../usersListRowHelpers';

export type { UserRow } from './handlers';
export { isUuid } from '../usersListHelpers';

export type UseUsersListDataReturn = ReturnType<typeof useUsersListData>;
export type UsersListData = UseUsersListDataReturn;

export function useUsersListData(props: UsersListProps) {
  const state = useUsersListState(props);
  const { preselectedOrgId, preselectedClubId, preselectedTeamId } = props;

  // Data fetching
  const fetchers = useUsersListFetchers({
    selectedOrgId: state.selectedOrgId,
    selectedClubId: state.selectedClubId,
    selectedTeamId: state.selectedTeamId,
    statusFilter: state.statusFilter,
    roleFilter: state.roleFilter,
    isSuperAdmin: state.isSuperAdmin,
    myOrganisations: state.myOrganisations,
    contextOrgSlug: state.context.organisation?.slug,
    teamLocked: state.teamLocked,
    preselectedTeamId,
    preselectedClubId,
  });

  const { organisations, clubs, teams, users, setUsers, isLoading, error, refreshData } = fetchers;

  // Derived values
  const derived = useUsersListDerived(
    users,
    clubs,
    teams,
    state.selectedIds,
    state.setSelectedIds,
  );

  // Handlers
  const handlers = useUsersListHandlers({
    selectedOrgId: state.selectedOrgId,
    clubLocked: state.clubLocked,
    teamLocked: state.teamLocked,
    orgLocked: state.orgLocked,
    isSuperAdmin: state.isSuperAdmin,
    preselectedTeamId,
    organisations,
    contextOrgSlug: state.context.organisation?.slug,
    setSelectedOrgId: state.setSelectedOrgId,
    setSelectedClubId: state.setSelectedClubId,
    setSelectedTeamId: state.setSelectedTeamId,
    setStatusFilter: state.setStatusFilter,
    setRoleFilter: state.setRoleFilter,
    setIsAddMemberOpen: state.setIsAddMemberOpen,
    setSearchParams: (params: URLSearchParams | Record<string, string>) => state.setSearchParams(params),
    setEditUser: state.setEditUser,
    setIsEditModalOpen: state.setIsEditModalOpen,
    setUsers: setUsers as any,
  });

  // Filter setup effects
  useEffect(() => {
    if (preselectedOrgId) {
      state.setSelectedOrgId(preselectedOrgId);
      return;
    }
    const orgParam = state.searchParams.get('org_id');
    if (orgParam) {
      state.setSelectedOrgId(orgParam);
      return;
    }
    if (state.context.organisation?.id) {
      state.setSelectedOrgId(String(state.context.organisation.id));
    }
  }, [preselectedOrgId, state.context.organisation?.id, state.searchParams]);

  useEffect(() => {
    if (preselectedClubId) state.setSelectedClubId(String(preselectedClubId));
  }, [preselectedClubId]);

  useEffect(() => {
    if (preselectedTeamId) state.setSelectedTeamId(String(preselectedTeamId));
  }, [preselectedTeamId]);

  // Row context
  const rowCtx: UsersRowContext = {
    selectedOrgId: state.selectedOrgId,
    selectedClubId: state.selectedClubId,
    selectedTeamId: state.selectedTeamId,
    organisations,
    clubsById: derived.clubsById,
    teamsById: derived.teamsById,
    teamIdsByClubId: derived.teamIdsByClubId,
    getSelectedOrgSlug: handlers.getSelectedOrgSlug,
  };

  // handleSaveUser with editUser closure
  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!state.editUser) return;
    await api.patch(`/admin/users/${state.editUser.id}/`, updatedData);
  };

  return {
    isSuperAdmin: state.isSuperAdmin,
    orgLocked: state.orgLocked,
    clubLocked: state.clubLocked,
    teamLocked: state.teamLocked,
    scopedLocked: state.scopedLocked,
    sortedUsers: derived.sortedUsers,
    isLoading,
    error,
    hasUsers: users.length > 0,
    organisations,
    clubs,
    teams,
    availableRoles: AVAILABLE_ROLES as unknown as string[],
    selectedOrgId: state.selectedOrgId,
    selectedClubId: state.selectedClubId,
    selectedTeamId: state.selectedTeamId,
    statusFilter: state.statusFilter,
    roleFilter: state.roleFilter,
    onOrgChange: handlers.onOrgChange,
    onClubChange: handlers.onClubChange,
    onTeamChange: handlers.onTeamChange,
    onStatusChange: state.setStatusFilter,
    onRoleChange: state.setRoleFilter,
    onClearFilters: handlers.onClearFilters,
    onAddMember: handlers.onAddMember,
    selectedIds: state.selectedIds,
    setSelectedIds: state.setSelectedIds,
    allSelected: derived.allSelected,
    someSelected: derived.someSelected,
    handleSelectAll: derived.handleSelectAll,
    handleSelectOne: derived.handleSelectOne,
    getSelectedUsers: derived.getSelectedUsers,
    detailUser: state.detailUser,
    isDetailModalOpen: state.isDetailModalOpen,
    setDetailUser: state.setDetailUser,
    setIsDetailModalOpen: state.setIsDetailModalOpen,
    editUser: state.editUser,
    isEditModalOpen: state.isEditModalOpen,
    setIsEditModalOpen: state.setIsEditModalOpen,
    isAddMemberOpen: state.isAddMemberOpen,
    setIsAddMemberOpen: state.setIsAddMemberOpen,
    isBatchModalOpen: state.isBatchModalOpen,
    setIsBatchModalOpen: state.setIsBatchModalOpen,
    handleEditClick: handlers.handleEditClick,
    handleSaveUser,
    refreshData,
    handleDeleteOrgMember: handlers.handleDeleteOrgMember,
    handleDeleteTeamMember: handlers.handleDeleteTeamMember,
    navigate: state.navigate,
    getSelectedOrgSlug: handlers.getSelectedOrgSlug,
    getUserSeasonCompetitionMatchCounts: (u: UserRow) => _getUserSCMC(u as any, rowCtx),
    buildOrgScopedDirectoryHref: (section: 'seasons' | 'competitions' | 'matches', u: UserRow) => _buildHref(section, u as any, rowCtx),
    getFederationNameForRow: (u: UserRow) => _getFedName(u as any, rowCtx),
    getOrganisationLinkForRow: (u: UserRow) => _getOrgLink(u as any, rowCtx),
    getUserDetailHrefForRow,
    getClubAndTeamLinksForRow: (u: UserRow) => _getCTLinks(u as any, rowCtx),
    getClubAndTeamForRow: (u: UserRow) => _getCTForRow(u as any, rowCtx),
    preselectedClubId,
    preselectedTeamId,
  };
}
