/**
 * PreferencesPage — Cascading entity selection sub-hook
 *
 * Manages active context + cascading org → club → team → season → competition → match selectors.
 */
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { logger } from '@/utils/logger';
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
  activeContext: any | null;
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
  const [activeContext, setActiveContext] = useState<any | null>(null);
  const [activeContextLoading, setActiveContextLoading] = useState(false);
  const [activeContextError, setActiveContextError] = useState<string | null>(null);
  const [savingContext, setSavingContext] = useState(false);
  const [hasEditedContext, setHasEditedContext] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [clubs, setClubs] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Project[]>([]);
  const [seasons, setSeasons] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [matches, setMatches] = useState<Activity[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  /* ---------- helpers -------------------------------------------- */
  const getOrganisationIdentifier = (orgKey: string): string => {
    const key = String(orgKey || '').trim();
    if (!key) return '';
    const org = organisations.find((o) => String(o?.id ?? '').trim() === key || String(o?.slug ?? '').trim() === key);
    return String(org?.slug || key).trim();
  };

  const deriveSelectionFromActiveContext = (ctx: any) => {
    const rawOrgId = String(ctx?.organisation?.id || '').trim();
    const rawOrgSlug = String(ctx?.organisation?.slug || '').trim();
    const resolvedOrgId = rawOrgId
      ? rawOrgId
      : (rawOrgSlug
          ? String(organisations.find((o) => String(o?.slug || '').trim() === rawOrgSlug)?.id || rawOrgSlug).trim()
          : '');
    return {
      orgId: resolvedOrgId,
      clubId: String(ctx?.club?.id || '').trim(),
      teamId: String(ctx?.team?.id || '').trim(),
      seasonId: String(ctx?.season?.id || '').trim(),
      competitionId: String(ctx?.competition?.id || '').trim(),
      matchId: String(ctx?.match?.id || '').trim(),
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

  const extractPaginated = (raw: any) => {
    const data = raw?.data ?? raw;
    const results = (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])) as any[];
    const next = String(data?.next || raw?.next || '').trim();
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
    if (!activeContext || hasEditedContext || savingContext) return;
    const next = deriveSelectionFromActiveContext(activeContext);
    setSelectedOrgId(next.orgId);
    setSelectedClubId(next.clubId);
    setSelectedTeamId(next.teamId);
    setSelectedSeasonId(next.seasonId);
    setSelectedCompetitionId(next.competitionId);
    setSelectedMatchId(next.matchId);
  }, [activeContext, organisations, hasEditedContext, savingContext]);

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

  // Load clubs when org selected
  useEffect(() => {
    if (!selectedOrgId) { setClubs([]); return; }
    let cancelled = false;
    const loadClubs = async () => {
      try {
        setLoadingClubs(true);
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;
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
  }, [selectedOrgId, organisations]);

  // Load teams when club selected
  useEffect(() => {
    if (!selectedOrgId || !selectedClubId) { setTeams([]); return; }
    let cancelled = false;
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;
        const collected = await api.listAll<Project>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
          params: { parent_project__isnull: false },
          pageSize: 250,
          maxItems: 5000,
        });
        const filteredTeams = collected.filter((t) => String(t?.parent_id || '') === String(selectedClubId));
        if (!cancelled) setTeams(filteredTeams);
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };
    void loadTeams();
    return () => { cancelled = true; };
  }, [organisations, selectedClubId, selectedOrgId]);

  // Load seasons when team selected
  useEffect(() => {
    if (!selectedTeamId) { setSeasons([]); return; }
    let cancelled = false;
    const loadSeasons = async () => {
      try {
        setLoadingSeasons(true);
        const resolveOrganisationIdForQuery = () => {
          const raw = String(selectedOrgId || '').trim();
          if (!raw) return '';
          if (/^\d+$/.test(raw)) return raw;
          const found = organisations.find((o) => String(o?.slug || '').trim() === raw);
          return String(found?.id || '').trim();
        };
        const filterRootPeriods = (periods: Period[]) => {
          return periods.filter((p) => {
            const parent = (p as any)?.parent_period_id ?? (p as any)?.parent_period?.id ?? null;
            return !parent;
          });
        };
        const res = await api.list<Period>('/periods/', {
          pageSize: 500,
          params: { project_id: String(selectedTeamId), parent_id: 'null' },
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
  }, [selectedTeamId]);

  // Load competitions when season selected
  useEffect(() => {
    if (!selectedSeasonId) { setCompetitions([]); return; }
    let cancelled = false;
    const loadComps = async () => {
      try {
        setLoadingCompetitions(true);
        const season = seasons.find(s => String(s.id) === selectedSeasonId);
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
  }, [selectedSeasonId, seasons]);

  // Load matches when competition selected
  useEffect(() => {
    const shouldLoadForSeasonOnly = Boolean(selectedSeasonId && competitions.length === 0);
    const periodId = selectedCompetitionId || (shouldLoadForSeasonOnly ? selectedSeasonId : '');
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
  }, [selectedCompetitionId, selectedSeasonId, competitions]);

  return {
    activeContext,
    activeContextLoading,
    activeContextError,
    savingContext,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId, setSelectedCompetitionId,
    selectedMatchId, setSelectedMatchId,
    hasEditedContext, setHasEditedContext,
    organisations, clubs, teams, seasons, competitions, matches,
    loadingOrgs, loadingClubs, loadingTeams, loadingSeasons, loadingCompetitions, loadingMatches,
    applyActiveContextSelection,
  };
}
