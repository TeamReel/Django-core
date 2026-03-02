import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { Organisation, User, Project } from '../../types';
import {
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
  canEditProject,
  canDeleteProject,
} from '../../utils/permissions';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { parseListEnvelope, isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';
import { useOrgModals } from './useOrgModals';
import { useOrgFilters } from './useOrgFilters';
import {
  DEBUG_LOGS,
  getApiV1BaseUrl,
  getCsrfToken,
  getBestMatchDetailPath as getBestMatchDetailPathPure,
  ORG_TABS,
  ALLOWED_TABS,
} from './orgDataHelpers';

export type { OrgDataReturn } from './orgDataTypes';
export type { OrgModalState, OrgFilterState } from './orgDataTypes';
import type { OrgDataReturn } from './orgDataTypes';

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function useOrgData(): OrgDataReturn {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();

  /* ---------- core state ---------------------------------------- */
  const [org, setOrg] = useState<Organisation | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContextState, setActiveContextState] = useState<any | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [clubs, setClubs] = useState<Project[]>([]);
  const [clubsCount, setClubsCount] = useState(0);
  const [clubsPage, setClubsPage] = useState(1);
  const clubsPageSize = 25;
  const [clubsLoading, setClubsLoading] = useState(false);

  const [teams, setTeams] = useState<Project[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [allClubsForTeams, setAllClubsForTeams] = useState<Project[]>([]);

  const teamsFetchedForOrgRef = useRef<string>('');
  const teamsFetchInFlightRef = useRef(false);
  const orgPeriodsFetchInFlightRef = useRef(false);

  const [orgPeriods, setOrgPeriods] = useState<any[]>([]);
  const [orgPeriodsLoading, setOrgPeriodsLoading] = useState(false);
  const [teamSeasonsCountById, setTeamSeasonsCountById] = useState<Record<string, number>>({});
  const [teamCompetitionsCountById, setTeamCompetitionsCountById] = useState<Record<string, number>>({});
  const [teamMatchesCountById, setTeamMatchesCountById] = useState<Record<string, number>>({});

  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);
  const [competitionsCount, setCompetitionsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [teamsCount, setTeamsCount] = useState<number | null>(null);

  /* ---------- modal state (from useOrgModals) -------------------- */
  const modals = useOrgModals();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  /* ---------- filter state (from useOrgFilters) ------------------ */
  const filters = useOrgFilters();

  /* ---------- federation matches state --------------------------- */
  const [federationMatches, setFederationMatches] = useState<any[]>([]);
  const [federationMatchesLoading, setFederationMatchesLoading] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<any[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);

  /* ---------- inline edit state --------------------------------- */
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

  /* ----------------------------------------------------------------
   *  Derived / memos
   * -------------------------------------------------------------- */

  const periodChildrenMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of orgPeriods) {
      const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
      if (parentId) {
        const key = String(parentId);
        const arr = map.get(key) || [];
        arr.push(p);
        map.set(key, arr);
      }
    }
    return map;
  }, [orgPeriods]);

  const getRecursiveMatchesCount = (p: any): number => {
    let count = p.activities_count ?? 0;
    const children = periodChildrenMap.get(String(p.id));
    if (children) {
      for (const child of children) {
        count += getRecursiveMatchesCount(child);
      }
    }
    return count;
  };

  const resolvedOrg = organisations.find(
    (o) => o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id,
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase();
  const currentOrgId = resolvedOrg?.id;

  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
    if (!raw) return 'overview';
    return ALLOWED_TABS.has(raw) ? raw : 'overview';
  }, [location.search]);

  const createModalOrganisations = useMemo(() => {
    const orgIdStr = String(currentOrgId || org?.id || '').trim();
    const orgName = String(org?.name || resolvedOrg?.name || '').trim();
    if (!orgIdStr || !orgName) return [];
    return [{ id: orgIdStr, name: orgName, slug: currentOrgSlug }];
  }, [currentOrgId, org?.id, org?.name, resolvedOrg?.name, currentOrgSlug]);

  const createModalClubs = useMemo(() => {
    const list = allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return (list || []) as any[];
  }, [allClubsForTeams, clubs]);

  const membershipUserCounts = useMemo(() => {
    const clubUserIdsByClubId = new Map<string, Set<string>>();
    const teamUserIdsByTeamId = new Map<string, Set<string>>();

    const teamToClubId = new Map<string, string>();
    for (const t of teams as any[]) {
      const teamId = String(t?.id ?? '').trim();
      if (!teamId) continue;
      const clubId = String(t?.parent_id ?? t?.parent ?? t?.parent_project ?? t?.parent_project_id ?? '').trim();
      if (clubId) teamToClubId.set(teamId, clubId);
    }

    const getOrCreateSet = (map: Map<string, Set<string>>, key: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const next = new Set<string>();
      map.set(key, next);
      return next;
    };

    for (const item of members as any[]) {
      const u = item?.user ?? item;
      const userId = String(u?.id ?? '').trim();
      if (!userId) continue;

      const raw =
        item?.project_memberships ??
        item?.project_membership_details ??
        item?.project_memberships_details ??
        [];
      const pms = Array.isArray(raw) ? raw : [];

      for (const pm of pms) {
        if (!pm) continue;
        const pmId = String(pm?.id ?? '');
        if (pmId.startsWith('pm:')) continue;

        const teamId = String(pm?.project_id ?? pm?.project?.id ?? '').trim();
        let clubId = String(
          pm?.club_id ??
            pm?.club?.id ??
            pm?.project?.parent_id ??
            pm?.project?.parent?.id ??
            pm?.project?.parent_project_id ??
            pm?.parent_project_id ??
            (typeof pm?.parent_project === 'object' ? pm?.parent_project?.id : pm?.parent_project) ??
            pm?.parent_id ??
            (typeof pm?.parent === 'object' ? pm?.parent?.id : pm?.parent) ??
            '',
        ).trim();

        if (!clubId && teamId) {
          clubId = String(teamToClubId.get(teamId) || '').trim();
        }

        if (clubId) getOrCreateSet(clubUserIdsByClubId, clubId).add(userId);
        if (teamId) getOrCreateSet(teamUserIdsByTeamId, teamId).add(userId);
      }
    }

    const clubUsersCountById: Record<string, number> = {};
    for (const [cId, userIds] of clubUserIdsByClubId.entries()) {
      clubUsersCountById[String(cId)] = userIds.size;
    }

    const teamUsersCountById: Record<string, number> = {};
    for (const [tId, userIds] of teamUserIdsByTeamId.entries()) {
      teamUsersCountById[String(tId)] = userIds.size;
    }

    return { clubUsersCountById, teamUsersCountById };
  }, [members, teams]);

  /* ---------- permissions --------------------------------------- */
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
  const permissionContext = {
    currentOrganisation: (org || resolvedOrg) as any,
    isSuperAdmin,
  };
  const userCanEditOrg = canEditOrganisation(permissionContext);
  const userCanDeleteOrg = canDeleteOrganisation(permissionContext);
  const userCanInvite = canInviteMembers(permissionContext);
  const userCanManageMembers = canManageMembers(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  /* ---------- breadcrumbs --------------------------------------- */
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = (option: { id: string; label: string; slug?: string }) => {
    navigate(`/${option.slug || option.id}${location.search || ''}`);
  };

  /* ---------- tabs ---------------------------------------------- */
  const tabs = ORG_TABS;

  const visibleTabs = useMemo(() => {
    return tabs.filter((t) => {
      if (t.id === 'operations') return isSuperAdmin;
      if (t.id === 'audit' || t.id === 'governance') return Boolean(isSuperAdmin || userCanEditOrg);
      return true;
    });
  }, [tabs, isSuperAdmin, userCanEditOrg]);

  const orgIdForDirectoryLists = useMemo(() => {
    return String(currentOrgId || org?.id || '').trim();
  }, [currentOrgId, org?.id]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    if (!t || t === 'overview') params.delete('tab');
    else params.set('tab', t);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  const orgSlugOrId = String(org?.slug || org?.id || currentOrgSlug || '');

  /* ---------- helpers ------------------------------------------- */
  const getBestMatchDetailPath = (m: any): string =>
    getBestMatchDetailPathPure(m, { currentOrgSlug, clubs, teams, orgPeriods });

  const clubsForHierarchy = useMemo(() => {
    const list = allClubsForTeams && allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return Array.isArray(list) ? list : [];
  }, [allClubsForTeams, clubs]);

  /* ----------------------------------------------------------------
   *  Fetch functions
   * -------------------------------------------------------------- */

  const fetchFederationMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setFederationMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '50');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', '-start_time');

      const all = await fetchAllPages<any>(
        `${apiV1BaseUrl}/activities/?${params.toString()}`,
        { credentials: 'include' },
        { ttlMs: 30_000, cacheKey: `GET:activities:federation:matches:${organisationId}`, maxItems: 250 },
      );

      setFederationMatches(Array.isArray(all) ? all : []);
    } catch (e) {
      console.error(e);
      setFederationMatches([]);
    } finally {
      setFederationMatchesLoading(false);
    }
  };

  const fetchScheduledMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setScheduledMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '5');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', 'start_time');
      params.set('start_time__gte', new Date().toISOString());

      const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setScheduledMatches(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScheduledMatchesLoading(false);
    }
  };

  const fetchRecentPlayedMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setRecentPlayedMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '5');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', '-start_time');
      params.set('start_time__lt', new Date().toISOString());

      const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setRecentPlayedMatches(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecentPlayedMatchesLoading(false);
    }
  };

  const fetchClubsPage = async (page: number) => {
    if (!currentOrgSlug) return;
    setClubsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const url = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page=${page}&page_size=${clubsPageSize}&parent_project__isnull=true`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': String(org?.id || currentOrgId || ''),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch clubs (${res.status})`);
      const json = await res.json();
      const { results, count } = parseListEnvelope(json);

      const clubsOnly = results.filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      setClubs(clubsOnly);
      setClubsCount(count);
    } catch (e) {
      console.error(e);
      setClubs([]);
      setClubsCount(0);
    } finally {
      setClubsLoading(false);
    }
  };

  const fetchTeamsForOrg = async ({ force = false }: { force?: boolean } = {}) => {
    if (!currentOrgSlug) return;
    if (!force && teamsFetchedForOrgRef.current === currentOrgSlug && teams.length > 0) return;
    if (teamsFetchInFlightRef.current) return;
    teamsFetchInFlightRef.current = true;
    if (DEBUG_LOGS) {
      console.log('[OrganisationDetailPage] fetchTeamsForOrg starting', {
        currentOrgSlug,
        orgId: org?.id || currentOrgId,
      });
    }
    setTeamsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const clubsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;

      if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Fetching teams from', teamsUrl);

      const [clubsAll, teamsAll] = await Promise.all([
        fetchAllPages<Project>(clubsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(org?.id || currentOrgId || ''),
          },
          credentials: 'include',
        }),
        fetchAllPages<Project>(teamsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(org?.id || currentOrgId || ''),
          },
          credentials: 'include',
        }),
      ]);

      const clubsOnly = (clubsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      const teamsOnly = (teamsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return Boolean(parentId);
      });

      if (DEBUG_LOGS) {
        console.log('[OrganisationDetailPage] Teams loaded:', teamsOnly.length, 'Clubs loaded:', clubsOnly.length);
      }
      setAllClubsForTeams(clubsOnly);
      setTeams(teamsOnly);
      teamsFetchedForOrgRef.current = currentOrgSlug;
    } catch (e) {
      console.error(e);
      setTeams([]);
      setAllClubsForTeams([]);
    } finally {
      setTeamsLoading(false);
      teamsFetchInFlightRef.current = false;
    }
  };

  const recomputePeriodCounts = (allPeriods: any[]) => {
    const seasonsByProjectId: Record<string, number> = {};
    const competitionsByProjectId: Record<string, number> = {};
    const matchesByProjectId: Record<string, number> = {};

    const childrenMap = new Map<string, any[]>();
    for (const p of allPeriods || []) {
      const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
      if (!parentId) continue;
      const key = String(parentId);
      const arr = childrenMap.get(key) || [];
      arr.push(p);
      childrenMap.set(key, arr);
    }

    const getRecursiveActivitiesCount = (p: any): number => {
      let count = p?.activities_count ?? 0;
      const children = childrenMap.get(String(p?.id));
      if (children) {
        for (const child of children) {
          count += getRecursiveActivitiesCount(child);
        }
      }
      return count;
    };

    const seasons = allPeriods.filter((p: any) => {
      const isSeason = isSeasonPeriod(p);
      if (isSeason) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) {
          const key = String(projectId);
          seasonsByProjectId[key] = (seasonsByProjectId[key] || 0) + 1;
        }
      }
      return isSeason;
    });

    const competitions = allPeriods.filter((p: any) => {
      const isCompetition = isCompetitionPeriod(p);
      if (isCompetition) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) {
          const key = String(projectId);
          competitionsByProjectId[key] = (competitionsByProjectId[key] || 0) + 1;
          matchesByProjectId[key] = (matchesByProjectId[key] || 0) + getRecursiveActivitiesCount(p);
        }
      }
      return isCompetition;
    });

    setSeasonsCount(seasons.length);
    setCompetitionsCount(competitions.length);
    setTeamSeasonsCountById(seasonsByProjectId);
    setTeamCompetitionsCountById(competitionsByProjectId);
    setTeamMatchesCountById(matchesByProjectId);
  };

  const ensureOrgPeriodsLoaded = async () => {
    if (DEBUG_LOGS) {
      console.log('[OrganisationDetailPage] ensureOrgPeriodsLoaded called', {
        teamsCount: teams.length,
        orgPeriodsCount: orgPeriods.length,
        loading: orgPeriodsLoading,
      });
    }
    if (orgPeriodsFetchInFlightRef.current) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;

    if (!teams || teams.length === 0) {
      if (!teamsLoading && currentOrgSlug) {
        void fetchTeamsForOrg({ force: true });
      }
      return;
    }

    orgPeriodsFetchInFlightRef.current = true;
    setOrgPeriodsLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    try {
      const unique = new Map<string, any>();
      const chunkSize = 6;
      const teamChunks = [];
      for (let i = 0; i < teams.length; i += chunkSize) {
        teamChunks.push(teams.slice(i, i + chunkSize));
      }

      if (DEBUG_LOGS) {
        console.log(
          `[OrganisationDetailPage] Fetching periods for ${teams.length} teams in ${teamChunks.length} chunks`,
        );
      }

      for (const chunk of teamChunks) {
        await Promise.all(
          chunk.map(async (t: any) => {
            const teamId = t?.id;
            if (!teamId) return;
            const params = new URLSearchParams();
            params.set('page_size', '250');
            params.set('project_id', String(teamId));

            try {
              const url = `${apiV1BaseUrl}/periods/?${params.toString()}`;
              const periods = await fetchAllPages<any>(url, { credentials: 'include' });
              for (const p of periods || []) {
                if (!p?.id) continue;
                unique.set(String(p.id), p);
              }
            } catch (e) {
              console.warn(`Failed to fetch periods for team ${teamId}`, e);
            }
          }),
        );
      }

      if (DEBUG_LOGS) {
        console.log('[OrganisationDetailPage] Total unique periods fetched via teams:', unique.size);
      }

      const merged = Array.from(unique.values());
      setOrgPeriods(merged);
      recomputePeriodCounts(merged);
    } catch (e) {
      console.warn('[OrganisationDetailPage] Failed to load periods via team scope', e);
    } finally {
      setOrgPeriodsLoading(false);
      orgPeriodsFetchInFlightRef.current = false;
    }
  };

  const fetchFederationCounts = async (organisationId: string) => {
    if (!organisationId) return;
    const apiV1BaseUrl = getApiV1BaseUrl();

    try {
      if (currentOrgSlug) {
        const teamsRes = await fetch(
          `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=1&parent_project__isnull=false`,
          { credentials: 'include' },
        );
        if (teamsRes.ok) {
          const json = await teamsRes.json();
          const { count } = parseListEnvelope(json);
          setTeamsCount(count);
        }
      }

      {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', organisationId);

        const allPeriods = await fetchAllPages<any>(`${apiV1BaseUrl}/periods/?${params.toString()}`, {
          credentials: 'include',
        });

        const list = Array.isArray(allPeriods) ? allPeriods : [];
        setOrgPeriods(list);
        if (list.length > 0) {
          recomputePeriodCounts(list);
        } else {
          void fetchTeamsForOrg({ force: true });
        }
      }

      {
        const params = new URLSearchParams();
        params.set('page_size', '1');
        params.set('activity_type', 'match');
        params.set('organisation_id', organisationId);
        const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const { count } = parseListEnvelope(json);
          setMatchesCount(count);
        }
      }
    } catch (e) {
      console.warn('[OrganisationDetailPage] Failed to fetch counts', e);
    }

    if (!orgPeriodsLoading && orgPeriods.length === 0) {
      void ensureOrgPeriodsLoaded();
    }
  };

  const fetchMembers = async (force = false) => {
    if (membersLoading) return;
    const haveMembershipDetails = members.some((item: any) => {
      const u = item?.user || item;
      const details =
        (item as any)?.project_membership_details ||
        (u as any)?.project_membership_details ||
        (item as any)?.project_memberships_details ||
        (u as any)?.project_memberships_details;
      return Array.isArray(details);
    });
    if (!force && members.length > 0 && haveMembershipDetails) return;
    if (!org?.id && !currentOrgId) return;

    setMembersLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(org?.id || currentOrgId);

    try {
      const params = new URLSearchParams();
      params.set('include_project_memberships', 'true');
      params.set('include_role_assignments', 'true');
      params.set('include_project_membership_details', 'true');
      params.set('page_size', '250');

      const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
      const allMembers = await fetchAllPages<any>(
        membersUrl,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': orgId,
          },
          credentials: 'include',
        },
        force ? { bypass: true } : { ttlMs: 5 * 60_000 },
      );
      console.log('[OrganisationDetailPage] Members loaded:', allMembers.length);
      setMembers(allMembers);
    } catch (e) {
      console.error('[OrganisationDetailPage] Members fetch failed:', e);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  /* ----------------------------------------------------------------
   *  Handlers
   * -------------------------------------------------------------- */

  const handleActivateContext = async () => {
    try {
      setActivatingContext(true);
      await setActiveContext('organisation', String((org as any)?.slug || (org as any)?.id || ''));
      const context = await getActiveContext();
      setActiveContextState(context);
    } finally {
      setActivatingContext(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();

      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.email?.[0] || data.detail || 'Failed to invite member');
      }

      try {
        const params = new URLSearchParams();
        params.set('include_project_memberships', 'true');
        params.set('include_role_assignments', 'true');
        params.set('include_project_membership_details', 'true');
        params.set('page_size', '250');
        const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
        const allMembers = await fetchAllPages<any>(
          membersUrl,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(org?.id || currentOrgId || ''),
            },
            credentials: 'include',
          },
          { bypass: true },
        );
        setMembers(allMembers);
      } catch {
        // ignore
      }

      setInviteEmail('');
      alert('Member added successfully');
    } catch (err) {
      console.error('Invite error:', err);
      alert(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this organisation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete organisation (${response.status})`);
      }

      navigate('/federations');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete organisation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = () => {
    setEditName(org?.name || '');
    setEditType(org?.metadata?.type || '');
    setEditCountry(org?.metadata?.country || '');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditName('');
    setEditType('');
    setEditCountry('');
  };

  const handleSaveEdit = async () => {
    if (!org || !editName.trim()) {
      alert('Organisation name is required');
      return;
    }

    try {
      setSaving(true);
      const apiV1BaseUrl = getApiV1BaseUrl();
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          metadata: {
            ...org.metadata,
            type: editType.trim(),
            country: editCountry.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update organisation (${response.status})`);
      }

      const updatedOrg = await response.json();
      setOrg(updatedOrg);
      setIsEditMode(false);
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  const saveOrganisationEdits = async (orgData: Partial<Organisation> & { sport_id?: string | null }) => {
    if (!org) throw new Error('Missing organisation');

    const apiV1BaseUrl = getApiV1BaseUrl();
    const patch: any = { ...orgData };
    delete patch.slug;
    delete patch.sport;

    const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Failed to update organisation (${response.status})`);
    }

    const raw = await response.json().catch(() => null);
    const updatedOrg = (raw as any)?.data || raw;
    if (updatedOrg) setOrg(updatedOrg);

    invalidateFetchAllPagesCache();
    try {
      const refreshedRes = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (refreshedRes.ok) {
        const refreshedRaw = await refreshedRes.json().catch(() => null);
        const refreshed = (refreshedRaw as any)?.data || refreshedRaw;
        if (refreshed) setOrg(refreshed);
      }
    } catch {
      // Best-effort
    }
  };

  const saveProjectEdits = async (project: Project, patch: Partial<Project>) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const projectSlugOrId = (project as any).slug || project.id;

    const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/${projectSlugOrId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      let msg = `Failed to save (${res.status})`;
      try {
        const data = await res.json();
        msg = data?.detail || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const json = await res.json();
    const updated = (json?.data || json) as any;

    setClubs((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setTeams((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setAllClubsForTeams((prev) =>
      prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)),
    );
  };

  /* ----------------------------------------------------------------
   *  Effects
   * -------------------------------------------------------------- */

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tab-based lazy data loading
  useEffect(() => {
    if (!currentOrgSlug) return;

    if (activeTab === 'clubs') {
      if (!clubsLoading && clubs.length === 0) {
        void fetchClubsPage(1);
      }
    }

    if (activeTab === 'teams') {
      if (!teamsLoading && teams.length === 0) {
        void fetchTeamsForOrg({ force: true });
      }
    }

    if (activeTab === 'hierarchy') {
      if (!teamsLoading && (teams.length === 0 || allClubsForTeams.length === 0)) {
        void fetchTeamsForOrg({ force: true });
      }
    }

    if (activeTab === 'users') {
      void fetchMembers(false);
    }

    if (activeTab === 'overview') {
      if (!clubsLoading && clubs.length === 0) {
        void fetchClubsPage(1);
      }
      if (!teamsLoading && teams.length === 0) {
        void fetchTeamsForOrg({ force: false });
      }
      if (!membersLoading && members.length === 0) {
        void fetchMembers(false);
      }
    }
  }, [activeTab, currentOrgSlug]);

  // Period loading for seasons/competitions/hierarchy tabs
  useEffect(() => {
    const shouldEnsurePeriods = activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'hierarchy';
    if (!shouldEnsurePeriods) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void ensureOrgPeriodsLoaded();
  }, [activeTab, orgPeriodsLoading, orgPeriods.length, teams.length, currentOrgSlug]);

  // Fetch org details
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!currentOrgSlug) return;

      try {
        setLoading(true);
        setError(null);

        const apiV1BaseUrl = getApiV1BaseUrl();

        const orgResponse = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        });

        if (!orgResponse.ok) {
          throw new Error(`Failed to fetch organisation (${orgResponse.status})`);
        }

        const rawOrgData = await orgResponse.json();
        const orgData = rawOrgData.data || rawOrgData;
        if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Org data loaded', orgData);
        setOrg(orgData);

        const organisationIdForCounts = String(orgData.id || currentOrgId || '');
        if (organisationIdForCounts) {
          fetchFederationCounts(organisationIdForCounts);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisation details');
        console.error('Org detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentOrgSlug) {
      fetchOrgDetails();
    }
  }, [currentOrgSlug, currentOrgId]);

  // Scheduled/recent matches + counts
  useEffect(() => {
    const orgId = String(org?.id || currentOrgId || '');
    if (orgId) {
      fetchScheduledMatches(orgId);
      fetchRecentPlayedMatches(orgId);
      if (!orgPeriodsLoading && orgPeriods.length === 0) {
        void fetchFederationCounts(orgId);
      }
    }
  }, [org?.id, currentOrgId]);

  // Hierarchy tab period loading
  useEffect(() => {
    if (activeTab !== 'hierarchy') return;
    const orgId = String(org?.id || currentOrgId || '').trim();
    if (!orgId) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void fetchFederationCounts(orgId);
  }, [activeTab, org?.id, currentOrgId, orgPeriodsLoading, orgPeriods.length]);

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    ...modals,
    ...filters,
    id,
    org,
    resolvedOrg,
    currentOrgSlug,
    currentOrgId,
    orgSlugOrId,
    loading,
    error,
    navigate,
    location,
    activeTab,
    tabs,
    visibleTabs,
    makeTabHref,
    activatingContext,
    activeContext: activeContextState,
    handleActivateContext,
    members,
    membersLoading,
    fetchMembers,
    membershipUserCounts,
    clubs,
    clubsCount,
    clubsPage,
    setClubsPage,
    clubsPageSize,
    clubsLoading,
    allClubsForTeams,
    clubsForHierarchy,
    teams,
    teamsCount,
    teamsLoading,
    orgPeriods,
    orgPeriodsLoading,
    seasonsCount,
    competitionsCount,
    matchesCount,
    teamSeasonsCountById,
    teamCompetitionsCountById,
    teamMatchesCountById,
    federationMatches,
    federationMatchesLoading,
    scheduledMatches,
    scheduledMatchesLoading,
    recentPlayedMatches,
    recentPlayedMatchesLoading,
    isEditMode,
    editName,
    setEditName,
    editType,
    setEditType,
    editCountry,
    setEditCountry,
    saving,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    saveOrganisationEdits,
    saveProjectEdits,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteLoading,
    handleInvite,
    deleteLoading,
    handleDelete,
    isSuperAdmin,
    permissionContext,
    userCanEditOrg,
    userCanDeleteOrg,
    userCanInvite,
    userCanManageMembers,
    userCanEditProject,
    userCanDeleteProject,
    organisationOptions,
    handleOrganisationSwitch,
    createModalOrganisations,
    createModalClubs,
    orgIdForDirectoryLists,
    getBestMatchDetailPath,
    getApiV1BaseUrl,
    getCsrfToken,
    fetchClubsPage,
    fetchTeamsForOrg,
    setOrg,
    setClubs,
    setTeams,
    setAllClubsForTeams,
    setClubsCount,
    setMembers,
    setOrgPeriods,
    setFederationMatches,
    setMatchesCount,
    setTeamsCount,
    recomputePeriodCounts,
    fetchFederationCounts,
    getRecursiveMatchesCount,
  };
}
