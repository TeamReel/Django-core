/**
 * State management for useUsersListData hook
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import type { User, ProjectOption, UsersListProps } from '../usersListTypes';
import { useUsersListFetchers } from '../useUsersListFetchers';

export function useUsersListState(props: UsersListProps) {
  const { preselectedOrgId, preselectedClubId, preselectedTeamId } = props;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state ─────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // ── Modal state ──────────────────────────────────────────
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // ── Batch selection ──────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // ── Derived ──────────────────────────────────────────────
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);
  const scopedLocked = orgLocked || clubLocked || teamLocked;

  return {
    // Props
    preselectedOrgId, preselectedClubId, preselectedTeamId,
    // Core
    user, navigate, context, myOrganisations, searchParams, setSearchParams,
    // Filters
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    statusFilter, setStatusFilter,
    roleFilter, setRoleFilter,
    // Modals
    detailUser, setDetailUser,
    isDetailModalOpen, setIsDetailModalOpen,
    editUser, setEditUser,
    isEditModalOpen, setIsEditModalOpen,
    isAddMemberOpen, setIsAddMemberOpen,
    // Batch
    selectedIds, setSelectedIds,
    isBatchModalOpen, setIsBatchModalOpen,
    // Derived
    isSuperAdmin, orgLocked, clubLocked, teamLocked, scopedLocked,
  };
}
