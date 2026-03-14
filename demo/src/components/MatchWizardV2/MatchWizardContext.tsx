/**
 * MatchWizardContext – Domain-specific state for the Match Wizard
 *
 * This context holds all match-related data that needs to be shared
 * across wizard steps. Works alongside the generic WizardContext.
 */
import React, { createContext, useContext, useCallback, useMemo, useReducer, type ReactNode } from 'react';
import { formReducer, makeSetter } from '../../utils/formReducer';
import type { Activity } from '../../hooks/useActivities';
import type { ContentTemplate } from '../../pages/identity/ContentGenerationModal/types';
import type { ContentType, ContentPhase, SquadMember } from './types';

// ─── Types ────────────────────────────────────────────────

export interface LineupSlots {
  goalkeeper: string[];
  player: string[];
}

export interface PendingContent {
  key: string;
  label: string;
  subtype: string;
  templateType: string;
}

export interface MatchWizardState {
  // Match
  selectedMatch: Activity | null;
  matchesLoading: boolean;
  matchesError: string | null;
  upcomingMatches: Activity[];

  // Content
  selectedContentPhase: ContentPhase;
  pendingContent: PendingContent | null;
  selectedTemplate: ContentTemplate | null;
  templatesError: string | null;

  // Lineup
  lineupSlots: LineupSlots;
  lineupFormation: string;
  squadGroups: Record<string, SquadMember[]>;
  guestPlayers: SquadMember[];
  squadLoading: boolean;
  squadError: string | null;

  // Generation
  progress: number;
  generationError: string | null;
  isGenerating: boolean;
}

export interface MatchWizardActions {
  // Match
  setSelectedMatch: (match: Activity | null) => void;
  setMatchesLoading: (loading: boolean) => void;
  setMatchesError: (error: string | null) => void;
  setUpcomingMatches: (matches: Activity[]) => void;

  // Content
  setSelectedContentPhase: (phase: ContentPhase) => void;
  setPendingContent: (content: PendingContent | null) => void;
  setSelectedTemplate: (template: ContentTemplate | null) => void;
  setTemplatesError: (error: string | null) => void;

  // Lineup
  setLineupSlots: (slots: LineupSlots) => void;
  setLineupFormation: (formation: string) => void;
  setSquadGroups: (groups: Record<string, SquadMember[]>) => void;
  addGuestPlayer: (name: string, jerseyNumber?: string) => void;
  removeGuestPlayer: (guestId: string) => void;
  setSquadLoading: (loading: boolean) => void;
  setSquadError: (error: string | null) => void;
  handleSelectPlayer: (positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => void;

  // Generation
  setProgress: (progress: number) => void;
  setGenerationError: (error: string | null) => void;
  setIsGenerating: (generating: boolean) => void;

  // Helpers
  reset: () => void;
}

export interface MatchWizardContextValue extends MatchWizardState, MatchWizardActions {
  // Computed
  filledPositions: number;
  totalPositions: number;
  allPlayers: SquadMember[];
  homeTeamName: string;
  awayTeamName: string;
  isLineupRequired: boolean;
  hasOptions: boolean;
}

// ─── Initial State ────────────────────────────────────────

const initialState: MatchWizardState = {
  selectedMatch: null,
  matchesLoading: false,
  matchesError: null,
  upcomingMatches: [],
  selectedContentPhase: 'pre',
  pendingContent: null,
  selectedTemplate: null,
  templatesError: null,
  lineupSlots: { goalkeeper: [], player: [] },
  lineupFormation: '4-3-3',
  squadGroups: { goalkeeper: [], player: [] },
  guestPlayers: [],
  squadLoading: false,
  squadError: null,
  progress: 0,
  generationError: null,
  isGenerating: false,
};

// ─── Context ──────────────────────────────────────────────

const MatchWizardContext = createContext<MatchWizardContextValue | null>(null);

export function useMatchWizard(): MatchWizardContextValue {
  const ctx = useContext(MatchWizardContext);
  if (!ctx) {
    throw new Error('useMatchWizard must be used within a MatchWizardProvider');
  }
  return ctx;
}

// ─── Constants ────────────────────────────────────────────

const POSITIONS_COUNT = 11;

const LINEUP_REQUIRED_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro',
]);

const HAS_OPTIONS_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'flyer', 'goal', 'match_summary',
]);

// ─── Provider ─────────────────────────────────────────────

export interface MatchWizardProviderProps {
  children: ReactNode;
}

export function MatchWizardProvider({ children }: MatchWizardProviderProps) {
  // ── State ───────────────────────────────────────────────
  const [s, dispatch] = useReducer(formReducer<MatchWizardState>, initialState);

  const setSelectedMatch        = useMemo(() => makeSetter(dispatch, 'selectedMatch'), [dispatch]);
  const setMatchesLoading       = useMemo(() => makeSetter(dispatch, 'matchesLoading'), [dispatch]);
  const setMatchesError         = useMemo(() => makeSetter(dispatch, 'matchesError'), [dispatch]);
  const setUpcomingMatches      = useMemo(() => makeSetter(dispatch, 'upcomingMatches'), [dispatch]);
  const setSelectedContentPhase = useMemo(() => makeSetter(dispatch, 'selectedContentPhase'), [dispatch]);
  const setPendingContent       = useMemo(() => makeSetter(dispatch, 'pendingContent'), [dispatch]);
  const setSelectedTemplate     = useMemo(() => makeSetter(dispatch, 'selectedTemplate'), [dispatch]);
  const setTemplatesError       = useMemo(() => makeSetter(dispatch, 'templatesError'), [dispatch]);
  const setLineupSlots          = useMemo(() => makeSetter(dispatch, 'lineupSlots'), [dispatch]);
  const setLineupFormation      = useMemo(() => makeSetter(dispatch, 'lineupFormation'), [dispatch]);
  const setSquadGroups          = useMemo(() => makeSetter(dispatch, 'squadGroups'), [dispatch]);
  const setGuestPlayers         = useMemo(() => makeSetter(dispatch, 'guestPlayers'), [dispatch]);
  const setSquadLoading         = useMemo(() => makeSetter(dispatch, 'squadLoading'), [dispatch]);
  const setSquadError           = useMemo(() => makeSetter(dispatch, 'squadError'), [dispatch]);
  const setProgress             = useMemo(() => makeSetter(dispatch, 'progress'), [dispatch]);
  const setGenerationError      = useMemo(() => makeSetter(dispatch, 'generationError'), [dispatch]);
  const setIsGenerating         = useMemo(() => makeSetter(dispatch, 'isGenerating'), [dispatch]);

  // ── Actions ─────────────────────────────────────────────

  const addGuestPlayer = useCallback((name: string, jerseyNumber?: string) => {
    const guest: SquadMember = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: { name },
      metadata: jerseyNumber ? { shirt_number: jerseyNumber } : undefined,
      isGuest: true,
    };
    setGuestPlayers(prev => [...prev, guest]);
  }, []);

  const removeGuestPlayer = useCallback((guestId: string) => {
    setGuestPlayers(prev => prev.filter(g => g.id !== guestId));
    setLineupSlots(prev => ({
      goalkeeper: prev.goalkeeper.map(id => id === guestId ? '' : id).filter(Boolean),
      player: prev.player.map(id => id === guestId ? '' : id),
    }));
  }, []);

  const handleSelectPlayer = useCallback((positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => {
    if (isGoalkeeper) {
      const newGk = [...s.lineupSlots.goalkeeper];
      newGk[positionIdx] = memberId || '';
      setLineupSlots({ ...s.lineupSlots, goalkeeper: newGk.filter(Boolean) as string[] });
    } else {
      const newPlayers = [...s.lineupSlots.player];
      while (newPlayers.length <= positionIdx) newPlayers.push('');
      newPlayers[positionIdx] = memberId || '';
      setLineupSlots({ ...s.lineupSlots, player: newPlayers });
    }
  }, [s.lineupSlots, setLineupSlots]);

  const reset = useCallback(() => {
    dispatch({ type: 'patch', payload: { ...initialState } });
  }, []);

  // ── Computed ────────────────────────────────────────────

  const filledPositions = s.lineupSlots.goalkeeper.filter(Boolean).length +
    s.lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS_COUNT;

  const allPlayers = useMemo(() => [
    ...(s.squadGroups.goalkeeper || []),
    ...(s.squadGroups.player || []),
    ...s.guestPlayers,
  ], [s.squadGroups, s.guestPlayers]);

  const homeTeamName = s.selectedMatch?.project?.name || 'Thuis';
  const awayTeamName = s.selectedMatch?.opponent_project?.name || 'Uit';

  const isLineupRequired = s.pendingContent
    ? LINEUP_REQUIRED_SUBTYPES.has(s.pendingContent.subtype)
    : false;

  const hasOptions = s.pendingContent
    ? HAS_OPTIONS_SUBTYPES.has(s.pendingContent.subtype)
    : false;

  // ── Context Value ───────────────────────────────────────

  const value = useMemo<MatchWizardContextValue>(() => ({
    // State
    selectedMatch: s.selectedMatch, matchesLoading: s.matchesLoading, matchesError: s.matchesError, upcomingMatches: s.upcomingMatches,
    selectedContentPhase: s.selectedContentPhase, pendingContent: s.pendingContent, selectedTemplate: s.selectedTemplate, templatesError: s.templatesError,
    lineupSlots: s.lineupSlots, lineupFormation: s.lineupFormation, squadGroups: s.squadGroups, guestPlayers: s.guestPlayers, squadLoading: s.squadLoading, squadError: s.squadError,
    progress: s.progress, generationError: s.generationError, isGenerating: s.isGenerating,
    // Actions
    setSelectedMatch, setMatchesLoading, setMatchesError, setUpcomingMatches,
    setSelectedContentPhase, setPendingContent, setSelectedTemplate, setTemplatesError,
    setLineupSlots, setLineupFormation, setSquadGroups, addGuestPlayer, removeGuestPlayer,
    setSquadLoading, setSquadError, handleSelectPlayer,
    setProgress, setGenerationError, setIsGenerating,
    reset,
    // Computed
    filledPositions, totalPositions, allPlayers, homeTeamName, awayTeamName,
    isLineupRequired, hasOptions,
  }), [
    s.selectedMatch, s.matchesLoading, s.matchesError, s.upcomingMatches,
    s.selectedContentPhase, s.pendingContent, s.selectedTemplate, s.templatesError,
    s.lineupSlots, s.lineupFormation, s.squadGroups, s.guestPlayers, s.squadLoading, s.squadError,
    s.progress, s.generationError, s.isGenerating,
    setSelectedMatch, setMatchesLoading, setMatchesError, setUpcomingMatches,
    setSelectedContentPhase, setPendingContent, setSelectedTemplate, setTemplatesError,
    setLineupSlots, setLineupFormation, setSquadGroups, addGuestPlayer, removeGuestPlayer,
    setSquadLoading, setSquadError, handleSelectPlayer,
    setProgress, setGenerationError, setIsGenerating,
    reset,
    filledPositions, totalPositions, allPlayers, homeTeamName, awayTeamName,
    isLineupRequired, hasOptions,
  ]);

  return (
    <MatchWizardContext.Provider value={value}>
      {children}
    </MatchWizardContext.Provider>
  );
}
