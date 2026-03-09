/**
 * useCompetitionDetailData — all state, effects, mutations, and computed values
 * for ProjectCompetitionDetailPage.
 */
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate, type NavigateFunction, type Location } from 'react-router-dom';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { getActiveContext } from '../../utils/activeContext';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { useCompetitionMutations, type PeriodEditRef, type MatchRef, type MemberRef, type CreateMatchPayload } from './useCompetitionMutations';
import type { Activity } from '../../types/api/activity';

/** Teamreel-specific match metadata nested under activity.metadata. */
interface MatchContext {
  opponent_club_id?: string;
  home_club_name?: string;
  away_club_name?: string;
  away_team_name?: string;
}
interface MatchMetadata { teamreel?: { match_context?: MatchContext } }

export interface UseCompetitionDetailDataReturn {
  // Navigation
  navigate: NavigateFunction;
  location: Location;
  // Season context pass-through
  isTeamRoute: boolean;
  isOrgRoute: boolean;
  orgSlugOrId: string;
  clubSlugOrId: string;
  projectSlugOrId: string;
  seasonsBasePath: string;
  isSuperAdmin: boolean;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  // Resolved entities
  org: Organisation | null;
  project: Project | null;
  club: Project | null;
  season: Period | null;
  competition: Period | null;
  resolvedSeasonId: string;
  resolvedCompetitionId: string;
  // Loading
  loading: boolean;
  error: string | null;
  // Computed
  activeTab: string;
  seasonKeyOrId: string;
  competitionKeyOrId: string;
  competitionBasePath: string;
  navigateToTab: (tabId: string) => void;
  competitionMatchesCount: number;
  // Matches
  matches: Activity[];
  matchesLoading: boolean;
  filteredMatches: Activity[];
  matchDisplayTitle: (match: Activity, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  matchMediaMap: Record<string, Record<string, unknown>[]>;
  matchMediaLoading: boolean;
  // Members
  members: MemberRef[];
  membersLoading: boolean;
  // Hierarchy search
  hierarchySearch: string;
  setHierarchySearch: Dispatch<SetStateAction<string>>;
  // Active context
  activeContext: Record<string, unknown> | null;
  activatingContext: boolean;
  // Modal state
  isPeriodEditModalOpen: boolean;
  setIsPeriodEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEditPeriod: PeriodEditRef | null;
  setSelectedEditPeriod: Dispatch<SetStateAction<PeriodEditRef | null>>;
  isPeriodDetailModalOpen: boolean;
  setIsPeriodDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedDetailPeriod: Period | null;
  setSelectedDetailPeriod: Dispatch<SetStateAction<Period | null>>;
  isMatchEditModalOpen: boolean;
  setIsMatchEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEditMatch: MatchRef | null;
  setSelectedEditMatch: Dispatch<SetStateAction<MatchRef | null>>;
  isMatchDetailModalOpen: boolean;
  setIsMatchDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedDetailMatch: Activity | null;
  setSelectedDetailMatch: Dispatch<SetStateAction<Activity | null>>;
  isMatchCreateModalOpen: boolean;
  setIsMatchCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  isMembershipDetailModalOpen: boolean;
  setIsMembershipDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedMembershipDetail: MemberRef | null;
  setSelectedMembershipDetail: Dispatch<SetStateAction<MemberRef | null>>;
  isMembershipEditModalOpen: boolean;
  setIsMembershipEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedMembershipEdit: MemberRef | null;
  setSelectedMembershipEdit: Dispatch<SetStateAction<MemberRef | null>>;
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: Dispatch<SetStateAction<boolean>>;
  // Mutations (from useCompetitionMutations)
  savePeriodEdits: (periodToEdit: PeriodEditRef, patch: Record<string, unknown>) => Promise<void>;
  saveMatchEdits: (matchToEdit: MatchRef, patch: Record<string, unknown>) => Promise<void>;
  deleteMembership: (membership: MemberRef) => Promise<void>;
  saveMembershipRole: (membership: MemberRef, role: string) => Promise<void>;
  updateFunctionalRoles: (membership: MemberRef, nextRoles: string[]) => Promise<void>;
  deleteCompetition: () => Promise<void>;
  createMatchInCompetition: (payload: CreateMatchPayload) => Promise<void>;
  activateCompetitionContext: () => Promise<void>;
  refreshMembers: () => void;
  getCsrfToken: () => string;
  activateContext: () => Promise<void>;
  setCompetition: Dispatch<SetStateAction<Period | null>>;
  setMatches: Dispatch<SetStateAction<Activity[]>>;
  setMembers: Dispatch<SetStateAction<MemberRef[]>>;
}

export function useCompetitionDetailData(effectiveCompetitionId: string): UseCompetitionDetailDataReturn {
  const navigate = useNavigate();
  const location = useLocation();

  const ctx = useSeasonContext();
  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    seasonPathKey: providerSeasonPathKey,
    isSuperAdmin,
    userCanEditProject,
    apiBaseUrl,
  } = ctx;

  // ── Local shadow state synced from provider ────────────────────────
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { if (!providerLoading) setLoading(false); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

  // ── Domain state ───────────────────────────────────────────────────
  const [competition, setCompetition] = useState<Period | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<Record<string, unknown> | null>(null);
  const [resolvedCompetitionId, setResolvedCompetitionId] = useState<string>('');
  const [competitionsForSwitcher, setCompetitionsForSwitcher] = useState<Period[]>(providerCompetitions);
  const [matches, setMatches] = useState<Activity[]>([]);
  const [members, setMembers] = useState<MemberRef[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [matchMediaMap, setMatchMediaMap] = useState<Record<string, Record<string, unknown>[]>>({});
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});
  const [hierarchySearch, setHierarchySearch] = useState('');

  useEffect(() => { setCompetitionsForSwitcher(providerCompetitions); }, [providerCompetitions]);

  // ── Modal state ────────────────────────────────────────────────────
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<PeriodEditRef | null>(null);
  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<Period | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<MatchRef | null>(null);
  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<Activity | null>(null);
  const [isMatchCreateModalOpen, setIsMatchCreateModalOpen] = useState(false);
  const [isMembershipDetailModalOpen, setIsMembershipDetailModalOpen] = useState(false);
  const [selectedMembershipDetail, setSelectedMembershipDetail] = useState<MemberRef | null>(null);
  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembershipEdit, setSelectedMembershipEdit] = useState<MemberRef | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // ── Active context ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const c = await getActiveContext();
        if (!cancelled) setActiveContextState(c);
      } catch (e) {
        console.error(e);
        console.error('Failed to load active context:', e);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Computed ───────────────────────────────────────────────────────
  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'matches', 'content']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const seasonKeyOrId = providerSeasonPathKey || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  const competitionKeyOrId = periodPathKey(competition) || String(effectiveCompetitionId || resolvedCompetitionId || '').trim();

  const competitionBasePath = useMemo(() => {
    if (!seasonKeyOrId || !competitionKeyOrId) return '';
    return isTeamRoute
      ? `${seasonsBasePath}/${seasonKeyOrId}/${competitionKeyOrId}`
      : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${competitionKeyOrId}`;
  }, [competitionKeyOrId, isTeamRoute, seasonKeyOrId, seasonsBasePath]);

  const navigateToTab = useCallback(
    (tabId: string) => {
      if (!competitionBasePath) return;
      navigate(tabId === 'overview' ? competitionBasePath : `${competitionBasePath}?tab=${encodeURIComponent(tabId)}`);
    },
    [competitionBasePath, navigate],
  );

  const competitionMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number(competition?.matches_count ?? competition?.children_matches_count);
    return Number.isFinite(annotated) && annotated >= 0 ? annotated : 0;
  }, [competition, matches.length]);

  // ── Resolve competition ────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!resolvedSeasonId || !effectiveCompetitionId) return;
      try {
        setLoading(true);
        setError(null);

        const isUuid = looksLikeUuid(effectiveCompetitionId);
        const fromList = isUuid
          ? competitionsForSwitcher.find((p) => String(p.id) === effectiveCompetitionId)
          : competitionsForSwitcher.find((p) => periodPathKey(p) === effectiveCompetitionId);
        const uuid = String(fromList?.id || (isUuid ? effectiveCompetitionId : '')).trim();
        if (!uuid) throw new Error('Competition not found');
        setResolvedCompetitionId(uuid);

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(uuid)}/`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load competition');
        const raw = await res.json() as { data?: Period } & Record<string, unknown>;
        const json: Period = (raw?.data ?? raw) as Period;
        setCompetition(json);

        const desired = periodPathKey(json);
        if (desired && desired !== effectiveCompetitionId) {
          const suffix = location.search || '';
          navigate(
            isTeamRoute
              ? `${seasonsBasePath}/${seasonKeyOrId}/${desired}${suffix}`
              : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${desired}${suffix}`,
            { replace: true },
          );
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiBaseUrl, competitionsForSwitcher, effectiveCompetitionId, resolvedSeasonId, isTeamRoute, location.search, navigate, seasonsBasePath, seasonKeyOrId]);

  // ── Fetch matches ──────────────────────────────────────────────────
  useEffect(() => {
    const needs = ['hierarchy', 'matches', 'overview', 'content'].includes(activeTab);
    if (!needs) return;
    const pid = String(project?.id || '').trim();
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMatchesLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(pid)}&period_id=${encodeURIComponent(cid)}&activity_type=match&ordering=-start_time&page_size=250`;
        const results = await fetchAllPages<Activity>(url, { credentials: 'include' }, {
          ttlMs: 30_000, cacheKey: `matches:competition:${pid}:${cid}`, maxItems: 250,
        });
        if (!cancelled) setMatches(results);
      } catch (e) { console.error('Failed to fetch matches:', e); }
      finally { if (!cancelled) setMatchesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId]);

  // ── Fetch media for content matrix ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'content' || !matches.length) return;
    let cancelled = false;
    (async () => {
      setMatchMediaLoading(true);
      try {
        const map: Record<string, Record<string, unknown>[]> = {};
        await Promise.all(matches.map(async (m) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/v1/media/items/?activity=${m.id}`, { credentials: 'include' });
            if (!res.ok) return;
            const raw = await res.json();
            map[String(m.id)] = Array.isArray(raw) ? raw : (raw?.results || raw?.data?.results || raw?.data || []);
          } catch { map[String(m.id)] = []; }
        }));
        if (!cancelled) setMatchMediaMap(map);
      } finally { if (!cancelled) setMatchMediaLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, matches]);

  // ── Fetch members ──────────────────────────────────────────────────
  useEffect(() => {
    if (!['users', 'overview'].includes(activeTab)) return;
    const pid = String(project?.id || '').trim();
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMembersLoading(true);
      try {
        const params = new URLSearchParams(); params.set('period', cid);
        const res = await fetch(`${apiBaseUrl}/api/v1/projects/${pid}/members/?${params}`, { credentials: 'include' });
        if (!res.ok) return;
        const raw = await res.json();
        let list: MemberRef[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data)) list = raw.data;
        else if (Array.isArray(raw?.data?.data)) list = raw.data.data;
        else if (Array.isArray(raw?.data?.results)) list = raw.data.results;
        else if (Array.isArray(raw?.results)) list = raw.results;
        if (!cancelled) setMembers(list);
      } catch (e) { console.error('Failed to fetch members:', e); }
      finally { if (!cancelled) setMembersLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId]);

  // ── Fetch opponent club names ──────────────────────────────────────
  useEffect(() => {
    if (!matches.length || !apiBaseUrl) return;
    const ids = [...new Set(
      matches.map((m: Activity) => { const mc = (m.metadata as MatchMetadata)?.teamreel?.match_context; return String(mc?.opponent_club_id || '').trim(); }).filter((id) => id && !opponentClubNames[id]),
    )];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(ids.map(async (cid) => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(cid)}/`, { credentials: 'include' });
          if (res.ok) { const d = await res.json() as { data?: { name?: string }; name?: string }; const data = d?.data ?? d; if (data?.name) results[cid] = data.name; }
        } catch { /* ignore */ }
      }));
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl]);

  const filteredMatches = useMemo(() => {
    const q = hierarchySearch.trim().toLowerCase();
    return q ? matches.filter((m: Activity) => String(m.title || '').toLowerCase().includes(q)) : matches;
  }, [hierarchySearch, matches]);

  // ── Match display title helper ─────────────────────────────────────
  const matchDisplayTitle = useCallback(
    (m: Activity, fallback?: string) => {
      const mc = (m.metadata as MatchMetadata)?.teamreel?.match_context;
      const home = mc?.home_club_name || '';
      const away = mc?.away_club_name || '';
      const oppId = String(mc?.opponent_club_id || '').trim();
      const resolvedAway = oppId ? opponentClubNames[oppId] : '';
      const homeName = home || club?.name || project?.name || '';
      const awayName = resolvedAway || away || m.opponent_project?.name || '';
      if (homeName && awayName) return `${homeName} vs ${awayName}`;

      let raw = m.title || fallback || `Match ${m.id}`;
      if (project?.name && club?.name && project.name !== club.name) raw = raw.replace(project.name, club.name);
      const oppTeam = m.opponent_project?.name || mc?.away_team_name || '';
      const oppClub = oppId ? opponentClubNames[oppId] : '';
      if (oppTeam && oppClub && oppTeam !== oppClub) raw = raw.replace(oppTeam, oppClub);
      return raw;
    },
    [club, opponentClubNames, project],
  );

  const matchDetailPath = useCallback(
    (matchId: string) => {
      const slug = String(matches.find((m: Activity) => String(m?.id) === matchId)?.slug || matchId).trim();
      return isTeamRoute && competitionBasePath ? `${competitionBasePath}/${slug}` : `/matches/${slug || matchId}`;
    },
    [competitionBasePath, isTeamRoute, matches],
  );

  // ── Mutations (sub-hook) ────────────────────────────────────────────
  const mutations = useCompetitionMutations({
    apiBaseUrl, resolvedCompetitionId, competition, project,
    seasonsBasePath, seasonKeyOrId, projectSlugOrId, activatingContext,
    setCompetition, setMatches, setMembers, setSelectedEditPeriod,
    setActivatingContext, setActiveContextState, setMembersLoading,
    navigate,
  });

  return {
    // Navigation
    navigate, location,
    // Season context pass-through
    isTeamRoute, isOrgRoute, orgSlugOrId, clubSlugOrId, projectSlugOrId,
    seasonsBasePath, isSuperAdmin, userCanEditProject, apiBaseUrl,
    // Resolved entities
    org, project, club, season, competition,
    resolvedSeasonId, resolvedCompetitionId,
    // Loading
    loading, error,
    // Computed
    activeTab, seasonKeyOrId, competitionKeyOrId, competitionBasePath,
    navigateToTab, competitionMatchesCount,
    // Matches
    matches, matchesLoading, filteredMatches,
    matchDisplayTitle, matchDetailPath,
    matchMediaMap, matchMediaLoading,
    // Members
    members, membersLoading,
    // Hierarchy search
    hierarchySearch, setHierarchySearch,
    // Active context
    activeContext, activatingContext,
    // Modal state
    isPeriodEditModalOpen, setIsPeriodEditModalOpen,
    selectedEditPeriod, setSelectedEditPeriod,
    isPeriodDetailModalOpen, setIsPeriodDetailModalOpen,
    selectedDetailPeriod, setSelectedDetailPeriod,
    isMatchEditModalOpen, setIsMatchEditModalOpen,
    selectedEditMatch, setSelectedEditMatch,
    isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    selectedDetailMatch, setSelectedDetailMatch,
    isMatchCreateModalOpen, setIsMatchCreateModalOpen,
    isMembershipDetailModalOpen, setIsMembershipDetailModalOpen,
    selectedMembershipDetail, setSelectedMembershipDetail,
    isMembershipEditModalOpen, setIsMembershipEditModalOpen,
    selectedMembershipEdit, setSelectedMembershipEdit,
    isAddMemberOpen, setIsAddMemberOpen,
    // Mutations
    ...mutations,
    activateContext: mutations.activateCompetitionContext,
    setCompetition, setMatches, setMembers,
  };
}
