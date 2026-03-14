/**
 * Data fetching for useUsersData hook
 */
import { useEffect, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type { OrganisationOption, ProjectOption, UserListEntry } from './types';
import { FALLBACK_ROLES } from './types';

interface UsersOrganisation {
  id: string;
  slug?: string;
}

interface UseUsersFetchersParams {
  user: { id?: string | number; is_superuser?: boolean } | null;
  isSuperAdmin: boolean;
  waitingForOrgContext: boolean;
  context: { organisation?: { id?: string; slug?: string } | null; isLoading?: boolean };
  orgIdParam: string | null;
  projectIdParam: string | null;
  page: string;
  limit: number;
  selectedOrgId: string;
  selectedClubKey: string;
  selectedTeamKey: string;
  statusFilter: string;
  roleFilter: string;
  setOrganisations: (orgs: OrganisationOption[]) => void;
  setClubs: (clubs: ProjectOption[]) => void;
  setTeams: (teams: ProjectOption[]) => void;
  setAvailableRoles: (roles: string[]) => void;
  setUsers: (users: UserListEntry[]) => void;
  setTotal: (total: number) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useUsersFetchers(params: UseUsersFetchersParams) {
  const {
    user, isSuperAdmin, waitingForOrgContext, context,
    orgIdParam, projectIdParam, page, limit,
    selectedOrgId, selectedClubKey, selectedTeamKey, statusFilter, roleFilter,
    setOrganisations, setClubs, setTeams, setAvailableRoles,
    setUsers, setTotal, setIsLoading, setError,
  } = params;

  // ── Fetch organisations (superadmin) ───────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchOrgs = async () => {
      try {
        const data = await api.list<OrganisationOption>('/organisations/', { pageSize: 100 });
        setOrganisations(data.results);
      } catch (e) {
        logger.error('Failed to fetch organisations for filter', e);
      }
    };
    fetchOrgs();
  }, [isSuperAdmin, setOrganisations]);

  // ── Fetch clubs ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const results = await api.listAll<ProjectOption>('/projects/', { pageSize: 200, params: { parent_project__isnull: true } });
        setClubs(results);
      } catch (e) {
        logger.error('Failed to fetch clubs for filter', e);
      }
    };
    fetchClubs();
  }, [setClubs]);

  // ── Fetch teams ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const results = await api.listAll<ProjectOption>('/projects/', { pageSize: 200, params: { parent_project__isnull: false } });
        setTeams(results);
      } catch (e) {
        logger.error('Failed to fetch teams for filter', e);
      }
    };
    fetchTeams();
  }, [setTeams]);

  // ── Fetch roles ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.list<{ name: string }>('/permissions/roles/');
        const roleNames = data.results.map((role) => role.name);
        setAvailableRoles(['Superadmin', ...roleNames].sort());
      } catch (e) {
        logger.error('[UsersPage] Failed to fetch roles', e);
        setAvailableRoles(FALLBACK_ROLES);
      }
    };
    fetchRoles();
  }, [setAvailableRoles]);

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
      logger.error('Failed to load users', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, orgIdParam, isSuperAdmin, context.organisation?.slug, selectedOrgId, selectedClubKey, selectedTeamKey, projectIdParam, statusFilter, roleFilter, limit, setUsers, setTotal, setIsLoading, setError]);

  useEffect(() => {
    if (waitingForOrgContext) return;
    if (user) fetchUsers();
  }, [user, waitingForOrgContext, fetchUsers]);

  return { fetchUsers };
}
