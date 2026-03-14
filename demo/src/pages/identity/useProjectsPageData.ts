/**
 * useProjectsPageData — State, fetch, mutations, and permission logic for ProjectsPage.
 */
import { useEffect, useMemo, useReducer, type Dispatch, type SetStateAction, type ChangeEvent } from 'react';
import { useSearchParams, useParams, useNavigate, type NavigateFunction } from 'react-router-dom';
import { formReducer, makeSetter } from '../../utils/formReducer';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useContextSwitcher, type UserContext } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { Project } from '../../types';
import { canCreateProject, canEditProject, canDeleteProject } from '../../utils/permissions';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { OrganisationOption, ProjectOption } from '../work/WorkFilterBar';
import { routes } from '../../routes';
import { api } from '@/api';

export interface UseProjectsPageDataReturn {
  // Context
  orgId: string | undefined;
  navigate: NavigateFunction;
  organisations: Array<{ id: string; name: string; slug: string; description?: string }>;
  resolvedOrg: { id: string; name: string; slug: string } | undefined;
  currentOrgSlug: string | undefined;
  currentOrgId: string | number | undefined;
  displayOrgName: string;
  context: UserContext;
  // Data
  projects: Project[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  // Sort / search
  sort: string;
  order: string;
  search: string;
  // Filters
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  selectedOrgId: string;
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  selectedClubId: string;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  selectedTeamId: string;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  filterOrganisationOptions: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  orgNavigationIndex: Array<{ id: string; slug?: string }>;
  // Permissions
  isSuperAdmin: boolean;
  userCanCreateProject: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  // Modal state
  isEditModalOpen: boolean;
  setIsEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedProject: Project | null;
  setSelectedProject: Dispatch<SetStateAction<Project | null>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  detailProject: Project | null;
  setDetailProject: Dispatch<SetStateAction<Project | null>>;
  isOrgSelectionModalOpen: boolean;
  setIsOrgSelectionModalOpen: Dispatch<SetStateAction<boolean>>;
  // Handlers
  handleSaveProject: (projectData: Partial<Project>) => Promise<void>;
  handleDelete: (projectId: string) => Promise<void>;
  handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSort: (field: string) => void;
  // Breadcrumbs
  breadcrumbItems: Array<{ label: string; onClick?: () => void; current?: boolean }>;
}

export function useProjectsPageData(): UseProjectsPageDataReturn {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const { pushToast } = useToast();

  // Resolve org from URL
  const resolvedOrg = orgId
    ? organisations.find(o => o.slug === orgId || o.id === orgId)
    : undefined;
  const currentOrgSlug = resolvedOrg?.slug;
  const currentOrgId = resolvedOrg?.id;

  interface ProjectsPageState {
    orgName: string;
    projects: Project[];
    loading: boolean;
    error: string | null;
    statusFilter: string;
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    filterOrganisationOptions: OrganisationOption[];
    clubs: ProjectOption[];
    teams: ProjectOption[];
    orgNavigationIndex: Array<{ id: string; slug?: string }>;
    isEditModalOpen: boolean;
    selectedProject: Project | null;
    isDetailModalOpen: boolean;
    detailProject: Project | null;
    isOrgSelectionModalOpen: boolean;
    successMessage: string | null;
  }

  const [s, dispatch] = useReducer(formReducer<ProjectsPageState>, {
    orgName: '', projects: [], loading: true, error: null,
    statusFilter: 'active', selectedOrgId: '', selectedClubId: '', selectedTeamId: '',
    filterOrganisationOptions: [], clubs: [], teams: [],
    orgNavigationIndex: [],
    isEditModalOpen: false, selectedProject: null,
    isDetailModalOpen: false, detailProject: null,
    isOrgSelectionModalOpen: false, successMessage: null,
  });

  const setOrgName = useMemo(() => makeSetter<ProjectsPageState, 'orgName'>(dispatch, 'orgName'), [dispatch]);
  const setProjects = useMemo(() => makeSetter<ProjectsPageState, 'projects'>(dispatch, 'projects'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<ProjectsPageState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<ProjectsPageState, 'error'>(dispatch, 'error'), [dispatch]);
  const setStatusFilter = useMemo(() => makeSetter<ProjectsPageState, 'statusFilter'>(dispatch, 'statusFilter'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<ProjectsPageState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<ProjectsPageState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<ProjectsPageState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setFilterOrganisationOptions = useMemo(() => makeSetter<ProjectsPageState, 'filterOrganisationOptions'>(dispatch, 'filterOrganisationOptions'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<ProjectsPageState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<ProjectsPageState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setOrgNavigationIndex = useMemo(() => makeSetter<ProjectsPageState, 'orgNavigationIndex'>(dispatch, 'orgNavigationIndex'), [dispatch]);
  const setIsEditModalOpen = useMemo(() => makeSetter<ProjectsPageState, 'isEditModalOpen'>(dispatch, 'isEditModalOpen'), [dispatch]);
  const setSelectedProject = useMemo(() => makeSetter<ProjectsPageState, 'selectedProject'>(dispatch, 'selectedProject'), [dispatch]);
  const setIsDetailModalOpen = useMemo(() => makeSetter<ProjectsPageState, 'isDetailModalOpen'>(dispatch, 'isDetailModalOpen'), [dispatch]);
  const setDetailProject = useMemo(() => makeSetter<ProjectsPageState, 'detailProject'>(dispatch, 'detailProject'), [dispatch]);
  const setIsOrgSelectionModalOpen = useMemo(() => makeSetter<ProjectsPageState, 'isOrgSelectionModalOpen'>(dispatch, 'isOrgSelectionModalOpen'), [dispatch]);
  const setSuccessMessage = useMemo(() => makeSetter<ProjectsPageState, 'successMessage'>(dispatch, 'successMessage'), [dispatch]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Breadcrumb context
  const { organisationOptions, handleOrganisationSwitch } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug, description: o.description })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  const displayOrgName = currentOrgSlug ? s.orgName : '';
  const apiOrgSlug = orgId ? currentOrgSlug : undefined;

  // Permissions
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const permissionContext = { currentOrganisation: resolvedOrg, isSuperAdmin };
  const userCanCreateProject = canCreateProject(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // ── Effects ─────────────────────────────────────────────────

  // Init org filter
  useEffect(() => {
    if (resolvedOrg?.id) { setSelectedOrgId(String(resolvedOrg.id)); return; }
    if (!isSuperAdmin && context.organisation?.id) setSelectedOrgId(String(context.organisation.id));
  }, [resolvedOrg?.id, context.organisation?.id, isSuperAdmin]);

  // Org options for filter
  useEffect(() => {
    if (!isSuperAdmin) {
      const opts = organisations.map((o) => ({ id: String(o.id), name: o.name }));
      setFilterOrganisationOptions(opts);
      setOrgNavigationIndex(organisations.map((o) => ({ id: String(o.id), slug: o.slug })));
      return;
    }
    const load = async () => {
      try {
        const res = await api.list<{ id: string; name: string; slug?: string }>('/organisations/', { pageSize: 100 });
        const orgs = res.results || [];
        setFilterOrganisationOptions(orgs.map((o) => ({ id: String(o.id), name: o.name })));
        setOrgNavigationIndex(orgs.map((o) => ({ id: String(o.id), slug: o.slug })));
      } catch {
        const fallback = organisations.map((o) => ({ id: String(o.id), name: o.name }));
        setFilterOrganisationOptions(fallback);
        setOrgNavigationIndex(organisations.map((o) => ({ id: String(o.id), slug: o.slug })));
      }
    };
    load();
  }, [isSuperAdmin, organisations]);

  // Club/Team options
  useEffect(() => {
    const load = async () => {
      try {
        const [allClubs, allTeams] = await Promise.all([
          api.listAll<ProjectOption>('/projects/', { params: { parent_project__isnull: true }, pageSize: 200 }),
          api.listAll<ProjectOption>('/projects/', { params: { parent_project__isnull: false }, pageSize: 200 }),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch { setClubs([]); setTeams([]); }
    };
    load();
  }, []);

  // Query params
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  // ── Fetch ────────────────────────────────────────────────────

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      if (resolvedOrg) {
        setOrgName(resolvedOrg.name);
      } else if (orgId) {
        try {
          const d = await api.get<{ name: string }>(`/organisations/${orgId}/`);
          setOrgName(d.name);
        } catch { /* ignore */ }
      } else {
        setOrgName(context.organisation?.name || '');
      }

      const params = new URLSearchParams();
      params.append('sort', sort);
      params.append('order', order);
      if (search) params.append('search', search);

      const endpoint = apiOrgSlug
        ? `/organisations/${apiOrgSlug}/projects/`
        : `/projects/`;

      const res = await api.list<Project>(endpoint, {
        params: { sort, order, search: search || undefined },
      });
      setProjects(res.results || []);
    } catch (err) {
      logger.error('Failed to fetch projects', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [sort, order, search, orgId]);

  // ── Mutations ─────────────────────────────────────────────────

  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!s.selectedProject) return;
    try {
      const project = s.projects.find(p => p.id === s.selectedProject!.id);
      let projectOrgSlug: string | undefined;

      if ((project as Project & { organisation?: { slug: string } })?.organisation?.slug) projectOrgSlug = (project as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (project?.organisation_id) projectOrgSlug = organisations.find(o => o.id === project.organisation_id)?.slug;
      else if ((s.selectedProject as Project & { organisation?: { slug: string } })?.organisation?.slug) projectOrgSlug = (s.selectedProject as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (currentOrgSlug) projectOrgSlug = currentOrgSlug;

      if (!projectOrgSlug) throw new Error('Could not determine project organisation');

      const projectSlug = s.selectedProject.slug;
      if (!projectSlug) throw new Error('Could not determine project slug');

      let response;
      try {
        response = await api.patch<Project>(
          `/organisations/${projectOrgSlug}/projects/${projectSlug}/`,
          projectData,
        );
      } catch {
        response = await api.patch<Project>(
          `/projects/projects/${projectSlug}/`,
          projectData,
        );
      }

      setIsEditModalOpen(false);
      setSelectedProject(null);
      setSuccessMessage('Project updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchProjects();
    } catch (err) {
      logger.error('Failed to update project', err);
      pushToast({ message: err instanceof Error ? err.message : 'Failed to update project', type: 'error' });
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const projectToDelete = s.projects.find(p => p.id === projectId);
      const projectSlug = projectToDelete?.slug || projectId;

      let orgSlug: string | undefined;
      if ((projectToDelete as Project & { organisation?: { slug: string } })?.organisation?.slug) orgSlug = (projectToDelete as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (resolvedOrg) orgSlug = resolvedOrg.slug;

      if (!orgSlug) { pushToast({ message: 'Failed to delete project: missing organisation context', type: 'error' }); return; }

      await api.delete(`/organisations/${orgSlug}/projects/${projectSlug}/`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch { pushToast({ message: 'Error deleting project', type: 'error' }); }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    v ? searchParams.set('search', v) : searchParams.delete('search');
    setSearchParams(searchParams);
  };

  const handleSort = (column: string) => {
    if (sort === column) searchParams.set('order', order === 'asc' ? 'desc' : 'asc');
    else { searchParams.set('sort', column); searchParams.set('order', 'asc'); }
    setSearchParams(searchParams);
  };

  // ── Breadcrumbs ──────────────────────────────────────────────

  const breadcrumbItems = currentOrgId ? [
    { label: 'Dashboard', onClick: () => navigate(routes.dashboard()) },
    { label: 'Federations', onClick: () => navigate('/federations') },
    { label: s.orgName || 'Federation', onClick: () => navigate(routes.orgDetailLegacy({ orgId: String(resolvedOrg?.slug || currentOrgId) })) },
    { label: 'Clubs & Teams', current: true },
  ] : [
    { label: 'Dashboard', onClick: () => navigate(routes.dashboard()) },
    { label: 'Clubs & Teams', current: true },
  ];

  return {
    // Context
    orgId, navigate, organisations, resolvedOrg, currentOrgSlug, currentOrgId,
    displayOrgName, context,
    // Data
    projects: s.projects, loading: s.loading, error: s.error, successMessage: s.successMessage,
    // Sort / search
    sort, order, search,
    // Filters
    statusFilter: s.statusFilter, setStatusFilter,
    selectedOrgId: s.selectedOrgId, setSelectedOrgId,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    selectedTeamId: s.selectedTeamId, setSelectedTeamId,
    filterOrganisationOptions: s.filterOrganisationOptions, clubs: s.clubs, teams: s.teams,
    orgNavigationIndex: s.orgNavigationIndex,
    // Permissions
    isSuperAdmin, userCanCreateProject, userCanEditProject, userCanDeleteProject,
    // Modal state
    isEditModalOpen: s.isEditModalOpen, setIsEditModalOpen,
    selectedProject: s.selectedProject, setSelectedProject,
    isDetailModalOpen: s.isDetailModalOpen, setIsDetailModalOpen,
    detailProject: s.detailProject, setDetailProject,
    isOrgSelectionModalOpen: s.isOrgSelectionModalOpen, setIsOrgSelectionModalOpen,
    // Handlers
    handleSaveProject, handleDelete, handleSearch, handleSort,
    // Breadcrumbs
    breadcrumbItems,
  };
}
