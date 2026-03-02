import type { Project } from '../../types';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { parseListEnvelope, isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';
import { DEBUG_LOGS, getApiV1BaseUrl } from './orgDataHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseOrgDataFetchingParams {
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  org: any;
  teams: Project[];
  teamsLoading: boolean;
  orgPeriods: any[];
  orgPeriodsLoading: boolean;
  members: any[];
  membersLoading: boolean;
  // Refs
  teamsFetchedForOrgRef: React.MutableRefObject<string>;
  teamsFetchInFlightRef: React.MutableRefObject<boolean>;
  orgPeriodsFetchInFlightRef: React.MutableRefObject<boolean>;
  // Setters
  setFederationMatches: (v: any[]) => void;
  setFederationMatchesLoading: (v: boolean) => void;
  setScheduledMatches: (v: any[]) => void;
  setScheduledMatchesLoading: (v: boolean) => void;
  setRecentPlayedMatches: (v: any[]) => void;
  setRecentPlayedMatchesLoading: (v: boolean) => void;
  setClubs: React.Dispatch<React.SetStateAction<Project[]>>;
  setClubsCount: (v: number) => void;
  setClubsLoading: (v: boolean) => void;
  setTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeamsLoading: (v: boolean) => void;
  setAllClubsForTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setOrgPeriods: (v: any[]) => void;
  setOrgPeriodsLoading: (v: boolean) => void;
  setSeasonsCount: (v: number | null) => void;
  setCompetitionsCount: (v: number | null) => void;
  setMatchesCount: (v: number | null) => void;
  setTeamsCount: (v: number | null) => void;
  setTeamSeasonsCountById: (v: Record<string, number>) => void;
  setTeamCompetitionsCountById: (v: Record<string, number>) => void;
  setTeamMatchesCountById: (v: Record<string, number>) => void;
  setMembers: (v: any[]) => void;
  setMembersLoading: (v: boolean) => void;
}

// ─── Hook: all data-fetching functions ───────────────────────────────────────

export function useOrgDataFetching(params: UseOrgDataFetchingParams) {
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
      const all = await fetchAllPages<any>(
        `${apiV1BaseUrl}/activities/?${p.toString()}`,
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
      const p = new URLSearchParams();
      p.set('page_size', '5');
      p.set('activity_type', 'match');
      p.set('organisation_id', organisationId);
      p.set('ordering', 'start_time');
      p.set('start_time__gte', new Date().toISOString());
      const res = await fetch(`${apiV1BaseUrl}/activities/?${p.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setScheduledMatches(results);
      }
    } catch (e) { console.error(e); }
    finally { setScheduledMatchesLoading(false); }
  };

  const fetchRecentPlayedMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setRecentPlayedMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const p = new URLSearchParams();
      p.set('page_size', '5');
      p.set('activity_type', 'match');
      p.set('organisation_id', organisationId);
      p.set('ordering', '-start_time');
      p.set('start_time__lt', new Date().toISOString());
      const res = await fetch(`${apiV1BaseUrl}/activities/?${p.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setRecentPlayedMatches(results);
      }
    } catch (e) { console.error(e); }
    finally { setRecentPlayedMatchesLoading(false); }
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
    if (DEBUG_LOGS) console.log('[OrganisationDetailPage] fetchTeamsForOrg starting', { currentOrgSlug, orgId: org?.id || currentOrgId });
    setTeamsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const clubsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;
      if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Fetching teams from', teamsUrl);
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Organisation-ID': String(org?.id || currentOrgId || ''),
      };
      const [clubsAll, teamsAll] = await Promise.all([
        fetchAllPages<Project>(clubsUrl, { headers, credentials: 'include' }),
        fetchAllPages<Project>(teamsUrl, { headers, credentials: 'include' }),
      ]);
      const clubsOnly = (clubsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });
      const teamsOnly = (teamsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return Boolean(parentId);
      });
      if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Teams loaded:', teamsOnly.length, 'Clubs loaded:', clubsOnly.length);
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
      if (children) { for (const child of children) count += getRecursiveActivitiesCount(child); }
      return count;
    };
    allPeriods.filter((p: any) => {
      const isSeason = isSeasonPeriod(p);
      if (isSeason) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) { const key = String(projectId); seasonsByProjectId[key] = (seasonsByProjectId[key] || 0) + 1; }
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
    const seasons = allPeriods.filter((p: any) => isSeasonPeriod(p));
    setSeasonsCount(seasons.length);
    setCompetitionsCount(competitions.length);
    setTeamSeasonsCountById(seasonsByProjectId);
    setTeamCompetitionsCountById(competitionsByProjectId);
    setTeamMatchesCountById(matchesByProjectId);
  };

  const ensureOrgPeriodsLoaded = async () => {
    if (DEBUG_LOGS) console.log('[OrganisationDetailPage] ensureOrgPeriodsLoaded called', { teamsCount: teams.length, orgPeriodsCount: orgPeriods.length, loading: orgPeriodsLoading });
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
      const unique = new Map<string, any>();
      const chunkSize = 6;
      const teamChunks = [];
      for (let i = 0; i < teams.length; i += chunkSize) teamChunks.push(teams.slice(i, i + chunkSize));
      if (DEBUG_LOGS) console.log(`[OrganisationDetailPage] Fetching periods for ${teams.length} teams in ${teamChunks.length} chunks`);
      for (const chunk of teamChunks) {
        await Promise.all(chunk.map(async (t: any) => {
          const teamId = t?.id;
          if (!teamId) return;
          const p = new URLSearchParams();
          p.set('page_size', '250');
          p.set('project_id', String(teamId));
          try {
            const periods = await fetchAllPages<any>(`${apiV1BaseUrl}/periods/?${p.toString()}`, { credentials: 'include' });
            for (const pr of periods || []) { if (pr?.id) unique.set(String(pr.id), pr); }
          } catch (e) { console.warn(`Failed to fetch periods for team ${teamId}`, e); }
        }));
      }
      if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Total unique periods fetched via teams:', unique.size);
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
        const teamsRes = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=1&parent_project__isnull=false`, { credentials: 'include' });
        if (teamsRes.ok) { const json = await teamsRes.json(); const { count } = parseListEnvelope(json); setTeamsCount(count); }
      }
      {
        const p = new URLSearchParams();
        p.set('page_size', '250');
        p.set('organisation_id', organisationId);
        const allPeriods = await fetchAllPages<any>(`${apiV1BaseUrl}/periods/?${p.toString()}`, { credentials: 'include' });
        const list = Array.isArray(allPeriods) ? allPeriods : [];
        setOrgPeriods(list);
        if (list.length > 0) recomputePeriodCounts(list);
        else void fetchTeamsForOrg({ force: true });
      }
      {
        const p = new URLSearchParams();
        p.set('page_size', '1');
        p.set('activity_type', 'match');
        p.set('organisation_id', organisationId);
        const res = await fetch(`${apiV1BaseUrl}/activities/?${p.toString()}`, { credentials: 'include' });
        if (res.ok) { const json = await res.json(); const { count } = parseListEnvelope(json); setMatchesCount(count); }
      }
    } catch (e) { console.warn('[OrganisationDetailPage] Failed to fetch counts', e); }
    if (!orgPeriodsLoading && orgPeriods.length === 0) void ensureOrgPeriodsLoaded();
  };

  const fetchMembers = async (force = false) => {
    if (membersLoading) return;
    const haveMembershipDetails = members.some((item: any) => {
      const u = item?.user || item;
      const details = (item as any)?.project_membership_details || (u as any)?.project_membership_details ||
        (item as any)?.project_memberships_details || (u as any)?.project_memberships_details;
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
      const allMembers = await fetchAllPages<any>(
        membersUrl,
        { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-Organisation-ID': orgId }, credentials: 'include' },
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

  return {
    fetchFederationMatches, fetchScheduledMatches, fetchRecentPlayedMatches,
    fetchClubsPage, fetchTeamsForOrg, recomputePeriodCounts,
    ensureOrgPeriodsLoaded, fetchFederationCounts, fetchMembers,
  };
}
