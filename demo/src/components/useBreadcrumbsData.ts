/**
 * useBreadcrumbsData — All data-fetching + state for Breadcrumbs.
 * 7 useEffect hooks that fetch switcher options for each hierarchy level.
 * Keeps Breadcrumbs.tsx focused on route matching and crumbs building.
 */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { api } from '@/api';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';
import { getApiV1BaseUrl } from '../utils/apiFetch';
import { isSeasonPeriod, UUID_RE, type PeriodRecord } from './breadcrumbHelpers';
import { formReducer, makeSetter } from '../utils/formReducer';
import type {
  ApiProject,
  ApiPeriod,
  ApiUser,
  ApiMember,
  ApiMatch,
  BreadcrumbsDataParams,
  BreadcrumbsDataReturn,
} from './breadcrumbsDataTypes';

export type { BreadcrumbsDataReturn } from './breadcrumbsDataTypes';

export function useBreadcrumbsData({
  orgSlug,
  clubSlugOrId,
  isTeamDetail,
  effectiveTeamSlugOrId,
  effectiveSeasonSlugOrId,
  effectiveCompetitionSlugOrId,
  effectiveMatchId,
  userDetailUserId,
}: BreadcrumbsDataParams): BreadcrumbsDataReturn {
  interface BreadcrumbsState {
    clubOptions: BreadcrumbSwitcherOption[];
    teamOptions: BreadcrumbSwitcherOption[];
    loadingTeams: boolean;
    seasonOptions: BreadcrumbSwitcherOption[];
    loadingSeasons: boolean;
    competitionOptions: BreadcrumbSwitcherOption[];
    loadingCompetitions: boolean;
    matchOptions: BreadcrumbSwitcherOption[];
    loadingMatches: boolean;
    userOptions: BreadcrumbSwitcherOption[];
    loadingUsers: boolean;
    memberOptions: BreadcrumbSwitcherOption[];
    loadingMembers: boolean;
    currentMemberName: string | null;
  }

  const [s, dispatch] = useReducer(formReducer<BreadcrumbsState>, {
    clubOptions: [],
    teamOptions: [],
    loadingTeams: false,
    seasonOptions: [],
    loadingSeasons: false,
    competitionOptions: [],
    loadingCompetitions: false,
    matchOptions: [],
    loadingMatches: false,
    userOptions: [],
    loadingUsers: false,
    memberOptions: [],
    loadingMembers: false,
    currentMemberName: null,
  });

  const setClubOptions          = useMemo(() => makeSetter(dispatch, 'clubOptions'), [dispatch]);
  const setTeamOptions          = useMemo(() => makeSetter(dispatch, 'teamOptions'), [dispatch]);
  const setLoadingTeams         = useMemo(() => makeSetter(dispatch, 'loadingTeams'), [dispatch]);
  const setSeasonOptions        = useMemo(() => makeSetter(dispatch, 'seasonOptions'), [dispatch]);
  const setLoadingSeasons       = useMemo(() => makeSetter(dispatch, 'loadingSeasons'), [dispatch]);
  const setCompetitionOptions   = useMemo(() => makeSetter(dispatch, 'competitionOptions'), [dispatch]);
  const setLoadingCompetitions  = useMemo(() => makeSetter(dispatch, 'loadingCompetitions'), [dispatch]);
  const setMatchOptions         = useMemo(() => makeSetter(dispatch, 'matchOptions'), [dispatch]);
  const setLoadingMatches       = useMemo(() => makeSetter(dispatch, 'loadingMatches'), [dispatch]);
  const setUserOptions          = useMemo(() => makeSetter(dispatch, 'userOptions'), [dispatch]);
  const setLoadingUsers         = useMemo(() => makeSetter(dispatch, 'loadingUsers'), [dispatch]);
  const setMemberOptions        = useMemo(() => makeSetter(dispatch, 'memberOptions'), [dispatch]);
  const setLoadingMembers       = useMemo(() => makeSetter(dispatch, 'loadingMembers'), [dispatch]);
  const setCurrentMemberName    = useMemo(() => makeSetter(dispatch, 'currentMemberName'), [dispatch]);

  const isMemberDetailRoute = useMemo(() => {
    const compId = String(effectiveCompetitionSlugOrId || '').trim();
    return UUID_RE.test(compId) && !effectiveMatchId;
  }, [effectiveCompetitionSlugOrId, effectiveMatchId]);

  // ─── 1. Users ───
  useEffect(() => {
    if (!userDetailUserId) { setUserOptions([]); return; }
    let cancelled = false;
    const run = async () => {
      setLoadingUsers(true);
      try {
        let currentUserOption: BreadcrumbSwitcherOption | null = null;
        try {
          const u = await api.get<ApiUser>(`/admin/users/${encodeURIComponent(userDetailUserId)}/`);
          const id = String(u?.id || userDetailUserId).trim();
          const name = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
          const email = String(u?.email || '').trim();
          const label = name || email || (id ? `User ${id}` : 'User');
          currentUserOption = { id, label };
        } catch { /* ignore */ }

        const apiBaseUrl = getApiV1BaseUrl();
        const users = await fetchAllPages<ApiUser>(
          `${apiBaseUrl}/admin/users/?page_size=200`,
          { credentials: 'include' },
          { ttlMs: 1_800_000, cacheKey: 'breadcrumbs:users', maxItems: 200 }
        );
        if (cancelled) return;
        const nextOptions = (Array.isArray(users) ? users : []).map((u: ApiUser) => {
          const id = String(u?.id || '').trim();
          const name = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
          const email = String(u?.email || '').trim();
          const label = name || email || (id ? `User ${id}` : 'User');
          return { id: id || label, label };
        });
        if (currentUserOption) {
          const has = nextOptions.some((o) => String(o.id) === String(currentUserOption!.id));
          if (!has) nextOptions.unshift(currentUserOption);
        }
        setUserOptions(nextOptions);
      } catch {
        if (!cancelled) setUserOptions([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [userDetailUserId]);

  // ─── 2. Clubs ───
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    if (!effectiveOrg) return;
    const fetchClubs = async () => {
      try {
        const { results } = await api.list<ApiProject>(
          `/organisations/${encodeURIComponent(effectiveOrg)}/projects/`,
          { params: { parent_project__isnull: 'true' }, pageSize: 250 },
        );
        setClubOptions(
          (results || []).map((p: ApiProject) => ({
            id: String(p.id),
            label: String(p.name || p.slug || p.id),
            slug: String(p.slug || p.id),
          }))
        );
      } catch { /* ignore */ }
    };
    fetchClubs();
  }, [orgSlug]);

  // ─── 3. Teams ───
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveClub = String(clubSlugOrId || '').trim();
    if (!isTeamDetail || !effectiveOrg || !effectiveClub) return;
    const fetchTeams = async () => {
      setLoadingTeams(true);
      setTeamOptions([]);
      try {
        const resolvedClub = (s.clubOptions || []).find((o) => {
          const slug = String(o?.slug || '').trim();
          const id = String(o?.id || '').trim();
          return slug === effectiveClub || id === effectiveClub;
        });
        const clubIdForQuery = String(resolvedClub?.id || effectiveClub).trim();
        const { results } = await api.list<ApiProject>(
          `/organisations/${encodeURIComponent(effectiveOrg)}/projects/`,
          { params: { parent_project: clubIdForQuery }, pageSize: 1000 },
        );
        const onlyThisClub = (Array.isArray(results) ? results : []).filter((p: ApiProject) => {
          const parent =
            p?.parent_id ??
            p?.parent_project_id ??
            (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project) ??
            (typeof p?.parent === 'object' ? p?.parent?.id : p?.parent);
          const parentId = parent == null ? '' : String(typeof parent === 'object' && parent !== null && 'id' in parent ? (parent as { id?: unknown }).id : parent);
          return parentId && parentId === clubIdForQuery;
        });
        setTeamOptions(
          (onlyThisClub || []).map((p: ApiProject) => ({
            id: String(p.id),
            label: String(p.name || p.slug || p.id),
            slug: String(p.slug || p.id),
          }))
        );
      } catch { /* ignore */ } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeams();
  }, [isTeamDetail, orgSlug, clubSlugOrId, s.clubOptions]);

  // ─── Cached project ID resolver (avoids redundant API calls across effects) ───
  const projectIdCache = useRef<Map<string, string>>(new Map());
  const resolveProjectId = async (org: string, team: string): Promise<string> => {
    const cacheKey = `${org}:${team}`;
    const cached = projectIdCache.current.get(cacheKey);
    if (cached) return cached;
    try {
      const projectJson = await api.get<ApiProject>(
        `/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(team)}/`,
      );
      const id = String(projectJson?.id || '').trim();
      if (id) projectIdCache.current.set(cacheKey, id);
      return id;
    } catch {
      return '';
    }
  };

  const fetchRootPeriods = async (projectId: string) => {
    const apiBaseUrl = getApiV1BaseUrl();
    return fetchAllPages<ApiPeriod>(
      `${apiBaseUrl}/periods/?project_id=${encodeURIComponent(projectId)}&parent_id=null&page_size=500`,
      { credentials: 'include' },
      { ttlMs: 1_800_000, cacheKey: `periods:root:breadcrumb:${projectId}` }
    );
  };

  const fetchChildPeriods = async (parentId: string) => {
    const apiBaseUrl = getApiV1BaseUrl();
    return fetchAllPages<ApiPeriod>(
      `${apiBaseUrl}/periods/?parent_id=${encodeURIComponent(parentId)}&page_size=500`,
      { credentials: 'include' },
      { ttlMs: 1_800_000, cacheKey: `periods:children:breadcrumb:${parentId}` }
    );
  };

  const findSeasonId = (rootPeriods: ApiPeriod[], seasonKey: string): string => {
    const found = (rootPeriods || []).find((p: ApiPeriod) => {
      const key = periodPathKey(p) || String(p?.id || '');
      return String(p?.id || '') === seasonKey || key === seasonKey;
    });
    return String(found?.id || '').trim();
  };

  // ─── 4. Seasons ───
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveTeam = String(effectiveTeamSlugOrId || '').trim();
    const effectiveSeason = String(effectiveSeasonSlugOrId || '').trim();
    if (!effectiveOrg || !effectiveTeam || !effectiveSeason) { setSeasonOptions([]); return; }

    let cancelled = false;
    const run = async () => {
      setLoadingSeasons(true);
      try {
        const projectId = await resolveProjectId(effectiveOrg, effectiveTeam);
        if (!projectId || cancelled) return;
        const rootPeriods = await fetchRootPeriods(projectId);
        const seasons = (rootPeriods || []).filter((p) => isSeasonPeriod(p as unknown as PeriodRecord));
        const opts: BreadcrumbSwitcherOption[] = seasons.map((p) => ({
          id: String(p.id),
          label: String(p.name || p.slug || p.id),
          slug: periodPathKey(p) || String(p.id),
        }));
        if (!cancelled) setSeasonOptions(opts);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [orgSlug, effectiveTeamSlugOrId, effectiveSeasonSlugOrId]);

  // ─── 5. Competitions ───
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveTeam = String(effectiveTeamSlugOrId || '').trim();
    const effectiveSeason = String(effectiveSeasonSlugOrId || '').trim();
    const effectiveComp = String(effectiveCompetitionSlugOrId || '').trim();
    if (!effectiveOrg || !effectiveTeam || !effectiveSeason || !effectiveComp) { setCompetitionOptions([]); return; }

    let cancelled = false;
    const run = async () => {
      setLoadingCompetitions(true);
      try {
        const projectId = await resolveProjectId(effectiveOrg, effectiveTeam);
        if (!projectId || cancelled) return;
        const rootPeriods = await fetchRootPeriods(projectId);
        const seasonId = findSeasonId(rootPeriods, effectiveSeason);
        if (!seasonId || cancelled) return;
        const competitionPeriods = await fetchChildPeriods(seasonId);
        const opts: BreadcrumbSwitcherOption[] = (competitionPeriods || []).map((p: ApiPeriod) => ({
          id: String(p.id),
          label: String(p.name || p.slug || p.id),
          slug: periodPathKey(p) || String(p.id),
        }));
        if (!cancelled) setCompetitionOptions(opts);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingCompetitions(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [orgSlug, effectiveTeamSlugOrId, effectiveSeasonSlugOrId, effectiveCompetitionSlugOrId]);

  // ─── 6. Members ───
  useEffect(() => {
    if (!isMemberDetailRoute) { setMemberOptions([]); setCurrentMemberName(null); return; }

    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveTeam = String(effectiveTeamSlugOrId || '').trim();
    const effectiveSeason = String(effectiveSeasonSlugOrId || '').trim();
    const memberId = String(effectiveCompetitionSlugOrId || '').trim();
    if (!effectiveOrg || !effectiveTeam || !effectiveSeason || !memberId) { setMemberOptions([]); setCurrentMemberName(null); return; }

    let cancelled = false;
    const run = async () => {
      setLoadingMembers(true);
      try {
        const projectId = await resolveProjectId(effectiveOrg, effectiveTeam);
        if (!projectId || cancelled) return;

        const rootPeriods = await fetchRootPeriods(projectId);
        const seasonId = findSeasonId(rootPeriods, effectiveSeason);
        if (!seasonId || cancelled) return;

        const { results: membersList } = await api.list<ApiMember>(
          `/projects/${encodeURIComponent(projectId)}/members/`,
          { params: { period_id: seasonId }, pageSize: 500 },
        );

        const opts: BreadcrumbSwitcherOption[] = (Array.isArray(membersList) ? membersList : []).map((m: ApiMember) => {
          const id = String(m?.id || '').trim();
          const user = m?.user || {};
          const name =
            String(user?.name || '').trim() ||
            `${String(user?.first_name || '').trim()} ${String(user?.last_name || '').trim()}`.trim() ||
            String(user?.email || '').trim() ||
            'Member';
          return { id, label: name, slug: id };
        });

        const currentMember = opts.find(o => o.id === memberId);
        if (!cancelled) {
          setMemberOptions(opts);
          setCurrentMemberName(currentMember?.label || null);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [isMemberDetailRoute, orgSlug, effectiveTeamSlugOrId, effectiveSeasonSlugOrId, effectiveCompetitionSlugOrId]);

  // ─── 7. Matches ───
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveTeam = String(effectiveTeamSlugOrId || '').trim();
    const effectiveSeason = String(effectiveSeasonSlugOrId || '').trim();
    const effectiveComp = String(effectiveCompetitionSlugOrId || '').trim();
    const effectiveMatch = String(effectiveMatchId || '').trim();
    if (!effectiveOrg || !effectiveTeam || !effectiveSeason || !effectiveComp || !effectiveMatch) { setMatchOptions([]); return; }

    let cancelled = false;
    const run = async () => {
      setLoadingMatches(true);
      try {
        const projectId = await resolveProjectId(effectiveOrg, effectiveTeam);
        if (!projectId || cancelled) return;
        const rootPeriods = await fetchRootPeriods(projectId);
        const seasonId = findSeasonId(rootPeriods, effectiveSeason);
        if (!seasonId || cancelled) return;
        const competitionPeriods = await fetchChildPeriods(seasonId);
        const competitionFromList = (competitionPeriods || []).find((p: ApiPeriod) => {
          const key = periodPathKey(p) || String(p?.id || '');
          return String(p?.id || '') === effectiveComp || key === effectiveComp;
        });
        const competitionId = String(competitionFromList?.id || '').trim();
        if (!competitionId || cancelled) return;

        const apiBaseUrl = getApiV1BaseUrl();
        const matchesUrl = `${apiBaseUrl}/activities/?project_id=${encodeURIComponent(
          projectId
        )}&period_id=${encodeURIComponent(competitionId)}&activity_type=match&ordering=-start_time&page_size=250`;
        const matchRows = await fetchAllPages<ApiMatch>(
          matchesUrl,
          { credentials: 'include' },
          { ttlMs: 1_800_000, cacheKey: `matches:competition:breadcrumb:${projectId}:${competitionId}`, maxItems: 250 }
        );
        const opts: BreadcrumbSwitcherOption[] = (matchRows || []).map((m: ApiMatch) => ({
          id: String(m.id),
          label: String(m.title || m.name || m.slug || m.id),
          slug: String(m.slug || m.id),
        }));
        if (!cancelled) setMatchOptions(opts);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [orgSlug, effectiveTeamSlugOrId, effectiveSeasonSlugOrId, effectiveCompetitionSlugOrId, effectiveMatchId]);

  return {
    clubOptions: s.clubOptions, teamOptions: s.teamOptions, seasonOptions: s.seasonOptions, competitionOptions: s.competitionOptions,
    matchOptions: s.matchOptions, userOptions: s.userOptions, memberOptions: s.memberOptions, currentMemberName: s.currentMemberName,
    loadingTeams: s.loadingTeams, loadingSeasons: s.loadingSeasons, loadingCompetitions: s.loadingCompetitions,
    loadingMatches: s.loadingMatches, loadingUsers: s.loadingUsers, loadingMembers: s.loadingMembers,
    isMemberDetailRoute,
  };
}
