/**
 * useUsersData — all state, fetch effects, filters, role mapping, pagination for UsersPage.
 */
import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams, useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher, type BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { api, ApiError } from '../../api';
import type { Organisation as SharedOrganisation } from '../../types';

// ── Types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organisations?: { id: string; name: string; slug: string; role: string }[];
  projects?: UserProjectRef[];
  [key: string]: unknown;
}

type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string };
  parent_id?: string | number | null;
  parent?: string | number | null;
  parent_name?: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────

export function getCookie(name: string) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export const normalizeRole = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const mapMembershipRoleToDisplayRole = (membershipRole: string, hasParent: boolean) => {
  const role = normalizeRole(membershipRole);
  if (role === 'admin') return hasParent ? 'Team Admin' : 'Club Admin';
  if (role === 'staff' || role === 'editor') return 'Team Staff';
  if (role === 'player') return 'Team Member';
  if (role === 'viewer') return 'Viewer';
  return 'User';
};

type UserProjectRef = { id: string | number; slug?: string; role?: string; parent?: string | number | null; parent_name?: string | null; name?: string };

type UserListEntry = Record<string, unknown> & { user?: User; projects?: UserProjectRef[]; role?: string };

const FALLBACK_ROLES = [
  'Superadmin', 'Land Admin', 'Club Admin', 'Team Admin',
  'Team Staff', 'Team Member', 'Supporter', 'Viewer', 'User',
];

// ── Hook ─────────────────────────────────────────────────────────────

export interface UseUsersDataReturn {
  // Context + navigation
  navigate: NavigateFunction;
  context: any;
  myOrganisations: Array<{ id: string; name: string; slug: string }>;
  orgIdParam: string | null;
  organisationOptions: BreadcrumbSwitcherOption[];
  handleOrganisationSwitch: (option: BreadcrumbSwitcherOption) => void;
  // Auth
  user: ReturnType<typeof useAuth>['user'];
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  waitingForOrgContext: boolean;
  // Data
  filteredUsers: UserListEntry[];
  isLoading: boolean;
  error: string | null;
  total: number;
  // Pagination
  currentPage: number;
  totalPages: number;
  limit: number;
  handlePageChange: (page: number) => void;
  // Filters
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  availableRoles: string[];
  selectedOrgId: string;
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  selectedClubId: string;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  selectedClubKey: string;
  setSelectedClubKey: Dispatch<SetStateAction<string>>;
  selectedTeamId: string;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  selectedTeamKey: string;
  setSelectedTeamKey: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  roleFilter: string;
  setRoleFilter: Dispatch<SetStateAction<string>>;
  resetPageToFirst: () => void;
  // Breadcrumbs
  breadcrumbs: Array<{ label: string; onClick?: () => void; current?: boolean }>;
  // User actions
  handleEditClick: (u: User | UserListEntry) => void;
  handleSaveUser: (updatedData: Partial<User>) => Promise<void>;
  fetchUsers: () => void;
  // Modal state
  editingUser: User | null;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  detailUser: User | null;
  setDetailUser: Dispatch<SetStateAction<User | null>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: Dispatch<SetStateAction<boolean>>;
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: Dispatch<SetStateAction<boolean>>;
  assignUser: User | null;
  setAssignUser: Dispatch<SetStateAction<User | null>>;
  isAssignModalOpen: boolean;
  setIsAssignModalOpen: Dispatch<SetStateAction<boolean>>;
  linkUser: User | null;
  setLinkUser: Dispatch<SetStateAction<User | null>>;
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function useUsersData(): UseUsersDataReturn {
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
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const page = searchParams.get('page') || '1';
  const limit = 50;

  const resetPageToFirst = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // ── Filter state ───────────────────────────────────────────────────
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedClubKey, setSelectedClubKey] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeamKey, setSelectedTeamKey] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

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

  // ── Modal state ────────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [linkUser, setLinkUser] = useState<User | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // ── Initialize filters ─────────────────────────────────────────────
  useEffect(() => {
    if (!hasInitializedFilters) {
      if (orgIdParam) {
        setSelectedOrgId(orgIdParam);
      } else if (context.organisation && !isSuperAdmin) {
        setSelectedOrgId(String(context.organisation.id));
      }
      setHasInitializedFilters(true);
    }
  }, [hasInitializedFilters, orgIdParam, context.organisation, isSuperAdmin]);

  // ── Fetch organisations (superadmin) ───────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchOrgs = async () => {
      try {
        const data = await api.list<OrganisationOption>('/organisations/', { pageSize: 100 });
        setOrganisations(data.results);
      } catch (e) {
        console.error('Failed to fetch organisations for filter', e);
      }
    };
    fetchOrgs();
  }, [isSuperAdmin]);

  // ── Fetch clubs ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const results = await api.listAll<ProjectOption>('/projects/', { pageSize: 200, params: { parent_project__isnull: true } });
        setClubs(results);
      } catch (e) {
        console.error('Failed to fetch clubs for filter', e);
      }
    };
    fetchClubs();
  }, []);

  // ── Fetch teams ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const results = await api.listAll<ProjectOption>('/projects/', { pageSize: 200, params: { parent_project__isnull: false } });
        setTeams(results);
      } catch (e) {
        console.error('Failed to fetch teams for filter', e);
      }
    };
    fetchTeams();
  }, []);

  // ── Fetch roles ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.list<{ name: string }>('/permissions/roles/');
        const roleNames = data.results.map((role) => role.name);
        setAvailableRoles(['Superadmin', ...roleNames].sort());
      } catch (e) {
        console.error('[UsersPage] Failed to fetch roles:', e);
        setAvailableRoles(FALLBACK_ROLES);
      }
    };
    fetchRoles();
  }, []);

  // ── Role helpers ───────────────────────────────────────────────────
  const getScopedRoleForProjectFilter = useCallback(
    (userProjects: UserProjectRef[]) => {
      if (selectedTeamKey) {
        const match = userProjects.find((p) => String(p.slug || p.id) === String(selectedTeamKey));
        if (match?.role) return mapMembershipRoleToDisplayRole(String(match.role), Boolean(match.parent));
        return null;
      }

      if (selectedClubKey) {
        const club = clubs.find(c => String(c.slug || c.id) === String(selectedClubKey));
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
    [selectedTeamKey, selectedClubKey, clubs],
  );

  // ── Fetch users ────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const pageNumber = Number.parseInt(page, 10) || 1;
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    try {
      const effectiveOrgSlug = (orgIdParam || (!isSuperAdmin ? context.organisation?.slug : null))?.toLowerCase();
      const effectiveProjectId = projectIdParam?.toLowerCase();

      if (effectiveProjectId) {
        queryParams.project_id = effectiveProjectId;
        if (effectiveOrgSlug) queryParams.organisation_id = effectiveOrgSlug;
      } else if (isSuperAdmin) {
        const filterOrg = effectiveOrgSlug || selectedOrgId;
        if (filterOrg) queryParams.organisation_id = filterOrg;
        if (selectedTeamKey) queryParams.project_id = selectedTeamKey;
        else if (selectedClubKey) queryParams.project_id = selectedClubKey;
        if (statusFilter === 'active') queryParams.is_active = true;
        else if (statusFilter === 'inactive') queryParams.is_active = false;
        if (roleFilter) queryParams.role_label = roleFilter;
      } else if (effectiveOrgSlug) {
        queryParams.organisation_id = effectiveOrgSlug;
        if (!orgIdParam) queryParams.include_unassigned = true;
      } else {
        if (selectedOrgId) queryParams.organisation_id = selectedOrgId;
        if (statusFilter === 'active') queryParams.is_active = true;
        else if (statusFilter === 'inactive') queryParams.is_active = false;
        if (roleFilter) queryParams.role_label = roleFilter;
      }

      const data = await api.list<UserListEntry>('/admin/users/', { params: queryParams, pageSize: limit, page: pageNumber });
      setUsers(data.results);
      setTotal(data.count);
    } catch (err: unknown) {
      console.error(err);
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, orgIdParam, isSuperAdmin, context.organisation?.slug, selectedOrgId, selectedClubKey, selectedTeamKey, projectIdParam, statusFilter, roleFilter]);

  useEffect(() => {
    if (waitingForOrgContext) return;
    if (user) fetchUsers();
  }, [user, waitingForOrgContext, fetchUsers]);

  // ── Pagination ─────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page);

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
  };

  // ── User actions ───────────────────────────────────────────────────
  const handleEditClick = (item: UserListEntry) => {
    const userData = item.user || item;
    setEditingUser(userData as User);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!editingUser) return;
    try {
      await api.patch(`/admin/users/${editingUser.id}/`, updatedData);
    } catch (e) {
      console.error(e);
      alert('Failed to save user changes');
      throw e;
    }
  };

  // ── Breadcrumbs ────────────────────────────────────────────────────
  const breadcrumbs: Array<{ label: string; href?: string; onClick?: () => void; current?: boolean }> = [{ label: 'Dashboard', href: '/dashboard' }];
  if (orgIdParam) {
    breadcrumbs.push({ label: 'Federations', onClick: () => navigate('/federations') });
    breadcrumbs.push({
      label: (myOrganisations.find(o => o.slug === orgIdParam || o.id === orgIdParam) || context.organisation)?.name || 'Federation',
      onClick: () => navigate(`/organisations/${orgIdParam}`),
    });
    breadcrumbs.push({ label: 'Users', current: true });
  } else {
    breadcrumbs.push({ label: 'Users', current: true });
  }

  // ── Client-side filtering (role only) ──────────────────────────────
  const filteredUsers = users.filter((item: UserListEntry) => {
    const u = item.user || item;
    const userProjects = u.projects || [];
    const scopedRole = getScopedRoleForProjectFilter(userProjects);
    const systemRole = scopedRole || u.role || '';
    if (roleFilter && normalizeRole(systemRole) !== normalizeRole(roleFilter)) return false;
    return true;
  });

  return {
    // Context + navigation
    navigate,
    context,
    myOrganisations,
    orgIdParam,
    organisationOptions,
    handleOrganisationSwitch,
    // Auth
    user,
    isSuperAdmin,
    canManageUsers,
    waitingForOrgContext,
    // Data
    filteredUsers,
    isLoading,
    error,
    total,
    // Pagination
    currentPage,
    totalPages,
    limit,
    handlePageChange,
    // Filters
    organisations,
    clubs,
    teams,
    availableRoles,
    selectedOrgId,
    setSelectedOrgId,
    selectedClubId,
    setSelectedClubId,
    selectedClubKey,
    setSelectedClubKey,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeamKey,
    setSelectedTeamKey,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    resetPageToFirst,
    // Breadcrumbs
    breadcrumbs,
    // User actions
    handleEditClick,
    handleSaveUser,
    fetchUsers,
    // Modal state
    editingUser,
    isModalOpen,
    setIsModalOpen,
    detailUser,
    setDetailUser,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isInviteModalOpen,
    setIsInviteModalOpen,
    isAddMemberOpen,
    setIsAddMemberOpen,
    assignUser,
    setAssignUser,
    isAssignModalOpen,
    setIsAssignModalOpen,
    linkUser,
    setLinkUser,
    isLinkModalOpen,
    setIsLinkModalOpen,
  };
}
