/**
 * useCompetitionDetailData — all state, effects, mutations, and computed values
 * for ProjectCompetitionDetailPage.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken } from '../../types/season';

export function useCompetitionDetailData(effectiveCompetitionId: string) {
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
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [resolvedCompetitionId, setResolvedCompetitionId] = useState<string>('');
  const [competitionsForSwitcher, setCompetitionsForSwitcher] = useState<Period[]>(providerCompetitions);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [matchMediaMap, setMatchMediaMap] = useState<Record<string, any[]>>({});
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});
  const [hierarchySearch, setHierarchySearch] = useState('');

  useEffect(() => { setCompetitionsForSwitcher(providerCompetitions); }, [providerCompetitions]);

  // ── Modal state ────────────────────────────────────────────────────
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);
  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);
  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);
  const [isMatchCreateModalOpen, setIsMatchCreateModalOpen] = useState(false);
  const [isMembershipDetailModalOpen, setIsMembershipDetailModalOpen] = useState(false);
  const [selectedMembershipDetail, setSelectedMembershipDetail] = useState<any | null>(null);
  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembershipEdit, setSelectedMembershipEdit] = useState<any | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // ── Active context ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const c = await getActiveContext();
        if (!cancelled) setActiveContextState(c);
      } catch (e) {
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
    const annotated = Number((competition as any)?.matches_count ?? (competition as any)?.children_matches_count);
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
        const raw: any = await res.json();
        const json: Period = raw?.data || raw;
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
    const pid = String((project as any)?.id || '').trim();
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMatchesLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(pid)}&period_id=${encodeURIComponent(cid)}&activity_type=match&ordering=-start_time&page_size=250`;
        const results = await fetchAllPages<any>(url, { credentials: 'include' }, {
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
        const map: Record<string, any[]> = {};
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
    const pid = String((project as any)?.id || '').trim();
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMembersLoading(true);
      try {
        const params = new URLSearchParams(); params.set('period', cid);
        const res = await fetch(`${apiBaseUrl}/api/v1/projects/${pid}/members/?${params}`, { credentials: 'include' });
        if (!res.ok) return;
        const raw = await res.json();
        let list: any[] = [];
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
      matches.map((m: any) => String(m.metadata?.teamreel?.match_context?.opponent_club_id || '').trim()).filter((id) => id && !opponentClubNames[id]),
    )];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(ids.map(async (cid) => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(cid)}/`, { credentials: 'include' });
          if (res.ok) { const d: any = await res.json(); const data = d?.data ?? d; if (data?.name) results[cid] = data.name; }
        } catch { /* ignore */ }
      }));
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl]);

  const filteredMatches = useMemo(() => {
    const q = hierarchySearch.trim().toLowerCase();
    return q ? matches.filter((m: any) => String(m.title || '').toLowerCase().includes(q)) : matches;
  }, [hierarchySearch, matches]);

  // ── Match display title helper ─────────────────────────────────────
  const matchDisplayTitle = useCallback(
    (m: any, fallback?: string) => {
      const mc = m.metadata?.teamreel?.match_context;
      const home = mc?.home_club_name || '';
      const away = mc?.away_club_name || '';
      const oppId = String(mc?.opponent_club_id || '').trim();
      const resolvedAway = oppId ? opponentClubNames[oppId] : '';
      const homeName = home || club?.name || project?.name || '';
      const awayName = resolvedAway || away || m.opponent_project?.name || '';
      if (homeName && awayName) return `${homeName} vs ${awayName}`;

      let raw = m.title || m.name || fallback || `Match ${m.id}`;
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
      const slug = String(matches.find((m: any) => String(m?.id) === matchId)?.slug || matchId).trim();
      return isTeamRoute && competitionBasePath ? `${competitionBasePath}/${slug}` : `/matches/${slug || matchId}`;
    },
    [competitionBasePath, isTeamRoute, matches],
  );

  // ── Mutations ──────────────────────────────────────────────────────

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const pid = String(periodToEdit?.id || periodToEdit?.period_id || periodToEdit?.uuid || periodToEdit?.data?.id || periodToEdit?.data?.data?.id || resolvedCompetitionId || '').trim();
    if (!pid) throw new Error('Missing period id');
    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(pid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(patch),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save period'); }
    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(competition?.id)) setCompetition((prev) => prev ? { ...(prev as any), ...(updated as any) } as any : updated as any);
    setSelectedEditPeriod((prev: any) => {
      const pId = String(prev?.id || prev?.data?.id || '').trim();
      const nId = String(updated?.id || updated?.data?.id || '').trim();
      return pId && nId && pId === nId ? updated : prev;
    });
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const mid = String(matchToEdit?.id || '').trim();
    if (!mid) throw new Error('Missing match id');
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(mid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(patch),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save match'); }
    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => String(m.id) === String(updated?.id) ? { ...m, ...updated } : m));
  };

  const deleteMembership = async (membership: any) => {
    const mid = String(membership?.id || '').trim();
    const pid = String((project as any)?.id || '').trim();
    if (!mid || !pid) return;
    const u = membership.user || {};
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'this member';
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to remove member'); }
      setMembers((prev) => prev.filter((m: any) => String(m.id) !== mid));
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : 'Error removing member'); }
  };

  const saveMembershipRole = async (membership: any, role: string) => {
    const mid = String(membership?.id || '').trim();
    const pid = String((project as any)?.id || '').trim();
    if (!mid || !pid) throw new Error('Missing membership id');
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify({ role }),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save member'); }
    setMembers((prev) => prev.map((m: any) => String(m.id) === mid ? { ...m, role } : m));
  };

  const updateFunctionalRoles = async (membership: any, nextRoles: string[]) => {
    const pid = String((project as any)?.id || '').trim();
    const uid = Number(membership?.user?.id);
    if (!pid) throw new Error('Missing project id');
    if (!uid) throw new Error('Missing user id');
    const prevDirect = (membership as any)?.functional_roles ?? (membership as any)?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: any) => String(r || '').trim()).filter(Boolean) : [];
    const normalized = (Array.isArray(nextRoles) ? nextRoles : []).map((r) => String(r || '').trim()).filter(Boolean);
    const prevSet = new Set(prevRoles);
    const nextSet = new Set(normalized);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() };
    if (toAdd.length) {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/functional-roles/assign/`, {
        method: 'POST', headers, credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toAdd }),
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to assign functional roles'); }
    }
    if (toRemove.length) {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/functional-roles/unassign/`, {
        method: 'POST', headers, credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toRemove }),
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to unassign functional roles'); }
    }
  };

  const deleteCompetition = async () => {
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!cid) return;
    if (!window.confirm(`Are you sure you want to delete competition ${competition?.name}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(cid)}/`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      });
      if (res.ok) navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=competitions`);
      else alert('Error deleting competition');
    } catch (e) { console.error(e); alert('Error deleting competition'); }
  };

  const createMatchInCompetition = async (payload: {
    title: string; start_time: string; end_time: string;
    opponent_project_id?: string; venue?: 'Home' | 'Away'; location?: string; description?: string; metadata?: any;
  }) => {
    const pid = String((project as any)?.id || '').trim();
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!pid) throw new Error('Missing team id');
    if (!cid) throw new Error('Missing competition id');
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      body: JSON.stringify({
        title: payload.title, activity_type: 'match', project_id: Number(pid),
        opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
        period_id: cid, start_time: payload.start_time, end_time: payload.end_time,
        location: payload.location, description: payload.description,
        metadata: { venue: payload.venue || 'Home', is_home: (payload.venue || 'Home') === 'Home', ...(payload as any)?.metadata },
      }),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to create match'); }
    const raw = await res.json().catch(() => null);
    const created = (raw as any)?.data || raw;
    if (created?.id) {
      setMatches((prev) => [...new Map([[String(created.id), created], ...prev.map((m: any) => [String(m.id), m] as [string, any])]).values()]);
    }
  };

  const activateCompetitionContext = async () => {
    if (!competition || activatingContext) return;
    try {
      setActivatingContext(true);
      await setActiveContext('competition', String(competition.id));
      const c = await getActiveContext();
      setActiveContextState(c);
    } finally {
      setActivatingContext(false);
    }
  };

  const refreshMembers = () => {
    setMembersLoading(true);
    const url = `${apiBaseUrl}/api/v1/projects/${project?.id || projectSlugOrId}/members/?page_size=250`;
    fetchAllPages(url, { credentials: 'include' })
      .then((all: any[]) => setMembers(all))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  };

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
    activeContext, activatingContext, activateCompetitionContext,
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
    savePeriodEdits, saveMatchEdits,
    deleteMembership, saveMembershipRole, updateFunctionalRoles,
    deleteCompetition, createMatchInCompetition,
    activateContext: activateCompetitionContext,
    refreshMembers,
    setCompetition, setMatches, setMembers,
    getCsrfToken,
  };
}
