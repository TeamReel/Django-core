/**
 * useBreadcrumbsData — All data-fetching + state for Breadcrumbs.
 * 7 useEffect hooks that fetch switcher options for each hierarchy level.
 * Keeps Breadcrumbs.tsx focused on route matching and crumbs building.
 */
import { useEffect, useMemo, useState } from 'react';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { api } from '@/api';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';
import { getApiBaseUrl } from '../utils/apiBase';
import { isSeasonPeriod, UUID_RE } from './breadcrumbHelpers';

// ─── Local structural types for API responses ────────────────────────────────

interface ApiProject {
  id?: string | number;
  name?: string;
  slug?: string;
  parent_id?: unknown;
  parent_project_id?: unknown;
  parent_project?: { id?: string | number } | string | number | null;
  parent?: { id?: string | number } | string | number | null;
}

interface ApiPeriod {
  id?: string | number;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

interface ApiUser {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  name?: string;
}

interface ApiMember {
  id?: string | number;
  user?: ApiUser;
}

interface ApiMatch {
  id?: string | number;
  title?: string;
  name?: string;
  slug?: string;
}

interface BreadcrumbsDataParams {
  orgSlug: string | null;
  clubSlugOrId: string | null;
  isTeamDetail: boolean;
  effectiveTeamSlugOrId: string | null;
  effectiveSeasonSlugOrId: string | null;
  effectiveCompetitionSlugOrId: string | null;
  effectiveMatchId: string | null;
  userDetailUserId: string;
}

export interface BreadcrumbsDataReturn {
  clubOptions: BreadcrumbSwitcherOption[];
  teamOptions: BreadcrumbSwitcherOption[];
  seasonOptions: BreadcrumbSwitcherOption[];
  competitionOptions: BreadcrumbSwitcherOption[];
  matchOptions: BreadcrumbSwitcherOption[];
  userOptions: BreadcrumbSwitcherOption[];
  memberOptions: BreadcrumbSwitcherOption[];
  currentMemberName: string | null;
  loadingTeams: boolean;
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  loadingMatches: boolean;
  loadingUsers: boolean;
  loadingMembers: boolean;
  isMemberDetailRoute: boolean;
}

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
  const [clubOptions, setClubOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [seasonOptions, setSeasonOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  const [competitionOptions, setCompetitionOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [matchOptions, setMatchOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [userOptions, setUserOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [memberOptions, setMemberOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentMemberName, setCurrentMemberName] = useState<string | null>(null);

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
          const u = await api.get<any>(`/admin/users/${encodeURIComponent(userDetailUserId)}/`);
          const id = String(u?.id || userDetailUserId).trim();
          const name = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
          const email = String(u?.email || '').trim();
          const label = name || email || (id ? `User ${id}` : 'User');
          currentUserOption = { id, label };
        } catch { /* ignore */ }

        const apiBaseUrl = getApiBaseUrl();
        const users = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/admin/users/?page_size=200`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'breadcrumbs:users', maxItems: 200 }
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
        const { results } = await api.list<any>(
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
        const resolvedClub = (clubOptions || []).find((o) => {
          const slug = String(o?.slug || '').trim();
          const id = String(o?.id || '').trim();
          return slug === effectiveClub || id === effectiveClub;
        });
        const clubIdForQuery = String(resolvedClub?.id || effectiveClub).trim();
        const { results } = await api.list<any>(
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
  }, [isTeamDetail, orgSlug, clubSlugOrId, clubOptions]);

  // ─── Shared helper: resolve project ID from team slug ───
  const resolveProjectId = async (org: string, team: string): Promise<string> => {
    try {
      const projectJson = await api.get<any>(
        `/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(team)}/`,
      );
      return String(projectJson?.id || '').trim();
    } catch {
      return '';
    }
  };

  const fetchRootPeriods = async (projectId: string) => {
    const apiBaseUrl = getApiBaseUrl();
    return fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(projectId)}&parent_id=null&page_size=500`,
      { credentials: 'include' },
      { ttlMs: 60_000, cacheKey: `periods:root:breadcrumb:${projectId}` }
    );
  };

  const fetchChildPeriods = async (parentId: string) => {
    const apiBaseUrl = getApiBaseUrl();
    return fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(parentId)}&page_size=500`,
      { credentials: 'include' },
      { ttlMs: 60_000, cacheKey: `periods:children:breadcrumb:${parentId}` }
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
        const seasons = (rootPeriods || []).filter(isSeasonPeriod);
        const opts: BreadcrumbSwitcherOption[] = seasons.map((p: ApiPeriod) => ({
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

        const { results: membersList } = await api.list<any>(
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

        const apiBaseUrl = getApiBaseUrl();
        const matchesUrl = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
          projectId
        )}&period_id=${encodeURIComponent(competitionId)}&activity_type=match&ordering=-start_time&page_size=250`;
        const matchRows = await fetchAllPages<any>(
          matchesUrl,
          { credentials: 'include' },
          { ttlMs: 30_000, cacheKey: `matches:competition:breadcrumb:${projectId}:${competitionId}`, maxItems: 250 }
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
    clubOptions, teamOptions, seasonOptions, competitionOptions,
    matchOptions, userOptions, memberOptions, currentMemberName,
    loadingTeams, loadingSeasons, loadingCompetitions,
    loadingMatches, loadingUsers, loadingMembers,
    isMemberDetailRoute,
  };
}
