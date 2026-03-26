/**
 * PreferencesPage — Cascading entity selection sub-hook
 *
 * Manages active context + cascading org → club → team → season → competition → match selectors.
 * Consolidated to useReducer during S3 refactor.
 */
import { useReducer, useMemo, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { formReducer, makeSetter } from '@/utils/formReducer';
import {
  ACTIVE_CONTEXT_CHANGED_EVENT,
  getActiveContext as fetchActiveContext,
  setActiveContext as apiSetActiveContext,
  type ActiveContextKind,
} from '../../utils/activeContext';
import type { Organisation, Project, Period, Activity } from '../../types';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface CascadingEntitySelectionReturn {
  /* active context */
  activeContext: Record<string, unknown> | null;
  activeContextLoading: boolean;
  activeContextError: string | null;
  savingContext: boolean;

  /* selection */
  selectedOrgId: string;
  setSelectedOrgId: (v: string) => void;
  selectedClubId: string;
  setSelectedClubId: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  selectedSeasonId: string;
  setSelectedSeasonId: (v: string) => void;
  selectedCompetitionId: string;
  setSelectedCompetitionId: (v: string) => void;
  selectedMatchId: string;
  setSelectedMatchId: (v: string) => void;
  hasEditedContext: boolean;
  setHasEditedContext: (v: boolean) => void;

  /* entity lists */
  organisations: Organisation[];
  clubs: Project[];
  teams: Project[];
  seasons: Period[];
  competitions: Period[];
  matches: Activity[];

  /* loading */
  loadingOrgs: boolean;
  loadingClubs: boolean;
  loadingTeams: boolean;
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  loadingMatches: boolean;

  /* handlers */
  applyActiveContextSelection: (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }) => Promise<void>;
}

/* ================================================================== */
/*  Hook                                                               */
/* ================================================================== */

export function useCascadingEntitySelection(): CascadingEntitySelectionReturn {
  const { user } = useAuth();

  /* -------- reducer state ---------------------------------------- */
  interface CascadingState {
    activeContext: Record<string, unknown> | null;
    activeContextLoading: boolean;
    activeContextError: string | null;
    savingContext: boolean;
    hasEditedContext: boolean;
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    selectedSeasonId: string;
    selectedCompetitionId: string;
    selectedMatchId: string;
    organisations: Organisation[];
    clubs: Project[];
    teams: Project[];
    seasons: Period[];
    competitions: Period[];
    matches: Activity[];
    loadingOrgs: boolean;
    loadingClubs: boolean;
    loadingTeams: boolean;
    loadingSeasons: boolean;
    loadingCompetitions: boolean;
    loadingMatches: boolean;
  }
  const initialState: CascadingState = {
    activeContext: null, activeContextLoading: false, activeContextError: null, savingContext: false,
    hasEditedContext: false,
    selectedOrgId: '', selectedClubId: '', selectedTeamId: '',
    selectedSeasonId: '', selectedCompetitionId: '', selectedMatchId: '',
    organisations: [], clubs: [], teams: [], seasons: [], competitions: [], matches: [],
    loadingOrgs: false, loadingClubs: false, loadingTeams: false,
    loadingSeasons: false, loadingCompetitions: false, loadingMatches: false,
  };
  const [s, dispatch] = useReducer(formReducer<CascadingState>, initialState);

  const setActiveContext = useMemo(() => makeSetter<CascadingState, 'activeContext'>(dispatch, 'activeContext'), [dispatch]);
  const setActiveContextLoading = useMemo(() => makeSetter<CascadingState, 'activeContextLoading'>(dispatch, 'activeContextLoading'), [dispatch]);
  const setActiveContextError = useMemo(() => makeSetter<CascadingState, 'activeContextError'>(dispatch, 'activeContextError'), [dispatch]);
  const setSavingContext = useMemo(() => makeSetter<CascadingState, 'savingContext'>(dispatch, 'savingContext'), [dispatch]);
  const setHasEditedContext = useMemo(() => makeSetter<CascadingState, 'hasEditedContext'>(dispatch, 'hasEditedContext'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<CascadingState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<CascadingState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<CascadingState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setSelectedSeasonId = useMemo(() => makeSetter<CascadingState, 'selectedSeasonId'>(dispatch, 'selectedSeasonId'), [dispatch]);
  const setSelectedCompetitionId = useMemo(() => makeSetter<CascadingState, 'selectedCompetitionId'>(dispatch, 'selectedCompetitionId'), [dispatch]);
  const setSelectedMatchId = useMemo(() => makeSetter<CascadingState, 'selectedMatchId'>(dispatch, 'selectedMatchId'), [dispatch]);
  const setOrganisations = useMemo(() => makeSetter<CascadingState, 'organisations'>(dispatch, 'organisations'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<CascadingState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<CascadingState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setSeasons = useMemo(() => makeSetter<CascadingState, 'seasons'>(dispatch, 'seasons'), [dispatch]);
  const setCompetitions = useMemo(() => makeSetter<CascadingState, 'competitions'>(dispatch, 'competitions'), [dispatch]);
  const setMatches = useMemo(() => makeSetter<CascadingState, 'matches'>(dispatch, 'matches'), [dispatch]);
  const setLoadingOrgs = useMemo(() => makeSetter<CascadingState, 'loadingOrgs'>(dispatch, 'loadingOrgs'), [dispatch]);
  const setLoadingClubs = useMemo(() => makeSetter<CascadingState, 'loadingClubs'>(dispatch, 'loadingClubs'), [dispatch]);
  const setLoadingTeams = useMemo(() => makeSetter<CascadingState, 'loadingTeams'>(dispatch, 'loadingTeams'), [dispatch]);
  const setLoadingSeasons = useMemo(() => makeSetter<CascadingState, 'loadingSeasons'>(dispatch, 'loadingSeasons'), [dispatch]);
  const setLoadingCompetitions = useMemo(() => makeSetter<CascadingState, 'loadingCompetitions'>(dispatch, 'loadingCompetitions'), [dispatch]);
  const setLoadingMatches = useMemo(() => makeSetter<CascadingState, 'loadingMatches'>(dispatch, 'loadingMatches'), [dispatch]);

  /* ---------- helpers -------------------------------------------- */
  const getOrganisationIdentifier = (orgKey: string): string => {
    const key = String(orgKey || '').trim();
    if (!key) return '';
    const org = s.organisations.find((o) => String(o?.id ?? '').trim() === key || String(o?.slug ?? '').trim() === key);
    return String(org?.slug || key).trim();
  };

  const deriveSelectionFromActiveContext = (ctx: Record<string, unknown>) => {
    const ctxOrg = ctx?.organisation as Record<string, unknown> | undefined;
    const ctxClub = ctx?.club as Record<string, unknown> | undefined;
    const ctxTeam = ctx?.team as Record<string, unknown> | undefined;
    const ctxSeason = ctx?.season as Record<string, unknown> | undefined;
    const ctxCompetition = ctx?.competition as Record<string, unknown> | undefined;
    const ctxMatch = ctx?.match as Record<string, unknown> | undefined;
    const rawOrgId = String(ctxOrg?.id || '').trim();
    const rawOrgSlug = String(ctxOrg?.slug || '').trim();
    const resolvedOrgId = rawOrgId
      ? rawOrgId
      : (rawOrgSlug
          ? String(s.organisations.find((o) => String(o?.slug || '').trim() === rawOrgSlug)?.id || rawOrgSlug).trim()
          : '');
    return {
      orgId: resolvedOrgId,
      clubId: String(ctxClub?.id || '').trim(),
      teamId: String(ctxTeam?.id || '').trim(),
      seasonId: String(ctxSeason?.id || '').trim(),
      competitionId: String(ctxCompetition?.id || '').trim(),
      matchId: String(ctxMatch?.id || '').trim(),
    };
  };

  const computeDeepestContext = (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }): { kind: ActiveContextKind; id?: string } => {
    const orgIdentifier = getOrganisationIdentifier(next.orgId);
    if (next.matchId) return { kind: 'match', id: next.matchId };
    if (next.competitionId) return { kind: 'competition', id: next.competitionId };
    if (next.seasonId) return { kind: 'season', id: next.seasonId };
    if (next.teamId) return { kind: 'team', id: next.teamId };
    if (next.clubId) return { kind: 'club', id: next.clubId };
    if (orgIdentifier) return { kind: 'organisation', id: orgIdentifier };
    return { kind: 'clear' };
  };

  const applyActiveContextSelection = async (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }) => {
    try {
      setSavingContext(true);
      setActiveContextError(null);
      const { kind, id } = computeDeepestContext(next);
      await apiSetActiveContext(kind, id);
      const data = await fetchActiveContext();
      setActiveContext(data);
      setHasEditedContext(false);
      window.dispatchEvent(new Event(ACTIVE_CONTEXT_CHANGED_EVENT));
    } catch (e) {
      logger.error('Failed to save active context', e);
      setActiveContextError(e instanceof Error ? e.message : 'Failed to save active context');
    } finally {
      setSavingContext(false);
    }
  };

  const extractPaginated = (raw: unknown) => {
    const data = (raw as Record<string, unknown>)?.data ?? raw;
    const results = (Array.isArray((data as Record<string, unknown>)?.results) ? (data as Record<string, unknown>).results : (Array.isArray(data) ? data : [])) as Record<string, unknown>[];
    const next = String((data as Record<string, unknown>)?.next || (raw as Record<string, unknown>)?.next || '').trim();
    return { results, next };
  };

  /* ---------- effects -------------------------------------------- */

  // Load active context + listen for changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setActiveContextLoading(true);
        setActiveContextError(null);
        const data = await fetchActiveContext();
        if (!cancelled) setActiveContext(data);
      } catch (e) {
        logger.error('Failed to load active context', e);
        if (!cancelled) setActiveContextError(e instanceof Error ? e.message : 'Failed to load active context');
      } finally {
        if (!cancelled) setActiveContextLoading(false);
      }
    };
    const onChanged = () => { void load(); };
    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => { cancelled = true; window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged); };
  }, []);

  // Sync cascading selectors with active context
  useEffect(() => {
    if (!s.activeContext || s.hasEditedContext || s.savingContext) return;
    const next = deriveSelectionFromActiveContext(s.activeContext);
    dispatch({ type: 'patch', payload: {
      selectedOrgId: next.orgId, selectedClubId: next.clubId, selectedTeamId: next.teamId,
      selectedSeasonId: next.seasonId, selectedCompetitionId: next.competitionId, selectedMatchId: next.matchId,
    } });
  }, [s.activeContext, s.organisations, s.hasEditedContext, s.savingContext]);

  // Load organisations on mount
  useEffect(() => {
    let cancelled = false;
    const loadOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const res = await api.list<Organisation>('/organisations/', { pageSize: 250 });
        if (!cancelled) setOrganisations(res.results || []);
      } catch (e) {
        logger.error('Failed to load federations', e);
        if (!cancelled) setActiveContextError(`Failed to load federations: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };
    void loadOrgs();
    return () => { cancelled = true; };
  }, []);

  // Stable set of org slugs the user has membership for (avoids 403 on /projects/)
  const userOrgSlugs = useMemo(
    () => new Set((user?.organisations || []).map(o => o.slug)),
    [user?.organisations],
  );

  // Load clubs when org selected
  useEffect(() => {
    if (!s.selectedOrgId) { setClubs([]); return; }
    let cancelled = false;
    const loadClubs = async () => {
      try {
        setLoadingClubs(true);
        const org = s.organisations.find(o => String(o.id) === s.selectedOrgId || String(o.slug) === s.selectedOrgId);
        const orgSlug = org?.slug || s.selectedOrgId;
        // Skip API call if user has no membership for this org (would 403)
        if (!userOrgSlugs.has(orgSlug)) {
          if (!cancelled) setClubs([]);
          return;
        }
        const collected = await api.listAll<Project>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
          params: { is_club: true },
          pageSize: 250,
          maxItems: 5000,
        });
        const rootProjects = collected.filter((p) => {
          const parentId = p?.parent_id;
          return parentId === null || parentId === undefined || String(parentId).trim() === '';
        });
        if (!cancelled) setClubs(rootProjects);
      } catch {
        if (!cancelled) setClubs([]);
      } finally {
        if (!cancelled) setLoadingClubs(false);
      }
    };
    void loadClubs();
    return () => { cancelled = true; };
  }, [s.selectedOrgId, s.organisations, userOrgSlugs]);

  // Load teams when club selected
  useEffect(() => {
    if (!s.selectedOrgId || !s.selectedClubId) { setTeams([]); return; }
    let cancelled = false;
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);
        const org = s.organisations.find(o => String(o.id) === s.selectedOrgId || String(o.slug) === s.selectedOrgId);
        const orgSlug = org?.slug || s.selectedOrgId;
        // Skip API call if user has no membership for this org (would 403)
        if (!userOrgSlugs.has(orgSlug)) {
          if (!cancelled) setTeams([]);
          return;
        }
        const collected = await api.listAll<Project>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
          params: { parent_project__isnull: false },
          pageSize: 250,
          maxItems: 5000,
        });
        const filteredTeams = collected.filter((t) => String(t?.parent_id || '') === String(s.selectedClubId));
        if (!cancelled) setTeams(filteredTeams);
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };
    void loadTeams();
    return () => { cancelled = true; };
  }, [s.organisations, s.selectedClubId, s.selectedOrgId, userOrgSlugs]);

  // Load seasons when team selected
  useEffect(() => {
    if (!s.selectedTeamId) { setSeasons([]); return; }
    let cancelled = false;
    const loadSeasons = async () => {
      try {
        setLoadingSeasons(true);
        const resolveOrganisationIdForQuery = () => {
          const raw = String(s.selectedOrgId || '').trim();
          if (!raw) return '';
          if (/^\d+$/.test(raw)) return raw;
          const found = s.organisations.find((o) => String(o?.slug || '').trim() === raw);
          return String(found?.id || '').trim();
        };
        const filterRootPeriods = (periods: Period[]) => {
          return periods.filter((p) => {
            const pRecord = p as unknown as Record<string, unknown>;
            const parent = pRecord?.parent_period_id ?? (pRecord?.parent_period as Record<string, unknown> | null)?.id ?? null;
            return !parent;
          });
        };
        const res = await api.list<Period>('/periods/', {
          pageSize: 500,
          params: { project_id: String(s.selectedTeamId), parent_id: 'null' },
        });
        let rootOnly = filterRootPeriods(res.results || []);
        if (rootOnly.length === 0) {
          const orgId = resolveOrganisationIdForQuery();
          if (orgId) {
            const orgRes = await api.list<Period>('/periods/', {
              pageSize: 500,
              params: { organisation_id: orgId, parent_id: 'null' },
            });
            rootOnly = filterRootPeriods(orgRes.results || []);
          }
        }
        if (!cancelled) setSeasons(rootOnly);
      } catch {
        if (!cancelled) setSeasons([]);
      } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    };
    void loadSeasons();
    return () => { cancelled = true; };
  }, [s.selectedTeamId]);

  // Load competitions when season selected
  useEffect(() => {
    if (!s.selectedSeasonId) { setCompetitions([]); return; }
    let cancelled = false;
    const loadComps = async () => {
      try {
        setLoadingCompetitions(true);
        const season = s.seasons.find(ss => String(ss.id) === s.selectedSeasonId);
        if (!season) return;
        const res = await api.list<Period>('/periods/', {
          pageSize: 500,
          params: { parent_id: String(season.id) },
        });
        if (!cancelled) setCompetitions(res.results || []);
      } catch {
        if (!cancelled) setCompetitions([]);
      } finally {
        if (!cancelled) setLoadingCompetitions(false);
      }
    };
    void loadComps();
    return () => { cancelled = true; };
  }, [s.selectedSeasonId, s.seasons]);

  // Load matches when competition selected
  useEffect(() => {
    const shouldLoadForSeasonOnly = Boolean(s.selectedSeasonId && s.competitions.length === 0);
    const periodId = s.selectedCompetitionId || (shouldLoadForSeasonOnly ? s.selectedSeasonId : '');
    if (!periodId) { setMatches([]); return; }
    let cancelled = false;
    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        const res = await api.list<Activity>('/activities/', {
          pageSize: 500,
          params: { period_id: String(periodId), activity_type: 'match' },
        });
        if (!cancelled) setMatches(res.results || []);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    };
    void loadMatches();
    return () => { cancelled = true; };
  }, [s.selectedCompetitionId, s.selectedSeasonId, s.competitions]);

  return {
    activeContext: s.activeContext,
    activeContextLoading: s.activeContextLoading,
    activeContextError: s.activeContextError,
    savingContext: s.savingContext,
    selectedOrgId: s.selectedOrgId, setSelectedOrgId,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    selectedTeamId: s.selectedTeamId, setSelectedTeamId,
    selectedSeasonId: s.selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId: s.selectedCompetitionId, setSelectedCompetitionId,
    selectedMatchId: s.selectedMatchId, setSelectedMatchId,
    hasEditedContext: s.hasEditedContext, setHasEditedContext,
    organisations: s.organisations, clubs: s.clubs, teams: s.teams,
    seasons: s.seasons, competitions: s.competitions, matches: s.matches,
    loadingOrgs: s.loadingOrgs, loadingClubs: s.loadingClubs, loadingTeams: s.loadingTeams,
    loadingSeasons: s.loadingSeasons, loadingCompetitions: s.loadingCompetitions, loadingMatches: s.loadingMatches,
    applyActiveContextSelection,
  };
}
