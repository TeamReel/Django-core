/**
 * Types and pure helpers for useMatchDetailData hook.
 * Extracted from useMatchDetailData.ts during Phase 22 refactor.
 */

import type React from 'react';
import type { useNavigate, useLocation } from 'react-router-dom';
import type { MatchMediaItem } from '../../components/MediaAssetCard';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import type { ContentTemplate } from '../identity/ContentGenerationModal';
import type { useBrandProfile } from '../../hooks/useBrandProfile';
import type { Period, SeasonOrganisation, SeasonProject as Project } from '../../types/season';
import type { User } from '@django-core/auth-ui';
import type { SquadMember } from './match-detail/MatchLineupField';

// Re-export helpers for backward compatibility
export {
  looksLikeIdentifier,
  getEnvelopeData,
  getEnvelopeListResults,
  normalizeFlagKey,
  slugify,
  buildTemplateFlagKeys,
  isTemplateEnabled,
} from './matchDetailHelpers';

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export type Participation = {
  id: string;
  member?: { id: string; user_name?: string };
  role?: string;
  status?: string;
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    team_name?: string;
    team_id?: string;
  };
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  minute?: number;
  team_project?: { id: string; name: string };
  member?: { id: string; user_name?: string };
  related_member?: { id: string; user_name?: string };
  data?: Record<string, unknown>;
};

export type OrgMember = {
  id: string;
  role?: string;
  organisation_membership_id?: string;
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

export type SeasonSquadParticipation = {
  id: string;
  member?: { id: string; user_name?: string };
  period?: { id: string; name?: string };
  role?: string;
  status?: string;
  data?: Record<string, unknown>;
};

export type ProjectMember = {
  id: string;
  role?: string;
  organisation_membership_id?: string;
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  user_id?: string | number;
};

export type MatchDetail = {
  id: string;
  slug?: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  activity_type?: string;
  project: { id: string; name: string; slug?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  period?: { id: string; name: string; parent_period?: { id: string; name: string } | null };
  metadata?: Record<string, unknown> & {
    status?: string;
    venue?: string;
    is_home?: boolean;
    home_score?: number;
    away_score?: number;
    formation?: string;
    lineup?: { formation?: string; goalkeeper?: string[]; player?: string[]; bench?: Record<string, string> };
    teamreel?: { match_context?: { is_home?: boolean; venue?: string; opponent_club_id?: string } };
  };
  participations?: Participation[];
  events?: ActivityEvent[];
};

export type ContentItemStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'approved' | 'rejected';
export type ContentItem = {
  id: string;
  template: { id: number; name: string; template_subtype?: string | null };
  status: ContentItemStatus;
  created_at: string;
  output_file?: { id: string; url: string; file_name?: string } | null;
  error_message?: string | null;
};

export type SavedAssetPreview = {
  title: string;
  url: string;
  isVideo: boolean;
  subtitle?: string;
} | null;

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface MatchDetailDataReturn {
  /* navigation */
  navigate: ReturnType<typeof useNavigate>;
  location: ReturnType<typeof useLocation>;

  /* auth */
  user: User | null;

  /* season context */
  org: SeasonOrganisation | null;
  project: Project | null;
  club: Project | null;
  season: Period | null;
  resolvedSeasonId: string;
  providerLoading: boolean;
  isPlayer: boolean;
  isSupporter: boolean;
  apiBaseUrl: string;
  orgSlugOrId: string;
  clubSlugOrId: string;
  seasonsBasePath: string;
  brandLogoUrl: string | null;

  /* match route params */
  effectiveCompetitionId: string;
  effectiveMatchId: string;

  /* opponent */
  opponentClub: Project | null;
  opponentClubBrand: ReturnType<typeof useBrandProfile>;

  /* match data */
  competition: Period | null;
  match: MatchDetail | null;
  setMatch: React.Dispatch<React.SetStateAction<MatchDetail | null>>;
  resolvedCompetitionUuid: string;
  loading: boolean;
  error: string | null;

  /* active context */
  activatingContext: boolean;
  setActivatingContext: (v: boolean) => void;
  activeContext: Record<string, unknown> | null;
  setActiveContextState: (v: Record<string, unknown> | null) => void;

  /* modals */
  isCreateTxnModalOpen: boolean;
  setIsCreateTxnModalOpen: (v: boolean) => void;
  isMatchDetailModalOpen: boolean;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  isMatchEditModalOpen: boolean;
  setIsMatchEditModalOpen: (v: boolean) => void;
  isContentModalOpen: boolean;
  selectedTemplate: ContentTemplate | null;
  selectedContentTypeLabel: string;
  openContentModal: (template?: ContentTemplate, label?: string) => void;
  closeContentModal: () => void;

  /* content items */
  contentItems: ContentItem[];
  contentItemsLoading: boolean;
  selectedContentItem: ContentItem | null;
  isContentPreviewOpen: boolean;
  openContentPreview: (item: ContentItem) => void;
  closeContentPreview: () => void;
  fetchContentItems: () => Promise<void>;
  getContentItemForSubtype: (subtype: string) => ContentItem | null;

  /* media */
  matchMedia: MatchMediaItem[];
  matchMediaLoading: boolean;
  mediaBySubtype: Record<string, { latest: MatchMediaItem; history: MatchMediaItem[] }>;
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getMediaHistoryForSubtype: (subtype: string) => MatchMediaItem[];
  refreshMatchMedia: () => Promise<void>;
  handleDeleteMediaItem: (item: MatchMediaItem) => Promise<void>;
  handleRestoreMediaItem: (item: MatchMediaItem) => Promise<void>;

  /* saved asset preview */
  savedAssetPreview: SavedAssetPreview;
  setSavedAssetPreview: (v: SavedAssetPreview) => void;

  /* templates */
  availableTemplates: Record<string, ContentTemplate[]>;
  templatesLoading: boolean;

  /* toasts */
  toasts: { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[];
  dismissToast: (id: string) => void;
  handleContentGenerated: (message?: string) => void;

  /* transactions */
  matchWalletOptions: WalletOption[];

  /* roster */
  eligibleMembers: OrgMember[];
  orgMembersAll: OrgMember[];
  teamProjectMembers: ProjectMember[];
  clubProjectMembers: ProjectMember[];
  rosterLoading: boolean;
  rosterError: string | null;
  addHomeMemberId: string;
  setAddHomeMemberId: (v: string) => void;
  addAwayMemberId: string;
  setAddAwayMemberId: (v: string) => void;

  /* lineup bulk */
  lineupBulkSubmitting: boolean;
  setLineupBulkSubmitting: (v: boolean) => void;
  lineupEligibleSearchHome: string;
  setLineupEligibleSearchHome: (v: string) => void;
  lineupEligibleSearchAway: string;
  setLineupEligibleSearchAway: (v: string) => void;
  selectedEligibleLineupMemberIdsHome: Set<string>;
  setSelectedEligibleLineupMemberIdsHome: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedEligibleLineupMemberIdsAway: Set<string>;
  setSelectedEligibleLineupMemberIdsAway: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedLineupParticipationIdsHome: Set<string>;
  setSelectedLineupParticipationIdsHome: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedLineupParticipationIdsAway: Set<string>;
  setSelectedLineupParticipationIdsAway: React.Dispatch<React.SetStateAction<Set<string>>>;

  /* formation lineup */
  lineupFormation: string;
  setLineupFormation: (v: string) => void;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  lineupSquad: Record<string, SquadMember[]>;
  lineupSquadLoading: boolean;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  saveLineup: () => Promise<void>;

  /* paths */
  seasonBasePath: string;
  competitionBasePath: string;
  matchBasePath: string;

  /* tabs */
  activeTab: string;
  navigateToTab: (tabId: string) => void;

  /* display derived */
  date: Date | null;
  status: string;
  isHome: boolean;
  ownTeamName: string;
  opponentName: string;
  homeTeamName: string;
  awayTeamName: string;
  ownLogoUrl: string | null;
  opponentLogoUrl: string | null;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  scoreDisplay: string;
  homeParticipations: Participation[];
  awayParticipations: Participation[];
  matchEvents: ActivityEvent[];

  /* CRUD */
  saveMatchEdits: (matchToEdit: MatchDetail | Record<string, unknown>, patch: Record<string, unknown>) => Promise<void>;
  handleDeleteMatch: () => Promise<void>;
  createParticipation: (memberId: string, side: 'home' | 'away') => Promise<void>;
  updateParticipation: (p: Participation, patch: Record<string, unknown>) => Promise<void>;
  deleteParticipation: (p: Participation) => Promise<void>;
  bulkCreateParticipations: (memberIds: string[], side: 'home' | 'away') => Promise<void>;
  bulkDeleteParticipations: (participationIds: string[]) => Promise<void>;
  refreshMatch: () => Promise<void>;

  /* slug redirect */
  pendingClubSlugResolve: boolean;
  clubSlugRedirectTarget: string | null;
}
