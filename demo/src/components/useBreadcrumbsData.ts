/**
 * useBreadcrumbsData — All data-fetching + state for Breadcrumbs.
 * 7 useEffect hooks that fetch switcher options for each hierarchy level.
 * Keeps Breadcrumbs.tsx focused on route matching and crumbs building.
 */
import { useEffect, useMemo, useState } from 'react';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';
import { getApiBaseUrl } from '../utils/apiBase';
import { isSeasonPeriod, UUID_RE } from './breadcrumbHelpers';

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
        const apiBaseUrl = getApiBaseUrl();

        let currentUserOption: BreadcrumbSwitcherOption | null = null;
        try {
          const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(userDetailUserId)}/`, { credentials: 'include' });
          if (res.ok) {
            const raw = await res.json();
            const u = (raw as any)?.data ?? raw;
            const id = String(u?.id || userDetailUserId).trim();
            const name = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
            const email = String(u?.email || '').trim();
            const label = name || email || (id ? `User ${id}` : 'User');
            currentUserOption = { id, label };
          }
        } catch { /* ignore */ }

        const users = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/admin/users/?page_size=200`,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: 'breadcrumbs:users', maxItems: 200 }
        );
        if (cancelled) return;
        const nextOptions = (Array.isArray(users) ? users : []).map((u: any) => {
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
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/?page_size=250&parent_project__isnull=true`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = raw?.data || raw;
        const results = data?.results || data?.data?.results || [];
        setClubOptions(
          (results || []).map((p: any) => ({
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
        const apiBaseUrl = getApiBaseUrl();
        const resolvedClub = (clubOptions || []).find((o) => {
          const slug = String(o?.slug || '').trim();
          const id = String(o?.id || '').trim();
          return slug === effectiveClub || id === effectiveClub;
        });
        const clubIdForQuery = String(resolvedClub?.id || effectiveClub).trim();
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/?page_size=1000&parent_project=${encodeURIComponent(clubIdForQuery)}`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = raw?.data || raw;
        const results = data?.results || data?.data?.results || [];
        const onlyThisClub = (Array.isArray(results) ? results : []).filter((p: any) => {
          const parent =
            p?.parent_id ??
            p?.parent_project_id ??
            (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project) ??
            (typeof p?.parent === 'object' ? p?.parent?.id : p?.parent);
          const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
          return parentId && parentId === clubIdForQuery;
        });
        setTeamOptions(
          (onlyThisClub || []).map((p: any) => ({
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
    const apiBaseUrl = getApiBaseUrl();
    const projectRes = await fetch(
      `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(team)}/`,
      { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
    );
    if (!projectRes.ok) return '';
    const rawProject: any = await projectRes.json();
    const projectJson: any = rawProject?.data || rawProject;
    return String(projectJson?.id || '').trim();
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

  const findSeasonId = (rootPeriods: any[], seasonKey: string): string => {
    const found = (rootPeriods || []).find((p: any) => {
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
        const opts: BreadcrumbSwitcherOption[] = seasons.map((p: any) => ({
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
        const opts: BreadcrumbSwitcherOption[] = (competitionPeriods || []).map((p: any) => ({
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

        const apiBaseUrl = getApiBaseUrl();
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/?period_id=${encodeURIComponent(seasonId)}&page_size=500`;
        const membersRes = await fetch(membersUrl, { credentials: 'include' });
        if (!membersRes.ok) return;
        const membersRaw = await membersRes.json();
        const membersList = membersRaw?.data?.data || membersRaw?.data?.results || membersRaw?.results || membersRaw?.data || [];

        const opts: BreadcrumbSwitcherOption[] = (Array.isArray(membersList) ? membersList : []).map((m: any) => {
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
        const competitionFromList = (competitionPeriods || []).find((p: any) => {
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
        const opts: BreadcrumbSwitcherOption[] = (matchRows || []).map((m: any) => ({
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
