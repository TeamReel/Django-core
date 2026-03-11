import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSports } from '../../../hooks/useSports';
import { useContextSwitcher } from '@django-core/context-switcher';
import { invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { canDeleteProject, canEditProject } from '../../../utils/permissions';
import { api } from '../../../api/client';
import { organisationsApi, projectsApi } from '../../../api';
import { logger } from '@/utils/logger';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [detailProject, setDetailProject] = useState<ProjectOption | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [editProject, setEditProject] = useState<ProjectOption | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(preselectedOrgId || '');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  const { categories } = useSports();

  const [lockedOrgSlug, setLockedOrgSlug] = useState<string>('');

  // ── Sync preselected props ──

  useEffect(() => {
    if (preselectedOrgId) setSelectedOrgId(preselectedOrgId);
  }, [preselectedOrgId]);

  useEffect(() => {
    if (!orgLocked) {
      if (lockedOrgSlug) setLockedOrgSlug('');
      return;
    }
    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }
    const fromList = organisations.find((o) => String(o.id) === String(rawLockedId))?.slug;
    if (fromList) {
      setLockedOrgSlug(String(fromList));
      return;
    }

    let cancelled = false;
    const loadSlug = async () => {
      try {
        const { results: list } = await api.list<any>('/organisations/', { pageSize: 250 });
        const match = list.find((o: { id?: string; slug?: string }) => String(o?.id || '') === String(rawLockedId));
        const slug = String(match?.slug || '').trim();
        if (!cancelled && slug) setLockedOrgSlug(slug);
      } catch { /* ignore */ }
    };
    void loadSlug();
    return () => { cancelled = true; };
  }, [orgLocked, preselectedOrgId, organisations]);

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
        const orgs = await api.listAll<any>('/organisations/', { pageSize: 100 });
        setOrganisations((orgs || []).map((o: { id: string | number; name: string; slug?: string }) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch { /* ignore */ }
    };
    load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // ── Load clubs + teams ──

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const getSelectedOrgSlugForApi = () => {
        const selectedOrg = selectedOrgId
          ? organisations.find(
              (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
            )
          : null;
        if (selectedOrgId && !selectedOrg) return '';
        if (orgLocked) return selectedOrg?.slug || lockedOrgSlug || '';
        return selectedOrg?.slug || (!selectedOrgId ? context.organisation?.slug : '') || '';
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
          setClubs(clubsData || []);
          setTeams(teamsData || []);
        } else {
          const [clubsData, teamsData] = await Promise.all([
            projectsApi.listAll({ parentProjectIsNull: true, includeArchived: true }, { pageSize: 200 }),
            projectsApi.listAll({ parentProjectIsNull: false, includeArchived: true }, { pageSize: 200 }),
          ]);
          setClubs(clubsData || []);
          setTeams(teamsData || []);
        }
      } catch (e) {
        logger.error('Failed to load teams', e);
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [refreshKey, orgLocked, lockedOrgSlug, preselectedOrgId, selectedOrgId, context.organisation, organisations]);

  // ── Filtered + sorted teams ──

  const filteredTeams = useMemo(() => {
    let list = [...teams];

    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };
    const getFederationName = (team: ProjectOption) => {
      const org = team?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      return orgId ? (organisations.find((o) => String(o.id) === String(orgId))?.name || '') : '';
    };
    const getClubName = (team: ProjectOption) => {
      const parent = team?.parent_project || team?.parent_id || team?.parent_project_id;
      const parentId = typeof parent === 'object' ? parent?.id : parent;
      const parentName = typeof parent === 'object' ? (parent?.name || parent?.slug) : '';
      return clubs.find((c) => String(c.id) === String(parentId))?.name || parentName || '';
    };

    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : selectedOrgId;

    if (selectedOrgId) {
      list = list.filter((team) => {
        const teamOrg = typeof team.organisation === 'string' ? team.organisation : team.organisation?.id;
        return String(teamOrg) === String(selectedOrgIdResolved);
      });
    }
    if (selectedClubId) {
      list = list.filter((team) => {
        const parent = team.parent_project || team.parent_id || team.parent_project_id;
        const parentId = typeof parent === 'object' ? parent?.id : parent;
        return String(parentId) === String(selectedClubId);
      });
    }
    if (selectedTeamId) {
      list = list.filter((t) => String(t.id) === String(selectedTeamId));
    }
    if (statusFilter === 'active') list = list.filter((c) => c.is_active !== false);
    else if (statusFilter === 'inactive') list = list.filter((c) => c.is_active === false);

    if (sportFilter !== 'all') {
      list = list.filter((team) => {
        const nestedOrg = team?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? (nestedOrg as { sport?: { id?: string } })?.sport?.id : undefined;
        if (nestedSportId) return String(nestedSportId) === String(sportFilter);
        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          team?.organisation_id;
        const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        return String(org?.sport?.id || '') === String(sportFilter);
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
  }, [teams, selectedOrgId, selectedClubId, selectedTeamId, statusFilter, sportFilter, organisations, clubs]);

  // ── Actions ──

  const handleDeleteProject = async (orgSlugOrId: string, teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${teamName}?`)) return;
    try {
      await api.delete(`/organisations/${orgSlugOrId}/projects/${teamId}/`);
      setTeams((prev) => prev.filter((p) => String(p.id) !== String(teamId)));
      if (String(selectedTeamId) === String(teamId)) setSelectedTeamId('');
    } catch (e) {
      logger.error('Error deleting team', e);
      alert('Error deleting team');
    }
  };

  const handleEditSave = async (projectData: Record<string, unknown>) => {
    if (!editProject) return;
    const projectSlugOrId = editProject.slug || editProject.id;
    const updated = await api.patch<any>(`/projects/${projectSlugOrId}/?include_archived=true`, projectData);
    setTeams((prev) =>
      prev.map((p) => {
        const match = String(p?.slug || p?.id) === String(projectSlugOrId);
        return match ? { ...p, ...(updated || projectData) } : p;
      }),
    );
    setEditProject((prev) => (prev ? { ...prev, ...(updated || projectData) } : prev));
    invalidateFetchAllPagesCache();
  };

  const handleCreateTeam = async (projectData: Record<string, unknown>) => {
    const orgId = String(projectData.organisation_id || selectedOrgId || '');
    const clubId = String(projectData.parent_project_id || selectedClubId || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!clubId) throw new Error('Select a club first');

    const orgSlug = organisations.find((o) => String(o.id) === String(orgId))?.slug || orgId;
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
    isLoading, error, organisations, clubs, teams, filteredTeams,
    detailProject, isDetailModalOpen, editProject, isEditModalOpen,
    isCreateModalOpen, selectedOrgId, selectedClubId, selectedTeamId,
    statusFilter, sportFilter, lockedOrgSlug,
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
