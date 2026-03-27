import { useEffect, useMemo, useReducer, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSports } from '@/hooks/useSports';
import { useContextSwitcher } from '@django-core/context-switcher';
import { invalidateFetchAllPagesCache } from '@/utils/fetchAllPages';
import { canDeleteProject, canEditProject } from '@/utils/permissions';
import { api } from '@/api/client';
import { organisationsApi, projectsApi } from '@/api';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formReducer, makeSetter } from '@/utils/formReducer';
import type { Organisation } from '@/types/api/organisation';
import type { Project } from '@/types/api/project';
import type { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());
const isUuid = (value: unknown) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );

export { isNumericId, isUuid };

interface TeamsListHookProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
}

export interface UseTeamsListDataReturn {
  // State
  isLoading: boolean;
  error: string | null;
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  filteredTeams: ProjectOption[];
  detailProject: ProjectOption | null;
  isDetailModalOpen: boolean;
  editProject: ProjectOption | null;
  isEditModalOpen: boolean;
  isCreateModalOpen: boolean;
  selectedOrgId: string;
  selectedClubId: string;
  selectedTeamId: string;
  statusFilter: string;
  sportFilter: string;
  lockedOrgSlug: string;
  // Derived
  orgLocked: boolean;
  clubLocked: boolean;
  isSuperAdmin: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  categories: ReturnType<typeof useSports>['categories'];
  navigate: NavigateFunction;
  // Setters
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setSportFilter: Dispatch<SetStateAction<string>>;
  setDetailProject: Dispatch<SetStateAction<ProjectOption | null>>;
  setIsDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditProject: Dispatch<SetStateAction<ProjectOption | null>>;
  setIsEditModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  // Actions
  handleDeleteProject: (orgSlugOrId: string, teamId: string, teamName: string) => Promise<void>;
  handleEditSave: (projectData: Record<string, unknown>) => Promise<void>;
  handleCreateTeam: (projectData: Record<string, unknown>) => Promise<void>;
  clearFilters: () => void;
}

export function useTeamsListData({ preselectedOrgId, preselectedClubId }: TeamsListHookProps): UseTeamsListDataReturn {
  const { pushToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  interface TeamsListState {
    isLoading: boolean;
    error: string | null;
    organisations: OrganisationOption[];
    clubs: ProjectOption[];
    teams: ProjectOption[];
    detailProject: ProjectOption | null;
    isDetailModalOpen: boolean;
    editProject: ProjectOption | null;
    isEditModalOpen: boolean;
    refreshKey: number;
    isCreateModalOpen: boolean;
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    statusFilter: string;
    sportFilter: string;
    lockedOrgSlug: string;
  }

  const [s, dispatch] = useReducer(formReducer<TeamsListState>, {
    isLoading: true, error: null,
    organisations: [], clubs: [], teams: [],
    detailProject: null, isDetailModalOpen: false,
    editProject: null, isEditModalOpen: false, refreshKey: 0,
    isCreateModalOpen: false,
    selectedOrgId: preselectedOrgId || '', selectedClubId: preselectedClubId || '',
    selectedTeamId: '', statusFilter: 'all', sportFilter: 'all',
    lockedOrgSlug: '',
  });

  const setIsLoading = useMemo(() => makeSetter<TeamsListState, 'isLoading'>(dispatch, 'isLoading'), [dispatch]);
  const setError = useMemo(() => makeSetter<TeamsListState, 'error'>(dispatch, 'error'), [dispatch]);
  const setOrganisations = useMemo(() => makeSetter<TeamsListState, 'organisations'>(dispatch, 'organisations'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<TeamsListState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<TeamsListState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setDetailProject = useMemo(() => makeSetter<TeamsListState, 'detailProject'>(dispatch, 'detailProject'), [dispatch]);
  const setIsDetailModalOpen = useMemo(() => makeSetter<TeamsListState, 'isDetailModalOpen'>(dispatch, 'isDetailModalOpen'), [dispatch]);
  const setEditProject = useMemo(() => makeSetter<TeamsListState, 'editProject'>(dispatch, 'editProject'), [dispatch]);
  const setIsEditModalOpen = useMemo(() => makeSetter<TeamsListState, 'isEditModalOpen'>(dispatch, 'isEditModalOpen'), [dispatch]);
  const setRefreshKey = useMemo(() => makeSetter<TeamsListState, 'refreshKey'>(dispatch, 'refreshKey'), [dispatch]);
  const setIsCreateModalOpen = useMemo(() => makeSetter<TeamsListState, 'isCreateModalOpen'>(dispatch, 'isCreateModalOpen'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<TeamsListState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<TeamsListState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<TeamsListState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setStatusFilter = useMemo(() => makeSetter<TeamsListState, 'statusFilter'>(dispatch, 'statusFilter'), [dispatch]);
  const setSportFilter = useMemo(() => makeSetter<TeamsListState, 'sportFilter'>(dispatch, 'sportFilter'), [dispatch]);
  const setLockedOrgSlug = useMemo(() => makeSetter<TeamsListState, 'lockedOrgSlug'>(dispatch, 'lockedOrgSlug'), [dispatch]);

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);

  const { categories } = useSports();

  // ── Sync preselected props ──

  useEffect(() => {
    if (preselectedOrgId) setSelectedOrgId(preselectedOrgId);
  }, [preselectedOrgId]);

  useEffect(() => {
    if (!orgLocked) {
      if (s.lockedOrgSlug) setLockedOrgSlug('');
      return;
    }
    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }
    const fromList = s.organisations.find((o) => String(o.id) === String(rawLockedId))?.slug;
    if (fromList) {
      setLockedOrgSlug(String(fromList));
      return;
    }

    let cancelled = false;
    const loadSlug = async () => {
      try {
        const { results: list } = await api.list<Organisation>('/organisations/', { pageSize: 250 });
        const match = list.find((o: { id?: string; slug?: string }) => String(o?.id || '') === String(rawLockedId));
        const slug = String(match?.slug || '').trim();
        if (!cancelled && slug) setLockedOrgSlug(slug);
      } catch { /* ignore */ }
    };
    void loadSlug();
    return () => { cancelled = true; };
  }, [orgLocked, preselectedOrgId, s.organisations]);

  useEffect(() => {
    if (preselectedClubId) setSelectedClubId(preselectedClubId);
  }, [preselectedClubId]);

  // ── Permissions ──

  const permissionContext = useMemo(
    () => ({ currentOrganisation: context.organisation ?? undefined, isSuperAdmin }),
    [context.organisation, isSuperAdmin],
  );
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // ── Initialize filters ──

  useEffect(() => {
    if (orgLocked) return;
    if (!isSuperAdmin && context.organisation?.id) setSelectedOrgId(String(context.organisation.id));
  }, [context.organisation?.id, isSuperAdmin, orgLocked]);

  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');
    if (!orgLocked && orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams, orgLocked, clubLocked]);

  // ── Load organisations ──

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      return;
    }
    const load = async () => {
      try {
        const orgs = await api.listAll<Organisation>('/organisations/', { pageSize: 100 });
        setOrganisations((orgs || []).map((o: { id: string | number; name: string; slug?: string }) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch { /* ignore */ }
    };
    load();
  }, [isSuperAdmin, myOrganisations, s.refreshKey]);

  // ── Load clubs + teams ──

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const getSelectedOrgSlugForApi = () => {
        const selectedOrg = s.selectedOrgId
          ? s.organisations.find(
              (o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId),
            )
          : null;
        if (s.selectedOrgId && !selectedOrg) return '';
        if (orgLocked) return selectedOrg?.slug || s.lockedOrgSlug || '';
        return selectedOrg?.slug || (!s.selectedOrgId ? context.organisation?.slug : '') || '';
      };

      try {
        const orgSlugForApi = getSelectedOrgSlugForApi();

        if (orgLocked && !orgSlugForApi) {
          setClubs([]); setTeams([]); setIsLoading(false);
          return;
        }

        if (orgSlugForApi) {
          const [clubsData, teamsData] = await Promise.all([
            organisationsApi.listAllProjects(orgSlugForApi, {
              parent_project__isnull: true,
              include_archived: true,
            }, { pageSize: 500 }),
            organisationsApi.listAllProjects(orgSlugForApi, {
              parent_project__isnull: false,
              include_archived: true,
            }, { pageSize: 500 }),
          ]);
          setClubs((clubsData || []) as unknown as ProjectOption[]);
          setTeams((teamsData || []) as unknown as ProjectOption[]);
        } else {
          const [clubsData, teamsData] = await Promise.all([
            projectsApi.listAll({ parentProjectIsNull: true, includeArchived: true }, { pageSize: 200 }),
            projectsApi.listAll({ parentProjectIsNull: false, includeArchived: true }, { pageSize: 200 }),
          ]);
          setClubs((clubsData || []) as unknown as ProjectOption[]);
          setTeams((teamsData || []) as unknown as ProjectOption[]);
        }
      } catch (e) {
        logger.error('Failed to load teams', e);
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [s.refreshKey, orgLocked, s.lockedOrgSlug, preselectedOrgId, s.selectedOrgId, context.organisation, s.organisations]);

  // ── Filtered + sorted teams ──

  const filteredTeams = useMemo(() => {
    let list = [...s.teams];

    const sortKey = (value: unknown) => {
      const sk = String(value ?? '').trim();
      return sk ? sk.toLocaleLowerCase() : '\uffff';
    };
    const getFederationName = (team: ProjectOption) => {
      const org = team?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      return orgId ? (s.organisations.find((o) => String(o.id) === String(orgId))?.name || '') : '';
    };
    const getClubName = (team: ProjectOption) => {
      const parent = team?.parent_project || team?.parent_id || team?.parent_project_id;
      const parentId = typeof parent === 'object' ? parent?.id : parent;
      const parentName = typeof parent === 'object' ? (parent?.name || parent?.slug) : '';
      return s.clubs.find((c) => String(c.id) === String(parentId))?.name || parentName || '';
    };

    const selectedOrg = s.selectedOrgId
      ? s.organisations.find((o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : s.selectedOrgId;

    if (s.selectedOrgId) {
      list = list.filter((team) => {
        const teamOrg = typeof team.organisation === 'string' ? team.organisation : team.organisation?.id;
        return String(teamOrg) === String(selectedOrgIdResolved);
      });
    }
    if (s.selectedClubId) {
      list = list.filter((team) => {
        const parent = team.parent_project || team.parent_id || team.parent_project_id;
        const parentId = typeof parent === 'object' ? parent?.id : parent;
        return String(parentId) === String(s.selectedClubId);
      });
    }
    if (s.selectedTeamId) {
      list = list.filter((t) => String(t.id) === String(s.selectedTeamId));
    }
    if (s.statusFilter === 'active') list = list.filter((c) => c.is_active !== false);
    else if (s.statusFilter === 'inactive') list = list.filter((c) => c.is_active === false);

    if (s.sportFilter !== 'all') {
      list = list.filter((team) => {
        const nestedOrg = team?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? (nestedOrg as { sport?: { id?: string } })?.sport?.id : undefined;
        if (nestedSportId) return String(nestedSportId) === String(s.sportFilter);
        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          team?.organisation_id;
        const org = orgId ? s.organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        return String(org?.sport?.id || '') === String(s.sportFilter);
      });
    }

    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a)).localeCompare(sortKey(getClubName(b)));
      if (byClub !== 0) return byClub;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });

    return list;
  }, [s.teams, s.selectedOrgId, s.selectedClubId, s.selectedTeamId, s.statusFilter, s.sportFilter, s.organisations, s.clubs]);

  // ── Actions ──

  const handleDeleteProject = async (orgSlugOrId: string, teamId: string, teamName: string) => {
    const ok = await confirm({ title: 'Team verwijderen', message: `"${teamName}" verwijderen?`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/organisations/${orgSlugOrId}/projects/${teamId}/`);
      setTeams((prev) => prev.filter((p) => String(p.id) !== String(teamId)));
      if (String(s.selectedTeamId) === String(teamId)) setSelectedTeamId('');
    } catch (e) {
      logger.error('Error deleting team', e);
      pushToast({ message: 'Team verwijderen mislukt', type: 'error' });
    }
  };

  const handleEditSave = async (projectData: Record<string, unknown>) => {
    if (!s.editProject) return;
    const projectSlugOrId = s.editProject.slug || s.editProject.id;
    const updated = await api.patch<Project>(`/projects/${projectSlugOrId}/?include_archived=true`, projectData);
    setTeams((prev) =>
      prev.map((p) => {
        const match = String(p?.slug || p?.id) === String(projectSlugOrId);
        return match ? { ...p, ...(updated || projectData) } as ProjectOption : p;
      }),
    );
    setEditProject((prev) => (prev ? { ...prev, ...(updated || projectData) } as ProjectOption : prev));
    invalidateFetchAllPagesCache();
  };

  const handleCreateTeam = async (projectData: Record<string, unknown>) => {
    const orgId = String(projectData.organisation_id || s.selectedOrgId || '');
    const clubId = String(projectData.parent_project_id || s.selectedClubId || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!clubId) throw new Error('Select a club first');

    const orgSlug = s.organisations.find((o) => String(o.id) === String(orgId))?.slug || orgId;
    const created = await organisationsApi.createProject(orgSlug, {
      name: String(projectData.name || ''),
      description: String(projectData.description || ''),
      parent_project_id: clubId,
    });
    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '').trim();
      if (createdKey) {
        setTeams((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
          return [created as unknown as ProjectOption, ...list];
        });
      }
    }
    invalidateFetchAllPagesCache();
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSportFilter('all');
    if (!clubLocked) setSelectedClubId('');
    setSelectedTeamId('');
    if (isSuperAdmin) setSelectedOrgId('');
  };

  return {
    // State
    isLoading: s.isLoading, error: s.error, organisations: s.organisations, clubs: s.clubs, teams: s.teams, filteredTeams,
    detailProject: s.detailProject, isDetailModalOpen: s.isDetailModalOpen, editProject: s.editProject, isEditModalOpen: s.isEditModalOpen,
    isCreateModalOpen: s.isCreateModalOpen, selectedOrgId: s.selectedOrgId, selectedClubId: s.selectedClubId, selectedTeamId: s.selectedTeamId,
    statusFilter: s.statusFilter, sportFilter: s.sportFilter, lockedOrgSlug: s.lockedOrgSlug,
    // Derived
    orgLocked, clubLocked, isSuperAdmin, userCanEditProject, userCanDeleteProject,
    categories, navigate,
    // Setters
    setSelectedOrgId, setSelectedClubId, setSelectedTeamId,
    setStatusFilter, setSportFilter,
    setDetailProject, setIsDetailModalOpen,
    setEditProject, setIsEditModalOpen,
    setIsCreateModalOpen,
    // Actions
    handleDeleteProject, handleEditSave, handleCreateTeam, clearFilters,
  };
}
