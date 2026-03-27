/**
 * useClubsData — All state, effects, and handlers for ClubsList
 *
 * Manages: organisations/clubs/teams fetching, filter state, permissions,
 * CRUD operations (delete, save, create), derived filteredClubs.
 */

import { useEffect, useMemo, useReducer, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSports } from '@/hooks/useSports';
import { useContextSwitcher } from '@django-core/context-switcher';
import { invalidateFetchAllPagesCache } from '@/utils/fetchAllPages';
import { api } from '@/api/client';
import { organisationsApi, projectsApi } from '@/api';
import { canDeleteProject, canEditProject } from '@/utils/permissions';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formReducer, makeSetter } from '@/utils/formReducer';
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
  const { pushToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  interface ClubsDataState {
    isLoading: boolean;
    error: string | null;
    organisations: OrganisationOption[];
    clubs: ClubProject[];
    teams: ProjectOption[];
    detailProject: ProjectOption | null;
    isDetailModalOpen: boolean;
    editProject: ProjectOption | null;
    isEditModalOpen: boolean;
    refreshKey: number;
    isCreateModalOpen: boolean;
    selectedOrgId: string;
    statusFilter: string;
    sportFilter: string;
    selectedClubId: string;
  }

  const [s, dispatch] = useReducer(formReducer<ClubsDataState>, {
    isLoading: true, error: null,
    organisations: [], clubs: [], teams: [],
    detailProject: null, isDetailModalOpen: false,
    editProject: null, isEditModalOpen: false, refreshKey: 0,
    isCreateModalOpen: false,
    selectedOrgId: preselectedOrgId || '', statusFilter: 'all', sportFilter: 'all', selectedClubId: '',
  });

  const setIsLoading = useMemo(() => makeSetter<ClubsDataState, 'isLoading'>(dispatch, 'isLoading'), [dispatch]);
  const setError = useMemo(() => makeSetter<ClubsDataState, 'error'>(dispatch, 'error'), [dispatch]);
  const setOrganisations = useMemo(() => makeSetter<ClubsDataState, 'organisations'>(dispatch, 'organisations'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<ClubsDataState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<ClubsDataState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setDetailProject = useMemo(() => makeSetter<ClubsDataState, 'detailProject'>(dispatch, 'detailProject'), [dispatch]);
  const setIsDetailModalOpen = useMemo(() => makeSetter<ClubsDataState, 'isDetailModalOpen'>(dispatch, 'isDetailModalOpen'), [dispatch]);
  const setEditProject = useMemo(() => makeSetter<ClubsDataState, 'editProject'>(dispatch, 'editProject'), [dispatch]);
  const setIsEditModalOpen = useMemo(() => makeSetter<ClubsDataState, 'isEditModalOpen'>(dispatch, 'isEditModalOpen'), [dispatch]);
  const setIsCreateModalOpen = useMemo(() => makeSetter<ClubsDataState, 'isCreateModalOpen'>(dispatch, 'isCreateModalOpen'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<ClubsDataState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setStatusFilter = useMemo(() => makeSetter<ClubsDataState, 'statusFilter'>(dispatch, 'statusFilter'), [dispatch]);
  const setSportFilter = useMemo(() => makeSetter<ClubsDataState, 'sportFilter'>(dispatch, 'sportFilter'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<ClubsDataState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);

  const orgLocked = Boolean(preselectedOrgId);

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
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      return;
    }

    const load = async () => {
      try {
        const orgs = await api.listAll<OrganisationOption>('/organisations/', { pageSize: 100 });
        setOrganisations((orgs || []).map((o: OrganisationOption) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, s.refreshKey]);

  // ── Load clubs + teams ──

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const selectedOrg = s.selectedOrgId
        ? s.organisations.find((o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId))
        : null;

      if (s.selectedOrgId && !selectedOrg) {
        setClubs([]);
        setTeams([]);
        setIsLoading(false);
        return;
      }

      const orgSlugForApi = selectedOrg?.slug || (!s.selectedOrgId ? context.organisation?.slug : '') || '';

      try {
        if (orgSlugForApi) {
          const [allClubs, allTeams] = await Promise.all([
            organisationsApi.listAllProjects(orgSlugForApi, {
              parent_project__isnull: true,
              include_archived: true,
            }, { pageSize: 500 }),
            organisationsApi.listAllProjects(orgSlugForApi, {
              parent_project__isnull: false,
              include_archived: true,
            }, { pageSize: 500 }),
          ]);
          setClubs(allClubs as unknown as ClubProject[]);
          setTeams(allTeams as unknown as ProjectOption[]);
        } else {
          const [allClubs, allTeams] = await Promise.all([
            projectsApi.listAll({ parentProjectIsNull: true, includeArchived: true }, { pageSize: 200 }),
            projectsApi.listAll({ parentProjectIsNull: false, includeArchived: true }, { pageSize: 200 }),
          ]);
          setClubs(allClubs as unknown as ClubProject[]);
          setTeams(allTeams as unknown as ProjectOption[]);
        }
      } catch (e) {
        logger.error('Failed to load clubs', e);
        setError(e instanceof Error ? e.message : 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [s.refreshKey, s.selectedOrgId, s.organisations, context.organisation?.slug]);

  // ── Filtered + sorted clubs ──

  const filteredClubs = useMemo(() => {
    let list = [...s.clubs];

    const sortKey = (value: unknown) => {
      const sk = String(value ?? '').trim();
      return sk ? sk.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (club: ClubProject) => {
      const org = club?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      const fromList = orgId ? s.organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return fromList?.name || '';
    };

    const selectedOrg = s.selectedOrgId
      ? s.organisations.find((o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : s.selectedOrgId;

    if (s.selectedOrgId) {
      list = list.filter((club) => {
        const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
        return String(clubOrg) === String(selectedOrgIdResolved);
      });
    }

    if (s.statusFilter === 'active') {
      list = list.filter((c) => c.is_active !== false);
    } else if (s.statusFilter === 'inactive') {
      list = list.filter((c) => c.is_active === false);
    }

    if (s.sportFilter !== 'all') {
      list = list.filter((club) => {
        const nestedOrg = club?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? (nestedOrg as { sport?: { id?: string } })?.sport?.id : undefined;
        if (nestedSportId) return String(nestedSportId) === String(s.sportFilter);

        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          club?.organisation_id;
        const org = orgId ? s.organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        return String(org?.sport?.id || '') === String(s.sportFilter);
      });
    }

    if (s.selectedClubId) {
      list = list.filter((c) => String(c.id) === String(s.selectedClubId));
    }

    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });

    return list;
  }, [s.clubs, s.organisations, s.selectedOrgId, s.statusFilter, s.sportFilter, s.selectedClubId]);

  // ── CRUD handlers ──

  const handleDeleteProject = async (orgSlugOrId: string, projectSlugOrId: string, projectName: string) => {
    const ok = await confirm({ title: 'Club verwijderen', message: `"${projectName}" verwijderen?`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`);
      setClubs((prev) => prev.filter((p) => String(p.id) !== String(projectSlugOrId) && String(p.slug) !== String(projectSlugOrId)));
      if (String(s.selectedClubId) === String(projectSlugOrId)) setSelectedClubId('');
    } catch (e) {
      logger.error('Error deleting club', e);
      pushToast({ message: 'Club verwijderen mislukt', type: 'error' });
    }
  };

  const handleSaveProject = async (projectData: Record<string, unknown>) => {
    if (!s.editProject) return;
    const projectSlugOrId = s.editProject.slug || s.editProject.id;
    const updated = await api.patch<ProjectOption>(`/projects/${projectSlugOrId}/?include_archived=true`, projectData);

    setClubs((prev) =>
      prev.map((p) => {
        const match = String(p?.slug || p?.id) === String(projectSlugOrId);
        return match ? { ...p, ...(updated || projectData) } as ClubProject : p;
      })
    );
    setEditProject((prev: ProjectOption | null) => (prev ? { ...prev, ...(updated || projectData) } : prev));
    invalidateFetchAllPagesCache();
  };

  const handleCreateProject = async (projectData: Record<string, unknown>) => {
    const orgId = String(projectData.organisation_id || s.selectedOrgId || '');
    if (!orgId) throw new Error('Select a federation first');

    const orgSlug = s.organisations.find((o) => String(o.id) === String(orgId))?.slug || orgId;
    const created = await organisationsApi.createProject(orgSlug, {
      name: String(projectData.name || ''),
      description: String(projectData.description || ''),
    });

    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '');
      if (createdKey) {
        setClubs((prev) => {
          if (prev.some((p) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created as unknown as ClubProject, ...prev];
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
    isLoading: s.isLoading, error: s.error,
    // Data
    organisations: s.organisations, filteredClubs, teams: s.teams,
    // Auth / permissions
    isSuperAdmin, orgLocked, userCanEditProject, userCanDeleteProject,
    // Filters
    selectedOrgId: s.selectedOrgId, setSelectedOrgId,
    statusFilter: s.statusFilter, setStatusFilter,
    sportFilter: s.sportFilter, setSportFilter,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    categories,
    // Modals
    detailProject: s.detailProject, setDetailProject,
    isDetailModalOpen: s.isDetailModalOpen, setIsDetailModalOpen,
    editProject: s.editProject, setEditProject,
    isEditModalOpen: s.isEditModalOpen, setIsEditModalOpen,
    isCreateModalOpen: s.isCreateModalOpen, setIsCreateModalOpen,
    // Handlers
    handleDeleteProject, handleSaveProject, handleCreateProject,
    handleClearFilters,
    navigate,
  };
}
