/**
 * useUsersData — Orchestrator hook for UsersPage.
 * Split into focused modules for maintainability.
 */
import { useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { api } from '../../../api';
import { useUsersState } from './state';
import { useUsersFetchers } from './fetchers';
import { normalizeRole, mapMembershipRoleToDisplayRole } from './helpers';
import type { UseUsersDataReturn, User, UserListEntry, UserProjectRef } from './types';

export type { UseUsersDataReturn, User, UserListEntry, UserProjectRef, OrganisationOption, ProjectOption } from './types';
export { getCookie, normalizeRole, mapMembershipRoleToDisplayRole } from './helpers';

export function useUsersData(): UseUsersDataReturn {
  const state = useUsersState();

  const { fetchUsers } = useUsersFetchers({
    user: state.user,
    isSuperAdmin: state.isSuperAdmin,
    waitingForOrgContext: state.waitingForOrgContext,
    context: state.context,
    orgIdParam: state.orgIdParam,
    projectIdParam: state.projectIdParam,
    page: state.page,
    limit: state.limit,
    selectedOrgId: state.selectedOrgId,
    selectedClubKey: state.selectedClubKey,
    selectedTeamKey: state.selectedTeamKey,
    statusFilter: state.statusFilter,
    roleFilter: state.roleFilter,
    setOrganisations: state.setOrganisations,
    setClubs: state.setClubs,
    setTeams: state.setTeams,
    setAvailableRoles: state.setAvailableRoles,
    setUsers: state.setUsers,
    setTotal: state.setTotal,
    setIsLoading: state.setIsLoading,
    setError: state.setError,
  });

  // ── Initialize filters ─────────────────────────────────────────────
  useEffect(() => {
    if (!state.hasInitializedFilters) {
      if (state.orgIdParam) {
        state.setSelectedOrgId(state.orgIdParam);
      } else if (state.context.organisation && !state.isSuperAdmin) {
        state.setSelectedOrgId(String(state.context.organisation.id));
      }
      state.setHasInitializedFilters(true);
    }
  }, [state.hasInitializedFilters, state.orgIdParam, state.context.organisation, state.isSuperAdmin, state.setSelectedOrgId, state.setHasInitializedFilters]);

  // ── Role helpers ───────────────────────────────────────────────────
  const getScopedRoleForProjectFilter = useCallback(
    (userProjects: UserProjectRef[]) => {
      if (state.selectedTeamKey) {
        const match = userProjects.find((p) => String(p.slug || p.id) === String(state.selectedTeamKey));
        if (match?.role) return mapMembershipRoleToDisplayRole(String(match.role), Boolean(match.parent));
        return null;
      }

      if (state.selectedClubKey) {
        const club = state.clubs.find(c => String(c.slug || c.id) === String(state.selectedClubKey));
        const relevant = userProjects.filter((p) => {
          if (club && String(p.id) === String(club.id)) return true;
          if (club && p.parent && String(p.parent) === String(club.id)) return true;
          if (club && p.parent_name && club.name && String(p.parent_name) === String(club.name)) return true;
          return false;
        });

        if (!relevant.length) return null;

        const priority = new Map<string, number>([
          ['Club Admin', 1], ['Team Admin', 2], ['Team Staff', 3],
          ['Team Member', 4], ['Viewer', 5], ['User', 6],
        ]);

        let best: string | null = null;
        let bestRank = 999;
        for (const p of relevant) {
          const mapped = mapMembershipRoleToDisplayRole(String(p.role || ''), Boolean(p.parent));
          const rank = priority.get(mapped) ?? 999;
          if (rank < bestRank) { best = mapped; bestRank = rank; }
        }
        return best;
      }

      return null;
    },
    [state.selectedTeamKey, state.selectedClubKey, state.clubs],
  );

  // ── Pagination ─────────────────────────────────────────────────────
  const totalPages = Math.ceil(state.total / state.limit);
  const currentPage = parseInt(state.page);

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(state.searchParams);
    nextParams.set('page', newPage.toString());
    state.setSearchParams(nextParams);
  };

  // ── User actions ───────────────────────────────────────────────────
  const handleEditClick = (item: UserListEntry) => {
    const userData = item.user || item;
    state.setEditingUser(userData as User);
    state.setIsModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!state.editingUser) return;
    try {
      await api.patch(`/admin/users/${state.editingUser.id}/`, updatedData);
    } catch (e) {
      logger.error('Failed to save user changes', e);
      alert('Failed to save user changes');
      throw e;
    }
  };

  // ── Breadcrumbs ────────────────────────────────────────────────────
  const breadcrumbs: Array<{ label: string; href?: string; onClick?: () => void; current?: boolean }> = [{ label: 'Dashboard', href: '/dashboard' }];
  if (state.orgIdParam) {
    breadcrumbs.push({ label: 'Federations', onClick: () => state.navigate('/federations') });
    breadcrumbs.push({
      label: (state.myOrganisations.find(o => o.slug === state.orgIdParam || o.id === state.orgIdParam) || state.context.organisation)?.name || 'Federation',
      onClick: () => state.navigate(`/organisations/${state.orgIdParam}`),
    });
    breadcrumbs.push({ label: 'Users', current: true });
  } else {
    breadcrumbs.push({ label: 'Users', current: true });
  }

  // ── Client-side filtering (role only) ──────────────────────────────
  const filteredUsers = state.users.filter((item: UserListEntry) => {
    const u = item.user || item;
    const userProjects = u.projects || [];
    const scopedRole = getScopedRoleForProjectFilter(userProjects);
    const systemRole = scopedRole || u.role || '';
    if (state.roleFilter && normalizeRole(systemRole) !== normalizeRole(state.roleFilter)) return false;
    return true;
  });

  return {
    // Context + navigation
    navigate: state.navigate,
    context: state.context,
    myOrganisations: state.myOrganisations,
    orgIdParam: state.orgIdParam,
    organisationOptions: state.organisationOptions,
    handleOrganisationSwitch: state.handleOrganisationSwitch,
    // Auth
    user: state.user,
    isSuperAdmin: state.isSuperAdmin,
    canManageUsers: state.canManageUsers,
    waitingForOrgContext: state.waitingForOrgContext,
    // Data
    filteredUsers,
    isLoading: state.isLoading,
    error: state.error,
    total: state.total,
    // Pagination
    currentPage,
    totalPages,
    limit: state.limit,
    handlePageChange,
    // Filters
    organisations: state.organisations,
    clubs: state.clubs,
    teams: state.teams,
    availableRoles: state.availableRoles,
    selectedOrgId: state.selectedOrgId,
    setSelectedOrgId: state.setSelectedOrgId,
    selectedClubId: state.selectedClubId,
    setSelectedClubId: state.setSelectedClubId,
    selectedClubKey: state.selectedClubKey,
    setSelectedClubKey: state.setSelectedClubKey,
    selectedTeamId: state.selectedTeamId,
    setSelectedTeamId: state.setSelectedTeamId,
    selectedTeamKey: state.selectedTeamKey,
    setSelectedTeamKey: state.setSelectedTeamKey,
    statusFilter: state.statusFilter,
    setStatusFilter: state.setStatusFilter,
    roleFilter: state.roleFilter,
    setRoleFilter: state.setRoleFilter,
    resetPageToFirst: state.resetPageToFirst,
    // Breadcrumbs
    breadcrumbs,
    // User actions
    handleEditClick,
    handleSaveUser,
    fetchUsers,
    // Modal state
    editingUser: state.editingUser,
    isModalOpen: state.isModalOpen,
    setIsModalOpen: state.setIsModalOpen,
    detailUser: state.detailUser,
    setDetailUser: state.setDetailUser,
    isDetailModalOpen: state.isDetailModalOpen,
    setIsDetailModalOpen: state.setIsDetailModalOpen,
    isInviteModalOpen: state.isInviteModalOpen,
    setIsInviteModalOpen: state.setIsInviteModalOpen,
    isAddMemberOpen: state.isAddMemberOpen,
    setIsAddMemberOpen: state.setIsAddMemberOpen,
    assignUser: state.assignUser,
    setAssignUser: state.setAssignUser,
    isAssignModalOpen: state.isAssignModalOpen,
    setIsAssignModalOpen: state.setIsAssignModalOpen,
    linkUser: state.linkUser,
    setLinkUser: state.setLinkUser,
    isLinkModalOpen: state.isLinkModalOpen,
    setIsLinkModalOpen: state.setIsLinkModalOpen,
  };
}
