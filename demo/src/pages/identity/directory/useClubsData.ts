/**
 * useClubsData — All state, effects, and handlers for ClubsList
 *
 * Manages: organisations/clubs/teams fetching, filter state, permissions,
 * CRUD operations (delete, save, create), derived filteredClubs.
 */

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSports } from '../../../hooks/useSports';
import { useContextSwitcher } from '@django-core/context-switcher';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { getCsrfToken } from '../../../utils/csrf';
import { canDeleteProject, canEditProject } from '../../../utils/permissions';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

/** ProjectOption extended with fields present in API responses but not in the base type. */
type ClubProject = ProjectOption & {
  is_active?: boolean;
  organisation?: string | { id: string; name?: string; slug?: string; sport?: Record<string, unknown> };
};

export interface UseClubsDataReturn {
  // Loading / error
  isLoading: boolean;
  error: string | null;
  // Data
  organisations: OrganisationOption[];
  filteredClubs: ProjectOption[];
  teams: ProjectOption[];
  // Auth / permissions
  isSuperAdmin: boolean;
  orgLocked: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  // Filters
  selectedOrgId: string;
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  sportFilter: string;
  setSportFilter: Dispatch<SetStateAction<string>>;
  selectedClubId: string;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  categories: ReturnType<typeof useSports>['categories'];
  // Modals
  detailProject: ProjectOption | null;
  setDetailProject: Dispatch<SetStateAction<ProjectOption | null>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  editProject: ProjectOption | null;
  setEditProject: Dispatch<SetStateAction<ProjectOption | null>>;
  isEditModalOpen: boolean;
  setIsEditModalOpen: Dispatch<SetStateAction<boolean>>;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  // Handlers
  handleDeleteProject: (orgSlugOrId: string, projectSlugOrId: string, projectName: string) => Promise<void>;
  handleSaveProject: (projectData: Record<string, unknown>) => Promise<void>;
  handleCreateProject: (projectData: Record<string, unknown>) => Promise<void>;
  handleClearFilters: () => void;
  navigate: NavigateFunction;
}

export function useClubsData(preselectedOrgId?: string): UseClubsDataReturn {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ClubProject[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [detailProject, setDetailProject] = useState<ProjectOption | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [editProject, setEditProject] = useState<ProjectOption | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const orgLocked = Boolean(preselectedOrgId);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(preselectedOrgId || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const { categories } = useSports();

  const permissionContext = useMemo(
    () => ({
      currentOrganisation: context.organisation ?? undefined,
      isSuperAdmin,
    }),
    [context.organisation, isSuperAdmin]
  );

  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
    }
  }, [preselectedOrgId]);

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  useEffect(() => {
    if (orgLocked) return;
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin, orgLocked]);

  useEffect(() => {
    const orgId = searchParams.get('org_id');
    if (orgLocked) return;
    if (orgId && isSuperAdmin) {
      setSelectedOrgId(String(orgId));
    }
  }, [isSuperAdmin, searchParams, orgLocked]);

  // ── Load organisations ──

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setOrganisations((orgs || []).map((o: OrganisationOption) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // ── Load clubs + teams ──

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();

      const selectedOrg = selectedOrgId
        ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
        : null;

      if (selectedOrgId && !selectedOrg) {
        setClubs([]);
        setTeams([]);
        setIsLoading(false);
        return;
      }

      const orgSlugForApi = selectedOrg?.slug || (!selectedOrgId ? context.organisation?.slug : '') || '';

      try {
        if (orgSlugForApi) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        } else {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshKey, selectedOrgId, organisations, context.organisation?.slug]);

  // ── Filtered + sorted clubs ──

  const filteredClubs = useMemo(() => {
    let list = [...clubs];

    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (club: ClubProject) => {
      const org = club?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      const fromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return fromList?.name || '';
    };

    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : selectedOrgId;

    if (selectedOrgId) {
      list = list.filter((club) => {
        const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
        return String(clubOrg) === String(selectedOrgIdResolved);
      });
    }

    if (statusFilter === 'active') {
      list = list.filter((c) => c.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((c) => c.is_active === false);
    }

    if (sportFilter !== 'all') {
      list = list.filter((club) => {
        const nestedOrg = club?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? (nestedOrg as any)?.sport?.id : undefined;
        if (nestedSportId) return String(nestedSportId) === String(sportFilter);

        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          club?.organisation_id;
        const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        return String(org?.sport?.id || '') === String(sportFilter);
      });
    }

    if (selectedClubId) {
      list = list.filter((c) => String(c.id) === String(selectedClubId));
    }

    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });

    return list;
  }, [clubs, organisations, selectedOrgId, statusFilter, sportFilter, selectedClubId]);

  // ── CRUD handlers ──

  const handleDeleteProject = async (orgSlugOrId: string, projectSlugOrId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${projectName}?`)) return;
    const apiBaseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        alert('Failed to delete club');
        return;
      }

      setClubs((prev) => prev.filter((p) => String(p.id) !== String(projectSlugOrId) && String(p.slug) !== String(projectSlugOrId)));
      if (String(selectedClubId) === String(projectSlugOrId)) setSelectedClubId('');
    } catch (e) {
      console.error(e);
      console.error(e);
      alert('Error deleting club');
    }
  };

  const handleSaveProject = async (projectData: Record<string, unknown>) => {
    if (!editProject) return;
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    const baseUrl = getApiBaseUrl();
    const projectSlugOrId = editProject.slug || editProject.id;
    const response = await fetch(`${baseUrl}/api/v1/projects/${projectSlugOrId}/?include_archived=true`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      let message = 'Failed to update project';
      try {
        const json: any = await response.json();
        message = json?.error?.message || json?.detail || json?.message || message;
      } catch {
        const text = await response.text().catch(() => '');
        if (text) message = text;
      }
      throw new Error(message);
    }

    const payload: any = await response.json().catch(() => null);
    const updated = payload?.data?.data || payload?.data || payload;

    setClubs((prev) =>
      prev.map((p) => {
        const match = String(p?.slug || p?.id) === String(projectSlugOrId);
        return match ? { ...p, ...(updated || projectData) } : p;
      })
    );
    setEditProject((prev: ProjectOption | null) => (prev ? { ...prev, ...(updated || projectData) } : prev));
    invalidateFetchAllPagesCache();
  };

  const handleCreateProject = async (projectData: Record<string, unknown>) => {
    const orgId = String(projectData.organisation_id || selectedOrgId || '');
    if (!orgId) throw new Error('Select a federation first');

    const orgSlug = organisations.find((o) => String(o.id) === String(orgId))?.slug || orgId;
    const apiBaseUrl = getApiBaseUrl();

    const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description || '',
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create club');
    }

    const payload: any = await res.json().catch(() => null);
    const created: any = payload?.data?.data || payload?.data || payload;
    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '');
      if (createdKey) {
        setClubs((prev) => {
          if (prev.some((p) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created, ...prev];
        });
      }
    }
    invalidateFetchAllPagesCache();
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSportFilter('all');
    setSelectedClubId('');
    if (isSuperAdmin) setSelectedOrgId('');
  };

  return {
    // Loading / error
    isLoading, error,
    // Data
    organisations, filteredClubs, teams,
    // Auth / permissions
    isSuperAdmin, orgLocked, userCanEditProject, userCanDeleteProject,
    // Filters
    selectedOrgId, setSelectedOrgId,
    statusFilter, setStatusFilter,
    sportFilter, setSportFilter,
    selectedClubId, setSelectedClubId,
    categories,
    // Modals
    detailProject, setDetailProject,
    isDetailModalOpen, setIsDetailModalOpen,
    editProject, setEditProject,
    isEditModalOpen, setIsEditModalOpen,
    isCreateModalOpen, setIsCreateModalOpen,
    // Handlers
    handleDeleteProject, handleSaveProject, handleCreateProject,
    handleClearFilters,
    navigate,
  };
}
