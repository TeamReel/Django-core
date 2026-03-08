/**
 * MatchWizardContext – Domain-specific state for the Match Wizard
 *
 * This context holds all match-related data that needs to be shared
 * across wizard steps. Works alongside the generic WizardContext.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
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
  const [selectedMatch, setSelectedMatch] = useState<Activity | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Activity[]>([]);

  const [selectedContentPhase, setSelectedContentPhase] = useState<ContentPhase>('pre');
  const [pendingContent, setPendingContent] = useState<PendingContent | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [lineupSlots, setLineupSlots] = useState<LineupSlots>({ goalkeeper: [], player: [] });
  const [lineupFormation, setLineupFormation] = useState('4-3-3');
  const [squadGroups, setSquadGroups] = useState<Record<string, SquadMember[]>>({ goalkeeper: [], player: [] });
  const [guestPlayers, setGuestPlayers] = useState<SquadMember[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      const newGk = [...lineupSlots.goalkeeper];
      newGk[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, goalkeeper: newGk.filter(Boolean) as string[] });
    } else {
      const newPlayers = [...lineupSlots.player];
      while (newPlayers.length <= positionIdx) newPlayers.push('');
      newPlayers[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, player: newPlayers });
    }
  }, [lineupSlots]);

  const reset = useCallback(() => {
    setSelectedMatch(null);
    setMatchesLoading(false);
    setMatchesError(null);
    setSelectedContentPhase('pre');
    setPendingContent(null);
    setSelectedTemplate(null);
    setTemplatesError(null);
    setLineupSlots({ goalkeeper: [], player: [] });
    setLineupFormation('4-3-3');
    setSquadGroups({ goalkeeper: [], player: [] });
    setGuestPlayers([]);
    setSquadLoading(false);
    setSquadError(null);
    setProgress(0);
    setGenerationError(null);
    setIsGenerating(false);
  }, []);

  // ── Computed ────────────────────────────────────────────

  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length +
    lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS_COUNT;

  const allPlayers = useMemo(() => [
    ...(squadGroups.goalkeeper || []),
    ...(squadGroups.player || []),
    ...guestPlayers,
  ], [squadGroups, guestPlayers]);

  const homeTeamName = selectedMatch?.project?.name || 'Thuis';
  const awayTeamName = (selectedMatch as any)?.opponent_project?.name || 'Uit';

  const isLineupRequired = pendingContent
    ? LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)
    : false;

  const hasOptions = pendingContent
    ? HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)
    : false;

  // ── Context Value ───────────────────────────────────────

  const value = useMemo<MatchWizardContextValue>(() => ({
    // State
    selectedMatch, matchesLoading, matchesError, upcomingMatches,
    selectedContentPhase, pendingContent, selectedTemplate, templatesError,
    lineupSlots, lineupFormation, squadGroups, guestPlayers, squadLoading, squadError,
    progress, generationError, isGenerating,
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
    selectedMatch, matchesLoading, matchesError, upcomingMatches,
    selectedContentPhase, pendingContent, selectedTemplate, templatesError,
    lineupSlots, lineupFormation, squadGroups, guestPlayers, squadLoading, squadError,
    progress, generationError, isGenerating,
    addGuestPlayer, removeGuestPlayer, handleSelectPlayer, reset,
    filledPositions, totalPositions, allPlayers, homeTeamName, awayTeamName,
    isLineupRequired, hasOptions,
  ]);

  return (
    <MatchWizardContext.Provider value={value}>
      {children}
    </MatchWizardContext.Provider>
  );
}
