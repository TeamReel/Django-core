/**
 * matchWizardTypes — Shared types and constants for MatchWizard.
 */
import type React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Activity } from '../hooks/useActivities';
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from '../pages/identity/ContentGenerationModal/types';
import type { useContentOptions } from '../pages/identity/ContentGenerationModal/useContentOptions';
import type { useSeasonSquadData } from '../pages/identity/ContentGenerationModal/useSeasonSquadData';
import type { useVideoJobPolling } from '../pages/identity/ContentGenerationModal/useVideoJobPolling';
import { Image, Video, FileText, Play, Zap, Users, Clock } from 'lucide-react';

export type WizardStep = 'match' | 'content' | 'lineup' | 'options' | 'review' | 'generating' | 'video_queued' | 'success' | 'error';
export type ContentPhase = 'pre' | 'during' | 'post';
export type OutputType = 'video' | 'image' | 'text';

export interface MatchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

export interface ContentType {
  key: string;
  subtype: string;
  label: string;
  icon: typeof Image;
  description: string;
  templateType: string;
  outputType: OutputType;
  thumbnail?: string; // optional preview image URL
}

export interface MatchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

export interface SquadMember {
  id: string;
  user?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  member?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  user_name?: string;
  metadata?: { shirt_number?: string | number; position?: string; functional_roles?: string[]; team_role?: string };
  data?: { jersey_number?: string | number; functional_role?: string };
  functional_roles?: string[];
  /** True for manually added guest players (not in the squad) */
  isGuest?: boolean;
}

/** Content types that require a lineup to be set first. */
export const LINEUP_REQUIRED_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro',
]);

/** Content types that have a dedicated options step (background, style, score, etc.) */
export const HAS_OPTIONS_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'flyer', 'goal', 'match_summary',
]);

/** Subset of options types where lineup-style options are shown (formation, closeup, animation). */
export const LINEUP_OPTIONS_SUBTYPES = new Set(['lineup', 'lineup_flyer']);

/** Keys map to real template subtype values from backend. */
export const CONTENT_TYPES: Record<ContentPhase, ContentType[]> = {
  pre: [
    { key: 'flyer', subtype: 'flyer', label: 'Match Flyer', icon: Image, description: 'Aankondiging voor socials', templateType: 'pre_match', outputType: 'image' },
    { key: 'lineup_flyer', subtype: 'lineup_flyer', label: 'Lineup Flyer', icon: Users, description: 'Opstelling flyer', templateType: 'pre_match', outputType: 'image' },
    { key: 'lineup', subtype: 'lineup', label: 'Lineup Video', icon: Video, description: 'Visuele opstelling video', templateType: 'pre_match', outputType: 'video' },
    { key: 'poster', subtype: 'poster', label: 'Elftalfoto', icon: Image, description: 'Teamfoto genereren', templateType: 'pre_match', outputType: 'image' },
    { key: 'match_intro', subtype: 'match_intro', label: 'Match Intro', icon: Play, description: 'Match intro video', templateType: 'pre_match', outputType: 'video' },
    { key: 'walkon', subtype: 'walkon', label: 'Walk-on Video', icon: Video, description: 'Spelers intro video', templateType: 'pre_match', outputType: 'video' },
    { key: 'anthem', subtype: 'anthem', label: 'Anthem Video', icon: Play, description: 'Volkslied video', templateType: 'pre_match', outputType: 'video' },
  ],
  during: [
    { key: 'goal', subtype: 'goal', label: 'Goal Celebration', icon: Zap, description: 'Doelpunt vieren', templateType: 'during_match', outputType: 'video' },
    { key: 'score_update', subtype: 'score_update', label: 'Score Update', icon: FileText, description: 'Tussenstand delen', templateType: 'during_match', outputType: 'image' },
  ],
  post: [
    { key: 'end_score', subtype: 'end_score', label: 'Eindstand', icon: FileText, description: 'Uitslag delen', templateType: 'post_match', outputType: 'image' },
    { key: 'highlights', subtype: 'highlights', label: 'Highlights', icon: Video, description: 'Samenvattingsvideo', templateType: 'post_match', outputType: 'video' },
    { key: 'match_summary', subtype: 'match_summary', label: 'Samenvatting', icon: FileText, description: 'Wedstrijd samenvatting', templateType: 'post_match', outputType: 'text' },
  ],
};

export const POSITIONS = [
  { slot: 1, label: 'GK', fullLabel: 'Keeper' },
  { slot: 2, label: 'LB', fullLabel: 'Links Achter' },
  { slot: 3, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 4, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 5, label: 'RB', fullLabel: 'Rechts Achter' },
  { slot: 6, label: 'CDM', fullLabel: 'Controleur' },
  { slot: 7, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 8, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 9, label: 'LW', fullLabel: 'Links Aanvaller' },
  { slot: 10, label: 'ST', fullLabel: 'Spits' },
  { slot: 11, label: 'RW', fullLabel: 'Rechts Aanvaller' },
];

/** Reusable card-style button for wizard items. */
export const CARD_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-4) var(--space-4)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--app-border)',
  backgroundColor: 'var(--app-surface)',
  cursor: 'pointer',
  textAlign: 'left' as const,
  width: '100%',
  transition: 'transform 0.1s ease',
};

/** Get display name from a SquadMember. */
export function getSquadMemberName(p: SquadMember): string {
  const user = p.user || p.member;
  if (!user && p.user_name) return p.user_name;
  if (!user) return 'Onbekend';
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (full) return full;
  if (user.email) return user.email;
  return 'Onbekend';
}

// ============================================================================
// Return type for useMatchWizardData hook
// ============================================================================

export interface UseMatchWizardDataReturn {
  navigate: NavigateFunction;
  // Step
  currentStep: WizardStep;
  setCurrentStep: React.Dispatch<React.SetStateAction<WizardStep>>;
  selectedMatch: Activity | null;
  setSelectedMatch: React.Dispatch<React.SetStateAction<Activity | null>>;
  // Lineup
  lineupSlots: { goalkeeper: string[]; player: string[] };
  lineupFormation: string;
  setLineupFormation: React.Dispatch<React.SetStateAction<string>>;
  squadGroups: Record<string, SquadMember[]>;
  squadLoading: boolean;
  editingPosition: number | null;
  setEditingPosition: React.Dispatch<React.SetStateAction<number | null>>;
  lineupSaving: boolean;
  filledPositions: number;
  totalPositions: number;
  allPlayers: SquadMember[];
  // Content
  selectedContentPhase: ContentPhase;
  setSelectedContentPhase: React.Dispatch<React.SetStateAction<ContentPhase>>;
  pendingContent: { key: string; label: string; subtype: string; templateType: string } | null;
  selectedTemplate: ContentTemplate | null;
  selectedContentTypeLabel: string;
  selectedType: { type: string; subtype: string; label: string } | null;
  isLineupFlow: boolean;
  // Options (from useContentOptions sub-hook)
  options: ReturnType<typeof useContentOptions>;
  // Generation state
  progress: number;
  generationError: string | null;
  generatedOutput: GeneratedOutput | null;
  generatedVariants: GeneratedVariant[];
  selectedVariantIndex: number;
  setSelectedVariantIndex: React.Dispatch<React.SetStateAction<number>>;
  savingAsset: boolean;
  saveSuccess: boolean;
  savedVariantIndices: Set<number>;
  // Season squad (for MembersStep and generation APIs)
  seasonSquad: ReturnType<typeof useSeasonSquadData>;
  // Video job polling
  videoPoll: ReturnType<typeof useVideoJobPolling>;
  // Team names
  homeTeamName: string;
  awayTeamName: string;
  // Match data for API
  matchDataForApi: {
    id: string;
    title: string;
    project: Activity['project'];
    opponent_project: Activity['opponent_project'] | undefined;
    participations: Activity['participations'];
    start_time: string;
    location: string;
    metadata: Record<string, unknown>;
  } | null;
  organisationId: string | null;
  // Errors
  matchesError: string | null;
  templatesError: string | null;
  squadError: string | null;
  saveError: string | null;
  // Matches
  matchesLoading: boolean;
  upcomingMatches: Activity[];
  // Handlers
  handleSelectPlayer: (positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => void;
  handleContentSelect: (contentKey: string, contentLabel: string, subtype: string, templateType: string) => void;
  handleLineupConfirm: () => void;
  handleOptionsConfirm: () => void;
  handleReviewConfirm: () => void;
  handleGenerate: () => Promise<void>;
  handleSaveAsAsset: () => Promise<void>;
  handleSaveAllAsAssets: () => Promise<void>;
  handleSaveVariantByIndex: (variantIdx: number, opts?: { skipAutoClose?: boolean }) => Promise<void>;
  handleBack: () => void;
  handleClose: () => void;
  // Guest players
  guestPlayers: SquadMember[];
  addGuestPlayer: (name: string, jerseyNumber?: string) => void;
  removeGuestPlayer: (guestId: string) => void;
  // Helpers
  getStepTitle: () => string;
  getMemberName: (memberId: string) => string;
  getMemberJersey: (memberId: string) => string | null;
  getMemberById: (memberId: string) => SquadMember | undefined;
  // Retry
  retrySquad: () => Promise<void>;
  retryTemplates: () => Promise<void>;
}
