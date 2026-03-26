/**
 * useMatchSheet — Reusable match sheet state management.
 *
 * Extracted from ActiveMatchCard so both ActiveMatchCard and
 * UpcomingMatchesCard can share the same sheet logic.
 *
 * Manages: sheet open/close, lineup sub-sheet, content sheet,
 * count tracking, readiness calculation, CreateWizard dispatch.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/api';
import type { Match } from './ActiveMatchCard';
import type { ClosestMatchData } from '../../hooks/useClosestMatch';

export interface UseMatchSheetReturn {
  // Sheet state
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;

  // Lineup sub-sheet
  lineupSheetOpen: boolean;
  openLineupSheet: () => void;
  closeLineupSheet: () => void;

  // Content sub-sheet
  contentSheetOpen: boolean;
  openContentSheet: () => void;
  closeContentSheet: () => void;

  // Pending auto-lineup (consumed by MatchSheetShell)
  pendingAutoLineup: boolean;
  clearPendingAutoLineup: () => void;

  // Data
  contentCount: number;
  contentDoneSubtypes: string[];
  lineupCount: number;
  lineupFormation: string | undefined;
  badgeBump: 'lineup' | 'content' | null;

  // Match state
  matchState: 'live' | 'upcoming' | 'played' | null;
  teamName: string;
  opponent: string;
  isHome: boolean;
  score: string | undefined;

  // Collapsible phases
  expandedPhases: Set<string>;
  togglePhase: (key: string) => void;

  // Actions
  openCreateWizard: (subtype?: string) => void;
  handleLineupSaved: (count: number, formation: string) => void;
  handleContentGenerated: (newCount: number) => void;
}

export function useMatchSheet(
  match: Match | null,
  matchData?: ClosestMatchData | null,
): UseMatchSheetReturn {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lineupSheetOpen, setLineupSheetOpen] = useState(false);
  const [contentSheetOpen, setContentSheetOpen] = useState(false);
  const [pendingAutoLineup, setPendingAutoLineup] = useState(false);

  const [contentCount, setContentCount] = useState(0);
  const [contentDoneSubtypes, setContentDoneSubtypes] = useState<string[]>([]);
  const [lineupCount, setLineupCount] = useState(0);
  const [lineupFormationState, setLineupFormationState] = useState<string | undefined>(undefined);
  const [badgeBump, setBadgeBump] = useState<'lineup' | 'content' | null>(null);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // Listen for external sheet open requests (e.g. SmartActionsCard lineup action)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.matchId === match?.id) {
        setSheetOpen(true);
        if (detail.autoOpenLineup) {
          // Set flag — consumed by MatchSheetShell to goTo('matchLineup')
          setPendingAutoLineup(true);
        }
      }
    };
    window.addEventListener('teamreel:open-match-sheet', handler);
    return () => window.removeEventListener('teamreel:open-match-sheet', handler);
  }, [match?.id]);

  // Sync from query data
  useEffect(() => {
    if (matchData) {
      setContentCount(matchData.contentCount);
      setContentDoneSubtypes(matchData.contentDoneSubtypes);
      setLineupCount(matchData.lineupCount);
      if (matchData.lineupFormation) setLineupFormationState(matchData.lineupFormation);
    }
  }, [matchData]);

  // Also try to extract lineup from match metadata if no matchData provided
  useEffect(() => {
    if (!matchData && match) {
      const lineupData = (match.metadata?.lineup as any);
      const gkCount = Array.isArray(lineupData?.goalkeeper) ? lineupData.goalkeeper.length : 0;
      const plCount = Array.isArray(lineupData?.player) ? lineupData.player.length : 0;
      const positionsCount = Array.isArray(lineupData?.positions) ? lineupData.positions.length : 0;
      if (gkCount + plCount > 0) {
        setLineupCount(gkCount + plCount);
        setLineupFormationState(lineupData?.formation || (match.metadata?.formation as string | undefined));
      } else if (positionsCount > 0) {
        setLineupCount(positionsCount);
        setLineupFormationState(lineupData?.formation);
      }
    }
  }, [match?.id, matchData]);

  // Refetch media items to update contentDoneSubtypes and count
  const refreshMediaSubtypes = useCallback(async () => {
    if (!match?.id) return;
    try {
      const mediaData = await api.list<{ id: string; extraction_metadata?: { asset_type?: string } }>(
        '/media/items/',
        { params: { activity: match.id }, pageSize: 50 },
      );
      const subtypeSet = new Set<string>();
      for (const item of mediaData.results) {
        const raw = item.extraction_metadata?.asset_type;
        if (raw) {
          let normalized = String(raw).replace(/_[a-f0-9]{8}$/i, '');
          if (normalized === 'goal_celebration') normalized = 'goal';
          if (normalized === 'match_flyer') normalized = 'flyer';
          subtypeSet.add(normalized);
        }
      }
      setContentCount(mediaData.results.length);
      setContentDoneSubtypes([...subtypeSet]);
    } catch {
      // ignore
    }
  }, [match?.id]);

  // Fetch content subtypes from media items when matchData not provided (e.g. UpcomingMatchesCard)
  useEffect(() => {
    if (matchData || !match?.id) return;
    void refreshMediaSubtypes();
  }, [match?.id, matchData, refreshMediaSubtypes]);

  const togglePhase = useCallback((key: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openCreateWizard = useCallback((subtype?: string) => {
    if (!match?.id) return;
    window.dispatchEvent(
      new CustomEvent('teamreel:open-quick-create', {
        detail: { matchId: match.id, flow: 'content', subtype },
      }),
    );
  }, [match?.id]);

  const handleLineupSaved = useCallback((count: number, formation: string) => {
    setLineupCount(count);
    setLineupFormationState(formation);
    setBadgeBump('lineup');
    setTimeout(() => setBadgeBump(null), 400);
  }, []);

  const handleContentGenerated = useCallback((newCount: number) => {
    setContentCount(newCount);
    setBadgeBump('content');
    setTimeout(() => setBadgeBump(null), 400);
    // Re-fetch to get updated contentDoneSubtypes
    void refreshMediaSubtypes();
  }, [refreshMediaSubtypes]);

  // Derived state
  const matchState = useMemo(() => {
    if (!match) return null;
    const now = Date.now();
    const start = new Date(match.start_time).getTime();
    const end = match.end_time ? new Date(match.end_time).getTime() : start + 2 * 60 * 60 * 1000;
    if (now >= start && now <= end) return 'live' as const;
    if (now < start) return 'upcoming' as const;
    return 'played' as const;
  }, [match]);

  const teamName = match?.project?.club_name || match?.project?.name || 'Team';
  const opponent = match?.opponent_project?.club_name || match?.opponent_project?.name || match?.title?.split(' vs ')?.[1] || 'Tegenstander';
  const isHome = match?.metadata?.is_home !== false;
  const score = match?.metadata?.score || match?.metadata?.final_score;

  const lineupFormation = lineupFormationState || (match?.metadata?.lineup as any)?.formation as string | undefined;

  return {
    sheetOpen,
    openSheet: useCallback(() => setSheetOpen(true), []),
    closeSheet: useCallback(() => setSheetOpen(false), []),

    lineupSheetOpen,
    openLineupSheet: useCallback(() => { setSheetOpen(false); setLineupSheetOpen(true); }, []),
    closeLineupSheet: useCallback(() => setLineupSheetOpen(false), []),

    contentSheetOpen,
    openContentSheet: useCallback(() => { setSheetOpen(false); setContentSheetOpen(true); }, []),
    closeContentSheet: useCallback(() => setContentSheetOpen(false), []),

    pendingAutoLineup,
    clearPendingAutoLineup: useCallback(() => setPendingAutoLineup(false), []),

    contentCount,
    contentDoneSubtypes,
    lineupCount,
    lineupFormation,
    badgeBump,

    matchState,
    teamName,
    opponent,
    isHome,
    score,

    expandedPhases,
    togglePhase,

    openCreateWizard,
    handleLineupSaved,
    handleContentGenerated,
  };
}
