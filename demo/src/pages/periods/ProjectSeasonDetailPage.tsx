import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import SeasonAssetsCard from '../../components/SeasonAssetsCard';
import { AssetsTab } from '../../components/AssetsTab';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MEDIA_SLOTS, MediaSlotId } from '../../constants/mediaSlots';
import { memberHasMedia, countFilledMediaSlots, countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import { getApiBaseUrl } from '../../utils/apiBase';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import {
  PageContent,
  PageHeader,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchEditModal from '../identity/MatchEditModal';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodCreateModal from '../identity/PeriodCreateModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import SeasonSquadAddMemberModal from '../identity/SeasonSquadAddMemberModal';
import ContentGenerationModal, { CONTENT_TYPES, type ContentTemplate } from '../identity/ContentGenerationModal';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { BatchGenerationModal, type BatchMember } from '../../components/BatchGenerationModal';
import { ActiveJobsModal } from '../../components/ActiveJobsModal';
import { AssetGenerationModal, type SavedAssetInfo } from '../../components/AssetGenerationModal';
import { useBrandProfile, getAssetUrl, KIT_ROLES } from '../../hooks/useBrandProfile';
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

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date: string;
  end_date: string;
  period_type?: string;
  parent_period?: { id: string; name: string } | null;
  children_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  sport_id?: string | number | null;
  sport?: {
    id: string | number;
    name: string;
    sport_icon?: string | null;
    category_name?: string | null;
  } | null;
};

type ListResponse<T> = {
  results: T[];
  count: number;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
};

type Organisation = {
  id: string;
  name: string;
  slug?: string;
  user_role?: 'admin' | 'member';
  sport?: {
    id: string | number;
    name: string;
    slug: string;
    sport_icon?: string;
  } | null;
};

// MEDIA_SLOTS, memberHasMedia, countFilledMediaSlots imported from shared utils

const getCsrfToken = (): string => {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] ||
    ''
  );
};

const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

const isSeasonPeriod = (p: any): boolean => {
  // TeamReel hierarchy: Season is a root Period (no parent_period).
  // Do NOT infer by name; rely on parent/type.
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;

  // Guard against misconfigured root competitions.
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

  return true;
};

export const ProjectSeasonDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId, projectId, seasonId, clubId } = useParams<{ orgId: string; projectId: string; seasonId: string; clubId?: string }>();
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const apiBaseUrl = getApiBaseUrl();

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

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');
  const [seasonsForSwitcher, setSeasonsForSwitcher] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
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
  const [thenVsNowModalType, setThenVsNowModalType] = useState<'sidebyside' | 'transformation' | 'photo_composite'>('sidebyside');
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
  const [loading, setLoading] = useState(true);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

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

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';

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

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

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

  // Permission checks (match ProjectDetailPage logic)
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const orgIdMatches = (candidate: any) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String((org as any)?.id || '').trim();
      const oslug = String((org as any)?.slug || '').trim();
      const route = String(orgSlugOrId || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };

    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((org as any)?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const projectDetailPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const seasonPathKey = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();

  const memberDetailHref = (membershipId: string): string => {
    const mid = String(membershipId || '').trim();
    if (!mid) return '';
    // Member detail is only supported on vanity team routes.
    if (!isTeamRoute) return '';
    if (!seasonPathKey) return '';
    return `${seasonsBasePath}/${seasonPathKey}/${encodeURIComponent(mid)}`;
  };

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'team', 'media', 'transactions', 'assets', 'workflow']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

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

  // ── Brand profile for club-level assets (needed by guest avatar + batch modal) ──
  const clubProjectId = isTeamRoute ? (club as any)?.id : project?.id;
  const clubBrand = useBrandProfile({
    projectId: clubProjectId ? String(clubProjectId) : undefined,
    organisationId: String(org?.id || ''),
    autoFetch: !!clubProjectId,
  });

  // ── Brand profile for team-level assets (kits may differ from club) ──
  const teamProjectId = isTeamRoute ? (project as any)?.id : null;
  const teamBrand = useBrandProfile({
    projectId: teamProjectId ? String(teamProjectId) : undefined,
    organisationId: String(org?.id || ''),
    autoFetch: !!teamProjectId,
  });

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

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();

        const orgJson: Organisation = rawOrg?.data?.data || rawOrg?.data || rawOrg;
        const projectJson: Project = rawProject?.data?.data || rawProject?.data || rawProject;

        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            const rawClub: any = await (clubRes as any).json();
            setClub(rawClub?.data || rawClub);
          } catch {
            // ignore
          }
        }

        // Fetch only root periods for the season switcher (much smaller than all periods)
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(
          String(projectJson.id)
        )}&parent_id=null&page_size=500`;
        const rootPeriods = await fetchAllPages<Period>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` }
        );

        // Seasons switcher options: root seasons within the same team/project
        const seasonOptions = rootPeriods.filter(isSeasonPeriod);
        setSeasonsForSwitcher(seasonOptions);

        // Resolve season UUID from URL param (UUID or slugified name)
        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p) => periodPathKey(p) === String(effectiveSeasonId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');
        setResolvedSeasonId(seasonUuid);

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' });
        if (!seasonRes.ok) throw new Error('Failed to load season');
        const rawSeason: any = await seasonRes.json();
        const seasonJson: Period = rawSeason?.data || rawSeason;
        setSeason(seasonJson);

        const desiredKey = periodPathKey(seasonJson);
        if (desiredKey && desiredKey !== String(effectiveSeasonId)) {
          const suffix = location.search ? location.search : '';
          navigate(`${seasonsBasePath}/${desiredKey}${suffix}`, { replace: true });
        }

        // Load competitions (direct children of this season) using server-side filtering
        setCompetitionsLoading(true);
        try {
          const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(
            seasonUuid
          )}&page_size=500`;
          const competitionResults = await fetchAllPages<Period>(
            competitionsUrl,
            { credentials: 'include' },
            { ttlMs: 60_000, cacheKey: `periods:children:${seasonUuid}` }
          );
          setCompetitions(competitionResults);
        } finally {
          setCompetitionsLoading(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId, isTeamRoute, clubSlugOrId]);

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

  // Build brand assets object for batch modal
  // On team routes: prefer team-level kits, fall back to club-level
  const batchBrandAssets = useMemo(() => {
    const kits: Record<string, string | null> = {};
    for (const role of KIT_ROLES) {
      // Prefer team-level kit (if on team route), then club-level kit
      const teamAsset = isTeamRoute
        ? (teamBrand.getAsset?.(`kit_${role.id}_combined`) || teamBrand.getAsset?.(`kit_${role.id}`))
        : null;
      const clubAsset = clubBrand.getAsset?.(`kit_${role.id}_combined`) || clubBrand.getAsset?.(`kit_${role.id}`);
      const asset = teamAsset || clubAsset;
      kits[role.id] = asset ? getAssetUrl(asset.url) : null;
    }
    return {
      logo: clubBrand.getAsset?.('logo_upload') ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url) : null,
      sponsor: clubBrand.getAsset?.('sponsor_logo_upload') ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url) : null,
      kits,
    };
  }, [clubBrand, teamBrand, isTeamRoute]);

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
      const thenVsNow = m?.metadata?.teamreel_assets?.videos?.then_vs_now || {};
      const sbVariant = thenVsNow.sidebyside;
      const hasSidebyside = !!(sbVariant && (sbVariant.processed || sbVariant.raw));
      // Collect all transformation variant keys with data
      const transformationKeys: string[] = [];
      for (const k of Object.keys(thenVsNow)) {
        if (!k.startsWith('transformation')) continue;
        const v = thenVsNow[k];
        if (v && (v.processed || v.raw)) transformationKeys.push(k);
      }
      const hasTransformation = transformationKeys.length > 0;

      // Photo composite eligibility: needs a processed transparent video (RVM output)
      const videos = m?.metadata?.teamreel_assets?.videos || {};
      const compositeVideo = videos?.photo_composite?.default;
      const hasPhotoComposite = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.processing_state === 'processed'
        && compositeVideo.processed
      );

      return {
        id: String(m.id || ''),
        userId: String(m.user?.id || m.user_id || ''),
        name: m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.user.email || 'Unknown' : 'Unknown',
        shirtNumber: m.metadata?.shirt_number || m.shirt_number || null,
        position: m.metadata?.position || m.position || null,
        hasSidebyside,
        hasTransformation,
        hasPhotoComposite,
        transformationKeys,
      };
    }).filter((m: any) => m.id);
  }, [members]);

  // Count members that have then_vs_now videos (for content tiles)
  const thenVsNowCounts = useMemo(() => {
    let sidebyside = 0;
    let transformation = 0;
    let photo_composite = 0;
    for (const m of thenVsNowEligibleMembers) {
      if (m.hasSidebyside) sidebyside++;
      if (m.hasTransformation) transformation++;
      if (m.hasPhotoComposite) photo_composite++;
    }
    return { sidebyside, transformation, photo_composite };
  }, [thenVsNowEligibleMembers]);

  // Open the Then vs Now compilation modal
  const openThenVsNowModal = (videoType: 'sidebyside' | 'transformation' | 'photo_composite') => {
    const eligible = thenVsNowEligibleMembers.filter((m: any) =>
      videoType === 'sidebyside' ? m.hasSidebyside
        : videoType === 'photo_composite' ? m.hasPhotoComposite
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
      const res = await fetch(`${apiBaseUrl}/api/v1/video/jobs/then-vs-now-compilation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projId,
          video_type: thenVsNowModalType,
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
          actions={
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
                  style={{ color: '#dc2626' }}
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
          }
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
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'competitions', label: 'Competitions' },
            { id: 'matches', label: 'Matches' },
            { id: 'squad', label: 'Squad' },
            { id: 'team', label: 'Team' },
            { id: 'media', label: 'Media' },
            { id: 'content', label: 'Content' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'assets', label: 'Assets' },
            { id: 'workflow', label: 'Workflow' },
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
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('identity')}
                          >
                            Brand Identity Settings
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('competitions')}
                          >
                            Manage Competitions
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('matches')}
                          >
                            View Matches
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => navigateToTab('squad')}
                          >
                            View Squad
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
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
                                style={{ width: '100%', justifyContent: 'flex-start' }}
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
                <div style={{ display: 'grid', gap: '16px' }}>
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
                        const isThenVsNow = item.subtype === 'transformation' || item.subtype === 'sidebyside' || item.subtype === 'photo_composite';

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (isThenVsNow) {
                                openThenVsNowModal(item.subtype as 'sidebyside' | 'transformation' | 'photo_composite');
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
                            style={{
                              width: '100px',
                              padding: '12px 8px',
                              border: (isThenVsNow || hasTemplate) ? '1px solid var(--app-border)' : '1px dashed var(--app-border)',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              cursor: (isThenVsNow || hasTemplate) ? 'pointer' : 'not-allowed',
                              opacity: (isThenVsNow || hasTemplate) ? 1 : 0.5,
                              backgroundColor: (isThenVsNow || hasTemplate) ? 'var(--app-card-bg)' : 'var(--app-bg)',
                              transition: 'all 0.2s ease',
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
                            <div style={{
                              fontSize: '20px',
                              marginBottom: '4px',
                              filter: (isThenVsNow || hasTemplate) ? 'none' : 'grayscale(100%)',
                            }}>
                              {item.icon}
                            </div>
                            <div style={{
                              fontWeight: 600,
                              fontSize: '11px',
                              color: (isThenVsNow || hasTemplate) ? 'var(--app-text)' : 'var(--app-muted-text)',
                              lineHeight: 1.3,
                              textAlign: 'center',
                            }}>
                              {item.label}
                            </div>
                            {hasTemplate && matchedTemplate && (
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                {matchedTemplate.style_variant && (
                                  <Badge variant="info" size="sm" style={{ fontSize: '9px', padding: '2px 4px' }}>{matchedTemplate.style_variant}</Badge>
                                )}
                                {matchedTemplate.credits_required && matchedTemplate.credits_required > 0 && (
                                  <span style={{ fontSize: '9px', color: 'var(--app-muted-text)' }}>
                                    {matchedTemplate.credits_required} cr
                                  </span>
                                )}
                              </div>
                            )}
                            {!hasTemplate && (
                              <div style={{ fontSize: '9px', color: 'var(--app-muted-text)', marginTop: '4px' }}>"”</div>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                        {completedVideoJobs.map(job => {
                          const typeDisplay = getJobTypeDisplay(job.job_type);
                          // Differentiate Then & Now vs Transformatie based on config.video_type
                          const videoType = (job.config as any)?.video_type;
                          const tileLabel = videoType === 'transformation'
                            ? { icon: '🔄', label: 'Transformatie' }
                            : videoType === 'sidebyside'
                            ? { icon: '⏪', label: 'Then & Now' }
                            : typeDisplay;
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
                              style={{
                                border: '1px solid var(--app-border)',
                                borderRadius: 10,
                                overflow: 'hidden',
                                backgroundColor: 'var(--app-card-bg, var(--app-surface))',
                                cursor: stableUrl ? 'pointer' : 'default',
                                transition: 'box-shadow 0.15s ease',
                              }}
                              onMouseEnter={(e) => { if (stableUrl) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              {/* Video thumbnail — use metadata preload + poster for first-frame preview */}
                              {stableUrl && (
                                <div style={{ position: 'relative', width: '100%', height: 180, backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <video
                                    src={stableUrl}
                                    preload="metadata"
                                    {...(job.thumbnail_url ? { poster: job.thumbnail_url } : {})}
                                    muted
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                </div>
                              )}
                              {/* Meta */}
                              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)' }}>
                                    {tileLabel.icon} {tileLabel.label}
                                  </span>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                    color: '#059669', backgroundColor: '#d1fae5',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                  }}>
                                    ✅ Completed
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--app-muted-text)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <span>{ago}</span>
                                  {fileSize && <span>{fileSize}</span>}
                                  <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{job.id.slice(0, 8)}</span>
                                </div>
                                {stableUrl && (
                                  <a
                                    href={stableUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', marginTop: 2 }}
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
                      style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: 'var(--app-card-bg, #1e293b)',
                          borderRadius: 12, overflow: 'hidden', maxWidth: 900,
                          width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', borderBottom: '1px solid var(--app-border)',
                        }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)' }}>
                            {previewVideoLabel || 'Video Preview'}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <a
                              href={previewVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                            >
                              ⬇ Download
                            </a>
                            <button
                              type="button"
                              onClick={() => { setPreviewVideoUrl(null); setPreviewVideoLabel(''); }}
                              style={{
                                background: 'none', border: 'none', color: 'var(--app-muted-text)',
                                cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px',
                              }}
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
                          style={{ width: '100%', maxHeight: '85vh', display: 'block', backgroundColor: '#000' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}


              {activeTab === 'hierarchy' && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>Hierarchy</div>
                      <div style={{ color: 'var(--app-muted-text)', fontSize: 13 }}>
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

                      const pillStyle: React.CSSProperties = {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid var(--app-border)',
                        background: 'var(--app-surface-2)',
                        fontSize: 12,
                        color: 'var(--app-muted-text)',
                        fontWeight: 600,
                      };

                      return (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                                style={{
                                  border: '1px solid var(--app-border)',
                                  borderRadius: 10,
                                  background: 'var(--app-surface)',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    borderBottom: '1px solid var(--app-border)',
                                    background: 'var(--app-surface-2)',
                                    gap: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <button
                                      type="button"
                                      className="app-unstyled-button hover:underline"
                                      onClick={() => navigate(competitionPath)}
                                      style={{ textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#60a5fa' }}
                                    >
                                      {competition.name || `Competition ${compId}`}
                                    </button>
                                    {competition.sport && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--app-muted-text)' }}>
                                        <span>{competition.sport.sport_icon}</span>
                                        <span>{competition.sport.name}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span style={pillStyle}>Matches: {getMatchCountForCompetition(competition)}</span>
                                    <span style={pillStyle}>Participants: {getCompetitionParticipantsCount(competition)}</span>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {visibleMatches.map((match: any) => {
                                        const matchKey = (match as any).slug || match.id;
                                        const matchPath = isTeamRoute
                                          ? `${seasonsBasePath}/${seasonPathKey}/${competitionKey}/${String(matchKey)}`
                                          : `/matches/${String(matchKey)}`;
                                        return (
                                          <div
                                            key={match.id}
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              gap: 12,
                                              padding: '8px 10px',
                                              border: '1px solid var(--app-border)',
                                              borderRadius: 8,
                                              background: 'var(--app-surface)',
                                            }}
                                          >
                                            <div style={{ minWidth: 0 }}>
                                              <button
                                                type="button"
                                                className="app-unstyled-button hover:underline"
                                                onClick={() => navigate(matchPath)}
                                                style={{ textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}
                                              >
                                                {matchDisplayTitle(match)}
                                              </button>
                                              <div style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>
                                                {match.start_time ? new Date(match.start_time).toLocaleString() : '"”'}
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                              <span style={pillStyle}>Participants: {getMatchParticipantsCount(match)}</span>
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
                                            className="hover:underline"
                                            style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#60a5fa' }}
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
                                          {role}
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
                                            className="hover:underline"
                                            style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#60a5fa' }}
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
                                          {role}
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
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Team Members</h3>
                          <Badge variant="default">{eligibleTeamMembers.length} Available</Badge>
                        </div>
                        <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
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
                                        <Badge variant="default">{role}</Badge>
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
                  {/* In Tenue Generation Info Card */}
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>👕</span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>In Tenue Generation</h3>
                      </div>
                      <div style={{ color: 'var(--app-muted-text)', fontSize: '13px', marginBottom: '12px' }}>
                        Generate "In Tenue" images by combining profile photos with the team&apos;s kit.
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{(club as any)?.metadata?.teamreel_assets?.tenue?.url ? '✅' : '⚠️'}</span>
                          <span>Club Tenue</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{(club as any)?.metadata?.teamreel_assets?.logo?.url ? '✅' : '⚠️'}</span>
                          <span>Club Logo</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{((season as any)?.metadata?.teamreel_assets?.sponsor?.url || (club as any)?.metadata?.teamreel_assets?.sponsor?.url) ? '✅' : '—'}</span>
                          <span>Sponsor (optional)</span>
                        </div>
                      </div>
                      {!(club as any)?.metadata?.teamreel_assets?.tenue?.url && (
                        <Alert variant="warning" style={{ marginTop: '12px' }}>
                          Missing club tenue. Go to the club&apos;s Assets tab to upload kit images.
                        </Alert>
                      )}
                    </div>
                  </Card>

                  {/* Guest Player Card */}
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🏃</span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Gast Speler</h3>
                        <Badge variant={guestPlayer?.has_avatar ? 'success' : 'default'}>
                          {guestPlayer?.has_avatar ? 'Avatar beschikbaar' : 'Geen avatar'}
                        </Badge>
                      </div>
                      <div style={{ color: 'var(--app-muted-text)', fontSize: '13px', marginBottom: '12px' }}>
                        Anonieme speler in teamtenue voor onvolledige line-ups. Kan meerdere keren in dezelfde opstelling worden gebruikt.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        {guestPlayer?.has_avatar && (() => {
                          const gp = guestPlayer?.guest_player || {};
                          const fullbodyHome = gp?.images?.fullbody?.home;
                          const previewPath = fullbodyHome?.processed || fullbodyHome?.raw || fullbodyHome?.presigned_url || fullbodyHome?.url;
                          const previewUrl = previewPath ? (previewPath.startsWith('http') ? previewPath : getAssetUrl(previewPath)) : null;
                          return previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Gast speler avatar"
                              style={{
                                width: 60,
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid var(--app-border)',
                                background: 'var(--app-muted)',
                              }}
                            />
                          ) : null;
                        })()}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Button
                              variant={guestPlayer?.has_avatar ? 'outline' : 'primary'}
                              onClick={() => openGuestAiModal('fullbody_in_tenue')}
                              disabled={!(clubBrand.getAsset?.('kit_home_combined') || clubBrand.getAsset?.('kit_home'))}
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              {guestPlayer?.has_avatar ? '🔄' : '🤖'} Fullbody
                            </Button>
                            <Button
                              variant={guestPlayer?.has_closeup ? 'outline' : 'secondary'}
                              onClick={() => cropGuestCloseup('home')}
                              disabled={!guestPlayer?.has_avatar || croppingGuestCloseup}
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              title={!guestPlayer?.has_avatar ? 'Genereer eerst een fullbody' : croppingGuestCloseup ? 'Bezig met croppen...' : undefined}
                            >
                              {croppingGuestCloseup ? '⏳' : guestPlayer?.has_closeup ? '🔄' : '📸'} Close-up
                            </Button>
                            <Button
                              variant={guestPlayer?.has_intro ? 'outline' : 'secondary'}
                              onClick={() => openGuestAiModal('member_intro')}
                              disabled={!guestPlayer?.has_avatar}
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              title={!guestPlayer?.has_avatar ? 'Genereer eerst een fullbody' : undefined}
                            >
                              {guestPlayer?.has_intro ? '🔄' : '🎬'} Intro
                            </Button>
                            <Button
                              variant={guestPlayer?.has_celebration ? 'outline' : 'secondary'}
                              onClick={() => openGuestAiModal('member_goal_celebration')}
                              disabled={!guestPlayer?.has_avatar}
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              title={!guestPlayer?.has_avatar ? 'Genereer eerst een fullbody' : undefined}
                            >
                              {guestPlayer?.has_celebration ? '🔄' : '🎉'} Celebration
                            </Button>
                          </div>
                          {!(clubBrand.getAsset?.('kit_home_combined') || clubBrand.getAsset?.('kit_home')) && (
                            <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
                              Upload eerst een club tenue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div style={{ padding: '16px 16px 0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}> Media Completion Matrix</h3>
                        <Badge variant="default">
                          {members.filter((m) => countProcessedMediaSlots(m) === MEDIA_SLOTS.length).length} / {members.length} Complete
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => setIsActiveJobsModalOpen(true)}
                          style={{ marginLeft: batchSelectedMemberIds.size > 0 ? undefined : 'auto', fontSize: '13px', padding: '6px 14px' }}
                        >
                          ⚙️ Actieve Jobs
                        </Button>
                        {batchSelectedMemberIds.size > 0 && (
                          <Button
                            variant="primary"
                            onClick={() => setIsBatchModalOpen(true)}
                            style={{ fontSize: '13px', padding: '6px 14px' }}
                          >
                            🚀 Batch Genereer ({batchSelectedMemberIds.size})
                          </Button>
                        )}
                      </div>
                      <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
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
                                  <th key={slot.id} style={{ ...compactThStyle, textAlign: 'center', minWidth: '60px' }} title={slot.label}>
                                    <span style={{ fontSize: '16px' }}>{slot.icon}</span>
                                  </th>
                                ))}
                                <th style={{ ...compactThStyle, textAlign: 'center' }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Guest Player row — always shown at top of matrix */}
                              <tr style={{ background: 'rgba(167, 139, 250, 0.06)' }}>
                                <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                                  {/* No batch checkbox for guest */}
                                </td>
                                <td style={{ ...compactTextTdStyle, position: 'sticky', left: 0, background: 'rgba(167, 139, 250, 0.06)', zIndex: 1 }}>
                                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>🏃 Gast Speler</span>
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
                                          style={{ fontSize: '14px', cursor: 'pointer' }}
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
                                      <span style={{ fontSize: '14px', opacity: 0.3 }} title={`${slot.label}: N.v.t. voor gast`}>—</span>
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
                                          className="hover:underline"
                                          style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#60a5fa' }}
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
                                      return (
                                        <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                                          {href ? (
                                            <Link
                                              to={`${href}?tab=${slot.id}`}
                                              style={{ textDecoration: 'none' }}
                                              title={title}
                                            >
                                              <span style={{ fontSize: '14px' }}>{indicator}</span>
                                            </Link>
                                          ) : (
                                            <span style={{ fontSize: '14px' }} title={title}>{indicator}</span>
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
                      <div style={{ marginTop: '16px', padding: '12px', background: 'var(--app-muted)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Legend</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', marginBottom: '10px' }}>
                          {MEDIA_SLOTS.map((slot) => (
                            <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{slot.icon}</span>
                              <span style={{ opacity: 0.8 }}>{slot.label}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', borderTop: '1px solid var(--app-border, #333)', paddingTop: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✅</span>
                            <span style={{ opacity: 0.8 }}>Lineup-ready (bewerkt)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🔶</span>
                            <span style={{ opacity: 0.8 }}>Ruw (niet bewerkt)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⏳</span>
                            <span style={{ opacity: 0.8 }}>Bezig met bewerken</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⬜</span>
                            <span style={{ opacity: 0.8 }}>Ontbreekt</span>
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
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Competitions</h3>
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
                                  className="hover:underline"
                                  style={{ textDecoration: 'none', color: '#60a5fa' }}
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
                                {new Date(competition.start_date).toLocaleDateString()} "“{' '}
                                {new Date(competition.end_date).toLocaleDateString()}
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
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Matches</h3>
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
                            <th style={compactThStyle}>Participants</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
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
                                  className="hover:underline"
                                  style={{ textDecoration: 'none', color: '#60a5fa' }}
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
                                    className="hover:underline"
                                    style={{ textDecoration: 'none', color: '#60a5fa' }}
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
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getMatchParticipantsCount(match)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
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
                organisationId={String(org?.id || orgId || '')}
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setIsEditMemberModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '32px',
                borderRadius: '8px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                color: '#f1f5f9',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: 600, color: '#f1f5f9' }}>
                Edit Member Roles
              </h2>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px', color: '#e2e8f0' }}>
                  <strong style={{ color: '#cbd5e1' }}>Name:</strong>{' '}
                  {selectedEditMember.user?.name ||
                    `${selectedEditMember.user?.first_name || ''} ${selectedEditMember.user?.last_name || ''}`.trim() ||
                    selectedEditMember.user?.email ||
                    '—'}
                </div>
                <div style={{ marginBottom: '16px', color: '#e2e8f0' }}>
                  <strong style={{ color: '#cbd5e1' }}>Email:</strong> {selectedEditMember.user?.email || '—'}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                  Functional Roles
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map((role) => {
                    const currentRoles = getFunctionalRolesFromMembership(selectedEditMember);
                    const isChecked = currentRoles.includes(role);

                    return (
                      <label
                        key={role}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                          cursor: 'pointer',
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
                        <span style={{ textTransform: 'capitalize', color: '#f1f5f9' }}>{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsEditMemberModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    backgroundColor: '#334155',
                    color: '#f1f5f9',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
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
                            ? { ...m, functional_roles: functionalRoles }
                            : m
                        )
                      );

                      setIsEditMemberModalOpen(false);
                      setSelectedEditMember(null);
                    } catch (err: any) {
                      alert(err.message || 'Failed to update member');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
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
            style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: '20px' }}
            onClick={() => { if (thenVsNowModalStep !== 'generating') closeThenVsNowModal(); }}
          >
            <div
              style={{ backgroundColor: 'var(--app-surface, #1a1a2e)', borderRadius: '12px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--app-border, #333)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--app-border, #333)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    Then vs Now — {thenVsNowModalType === 'sidebyside' ? 'Then & Now' : thenVsNowModalType === 'photo_composite' ? 'Foto Composite' : 'Transformatie'}
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
                    style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--app-text)', padding: '4px 8px' }}
                  >&times;</button>
                )}
              </div>

              {/* Step: Member selection with ordering */}
              {thenVsNowModalStep === 'members' && (() => {
                const eligible = thenVsNowEligibleMembers.filter((m: any) =>
                  thenVsNowModalType === 'sidebyside' ? m.hasSidebyside
                    : thenVsNowModalType === 'photo_composite' ? m.hasPhotoComposite
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
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
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
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--app-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--app-surface-2, #2a2a3e)', color: 'var(--app-text)', whiteSpace: 'nowrap' }}
                      >
                        {thenVsNowModalSelected.length === eligible.length ? 'Deselecteer alles' : 'Selecteer alles'}
                      </button>
                    </div>

                    {/* Selected members — ordered list with reorder controls */}
                    {selectedOrdered.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-muted-text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                          Volgorde in video
                        </div>
                        <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto' }}>
                          {selectedOrdered.map((m: any, idx: number) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                borderBottom: idx < selectedOrdered.length - 1 ? '1px solid var(--app-border)' : 'none',
                                backgroundColor: 'var(--app-surface-2, #2a2a3e)',
                              }}
                            >
                              {/* Order number */}
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-muted-text)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                                {idx + 1}
                              </span>
                              {/* Name + info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--app-text)' }}>{m.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--app-muted-text)', display: 'flex', gap: '8px', marginTop: '1px' }}>
                                  {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                                  {m.position && <span>{m.position}</span>}
                                </div>
                                {/* Transformation variant picker (when member has multiple variants) */}
                                {thenVsNowModalType === 'transformation' && m.transformationKeys && m.transformationKeys.length > 1 && (
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {m.transformationKeys.map((vk: string) => {
                                      const label = vk.replace('transformation_', '').replace('transformation', 'default').replace(/_/g, ' ');
                                      const isSelected = (thenVsNowVariantKeys[m.id] || '') === vk;
                                      const isDefault = !thenVsNowVariantKeys[m.id] && vk === m.transformationKeys[0];
                                      return (
                                        <button
                                          key={vk}
                                          onClick={() => setThenVsNowVariantKeys(prev => ({ ...prev, [m.id]: vk }))}
                                          style={{
                                            padding: '2px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '10px',
                                            border: (isSelected || isDefault) ? '1px solid var(--app-primary, #2563eb)' : '1px solid var(--app-border)',
                                            backgroundColor: (isSelected || isDefault) ? 'var(--app-primary, #2563eb)' : 'transparent',
                                            color: (isSelected || isDefault) ? '#fff' : 'var(--app-muted-text)',
                                            cursor: 'pointer', textTransform: 'capitalize',
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
                                style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.25 : 0.7, fontSize: '14px', padding: '2px 4px', color: 'var(--app-text)' }}
                              >{"\u25B2"}</button>
                              {/* Move down */}
                              <button
                                onClick={() => moveDown(idx)}
                                disabled={idx === selectedOrdered.length - 1}
                                title="Omlaag"
                                style={{ background: 'none', border: 'none', cursor: idx === selectedOrdered.length - 1 ? 'default' : 'pointer', opacity: idx === selectedOrdered.length - 1 ? 0.25 : 0.7, fontSize: '14px', padding: '2px 4px', color: 'var(--app-text)' }}
                              >{"\u25BC"}</button>
                              {/* Remove */}
                              <button
                                onClick={() => removeItem(m.id)}
                                title="Verwijderen"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '14px', padding: '2px 4px', color: 'var(--app-danger, #ef4444)' }}
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
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-muted-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                              Geen spelers gevonden
                            </div>
                          ) : filteredUnselected.map((m: any) => (
                            <div
                              key={m.id}
                              onClick={() => addItem(m.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                borderBottom: '1px solid var(--app-border)', cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--app-surface-2, #2a2a3e)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <span style={{ fontSize: '14px', color: 'var(--app-primary, #2563eb)', flexShrink: 0 }}>+</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--app-text)' }}>{m.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--app-muted-text)', display: 'flex', gap: '8px', marginTop: '1px' }}>
                                  {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                                  {m.position && <span>{m.position}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Background / Location selector */}
                    {thenVsNowBackgrounds.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-muted-text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Achtergrond / Locatie
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
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
                            <div style={{ width: '100%', aspectRatio: '9/16', background: 'linear-gradient(to bottom, #16a34a, #14532d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '20px' }}>{"\u26BD"}</span>
                            </div>
                            <div style={{ padding: '3px 0', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: !thenVsNowSelectedBgUrl ? '#fff' : 'var(--app-muted-text)', background: !thenVsNowSelectedBgUrl ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)' }}>
                              Standaard
                            </div>
                            {!thenVsNowSelectedBgUrl && (
                              <div style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>{"\u2713"}</div>
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
                                <div style={{
                                  padding: '3px 0', textAlign: 'center', fontWeight: 600, fontSize: '10px',
                                  color: isSelected ? '#fff' : 'var(--app-muted-text)',
                                  background: isSelected ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {bg.label || bg.profile_name || 'Locatie'}
                                </div>
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>{"\u2713"}</div>
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
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>{"\u23F3"}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--app-text)', marginBottom: '8px' }}>
                    Job wordt aangemaakt...
                  </div>
                </div>
              )}

              {/* Step: Submitted — confirmation, auto-closes */}
              {thenVsNowModalStep === 'submitted' && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>{"\u2705"}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--app-text)', marginBottom: '8px' }}>
                    Job gestart!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--app-muted-text)', marginBottom: '12px' }}>
                    {thenVsNowModalSelected.length} speler{thenVsNowModalSelected.length !== 1 ? 's' : ''} • Video wordt op de achtergrond verwerkt
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
                    Bekijk de voortgang bij <strong>Workflow</strong> of in de <strong>Video Jobs</strong> queue.
                  </div>
                </div>
              )}

              {/* Step: Error */}
              {thenVsNowModalStep === 'error' && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>{"\u274C"}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--app-danger, #c62828)', marginBottom: '8px' }}>
                    Generatie mislukt
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--app-muted-text)' }}>
                    {thenVsNowModalError || 'Unknown error'}
                  </div>
                </div>
              )}

              {/* Modal footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--app-border, #333)', gap: '8px' }}>
                {thenVsNowModalStep === 'members' && (
                  <>
                    <button
                      onClick={closeThenVsNowModal}
                      style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--app-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--app-surface-2, #2a2a3e)', color: 'var(--app-text)' }}
                    >Annuleren</button>
                    <button
                      onClick={submitThenVsNowCompilation}
                      disabled={thenVsNowModalSelected.length === 0}
                      style={{
                        padding: '8px 16px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: thenVsNowModalSelected.length > 0 ? 'pointer' : 'not-allowed',
                        backgroundColor: thenVsNowModalSelected.length > 0 ? 'var(--app-primary, #2563eb)' : '#6b7280',
                        color: '#fff', opacity: thenVsNowModalSelected.length > 0 ? 1 : 0.5,
                      }}
                    >{"\uD83C\uDFAC"} Genereer Video ({thenVsNowModalSelected.length})</button>
                  </>
                )}
                {thenVsNowModalStep === 'submitted' && (
                  <button
                    onClick={closeThenVsNowModal}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--app-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--app-surface-2, #2a2a3e)', color: 'var(--app-text)' }}
                  >Sluiten</button>
                )}
                {thenVsNowModalStep === 'error' && (
                  <>
                    <button
                      onClick={() => setThenVsNowModalStep('members')}
                      style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--app-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--app-surface-2, #2a2a3e)', color: 'var(--app-text)' }}
                    >{"\u2190"} Terug</button>
                    <button
                      onClick={closeThenVsNowModal}
                      style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--app-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--app-surface-2, #2a2a3e)', color: 'var(--app-text)' }}
                    >Sluiten</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectSeasonDetailPage;
