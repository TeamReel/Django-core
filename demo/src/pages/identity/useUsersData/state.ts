/**
 * State management for useUsersData hook
 */
import { useReducer, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import type { User, UserListEntry, OrganisationOption, ProjectOption } from './types';
import { formReducer, makeSetter } from '@/utils/formReducer';

// ── State interface ──────────────────────────────────────────────────────────

interface UsersDataState {
  users: UserListEntry[];
  isLoading: boolean;
  error: string | null;
  total: number;
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  availableRoles: string[];
  selectedOrgId: string;
  selectedClubId: string;
  selectedClubKey: string;
  selectedTeamId: string;
  selectedTeamKey: string;
  statusFilter: string;
  roleFilter: string;
  hasInitializedFilters: boolean;
  editingUser: User | null;
  isModalOpen: boolean;
  detailUser: User | null;
  isDetailModalOpen: boolean;
  isInviteModalOpen: boolean;
  isAddMemberOpen: boolean;
  assignUser: User | null;
  isAssignModalOpen: boolean;
  linkUser: User | null;
  isLinkModalOpen: boolean;
}

const initialUsersState: UsersDataState = {
  users: [], isLoading: true, error: null, total: 0,
  organisations: [], clubs: [], teams: [], availableRoles: [],
  selectedOrgId: '', selectedClubId: '', selectedClubKey: '',
  selectedTeamId: '', selectedTeamKey: '',
  statusFilter: 'active', roleFilter: '',
  hasInitializedFilters: false,
  editingUser: null, isModalOpen: false,
  detailUser: null, isDetailModalOpen: false,
  isInviteModalOpen: false, isAddMemberOpen: false,
  assignUser: null, isAssignModalOpen: false,
  linkUser: null, isLinkModalOpen: false,
};

export function useUsersState() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const { organisationOptions, handleOrganisationSwitch } = useBreadcrumbContextSwitcher({
    organisations: myOrganisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [], users: [],
    context: { currentOrgId: orgId },
    basePath: '',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page') || '1';
  const limit = 50;

  const resetPageToFirst = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  /* ── Reducer state ── */
  const [s, dispatch] = useReducer(formReducer<UsersDataState>, initialUsersState);

  /* ── Backward-compatible setters ── */
  const setUsers = useMemo(() => makeSetter<UsersDataState, 'users'>(dispatch, 'users'), [dispatch]);
  const setIsLoading = useMemo(() => makeSetter<UsersDataState, 'isLoading'>(dispatch, 'isLoading'), [dispatch]);
  const setError = useMemo(() => makeSetter<UsersDataState, 'error'>(dispatch, 'error'), [dispatch]);
  const setTotal = useMemo(() => makeSetter<UsersDataState, 'total'>(dispatch, 'total'), [dispatch]);
  const setOrganisations = useMemo(() => makeSetter<UsersDataState, 'organisations'>(dispatch, 'organisations'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<UsersDataState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<UsersDataState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setAvailableRoles = useMemo(() => makeSetter<UsersDataState, 'availableRoles'>(dispatch, 'availableRoles'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<UsersDataState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<UsersDataState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedClubKey = useMemo(() => makeSetter<UsersDataState, 'selectedClubKey'>(dispatch, 'selectedClubKey'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<UsersDataState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setSelectedTeamKey = useMemo(() => makeSetter<UsersDataState, 'selectedTeamKey'>(dispatch, 'selectedTeamKey'), [dispatch]);
  const setStatusFilter = useMemo(() => makeSetter<UsersDataState, 'statusFilter'>(dispatch, 'statusFilter'), [dispatch]);
  const setRoleFilter = useMemo(() => makeSetter<UsersDataState, 'roleFilter'>(dispatch, 'roleFilter'), [dispatch]);
  const setHasInitializedFilters = useMemo(() => makeSetter<UsersDataState, 'hasInitializedFilters'>(dispatch, 'hasInitializedFilters'), [dispatch]);
  const setEditingUser = useMemo(() => makeSetter<UsersDataState, 'editingUser'>(dispatch, 'editingUser'), [dispatch]);
  const setIsModalOpen = useMemo(() => makeSetter<UsersDataState, 'isModalOpen'>(dispatch, 'isModalOpen'), [dispatch]);
  const setDetailUser = useMemo(() => makeSetter<UsersDataState, 'detailUser'>(dispatch, 'detailUser'), [dispatch]);
  const setIsDetailModalOpen = useMemo(() => makeSetter<UsersDataState, 'isDetailModalOpen'>(dispatch, 'isDetailModalOpen'), [dispatch]);
  const setIsInviteModalOpen = useMemo(() => makeSetter<UsersDataState, 'isInviteModalOpen'>(dispatch, 'isInviteModalOpen'), [dispatch]);
  const setIsAddMemberOpen = useMemo(() => makeSetter<UsersDataState, 'isAddMemberOpen'>(dispatch, 'isAddMemberOpen'), [dispatch]);
  const setAssignUser = useMemo(() => makeSetter<UsersDataState, 'assignUser'>(dispatch, 'assignUser'), [dispatch]);
  const setIsAssignModalOpen = useMemo(() => makeSetter<UsersDataState, 'isAssignModalOpen'>(dispatch, 'isAssignModalOpen'), [dispatch]);
  const setLinkUser = useMemo(() => makeSetter<UsersDataState, 'linkUser'>(dispatch, 'linkUser'), [dispatch]);
  const setIsLinkModalOpen = useMemo(() => makeSetter<UsersDataState, 'isLinkModalOpen'>(dispatch, 'isLinkModalOpen'), [dispatch]);

  const projectIdParam = searchParams.get('project_id');
  const orgIdParam = orgId || searchParams.get('organisation_id');

  // ── Auth / permissions ─────────────────────────────────────────────
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
  const currentOrg = myOrganisations.find(o => o.slug?.toLowerCase() === currentOrgSlug);
  const isOrgAdmin = (currentOrg as { user_role?: string } | undefined)?.user_role === 'admin';
  const canManageUsers = isSuperAdmin || isOrgAdmin;
  const waitingForOrgContext = Boolean(orgIdParam) && context.isLoading;

  return {
    // Auth + context
    user, navigate, context, myOrganisations,
    organisationOptions, handleOrganisationSwitch,
    // Search params
    searchParams, setSearchParams, page, limit, resetPageToFirst,
    // Users
    users: s.users, setUsers, isLoading: s.isLoading, setIsLoading, error: s.error, setError, total: s.total, setTotal,
    // Filters
    organisations: s.organisations, setOrganisations,
    clubs: s.clubs, setClubs, teams: s.teams, setTeams,
    availableRoles: s.availableRoles, setAvailableRoles,
    selectedOrgId: s.selectedOrgId, setSelectedOrgId,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    selectedClubKey: s.selectedClubKey, setSelectedClubKey,
    selectedTeamId: s.selectedTeamId, setSelectedTeamId,
    selectedTeamKey: s.selectedTeamKey, setSelectedTeamKey,
    statusFilter: s.statusFilter, setStatusFilter,
    roleFilter: s.roleFilter, setRoleFilter,
    hasInitializedFilters: s.hasInitializedFilters, setHasInitializedFilters,
    projectIdParam, orgIdParam,
    // Permissions
    isSuperAdmin, canManageUsers, waitingForOrgContext,
    // Modals
    editingUser: s.editingUser, setEditingUser,
    isModalOpen: s.isModalOpen, setIsModalOpen,
    detailUser: s.detailUser, setDetailUser,
    isDetailModalOpen: s.isDetailModalOpen, setIsDetailModalOpen,
    isInviteModalOpen: s.isInviteModalOpen, setIsInviteModalOpen,
    isAddMemberOpen: s.isAddMemberOpen, setIsAddMemberOpen,
    assignUser: s.assignUser, setAssignUser,
    isAssignModalOpen: s.isAssignModalOpen, setIsAssignModalOpen,
    linkUser: s.linkUser, setLinkUser,
    isLinkModalOpen: s.isLinkModalOpen, setIsLinkModalOpen,
  };
}
