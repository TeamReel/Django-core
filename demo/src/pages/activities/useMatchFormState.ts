import { useEffect, useReducer, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import type { Period, SeasonProject as Project } from '../../types/season';
import { useSeasonContext } from '../../providers/SeasonProvider';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import { getActiveContext } from '../../utils/activeContext';
import { logger } from '@/utils/logger';
import type { MatchDetail, ContentItem, OrgMember, ProjectMember } from './matchDetailTypes';
import type { ContentTemplate } from '../identity/ContentGenerationModal';
import type { MatchMediaItem } from '../../components/MediaAssetCard';
import type { SquadMember } from './match-detail/MatchLineupField';
import { formReducer, makeSetter } from '../../utils/formReducer';

// ─── State interface ─────────────────────────────────────────────────────────

interface MatchFormState {
  opponentClub: Project | null;
  competition: Period | null;
  match: MatchDetail | null;
  resolvedCompetitionUuid: string;
  loading: boolean;
  error: string | null;
  activatingContext: boolean;
  activeContext: unknown | null;
  isCreateTxnModalOpen: boolean;
  isMatchDetailModalOpen: boolean;
  isMatchEditModalOpen: boolean;
  isContentModalOpen: boolean;
  selectedTemplate: ContentTemplate | null;
  selectedContentTypeLabel: string;
  availableTemplates: Record<string, ContentTemplate[]>;
  templatesLoading: boolean;
  templateFlagMap: Record<string, boolean>;
  templateFlagsLoading: boolean;
  contentItems: ContentItem[];
  contentItemsLoading: boolean;
  selectedContentItem: ContentItem | null;
  isContentPreviewOpen: boolean;
  matchMedia: MatchMediaItem[];
  matchMediaLoading: boolean;
  savedAssetPreview: { title: string; url: string; isVideo: boolean; subtitle?: string } | null;
  toasts: { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[];
  eligibleMembers: OrgMember[];
  orgMembersAll: OrgMember[];
  teamProjectMembers: ProjectMember[];
  clubProjectMembers: ProjectMember[];
  rosterLoading: boolean;
  rosterError: string | null;
  addHomeMemberId: string;
  addAwayMemberId: string;
  lineupBulkSubmitting: boolean;
  lineupEligibleSearchHome: string;
  lineupEligibleSearchAway: string;
  selectedEligibleLineupMemberIdsHome: Set<string>;
  selectedEligibleLineupMemberIdsAway: Set<string>;
  selectedLineupParticipationIdsHome: Set<string>;
  selectedLineupParticipationIdsAway: Set<string>;
  lineupFormation: string;
  lineupSlots: Record<string, string[]>;
  lineupSquad: Record<string, SquadMember[]>;
  lineupSquadLoading: boolean;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  lineupBenchStatus: Record<string, string>;
}

const initialMatchFormState: MatchFormState = {
  opponentClub: null, competition: null, match: null,
  resolvedCompetitionUuid: '', loading: true, error: null,
  activatingContext: false, activeContext: null,
  isCreateTxnModalOpen: false, isMatchDetailModalOpen: false,
  isMatchEditModalOpen: false, isContentModalOpen: false,
  selectedTemplate: null, selectedContentTypeLabel: '',
  availableTemplates: {}, templatesLoading: false,
  templateFlagMap: {}, templateFlagsLoading: false,
  contentItems: [], contentItemsLoading: false,
  selectedContentItem: null, isContentPreviewOpen: false,
  matchMedia: [], matchMediaLoading: false, savedAssetPreview: null,
  toasts: [],
  eligibleMembers: [], orgMembersAll: [],
  teamProjectMembers: [], clubProjectMembers: [],
  rosterLoading: false, rosterError: null,
  addHomeMemberId: '', addAwayMemberId: '',
  lineupBulkSubmitting: false,
  lineupEligibleSearchHome: '', lineupEligibleSearchAway: '',
  selectedEligibleLineupMemberIdsHome: new Set(), selectedEligibleLineupMemberIdsAway: new Set(),
  selectedLineupParticipationIdsHome: new Set(), selectedLineupParticipationIdsAway: new Set(),
  lineupFormation: '4-3-3',
  lineupSlots: { goalkeeper: [], player: [] },
  lineupSquad: { goalkeeper: [], player: [], coach: [], assistant: [] },
  lineupSquadLoading: false, lineupSaving: false, lineupSaveSuccess: false,
  lineupBenchStatus: {},
};

// ─── Hook: useReducer + provider context + sync effects ──────────────────────

export function useMatchFormState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const ctx = useSeasonContext();
  const {
    org, project, club, season, resolvedSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading, error: providerError,
    isTeamRoute, orgSlugOrId, clubSlugOrId, projectSlugOrId,
    effectiveSeasonId, seasonsBasePath, clubBrand, brandLogoUrl, isPlayer, isSupporter, apiBaseUrl,
  } = ctx;

  const { competitionId, matchId } = useParams<{ competitionId: string; matchId: string }>();

  /* ── Reducer state ── */
  const [s, dispatch] = useReducer(formReducer<MatchFormState>, initialMatchFormState);

  /* ── Backward-compatible setters (stable identity — dispatch never changes) ── */
  const setOpponentClub = useMemo(() => makeSetter<MatchFormState, 'opponentClub'>(dispatch, 'opponentClub'), [dispatch]);
  const setCompetition = useMemo(() => makeSetter<MatchFormState, 'competition'>(dispatch, 'competition'), [dispatch]);
  const setMatch = useMemo(() => makeSetter<MatchFormState, 'match'>(dispatch, 'match'), [dispatch]);
  const setResolvedCompetitionUuid = useMemo(() => makeSetter<MatchFormState, 'resolvedCompetitionUuid'>(dispatch, 'resolvedCompetitionUuid'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<MatchFormState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<MatchFormState, 'error'>(dispatch, 'error'), [dispatch]);
  const setActivatingContext = useMemo(() => makeSetter<MatchFormState, 'activatingContext'>(dispatch, 'activatingContext'), [dispatch]);
  const setActiveContextState = useMemo(() => makeSetter<MatchFormState, 'activeContext'>(dispatch, 'activeContext'), [dispatch]);
  const setIsCreateTxnModalOpen = useMemo(() => makeSetter<MatchFormState, 'isCreateTxnModalOpen'>(dispatch, 'isCreateTxnModalOpen'), [dispatch]);
  const setIsMatchDetailModalOpen = useMemo(() => makeSetter<MatchFormState, 'isMatchDetailModalOpen'>(dispatch, 'isMatchDetailModalOpen'), [dispatch]);
  const setIsMatchEditModalOpen = useMemo(() => makeSetter<MatchFormState, 'isMatchEditModalOpen'>(dispatch, 'isMatchEditModalOpen'), [dispatch]);
  const setIsContentModalOpen = useMemo(() => makeSetter<MatchFormState, 'isContentModalOpen'>(dispatch, 'isContentModalOpen'), [dispatch]);
  const setSelectedTemplate = useMemo(() => makeSetter<MatchFormState, 'selectedTemplate'>(dispatch, 'selectedTemplate'), [dispatch]);
  const setSelectedContentTypeLabel = useMemo(() => makeSetter<MatchFormState, 'selectedContentTypeLabel'>(dispatch, 'selectedContentTypeLabel'), [dispatch]);
  const setAvailableTemplates = useMemo(() => makeSetter<MatchFormState, 'availableTemplates'>(dispatch, 'availableTemplates'), [dispatch]);
  const setTemplatesLoading = useMemo(() => makeSetter<MatchFormState, 'templatesLoading'>(dispatch, 'templatesLoading'), [dispatch]);
  const setTemplateFlagMap = useMemo(() => makeSetter<MatchFormState, 'templateFlagMap'>(dispatch, 'templateFlagMap'), [dispatch]);
  const setTemplateFlagsLoading = useMemo(() => makeSetter<MatchFormState, 'templateFlagsLoading'>(dispatch, 'templateFlagsLoading'), [dispatch]);
  const setContentItems = useMemo(() => makeSetter<MatchFormState, 'contentItems'>(dispatch, 'contentItems'), [dispatch]);
  const setContentItemsLoading = useMemo(() => makeSetter<MatchFormState, 'contentItemsLoading'>(dispatch, 'contentItemsLoading'), [dispatch]);
  const setSelectedContentItem = useMemo(() => makeSetter<MatchFormState, 'selectedContentItem'>(dispatch, 'selectedContentItem'), [dispatch]);
  const setIsContentPreviewOpen = useMemo(() => makeSetter<MatchFormState, 'isContentPreviewOpen'>(dispatch, 'isContentPreviewOpen'), [dispatch]);
  const setMatchMedia = useMemo(() => makeSetter<MatchFormState, 'matchMedia'>(dispatch, 'matchMedia'), [dispatch]);
  const setMatchMediaLoading = useMemo(() => makeSetter<MatchFormState, 'matchMediaLoading'>(dispatch, 'matchMediaLoading'), [dispatch]);
  const setSavedAssetPreview = useMemo(() => makeSetter<MatchFormState, 'savedAssetPreview'>(dispatch, 'savedAssetPreview'), [dispatch]);
  const setToasts = useMemo(() => makeSetter<MatchFormState, 'toasts'>(dispatch, 'toasts'), [dispatch]);
  const setEligibleMembers = useMemo(() => makeSetter<MatchFormState, 'eligibleMembers'>(dispatch, 'eligibleMembers'), [dispatch]);
  const setOrgMembersAll = useMemo(() => makeSetter<MatchFormState, 'orgMembersAll'>(dispatch, 'orgMembersAll'), [dispatch]);
  const setTeamProjectMembers = useMemo(() => makeSetter<MatchFormState, 'teamProjectMembers'>(dispatch, 'teamProjectMembers'), [dispatch]);
  const setClubProjectMembers = useMemo(() => makeSetter<MatchFormState, 'clubProjectMembers'>(dispatch, 'clubProjectMembers'), [dispatch]);
  const setRosterLoading = useMemo(() => makeSetter<MatchFormState, 'rosterLoading'>(dispatch, 'rosterLoading'), [dispatch]);
  const setRosterError = useMemo(() => makeSetter<MatchFormState, 'rosterError'>(dispatch, 'rosterError'), [dispatch]);
  const setAddHomeMemberId = useMemo(() => makeSetter<MatchFormState, 'addHomeMemberId'>(dispatch, 'addHomeMemberId'), [dispatch]);
  const setAddAwayMemberId = useMemo(() => makeSetter<MatchFormState, 'addAwayMemberId'>(dispatch, 'addAwayMemberId'), [dispatch]);
  const setLineupBulkSubmitting = useMemo(() => makeSetter<MatchFormState, 'lineupBulkSubmitting'>(dispatch, 'lineupBulkSubmitting'), [dispatch]);
  const setLineupEligibleSearchHome = useMemo(() => makeSetter<MatchFormState, 'lineupEligibleSearchHome'>(dispatch, 'lineupEligibleSearchHome'), [dispatch]);
  const setLineupEligibleSearchAway = useMemo(() => makeSetter<MatchFormState, 'lineupEligibleSearchAway'>(dispatch, 'lineupEligibleSearchAway'), [dispatch]);
  const setSelectedEligibleLineupMemberIdsHome = useMemo(() => makeSetter<MatchFormState, 'selectedEligibleLineupMemberIdsHome'>(dispatch, 'selectedEligibleLineupMemberIdsHome'), [dispatch]);
  const setSelectedEligibleLineupMemberIdsAway = useMemo(() => makeSetter<MatchFormState, 'selectedEligibleLineupMemberIdsAway'>(dispatch, 'selectedEligibleLineupMemberIdsAway'), [dispatch]);
  const setSelectedLineupParticipationIdsHome = useMemo(() => makeSetter<MatchFormState, 'selectedLineupParticipationIdsHome'>(dispatch, 'selectedLineupParticipationIdsHome'), [dispatch]);
  const setSelectedLineupParticipationIdsAway = useMemo(() => makeSetter<MatchFormState, 'selectedLineupParticipationIdsAway'>(dispatch, 'selectedLineupParticipationIdsAway'), [dispatch]);
  const setLineupFormation = useMemo(() => makeSetter<MatchFormState, 'lineupFormation'>(dispatch, 'lineupFormation'), [dispatch]);
  const setLineupSlots = useMemo(() => makeSetter<MatchFormState, 'lineupSlots'>(dispatch, 'lineupSlots'), [dispatch]);
  const setLineupSquad = useMemo(() => makeSetter<MatchFormState, 'lineupSquad'>(dispatch, 'lineupSquad'), [dispatch]);
  const setLineupSquadLoading = useMemo(() => makeSetter<MatchFormState, 'lineupSquadLoading'>(dispatch, 'lineupSquadLoading'), [dispatch]);
  const setLineupSaving = useMemo(() => makeSetter<MatchFormState, 'lineupSaving'>(dispatch, 'lineupSaving'), [dispatch]);
  const setLineupSaveSuccess = useMemo(() => makeSetter<MatchFormState, 'lineupSaveSuccess'>(dispatch, 'lineupSaveSuccess'), [dispatch]);
  const setLineupBenchStatus = useMemo(() => makeSetter<MatchFormState, 'lineupBenchStatus'>(dispatch, 'lineupBenchStatus'), [dispatch]);

  /* ── Derived hooks that depend on reducer state ── */
  const opponentClubBrand = useBrandProfile({
    projectId: s.opponentClub?.id ? String(s.opponentClub.id) : undefined,
    organisationId: org?.id ? String(org.id) : undefined,
    autoFetch: !!s.opponentClub?.id,
  });

  // ── Provider sync ──
  useEffect(() => {
    if (!providerLoading && providerError) {
      setLoading(false);
      setError(providerError);
    }
  }, [providerLoading, providerError]);

  // ── Active context load on mount ──
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        logger.error('Failed to load active context', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  // ── Route params ──
  const seasonKeyOrId = effectiveSeasonId;
  const effectiveCompetitionIdVal = String(competitionId || '').trim();
  const effectiveMatchIdVal = String(matchId || '').trim();
  const pendingClubSlugResolve = false;
  const clubSlugRedirectTarget: string | null = null;

  return {
    // Router
    navigate, location, user,
    // Context
    org, project, club, season, resolvedSeasonId,
    providerCompetitions, providerLoading, isPlayer, isSupporter, apiBaseUrl,
    orgSlugOrId, clubSlugOrId, seasonsBasePath, clubBrand, brandLogoUrl, isTeamRoute,
    // Route params
    seasonKeyOrId, effectiveCompetitionIdVal, effectiveMatchIdVal,
    effectiveSeasonId, pendingClubSlugResolve, clubSlugRedirectTarget,
    // Opponent
    opponentClub: s.opponentClub, setOpponentClub, opponentClubBrand,
    // Match data
    competition: s.competition, setCompetition, match: s.match, setMatch,
    resolvedCompetitionUuid: s.resolvedCompetitionUuid, setResolvedCompetitionUuid,
    loading: s.loading, setLoading, error: s.error, setError,
    // Context activation
    activatingContext: s.activatingContext, setActivatingContext, activeContext: s.activeContext, setActiveContextState,
    // Modals
    isCreateTxnModalOpen: s.isCreateTxnModalOpen, setIsCreateTxnModalOpen,
    isMatchDetailModalOpen: s.isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    isMatchEditModalOpen: s.isMatchEditModalOpen, setIsMatchEditModalOpen,
    isContentModalOpen: s.isContentModalOpen, setIsContentModalOpen,
    selectedTemplate: s.selectedTemplate, setSelectedTemplate,
    selectedContentTypeLabel: s.selectedContentTypeLabel, setSelectedContentTypeLabel,
    // Templates
    availableTemplates: s.availableTemplates, setAvailableTemplates, templatesLoading: s.templatesLoading, setTemplatesLoading,
    templateFlagMap: s.templateFlagMap, setTemplateFlagMap, templateFlagsLoading: s.templateFlagsLoading, setTemplateFlagsLoading,
    // Content items
    contentItems: s.contentItems, setContentItems, contentItemsLoading: s.contentItemsLoading, setContentItemsLoading,
    selectedContentItem: s.selectedContentItem, setSelectedContentItem,
    isContentPreviewOpen: s.isContentPreviewOpen, setIsContentPreviewOpen,
    // Media
    matchMedia: s.matchMedia, setMatchMedia, matchMediaLoading: s.matchMediaLoading, setMatchMediaLoading,
    savedAssetPreview: s.savedAssetPreview, setSavedAssetPreview,
    // Toasts
    toasts: s.toasts, setToasts,
    // Roster
    eligibleMembers: s.eligibleMembers, setEligibleMembers, orgMembersAll: s.orgMembersAll, setOrgMembersAll,
    teamProjectMembers: s.teamProjectMembers, setTeamProjectMembers, clubProjectMembers: s.clubProjectMembers, setClubProjectMembers,
    rosterLoading: s.rosterLoading, setRosterLoading, rosterError: s.rosterError, setRosterError,
    addHomeMemberId: s.addHomeMemberId, setAddHomeMemberId, addAwayMemberId: s.addAwayMemberId, setAddAwayMemberId,
    // Lineup
    lineupBulkSubmitting: s.lineupBulkSubmitting, setLineupBulkSubmitting,
    lineupEligibleSearchHome: s.lineupEligibleSearchHome, setLineupEligibleSearchHome,
    lineupEligibleSearchAway: s.lineupEligibleSearchAway, setLineupEligibleSearchAway,
    selectedEligibleLineupMemberIdsHome: s.selectedEligibleLineupMemberIdsHome, setSelectedEligibleLineupMemberIdsHome,
    selectedEligibleLineupMemberIdsAway: s.selectedEligibleLineupMemberIdsAway, setSelectedEligibleLineupMemberIdsAway,
    selectedLineupParticipationIdsHome: s.selectedLineupParticipationIdsHome, setSelectedLineupParticipationIdsHome,
    selectedLineupParticipationIdsAway: s.selectedLineupParticipationIdsAway, setSelectedLineupParticipationIdsAway,
    // Formation
    lineupFormation: s.lineupFormation, setLineupFormation, lineupSlots: s.lineupSlots, setLineupSlots,
    lineupSquad: s.lineupSquad, setLineupSquad, lineupSquadLoading: s.lineupSquadLoading, setLineupSquadLoading,
    lineupSaving: s.lineupSaving, setLineupSaving, lineupSaveSuccess: s.lineupSaveSuccess, setLineupSaveSuccess,
    lineupBenchStatus: s.lineupBenchStatus, setLineupBenchStatus,
  };
}
