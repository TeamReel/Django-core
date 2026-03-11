/**
 * Derived/computed values for useCompetitionDetailData hook
 */
import { useMemo, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { periodPathKey } from '../../../utils/periodPath';
import { getActiveContext } from '../../../utils/activeContext';
import type { Period, SeasonProject as Project } from '../../../types/season';
import type { Activity } from '../../../types/api/activity';
import type { MatchMetadata } from './types';

interface UseDerivedParams {
  location: { search: string };
  providerSeasonPathKey: string;
  effectiveSeasonId: string;
  resolvedSeasonId: string;
  competition: Period | null;
  effectiveCompetitionId: string;
  resolvedCompetitionId: string;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  matches: Activity[];
  hierarchySearch: string;
  club: Project | null;
  project: Project | null;
  opponentClubNames: Record<string, string>;
  competitionBasePath: string;
  navigate: (path: string) => void;
  setActiveContextState: (ctx: Record<string, unknown> | null) => void;
}

export function useCompetitionDerived(params: UseDerivedParams) {
  const {
    location, providerSeasonPathKey, effectiveSeasonId, resolvedSeasonId,
    competition, effectiveCompetitionId, resolvedCompetitionId,
    isTeamRoute, seasonsBasePath, matches, hierarchySearch,
    club, project, opponentClubNames, competitionBasePath,
    navigate, setActiveContextState,
  } = params;

  // ── Active context ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const c = await getActiveContext();
        if (!cancelled) setActiveContextState(c);
      } catch (e) {
        logger.error('Failed to load active context', e);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [setActiveContextState]);

  // ── Computed ───────────────────────────────────────────────────────
  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'matches', 'content']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const seasonKeyOrId = providerSeasonPathKey || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  const competitionKeyOrId = periodPathKey(competition) || String(effectiveCompetitionId || resolvedCompetitionId || '').trim();

  const computedCompetitionBasePath = useMemo(() => {
    if (!seasonKeyOrId || !competitionKeyOrId) return '';
    return isTeamRoute
      ? `${seasonsBasePath}/${seasonKeyOrId}/${competitionKeyOrId}`
      : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${competitionKeyOrId}`;
  }, [competitionKeyOrId, isTeamRoute, seasonKeyOrId, seasonsBasePath]);

  const navigateToTab = useCallback(
    (tabId: string) => {
      if (!computedCompetitionBasePath) return;
      navigate(tabId === 'overview' ? computedCompetitionBasePath : `${computedCompetitionBasePath}?tab=${encodeURIComponent(tabId)}`);
    },
    [computedCompetitionBasePath, navigate],
  );

  const competitionMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number(competition?.matches_count ?? competition?.children_matches_count);
    return Number.isFinite(annotated) && annotated >= 0 ? annotated : 0;
  }, [competition, matches.length]);

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

  return {
    activeTab,
    seasonKeyOrId,
    competitionKeyOrId,
    competitionBasePath: computedCompetitionBasePath,
    navigateToTab,
    competitionMatchesCount,
    filteredMatches,
    matchDisplayTitle,
    matchDetailPath,
  };
}
