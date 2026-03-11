/**
 * useProjectsPageData — State, fetch, mutations, and permission logic for ProjectsPage.
 */
import { useEffect, useState, type Dispatch, type SetStateAction, type ChangeEvent } from 'react';
import { useSearchParams, useParams, useNavigate, type NavigateFunction } from 'react-router-dom';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { Project } from '../../types';
import { canCreateProject, canEditProject, canDeleteProject } from '../../utils/permissions';
import { logger } from '@/utils/logger';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../work/WorkFilterBar';
import { getApiBaseUrl } from '../../utils/apiBase';
import { api } from '../../api';

export interface UseProjectsPageDataReturn {
  // Context
  orgId: string | undefined;
  navigate: NavigateFunction;
  organisations: Array<{ id: string; name: string; slug: string; description?: string }>;
  resolvedOrg: { id: string; name: string; slug: string } | undefined;
  currentOrgSlug: string | undefined;
  currentOrgId: string | number | undefined;
  displayOrgName: string;
  context: { organisation?: { id: string | number; name: string; slug?: string }; isLoading?: boolean };
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

  // Resolve org from URL
  const resolvedOrg = orgId
    ? organisations.find(o => o.slug === orgId || o.id === orgId)
    : undefined;
  const currentOrgSlug = resolvedOrg?.slug;
  const currentOrgId = resolvedOrg?.id;

  const [orgName, setOrgName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [filterOrganisationOptions, setFilterOrganisationOptions] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [orgNavigationIndex, setOrgNavigationIndex] = useState<Array<{ id: string; slug?: string }>>([]);

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isOrgSelectionModalOpen, setIsOrgSelectionModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Breadcrumb context
  const { organisationOptions, handleOrganisationSwitch } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug, description: o.description })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  const displayOrgName = currentOrgSlug ? orgName : '';
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
      const apiBaseUrl = getApiBaseUrl();
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
      const apiBaseUrl = getApiBaseUrl();
      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`, { credentials: 'include' }),
          fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`, { credentials: 'include' }),
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
      const apiBaseUrl = getApiBaseUrl();

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
    if (!selectedProject) return;
    try {
      const project = projects.find(p => p.id === selectedProject.id);
      let projectOrgSlug: string | undefined;

      if ((project as Project & { organisation?: { slug: string } })?.organisation?.slug) projectOrgSlug = (project as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (project?.organisation_id) projectOrgSlug = organisations.find(o => o.id === project.organisation_id)?.slug;
      else if ((selectedProject as Project & { organisation?: { slug: string } })?.organisation?.slug) projectOrgSlug = (selectedProject as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (currentOrgSlug) projectOrgSlug = currentOrgSlug;

      if (!projectOrgSlug) throw new Error('Could not determine project organisation');

      const projectSlug = selectedProject.slug;
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
      alert(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const projectToDelete = projects.find(p => p.id === projectId);
      const projectSlug = projectToDelete?.slug || projectId;

      let orgSlug: string | undefined;
      if ((projectToDelete as Project & { organisation?: { slug: string } })?.organisation?.slug) orgSlug = (projectToDelete as Project & { organisation?: { slug: string } }).organisation!.slug;
      else if (resolvedOrg) orgSlug = resolvedOrg.slug;

      if (!orgSlug) { alert('Failed to delete project: missing organisation context'); return; }

      await api.delete(`/organisations/${orgSlug}/projects/${projectSlug}/`);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch { alert('Error deleting project'); }
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
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/federations') },
    { label: orgName || 'Federation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}`) },
    { label: 'Clubs & Teams', current: true },
  ] : [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Clubs & Teams', current: true },
  ];

  return {
    // Context
    orgId, navigate, organisations, resolvedOrg, currentOrgSlug, currentOrgId,
    displayOrgName, context: context as any,
    // Data
    projects, loading, error, successMessage,
    // Sort / search
    sort, order, search,
    // Filters
    statusFilter, setStatusFilter,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    filterOrganisationOptions, clubs, teams,
    orgNavigationIndex,
    // Permissions
    isSuperAdmin, userCanCreateProject, userCanEditProject, userCanDeleteProject,
    // Modal state
    isEditModalOpen, setIsEditModalOpen,
    selectedProject, setSelectedProject,
    isDetailModalOpen, setIsDetailModalOpen,
    detailProject, setDetailProject,
    isOrgSelectionModalOpen, setIsOrgSelectionModalOpen,
    // Handlers
    handleSaveProject, handleDelete, handleSearch, handleSort,
    // Breadcrumbs
    breadcrumbItems,
  };
}
