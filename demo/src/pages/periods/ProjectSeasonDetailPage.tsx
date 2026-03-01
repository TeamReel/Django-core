import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import SeasonAssetsCard from '../../components/SeasonAssetsCard';
import { AssetsTab } from '../../components/AssetsTab';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MEDIA_SLOTS, MediaSlotId } from '../../constants/mediaSlots';
import { memberHasMedia, countFilledMediaSlots, countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import {
  PageContent,
  PageHeader,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { useAuth } from '@django-core/auth-ui';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchEditModal from '../identity/MatchEditModal';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodCreateModal from '../identity/PeriodCreateModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import SeasonSquadAddMemberModal from '../identity/SeasonSquadAddMemberModal';
import ContentGenerationModal, { CONTENT_TYPES, type ContentTemplate } from '../identity/ContentGenerationModal';
import { periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { BatchGenerationModal, type BatchMember } from '../../components/BatchGenerationModal';
import { ActiveJobsModal } from '../../components/ActiveJobsModal';
import { AssetGenerationModal, type SavedAssetInfo } from '../../components/AssetGenerationModal';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import {
  useVideoJobs,
  getJobStatusDisplay,
  getJobTypeDisplay,
  type VideoJob,
} from '../../hooks/useVideoJobs';
import {
  actionButtonStyle,
  ctaButtonStyle,
  type ActionTone,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { useSeasonContext, isSeasonPeriod } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken } from '../../types/season';
import s from './ProjectSeasonDetailPage.module.css';

// Types (Period, Project, Organisation) imported from ../../types/season
// Helpers (getCsrfToken, isSeasonPeriod) imported from providers / types/season

export const ProjectSeasonDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ── Shared season-hierarchy context (org, project, club, season, permissions, brand) ──
  const ctx = useSeasonContext();
  const {
    org,
    project,
    club,
    season: providerSeason,
    resolvedSeasonId,
    competitions: providerCompetitions,
    seasonsForSwitcher,
    loading: providerLoading,
    error: providerError,
    competitionsLoading: providerCompetitionsLoading,
    isTeamRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    projectDetailPath,
    seasonPathKey,
    memberDetailHref,
    clubBrand,
    teamBrand,
    batchBrandKits,
    brandLogoUrl,
    brandSponsorUrl,
    isSuperAdmin,
    orgForPermissions,
    permissionContext,
    userCanEditProject,
    userCanDeleteProject,
    isPlayer,
    apiBaseUrl,
    reloadSeason,
  } = ctx;

  // ── Local copies of provider data for optimistic updates ──
  // The provider fetches the data; these locals allow in-place mutations (edit/delete)
  // without forcing a full provider re-fetch.
  const [competitions, setCompetitions] = useState<Period[]>([]);
  useEffect(() => { setCompetitions(providerCompetitions); }, [providerCompetitions]);

  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  useEffect(() => { setCompetitionsLoading(providerCompetitionsLoading); }, [providerCompetitionsLoading]);

  const [season, setSeason] = useState<Period | null>(providerSeason);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);

  const tableActionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
    ...actionButtonStyle(tone),
  });

  const backButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid var(--app-border)',
    backgroundColor: 'var(--app-surface-2)',
    color: 'var(--app-text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  };

  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersReloadToken, setMembersReloadToken] = useState(0);

  const [thenNowSearch, setThenNowSearch] = useState('');
  const [thenNowSelectedUserIds, setThenNowSelectedUserIds] = useState<Set<string>>(new Set());
  const [thenNowLayout, setThenNowLayout] = useState<'morph' | 'side-by-side'>('morph');

  // Then vs Now compilation modal state
  const [thenVsNowModalOpen, setThenVsNowModalOpen] = useState(false);
  const [thenVsNowModalType, setThenVsNowModalType] = useState<'duo_portret' | 'duo_portret_cover' | 'duo_portret_overlay' | 'sidebyside_cover' | 'sidebyside_overlay' | 'transformation' | 'walking_composite'>('duo_portret_cover');
  const [thenVsNowModalStep, setThenVsNowModalStep] = useState<'members' | 'generating' | 'submitted' | 'error'>('members');
  const [thenVsNowModalSelected, setThenVsNowModalSelected] = useState<string[]>([]);
  const [thenVsNowModalSearch, setThenVsNowModalSearch] = useState('');
  const [thenVsNowModalJobId, setThenVsNowModalJobId] = useState<string | null>(null);
  const [thenVsNowModalError, setThenVsNowModalError] = useState<string | null>(null);
  const [thenVsNowBackgrounds, setThenVsNowBackgrounds] = useState<Array<{ id: string; url: string; label?: string; profile_name?: string }>>([]);
  const [thenVsNowSelectedBgUrl, setThenVsNowSelectedBgUrl] = useState<string | null>(null);
  // Per-member transformation variant key override: { memberId: "transformation_snap" }
  const [thenVsNowVariantKeys, setThenVsNowVariantKeys] = useState<Record<string, string>>({});

  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [teamRosterLoading, setTeamRosterLoading] = useState(false);
  const [teamRosterError, setTeamRosterError] = useState<string | null>(null);
  const [teamRosterReloadToken, setTeamRosterReloadToken] = useState(0);

  const [eligibleSearch, setEligibleSearch] = useState('');
  const [squadSearch, setSquadSearch] = useState('');
  const [selectedEligibleUserIds, setSelectedEligibleUserIds] = useState<Set<string>>(new Set());
  const [selectedSquadMembershipIds, setSelectedSquadMembershipIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string>('');
  const [addPosition, setAddPosition] = useState('');
  const [addShirtNumber, setAddShirtNumber] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});

  // Edit modal (match TeamDetail page patterns: edit in-place, no /edit route)
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);

  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  // Edit member functional roles state
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<any | null>(null);
  const [editAccessRole, setEditAccessRole] = useState<'admin' | 'viewer'>('viewer');

  // Brand profile ID for Kits tab
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  // Batch generation state
  const [batchSelectedMemberIds, setBatchSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);

  // Guest player state
  const [guestPlayer, setGuestPlayer] = useState<{ has_avatar: boolean; has_closeup: boolean; has_intro: boolean; has_celebration: boolean; guest_player: any } | null>(null);
  const [guestPlayerLoading, setGuestPlayerLoading] = useState(false);
  const [guestPlayerGenerating, setGuestPlayerGenerating] = useState(false);

  // Guest AI generation modal state
  const [showGuestAiModal, setShowGuestAiModal] = useState(false);
  const [guestAiPreselectedTemplate, setGuestAiPreselectedTemplate] = useState<string | undefined>();
  const [guestAiSelectedKitType, setGuestAiSelectedKitType] = useState<string>('home');

  // Content generation state
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');

  // Video preview modal state (content tab)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoLabel, setPreviewVideoLabel] = useState('');

  // Stable video URL ref — prevents <video src> churn when polling returns new presigned URLs
  const stableVideoUrlsRef = useRef<Map<string, string>>(new Map());

  const seasonWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  // Content generation helpers
  const openContentModal = (template: ContentTemplate, typeLabel: string) => {
    setSelectedTemplate(template);
    setSelectedContentTypeLabel(typeLabel);
    setIsContentModalOpen(true);
  };

  const closeContentModal = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
  };

  // ── Toast notifications ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[]>([]);
  const pushToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleContentGenerated = useCallback((message?: string) => {
    pushToast(message || '📋 Content wordt gegenereerd en komt in de approval queue.', 'success');
  }, [pushToast]);

  // Fetch available templates for season content types
  const fetchAvailableTemplates = useCallback(async () => {
    if (!org?.sport?.id) return;

    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      if (org?.id) {
        params.append('organisation', String(org.id));
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const rawResults = data?.data?.results || data?.results || data?.data || data || [];
        const allTemplates: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

        // Filter templates that match the org's sport (or have no sport = universal)
        const sportId = org.sport.id;
        const matchingTemplates = allTemplates.filter(t => {
          if (!t.sport) return true;
          if (t.sport === sportId) return true;
          if (t.sport_detail?.id === sportId) return true;
          return false;
        });

        // Group templates by subtype
        const grouped: Record<string, ContentTemplate[]> = {};
        matchingTemplates.forEach(t => {
          const subtype = t.template_subtype || t.template_type;
          if (!grouped[subtype]) grouped[subtype] = [];
          grouped[subtype].push(t);
        });
        setAvailableTemplates(grouped);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [org?.sport?.id, org?.id, apiBaseUrl]);

  // Fetch templates when sport is available
  useEffect(() => {
    if (org?.sport?.id) {
      fetchAvailableTemplates();
    }
  }, [org?.sport?.id, fetchAvailableTemplates]);

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  const createModalOrganisations = useMemo(() => {
    if (!org) return [];
    return [{ id: String(org.id), name: String(org.name || ''), slug: (org as any).slug }];
  }, [org]);

  const createModalClubs = useMemo(() => {
    const baseOrgId = String(org?.id || '').trim();
    const c = club || null;
    if (c) {
      return [{ id: String((c as any).id), name: String((c as any).name || ''), slug: (c as any).slug, organisation: baseOrgId || undefined } as any];
    }
    return [] as any[];
  }, [club, org]);

  const createModalTeams = useMemo(() => {
    const team = project || null;
    if (!team) return [] as any[];
    const clubIdValue = String((club as any)?.id || '').trim();
    return [{ id: String((team as any).id), name: String((team as any).name || ''), slug: (team as any).slug, parent_id: clubIdValue || undefined } as any];
  }, [project, club]);

  // Permission checks, navigation helpers, and brand profiles now come from useSeasonContext

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const allowed = isPlayer
      ? new Set(['hierarchy', 'competitions', 'matches'])
      : new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'team', 'media', 'transactions', 'assets', 'workflow']);
    return allowed.has(raw) ? raw : (isPlayer ? 'hierarchy' : 'overview');
  }, [location.search, isPlayer]);

  const navigateToTab = (tabId: string) => {
    const seasonKeyOrId = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();
    if (!seasonKeyOrId) return;

    if (tabId === 'overview') {
      navigate(`${seasonsBasePath}/${seasonKeyOrId}`);
      return;
    }

    navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=${encodeURIComponent(tabId)}`);
  };

  const currentUserId = String((user as any)?.id || '').trim();
  const mySeasonMembershipId = useMemo(() => {
    if (!currentUserId) return '';
    const mine = (members || []).find((m: any) => {
      const u = m?.user || m;
      const id = u?.id ?? m?.user_id;
      return String(id || '').trim() === currentUserId;
    });
    return String(mine?.id || '').trim();
  }, [currentUserId, members]);

  // Brand profiles (clubBrand, teamBrand) come from useSeasonContext

  // ── Video processing jobs for this project (content tab gallery) ──
  // Only show season-level content (then_vs_now), not match-level (lineup, match_intro, etc.)
  const contentProjectId = String(project?.id || '');
  const {
    jobs: contentVideoJobs,
    loading: contentVideoLoading,
    refresh: refreshContentVideoJobs,
  } = useVideoJobs({
    projectId: contentProjectId || null,
    jobType: 'then_vs_now',
    autoRefresh: true,
    refreshInterval: 15_000,
  });
  const completedVideoJobs = useMemo<VideoJob[]>(() =>
    contentVideoJobs.filter(j => j.status === 'completed' && j.output_url),
  [contentVideoJobs]);

  // ── Open guest player AI generation modal ──────────────────────────
  const openGuestAiModal = useCallback((templateId: string, kitType?: string) => {
    setGuestAiPreselectedTemplate(templateId);
    setGuestAiSelectedKitType(kitType || 'home');
    setShowGuestAiModal(true);
  }, []);

  // ── Crop guest player closeup from fullbody (no AI — deterministic crop) ──
  const [croppingGuestCloseup, setCroppingGuestCloseup] = useState(false);

  const cropGuestCloseup = useCallback(async (kitType: string = 'home') => {
    const projectId = String(project?.id || '');
    if (!projectId) {
      alert('Project ID ontbreekt.');
      return;
    }
    setCroppingGuestCloseup(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-closeup/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ project_id: projectId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      // Update local state to reflect the new closeup
      setGuestPlayer((prev) => prev ? { ...prev, has_closeup: true } : prev);

      // Reload to pick up updated project metadata
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Guest closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingGuestCloseup(false);
    }
  }, [apiBaseUrl, project?.id]);

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const periodId = String(periodToEdit?.id || '').trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save period');
    }

    const raw = await res.json().catch(() => null);
    const server = (raw as any)?.data || raw;
    const updated = server && typeof server === 'object' ? { ...periodToEdit, ...patch, ...(server as any) } : { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(season?.id)) {
      setSeason((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
    }
    setCompetitions((prev) => prev.map((p: any) => (String(p.id) === String(updated?.id) ? { ...p, ...updated } : p)));
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save match');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => (String(m.id) === String(updated?.id) ? { ...m, ...updated } : m)));
  };

  // Helper to count matches per competition
  const getMatchCountForCompetition = (competition: any): number => {
    const annotated = Number(
      (competition as any)?.matches_count ?? (competition as any)?.children_matches_count
    );
    if (!matches.length && Number.isFinite(annotated) && annotated >= 0) return annotated;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;
    return matches.filter((m: any) => {
      const periodId = String(m.period_id || m.period?.id || (m as any)?.period || '');
      return periodId === competitionId;
    }).length;
  };

  const getMatchParticipantsCount = (match: any): number => {
    const direct = Number(
      (match as any)?.participants_count ??
        (match as any)?.participations_count ??
        (match as any)?.participantsCount ??
        (match as any)?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const maybeParticipants = (match as any)?.participants;
    if (Array.isArray(maybeParticipants)) return maybeParticipants.length;
    const maybeParticipations = (match as any)?.participations;
    if (Array.isArray(maybeParticipations)) return maybeParticipations.length;

    return 0;
  };

  const getCompetitionParticipantsCount = (competition: any): number => {
    const direct = Number(
      (competition as any)?.participants_count ??
        (competition as any)?.participations_count ??
        (competition as any)?.participantsCount ??
        (competition as any)?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;

    // Best-effort aggregation from loaded matches.
    const related = matches.filter((m: any) => String(m.period_id || m.period?.id || '') === competitionId);
    if (related.length === 0) return 0;
    return related.reduce((sum: number, m: any) => sum + getMatchParticipantsCount(m), 0);
  };

  const seasonMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number((season as any)?.children_matches_count ?? (season as any)?.matches_count);
    if (Number.isFinite(annotated) && annotated >= 0) return annotated;
    return 0;
  }, [matches.length, season]);

  // Main org/project/club/season/competitions data now fetched by SeasonProvider

  // ── Load brand profile ID for Kits tab ──
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;

    const loadBrandProfile = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?project=${project.id}`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (results.length > 0 && !cancelled) {
          setBrandProfileId(results[0]?.id || null);
        }
      } catch { /* ignore */ }
    };

    void loadBrandProfile();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id]);

  // Brand assets for batch modal — pre-computed by SeasonProvider
  const batchBrandAssets = useMemo(() => ({
    logo: brandLogoUrl,
    sponsor: brandSponsorUrl,
    kits: batchBrandKits,
  }), [brandLogoUrl, brandSponsorUrl, batchBrandKits]);

  // Build BatchMember objects from squad members
  const batchMembers = useMemo((): BatchMember[] => {
    return Array.from(batchSelectedMemberIds)
      .map((mid) => {
        const m = members.find((mem: any) => String(mem.id) === mid);
        if (!m) return null;
        const memberUser = m.user || m;
        const name =
          memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email || '';
        const tr = m.metadata?.teamreel_assets || {};
        const profileUrl = tr?.media?.profile?.url || tr?.kit?.profile_photo_url || memberUser.avatar_url || null;
        const fullbodyUrls: Record<string, string> = {};
        const closeupUrls: Record<string, string> = {};
        const imgFb = tr?.images?.fullbody || {};
        const imgCu = tr?.images?.closeup || {};
        // Handle both old string and new { raw, processed } variant format
        // Prefer processed (bg-removed) URL for best AI input quality
        const extractUrl = (val: any): string | null => {
          if (!val) return null;
          if (typeof val === 'string') return val;
          if (typeof val === 'object') return val.processed || val.raw || null;
          return null;
        };
        for (const [k, v] of Object.entries(imgFb)) {
          const url = extractUrl(v);
          if (url) fullbodyUrls[k] = url;
        }
        for (const [k, v] of Object.entries(imgCu)) {
          const url = extractUrl(v);
          if (url) closeupUrls[k] = url;
        }
        // Fallback: check media.kit for home fullbody (legacy compat)
        if (!fullbodyUrls['home'] && tr?.media?.kit?.url) {
          fullbodyUrls['home'] = tr.media.kit.url;
        }
        return {
          id: mid,
          name,
          profilePhotoUrl: profileUrl,
          fullbodyUrls,
          closeupUrls,
          metadata: m.metadata,
        } as BatchMember;
      })
      .filter(Boolean) as BatchMember[];
  }, [batchSelectedMemberIds, members]);

  // Fetch season squad memberships (season-scoped roster)
  useEffect(() => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();

        if (!projectIdForMembers || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(
          projectIdForMembers
        )}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;

                const membersList = await fetchAllPages<any>(
          membersUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

                if (!cancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load squad';
        if (!cancelled) setMembersError(msg);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, project, resolvedSeasonId, membersReloadToken]);

  // ── Guest player data from project metadata ──────────────────────────
  useEffect(() => {
    if (activeTab !== 'media') return;
    const guestPlayerData = (project as any)?.metadata?.guest_player;
    if (guestPlayerData) {
      // Check if guest player has any assets
      const fullbodyHome = guestPlayerData?.images?.fullbody?.home;
      const closeupHome = guestPlayerData?.images?.closeup?.home;
      const introHome = guestPlayerData?.videos?.intro?.home;
      const celebrationHome = guestPlayerData?.videos?.celebration?.home;
      const hasAvatar = !!(fullbodyHome?.raw || fullbodyHome?.processed);
      const hasCloseup = !!(closeupHome?.raw || closeupHome?.processed);
      const hasIntro = !!(introHome?.raw || introHome?.processed || introHome?.url);
      const hasCelebration = !!(celebrationHome?.raw || celebrationHome?.processed || celebrationHome?.url);
      setGuestPlayer({
        has_avatar: hasAvatar,
        has_closeup: hasCloseup,
        has_intro: hasIntro,
        has_celebration: hasCelebration,
        guest_player: guestPlayerData,
      });
    } else {
      setGuestPlayer(null);
    }
  }, [project, activeTab]);

  // Fetch full team roster (all memberships on the team, any period) so we can show
  // "team members not in squad" for quick assignment.
  // Only fetch org members on the squad tab (orgs can have thousands of members).
  useEffect(() => {
    if (activeTab !== 'squad' && activeTab !== 'team') return;
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    let cancelled = false;
    const run = async () => {
      setTeamRosterLoading(true);
      setTeamRosterError(null);
      try {
        // Fetch team-level memberships (project memberships without period filter)
        const rosterUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/?page_size=500`;
        const roster = await fetchAllPages<any>(
          rosterUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

        // Only merge org members on the squad tab — the team tab should only show
        // actual team members. Org-wide members are only relevant when assigning
        // new people to a season squad. This avoids loading 2500+ org members on
        // the team tab.
        const byUserId = new Map<string, any>();
        for (const m of Array.isArray(roster) ? roster : []) {
          const uid = String(m?.user?.id || m?.user_id || '').trim();
          if (uid && !byUserId.has(uid)) byUserId.set(uid, m);
        }

        if (activeTab === 'squad') {
          const orgSlugForMembers = String((org as any)?.slug || orgSlugOrId || '').trim();
          if (orgSlugForMembers) {
            try {
              const orgMembersUrl = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForMembers)}/members/?page_size=500`;
              const orgMembers = await fetchAllPages<any>(
                orgMembersUrl,
                { credentials: 'include' },
                { bypass: true, maxItems: 5000 }
              );
              for (const m of Array.isArray(orgMembers) ? orgMembers : []) {
                const uid = String(m?.user?.id || m?.user_id || '').trim();
                if (uid && !byUserId.has(uid)) byUserId.set(uid, m);
              }
            } catch {
              // Silently fail if no access to org members
            }
          }
        }

        if (!cancelled) setTeamRoster(Array.from(byUserId.values()));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load team roster';
        if (!cancelled) setTeamRosterError(msg);
      } finally {
        if (!cancelled) setTeamRosterLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, org, project, teamRosterReloadToken]);

  const getUserId = (m: any): string => {
    const u = m?.user || m;
    const id = u?.id ?? m?.user_id;
    return String(id || '').trim();
  };

  const getUserLabel = (m: any): { name: string; email: string } => {
    const u = m?.user || m;
    const name =
      u?.name ||
      `${u?.first_name || ''} ${u?.last_name || ''}`.trim() ||
      String(u?.email || '').trim() ||
      '"”';
    const email = String(u?.email || '').trim() || '"”';
    return { name, email };
  };

  const normalizeAccessRole = (raw: any): 'viewer' | 'editor' | 'admin' => {
    const role = String(raw || '').trim().toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'editor') return 'editor';
    if (role === 'viewer') return 'viewer';
    if (['coach', 'trainer'].includes(role)) return 'editor';
    if (['manager', 'owner'].includes(role)) return 'admin';
    return 'viewer';
  };

  /** Map membership role + project level → RBAC display label */
  const getRbacLabel = (membershipRole: string): string => {
    const role = normalizeAccessRole(membershipRole);
    if (role === 'admin') return isTeamRoute ? 'Team Admin' : 'Club Admin';
    return isTeamRoute ? 'Team Member' : 'Supporter';
  };

  /** Access role options for the current project level */
  const accessRoleOptions: Array<{ value: 'admin' | 'viewer'; label: string; description: string; icon: string }> = isTeamRoute
    ? [
        { value: 'admin', label: 'Team Admin', description: 'Volledige toegang: wedstrijden, content, lineups, profielen', icon: '🛡️' },
        { value: 'viewer', label: 'Team Member', description: 'Beperkt: eigen content & profiel bewerken, rest alleen bekijken', icon: '👤' },
      ]
    : [
        { value: 'admin', label: 'Club Admin', description: 'Volledige toegang: club, teams, wedstrijden, content', icon: '🏛️' },
        { value: 'viewer', label: 'Supporter', description: 'Alleen-lezen: wedstrijden bekijken', icon: '👀' },
      ];

  const getBestRoleForUser = (userId: string): 'viewer' | 'editor' | 'admin' => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const base = relevant.find((m: any) => !String(m?.period_id ?? m?.period ?? '').trim());
    const anyOne = relevant[0];
    return normalizeAccessRole(base?.role ?? anyOne?.role ?? 'viewer');
  };

  const getFunctionalRolesFromMembership = (m: any): string[] => {
    // Try top-level functional_roles field first (from API)
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct) && direct.length > 0) {
      return direct.map((r) => String(r || '').trim()).filter(Boolean);
    }

    // Then try metadata.functional_roles (where we save it)
    const meta = (m as any)?.metadata || {};
    if (Array.isArray(meta.functional_roles) && meta.functional_roles.length > 0) {
      return meta.functional_roles.map((r: any) => String(r || '').trim()).filter(Boolean);
    }

    // Legacy single role fields
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  const getFunctionalRolesForUser = (userId: string): string[] => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const set = new Set<string>();
    for (const m of relevant) {
      for (const r of getFunctionalRolesFromMembership(m)) set.add(r);
    }
    return Array.from(set.values());
  };

  const squadUserIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of members || []) {
      const uid = getUserId(m);
      if (uid) s.add(uid);
    }
    return s;
  }, [members]);

  const eligibleTeamMembers = useMemo(() => {
    const byUserId = new Map<string, any>();
    for (const m of teamRoster || []) {
      const uid = getUserId(m);
      if (!uid) continue;
      if (squadUserIdSet.has(uid)) continue;
      if (!byUserId.has(uid)) byUserId.set(uid, m);
    }

    const q = String(eligibleSearch || '').trim().toLowerCase();
    const list = Array.from(byUserId.values());
    const filtered = q
      ? list.filter((m: any) => {
          const { name, email } = getUserLabel(m);
          return `${name} ${email}`.toLowerCase().includes(q);
        })
      : list;

    return filtered.sort((a: any, b: any) => {
      const la = getUserLabel(a).name.toLowerCase();
      const lb = getUserLabel(b).name.toLowerCase();
      return la.localeCompare(lb);
    });
  }, [eligibleSearch, squadUserIdSet, teamRoster]);

  const visibleSquadMembers = useMemo(() => {
    const q = String(squadSearch || '').trim().toLowerCase();
    if (!q) return members;
    return (members || []).filter((m: any) => {
      const memberUser = m.user || m;
      const name = String(
        memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email ||
          ''
      ).toLowerCase();
      const email = String(memberUser.email || '').toLowerCase();
      const position = String(m?.metadata?.position || '').toLowerCase();
      const shirt = String(m?.metadata?.shirt_number ?? '').toLowerCase();
      const role = String(m?.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || position.includes(q) || shirt.includes(q) || role.includes(q);
    });
  }, [members, squadSearch]);

  const toggleEligibleUser = (userId: string) => {
    setSelectedEligibleUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSquadMembership = (membershipId: string) => {
    setSelectedSquadMembershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  const toggleThenNowUser = (userId: string) => {
    const key = String(userId || '').trim();
    if (!key) return;

    setThenNowSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }

      // Limit to 5 (as per UX spec).
      if (next.size >= 5) return next;
      next.add(key);
      return next;
    });
  };

  const thenNowCandidates = useMemo(() => {
    const q = String(thenNowSearch || '').trim().toLowerCase();
    const list = (members || []).map((m: any) => {
      const userId = getUserId(m);
      const label = getUserLabel(m);
      const roles = getFunctionalRolesForUser(userId);
      const position = String(m?.metadata?.position || '').trim();
      const shirt = String(m?.metadata?.shirt_number ?? '').trim();
      return { userId, name: label.name, email: label.email, roles, position, shirt };
    });

    const filtered = q
      ? list.filter((x) => {
          const roles = (x.roles || []).join(' ');
          const hay = `${x.name} ${x.email} ${x.position} ${x.shirt} ${roles}`.toLowerCase();
          return hay.includes(q);
        })
      : list;

    return filtered
      .filter((x) => x.userId)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [members, thenNowSearch, getFunctionalRolesForUser]);

  // Members eligible for then_vs_now (for modal member picker)
  const thenVsNowEligibleMembers = useMemo(() => {
    return (members || []).map((m: any) => {
      const videos = m?.metadata?.teamreel_assets?.videos || {};
      const thenVsNow = videos?.then_vs_now || {};

      // Collect all transformation variant keys with data
      const transformationKeys: string[] = [];
      for (const k of Object.keys(thenVsNow)) {
        if (!k.startsWith('transformation')) continue;
        const v = thenVsNow[k];
        if (v && (v.processed || v.raw)) transformationKeys.push(k);
      }
      const hasTransformation = transformationKeys.length > 0;

      // Duo Portret eligibility: needs a processed photo_composite video (RVM output)
      const compositeVideo = videos?.photo_composite?.default;
      const hasDuoPortret = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.processing_state === 'processed'
        && compositeVideo.processed
      );

      // Duo Portret Cover: needs a raw photo_composite video (AI-generated)
      const hasDuoPortretCover = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.raw
      );

      // Duo Portret Overlay: needs a processed (RVM) photo_composite video
      const hasDuoPortretOverlay = hasDuoPortret;

      // Sidebyside eligibility: raw AI video
      const sideData = thenVsNow?.sidebyside;
      const hasSidebysideCover = !!(
        sideData
        && typeof sideData === 'object'
        && (sideData.raw || (typeof sideData === 'string'))
      );

      // Sidebyside Overlay: needs processed (RVM) sidebyside video
      const hasSidebysideOverlay = !!(
        sideData
        && typeof sideData === 'object'
        && sideData.processing_state === 'processed'
        && sideData.processed
      );

      // Walking Composite eligibility: needs a processed walking_composite video
      const walkingVideo = videos?.walking_composite?.default;
      const hasWalkingComposite = !!(
        walkingVideo
        && typeof walkingVideo === 'object'
        && walkingVideo.processing_state === 'processed'
        && walkingVideo.processed
      );

      return {
        id: String(m.id || ''),
        userId: String(m.user?.id || m.user_id || ''),
        name: m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.user.email || 'Unknown' : 'Unknown',
        shirtNumber: m.metadata?.shirt_number || m.shirt_number || null,
        position: m.metadata?.position || m.position || null,
        hasDuoPortret,
        hasDuoPortretCover,
        hasDuoPortretOverlay,
        hasSidebysideCover,
        hasSidebysideOverlay,
        hasTransformation,
        hasWalkingComposite,
        transformationKeys,
      };
    }).filter((m: any) => m.id);
  }, [members]);

  // Count members that have then_vs_now videos (for content tiles)
  const thenVsNowCounts = useMemo(() => {
    let duo_portret = 0;
    let duo_portret_cover = 0;
    let duo_portret_overlay = 0;
    let sidebyside_cover = 0;
    let sidebyside_overlay = 0;
    let transformation = 0;
    let walking_composite = 0;
    for (const m of thenVsNowEligibleMembers) {
      if (m.hasDuoPortret) duo_portret++;
      if (m.hasDuoPortretCover) duo_portret_cover++;
      if (m.hasDuoPortretOverlay) duo_portret_overlay++;
      if (m.hasSidebysideCover) sidebyside_cover++;
      if (m.hasSidebysideOverlay) sidebyside_overlay++;
      if (m.hasTransformation) transformation++;
      if (m.hasWalkingComposite) walking_composite++;
    }
    return { duo_portret, duo_portret_cover, duo_portret_overlay, sidebyside_cover, sidebyside_overlay, transformation, walking_composite };
  }, [thenVsNowEligibleMembers]);

  // Open the Then vs Now compilation modal
  const openThenVsNowModal = (videoType: 'duo_portret' | 'duo_portret_cover' | 'duo_portret_overlay' | 'sidebyside_cover' | 'sidebyside_overlay' | 'transformation' | 'walking_composite') => {
    const eligible = thenVsNowEligibleMembers.filter((m: any) =>
      videoType === 'duo_portret' ? m.hasDuoPortret
        : videoType === 'duo_portret_cover' ? m.hasDuoPortretCover
        : videoType === 'duo_portret_overlay' ? m.hasDuoPortretOverlay
        : videoType === 'sidebyside_cover' ? m.hasSidebysideCover
        : videoType === 'sidebyside_overlay' ? m.hasSidebysideOverlay
        : videoType === 'walking_composite' ? m.hasWalkingComposite
        : m.hasTransformation
    );
    // Pre-select all eligible members
    setThenVsNowModalSelected(eligible.map((m: any) => m.id));
    setThenVsNowModalType(videoType);
    setThenVsNowModalStep('members');
    setThenVsNowModalSearch('');
    setThenVsNowModalJobId(null);
    setThenVsNowModalError(null);
    setThenVsNowSelectedBgUrl(null);
    setThenVsNowVariantKeys({});
    setThenVsNowModalOpen(true);

    // Fetch available backgrounds (stadium_background + club_background assets)
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/branding/assets/app-backgrounds/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.data || data?.results || []);
          const bgs = items
            .filter((a: any) => a.url)
            .map((a: any) => ({
              id: a.id,
              url: a.url,
              label: a.label || '',
              profile_name: a.project_name || a.profile_name || '',
            }));
          setThenVsNowBackgrounds(bgs);
        }
      } catch (err) {
        console.warn('Failed to fetch app backgrounds:', err);
      }
    })();
  };

  // Close the Then vs Now compilation modal
  const closeThenVsNowModal = () => {
    setThenVsNowModalOpen(false);
  };

  // Submit the Then vs Now compilation
  const submitThenVsNowCompilation = async () => {
    setThenVsNowModalStep('generating');
    setThenVsNowModalError(null);
    try {
      const projId = String((project as any)?.id || '').trim();
      if (!projId) throw new Error('No project ID available');

      // Parse compound type into video_type + composition_style
      let videoType = thenVsNowModalType as string;
      let compositionStyle: string | null = null;
      if (videoType === 'duo_portret_cover') {
        videoType = 'duo_portret';
        compositionStyle = 'cover';
      } else if (videoType === 'duo_portret_overlay') {
        videoType = 'duo_portret';
        compositionStyle = 'overlay';
      } else if (videoType === 'sidebyside_cover') {
        videoType = 'sidebyside';
        compositionStyle = 'cover';
      } else if (videoType === 'sidebyside_overlay') {
        videoType = 'sidebyside';
        compositionStyle = 'overlay';
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/video/jobs/then-vs-now-compilation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projId,
          video_type: videoType,
          ...(compositionStyle ? { composition_style: compositionStyle } : {}),
          period_id: resolvedSeasonId || effectiveSeasonId || null,
          selected_member_ids: thenVsNowModalSelected,
          ...(thenVsNowSelectedBgUrl ? { background_url: thenVsNowSelectedBgUrl } : {}),
          ...(Object.keys(thenVsNowVariantKeys).length > 0 ? { member_variant_keys: thenVsNowVariantKeys } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.detail || `Failed (${res.status})`);
      }
      const data = await res.json();
      const jobId = data.data?.id || data.id;
      setThenVsNowModalJobId(jobId);

      // Show "submitted" confirmation, then auto-close after 2s
      setThenVsNowModalStep('submitted');
      setTimeout(() => {
        closeThenVsNowModal();
      }, 2500);
    } catch (err: any) {
      setThenVsNowModalError(err.message || 'Failed to start compilation');
      setThenVsNowModalStep('error');
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const getRetryDelayMsFromResponse = async (res: Response): Promise<number | null> => {
    const header = res.headers.get('retry-after');
    if (header) {
      const seconds = Number(header);
      if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
    }

    try {
      const rawText = await res.text();
      // Example payload:
      // {"status":"error","error":{"message":"Request was throttled. Expected available in 30 seconds."}}
      const match = rawText.match(/Expected available in\s+(\d+)\s+seconds/i);
      if (match?.[1]) {
        const seconds = Number(match[1]);
        if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
      }
      // If response isn't JSON or doesn't match, fall through.
    } catch {
      // ignore
    }

    return null;
  };

  const fetchWithThrottleRetry = async (
    input: RequestInfo | URL,
    init: RequestInit,
    opts?: { maxAttempts?: number; baseDelayMs?: number }
  ): Promise<Response> => {
    const maxAttempts = opts?.maxAttempts ?? 6;
    const baseDelayMs = opts?.baseDelayMs ?? 500;

    let attempt = 0;
    // We intentionally run sequentially to reduce pressure on API.
    // This helper adds retry + backoff when the server throttles (HTTP 429).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      const res = await fetch(input, init);

      if (res.status !== 429) return res;

      if (attempt >= maxAttempts) return res;

      const retryDelayMs = (await getRetryDelayMsFromResponse(res)) ?? baseDelayMs * attempt;
      await sleep(Math.min(60_000, retryDelayMs));
    }
  };

  const assignUsersToSeasonSquad = async (userIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectIdForMembers || !seasonUuid) return;

    const ids = (userIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-user write throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              members: ids.map((uid) => ({
                user_id: Number(uid),
                role: getBestRoleForUser(uid),
                period_id: String(seasonUuid),
              })),
            }),
          }
        );

        if (res.status === 404) {
          // Older backend: fall back to sequential single-member POSTs.
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to assign users');
        } else {
          setSelectedEligibleUserIds((prev) => {
            const next = new Set(prev);
            for (const uid of ids) next.delete(uid);
            return next;
          });
          setMembersReloadToken((x) => x + 1);
          setTeamRosterReloadToken((x) => x + 1);
          return;
        }
      }

      for (const uid of ids) {
        // Pace requests to avoid hitting server throttles when selecting many users.
        await sleep(250);
        const role = getBestRoleForUser(uid);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              user_id: Number(uid),
              role,
              period_id: String(seasonUuid),
            }),
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          // ignore duplicates
          if (!/already|exists|duplicate/i.test(text)) {
            throw new Error(text || 'Failed to assign user');
          }
        }
      }

      setSelectedEligibleUserIds((prev) => {
        const next = new Set(prev);
        for (const uid of ids) next.delete(uid);
        return next;
      });
      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to assign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const unassignMembershipsFromSeasonSquad = async (membershipIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    const ids = (membershipIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-row throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk-delete/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ membership_ids: ids }),
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to unassign users');
        }

        setSelectedSquadMembershipIds((prev) => {
          const next = new Set(prev);
          for (const membershipId of ids) next.delete(membershipId);
          return next;
        });
        setMembersReloadToken((x) => x + 1);
        setTeamRosterReloadToken((x) => x + 1);
        return;
      }

      for (const membershipId of ids) {
        // Pace requests to avoid hitting server throttles when unassigning many users.
        await sleep(200);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/${encodeURIComponent(membershipId)}/`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to unassign user');
        }
      }

      setSelectedSquadMembershipIds((prev) => {
        const next = new Set(prev);
        for (const membershipId of ids) next.delete(membershipId);
        return next;
      });
      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to unassign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Search for users that can be added to this season squad
  useEffect(() => {
    if (!userCanEditProject) return;
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    const q = String(memberSearch || '').trim();
    if (!projectIdForMembers || !seasonUuid || q.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('search', q);
        params.set('period', seasonUuid);
        const res = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/searchable-users/?${params.toString()}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('Failed to search users');
        const raw: any = await res.json();
        const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        if (!cancelled) setMemberSearchResults(list);
      } catch {
        if (!cancelled) setMemberSearchResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiBaseUrl, project, resolvedSeasonId, memberSearch, userCanEditProject]);

  // Fetch matches only when the user is on a tab that actually needs them.
  useEffect(() => {
    const needsMatches =
      activeTab === 'hierarchy' ||
      activeTab === 'matches' ||
      activeTab === 'competitions' ||
      activeTab === 'content';
    if (!needsMatches) return;
    const projectNumericId = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectNumericId || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMatchesLoading(true);
      try {
        // Server supports include_descendants so we can fetch season matches without scanning all activities.
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
          projectNumericId
        )}&period_id=${encodeURIComponent(
          seasonUuid
        )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;

        const seasonMatches = await fetchAllPages<any>(
          url,
          { credentials: 'include' },
          {
            ttlMs: 30_000,
            cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`,
            maxItems: 250,
          }
        );

        if (!cancelled) setMatches(seasonMatches);
      } catch (e) {
        console.error('Failed to fetch matches:', e);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, project, resolvedSeasonId]);

  // Fetch opponent club names from match metadata (opponent_club_id → project name)
  useEffect(() => {
    if (!matches.length || !apiBaseUrl) return;
    const clubIds = [...new Set(
      matches
        .map((m: any) => String(m.metadata?.teamreel?.match_context?.opponent_club_id || '').trim())
        .filter((id: string) => id && !opponentClubNames[id])
    )];
    if (!clubIds.length) return;

    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        clubIds.map(async (cid) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(cid)}/`, { credentials: 'include' });
            if (res.ok) {
              const raw: any = await res.json();
              const data = raw?.data ?? raw;
              if (data?.name) results[cid] = data.name;
            }
          } catch { /* ignore */ }
        })
      );
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl]);

  // Show club name (parent project) instead of team name (child project) in match titles
  const matchDisplayTitle = (m: any) => {
    // Prefer a clean title built from metadata club names
    const ctx = m.metadata?.teamreel?.match_context;
    const homeClubName = ctx?.home_club_name || '';
    const awayClubName = ctx?.away_club_name || '';
    const oppClubId = String(ctx?.opponent_club_id || '').trim();
    const resolvedAwayClub = oppClubId ? opponentClubNames[oppClubId] : '';
    const homeName = homeClubName || club?.name || project?.name || '';
    const awayName = resolvedAwayClub || awayClubName || m.opponent_project?.name || '';
    if (homeName && awayName) return `${homeName} vs ${awayName}`;

    // Fallback: string replacement on stored title
    let raw = m.title || m.name || '';
    if (project?.name && club?.name && project.name !== club.name) {
      raw = raw.replace(project.name, club.name);
    }
    const oppTeamName = m.opponent_project?.name || ctx?.away_team_name || '';
    const oppClubName = oppClubId ? opponentClubNames[oppClubId] : '';
    if (oppTeamName && oppClubName && oppTeamName !== oppClubName) {
      raw = raw.replace(oppTeamName, oppClubName);
    }
    return raw;
  };

  return (
    <>
      <div>
        <PageHeader
          title={season ? season.name : 'Season'}
          subtitle={(season as any)?.period_type === 'legends' ? 'Legends Seizoen' : undefined}
          actions={isPlayer ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(seasonsBasePath)}>
                Back
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Period type (regular / legends) */}
              <select
                value={(season as any)?.period_type || 'regular'}
                onChange={async (e) => {
                  const newType = e.target.value;
                  try {
                    const res = await fetch(
                      `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(season?.id))}/`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                        credentials: 'include',
                        body: JSON.stringify({ period_type: newType }),
                      },
                    );
                    if (!res.ok) throw new Error('Failed to update period type');
                    setSeason((prev: any) => prev ? { ...prev, period_type: newType } : prev);
                  } catch (err) {
                    console.error('Failed to update period type:', err);
                    alert('Kon seizoenstype niet opslaan');
                  }
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '4px 10px',
                  background: (season as any)?.period_type === 'legends' ? '#fffbeb' : 'white',
                  cursor: 'pointer',
                  color: (season as any)?.period_type === 'legends' ? '#d97706' : '#374151',
                }}
              >
                <option value="regular">Regulier</option>
                <option value="legends">Legends</option>
              </select>
              {(() => {
                const isActive = !!season && String(activeContext?.season?.id ?? '') === String((season as any)?.id ?? '');
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!season || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('season', String(season.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || (isActive ?? false)}
                    title="Set this season as your active context"
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      cursor: activatingContext || isActive ? 'not-allowed' : 'pointer',
                      opacity: activatingContext || isActive ? 0.8 : 1,
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    {isActive ? 'âœ“ Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button variant="secondary" size="sm" onClick={() => navigate(seasonsBasePath)}>
                Back
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedDetailPeriod(season);
                  setIsPeriodDetailModalOpen(true);
                }}
              >
                View
              </Button>
              {userCanEditProject && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedEditPeriod(season);
                    setIsPeriodEditModalOpen(true);
                  }}
                >
                  Edit
                </Button>
              )}
              {userCanDeleteProject && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete season ${season?.name}?`)) return;
                    try {
                      const res = await fetch(
                        `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(resolvedSeasonId || effectiveSeasonId)}/`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                          },
                          credentials: 'include',
                        }
                      );

                      if (res.ok) {
                        navigate(seasonsBasePath);
                      } else {
                        alert('Error deleting season');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Error deleting season');
                    }
                  }}
                  className={s.dangerText}
                >
                  Delete
                </Button>
              )}

              {userCanEditProject && (
                <Button variant="secondary" size="sm" onClick={() => setIsCreateTxnModalOpen(true)}>
                  Create transaction
                </Button>
              )}
            </div>
          )}
        />

        <CreateTransactionModal
          isOpen={isCreateTxnModalOpen}
          onClose={() => setIsCreateTxnModalOpen(false)}
          onCreated={() => {
            navigateToTab('transactions');
          }}
          title="Create season transaction"
          scope="season"
          organizationId={String(org?.id || '').trim()}
          defaultProjectId={project?.id != null ? String(project.id) : null}
          seasonId={String(resolvedSeasonId || effectiveSeasonId || '').trim() || null}
          periodId={String(resolvedSeasonId || effectiveSeasonId || '').trim() || null}
          activityId={null}
          currentUserId={Number((user as any)?.id)}
          chargedUserId={null}
          walletOptions={seasonWalletOptions}
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            ...(!isPlayer ? [{ id: 'overview', label: 'Overview' }] : []),
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'competitions', label: 'Competitions' },
            { id: 'matches', label: 'Matches' },
            ...(!isPlayer ? [{ id: 'squad', label: 'Squad' }] : []),
            ...(!isPlayer ? [{ id: 'team', label: 'Team' }] : []),
            ...(!isPlayer ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer ? [{ id: 'content', label: 'Content' }] : []),
            ...(!isPlayer ? [{ id: 'transactions', label: 'Transactions' }] : []),
            ...(!isPlayer ? [{ id: 'assets', label: 'Assets' }] : []),
            ...(!isPlayer ? [{ id: 'workflow', label: 'Workflow' }] : []),
          ]}
          activeTab={activeTab}
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <Card><div style={{ padding: '16px' }}>Loading...</div></Card>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Dates</div>
                      <div className="text-sm font-semibold mt-1">
                        {season?.start_date ? new Date(season.start_date).toLocaleDateString() : '"”'} "“{' '}
                        {season?.end_date ? new Date(season.end_date).toLocaleDateString() : '"”'}
                      </div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Competitions</div>
                      <div className="text-2xl font-bold mt-1">{competitions.length}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Matches</div>
                      <div className="text-2xl font-bold mt-1">{seasonMatchesCount}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Squad</div>
                      <div className="text-2xl font-bold mt-1">{members.length}</div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Overview content */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Competitions</h3>
                          <Button variant="secondary" size="sm" onClick={() => navigateToTab('competitions')}>
                            View All
                          </Button>
                        </div>
                        {competitionsLoading ? (
                          <div className="text-sm text-gray-500 py-4 text-center">Loading competitions…</div>
                        ) : competitions.length === 0 ? (
                          <div className="text-sm text-gray-500 py-4 text-center">No competitions in this season.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  <th style={compactThStyle}>Competition</th>
                                  <th style={compactThStyle}>Sport Variant</th>
                                  <th style={compactThStyle}>Matches</th>
                                  <th style={compactThStyle} className="text-right"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {competitions.slice(0, 5).map((competition) => (
                                  <tr key={competition.id}>
                                    <td style={compactTextTdStyle}>
                                      <Link
                                        to={
                                          isTeamRoute
                                            ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                                            : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                                        }
                                        className="hover:underline"
                                        style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#60a5fa' }}
                                      >
                                        {competition.name}
                                      </Link>
                                    </td>
                                    <td style={compactTdStyle}>
                                      {competition.sport ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>{competition.sport.sport_icon}</span>
                                          <span style={{ fontSize: '12px' }}>{competition.sport.name}</span>
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--app-muted-text)' }}>"”</span>
                                      )}
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <div style={compactActionsStyle}>
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => {
                                            setSelectedDetailPeriod(competition);
                                            setIsPeriodDetailModalOpen(true);
                                          }}
                                          style={tableActionButtonStyle('primary')}
                                        >
                                          View
                                        </button>
                                        {userCanEditProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={() => {
                                              setSelectedEditPeriod(competition);
                                              setIsPeriodEditModalOpen(true);
                                            }}
                                            style={tableActionButtonStyle('warning')}
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {userCanDeleteProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={async () => {
                                              if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                              try {
                                                const res = await fetch(`${apiBaseUrl}/api/v1/periods/${competition.id}/`, {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRFToken': getCsrfToken(),
                                                  },
                                                  credentials: 'include',
                                                });

                                                if (res.ok) {
                                                  setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(competition.id)));
                                                } else {
                                                  alert('Error deleting competition');
                                                }
                                              } catch (e) {
                                                console.error(e);
                                                alert('Error deleting competition');
                                              }
                                            }}
                                            style={tableActionButtonStyle('danger')}
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </Card>

                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Hierarchy</h3>
                          <Button variant="secondary" size="sm" onClick={() => navigateToTab('hierarchy')}>
                            View Hierarchy
                          </Button>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            Browse competitions and matches grouped by competition.
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Right Column: Quick Actions */}
                    <div className="space-y-6">
                      <Card>
                        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>

                        <div className="space-y-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className={s.quickActionBtn}
                            onClick={() => navigateToTab('identity')}
                          >
                            Brand Identity Settings
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className={s.quickActionBtn}
                            onClick={() => navigateToTab('competitions')}
                          >
                            Manage Competitions
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className={s.quickActionBtn}
                            onClick={() => navigateToTab('matches')}
                          >
                            View Matches
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className={s.quickActionBtn}
                            onClick={() => navigateToTab('squad')}
                          >
                            View Squad
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className={s.quickActionBtn}
                            onClick={() => navigateToTab('media')}
                          >
                             Media Matrix
                          </Button>
                        </div>
                      </Card>

                      {userCanEditProject && (
                        <Card>
                          <h3 className="text-lg font-semibold mb-3">Season Setup (Beta)</h3>
                          <div className="space-y-2">
                             <div className="text-xs text-gray-500 mb-2">
                               Quickly populate this season from previous data.
                             </div>
                             <Button
                                variant="secondary"
                                size="sm"
                                className={s.quickActionBtn}
                                onClick={() => alert('Smart Import: Allows selecting a source season (e.g. 23/24) to copy players into this campaign.')}
                              >
                                Import Squad from Previous Season
                              </Button>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'content' && (
                <div className={s.contentGrid}>
                  {/* Sport info header */}
                  {org?.sport && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Templates for: <Badge variant="info" size="sm">âš½ {org.sport.name}</Badge>
                      </div>
                      {templatesLoading && (
                        <div className="text-sm text-gray-400">Loading templates...</div>
                      )}
                    </div>
                  )}

                  {/* Season content types */}
                  <Card title="Season Content">
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}>
                      {CONTENT_TYPES.season?.items.map(item => {
                        const templates = availableTemplates[item.subtype] || [];
                        const matchedTemplate = templates[0];
                        const hasTemplate = !!matchedTemplate;
                        // Then vs Now types bypass ContentGenerationModal and use our dedicated modal
                        const isThenVsNow = item.subtype === 'transformation' || item.subtype === 'duo_portret' || item.subtype === 'duo_portret_cover' || item.subtype === 'duo_portret_overlay' || item.subtype === 'sidebyside_cover' || item.subtype === 'sidebyside_overlay' || item.subtype === 'walking_composite';

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (isThenVsNow) {
                                openThenVsNowModal(item.subtype as 'duo_portret' | 'duo_portret_cover' | 'duo_portret_overlay' | 'sidebyside_cover' | 'sidebyside_overlay' | 'transformation' | 'walking_composite');
                              } else if (hasTemplate) {
                                openContentModal(matchedTemplate, item.label);
                              }
                            }}
                            title={isThenVsNow
                              ? `Create ${item.label}`
                              : hasTemplate
                              ? `Create ${item.label}${matchedTemplate?.style_variant ? ` (${matchedTemplate.style_variant})` : ''}`
                              : `No ${item.label} template available`
                            }
                            className={s.contentTile}
                            style={{
                              border: (isThenVsNow || hasTemplate) ? '1px solid var(--app-border)' : '1px dashed var(--app-border)',
                              cursor: (isThenVsNow || hasTemplate) ? 'pointer' : 'not-allowed',
                              opacity: (isThenVsNow || hasTemplate) ? 1 : 0.5,
                              backgroundColor: (isThenVsNow || hasTemplate) ? 'var(--app-card-bg)' : 'var(--app-bg)',
                            }}
                            onMouseEnter={(e) => {
                              if (isThenVsNow || hasTemplate) {
                                e.currentTarget.style.borderColor = 'var(--app-primary)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--app-border)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div className={s.contentTileIcon} style={{
                              filter: (isThenVsNow || hasTemplate) ? 'none' : 'grayscale(100%)',
                            }}>
                              {item.icon}
                            </div>
                            <div className={s.contentTileLabel} style={{
                              color: (isThenVsNow || hasTemplate) ? 'var(--app-text)' : 'var(--app-muted-text)',
                            }}>
                              {item.label}
                            </div>
                            {hasTemplate && matchedTemplate && (
                              <div className={s.contentTileMeta}>
                                {matchedTemplate.style_variant && (
                                  <Badge variant="info" size="sm" className={s.badgeXs}>{matchedTemplate.style_variant}</Badge>
                                )}
                                {matchedTemplate.credits_required && matchedTemplate.credits_required > 0 && (
                                  <span className={s.creditsText}>
                                    {matchedTemplate.credits_required} cr
                                  </span>
                                )}
                              </div>
                            )}
                            {!hasTemplate && (
                              <div className={s.noTemplate}>"”</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Generated Content — completed video jobs */}
                  <Card title={`Generated Content${completedVideoJobs.length ? ` (${completedVideoJobs.length})` : ''}`}>
                    {contentVideoLoading && completedVideoJobs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-sm">Loading video jobs…</div>
                      </div>
                    )}
                    {!contentVideoLoading && completedVideoJobs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">{"\uD83D\uDCED"}</div>
                        <p>No content generated yet</p>
                        <p className="text-sm">Generated videos will appear here</p>
                      </div>
                    )}
                    {completedVideoJobs.length > 0 && (
                      <div className={s.videoGrid}>
                        {completedVideoJobs.map(job => {
                          const typeDisplay = getJobTypeDisplay(job.job_type);
                          // Differentiate video types based on config.video_type + composition_style
                          const videoType = (job.config as any)?.video_type;
                          const compStyle = (job.config as any)?.composition_style;
                          const tileLabel = (() => {
                            if (videoType === 'transformation') return { icon: '🔄', label: 'Transformation' };
                            if (videoType === 'walking_composite') return { icon: '🚶', label: 'Walking Composite' };
                            if (videoType === 'duo_portret' || videoType === 'photo_composite') {
                              if (compStyle === 'cover') return { icon: '👥', label: 'Duo Portret Cover' };
                              if (compStyle === 'overlay') return { icon: '👥', label: 'Duo Portret Overlay' };
                              return { icon: '👥', label: 'Duo Portret' };
                            }
                            if (videoType === 'sidebyside') {
                              if (compStyle === 'cover') return { icon: '⏪', label: 'Then vs Now Cover' };
                              if (compStyle === 'overlay') return { icon: '⏪', label: 'Then vs Now Overlay' };
                              return { icon: '⏪', label: 'Then & Now' };
                            }
                            return typeDisplay;
                          })();
                          const ago = (() => {
                            const diff = Date.now() - new Date(job.completed_at || job.created_at).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            return `${Math.floor(hrs / 24)}d ago`;
                          })();
                          const fileSize = (() => {
                            const bytes = (job as any).output_file?.size;
                            if (!bytes) return null;
                            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                          })();
                          // Stabilize video URL: cache the first presigned URL per job
                          // so polling doesn't cause <video> elements to reload
                          const stableUrl = (() => {
                            if (!job.output_url) return null;
                            const cached = stableVideoUrlsRef.current.get(job.id);
                            if (cached) return cached;
                            stableVideoUrlsRef.current.set(job.id, job.output_url);
                            return job.output_url;
                          })();
                          return (
                            <div
                              key={job.id}
                              onClick={() => {
                                if (stableUrl) {
                                  setPreviewVideoUrl(stableUrl);
                                  setPreviewVideoLabel(`${tileLabel.icon} ${tileLabel.label}`);
                                }
                              }}
                              className={s.videoCard}
                              style={{
                                border: '1px solid var(--app-border)',
                                backgroundColor: 'var(--app-card-bg, var(--app-surface))',
                                cursor: stableUrl ? 'pointer' : 'default',
                                transition: 'box-shadow 0.15s ease',
                              }}
                              onMouseEnter={(e) => { if (stableUrl) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              {/* Video thumbnail — use metadata preload + poster for first-frame preview */}
                              {stableUrl && (
                                <div className={s.videoThumbnail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <video
                                    src={stableUrl}
                                    preload="metadata"
                                    {...(job.thumbnail_url ? { poster: job.thumbnail_url } : {})}
                                    muted
                                    playsInline
                                    className={s.videoFill}
                                  />
                                </div>
                              )}
                              {/* Meta */}
                              <div className={s.videoCardMeta}>
                                <div className={s.videoCardHeader}>
                                  <span className={s.videoCardTitle}>
                                    {tileLabel.icon} {tileLabel.label}
                                  </span>
                                  <span className={s.statusPillComplete}>
                                    ✅ Completed
                                  </span>
                                </div>
                                <div className={s.videoCardInfo}>
                                  <span>{ago}</span>
                                  {fileSize && <span>{fileSize}</span>}
                                  <span className={s.monoId}>{job.id.slice(0, 8)}</span>
                                </div>
                                {stableUrl && (
                                  <a
                                    href={stableUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className={s.downloadLink}
                                  >
                                    ⬇ Download
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Video Preview Modal */}
                  {previewVideoUrl && (
                    <div
                      onClick={() => { setPreviewVideoUrl(null); setPreviewVideoLabel(''); }}
                      className={s.modalBackdrop}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={s.previewModalContainer}
                        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      >
                        <div className={s.previewModalHeader}>
                          <span className={s.previewTitle}>
                            {previewVideoLabel || 'Video Preview'}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <a
                              href={previewVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={s.downloadLink12}
                            >
                              ⬇ Download
                            </a>
                            <button
                              type="button"
                              onClick={() => { setPreviewVideoUrl(null); setPreviewVideoLabel(''); }}
                              className={s.closeButton}
                              style={{ lineHeight: 1, padding: '4px 8px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <video
                          src={previewVideoUrl}
                          controls
                          autoPlay
                          playsInline
                          className={s.videoPlayerFull}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}


              {activeTab === 'hierarchy' && (
                <Card>
                  <div className={s.hierarchyHeader}>
                    <div>
                      <div className={s.hierarchyTitle}>Hierarchy</div>
                      <div className={s.mutedSubtitle}>
                        Competitions â†’ Matches
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Input
                        value={hierarchySearch}
                        onChange={(e) => setHierarchySearch(e.target.value)}
                        placeholder="Search competitions/matches…"
                      />
                      {userCanEditProject && (
                        <>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => setIsCreateCompetitionModalOpen(true)}
                            style={actionButtonStyle('primary')}
                          >
                            Add Competition
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => setIsCreateMatchModalOpen(true)}
                            style={actionButtonStyle('primary')}
                          >
                            Add Match
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {competitionsLoading && competitions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                      Loading hierarchy...
                    </div>
                  ) : competitions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                      No competitions found.
                    </div>
                  ) : (
                    (() => {
                      const normalized = hierarchySearch.trim().toLowerCase();
                      const getMatchesForCompetition = (competition: any) => {
                        const competitionId = String((competition as any)?.id || '').trim();
                        if (!competitionId) return [];
                        return matches.filter((m: any) => {
                          const periodId = String(m.period_id || m.period?.id || (m as any)?.period || '');
                          return periodId === competitionId;
                        });
                      };

                      const filteredCompetitions = !normalized
                        ? competitions
                        : competitions.filter((c) => {
                            const compName = String(c?.name || '').toLowerCase();
                            if (compName.includes(normalized)) return true;
                            const compMatches = getMatchesForCompetition(c);
                            return compMatches.some((m: any) => {
                              const title = String(m?.title || m?.name || '').toLowerCase();
                              const startTime = String(m?.start_time || '').toLowerCase();
                              return title.includes(normalized) || startTime.includes(normalized);
                            });
                          });

                      return (
                        <div className={s.verticalList} style={{ marginTop: 12 }}>
                          {filteredCompetitions.map((competition) => {
                            const compId = String(competition.id);
                            const competitionKey = periodPathKey(competition) || compId;
                            const compMatches = getMatchesForCompetition(competition);
                            const visibleMatches = !normalized
                              ? compMatches
                              : compMatches.filter((m: any) => {
                                  const title = String(m?.title || m?.name || '').toLowerCase();
                                  const startTime = String(m?.start_time || '').toLowerCase();
                                  return title.includes(normalized) || startTime.includes(normalized);
                                });

                            const competitionPath = isTeamRoute
                              ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                              : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`;

                            return (
                              <div
                                key={compId}
                                className={s.competitionCard}
                              >
                                <div className={s.competitionCardHeader}>
                                  <div className={s.competitionCardInfo}>
                                    <button
                                      type="button"
                                      className={`app-unstyled-button hover:underline ${s.competitionLink}`}
                                      onClick={() => navigate(competitionPath)}
                                    >
                                      {competition.name || `Competition ${compId}`}
                                    </button>
                                    {competition.sport && (
                                      <div className={s.sportInfo}>
                                        <span>{competition.sport.sport_icon}</span>
                                        <span>{competition.sport.name}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span className={s.pill}>Matches: {getMatchCountForCompetition(competition)}</span>
                                    <span className={s.pill}>Participants: {getCompetitionParticipantsCount(competition)}</span>
                                    <button type="button" className="app-action-button" onClick={() => { setSelectedDetailPeriod(competition); setIsPeriodDetailModalOpen(true); }} style={actionButtonStyle('primary')}>
                                      View
                                    </button>
                                    {userCanEditProject && (
                                      <button type="button" className="app-action-button" onClick={() => { setSelectedEditPeriod(competition); setIsPeriodEditModalOpen(true); }} style={actionButtonStyle('warning')}>
                                        Edit
                                      </button>
                                    )}
                                    {userCanDeleteProject && (
                                      <button
                                        type="button"
                                        className="app-action-button"
                                        onClick={async () => {
                                          if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                          try {
                                            const res = await fetch(`${apiBaseUrl}/api/v1/periods/${competition.id}/`, {
                                              method: 'DELETE',
                                              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                              credentials: 'include',
                                            });
                                            if (res.ok) {
                                              setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(competition.id)));
                                            } else {
                                              alert('Error deleting competition');
                                            }
                                          } catch (e) {
                                            console.error(e);
                                            alert('Error deleting competition');
                                          }
                                        }}
                                        style={actionButtonStyle('danger')}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div style={{ padding: '10px 12px' }}>
                                  {matchesLoading ? (
                                    <div className="text-sm text-gray-500 py-2">Loading matches…</div>
                                  ) : visibleMatches.length === 0 ? (
                                    <div className="text-sm text-gray-500 py-2">No matches.</div>
                                  ) : (
                                    <div className={s.verticalListTight}>
                                      {visibleMatches.map((match: any) => {
                                        const matchKey = (match as any).slug || match.id;
                                        const matchPath = isTeamRoute
                                          ? `${seasonsBasePath}/${seasonPathKey}/${competitionKey}/${String(matchKey)}`
                                          : `/matches/${String(matchKey)}`;
                                        return (
                                          <div
                                            key={match.id}
                                            className={s.matchRow}
                                          >
                                            <div style={{ minWidth: 0 }}>
                                              <button
                                                type="button"
                                                className={`app-unstyled-button hover:underline ${s.matchLink}`}
                                                onClick={() => navigate(matchPath)}
                                              >
                                                {matchDisplayTitle(match)}
                                              </button>
                                              <div className={s.matchDate}>
                                                {match.start_time ? new Date(match.start_time).toLocaleString() : '"”'}
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                              <span className={s.pill}>Participants: {getMatchParticipantsCount(match)}</span>
                                              <button type="button" className="app-action-button" onClick={() => { setSelectedDetailMatch(match); setIsMatchDetailModalOpen(true); }} style={actionButtonStyle('primary')}>
                                                View
                                              </button>
                                              {userCanEditProject && (
                                                <button type="button" className="app-action-button" onClick={() => { setSelectedEditMatch(match); setIsMatchEditModalOpen(true); }} style={actionButtonStyle('warning')}>
                                                  Edit
                                                </button>
                                              )}
                                              {userCanDeleteProject && (
                                                <button
                                                  type="button"
                                                  className="app-action-button"
                                                  onClick={async () => {
                                                    if (!window.confirm(`Delete match ${match.title || match.name}?`)) return;
                                                    try {
                                                      const res = await fetch(`${apiBaseUrl}/api/v1/activities/${match.id}/`, {
                                                        method: 'DELETE',
                                                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                                        credentials: 'include',
                                                      });
                                                      if (res.ok) {
                                                        setMatches((prev) => prev.filter((m: any) => String(m.id) !== String(match.id)));
                                                      } else {
                                                        alert('Error deleting match');
                                                      }
                                                    } catch (e) {
                                                      console.error(e);
                                                      alert('Error deleting match');
                                                    }
                                                  }}
                                                  style={actionButtonStyle('danger')}
                                                >
                                                  Delete
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </Card>
              )}

              {activeTab === 'squad' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3">
                    <Card>
                  <div style={{ padding: '16px 16px 0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Season Squad</h3>
                      <Badge variant="default">{members.length} Members</Badge>
                    </div>
                    <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
                      Players and staff assigned to this season. Use the Team tab to add new members.
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    {membersLoading && <Alert variant="info">Loading squad…</Alert>}
                    {membersError && <Alert variant="error">{membersError}</Alert>}

                    {userCanEditProject && (
                      <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Input
                            value={squadSearch}
                            onChange={(e) => setSquadSearch(e.target.value)}
                            placeholder="Search squad"
                            style={{ width: '220px' }}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const allIds = (members || [])
                                .map((m: any) => String(m?.id || '').trim())
                                .filter(Boolean);
                              const allSelected =
                                allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                              setSelectedSquadMembershipIds(allSelected ? new Set() : new Set(allIds));
                            }}
                            disabled={bulkSubmitting || (members || []).length === 0}
                          >
                            {(() => {
                              const allIds = (members || [])
                                .map((m: any) => String(m?.id || '').trim())
                                .filter(Boolean);
                              const allSelected =
                                allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                              return allSelected ? 'Unselect all' : 'Select all';
                            })()}
                          </Button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => setIsAddSquadMemberModalOpen(true)}
                            style={ctaButtonStyle('neutral')}
                          >
                            Add User (advanced)
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            disabled={bulkSubmitting || selectedSquadMembershipIds.size === 0}
                            onClick={async () => {
                              const ids = Array.from(selectedSquadMembershipIds.values()).filter(Boolean);
                              await unassignMembershipsFromSeasonSquad(ids);
                            }}
                            style={ctaButtonStyle('danger')}
                            title="Unassign selected users from the squad"
                          >
                            Unassign ({selectedSquadMembershipIds.size})
                          </button>
                        </div>
                      </div>
                    )}

                    {userCanEditProject ? (
                      <>
                        {!membersLoading && !membersError && members.length === 0 ? (
                          <Alert variant="info">No members in this season squad. Go to the Team tab to assign team members.</Alert>
                        ) : !membersLoading && !membersError ? (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  <th style={{ ...compactThStyle, width: '44px' }}></th>
                                  <th style={compactThStyle}>Name</th>
                                  <th style={compactThStyle}>Email</th>
                                  <th style={compactThStyle}>Access</th>
                                  <th style={compactThStyle}>Functional</th>
                                  <th style={compactThStyle}>Position</th>
                                  <th style={compactThStyle}>#</th>
                                  <th style={{ ...compactThStyle, width: '180px' }} className="text-right">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleSquadMembers.map((m: any) => {
                                  const memberUser = m.user || m;
                                  const name =
                                    memberUser.name ||
                                    `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                                    memberUser.email ||
                                    '—';

                                  const email = memberUser.email || '—';
                                  const role = normalizeAccessRole(m.role || 'viewer');
                                  const rbacLabel = getRbacLabel(m.role || 'viewer');
                                  const functionalRoles = getFunctionalRolesFromMembership(m);
                                  const position = m.metadata?.position || '—';
                                  const shirtNumber = m.metadata?.shirt_number ?? '';
                                  const membershipId = String(m.id || '').trim();
                                  const checked = Boolean(membershipId && selectedSquadMembershipIds.has(membershipId));
                                  const href = memberDetailHref(membershipId);

                                  return (
                                    <tr key={membershipId}>
                                      <td style={compactTdStyle}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={!membershipId || bulkSubmitting}
                                          onChange={() => {
                                            if (!membershipId) return;
                                            toggleSquadMembership(membershipId);
                                          }}
                                        />
                                      </td>
                                      <td style={compactTextTdStyle}>
                                        {href ? (
                                          <Link
                                            to={href}
                                            className={`hover:underline ${s.appLink}`}
                                          >
                                            {name}
                                          </Link>
                                        ) : (
                                          name
                                        )}
                                      </td>
                                      <td style={compactTextTdStyle}>{email}</td>
                                      <td style={compactTdStyle}>
                                        <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                          {rbacLabel}
                                        </Badge>
                                      </td>
                                      <td style={compactTdStyle}>
                                        {functionalRoles.length ? (
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {functionalRoles.map((r: string) => (
                                              <Badge key={r} variant="default">
                                                {r}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td style={compactTextTdStyle}>{position}</td>
                                      <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                                      <td style={compactTdStyle} className="text-right">
                                        <div style={compactActionsStyle}>
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            disabled={!membershipId || bulkSubmitting}
                                            onClick={() => {
                                              if (!membershipId) return;
                                              setSelectedEditMember(m);
                                              setEditAccessRole(normalizeAccessRole(m.role || 'viewer') === 'admin' ? 'admin' : 'viewer');
                                              setIsEditMemberModalOpen(true);
                                            }}
                                            style={tableActionButtonStyle('primary')}
                                            title="Edit member details"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            disabled={!membershipId || bulkSubmitting}
                                            onClick={async () => {
                                              if (!membershipId) return;
                                              await unassignMembershipsFromSeasonSquad([membershipId]);
                                            }}
                                            style={tableActionButtonStyle('danger')}
                                            title="Unassign this user from the season squad"
                                          >
                                            Unassign
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      // Read-only view
                      <>
                        {!membersLoading && !membersError && members.length === 0 ? (
                          <Alert variant="info">No members found for this season.</Alert>
                        ) : !membersLoading && !membersError ? (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  <th style={compactThStyle}>Name</th>
                                  <th style={compactThStyle}>Email</th>
                                  <th style={compactThStyle}>Access</th>
                                  <th style={compactThStyle}>Functional</th>
                                  <th style={compactThStyle}>Position</th>
                                  <th style={compactThStyle}>#</th>
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((m: any) => {
                                  const memberUser = m.user || m;
                                  const name =
                                    memberUser.name ||
                                    `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                                    memberUser.email ||
                                    '—';

                                  const email = memberUser.email || '—';
                                  const role = normalizeAccessRole(m.role || 'viewer');
                                  const functionalRoles = getFunctionalRolesFromMembership(m);
                                  const position = m.metadata?.position || '—';
                                  const shirtNumber = m.metadata?.shirt_number ?? '';
                                  const href = memberDetailHref(String(m.id || '').trim());

                                  return (
                                    <tr key={String(m.id || memberUser.email)}>
                                      <td style={compactTextTdStyle}>
                                        {href ? (
                                          <Link
                                            to={href}
                                            className={`hover:underline ${s.appLink}`}
                                          >
                                            {name}
                                          </Link>
                                        ) : (
                                          name
                                        )}
                                      </td>
                                      <td style={compactTextTdStyle}>{email}</td>
                                      <td style={compactTdStyle}>
                                        <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                          {getRbacLabel(m.role || 'viewer')}
                                        </Badge>
                                      </td>
                                      <td style={compactTdStyle}>
                                        {functionalRoles.length ? (
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {functionalRoles.map((r: string) => (
                                              <Badge key={r} variant="default">
                                                {r}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td style={compactTextTdStyle}>{position}</td>
                                      <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3">
                    <Card>
                      <div style={{ padding: '16px 16px 0 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <h3 className={s.sectionTitle}>Team Members</h3>
                          <Badge variant="default">{eligibleTeamMembers.length} Available</Badge>
                        </div>
                        <div className={s.sectionSubtitle}>
                          Team members not yet assigned to this season. Select members to add them to the squad.
                        </div>
                      </div>

                      <div style={{ padding: '16px' }}>
                        {teamRosterLoading && <Alert variant="info">Loading team roster…</Alert>}
                        {teamRosterError && <Alert variant="error">{teamRosterError}</Alert>}

                        {userCanEditProject && (
                          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <Input
                              value={eligibleSearch}
                              onChange={(e) => setEligibleSearch(e.target.value)}
                              placeholder="Search team members"
                              style={{ width: '280px' }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                                setSelectedEligibleUserIds(allSelected ? new Set() : new Set(allIds));
                              }}
                              disabled={bulkSubmitting || eligibleTeamMembers.length === 0}
                            >
                              {(() => {
                                const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                                return allSelected ? 'Unselect all' : 'Select all';
                              })()}
                            </Button>
                            <button
                              type="button"
                              className="app-action-button"
                              disabled={bulkSubmitting || selectedEligibleUserIds.size === 0}
                              onClick={async () => {
                                const userIds = Array.from(selectedEligibleUserIds.values()).filter(Boolean);
                                await assignUsersToSeasonSquad(userIds);
                              }}
                              style={ctaButtonStyle('success')}
                              title="Assign selected users to the squad"
                            >
                              Assign to Squad ({selectedEligibleUserIds.size})
                            </button>
                          </div>
                        )}

                        {!teamRosterLoading && eligibleTeamMembers.length === 0 ? (
                          <Alert variant="info">All team members are already assigned to this season squad.</Alert>
                        ) : !teamRosterLoading ? (
                          <div className="overflow-x-auto">
                            <Table style={compactTableStyle}>
                              <thead>
                                <tr>
                                  {userCanEditProject && (
                                    <th style={{ ...compactThStyle, width: '44px' }}></th>
                                  )}
                                  <th style={compactThStyle}>Name</th>
                                  <th style={compactThStyle}>Email</th>
                                  <th style={compactThStyle}>Access</th>
                                  <th style={compactThStyle}>Functional</th>
                                  {userCanEditProject && (
                                    <th style={{ ...compactThStyle, width: '120px' }} className="text-right">
                                      Action
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {eligibleTeamMembers.map((m: any) => {
                                  const userId = getUserId(m);
                                  const { name, email } = getUserLabel(m);
                                  const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
                                  const role = getBestRoleForUser(userId);
                                  const functionalRoles = getFunctionalRolesForUser(userId);
                                  return (
                                    <tr key={`team-eligible:${userId || email}`}>
                                      {userCanEditProject && (
                                        <td style={compactTdStyle}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!userId || bulkSubmitting}
                                            onChange={() => {
                                              if (!userId) return;
                                              toggleEligibleUser(userId);
                                            }}
                                          />
                                        </td>
                                      )}
                                      <td style={compactTextTdStyle}>{name}</td>
                                      <td style={compactTextTdStyle}>{email}</td>
                                      <td style={compactTdStyle}>
                                        <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(role)}</Badge>
                                      </td>
                                      <td style={compactTdStyle}>
                                        {functionalRoles.length ? (
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {functionalRoles.map((r) => (
                                              <Badge key={r} variant="default">
                                                {r}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      {userCanEditProject && (
                                        <td style={compactTdStyle} className="text-right">
                                          <div style={compactActionsStyle}>
                                            <button
                                              type="button"
                                              className="app-action-button"
                                              disabled={!userId || bulkSubmitting}
                                              onClick={async () => {
                                                if (!userId) return;
                                                await assignUsersToSeasonSquad([userId]);
                                              }}
                                              style={tableActionButtonStyle('success')}
                                              title="Assign this user to the season squad"
                                            >
                                              Assign
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <div style={{ padding: '16px 16px 0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 className={s.sectionTitle}> Media Completion Matrix</h3>
                        <Badge variant="default">
                          {members.filter((m) => countProcessedMediaSlots(m) === MEDIA_SLOTS.length).length} / {members.length} Complete
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => setIsActiveJobsModalOpen(true)}
                          className={s.mediaHeaderBtn}
                          style={{ marginLeft: batchSelectedMemberIds.size > 0 ? undefined : 'auto' }}
                        >
                          ⚙️ Actieve Jobs
                        </Button>
                        {batchSelectedMemberIds.size > 0 && (
                          <Button
                            variant="primary"
                            onClick={() => setIsBatchModalOpen(true)}
                            className={s.mediaHeaderBtn}
                          >
                            🚀 Batch Genereer ({batchSelectedMemberIds.size})
                          </Button>
                        )}
                      </div>
                      <div className={s.sectionSubtitle}>
                        Selecteer members en klik &quot;Batch Genereer&quot; om AI assets in bulk te genereren.
                      </div>
                    </div>

                    <div style={{ padding: '16px' }}>
                      {membersLoading ? (
                        <Alert variant="info">Loading squad media status…</Alert>
                      ) : members.length === 0 ? (
                        <Alert variant="info">No squad members to show media status for.</Alert>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table style={compactTableStyle}>
                            <thead>
                              <tr>
                                <th style={{ ...compactThStyle, width: '36px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={batchSelectedMemberIds.size === members.length && members.length > 0}
                                    ref={(el) => { if (el) el.indeterminate = batchSelectedMemberIds.size > 0 && batchSelectedMemberIds.size < members.length; }}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setBatchSelectedMemberIds(new Set(members.map((m: any) => String(m.id))));
                                      } else {
                                        setBatchSelectedMemberIds(new Set());
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    title="Selecteer alles"
                                  />
                                </th>
                                <th style={{ ...compactThStyle, position: 'sticky', left: 0, background: 'var(--app-surface)', zIndex: 1 }}>Member</th>
                                {MEDIA_SLOTS.map((slot) => (
                                  <th key={slot.id} style={{ ...compactThStyle, textAlign: 'center', minWidth: '60px', height: '80px', verticalAlign: 'bottom', position: 'relative' }} title={slot.label}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{
                                        display: 'block',
                                        fontSize: '9px',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        transform: 'rotate(-45deg)',
                                        transformOrigin: 'center center',
                                        marginBottom: '4px',
                                        opacity: 0.8,
                                        letterSpacing: '0.02em',
                                      }}>{slot.label}</span>
                                      <span className={s.slotIcon}>{slot.icon}</span>
                                    </div>
                                  </th>
                                ))}
                                <th style={{ ...compactThStyle, textAlign: 'center' }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Guest Player row — always shown at top of matrix */}
                              <tr className={s.guestRow}>
                                <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                                  {/* No batch checkbox for guest */}
                                </td>
                                <td style={{ ...compactTextTdStyle, position: 'sticky', left: 0, background: 'rgba(167, 139, 250, 0.06)', zIndex: 1 }}>
                                  <span className={s.guestLabel}>🏃 Gast Speler</span>
                                </td>
                                {MEDIA_SLOTS.map((slot) => {
                                  // Guest supports: kit (fullbody), closeup, intro, celebration
                                  // Not applicable: profile, legacy_photo, then_vs_now, legacy
                                  const guestSlotMap: Record<string, { has: boolean; templateId: string; label: string }> = {
                                    kit: { has: !!guestPlayer?.has_avatar, templateId: 'fullbody_in_tenue', label: 'In Tenue' },
                                    closeup: { has: !!guestPlayer?.has_closeup, templateId: 'closeup_in_tenue', label: 'Close-up' },
                                    intro: { has: !!guestPlayer?.has_intro, templateId: 'member_intro', label: 'Short Intro' },
                                    celebration: { has: !!guestPlayer?.has_celebration, templateId: 'member_goal_celebration', label: 'Celebration' },
                                  };
                                  const guestSlot = guestSlotMap[slot.id];
                                  if (guestSlot) {
                                    // Closeup uses deterministic crop, not AI generation
                                    const handleClick = slot.id === 'closeup'
                                      ? () => cropGuestCloseup('home')
                                      : () => openGuestAiModal(guestSlot.templateId);
                                    return (
                                      <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                                        <span
                                          className={s.guestIndicator}
                                          title={guestSlot.has ? `${guestSlot.label}: Beschikbaar — klik om opnieuw te genereren` : `${guestSlot.label}: Klik om te genereren`}
                                          onClick={handleClick}
                                        >
                                          {guestSlot.has ? '✅' : '⬜'}
                                        </span>
                                      </td>
                                    );
                                  }
                                  // Other slots: dash (not applicable for guest)
                                  return (
                                    <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                                      <span className={s.indicatorDisabled} title={`${slot.label}: N.v.t. voor gast`}>—</span>
                                    </td>
                                  );
                                })}
                                <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                                  {(() => {
                                    const guestFilledCount = [
                                      guestPlayer?.has_avatar,
                                      guestPlayer?.has_closeup,
                                      guestPlayer?.has_intro,
                                      guestPlayer?.has_celebration,
                                    ].filter(Boolean).length;
                                    return (
                                      <Badge variant={guestFilledCount === 4 ? 'success' : 'default'}>
                                        {guestFilledCount}/4
                                      </Badge>
                                    );
                                  })()}
                                </td>
                              </tr>
                              {members.map((m: any) => {
                                const memberUser = m.user || m;
                                const name =
                                  memberUser.name ||
                                  `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                                  memberUser.email ||
                                  '"”';
                                const membershipId = String(m.id || '').trim();
                                const href = memberDetailHref(membershipId);
                                const filledCount = countProcessedMediaSlots(m);
                                const isComplete = filledCount === MEDIA_SLOTS.length;
                                const isBatchSelected = batchSelectedMemberIds.has(membershipId);

                                return (
                                  <tr key={String(m.id)} style={{ background: isBatchSelected ? 'rgba(59,130,246,0.06)' : undefined }}>
                                    <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={isBatchSelected}
                                        onChange={(e) => {
                                          setBatchSelectedMemberIds((prev) => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(membershipId);
                                            else next.delete(membershipId);
                                            return next;
                                          });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    </td>
                                    <td style={{ ...compactTextTdStyle, position: 'sticky', left: 0, background: isBatchSelected ? 'rgba(59,130,246,0.06)' : 'var(--app-surface)', zIndex: 1 }}>
                                      {href ? (
                                        <Link
                                          to={href}
                                          className={`hover:underline ${s.appLink}`}
                                        >
                                          {name}
                                        </Link>
                                      ) : (
                                        name
                                      )}
                                    </td>
                                    {MEDIA_SLOTS.map((slot) => {
                                      const procState = getMediaProcessingState(m, slot.id);
                                      // 3-state indicator: empty / raw / processing / processed
                                      const indicator = procState === 'processed' ? '✅'
                                        : procState === 'processing' ? '⏳'
                                        : procState === 'raw' ? '🔶'
                                        : '⬜';
                                      const title = procState === 'processed' ? `${slot.label}: Lineup-ready`
                                        : procState === 'processing' ? `${slot.label}: Bezig met bewerken…`
                                        : procState === 'raw' ? `${slot.label}: Ruw (nog niet bewerkt)`
                                        : `${slot.label}: Ontbreekt`;
                                      // Map matrix slot IDs to member detail page tab IDs
                                      const slotTabMap: Record<string, string> = {
                                        profile: 'input',
                                        legacy_photo: 'input',
                                        kit: 'assets',
                                        closeup: 'assets',
                                        legacy: 'assets',
                                      };
                                      const tabId = slotTabMap[slot.id] || slot.id;
                                      return (
                                        <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                                          {href ? (
                                            <Link
                                              to={`${href}?tab=${tabId}`}
                                              style={{ textDecoration: 'none' }}
                                              title={title}
                                            >
                                              <span className={s.indicatorIcon}>{indicator}</span>
                                            </Link>
                                          ) : (
                                            <span className={s.indicatorIcon} title={title}>{indicator}</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                                      <Badge variant={isComplete ? 'success' : filledCount > 0 ? 'warning' : 'default'}>
                                        {filledCount}/{MEDIA_SLOTS.length}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}

                      {/* Legend */}
                      <div className={s.legendBox}>
                        <div className={s.legendTitle}>Legend</div>
                        <div className={s.legendRow}>
                          {MEDIA_SLOTS.map((slot) => (
                            <div key={slot.id} className={s.legendItem}>
                              <span>{slot.icon}</span>
                              <span className={s.legendLabel}>{slot.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className={s.legendRowDivided}>
                          <div className={s.legendItem}>
                            <span>✅</span>
                            <span className={s.legendLabel}>Lineup-ready (bewerkt)</span>
                          </div>
                          <div className={s.legendItem}>
                            <span>🔶</span>
                            <span className={s.legendLabel}>Ruw (niet bewerkt)</span>
                          </div>
                          <div className={s.legendItem}>
                            <span>⏳</span>
                            <span className={s.legendLabel}>Bezig met bewerken</span>
                          </div>
                          <div className={s.legendItem}>
                            <span>⬜</span>
                            <span className={s.legendLabel}>Ontbreekt</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'competitions' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3">
                    <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <h3 className={s.sectionTitle}>Competitions</h3>
                      {userCanEditProject ? (
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => setIsCreateCompetitionModalOpen(true)}
                          style={ctaButtonStyle('primary')}
                        >
                          Add Competition
                        </button>
                      ) : null}
                    </div>
                    {competitionsLoading ? (
                      <Alert variant="info">Loading competitions…</Alert>
                    ) : competitions.length === 0 ? (
                      <Alert variant="info">No competitions found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Sport Variant</th>
                            <th style={compactThStyle}>Dates</th>
                            <th style={compactThStyle}>Matches</th>
                            <th style={compactThStyle}>Participants</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitions.map((competition) => (
                            <tr key={competition.id}>
                              <td style={compactTextTdStyle}>
                                <Link
                                  to={
                                    isTeamRoute
                                      ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                                      : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                                  }
                                  className={`hover:underline ${s.appLink}`}
                                >
                                  {competition.name}
                                </Link>
                              </td>
                              <td style={compactTdStyle}>
                                {competition.sport ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{competition.sport.sport_icon}</span>
                                    <span style={{ fontSize: '12px' }}>{competition.sport.name}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--app-muted-text)' }}>"”</span>
                                )}
                              </td>
                              <td style={compactTextTdStyle}>
                                {new Date(competition.start_date || '').toLocaleDateString()} "“{' '}
                                {new Date(competition.end_date || '').toLocaleDateString()}
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getCompetitionParticipantsCount(competition)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button
                                    type="button"
                                    className="app-action-button"
                                    onClick={() => {
                                      setSelectedDetailPeriod(competition);
                                      setIsPeriodDetailModalOpen(true);
                                    }}
                                    style={tableActionButtonStyle('primary')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setSelectedEditPeriod(competition);
                                        setIsPeriodEditModalOpen(true);
                                      }}
                                      style={tableActionButtonStyle('warning')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                        try {
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/periods/${competition.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': getCsrfToken(),
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
                                          } else {
                                            alert('Error deleting competition');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting competition');
                                        }
                                      }}
                                      style={tableActionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3">
                    <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <h3 className={s.sectionTitle}>Matches</h3>
                      {userCanEditProject ? (
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => setIsCreateMatchModalOpen(true)}
                          style={ctaButtonStyle('primary')}
                        >
                          Add Match
                        </button>
                      ) : null}
                    </div>
                    {matchesLoading ? (
                      <Alert variant="info">Loading matches…</Alert>
                    ) : matches.length === 0 ? (
                      <Alert variant="info">No matches found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Match</th>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Date</th>
                            <th className="hide-mobile" style={compactThStyle}>Participants</th>
                            <th className="hide-mobile text-right" style={compactThStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={match.id}>
                              <td style={compactTextTdStyle}>
                                {(() => {
                                  const compId = String(
                                    (match as any).period_id || match.period?.id || (match as any).period || ''
                                  ).trim();
                                  const compKey = periodPathKey((match as any).period || null) || compId;
                                  const matchKey = (match as any).slug || match.id;
                                  const matchPath = isTeamRoute
                                    ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
                                    : `/matches/${String(matchKey)}`;
                                  return (
                                <Link
                                      to={matchPath}
                                  className={`hover:underline ${s.appLink}`}
                                >
                                  {matchDisplayTitle(match)}
                                </Link>
                                  );
                                })()}
                              </td>
                              <td style={compactTextTdStyle}>
                                {match.period?.id ? (
                                  <Link
                                    to={
                                      isTeamRoute
                                        ? `${seasonsBasePath}/${seasonPathKey}/${String(match.period?.id)}`
                                        : `${seasonsBasePath}/${seasonPathKey}/competitions/${String(match.period?.id)}`
                                    }
                                    className={`hover:underline ${s.appLink}`}
                                  >
                                    {match.period?.name || 'Competition'}
                                  </Link>
                                ) : (
                                  match.period?.name || '"”'
                                )}
                              </td>
                              <td style={compactTextTdStyle}>
                                {match.start_time ? new Date(match.start_time).toLocaleString() : '"”'}
                              </td>
                              <td className="hide-mobile" style={compactTdStyle}>
                                <Badge variant="default">{getMatchParticipantsCount(match)}</Badge>
                              </td>
                              <td className="hide-mobile" style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button
                                    type="button"
                                    className="app-action-button"
                                    onClick={() => {
                                      setSelectedDetailMatch(match);
                                      setIsMatchDetailModalOpen(true);
                                    }}
                                    style={tableActionButtonStyle('primary')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setSelectedEditMatch(match);
                                        setIsMatchEditModalOpen(true);
                                      }}
                                      style={tableActionButtonStyle('warning')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete match ${match.title || match.name}?`)) return;
                                        try {
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/activities/${match.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': getCsrfToken(),
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setMatches((prev) => prev.filter((m) => m.id !== match.id));
                                          } else {
                                            alert('Error deleting match');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting match');
                                        }
                                      }}
                                      style={tableActionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                    </Card>
                  </div>
                </div>
              )}

            </>
          )}

          {activeTab === 'transactions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-3">
                <div style={{ display: 'grid', gap: '12px' }}>
                  <TransactionsPanel
                    title="Transactions"
                    description="Season-scoped transactions (usage_event.metadata.season_id)"
                    filters={{
                      organization_id: String(org?.id || ''),
                      project_id: String(project?.id || ''),
                      season_id: String(resolvedSeasonId || effectiveSeasonId || ''),
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && season && project && (
            <div className="space-y-6">
              {/* Brand Assets - logos, kits, sponsors with inheritance from club */}
              <AssetsTab
                level="season"
                organisationId={String(org?.id || orgSlugOrId || '')}
                projectId={String(project.id)}
                parentProjectId={club?.id ? String(club.id) : undefined}
                entityName={season.name}
              />

              {/* Quick Settings - logo_url and default_location for match prefill */}
              <IdentitySettingsCard
                title="Season Identity Settings"
                description="Optional identity fields (logo + default location) used for downstream UI."
                values={{
                  logoUrl: String((season as any)?.metadata?.identity?.logo_url || ''),
                  defaultLocation: String((season as any)?.metadata?.identity?.default_location || ''),
                }}
                canEdit={Boolean(userCanEditProject && season)}
                onSave={async (next) => {
                  if (!season?.id) throw new Error('Season not loaded');

                  const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(season.id))}/`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-CSRFToken': getCsrfToken(),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      metadata: {
                        ...((season as any)?.metadata || {}),
                        identity: {
                          ...(((season as any)?.metadata || {})?.identity || {}),
                          logo_url: String(next.logoUrl || '').trim() || null,
                          default_location: String(next.defaultLocation || '').trim() || null,
                        },
                      },
                    }),
                  });

                  if (!res.ok) {
                    const detail = await res.text().catch(() => '');
                    throw new Error(detail || `Failed to save season settings (${res.status})`);
                  }

                  const raw = await res.json().catch(() => null);
                  const updated: any = (raw?.data?.data || raw?.data || raw) as any;
                  setSeason((prev: any) => ({ ...(prev as any), ...(updated as any) }));
                }}
              />

              {/* Season Assets - sponsor overlay */}
              <SeasonAssetsCard
                seasonId={String(season?.id || '')}
                seasonName={String(season?.name || '')}
                seasonMetadata={(season as any)?.metadata || {}}
                clubAssets={(club as any)?.metadata?.teamreel_assets}
                onAssetsUpdated={() => {
                  window.location.reload();
                }}
              />
            </div>
          )}

          {activeTab === 'workflow' && season && project && (
            <WorkflowPanel
              projectId={String(project.id)}
              contentTypeName="period"
              objectId={String(season.id)}
            />
          )}
        </PageContent>

        <PeriodEditModal
          opened={isPeriodEditModalOpen}
          onClose={() => {
            setIsPeriodEditModalOpen(false);
            setSelectedEditPeriod(null);
          }}
          period={selectedEditPeriod}
          showSportVariant={!isSeasonPeriod(selectedEditPeriod)}
          organisationSportId={org?.sport?.id ? String(org.sport.id) : null}
          onSave={async (payload) => {
            if (!selectedEditPeriod) return;
            await savePeriodEdits(selectedEditPeriod, payload);
          }}
        />

        <PeriodDetailModal
          opened={isPeriodDetailModalOpen}
          onClose={() => {
            setIsPeriodDetailModalOpen(false);
            setSelectedDetailPeriod(null);
          }}
          period={selectedDetailPeriod}
        />

        <MatchDetailModal
          opened={isMatchDetailModalOpen}
          onClose={() => {
            setIsMatchDetailModalOpen(false);
            setSelectedDetailMatch(null);
          }}
          match={selectedDetailMatch}
        />

        <MatchEditModal
          opened={isMatchEditModalOpen}
          onClose={() => {
            setIsMatchEditModalOpen(false);
            setSelectedEditMatch(null);
          }}
          match={selectedEditMatch}
          onSave={async (payload) => {
            if (!selectedEditMatch) return;
            await saveMatchEdits(selectedEditMatch, payload);
          }}
        />

        <PeriodCreateModal
          opened={isCreateCompetitionModalOpen}
          onClose={() => setIsCreateCompetitionModalOpen(false)}
          title="Create Competition"
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          requireOrganisation
          requireClub
          requireTeam
          requireSeason
          showSportVariant
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          initialSeasonId={String(resolvedSeasonId || season?.id || '')}
          onCreate={async (payload) => {
            const orgIdValue = String(payload.organisation_id || org?.id || '').trim();
            const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
            const seasonIdValue = String(payload.parent_period_id || resolvedSeasonId || season?.id || '').trim();
            if (!orgIdValue) throw new Error('Select a federation first');
            if (!teamIdValue) throw new Error('Select a team first');
            if (!seasonIdValue) throw new Error('Select a season first');

            const res = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({
                organisation_id: orgIdValue,
                project_id: teamIdValue ? Number(teamIdValue) : undefined,
                parent_period_id: seasonIdValue,
                name: payload.name,
                description: payload.description,
                start_date: payload.start_date,
                end_date: payload.end_date,
                sport_id: payload.sport_id || undefined,
                metadata: { type: 'competition' },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create competition');
            }

            // Update UI immediately; refresh list in background.
            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setCompetitions((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((p: any) => String((p as any)?.id || '').trim() === createdId)) return list;
                  return [created as any, ...list];
                });
              }
            }

            // Reload competitions list (matches will be fetched on-demand).
            if (resolvedSeasonId) {
              void (async () => {
                setCompetitionsLoading(true);
                try {
                  const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(resolvedSeasonId)}&page_size=500`;
                  const competitionResults = await fetchAllPages<Period>(
                    competitionsUrl,
                    { credentials: 'include' },
                    { ttlMs: 10_000, cacheKey: `periods:children:${resolvedSeasonId}` }
                  );
                  setCompetitions(competitionResults);
                } finally {
                  setCompetitionsLoading(false);
                }
              })();
            }
          }}
        />

        <MatchCreateModal
          opened={isCreateMatchModalOpen}
          onClose={() => setIsCreateMatchModalOpen(false)}
          mode="season-detail"
          apiBaseUrl={apiBaseUrl}
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          initialSeasonId={String(resolvedSeasonId || season?.id || '')}
          onCreate={async (payload) => {
            const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
            const competitionIdValue = String(payload.period_id || '').trim();
            if (!teamIdValue) throw new Error('Select a team first');
            if (!competitionIdValue) throw new Error('Select a competition first');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({
                title: payload.title,
                activity_type: 'match',
                project_id: teamIdValue ? Number(teamIdValue) : undefined,
                opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
                period_id: competitionIdValue,
                start_time: payload.start_time,
                end_time: payload.end_time,
                location: payload.location,
                description: payload.description,
                metadata: {
                  venue: payload.venue || 'Home',
                  is_home: (payload.venue || 'Home') === 'Home',
                  ...(payload as any)?.metadata,
                },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create match');
            }

            // Update UI immediately; refresh matches in background if currently visible.
            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setMatches((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                  return [created, ...list];
                });
              }
            }

            // Refresh matches if currently visible.
            if (activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'competitions') {
              void (async () => {
                setMatchesLoading(true);
                try {
                  const projectNumericId = String((project as any)?.id || '').trim();
                  const seasonUuid = String(resolvedSeasonId || '').trim();
                  if (projectNumericId && seasonUuid) {
                    const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
                      projectNumericId
                    )}&period_id=${encodeURIComponent(
                      seasonUuid
                    )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;
                    const seasonMatches = await fetchAllPages<any>(
                      url,
                      { credentials: 'include' },
                      { ttlMs: 10_000, cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`, maxItems: 250 }
                    );
                    setMatches(seasonMatches);
                  }
                } finally {
                  setMatchesLoading(false);
                }
              })();
            }
          }}
        />

        <SeasonSquadAddMemberModal
          opened={isAddSquadMemberModalOpen}
          onClose={() => setIsAddSquadMemberModalOpen(false)}
          apiBaseUrl={apiBaseUrl}
          seasonId={String(resolvedSeasonId || '').trim()}
          organisations={createModalOrganisations as any}
          clubs={createModalClubs as any}
          teams={createModalTeams as any}
          initialOrganisationId={String(org?.id || '')}
          initialClubId={String((club as any)?.id || '')}
          initialTeamId={String((project as any)?.id || '')}
          onAdd={async (payload) => {
            const teamIdValue = String(payload.project_id || '').trim();
            const seasonUuid = String(resolvedSeasonId || '').trim();
            const userIdValue = String(payload.user_id || '').trim();
            if (!teamIdValue || !seasonUuid || !userIdValue) return;

            try {
              setAddingMember(true);
              const body: any = {
                user_id: Number(userIdValue),
                role: 'viewer',
                period_id: seasonUuid,
                metadata: {
                  position: String(payload.position || '').trim(),
                  shirt_number: String(payload.shirt_number || '').trim(),
                },
              };

              const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamIdValue)}/members/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify(body),
              });

              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to add member');
              }

              // Optimistically reflect the new membership in the current squad list.
              // (Prevents confusing UX when the add succeeds but the refreshed list is stale.)
              try {
                const created: any = await res.json().catch(() => null);
                const createdMembership = created?.data ?? created;
                const createdId = String(createdMembership?.id || '').trim();
                if (createdId) {
                  setMembers((prev) => {
                    const list = Array.isArray(prev) ? prev : [];
                    if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                    return [createdMembership, ...list];
                  });
                }
              } catch {
                // ignore
              }

              setMembersReloadToken((x) => x + 1);
            } finally {
              setAddingMember(false);
            }
          }}
        />

        {/* Edit Member Modal */}
        {isEditMemberModalOpen && selectedEditMember && (
          <div
            className={s.modalOverlay}
            onClick={() => setIsEditMemberModalOpen(false)}
          >
            <div
              className={s.editMemberModal}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={s.editMemberTitle}>
                Edit Member Roles
              </h2>

              <div style={{ marginBottom: '24px' }}>
                <div className={s.memberInfoRow}>
                  <strong className={s.memberInfoLabel}>Name:</strong>{' '}
                  {selectedEditMember.user?.name ||
                    `${selectedEditMember.user?.first_name || ''} ${selectedEditMember.user?.last_name || ''}`.trim() ||
                    selectedEditMember.user?.email ||
                    '—'}
                </div>
                <div className={s.memberInfoRow}>
                  <strong className={s.memberInfoLabel}>Email:</strong> {selectedEditMember.user?.email || '—'}
                </div>
              </div>

              {/* Access Role Section */}
              <div style={{ marginBottom: '24px' }}>
                <label className={s.fieldLabel}>
                  🔐 Access Role
                </label>
                <div className={s.radioGroup}>
                  {accessRoleOptions.map((opt) => {
                    const isSelected = editAccessRole === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={s.radioCard}
                        style={{
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #475569',
                          backgroundColor: isSelected ? '#1e3a5f' : '#334155',
                        }}
                      >
                        <input
                          type="radio"
                          name="accessRole"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => setEditAccessRole(opt.value)}
                          className={s.radioInput}
                        />
                        <div>
                          <div className={s.radioCardTitle}>
                            {opt.icon} {opt.label}
                          </div>
                          <div className={s.radioCardDesc}>
                            {opt.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className={s.fieldLabel}>
                  Functional Roles
                </label>
                <div className={s.roleGrid}>
                  {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map((role) => {
                    const currentRoles = getFunctionalRolesFromMembership(selectedEditMember);
                    const isChecked = currentRoles.includes(role);

                    return (
                      <label
                        key={role}
                        className={s.checkboxCard}
                        style={{
                          backgroundColor: isChecked ? '#1e40af' : '#334155',
                          borderColor: isChecked ? '#3b82f6' : '#475569',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedEditMember((prev: any) => {
                              if (!prev) return prev;
                              const currentRoles = getFunctionalRolesFromMembership(prev);
                              let newRoles: string[];

                              if (checked) {
                                newRoles = [...currentRoles, role];
                              } else {
                                newRoles = currentRoles.filter((r: string) => r !== role);
                              }

                              return {
                                ...prev,
                                functional_roles: newRoles,
                              };
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span className={s.roleLabel}>{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={s.modalActions}>
                <button
                  onClick={() => setIsEditMemberModalOpen(false)}
                  className={s.btnCancel}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const membershipId = String(selectedEditMember.id || '').trim();
                      if (!membershipId) {
                        alert('No membership ID found');
                        return;
                      }

                      // Check if membershipId is a valid UUID
                      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(membershipId);

                      console.log('💾 Member data check:', {
                        membershipId,
                        isValidUuid,
                        memberData: selectedEditMember,
                        user: {
                          id: (selectedEditMember as any)?.user?.id,
                          email: (selectedEditMember as any)?.user?.email,
                        },
                      });

                      if (!isValidUuid) {
                        alert(`Cannot save: Invalid membership ID format (${membershipId}). This member may need to be re-added to the squad.`);
                        return;
                      }

                      const functionalRoles = getFunctionalRolesFromMembership(selectedEditMember);
                      const projectIdForApi = String((project as any)?.id || '').trim();

                      if (!projectIdForApi) {
                        alert('Project ID not found');
                        return;
                      }

                      console.log('💾 Saving member roles:', {
                        membershipId,
                        projectId: projectIdForApi,
                        functionalRoles,
                        url: `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/members/${encodeURIComponent(membershipId)}/`,
                      });

                      const res = await fetch(
                        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/members/${encodeURIComponent(membershipId)}/`,
                        {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            role: editAccessRole,
                            metadata: {
                              ...((selectedEditMember as any)?.metadata || {}),
                              functional_roles: functionalRoles,
                            },
                          }),
                        }
                      );

                      if (!res.ok) {
                        const text = await res.text();
                        console.error('❌ Save failed:', text);
                        throw new Error(text || 'Failed to update member');
                      }

                      const responseData = await res.json();
                      console.log('✅ Save response:', responseData);

                      // Update local state
                      setMembers((prev) =>
                        prev.map((m: any) =>
                          String(m.id || '').trim() === membershipId
                            ? { ...m, role: editAccessRole, functional_roles: functionalRoles }
                            : m
                        )
                      );

                      setIsEditMemberModalOpen(false);
                      setSelectedEditMember(null);
                    } catch (err: any) {
                      alert(err.message || 'Failed to update member');
                    }
                  }}
                  className={s.btnSave}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Generation Modal */}
        <ContentGenerationModal
          isOpen={isContentModalOpen}
          onClose={closeContentModal}
          onGenerated={handleContentGenerated}
          matchData={null}
          organisationSport={org?.sport || null}
          organisationId={org?.id || null}
          template={selectedTemplate}
          contentTypeLabel={selectedContentTypeLabel}
        />

        {/* Guest Player AI Generation Modal */}
        <AssetGenerationModal
          isOpen={showGuestAiModal}
          onClose={() => {
            setShowGuestAiModal(false);
          }}
          context="guest"
          preSelectedTemplate={guestAiPreselectedTemplate}
          projectId={String(project?.id || '')}
          organisationId={String(org?.id || '')}
          requireApproval
          inputAssets={{
            logo: clubBrand.getAsset?.('logo_upload')
              ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
              : null,
            sponsor: clubBrand.getAsset?.('sponsor_logo_upload')
              ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
              : null,
            reference: (() => {
              const kitAsset = clubBrand.getAsset?.('kit_home_combined') || clubBrand.getAsset?.('kit_home');
              return kitAsset ? getAssetUrl(kitAsset.url) : null;
            })(),
            // For closeup/intro/celebration: use guest fullbody as person input
            // For fullbody: no person (backend generates silhouette)
            person: guestAiPreselectedTemplate !== 'fullbody_in_tenue'
              ? (() => {
                  const gp = guestPlayer?.guest_player || {};
                  const fullbodyHome = gp?.images?.fullbody?.home;
                  const path = fullbodyHome?.processed || fullbodyHome?.raw;
                  return path ? (path.startsWith('http') ? path : getAssetUrl(path)) : null;
                })()
              : null,
          }}
          initialParams={{
            kit_type: guestAiSelectedKitType,
            role: 'player',
          }}
          onAssetSaved={() => {
            setShowGuestAiModal(false);
            // Reload project to pick up updated guest_player metadata
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }}
        />

        {/* Batch AI Generation Modal */}
        <BatchGenerationModal
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false);
          }}
          members={batchMembers}
          projectId={String(project?.id || '')}
          organisationId={String(org?.id || '')}
          brandAssets={batchBrandAssets}
          onBatchComplete={() => {
            setMembersReloadToken((t) => t + 1);
            setBatchSelectedMemberIds(new Set());
          }}
        />

        {/* Active Processing Jobs Modal */}
        <ActiveJobsModal
          isOpen={isActiveJobsModalOpen}
          onClose={() => setIsActiveJobsModalOpen(false)}
          projectId={String(project?.id || '')}
        />

        {/* Then vs Now compilation modal (member picker → submit → auto-close) */}
        {thenVsNowModalOpen && (
          <div
            className={s.thenNowBackdrop}
            onClick={() => { if (thenVsNowModalStep !== 'generating') closeThenVsNowModal(); }}
          >
            <div
              className={s.thenNowModal}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className={s.thenNowHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    Compilatie — {
                      thenVsNowModalType === 'duo_portret_cover' ? 'Duo Portret Cover'
                        : thenVsNowModalType === 'duo_portret_overlay' ? 'Duo Portret Overlay'
                        : thenVsNowModalType === 'duo_portret' ? 'Duo Portret'
                        : thenVsNowModalType === 'sidebyside_cover' ? 'Then vs Now Cover'
                        : thenVsNowModalType === 'sidebyside_overlay' ? 'Then vs Now Overlay'
                        : thenVsNowModalType === 'walking_composite' ? 'Walking Composite'
                        : 'Transformation'
                    }
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginTop: '2px' }}>
                    {thenVsNowModalStep === 'members' ? 'Selecteer spelers voor de compilatie video'
                      : thenVsNowModalStep === 'generating' ? 'Job wordt aangemaakt...'
                      : thenVsNowModalStep === 'submitted' ? 'Job is gestart!'
                      : 'Er is een fout opgetreden'}
                  </div>
                </div>
                {thenVsNowModalStep !== 'generating' && (
                  <button
                    onClick={closeThenVsNowModal}
                    className={s.modalCloseBtn}
                  >&times;</button>
                )}
              </div>

              {/* Step: Member selection with ordering */}
              {thenVsNowModalStep === 'members' && (() => {
                const eligible = thenVsNowEligibleMembers.filter((m: any) =>
                  thenVsNowModalType === 'duo_portret' ? m.hasDuoPortret
                    : thenVsNowModalType === 'duo_portret_cover' ? m.hasDuoPortretCover
                    : thenVsNowModalType === 'duo_portret_overlay' ? m.hasDuoPortretOverlay
                    : thenVsNowModalType === 'sidebyside_cover' ? m.hasSidebysideCover
                    : thenVsNowModalType === 'sidebyside_overlay' ? m.hasSidebysideOverlay
                    : thenVsNowModalType === 'walking_composite' ? m.hasWalkingComposite
                    : m.hasTransformation
                );
                const eligibleMap = new Map(eligible.map((m: any) => [m.id, m]));
                const q = thenVsNowModalSearch.toLowerCase().trim();

                // Selected members in order (with data)
                const selectedOrdered = thenVsNowModalSelected
                  .map((id: string) => eligibleMap.get(id))
                  .filter(Boolean);

                // Unselected members (for the "add" section)
                const unselected = eligible.filter((m: any) => !thenVsNowModalSelected.includes(m.id));
                const filteredUnselected = q ? unselected.filter((m: any) => m.name.toLowerCase().includes(q)) : unselected;

                const moveUp = (idx: number) => {
                  if (idx <= 0) return;
                  const next = [...thenVsNowModalSelected];
                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                  setThenVsNowModalSelected(next);
                };
                const moveDown = (idx: number) => {
                  if (idx >= thenVsNowModalSelected.length - 1) return;
                  const next = [...thenVsNowModalSelected];
                  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                  setThenVsNowModalSelected(next);
                };
                const removeItem = (id: string) => {
                  setThenVsNowModalSelected(thenVsNowModalSelected.filter((x: string) => x !== id));
                };
                const addItem = (id: string) => {
                  if (!thenVsNowModalSelected.includes(id)) {
                    setThenVsNowModalSelected([...thenVsNowModalSelected, id]);
                  }
                };

                return (
                  <div style={{ padding: '16px 20px' }}>
                    {/* Select all / deselect all */}
                    <div className={s.selectAllRow}>
                      <div className={s.selectionCounter}>
                        {thenVsNowModalSelected.length} van {eligible.length} speler{eligible.length !== 1 ? 's' : ''} geselecteerd
                      </div>
                      <button
                        onClick={() => {
                          if (thenVsNowModalSelected.length === eligible.length) {
                            setThenVsNowModalSelected([]);
                          } else {
                            setThenVsNowModalSelected(eligible.map((m: any) => m.id));
                          }
                        }}
                        className={s.selectAllBtn}
                      >
                        {thenVsNowModalSelected.length === eligible.length ? 'Deselecteer alles' : 'Selecteer alles'}
                      </button>
                    </div>

                    {/* Selected members — ordered list with reorder controls */}
                    {selectedOrdered.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div className={s.sectionLabel}>
                          Volgorde in video
                        </div>
                        <div className={s.orderedList}>
                          {selectedOrdered.map((m: any, idx: number) => (
                            <div
                              key={m.id}
                              className={s.orderedMemberRow}
                              style={{
                                borderBottom: idx < selectedOrdered.length - 1 ? '1px solid var(--app-border)' : 'none',
                              }}
                            >
                              {/* Order number */}
                              <span className={s.orderNumber}>
                                {idx + 1}
                              </span>
                              {/* Name + info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={s.memberName}>{m.name}</div>
                                <div className={s.memberMeta}>
                                  {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                                  {m.position && <span>{m.position}</span>}
                                </div>
                                {/* Transformation variant picker (when member has multiple variants) */}
                                {thenVsNowModalType === 'transformation' && m.transformationKeys && m.transformationKeys.length > 1 && (
                                  <div className={s.variantRow}>
                                    {m.transformationKeys.map((vk: string) => {
                                      const label = vk.replace('transformation_', '').replace('transformation', 'default').replace(/_/g, ' ');
                                      const isSelected = (thenVsNowVariantKeys[m.id] || '') === vk;
                                      const isDefault = !thenVsNowVariantKeys[m.id] && vk === m.transformationKeys[0];
                                      return (
                                        <button
                                          key={vk}
                                          onClick={() => setThenVsNowVariantKeys(prev => ({ ...prev, [m.id]: vk }))}
                                          className={s.variantPill}
                                          style={{
                                            border: (isSelected || isDefault) ? '1px solid var(--app-primary, #2563eb)' : '1px solid var(--app-border)',
                                            backgroundColor: (isSelected || isDefault) ? 'var(--app-primary, #2563eb)' : 'transparent',
                                            color: (isSelected || isDefault) ? '#fff' : 'var(--app-muted-text)',
                                          }}
                                        >{label}</button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Move up */}
                              <button
                                onClick={() => moveUp(idx)}
                                disabled={idx === 0}
                                title="Omhoog"
                                className={s.arrowBtn}
                                style={{ cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.25 : 0.7 }}
                              >{"\u25B2"}</button>
                              {/* Move down */}
                              <button
                                onClick={() => moveDown(idx)}
                                disabled={idx === selectedOrdered.length - 1}
                                title="Omlaag"
                                className={s.arrowBtn}
                                style={{ cursor: idx === selectedOrdered.length - 1 ? 'default' : 'pointer', opacity: idx === selectedOrdered.length - 1 ? 0.25 : 0.7 }}
                              >{"\u25BC"}</button>
                              {/* Remove */}
                              <button
                                onClick={() => removeItem(m.id)}
                                title="Verwijderen"
                                className={s.removeBtn}
                              >{"\u2715"}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unselected members — add to list */}
                    {unselected.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <div className={s.unselectedHeader}>
                            Beschikbare spelers
                          </div>
                          <input
                            type="text"
                            placeholder="Zoek..."
                            value={thenVsNowModalSearch}
                            onChange={(e) => setThenVsNowModalSearch(e.target.value)}
                            style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                          />
                        </div>
                        <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '160px', overflowY: 'auto' }}>
                          {filteredUnselected.length === 0 ? (
                            <div className={s.emptyState}>
                              Geen spelers gevonden
                            </div>
                          ) : filteredUnselected.map((m: any) => (
                            <div
                              key={m.id}
                              onClick={() => addItem(m.id)}
                              className={s.clickableRow}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--app-surface-2, #2a2a3e)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <span className={s.addIcon}>+</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={s.memberName}>{m.name}</div>
                                <div className={s.memberMeta}>
                                  {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                                  {m.position && <span>{m.position}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Background / Location selector — hidden for cover mode (no background needed) */}
                    {thenVsNowBackgrounds.length > 0 && thenVsNowModalType !== 'duo_portret_cover' && thenVsNowModalType !== 'sidebyside_cover' && (
                      <div style={{ marginTop: '16px' }}>
                        <div className={s.sectionLabel}>
                          Achtergrond / Locatie
                        </div>
                        <div className={s.bgSelectorGrid}>
                          {/* Default option */}
                          <button
                            onClick={() => setThenVsNowSelectedBgUrl(null)}
                            style={{
                              position: 'relative',
                              border: !thenVsNowSelectedBgUrl
                                ? '2px solid var(--app-primary, #2563eb)'
                                : '1px solid var(--app-border, #333)',
                              borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', padding: 0,
                              background: !thenVsNowSelectedBgUrl ? 'var(--app-surface-2, #2a2a3e)' : 'transparent',
                            }}
                          >
                            <div className={s.bgPreviewDefault}>
                              <span style={{ fontSize: '20px' }}>{"\u26BD"}</span>
                            </div>
                            <div className={s.bgOptionLabel} style={{ color: !thenVsNowSelectedBgUrl ? '#fff' : 'var(--app-muted-text)', background: !thenVsNowSelectedBgUrl ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)' }}>
                              Standaard
                            </div>
                            {!thenVsNowSelectedBgUrl && (
                              <div className={s.checkBadge}>{"\u2713"}</div>
                            )}
                          </button>
                          {/* App-level backgrounds */}
                          {thenVsNowBackgrounds.map((bg) => {
                            const isSelected = thenVsNowSelectedBgUrl === bg.url;
                            return (
                              <button
                                key={bg.id}
                                onClick={() => setThenVsNowSelectedBgUrl(bg.url)}
                                style={{
                                  position: 'relative',
                                  border: isSelected
                                    ? '2px solid var(--app-primary, #2563eb)'
                                    : '1px solid var(--app-border, #333)',
                                  borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', padding: 0,
                                  background: isSelected ? 'var(--app-surface-2, #2a2a3e)' : 'transparent',
                                }}
                              >
                                <div style={{ width: '100%', aspectRatio: '9/16', background: `url(${bg.url}) center/cover` }} />
                                <div className={s.bgOptionLabel} style={{
                                  color: isSelected ? '#fff' : 'var(--app-muted-text)',
                                  background: isSelected ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {bg.label || bg.profile_name || 'Locatie'}
                                </div>
                                {isSelected && (
                                  <div className={s.checkBadge}>{"\u2713"}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Step: Generating (brief loading while POST in progress) */}
              {thenVsNowModalStep === 'generating' && (
                <div className={s.statusStep}>
                  <div className={s.statusEmoji}>{"\u23F3"}</div>
                  <div className={s.statusTitle}>
                    Job wordt aangemaakt...
                  </div>
                </div>
              )}

              {/* Step: Submitted — confirmation, auto-closes */}
              {thenVsNowModalStep === 'submitted' && (
                <div className={s.statusStep}>
                  <div className={s.statusEmoji}>{"\u2705"}</div>
                  <div className={s.statusTitle}>
                    Job gestart!
                  </div>
                  <div className={s.statusDesc}>
                    {thenVsNowModalSelected.length} speler{thenVsNowModalSelected.length !== 1 ? 's' : ''} • Video wordt op de achtergrond verwerkt
                  </div>
                  <div className={s.statusDesc}>
                    Bekijk de voortgang bij <strong>Workflow</strong> of in de <strong>Video Jobs</strong> queue.
                  </div>
                </div>
              )}

              {/* Step: Error */}
              {thenVsNowModalStep === 'error' && (
                <div className={s.statusStep}>
                  <div className={s.statusEmoji}>{"\u274C"}</div>
                  <div className={s.statusTitleError}>
                    Generatie mislukt
                  </div>
                  <div className={s.statusDesc}>
                    {thenVsNowModalError || 'Unknown error'}
                  </div>
                </div>
              )}

              {/* Modal footer */}
              <div className={s.thenNowFooter}>
                {thenVsNowModalStep === 'members' && (
                  <>
                    <button
                      onClick={closeThenVsNowModal}
                      className={s.modalBtnSecondary}
                    >Annuleren</button>
                    <button
                      onClick={submitThenVsNowCompilation}
                      disabled={thenVsNowModalSelected.length === 0}
                      className={s.modalBtnPrimary}
                      style={{
                        cursor: thenVsNowModalSelected.length > 0 ? 'pointer' : 'not-allowed',
                        background: thenVsNowModalSelected.length > 0 ? '#6366f1' : '#6b7280',
                        opacity: thenVsNowModalSelected.length > 0 ? 1 : 0.5,
                      }}
                    >{"\uD83C\uDFAC"} Genereer Video ({thenVsNowModalSelected.length})</button>
                  </>
                )}
                {thenVsNowModalStep === 'submitted' && (
                  <button
                    onClick={closeThenVsNowModal}
                    className={s.modalBtnSecondary}
                  >Sluiten</button>
                )}
                {thenVsNowModalStep === 'error' && (
                  <>
                    <button
                      onClick={() => setThenVsNowModalStep('members')}
                      className={s.modalBtnSecondary}
                    >{"\u2190"} Terug</button>
                    <button
                      onClick={closeThenVsNowModal}
                      className={s.modalBtnSecondary}
                    >Sluiten</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className={s.toastContainer}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={s.toast}
              style={{
                background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#1e40af',
              }}
            >
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className={s.toastDismiss}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ProjectSeasonDetailPage;
