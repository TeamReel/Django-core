/**
 * useSquadPageData — state, data fetching, permissions, breadcrumbs, mutations
 * for ProjectSeasonSquadPage.
 */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';

import { api } from '@/api';
import { trashApi } from '@/api/trash';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';
import type { ProjectMembership } from '@/types/api/project';

// ── Types ────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  slug?: string;
  name: string;
  organisation?: { id?: string; slug?: string; name?: string; user_role?: string } | null;
  parent_project?: { id: string; slug?: string; name: string } | null;
};

export type Organisation = {
  id: string;
  slug?: string;
  name: string;
  user_role?: 'admin' | 'member';
};

export interface UseSquadPageDataReturn {
  // Route info
  navigate: NavigateFunction;
  orgSlugOrId: string;
  clubSlugOrId: string;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  effectiveSeasonId: string;
  // Data
  loading: boolean;
  error: string | null;
  organisation: Organisation | null;
  clubProject: Project | null;
  project: Project | null;
  season: Period | null;
  resolvedSeasonId: string;
  seasonsForSwitcher: Period[];
  members: Membership[];
  seasonKeyOrId: string;
  // Permissions
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  // Modal state
  isPeriodEditModalOpen: boolean;
  setIsPeriodEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEditPeriod: Period | null;
  setSelectedEditPeriod: Dispatch<SetStateAction<Period | null>>;
  isMembershipEditModalOpen: boolean;
  setIsMembershipEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedMembership: Membership | null;
  setSelectedMembership: Dispatch<SetStateAction<Membership | null>>;
  // Actions
  handleSeasonSwitch: (option: { id: string; slug?: string } | null) => void;
  deleteSeason: () => Promise<void>;
  deleteMembership: (membership: Membership) => Promise<void>;
  savePeriodEdit: (payload: Record<string, unknown>) => Promise<void>;
  saveMembershipEdit: (params: { role: string; functional_roles: string[] }) => Promise<void>;
}

export type Period = {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  period_type?: string;
  start_date?: string;
  end_date?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  parent_period?: { id: string; name: string } | null;
  parent_period_id?: string | null;
  data?: Record<string, unknown>;
};

export interface Membership {
  id?: string;
  user?: { id?: string | number; name?: string; first_name?: string; last_name?: string; email?: string };
  role?: string;
  functional_roles?: string[];
  functionalRoles?: string[];
  metadata?: Record<string, unknown>;
  period_id?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function isSeasonPeriod(p: Period | null | undefined): boolean {
  if (!p) return false;
  const explicit = String(p.type || p.period_type || '').toLowerCase();
  if (explicit === 'season') return true;
  return !Boolean(p.parent_period || p.parent_period_id);
}

function unwrap<T = unknown>(payload: unknown): T {
  return ((payload as Record<string, unknown>)?.data as T) ?? (payload as T);
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSquadPageData(): UseSquadPageDataReturn {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { pushToast } = useToast();
  const confirm = useConfirm();

  const apiBaseUrl = getApiV1BaseUrl();

  const orgSlugOrId = String(params.orgId || '').trim();
  const projectSlugOrId = String(params.projectId || '').trim();
  const clubSlugOrId = String(params.clubId || '').trim();
  const effectiveSeasonId = String(params.seasonId || '').trim();
  const isTeamRoute = Boolean(clubSlugOrId);

  const seasonsBasePath = useMemo(() => {
    if (isTeamRoute) {
      return `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`;
    }
    return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
  }, [clubSlugOrId, isTeamRoute, orgSlugOrId, projectSlugOrId]);

  // ── State ──────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [clubProject, setClubProject] = useState<Project | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');

  const [seasonsForSwitcher, setSeasonsForSwitcher] = useState<Period[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);

  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<Period | null>(null);
  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);

  // ── Permissions ────────────────────────────────────────────────────

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean(user?.is_superuser) ||
    Boolean(user?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation;
    const route = String(orgSlugOrId || '').trim();
    const orgIdMatches = (candidate: { id?: string; slug?: string } | null | undefined) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String(organisation?.id || '').trim();
      const oslug = String(organisation?.slug || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };
    const fromList = (myOrganisations as Array<{ id?: string; slug?: string; user_role?: string }>)?.find((o) => orgIdMatches(o));
    if (fromList?.user_role) return fromList;
    if (orgIdMatches(contextOrg) && (contextOrg as { user_role?: string } | undefined)?.user_role) return contextOrg as { id?: string; slug?: string; user_role?: string };
    const projectOrg = project?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if (organisation?.user_role) return organisation;
    if (fromList) return fromList;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || organisation || fromList || contextOrg || null;
  }, [context?.organisation, myOrganisations, orgSlugOrId, organisation, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as Organisation | undefined, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin],
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // ── Fetch data ─────────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) {
          throw new Error('Missing route parameters');
        }

        const looksLikeIdentifier = (value: string) => {
          const v = String(value || '').trim();
          if (!v) return false;
          return /^\d+$/.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
        };

        const teamScopedProjectPath = (org: string, club: string, team: string) =>
          `/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(club)}/teams/${encodeURIComponent(team)}/`;
        const defaultProjectPath = (team: string) =>
          `/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(team)}/`;

        const projectPath =
          isTeamRoute && clubSlugOrId && projectSlugOrId && !looksLikeIdentifier(projectSlugOrId)
            ? teamScopedProjectPath(orgSlugOrId, clubSlugOrId, projectSlugOrId)
            : defaultProjectPath(projectSlugOrId);

        const [orgJson, projectJson] = await Promise.all([
          api.get<Organisation>(`/organisations/${encodeURIComponent(orgSlugOrId)}/`),
          api.get<Project>(projectPath),
        ]);
        if (isCancelled) return;
        setOrganisation(orgJson);
        setProject(projectJson);

        if (isTeamRoute) {
          try {
            const clubJson = await api.get<Project>(
              `/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            );
            if (!isCancelled) setClubProject(clubJson);
          } catch { /* ignore */ }
        }

        // Resolve season UUID
        const rootPeriodsUrl = `${apiBaseUrl}/periods/?page_size=500&project_id=${encodeURIComponent(projectJson.id)}&parent_id=null`;
        const allPeriods = await fetchAllPages<Period>(rootPeriodsUrl, { credentials: 'include' }, { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` });
        const seasonOptions = allPeriods.filter(isSeasonPeriod);
        if (!isCancelled) setSeasonsForSwitcher(seasonOptions);

        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p) => periodPathKey(p) === String(effectiveSeasonId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');
        if (!isCancelled) setResolvedSeasonId(seasonUuid);

        const seasonJson = await api.get<Period>(`/periods/${encodeURIComponent(seasonUuid)}/`);
        if (!isCancelled) setSeason(seasonJson);

        const desiredKey = periodPathKey(seasonJson);
        if (desiredKey && desiredKey !== String(effectiveSeasonId)) {
          navigate(`${seasonsBasePath}/${desiredKey}/squad`, { replace: true });
        }

        // Squad members
        const membersUrl = `${apiBaseUrl}/projects/${encodeURIComponent(projectJson.id)}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;
        const membersList = await fetchAllPages<ProjectMembership>(membersUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });
        if (!isCancelled) setMembers(Array.isArray(membersList) ? membersList as unknown as Membership[] : []);
      } catch (e) {
        logger.error('Failed to load squad', e);
        if (!isCancelled) setError(e instanceof Error ? e.message : 'Failed to load squad');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    run();
    return () => { isCancelled = true; };
  }, [apiBaseUrl, clubSlugOrId, effectiveSeasonId, isTeamRoute, navigate, orgSlugOrId, projectSlugOrId, seasonsBasePath]);

  // ── Breadcrumbs ────────────────────────────────────────────────────

  const handleSeasonSwitch = (option: { id: string; slug?: string } | null) => {
    if (!option) return;
    const slugOrId = String(option.slug || option.id).trim();
    if (slugOrId) navigate(`${seasonsBasePath}/${slugOrId}/squad`);
  };

  const seasonKeyOrId = periodPathKey(season) || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  // ── Mutations ──────────────────────────────────────────────────────

  const deleteSeason = async () => {
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!seasonUuid) return;
    const seasonName = season?.name || '';
    const ok = await confirm({ title: 'Seizoen verwijderen', message: `"${seasonName}" wordt verplaatst naar de prullenbak.`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/periods/${encodeURIComponent(seasonUuid)}/`);
      pushToast({
        message: `"${seasonName}" verplaatst naar prullenbak`,
        type: 'info',
        actions: [{
          label: 'Ongedaan maken',
          onClick: async () => {
            try {
              const trashItem = await trashApi.findByObjectId(seasonUuid);
              if (trashItem) {
                await trashApi.restore(trashItem.id);
                pushToast({ message: `"${seasonName}" hersteld`, type: 'success' });
              }
            } catch (err) {
              logger.error('Failed to restore season', err);
              pushToast({ message: 'Herstellen mislukt', type: 'error' });
            }
          },
        }],
      });
      navigate(seasonsBasePath);
    } catch (e) { logger.error('Error deleting season', e); pushToast({ message: 'Verwijderen mislukt', type: 'error' }); }
  };

  const deleteMembership = async (membership: Membership) => {
    const membershipId = String(membership?.id || '').trim();
    const projectId = String(project?.id || '').trim();
    if (!membershipId || !projectId) return;
    const u = membership.user || {};
    const displayName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'this member';
    const ok = await confirm({ title: 'Lid verwijderen', message: `${displayName} verwijderen uit dit team?`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(
        `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
      );
      setMembers((prev) => prev.filter((m) => String(m.id) !== membershipId));
    } catch (e) { logger.error('Error removing member', e); pushToast({ message: e instanceof Error ? e.message : 'Lid verwijderen mislukt', type: 'error' }); }
  };

  const savePeriodEdit = async (payload: Record<string, unknown>) => {
    if (!selectedEditPeriod) return;
    const periodId = String(selectedEditPeriod?.id || '').trim();
    if (!periodId) return;
    const res = await api.patch<Partial<Period>>(`/periods/${encodeURIComponent(periodId)}/`, payload);
    const updated: Period = { ...selectedEditPeriod, ...(res ?? payload) } as Period;
    setSeason((prev) => (prev ? { ...prev, ...updated } : updated));
  };

  const saveMembershipEdit = async ({ role, functional_roles }: { role: string; functional_roles: string[] }) => {
    const membershipId = String(selectedMembership?.id || '').trim();
    const projectId = String(project?.id || '').trim();
    if (!membershipId || !projectId) return;

    await api.patch(
      `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
      { role },
    );

    const membershipUserId = Number(selectedMembership?.user?.id);
    if (!membershipUserId) throw new Error('Missing user id');

    const prevDirect = selectedMembership?.functional_roles ?? selectedMembership?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: unknown) => String(r || '').trim()).filter(Boolean) : [];
    const nextRoles = (Array.isArray(functional_roles) ? functional_roles : []).map((r: unknown) => String(r || '').trim()).filter(Boolean);

    const prevSet = new Set(prevRoles);
    const nextSet = new Set(nextRoles);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));

    if (toAdd.length) {
      await api.post(
        `/projects/${encodeURIComponent(projectId)}/functional-roles/assign/`,
        { user_id: membershipUserId, roles: toAdd },
      );
    }

    if (toRemove.length) {
      await api.post(
        `/projects/${encodeURIComponent(projectId)}/functional-roles/unassign/`,
        { user_id: membershipUserId, roles: toRemove },
      );
    }

    setMembers((prev) =>
      prev.map((m) => (String(m.id) === membershipId ? { ...m, role, functional_roles } : m)),
    );
  };

  return {
    // Route info
    navigate,
    orgSlugOrId,
    clubSlugOrId,
    isTeamRoute,
    seasonsBasePath,
    effectiveSeasonId,

    // Data
    loading,
    error,
    organisation,
    clubProject,
    project,
    season,
    resolvedSeasonId,
    seasonsForSwitcher,
    members,
    seasonKeyOrId,

    // Permissions
    userCanEditProject,
    userCanDeleteProject,

    // Modal state
    isPeriodEditModalOpen,
    setIsPeriodEditModalOpen,
    selectedEditPeriod,
    setSelectedEditPeriod,
    isMembershipEditModalOpen,
    setIsMembershipEditModalOpen,
    selectedMembership,
    setSelectedMembership,

    // Actions
    handleSeasonSwitch,
    deleteSeason,
    deleteMembership,
    savePeriodEdit,
    saveMembershipEdit,
  };
}
