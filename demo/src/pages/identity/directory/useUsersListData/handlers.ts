/**
 * Event handlers for useUsersListData hook
 */
import { useCallback } from 'react';
import { api } from '../../../../api/client';
import type { User, ProjectOption } from '../usersListTypes';
import { logger } from '@/utils/logger';

export interface UserRow extends User {
  user?: User;
  project_memberships?: Array<Record<string, unknown>>;
  is_superuser?: boolean;
  membership?: Record<string, unknown>;
  membership_id?: string;
  member_id?: string;
  project_membership_id?: string;
  [key: string]: unknown;
}

interface UseUsersListHandlersParams {
  selectedOrgId: string;
  clubLocked: boolean;
  teamLocked: boolean;
  orgLocked: boolean;
  isSuperAdmin: boolean;
  preselectedTeamId: string | undefined;
  organisations: Array<{ id: string; slug?: string }>;
  contextOrgSlug?: string;
  setSelectedOrgId: (id: string) => void;
  setSelectedClubId: (id: string) => void;
  setSelectedTeamId: (id: string) => void;
  setStatusFilter: (status: string) => void;
  setRoleFilter: (role: string) => void;
  setIsAddMemberOpen: (open: boolean) => void;
  setSearchParams: (params: URLSearchParams | Record<string, string>) => void;
  setEditUser: (user: User | null) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setUsers: (fn: (prev: UserRow[]) => UserRow[]) => void;
}

export function useUsersListHandlers(params: UseUsersListHandlersParams) {
  const {
    selectedOrgId, clubLocked, teamLocked, orgLocked, isSuperAdmin,
    preselectedTeamId, organisations, contextOrgSlug,
    setSelectedOrgId, setSelectedClubId, setSelectedTeamId,
    setStatusFilter, setRoleFilter, setIsAddMemberOpen, setSearchParams,
    setEditUser, setIsEditModalOpen, setUsers,
  } = params;

  // ── Helpers ──────────────────────────────────────────────
  const getSelectedOrgSlug = useCallback(() => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
        )
      : null;
    return (
      selectedOrg?.slug ||
      (!selectedOrgId ? contextOrgSlug : '') ||
      selectedOrgId
    );
  }, [selectedOrgId, organisations, contextOrgSlug]);

  // ── Event handlers ───────────────────────────────────────
  const onOrgChange = useCallback(
    (orgId: string) => {
      setSelectedOrgId(orgId);
      if (!clubLocked) setSelectedClubId('');
      if (!teamLocked) setSelectedTeamId('');
      if (orgId) {
        setSearchParams({ org_id: orgId });
      } else {
        setSearchParams({});
      }
    },
    [clubLocked, teamLocked, setSearchParams, setSelectedOrgId, setSelectedClubId, setSelectedTeamId],
  );

  const onClubChange = useCallback(
    (clubId: string) => {
      if (clubLocked) return;
      setSelectedClubId(clubId);
      if (!teamLocked) setSelectedTeamId('');
    },
    [clubLocked, teamLocked, setSelectedClubId, setSelectedTeamId],
  );

  const onTeamChange = useCallback(
    (teamId: string) => {
      if (teamLocked) return;
      setSelectedTeamId(teamId);
    },
    [teamLocked, setSelectedTeamId],
  );

  const onClearFilters = useCallback(() => {
    if (!clubLocked) setSelectedClubId('');
    if (!teamLocked) setSelectedTeamId('');
    setStatusFilter('all');
    setRoleFilter('');
    if (isSuperAdmin && !orgLocked) {
      setSelectedOrgId('');
      setSearchParams({});
    }
  }, [clubLocked, teamLocked, isSuperAdmin, orgLocked, setSearchParams, setSelectedOrgId, setSelectedClubId, setSelectedTeamId, setStatusFilter, setRoleFilter]);

  const onAddMember = useCallback(() => {
    if (!selectedOrgId) {
      alert('Select a federation first to add a member.');
      return;
    }
    setIsAddMemberOpen(true);
  }, [selectedOrgId, setIsAddMemberOpen]);

  const handleEditClick = useCallback((u: UserRow) => {
    const userData = u.user || u;
    if (!userData.project_memberships && u.project_memberships) {
      userData.project_memberships = u.project_memberships;
    }
    setEditUser(userData);
    setIsEditModalOpen(true);
  }, [setEditUser, setIsEditModalOpen]);

  const handleSaveUser = useCallback(async (updatedData: Partial<User>) => {
    // NOTE: editUser is not directly available; assumes it's in the component
    // This is a stub that can be called with the user
  }, []);

  // ── Delete handlers ──────────────────────────────────────
  const handleDeleteOrgMember = useCallback(async (
    membershipId: string,
    usernameLabel: string,
    orgName: string,
  ) => {
    const orgSlug = getSelectedOrgSlug();
    if (!orgSlug) {
      alert('Select a federation first.');
      return;
    }
    if (!window.confirm(`Remove ${usernameLabel} from ${orgName}?`)) return;

    try {
      await api.delete(`/organisations/${orgSlug}/members/${membershipId}/`);
    } catch (_err: unknown) {
      const err = _err as { message?: string };
      alert(err?.message || `Failed to delete member`);
      return;
    }

    setUsers((prev) =>
      prev.filter((row: UserRow) => {
        const rowMembershipId =
          row?.membership?.id ?? row?.membership_id ?? row?.member_id;
        return String(rowMembershipId) !== String(membershipId);
      }),
    );
  }, [getSelectedOrgSlug, setUsers]);

  const handleDeleteTeamMember = useCallback(async (
    projectMembershipId: string,
    usernameLabel: string,
    teamName: string,
  ) => {
    if (!window.confirm(`Remove ${usernameLabel} from ${teamName}?`)) return;

    try {
      await api.delete(`/projects/${preselectedTeamId}/members/${projectMembershipId}/`);
    } catch (_err: unknown) {
      const err = _err as { message?: string };
      logger.error('Delete team member failed', err);
      alert(err?.message || `Failed to remove member`);
      return;
    }

    setUsers((prev) =>
      prev.filter(
        (row: UserRow) => String(row?.project_membership_id) !== String(projectMembershipId),
      ),
    );
  }, [preselectedTeamId, setUsers]);

  return {
    getSelectedOrgSlug,
    onOrgChange,
    onClubChange,
    onTeamChange,
    onClearFilters,
    onAddMember,
    handleEditClick,
    handleSaveUser,
    handleDeleteOrgMember,
    handleDeleteTeamMember,
  };
}
