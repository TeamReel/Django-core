/**
 * useUsersData — all state, fetch effects, filters, role mapping, pagination for UsersPage.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { getApiBaseUrl } from '../../utils/apiBase';
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
}

type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string };
  parent_id?: string | number | null;
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

async function fetchAllFilterOptions(initialUrl: string): Promise<any[]> {
  const allResults: any[] = [];
  let url: string | null = initialUrl;
  while (url) {
    const res: Response = await fetch(url, { credentials: 'include' });
    if (!res.ok) break;
    const data: any = await res.json();
    const results = data.data?.results || data.results || [];
    const next: string | null = data.data?.next || data.next || null;
    allResults.push(...results);
    url = next;
  }
  return allResults;
}

const FALLBACK_ROLES = [
  'Superadmin', 'Land Admin', 'Club Admin', 'Team Admin',
  'Team Staff', 'Team Member', 'Supporter', 'Viewer', 'User',
];

// ── Hook ─────────────────────────────────────────────────────────────

export function useUsersData() {
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
  const [users, setUsers] = useState<any[]>([]);
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
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
  const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
  const currentOrg = myOrganisations.find(o => o.slug?.toLowerCase() === currentOrgSlug);
  const isOrgAdmin = (currentOrg as any)?.user_role === 'admin';
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
      const apiBaseUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const orgs = data.data?.results || data.results || [];
          setOrganisations(orgs);
        }
      } catch (e) {
        console.error(e);
        console.error('Failed to fetch organisations for filter', e);
      }
    };
    fetchOrgs();
  }, [isSuperAdmin]);

  // ── Fetch clubs ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClubs = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const results = await fetchAllFilterOptions(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`);
        setClubs(results);
      } catch (e) {
        console.error(e);
        console.error('Failed to fetch clubs for filter', e);
      }
    };
    fetchClubs();
  }, []);

  // ── Fetch teams ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTeams = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const results = await fetchAllFilterOptions(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`);
        setTeams(results);
      } catch (e) {
        console.error(e);
        console.error('Failed to fetch teams for filter', e);
      }
    };
    fetchTeams();
  }, []);

  // ── Fetch roles ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoles = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/permissions/roles/`, { credentials: 'include' });
        if (!response.ok) {
          setAvailableRoles(FALLBACK_ROLES);
          return;
        }
        const data = await response.json();
        const results = data.data?.results || data.results || data;
        const roleNames = results.map((role: any) => role.name);
        setAvailableRoles(['Superadmin', ...roleNames].sort());
      } catch (e) {
        console.error(e);
        console.error('[UsersPage] Failed to fetch roles:', e);
        setAvailableRoles(FALLBACK_ROLES);
      }
    };
    fetchRoles();
  }, []);

  // ── Role helpers ───────────────────────────────────────────────────
  const getScopedRoleForProjectFilter = useCallback(
    (userProjects: any[]) => {
      if (selectedTeamKey) {
        const match = userProjects.find((p: any) => String(p.slug || p.id) === String(selectedTeamKey));
        if (match?.role) return mapMembershipRoleToDisplayRole(String(match.role), Boolean(match.parent));
        return null;
      }

      if (selectedClubKey) {
        const club = clubs.find(c => String(c.slug || c.id) === String(selectedClubKey));
        const relevant = userProjects.filter((p: any) => {
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
    const params = new URLSearchParams();
    params.append('page', pageNumber.toString());
    params.append('page_size', limit.toString());
    const apiBaseUrl = getApiBaseUrl();

    try {
      let url = '';
      const effectiveOrgSlug = (orgIdParam || (!isSuperAdmin ? context.organisation?.slug : null))?.toLowerCase();
      const effectiveProjectId = projectIdParam?.toLowerCase();

      if (effectiveProjectId) {
        params.append('project_id', effectiveProjectId);
        if (effectiveOrgSlug) params.append('organisation_id', effectiveOrgSlug);
        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      } else if (isSuperAdmin) {
        const filterOrg = effectiveOrgSlug || selectedOrgId;
        if (filterOrg) params.append('organisation_id', filterOrg);
        if (selectedTeamKey) params.append('project_id', selectedTeamKey);
        else if (selectedClubKey) params.append('project_id', selectedClubKey);
        if (statusFilter === 'active') params.append('is_active', 'true');
        else if (statusFilter === 'inactive') params.append('is_active', 'false');
        if (roleFilter) params.append('role_label', roleFilter);
        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      } else if (effectiveOrgSlug) {
        params.append('organisation_id', effectiveOrgSlug);
        if (!orgIdParam) params.append('include_unassigned', 'true');
        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      } else {
        if (selectedOrgId) params.append('organisation_id', selectedOrgId);
        if (statusFilter === 'active') params.append('is_active', 'true');
        else if (statusFilter === 'inactive') params.append('is_active', 'false');
        if (roleFilter) params.append('role_label', roleFilter);
        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      }

      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Permission denied. You do not have access to view users.');
        throw new Error(`Failed to fetch users (${res.status})`);
      }

      const data = await res.json();
      const results = data.data?.results || data.results || [];
      const count = data.data?.count || data.count || 0;
      setUsers(results);
      setTotal(count);
    } catch (err: unknown) {
      console.error(err);
      console.error(err);
      setError(err.message);
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
  const handleEditClick = (item: any) => {
    const userData = item.user || item;
    setEditingUser(userData);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!editingUser) return;
    const apiBaseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: JSON.stringify(updatedData),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update user');
    } catch (e) {
      console.error(e);
      console.error(e);
      alert('Failed to save user changes');
      throw e;
    }
  };

  // ── Breadcrumbs ────────────────────────────────────────────────────
  const breadcrumbs: any[] = [{ label: 'Dashboard', href: '/dashboard' }];
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
  const filteredUsers = users.filter((item: any) => {
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
