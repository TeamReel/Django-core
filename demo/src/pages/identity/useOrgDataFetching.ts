import type { Activity, Period, Project, User } from '../../types';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { parseListEnvelope, isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';
import { DEBUG_LOGS, getApiV1BaseUrl } from './orgDataHelpers';
import { api } from '@/api';
import { logger } from '@/utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Period record with org-level fields */
interface OrgPeriodRecord {
  id?: string;
  name?: string;
  type?: string;
  parent_period_id?: string | null;
  parent_period?: { id?: string } | null;
  activities_count?: number;
  project_id?: string | null;
  project?: { id?: string } | null;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/** Org member record for membership checks */
interface OrgMemberRecord {
  user?: {
    project_membership_details?: unknown[];
    project_memberships_details?: unknown[];
    [key: string]: unknown;
  };
  project_membership_details?: unknown[];
  project_memberships_details?: unknown[];
  [key: string]: unknown;
}

interface UseOrgDataFetchingParams {
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  org: { id?: string | number } | null;
  teams: Project[];
  teamsLoading: boolean;
  orgPeriods: Period[];
  orgPeriodsLoading: boolean;
  members: User[];
  membersLoading: boolean;
  // Refs
  teamsFetchedForOrgRef: React.MutableRefObject<string>;
  teamsFetchInFlightRef: React.MutableRefObject<boolean>;
  orgPeriodsFetchInFlightRef: React.MutableRefObject<boolean>;
  // Setters
  setFederationMatches: (v: Activity[]) => void;
  setFederationMatchesLoading: (v: boolean) => void;
  setScheduledMatches: (v: Activity[]) => void;
  setScheduledMatchesLoading: (v: boolean) => void;
  setRecentPlayedMatches: (v: Activity[]) => void;
  setRecentPlayedMatchesLoading: (v: boolean) => void;
  setClubs: React.Dispatch<React.SetStateAction<Project[]>>;
  setClubsCount: (v: number) => void;
  setClubsLoading: (v: boolean) => void;
  setTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeamsLoading: (v: boolean) => void;
  setAllClubsForTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setOrgPeriods: (v: Period[]) => void;
  setOrgPeriodsLoading: (v: boolean) => void;
  setSeasonsCount: (v: number | null) => void;
  setCompetitionsCount: (v: number | null) => void;
  setMatchesCount: (v: number | null) => void;
  setTeamsCount: (v: number | null) => void;
  setTeamSeasonsCountById: (v: Record<string, number>) => void;
  setTeamCompetitionsCountById: (v: Record<string, number>) => void;
  setTeamMatchesCountById: (v: Record<string, number>) => void;
  setMembers: (v: User[]) => void;
  setMembersLoading: (v: boolean) => void;
}

// ─── Hook: all data-fetching functions ───────────────────────────────────────

export interface UseOrgDataFetchingReturn {
  fetchFederationMatches: (organisationId: string) => Promise<void>;
  fetchScheduledMatches: (organisationId: string) => Promise<void>;
  fetchRecentPlayedMatches: (organisationId: string) => Promise<void>;
  fetchClubsPage: (page: number) => Promise<void>;
  fetchTeamsForOrg: (opts?: { force?: boolean }) => Promise<void>;
  recomputePeriodCounts: (allPeriods: OrgPeriodRecord[]) => void;
  ensureOrgPeriodsLoaded: () => Promise<void>;
  fetchFederationCounts: (organisationId: string) => Promise<void>;
  fetchMembers: (force?: boolean) => Promise<void>;
}

export function useOrgDataFetching(params: UseOrgDataFetchingParams): UseOrgDataFetchingReturn {
  const {
    currentOrgSlug, currentOrgId, org, teams, teamsLoading, orgPeriods, orgPeriodsLoading,
    members, membersLoading,
    teamsFetchedForOrgRef, teamsFetchInFlightRef, orgPeriodsFetchInFlightRef,
    setFederationMatches, setFederationMatchesLoading,
    setScheduledMatches, setScheduledMatchesLoading,
    setRecentPlayedMatches, setRecentPlayedMatchesLoading,
    setClubs, setClubsCount, setClubsLoading,
    setTeams, setTeamsLoading, setAllClubsForTeams,
    setOrgPeriods, setOrgPeriodsLoading,
    setSeasonsCount, setCompetitionsCount, setMatchesCount, setTeamsCount,
    setTeamSeasonsCountById, setTeamCompetitionsCountById, setTeamMatchesCountById,
    setMembers, setMembersLoading,
  } = params;

  const clubsPageSize = 25;

  const fetchFederationMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setFederationMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const p = new URLSearchParams();
      p.set('page_size', '50');
      p.set('activity_type', 'match');
      p.set('organisation_id', organisationId);
      p.set('ordering', '-start_time');
      const all = await fetchAllPages<Record<string, unknown>>(
        `${apiV1BaseUrl}/activities/?${p.toString()}`,
        { credentials: 'include' },
        { ttlMs: 30_000, cacheKey: `GET:activities:federation:matches:${organisationId}`, maxItems: 250 },
      );
      setFederationMatches(Array.isArray(all) ? all as Activity[] : []);
    } catch (e) {
      logger.error('Failed to fetch federation matches', e);
      setFederationMatches([]);
    } finally {
      setFederationMatchesLoading(false);
    }
  };

  const fetchScheduledMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setScheduledMatchesLoading(true);
    try {
      const data = await api.list<Activity>('/activities/', {
        pageSize: 5,
        params: { activity_type: 'match', organisation_id: organisationId, ordering: 'start_time', start_time__gte: new Date().toISOString() },
      });
      setScheduledMatches(data.results);
    } catch (e) { logger.error('Failed to fetch scheduled matches', e); }
    finally { setScheduledMatchesLoading(false); }
  };

  const fetchRecentPlayedMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setRecentPlayedMatchesLoading(true);
    try {
      const data = await api.list<Activity>('/activities/', {
        pageSize: 5,
        params: { activity_type: 'match', organisation_id: organisationId, ordering: '-start_time', start_time__lt: new Date().toISOString() },
      });
      setRecentPlayedMatches(data.results);
    } catch (e) { logger.error('Failed to fetch recent matches', e); }
    finally { setRecentPlayedMatchesLoading(false); }
  };

  const fetchClubsPage = async (page: number) => {
    if (!currentOrgSlug) return;
    setClubsLoading(true);
    try {
      const data = await api.get<Record<string, unknown>>(`/organisations/${currentOrgSlug}/projects/?page=${page}&page_size=${clubsPageSize}&parent_project__isnull=true`);
      const { results, count } = parseListEnvelope(data);
      const clubsOnly = (results as Record<string, unknown>[]).filter((p) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });
      setClubs(clubsOnly as unknown as Project[]);
      setClubsCount(count);
    } catch (e) {
      logger.error('Failed to fetch clubs', e);
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
    setTeamsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const clubsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Organisation-ID': String(org?.id || currentOrgId || ''),
      };
      const [clubsAll, teamsAll] = await Promise.all([
        fetchAllPages<Project>(clubsUrl, { headers, credentials: 'include' }),
        fetchAllPages<Project>(teamsUrl, { headers, credentials: 'include' }),
      ]);
      const clubsOnly = (clubsAll || []).filter((p: Project) => {
        const pr = p as unknown as Record<string, unknown>;
        const parentId = pr.parent_id ?? pr.parent ?? pr.parent_project ?? pr.parent_project_id ?? null;
        return !parentId;
      });
      const teamsOnly = (teamsAll || []).filter((p: Project) => {
        const pr = p as unknown as Record<string, unknown>;
        const parentId = pr.parent_id ?? pr.parent ?? pr.parent_project ?? pr.parent_project_id ?? null;
        return Boolean(parentId);
      });
      setAllClubsForTeams(clubsOnly);
      setTeams(teamsOnly);
      teamsFetchedForOrgRef.current = currentOrgSlug;
    } catch (e) {
      logger.error('Failed to fetch teams', e);
      setTeams([]);
      setAllClubsForTeams([]);
    } finally {
      setTeamsLoading(false);
      teamsFetchInFlightRef.current = false;
    }
  };

  const recomputePeriodCounts = (allPeriods: OrgPeriodRecord[]) => {
    const seasonsByProjectId: Record<string, number> = {};
    const competitionsByProjectId: Record<string, number> = {};
    const matchesByProjectId: Record<string, number> = {};
    const childrenMap = new Map<string, OrgPeriodRecord[]>();
    for (const p of allPeriods || []) {
      const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
      if (!parentId) continue;
      const key = String(parentId);
      const arr = childrenMap.get(key) || [];
      arr.push(p);
      childrenMap.set(key, arr);
    }
    const getRecursiveActivitiesCount = (p: OrgPeriodRecord): number => {
      let count = p?.activities_count ?? 0;
      const children = childrenMap.get(String(p?.id));
      if (children) { for (const child of children) count += getRecursiveActivitiesCount(child); }
      return count;
    };
    allPeriods.filter((p) => {
      const isSeason = isSeasonPeriod(p);
      if (isSeason) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) { const key = String(projectId); seasonsByProjectId[key] = (seasonsByProjectId[key] || 0) + 1; }
      }
      return isSeason;
    });
    const competitions = allPeriods.filter((p) => {
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
    const seasons = allPeriods.filter((p) => isSeasonPeriod(p));
    setSeasonsCount(seasons.length);
    setCompetitionsCount(competitions.length);
    setTeamSeasonsCountById(seasonsByProjectId);
    setTeamCompetitionsCountById(competitionsByProjectId);
    setTeamMatchesCountById(matchesByProjectId);
  };

  const ensureOrgPeriodsLoaded = async () => {
    if (orgPeriodsFetchInFlightRef.current) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    if (!teams || teams.length === 0) {
      if (!teamsLoading && currentOrgSlug) void fetchTeamsForOrg({ force: true });
      return;
    }
    orgPeriodsFetchInFlightRef.current = true;
    setOrgPeriodsLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    try {
      const unique = new Map<string, Record<string, unknown>>();
      const chunkSize = 6;
      const teamChunks = [];
      for (let i = 0; i < teams.length; i += chunkSize) teamChunks.push(teams.slice(i, i + chunkSize));
      for (const chunk of teamChunks) {
        await Promise.all(chunk.map(async (t) => {
          const teamId = t?.id;
          if (!teamId) return;
          const p = new URLSearchParams();
          p.set('page_size', '250');
          p.set('project_id', String(teamId));
          try {
            const periods = await fetchAllPages<Record<string, unknown>>(`${apiV1BaseUrl}/periods/?${p.toString()}`, { credentials: 'include' });
            for (const pr of periods || []) { if (pr?.id) unique.set(String(pr.id), pr); }
          } catch (e) { logger.warn(`Failed to fetch periods for team ${teamId}`, e); }
        }));
      }
      const merged = Array.from(unique.values());
      setOrgPeriods(merged as unknown as Period[]);
      recomputePeriodCounts(merged);
    } catch (e) {
      logger.warn('[OrganisationDetailPage] Failed to load periods via team scope', e);
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
        const teamsData = await api.list<Project>(`/organisations/${currentOrgSlug}/projects/`, { pageSize: 1, params: { parent_project__isnull: false } });
        setTeamsCount(teamsData.count);
      }
      {
        const p = new URLSearchParams();
        p.set('page_size', '250');
        p.set('organisation_id', organisationId);
        const allPeriods = await fetchAllPages<Record<string, unknown>>(`${apiV1BaseUrl}/periods/?${p.toString()}`, { credentials: 'include' });
        const list = Array.isArray(allPeriods) ? allPeriods : [];
        setOrgPeriods(list as unknown as Period[]);
        if (list.length > 0) recomputePeriodCounts(list);
        else void fetchTeamsForOrg({ force: true });
      }
      {
        const matchesData = await api.list<Activity>('/activities/', { pageSize: 1, params: { activity_type: 'match', organisation_id: organisationId } });
        setMatchesCount(matchesData.count);
      }
    } catch (e) { logger.warn('[OrganisationDetailPage] Failed to fetch counts', e); }
    if (!orgPeriodsLoading && orgPeriods.length === 0) void ensureOrgPeriodsLoaded();
  };

  const fetchMembers = async (force = false) => {
    if (membersLoading) return;
    const haveMembershipDetails = members.some((item) => {
      const r = item as unknown as Record<string, unknown>;
      const u = r?.user || r;
      const details = r?.project_membership_details || (u as Record<string, unknown>)?.project_membership_details ||
        r?.project_memberships_details || (u as Record<string, unknown>)?.project_memberships_details;
      return Array.isArray(details);
    });
    if (!force && members.length > 0 && haveMembershipDetails) return;
    if (!org?.id && !currentOrgId) return;
    setMembersLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(org?.id || currentOrgId);
    try {
      const p = new URLSearchParams();
      p.set('include_project_memberships', 'true');
      p.set('include_role_assignments', 'true');
      p.set('include_project_membership_details', 'true');
      p.set('page_size', '250');
      const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${p.toString()}`;
      const allMembers = await fetchAllPages<User>(
        membersUrl,
        { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-Organisation-ID': orgId }, credentials: 'include' },
        force ? { bypass: true } : { ttlMs: 5 * 60_000 },
      );
      setMembers(allMembers);
    } catch (e) {
      logger.error('[OrganisationDetailPage] Members fetch failed', e);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  return {
    fetchFederationMatches, fetchScheduledMatches, fetchRecentPlayedMatches,
    fetchClubsPage, fetchTeamsForOrg, recomputePeriodCounts,
    ensureOrgPeriodsLoaded, fetchFederationCounts, fetchMembers,
  };
}
