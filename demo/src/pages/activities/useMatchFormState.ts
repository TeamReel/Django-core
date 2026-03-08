import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import type { Period, SeasonProject as Project } from '../../types/season';
import { useSeasonContext } from '../../providers/SeasonProvider';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import { getActiveContext } from '../../utils/activeContext';
import type { MatchDetail, ContentItem, OrgMember, ProjectMember } from './matchDetailTypes';
import type { ContentTemplate } from '../identity/ContentGenerationModal';
import type { MatchMediaItem } from '../../components/MediaAssetCard';

// ─── Hook: all useState + provider context + sync effects ────────────────────

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

  // ── Core match data ──
  const [opponentClub, setOpponentClub] = useState<Project | null>(null);

  const opponentClubBrand = useBrandProfile({
    projectId: opponentClub?.id ? String(opponentClub.id) : undefined,
    organisationId: org?.id ? String(org.id) : undefined,
    autoFetch: !!opponentClub?.id,
  });

  const [competition, setCompetition] = useState<Period | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [resolvedCompetitionUuid, setResolvedCompetitionUuid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Context / activation ──
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);

  // ── Modal state ──
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);
  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');

  // ── Templates ──
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateFlagMap, setTemplateFlagMap] = useState<Record<string, boolean>>({});
  const [templateFlagsLoading, setTemplateFlagsLoading] = useState(false);

  // ── Content items ──
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentItemsLoading, setContentItemsLoading] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [isContentPreviewOpen, setIsContentPreviewOpen] = useState(false);

  // ── Match media ──
  const [matchMedia, setMatchMedia] = useState<MatchMediaItem[]>([]);
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [savedAssetPreview, setSavedAssetPreview] = useState<{ title: string; url: string; isVideo: boolean; subtitle?: string } | null>(null);

  // ── Toasts ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[]>([]);

  // ── Roster ──
  const [eligibleMembers, setEligibleMembers] = useState<OrgMember[]>([]);
  const [orgMembersAll, setOrgMembersAll] = useState<OrgMember[]>([]);
  const [teamProjectMembers, setTeamProjectMembers] = useState<ProjectMember[]>([]);
  const [clubProjectMembers, setClubProjectMembers] = useState<ProjectMember[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [addHomeMemberId, setAddHomeMemberId] = useState('');
  const [addAwayMemberId, setAddAwayMemberId] = useState('');

  // ── Lineup bulk selection ──
  const [lineupBulkSubmitting, setLineupBulkSubmitting] = useState(false);
  const [lineupEligibleSearchHome, setLineupEligibleSearchHome] = useState('');
  const [lineupEligibleSearchAway, setLineupEligibleSearchAway] = useState('');
  const [selectedEligibleLineupMemberIdsHome, setSelectedEligibleLineupMemberIdsHome] = useState<Set<string>>(new Set());
  const [selectedEligibleLineupMemberIdsAway, setSelectedEligibleLineupMemberIdsAway] = useState<Set<string>>(new Set());
  const [selectedLineupParticipationIdsHome, setSelectedLineupParticipationIdsHome] = useState<Set<string>>(new Set());
  const [selectedLineupParticipationIdsAway, setSelectedLineupParticipationIdsAway] = useState<Set<string>>(new Set());

  // ── Formation lineup editor ──
  const [lineupFormation, setLineupFormation] = useState('4-3-3');
  const [lineupSlots, setLineupSlots] = useState<Record<string, string[]>>({ goalkeeper: [], player: [] });
  const [lineupSquad, setLineupSquad] = useState<Record<string, any[]>>({ goalkeeper: [], player: [], coach: [], assistant: [] });
  const [lineupSquadLoading, setLineupSquadLoading] = useState(false);
  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupSaveSuccess, setLineupSaveSuccess] = useState(false);
  const [lineupBenchStatus, setLineupBenchStatus] = useState<Record<string, string>>({});

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
        console.error(e);
        console.error('Failed to load active context:', e);
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
    opponentClub, setOpponentClub, opponentClubBrand,
    // Match data
    competition, setCompetition, match, setMatch,
    resolvedCompetitionUuid, setResolvedCompetitionUuid,
    loading, setLoading, error, setError,
    // Context activation
    activatingContext, setActivatingContext, activeContext, setActiveContextState,
    // Modals
    isCreateTxnModalOpen, setIsCreateTxnModalOpen,
    isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    isMatchEditModalOpen, setIsMatchEditModalOpen,
    isContentModalOpen, setIsContentModalOpen,
    selectedTemplate, setSelectedTemplate,
    selectedContentTypeLabel, setSelectedContentTypeLabel,
    // Templates
    availableTemplates, setAvailableTemplates, templatesLoading, setTemplatesLoading,
    templateFlagMap, setTemplateFlagMap, templateFlagsLoading, setTemplateFlagsLoading,
    // Content items
    contentItems, setContentItems, contentItemsLoading, setContentItemsLoading,
    selectedContentItem, setSelectedContentItem,
    isContentPreviewOpen, setIsContentPreviewOpen,
    // Media
    matchMedia, setMatchMedia, matchMediaLoading, setMatchMediaLoading,
    savedAssetPreview, setSavedAssetPreview,
    // Toasts
    toasts, setToasts,
    // Roster
    eligibleMembers, setEligibleMembers, orgMembersAll, setOrgMembersAll,
    teamProjectMembers, setTeamProjectMembers, clubProjectMembers, setClubProjectMembers,
    rosterLoading, setRosterLoading, rosterError, setRosterError,
    addHomeMemberId, setAddHomeMemberId, addAwayMemberId, setAddAwayMemberId,
    // Lineup
    lineupBulkSubmitting, setLineupBulkSubmitting,
    lineupEligibleSearchHome, setLineupEligibleSearchHome,
    lineupEligibleSearchAway, setLineupEligibleSearchAway,
    selectedEligibleLineupMemberIdsHome, setSelectedEligibleLineupMemberIdsHome,
    selectedEligibleLineupMemberIdsAway, setSelectedEligibleLineupMemberIdsAway,
    selectedLineupParticipationIdsHome, setSelectedLineupParticipationIdsHome,
    selectedLineupParticipationIdsAway, setSelectedLineupParticipationIdsAway,
    // Formation
    lineupFormation, setLineupFormation, lineupSlots, setLineupSlots,
    lineupSquad, setLineupSquad, lineupSquadLoading, setLineupSquadLoading,
    lineupSaving, setLineupSaving, lineupSaveSuccess, setLineupSaveSuccess,
    lineupBenchStatus, setLineupBenchStatus,
  };
}
