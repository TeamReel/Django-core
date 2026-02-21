import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { fetchFlags } from '../../utils/featureFlagsApi';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { MediaAssetCard, MediaAssetGrid, type MatchMediaItem } from '../../components/MediaAssetCard';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import GovernanceSummaryCard from '../../components/Governance/GovernanceSummaryCard';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import { useAuth } from '@django-core/auth-ui';
import MatchDetailModal from '../identity/MatchDetailModal';
import MatchEditModal from '../identity/MatchEditModal';
import ContentGenerationModal, { CONTENT_TYPES, FORMATION_LAYOUTS, type ContentTemplate } from '../identity/ContentGenerationModal';
import { actionButtonStyle } from '../identity/detail/detailStyles';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import MobileTabBar from '../../components/MobileTabBar';

type Organisation = {
  id: string;
  name: string;
  slug?: string;
  sport?: { id: number; name: string; slug?: string; sport_icon?: string; parent_sport_id?: number | null } | null;
};
type Project = { id: string; name: string; slug?: string };

type Participation = {
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

type ActivityEvent = {
  id: string;
  event_type: string;
  minute?: number;
  team_project?: { id: string; name: string };
  member?: { id: string; user_name?: string };
  related_member?: { id: string; user_name?: string };
  data?: any;
};

type OrgMember = {
  id: string; // organisation membership id (uuid)
  role?: string; // organisation role (admin/member)
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

type SeasonSquadParticipation = {
  id: string;
  member?: { id: string; user_name?: string };
  period?: { id: string; name?: string };
  role?: string;
  status?: string;
  data?: any;
};

type ProjectMember = {
  id: string;
  role?: string; // viewer/editor/admin
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

type MatchDetail = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  activity_type?: string;
  project: { id: string; name: string; slug?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  period?: { id: string; name: string; parent_period?: { id: string; name: string } | null };
  metadata?: Record<string, any>;
  participations?: Participation[];
  events?: ActivityEvent[];
};

type Period = {
  id: string;
  name: string;
  parent_period?: { id: string; name: string } | null;
  sport?: { id: number; name: string; slug?: string; sport_icon?: string; parent_sport_id?: number | null } | null;
};

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (looksLikeUuid(v)) return true;
  return false;
};

const getEnvelopeData = <T,>(raw: any): T => {
  return (raw?.data ?? raw) as T;
};

const getEnvelopeListResults = <T,>(raw: any): T[] => {
  const envelope = raw?.data ?? raw;
  const results = envelope?.results ?? envelope?.data?.results ?? envelope?.data ?? envelope;
  return Array.isArray(results) ? (results as T[]) : [];
};

const getCsrfToken = (): string => {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] ||
    ''
  );
};

export default function HierarchyMatchDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { orgId, projectId, seasonId, competitionId, matchId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
    clubId?: string;
  }>();

  const apiBaseUrl = getApiBaseUrl();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competition, setCompetition] = useState<Period | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [resolvedSeasonUuid, setResolvedSeasonUuid] = useState<string>('');
  const [resolvedCompetitionUuid, setResolvedCompetitionUuid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);

  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

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

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);

  // B31 Content Generation
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateFlagMap, setTemplateFlagMap] = useState<Record<string, boolean>>({});
  const [templateFlagsLoading, setTemplateFlagsLoading] = useState(false);

  // Content Items - track generated content for this match
  type ContentItemStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'approved' | 'rejected';
  type ContentItem = {
    id: string;
    template: { id: number; name: string; template_subtype?: string | null };
    status: ContentItemStatus;
    created_at: string;
    output_file?: { id: string; url: string; file_name?: string } | null;
    error_message?: string | null;
  };
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentItemsLoading, setContentItemsLoading] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [isContentPreviewOpen, setIsContentPreviewOpen] = useState(false);

  // ── Saved media items for this match (media-architecture.md: MediaItem ↔ Activity) ──
  const [matchMedia, setMatchMedia] = useState<MatchMediaItem[]>([]);
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);

  const fetchMatchMedia = useCallback(async () => {
    if (!match?.id) return;
    setMatchMediaLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/media/items/?activity=${match.id}`,
        { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        const items = data?.results || data?.data?.results || [];
        setMatchMedia(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.error('[Media] Error fetching match media:', err);
    } finally {
      setMatchMediaLoading(false);
    }
  }, [match?.id]);

  useEffect(() => {
    if (match?.id) fetchMatchMedia();
  }, [match?.id, fetchMatchMedia]);

  /**
   * Group media items by asset_type (subtype), ordered newest-first.
   * Returns { [subtype]: { latest: MatchMediaItem, history: MatchMediaItem[] } }
   */
  const mediaBySubtype = useMemo(() => {
    const grouped: Record<string, { latest: MatchMediaItem; history: MatchMediaItem[] }> = {};
    // Sort all items newest-first
    const sorted = [...matchMedia].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    for (const item of sorted) {
      const subtype = (item.extraction_metadata?.asset_type as string) || 'other';
      // Normalize: "lineup_07df73a6" → "lineup", "goal_celebration_07df73a6" → "goal"
      let normalizedSubtype = subtype.replace(/_[a-f0-9]{8}$/i, '');
      if (normalizedSubtype === 'goal_celebration') normalizedSubtype = 'goal';
      if (normalizedSubtype === 'match_flyer') normalizedSubtype = 'flyer';
      if (normalizedSubtype === 'match_intro') normalizedSubtype = 'match_intro';
      if (!grouped[normalizedSubtype]) {
        grouped[normalizedSubtype] = { latest: item, history: [] };
      } else {
        grouped[normalizedSubtype].history.push(item);
      }
    }
    return grouped;
  }, [matchMedia]);

  // Get latest media item for a specific subtype
  const getLatestMediaForSubtype = useCallback((subtype: string): MatchMediaItem | null => {
    return mediaBySubtype[subtype]?.latest ?? null;
  }, [mediaBySubtype]);

  // Get history items (excluding latest) for a subtype
  const getMediaHistoryForSubtype = useCallback((subtype: string): MatchMediaItem[] => {
    return mediaBySubtype[subtype]?.history ?? [];
  }, [mediaBySubtype]);

  const refreshMatchMedia = useCallback(async () => {
    await fetchMatchMedia();
  }, [fetchMatchMedia]);

  // Delete a MediaItem via API
  const handleDeleteMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/media/items/${item.id}/`,
        { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok || response.status === 204) {
        await fetchMatchMedia(); // Refresh
      } else {
        console.error('[Media] Delete failed:', response.status);
      }
    } catch (err) {
      console.error('[Media] Error deleting media item:', err);
    }
  }, [fetchMatchMedia]);

  // Restore a historical version by making it the "latest" (re-save with same file)
  const handleRestoreMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      // Restore by calling the save endpoint with the old item's storage path
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/generative/assets/save/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
          body: JSON.stringify({
            storage_path: item.storage_path,
            filename: item.title,
            mime_type: item.mime_type,
            activity_id: match?.id,
            organisation_id: org?.id,
            project_id: match?.project?.id || project?.id,
            asset_type: (item.extraction_metadata?.asset_type as string) || 'other',
          }),
        }
      );
      if (response.ok) {
        await fetchMatchMedia(); // Refresh to show restored version as latest
      } else {
        console.error('[Media] Restore failed:', response.status);
      }
    } catch (err) {
      console.error('[Media] Error restoring media item:', err);
    }
  }, [match?.id, org?.id, match?.project?.id, project?.id, fetchMatchMedia]);

  const [savedAssetPreview, setSavedAssetPreview] = useState<{
    title: string;
    url: string;
    isVideo: boolean;
    subtitle?: string;
  } | null>(null);

  const normalizeFlagKey = (value: string): string =>
    String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const slugify = (value: string): string =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const buildTemplateFlagKeys = (template: ContentTemplate): string[] => {
    const type = slugify(template.template_type);
    const subtype = slugify(template.template_subtype || template.template_type);
    const style = slugify(template.style_variant || '');
    if (!type || !subtype) return [];
    const keys: string[] = [];
    if (style) keys.push(`content__${type}__${subtype}__style__${style}`);
    keys.push(`content__${type}__${subtype}`);
    keys.push(`content__${type}`);
    return keys;
  };

  const isTemplateEnabled = (template: ContentTemplate): boolean => {
    if (!templateFlagMap || Object.keys(templateFlagMap).length === 0) {
      console.log('[Content Flags] No flags loaded, allowing template:', template.name);
      return true;
    }
    const keys = buildTemplateFlagKeys(template);
    for (const key of keys) {
      const normalized = normalizeFlagKey(key);
      if (normalized in templateFlagMap) {
        const enabled = Boolean(templateFlagMap[normalized]);
        if (!enabled) {
          console.log('[Content Flags] Template DISABLED by flag:', template.name, 'key:', normalized, 'value:', enabled);
        }
        return enabled;
      }
    }
    console.log('[Content Flags] No matching flag for template, allowing:', template.name, 'keys tried:', keys);
    return true;
  };

  // Fetch content items for this match
  const fetchContentItems = useCallback(async () => {
    if (!match?.id) return;
    setContentItemsLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/content-generation/items/?activity=${match.id}`,
        { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        const items = data?.data?.results || data?.results || data?.data || [];
        setContentItems(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.error('[Content] Error fetching content items:', err);
    } finally {
      setContentItemsLoading(false);
    }
  }, [match?.id]);

  // Helper to get content item for a template subtype
  const getContentItemForSubtype = useCallback((subtype: string): ContentItem | null => {
    return contentItems.find(item => item.template?.template_subtype === subtype) || null;
  }, [contentItems]);

  // Fetch content items when match changes
  useEffect(() => {
    if (match?.id) {
      fetchContentItems();
    }
  }, [match?.id, fetchContentItems]);

  const openContentModal = (template?: ContentTemplate, label?: string) => {
    setSelectedTemplate(template || null);
    setSelectedContentTypeLabel(label || '');
    setIsContentModalOpen(true);
  };

  const closeContentModal = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
    // Refresh content items to show newly generated content
    fetchContentItems();
    void refreshMatchMedia();
  };

  // Open content preview modal
  const openContentPreview = (item: ContentItem) => {
    setSelectedContentItem(item);
    setIsContentPreviewOpen(true);
  };

  const closeContentPreview = () => {
    setIsContentPreviewOpen(false);
    setSelectedContentItem(null);
  };

  const fetchTemplateAvailabilityFlags = useCallback(async () => {
    if (!org?.id) return;
    setTemplateFlagsLoading(true);
    try {
      console.log('[Content Flags] Fetching flags for org:', org.id, 'club/project:', club?.id);
      const flags = await fetchFlags(String(org.id), club?.id ? String(club.id) : undefined);
      console.log('[Content Flags] Raw flags received:', flags.length, flags.filter(f => f.key.includes('goal')));
      const map: Record<string, boolean> = {};
      flags.forEach((flag) => {
        map[normalizeFlagKey(flag.key)] = Boolean(flag.enabled);
      });
      console.log('[Content Flags] Flag map (goal keys):', Object.entries(map).filter(([k]) => k.includes('goal')));
      setTemplateFlagMap(map);
    } catch (err) {
      console.error('[Content] Failed to fetch template availability flags:', err);
    } finally {
      setTemplateFlagsLoading(false);
    }
  }, [org?.id, club?.id]);

  useEffect(() => {
    fetchTemplateAvailabilityFlags();
  }, [fetchTemplateAvailabilityFlags]);

  // Fetch available templates for all content types
  const fetchAvailableTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      // Fetch all active templates (global, not filtered by organisation)
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('page_size', '500');  // Ensure we get all templates, not just first 50

      const response = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[Content] API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error' }));
        console.error('[Content] API Error:', response.status, errorData);
        return;
      }

      const data = await response.json();
        console.log('[Content] Full API response:', data);
        console.log('[Content] data.data:', data?.data);
        console.log('[Content] data.data.data:', data?.data?.data);

        // Handle envelope format: { status: 'success', data: { data: [...] } }
        const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
        const allTemplates: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

        // Use COMPETITION sport (variant) for filtering, fallback to org sport (category)
        const competitionSport = competition?.sport;
        const orgSport = org?.sport;
        // Convert to number to match template.sport type
        const sportId = competitionSport?.id ? Number(competitionSport.id) : (orgSport?.id ? Number(orgSport.id) : undefined);
        const sportName = competitionSport?.name || orgSport?.name;

        console.log('[Content] ======================');
        console.log('[Content] Competition sport:', competitionSport);
        console.log('[Content] Org sport:', orgSport);
        console.log('[Content] Using sportId for filtering:', sportId, '(', sportName, ')');
        console.log('[Content] All templates fetched:', allTemplates.length);

        if (allTemplates.length > 0) {
          console.log('[Content] Sample template:', allTemplates[0]);
        }

        // Filter templates that match the sport (or have no sport = universal)
        const matchingTemplates = allTemplates.filter(t => {
          const templateOrg = (t as any).organisation ?? null;
          const templateProject = (t as any).project ?? null;

          // If template is scoped to a specific organisation, enforce it
          if (templateOrg && String(templateOrg) !== String(org?.id || '')) {
            return false;
          }
          // If template is scoped to a specific project/club, enforce it
          if (templateProject && String(templateProject) !== String(club?.id || '')) {
            return false;
          }
          // Template has no sport = universal, include it
          if (!t.sport) {
            console.log('[Content] ✓ Template', t.name, '- universal (no sport)');
            return true;
          }
          // If no sport available, only include universal templates
          if (!sportId) {
            console.log('[Content] ✗ Template', t.name, '- no sportId to match against');
            return false;
          }

          // Log all the checks
          console.log('[Content] Checking template:', t.name);
          console.log('  - t.sport:', t.sport, 'vs sportId:', sportId);
          console.log('  - t.sport_detail:', t.sport_detail);
          console.log('  - competitionSport?.parent_sport_id:', competitionSport?.parent_sport_id);

          // Convert all IDs to numbers for consistent comparison
          const templateSport = t.sport ? Number(t.sport) : undefined;
          const templateDetailId = t.sport_detail?.id ? Number(t.sport_detail.id) : undefined;
          const templateParentSportId = t.sport_detail?.parent_sport_id ? Number(t.sport_detail.parent_sport_id) : undefined;

          // Template sport matches directly (exact match)
          if (templateSport === sportId) {
            console.log('  ✓ Exact match: t.sport === sportId');
            return true;
          }
          // Template sport_detail matches by ID
          if (templateDetailId === sportId) {
            console.log('  ✓ Match: t.sport_detail.id === sportId');
            return true;
          }

          // IMPORTANT: Match if template has a sport VARIANT and we have the CATEGORY
          // Example: Template=Football 11v11 (variant), Sport=Football (category)
          // Check if template's sport parent matches our sport
          if (templateParentSportId === sportId) {
            console.log('  ✓ Match: template variant parent matches our sport');
            return true;
          }

          // Or if we have a variant and template has the category
          const competitionParentId = competitionSport?.parent_sport_id ? Number(competitionSport.parent_sport_id) : undefined;
          const orgParentId = orgSport?.parent_sport_id ? Number(orgSport.parent_sport_id) : undefined;

          if (competitionParentId && templateSport === competitionParentId) {
            console.log('  ✓ Match: we have variant, template has category');
            return true;
          }
          if (!competitionSport && orgParentId && templateSport === orgParentId) {
            console.log('  ✓ Match: org variant, template has category');
            return true;
          }

          console.log('  ✗ No match');
          return false;
        });

        // Apply feature flag availability (type/subtype/style)
        const availabilityFiltered = matchingTemplates.filter((t) => isTemplateEnabled(t));

        console.log('[Content] Matching templates for sport:', availabilityFiltered.length);
        console.log('[Content] Template details:', availabilityFiltered.map(t => ({
          name: t.name,
          type: t.template_type,
          subtype: t.template_subtype,
          sport: t.sport_detail?.name || t.sport || 'universal'
        })));

        // Group templates by subtype
        const grouped: Record<string, ContentTemplate[]> = {};
        availabilityFiltered.forEach(t => {
          const subtype = t.template_subtype || t.template_type;
          if (!grouped[subtype]) grouped[subtype] = [];
          grouped[subtype].push(t);
        });
        console.log('[Content] Grouped by subtype:', Object.keys(grouped));
        setAvailableTemplates(grouped);
    } catch (err) {
      console.error('[Content] Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [competition?.sport, org?.sport, org?.id, club?.id, templateFlagMap]);

  // Fetch templates when component mounts or sport changes
  useEffect(() => {
    fetchAvailableTemplates();
  }, [fetchAvailableTemplates]);

  const matchWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  const detailActionButtonStyle = (tone: 'neutral' | 'primary' | 'warning' | 'danger' | 'success' = 'neutral'): React.CSSProperties => ({
    ...actionButtonStyle(tone as any),
    padding: '6px 12px',
    fontWeight: 500,
  });

  const [eligibleMembers, setEligibleMembers] = useState<OrgMember[]>([]);
  const [orgMembersAll, setOrgMembersAll] = useState<OrgMember[]>([]);
  const [teamProjectMembers, setTeamProjectMembers] = useState<ProjectMember[]>([]);
  const [clubProjectMembers, setClubProjectMembers] = useState<ProjectMember[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [addHomeMemberId, setAddHomeMemberId] = useState<string>('');
  const [addAwayMemberId, setAddAwayMemberId] = useState<string>('');

  const [lineupBulkSubmitting, setLineupBulkSubmitting] = useState(false);
  const [lineupEligibleSearchHome, setLineupEligibleSearchHome] = useState('');
  const [lineupEligibleSearchAway, setLineupEligibleSearchAway] = useState('');
  const [selectedEligibleLineupMemberIdsHome, setSelectedEligibleLineupMemberIdsHome] = useState<Set<string>>(new Set());
  const [selectedEligibleLineupMemberIdsAway, setSelectedEligibleLineupMemberIdsAway] = useState<Set<string>>(new Set());
  const [selectedLineupParticipationIdsHome, setSelectedLineupParticipationIdsHome] = useState<Set<string>>(new Set());
  const [selectedLineupParticipationIdsAway, setSelectedLineupParticipationIdsAway] = useState<Set<string>>(new Set());

  // Formation lineup editor state
  const [lineupFormation, setLineupFormation] = useState<string>('4-3-3');
  const [lineupSlots, setLineupSlots] = useState<Record<string, string[]>>({ goalkeeper: [], player: [] });
  const [lineupSquad, setLineupSquad] = useState<Record<string, any[]>>({ goalkeeper: [], player: [], coach: [], assistant: [] });
  const [lineupSquadLoading, setLineupSquadLoading] = useState(false);
  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupSaveSuccess, setLineupSaveSuccess] = useState(false);
  // Bench status: memberId -> 'wissel' | 'afwezig'
  const [lineupBenchStatus, setLineupBenchStatus] = useState<Record<string, string>>({});

  const isTeamRoute = Boolean(clubId);
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const effectiveCompetitionId = String(competitionId || '').trim();
  const effectiveMatchId = String(matchId || '').trim();

  // Canonicalize club segment: if it's an id, resolve slug and redirect.
  const shouldResolveClubSlug = useMemo(
    () => isTeamRoute && looksLikeIdentifier(clubSlugOrId),
    [clubSlugOrId, isTeamRoute]
  );
  const [resolvedClubSlug, setResolvedClubSlug] = useState<string>('');
  const [clubSlugResolved, setClubSlugResolved] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!shouldResolveClubSlug) return;
        if (!orgSlugOrId || !clubSlugOrId) return;

        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const project = getEnvelopeData<Project>(await res.json().catch(() => null));
          const slug = String(project?.slug || '').trim();
          if (slug) {
            setResolvedClubSlug(slug);
            return;
          }
        }

        const res2 = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubSlugOrId)}/`, {
          credentials: 'include',
        });
        if (res2.ok) {
          const project = getEnvelopeData<Project>(await res2.json().catch(() => null));
          const slug = String(project?.slug || '').trim();
          if (slug) setResolvedClubSlug(slug);
        }
      } finally {
        setClubSlugResolved(true);
      }
    };

    run();
  }, [apiBaseUrl, clubSlugOrId, orgSlugOrId, shouldResolveClubSlug]);

  const pendingClubSlugResolve = shouldResolveClubSlug && !clubSlugResolved;
  const clubSlugRedirectTarget =
    shouldResolveClubSlug &&
    resolvedClubSlug &&
    resolvedClubSlug !== clubSlugOrId &&
    orgSlugOrId &&
    projectSlugOrId &&
    seasonKeyOrId &&
    effectiveCompetitionId &&
    effectiveMatchId
      ? `/${orgSlugOrId}/${resolvedClubSlug}/${projectSlugOrId}/${seasonKeyOrId}/${effectiveCompetitionId}/${effectiveMatchId}${location.search || ''}`
      : null;

  const seasonsBasePath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const competitionBasePath = useMemo(() => {
    const seasonKey = String(seasonKeyOrId || '').trim();
    const compKey = String(effectiveCompetitionId || '').trim();
    if (!seasonKey || !compKey) return '';
    return `${seasonsBasePath}/${seasonKey}/${compKey}`;
  }, [effectiveCompetitionId, isTeamRoute, seasonKeyOrId, seasonsBasePath]);

  const matchBasePath = useMemo(() => {
    if (!competitionBasePath || !effectiveMatchId) return '';
    return `${competitionBasePath}/${effectiveMatchId}`;
  }, [competitionBasePath, effectiveMatchId]);

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'content', 'lineup', 'transactions']);
    if (allowed.has(raw)) return raw;
    const legacyMap: Record<string, string> = {
      hierarchy: 'details',
      match: 'details',
      date: 'details',
    };
    return legacyMap[raw] || 'overview';
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const pathname = location.pathname;
    if (!pathname) return;

    const params = new URLSearchParams(location.search);
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }

    const search = params.toString();
    navigate({ pathname, search: search ? `?${search}` : '' });
  };



  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !seasonKeyOrId || !effectiveCompetitionId || !effectiveMatchId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes, matchRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
            { credentials: 'include' }
          ),
          isTeamRoute
            ? fetch(
                `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
                { credentials: 'include' }
              )
            : Promise.resolve(null as any),
          fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(effectiveMatchId)}/`, { credentials: 'include' }),
        ]);

        if (orgRes.ok) setOrg(getEnvelopeData(await orgRes.json()));
        let projectJson: Project | null = null;
        if (projectRes.ok) {
          projectJson = getEnvelopeData<Project>(await projectRes.json());
          setProject(projectJson);
        }
        if (isTeamRoute && clubRes?.ok) setClub(getEnvelopeData(await clubRes.json()));

        if (!projectJson?.id) throw new Error('Failed to load project');

        // Resolve season UUID from URL param (UUID or slugified name) using root periods only
        let seasonUuid = '';
        if (looksLikeUuid(seasonKeyOrId)) {
          seasonUuid = String(seasonKeyOrId).trim();
        } else {
          const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(
            String(projectJson.id)
          )}&parent_id=null&page_size=500`;
          const rootRes = await fetch(rootPeriodsUrl, { credentials: 'include' });
          if (rootRes.ok) {
            const rootRaw: any = await rootRes.json().catch(() => null);
            const rootPeriods = getEnvelopeListResults<Period>(rootRaw);
            const resolved = rootPeriods.find((p: any) => periodPathKey(p) === String(seasonKeyOrId));
            seasonUuid = String((resolved as any)?.id || '').trim();
          }
        }

        // Resolve competition UUID from URL param (UUID or slugified name) against season children
        let competitionUuid = '';
        if (looksLikeUuid(effectiveCompetitionId)) {
          competitionUuid = String(effectiveCompetitionId).trim();
        } else if (seasonUuid) {
          const childrenUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(seasonUuid)}&page_size=500`;
          const childrenRes = await fetch(childrenUrl, { credentials: 'include' });
          if (childrenRes.ok) {
            const childrenRaw: any = await childrenRes.json().catch(() => null);
            const children = getEnvelopeListResults<Period>(childrenRaw);
            const resolved = children.find((p: any) => periodPathKey(p) === String(effectiveCompetitionId));
            competitionUuid = String((resolved as any)?.id || '').trim();
          }
        }

        if (!seasonUuid) throw new Error('Season not found');
        if (!competitionUuid) throw new Error('Competition not found');

        setResolvedSeasonUuid(seasonUuid);
        setResolvedCompetitionUuid(competitionUuid);

        const [seasonRes, competitionRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, { credentials: 'include' }),
        ]);

        if (!seasonRes.ok) throw new Error('Failed to load season');
        const seasonJson = getEnvelopeData<Period>(await seasonRes.json());
        setSeason(seasonJson);

        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const competitionJson = getEnvelopeData<Period>(await competitionRes.json());
        setCompetition(competitionJson);

        // Canonicalize URL to slugs when possible
        const desiredSeasonKey = periodPathKey(seasonJson) || '';
        const desiredCompetitionKey = periodPathKey(competitionJson) || '';
        if (
          desiredSeasonKey &&
          desiredCompetitionKey &&
          (String(desiredSeasonKey) !== String(seasonKeyOrId) ||
            String(desiredCompetitionKey) !== String(effectiveCompetitionId))
        ) {
          const suffix = location.search ? location.search : '';
          navigate(
            `${seasonsBasePath}/${desiredSeasonKey}/${desiredCompetitionKey}/${effectiveMatchId}${suffix}`,
            { replace: true }
          );
          return;
        }

        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        const matchJson = getEnvelopeData<MatchDetail>(await matchRes.json());
        setMatch(matchJson);

        const desiredMatchKey = String((matchJson as any)?.slug || '').trim();
        if (desiredMatchKey && desiredMatchKey !== String(effectiveMatchId)) {
          const suffix = location.search ? location.search : '';
          const seasonKey = periodPathKey(seasonJson) || String(seasonKeyOrId);
          const compKey = periodPathKey(competitionJson) || String(effectiveCompetitionId);
          navigate(
            `${seasonsBasePath}/${seasonKey}/${compKey}/${desiredMatchKey}${suffix}`,
            { replace: true }
          );
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    orgSlugOrId,
    projectSlugOrId,
    clubSlugOrId,
    isTeamRoute,
    seasonKeyOrId,
    effectiveCompetitionId,
    effectiveMatchId,
  ]);

  useEffect(() => {
    const run = async () => {
      if (!match?.project?.id || !orgSlugOrId) return;
      try {
        setRosterLoading(true);
        setRosterError(null);

        const asArray = (value: any): any[] => (Array.isArray(value) ? value : []);
        const unwrap = (raw: any): any => raw?.data ?? raw;
        const extractList = (payload: any): any[] => {
          const unwrapped = unwrap(payload);
          if (Array.isArray(unwrapped)) return unwrapped;

          // Common envelope shapes across the API:
          // - { data: [...] }
          // - { data: { results: [...] } }
          // - { data: { data: [...] } }
          // - { data: { data: { results: [...] } } }
          if (Array.isArray(unwrapped?.results)) return unwrapped.results;
          if (Array.isArray(unwrapped?.items)) return unwrapped.items;
          if (Array.isArray(unwrapped?.data)) return unwrapped.data;
          if (Array.isArray(unwrapped?.data?.results)) return unwrapped.data.results;
          if (Array.isArray(unwrapped?.data?.items)) return unwrapped.data.items;
          if (Array.isArray(unwrapped?.data?.data)) return unwrapped.data.data;
          if (Array.isArray(unwrapped?.data?.data?.results)) return unwrapped.data.data.results;

          return [];
        };

        const buildSyntheticMember = (id: string, label: string): OrgMember => {
          return {
            id,
            user: {
              id,
              full_name: label,
            },
          };
        };

        // 1) Project members (user ids) — used for persona grouping + fallback roster matching
        const seasonUuid = String(resolvedSeasonUuid || '').trim();
        const baseMembersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(match.project.id))}/members/`;

        const fetchMembers = async (withSeasonFilter: boolean) => {
          const params = new URLSearchParams();
          params.set('page_size', '500');
          if (withSeasonFilter && seasonUuid) params.set('period', seasonUuid);
          const res = await fetch(`${baseMembersUrl}?${params.toString()}`, { credentials: 'include' });
          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            return { ok: false, status: res.status, detail, list: [] as any[] };
          }
          const raw = await res.json().catch(() => null);
          return { ok: true, status: res.status, detail: '', list: extractList(raw) };
        };

        let projectMembers: any[] = [];
        let lastRosterError: string | null = null;
        if (seasonUuid) {
          const seasonAttempt = await fetchMembers(true);
          if (seasonAttempt.ok) {
            projectMembers = seasonAttempt.list;
          } else {
            lastRosterError = `Failed to load season roster (${seasonAttempt.status}) ${seasonAttempt.detail || ''}`.trim();
          }

          // Fallback: if season roster is empty (legacy data), use full team roster
          if (projectMembers.length === 0) {
            const fallbackAttempt = await fetchMembers(false);
            if (fallbackAttempt.ok) {
              projectMembers = fallbackAttempt.list;
            } else {
              lastRosterError = `Failed to load team roster (${fallbackAttempt.status}) ${fallbackAttempt.detail || ''}`.trim();
            }
          }
        } else {
          const fallbackAttempt = await fetchMembers(false);
          if (fallbackAttempt.ok) {
            projectMembers = fallbackAttempt.list;
          } else {
            lastRosterError = `Failed to load team roster (${fallbackAttempt.status}) ${fallbackAttempt.detail || ''}`.trim();
          }
        }

        if (projectMembers.length === 0 && lastRosterError) {
          throw new Error(lastRosterError);
        }

        if (!Array.isArray(projectMembers)) projectMembers = [];
        setTeamProjectMembers(projectMembers as ProjectMember[]);
        const projectUserIds = new Set(
          asArray(projectMembers)
            .map((m: any) => String(m?.user?.id ?? m?.user_id ?? ''))
            .filter(Boolean)
        );

        // Prefer using organisation membership IDs directly from the project members endpoint.
        // This avoids relying on /organisations/:id/members (which may be permission-restricted).
        const eligibleFromProjectMembers: OrgMember[] = asArray(projectMembers)
          .map((m: any) => {
            const memberId = String(m?.organisation_membership_id || '').trim();
            if (!memberId) return null;
            return {
              id: memberId,
              user: m?.user,
            } as OrgMember;
          })
          .filter(Boolean) as OrgMember[];

        eligibleFromProjectMembers.sort((a: any, b: any) => {
          const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
          const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
          return an.localeCompare(bn);
        });

        // 2) Organisation memberships (membership ids + user) — best-effort only.
        // This is expensive for large orgs; only fetch it if we truly need it.
        // If project members already include organisation_membership_id, we can render rosters without it.
        let orgMembers: OrgMember[] = [];
        if (eligibleFromProjectMembers.length === 0) {
          try {
            const orgMembersRes = await fetch(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(String(orgSlugOrId))}/members/?page_size=1000`,
              { credentials: 'include' }
            );
            if (orgMembersRes.ok) {
              const orgMembersRaw = await orgMembersRes.json().catch(() => null);
              orgMembers = extractList(orgMembersRaw) as OrgMember[];
            } else {
              const detail = await orgMembersRes.text().catch(() => '');
              throw new Error(`Failed to load organisation members (${orgMembersRes.status}) ${detail || ''}`.trim());
            }
          } catch (e) {
            throw e;
          }
        }
        setOrgMembersAll(orgMembers);

        const byOrgMembershipId = new Map<string, OrgMember>();
        for (const m of asArray(orgMembers)) {
          if (m?.id) byOrgMembershipId.set(String(m.id), m);
        }

        let preferredEligibleMembers: OrgMember[] | null = null;

        if (eligibleFromProjectMembers.length > 0) {
          preferredEligibleMembers = eligibleFromProjectMembers;
        }

        // Prefer season squad as Period participations (TeamReel: squad lives on the season period)
        // This yields organisation membership IDs directly, which we need for match participations.
        if ((!preferredEligibleMembers || preferredEligibleMembers.length === 0) && seasonUuid) {
          const baseSquadParams = new URLSearchParams();
          baseSquadParams.set('page_size', '500');
          baseSquadParams.set('period_id', seasonUuid);

          const fetchSquad = async (withRoleFilter: boolean) => {
            const params = new URLSearchParams(baseSquadParams);
            if (withRoleFilter) params.set('role', 'squad_member');
            const res = await fetch(`${apiBaseUrl}/api/v1/participations/?${params.toString()}`, {
              credentials: 'include',
            });
            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              return { ok: false, status: res.status, detail, list: [] as any[] };
            }
            const raw = await res.json().catch(() => null);
            return { ok: true, status: res.status, detail: '', list: extractList(raw) };
          };

          const squadAttempt = await fetchSquad(true);
          let squadParticipations = squadAttempt.ok ? (squadAttempt.list as SeasonSquadParticipation[]) : [];

          // Fallback: if no explicit squad_member roles exist, list all period participations for the season.
          if (squadParticipations.length === 0) {
            const anyRoleAttempt = await fetchSquad(false);
            if (anyRoleAttempt.ok) squadParticipations = anyRoleAttempt.list as SeasonSquadParticipation[];
          }

          const squadMembers: OrgMember[] = [];
          for (const p of squadParticipations) {
            const mid = String(p?.member?.id || '').trim();
            if (!mid) continue;
            const existing = byOrgMembershipId.get(mid);
            if (existing) {
              squadMembers.push(existing);
            } else {
              const label = String(p?.member?.user_name || '—').trim();
              squadMembers.push(buildSyntheticMember(mid, label || '—'));
            }
          }

          if (squadMembers.length > 0) {
            const seen = new Set<string>();
            const deduped = squadMembers.filter((m) => {
              const key = String(m.id);
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            deduped.sort((a: any, b: any) => {
              const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
              const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
              return an.localeCompare(bn);
            });

            preferredEligibleMembers = deduped;
          }
        }

        // Intersection: project members must exist as org membership.
        if (!preferredEligibleMembers || preferredEligibleMembers.length === 0) {
          preferredEligibleMembers = asArray(orgMembers)
            .filter((m: any) => m?.id && projectUserIds.has(String(m?.user?.id ?? '')))
            .sort((a: any, b: any) => {
              const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
              const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
              return an.localeCompare(bn);
            });
        }

        setEligibleMembers(preferredEligibleMembers || []);

        // Optional: club project members (to detect club admin/supporter personas)
        if (club?.id) {
          const clubMembersRes = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/members/?page_size=500`,
            { credentials: 'include' }
          );
          if (clubMembersRes.ok) {
            const clubMembersRaw = await clubMembersRes.json().catch(() => null);
            const clubMembers = extractList(clubMembersRaw);
            setClubProjectMembers(clubMembers as ProjectMember[]);
          }
        }
      } catch (e) {
        setRosterError(e instanceof Error ? e.message : 'Failed to load roster');
      } finally {
        setRosterLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, club?.id, match?.project?.id, orgSlugOrId, resolvedSeasonUuid]);

  // Fetch project members for formation lineup editor (same as ContentGenerationModal)
  useEffect(() => {
    const projectIdVal = match?.project?.id;
    if (!projectIdVal) return;

    const fetchSquad = async () => {
      setLineupSquadLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectIdVal))}/members/?page_size=100`;
        const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return;
        const raw = await res.json();
        let members: any[] = [];
        if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
        else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
        else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
        else if (Array.isArray(raw?.data)) members = raw.data;
        else if (Array.isArray(raw)) members = raw;

        // Paginate
        let nextUrl = raw?.meta?.pagination?.next;
        while (nextUrl) {
          const nr = await fetch(nextUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
          if (!nr.ok) break;
          const nd = await nr.json();
          let nm: any[] = [];
          if (nd?.data?.data && Array.isArray(nd.data.data)) nm = nd.data.data;
          else if (Array.isArray(nd?.data)) nm = nd.data;
          else if (Array.isArray(nd)) nm = nd;
          members = [...members, ...nm];
          nextUrl = nd?.meta?.pagination?.next;
        }

        // Group by role (same logic as ContentGenerationModal)
        const groups: Record<string, any[]> = { goalkeeper: [], player: [], coach: [], assistant: [] };
        members.forEach((p: any) => {
          let roles: string[] = [];
          if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) roles = p.functional_roles;
          else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) roles = p.metadata.functional_roles;
          else if (p.data?.functional_role) roles = [p.data.functional_role];
          else if (p.metadata?.team_role) roles = [p.metadata.team_role];
          else roles = ['player'];
          roles.forEach(role => {
            const nr = role.toLowerCase();
            if (groups[nr]) groups[nr].push(p);
          });
        });
        setLineupSquad(groups);
      } catch { /* ignore */ } finally {
        setLineupSquadLoading(false);
      }
    };

    fetchSquad();
  }, [apiBaseUrl, match?.project?.id]);

  // Load saved lineup from match metadata on mount / match change
  useEffect(() => {
    const saved = match?.metadata?.lineup;
    if (saved) {
      if (saved.formation && FORMATION_LAYOUTS[saved.formation]) {
        setLineupFormation(saved.formation);
      }
      if (saved.goalkeeper || saved.player) {
        setLineupSlots({
          goalkeeper: saved.goalkeeper || [],
          player: saved.player || [],
        });
      }
      if (saved.bench) {
        setLineupBenchStatus(saved.bench);
      }
    } else if (match?.metadata?.formation) {
      setLineupFormation(match.metadata.formation);
    }
  }, [match?.id]); // eslint-disable-line react-hooks/exhaustive-deps



  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchIdValue = String(matchToEdit?.id || '').trim();
    if (!matchIdValue) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch || {}),
    });

    if (!res.ok) throw new Error('Failed to update match');
    const raw = await res.json().catch(() => null);
    const updated = getEnvelopeData<MatchDetail>(raw);
    setMatch(updated);
  };

  const saveLineup = async () => {
    if (!match?.id) return;
    setLineupSaving(true);
    setLineupSaveSuccess(false);
    try {
      const lineupData = {
        formation: lineupFormation,
        goalkeeper: lineupSlots.goalkeeper || [],
        player: lineupSlots.player || [],
        bench: lineupBenchStatus,
      };
      await saveMatchEdits(match, {
        metadata: {
          ...(match.metadata || {}),
          formation: lineupFormation,
          lineup: lineupData,
        },
      });
      setLineupSaveSuccess(true);
      setTimeout(() => setLineupSaveSuccess(false), 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save lineup');
    } finally {
      setLineupSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!match?.id) return;
    if (!window.confirm(`Are you sure you want to delete match ${match.title || match.id}?`)) return;

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      alert('Error deleting match');
      return;
    }

    // Navigate back to competition matches list.
    if (competitionBasePath) {
      navigate(`${competitionBasePath}?tab=matches`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match…</div>
        </PageContent>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-6">
        <PageContent>
          <Alert variant="error">{error || 'Match not found'}</Alert>
          <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </PageContent>
      </div>
    );
  }

  const date = match.start_time ? new Date(match.start_time) : null;
  const status = String(match.metadata?.status || 'scheduled');

  const homeTeamName = match.project?.name || 'Home';
  const awayTeamName = match.opponent_project?.name || 'Opponent';
  const scoreDisplay = status === 'finished'
    ? `${match.metadata?.home_score ?? 0} - ${match.metadata?.away_score ?? 0}`
    : 'vs';

  const sortLineup = (a: Participation, b: Participation) => {
    const isStarterA = String(a.role || '').toLowerCase() === 'starter';
    const isStarterB = String(b.role || '').toLowerCase() === 'starter';
    if (isStarterA && !isStarterB) return -1;
    if (!isStarterA && isStarterB) return 1;

    if (isStarterA) {
      if (a.data?.position === 'GK') return -1;
      if (b.data?.position === 'GK') return 1;
    }

    return (a.data?.jersey_number || 99) - (b.data?.jersey_number || 99);
  };

  const allParticipations = match.participations || [];
  const homeParticipations = allParticipations
    .filter(
      (p) => p.data?.side === 'home' || String(p.data?.team_id || '') === String(match.project?.id || '')
    )
    .sort(sortLineup);
  const awayParticipations = allParticipations
    .filter(
      (p) =>
        p.data?.side === 'away' ||
        (match.opponent_project && String(p.data?.team_id || '') === String(match.opponent_project.id))
    )
    .sort(sortLineup);

  const matchEvents = (match.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

  const renderLineup = (participations: Participation[] = []) => (
    <Table>
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Name</th>
          <th className="w-16">Pos</th>
        </tr>
      </thead>
      <tbody>
        {participations.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-gray-500 text-center py-4">
              No lineup available
            </td>
          </tr>
        ) : (
          participations.map((p) => (
            <tr key={p.id} className={String(p.role || '').toLowerCase() !== 'starter' ? 'bg-gray-50' : ''}>
              <td className="font-mono text-sm">{p.data?.jersey_number || '-'}</td>
              <td>
                <div className="font-medium">
                  {p.member?.user_name || 'Unknown Player'}
                  {p.data?.is_captain && (
                    <span className="ml-2 text-yellow-500" title="Captain">
                      ©
                    </span>
                  )}
                </div>
                {String(p.role || '').toLowerCase() !== 'starter' && p.role && (
                  <div className="text-xs text-gray-500 capitalize">{p.role.replace('_', ' ')}</div>
                )}
              </td>
              <td className="text-xs font-bold text-gray-400">{p.data?.position}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  const renderEventIcon = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'goal':
        return '⚽';
      case 'card_yellow':
        return '🟨';
      case 'card_red':
        return '🟥';
      case 'substitution':
        return 'cS'; // 🔄 glyph issue sometimes
      case 'injury':
        return '🚑';
      default:
        return '•';
    }
  };

  const displayMemberName = (m: OrgMember) => {
    const u: any = (m as any)?.user;
    const full = String(u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim()).trim();
    return full || String(u?.email || '—');
  };

  const upsertParticipationInState = (p: Participation) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const prevParts = prev.participations || [];
      const next = [...prevParts.filter((x) => String(x.id) !== String(p.id)), p];
      return { ...prev, participations: next };
    });
  };

  const removeParticipationFromState = (participationId: string) => {
    setMatch((prev) => {
      if (!prev) return prev;
      return { ...prev, participations: (prev.participations || []).filter((p) => String(p.id) !== String(participationId)) };
    });
  };

  const refreshMatch = async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const raw = await res.json().catch(() => null);
    setMatch(getEnvelopeData(raw));
  };

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    const raw = await res.json().catch(() => null);
    return (
      raw?.error?.message ||
      raw?.detail ||
      (typeof raw === 'string' ? raw : null) ||
      fallback
    );
  };

  const createParticipation = async (memberId: string, side: 'home' | 'away') => {
    if (!memberId) return;
    const teamId = side === 'home' ? String(match.project.id) : String(match.opponent_project?.id || '');
    const teamName = side === 'home' ? homeTeamName : awayTeamName;
    const body: any = {
      member_id: memberId,
      activity_id: String(match.id),
      role: 'starter',
      status: 'confirmed',
      data: {
        side,
        team_id: teamId || undefined,
        team_name: teamName,
      },
    };

    const res = await fetch(`${apiBaseUrl}/api/v1/participations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to add participant'));
    }
    const created = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(created));
    await refreshMatch();
  };

  const updateParticipation = async (p: Participation, patch: any) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to update participant'));
    }
    const updated = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(updated));
    await refreshMatch();
  };

  const deleteParticipation = async (p: Participation) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, 'Failed to remove participant'));
    }
    removeParticipationFromState(String(p.id));
    await refreshMatch();
  };

  const bulkCreateParticipations = async (memberIds: string[], side: 'home' | 'away') => {
    const ids = (memberIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!ids.length) return;

    // Prefer one bulk request for N adds.
    if (ids.length > 1) {
      const teamId = side === 'home' ? String(match?.project?.id || '') : String(match?.opponent_project?.id || '');
      const teamName = side === 'home' ? homeTeamName : awayTeamName;

      const res = await fetch(`${apiBaseUrl}/api/v1/participations/bulk/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          activity_id: String(match?.id),
          member_ids: ids,
          role: 'starter',
          status: 'confirmed',
          data: {
            side,
            team_id: teamId || undefined,
            team_name: teamName,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'Failed to add participants'));
      }
      await refreshMatch();
      return;
    }

    await createParticipation(ids[0], side);
  };

  const bulkDeleteParticipations = async (participationIds: string[]) => {
    const ids = (participationIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!ids.length) return;

    if (ids.length > 1) {
      const res = await fetch(`${apiBaseUrl}/api/v1/participations/bulk-delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ participation_ids: ids }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'Failed to remove participants'));
      }
      await refreshMatch();
      return;
    }

    const p = (match?.participations || []).find((x) => String((x as any)?.id || '') === ids[0]);
    if (p) await deleteParticipation(p);
  };

  const renderLineupEditor = (side: 'home' | 'away') => {
    const isHome = side === 'home';
    const title = isHome ? homeTeamName : awayTeamName;
    const selected = (isHome ? homeParticipations : awayParticipations) || [];
    const allSelectedMemberIds = new Set((match.participations || []).map((p) => String(p.member?.id || '')));

    // Available: eligible members that aren't already in the match (any side)
    const available = eligibleMembers.filter((m) => !allSelectedMemberIds.has(String(m.id)));
    const currentAddId = isHome ? addHomeMemberId : addAwayMemberId;
    const setCurrentAddId = isHome ? setAddHomeMemberId : setAddAwayMemberId;

    const eligibleSearch = isHome ? lineupEligibleSearchHome : lineupEligibleSearchAway;
    const setEligibleSearch = isHome ? setLineupEligibleSearchHome : setLineupEligibleSearchAway;

    const selectedEligibleIds = isHome ? selectedEligibleLineupMemberIdsHome : selectedEligibleLineupMemberIdsAway;
    const setSelectedEligibleIds = isHome ? setSelectedEligibleLineupMemberIdsHome : setSelectedEligibleLineupMemberIdsAway;

    const selectedLineupIds = isHome ? selectedLineupParticipationIdsHome : selectedLineupParticipationIdsAway;
    const setSelectedLineupIds = isHome ? setSelectedLineupParticipationIdsHome : setSelectedLineupParticipationIdsAway;

    const filteredAvailable = (() => {
      const q = String(eligibleSearch || '').trim().toLowerCase();
      if (!q) return available;
      return available.filter((m) => displayMemberName(m).toLowerCase().includes(q));
    })();

    return (
      <Card title={`Lineup: ${title}`}>
        {rosterError && <Alert variant="error">{rosterError}</Alert>}
        {!rosterError && !rosterLoading && eligibleMembers.length === 0 && (
          <Alert variant="warning">
            No eligible players found. Add players to this season’s squad first.
            If the squad exists but this list is empty, either the backend is not returning organisation membership IDs for project members,
            or the organisation members endpoint is not accessible for this user.
          </Alert>
        )}
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
              Add player (single)
            </label>
            <select
              value={currentAddId}
              onChange={(e) => setCurrentAddId(e.target.value)}
              disabled={rosterLoading || available.length === 0 || lineupBulkSubmitting}
              style={{
                minWidth: '240px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">{rosterLoading ? 'Loading roster…' : available.length ? 'Select player…' : 'No players available'}</option>
              {available.map((m) => (
                <option key={String(m.id)} value={String(m.id)}>
                  {displayMemberName(m)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!currentAddId || lineupBulkSubmitting}
              onClick={async () => {
                try {
                  await createParticipation(currentAddId, side);
                  setCurrentAddId('');
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Failed to add player');
                }
              }}
            >
              Add to lineup
            </Button>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 2 }}>
                <div style={{ fontWeight: 600 }}>Not in lineup</div>
                <div style={{ fontSize: 13, color: 'var(--app-muted-text)' }}>Select team members and assign them to this match lineup.</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const allIds = filteredAvailable.map((m) => String(m.id)).filter(Boolean);
                    const allSelected = allIds.length > 0 && allIds.every((id) => selectedEligibleIds.has(id));
                    setSelectedEligibleIds(allSelected ? new Set() : new Set(allIds));
                  }}
                  disabled={lineupBulkSubmitting || filteredAvailable.length === 0}
                >
                  {(() => {
                    const allIds = filteredAvailable.map((m) => String(m.id)).filter(Boolean);
                    const allSelected = allIds.length > 0 && allIds.every((id) => selectedEligibleIds.has(id));
                    return allSelected ? 'Unselect all' : 'Select all';
                  })()}
                </Button>
                <button
                  type="button"
                  className="app-action-button"
                  disabled={lineupBulkSubmitting || selectedEligibleIds.size === 0}
                  onClick={async () => {
                    const ids = Array.from(selectedEligibleIds.values()).filter(Boolean);
                    if (!ids.length) return;
                    try {
                      setLineupBulkSubmitting(true);
                      await bulkCreateParticipations(ids, side);
                      setSelectedEligibleIds(new Set());
                      setEligibleSearch('');
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Failed to add players');
                    } finally {
                      setLineupBulkSubmitting(false);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: '14px',
                    minWidth: '160px',
                    fontWeight: 500,
                    background: '#16a34a',
                    color: 'white',
                    borderRadius: '6px',
                  }}
                >
                  Assign ({selectedEligibleIds.size})
                </button>
              </div>
            </div>

            <input
              value={eligibleSearch}
              onChange={(e) => setEligibleSearch(e.target.value)}
              placeholder="Search"
              disabled={lineupBulkSubmitting}
              style={{
                width: '280px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
              }}
            />

            {filteredAvailable.length === 0 ? (
              <Alert variant="info">Everyone eligible is already in the lineup.</Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <th style={{ width: '44px' }}></th>
                      <th>Name</th>
                      <th style={{ width: '120px' }} className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailable.map((m) => {
                      const memberId = String(m.id || '').trim();
                      const checked = Boolean(memberId && selectedEligibleIds.has(memberId));
                      return (
                        <tr key={memberId}>
                          <td>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!memberId || lineupBulkSubmitting}
                              onChange={() => {
                                if (!memberId) return;
                                setSelectedEligibleIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(memberId)) next.delete(memberId);
                                  else next.add(memberId);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td>
                            <div className="font-medium">{displayMemberName(m)}</div>
                          </td>
                          <td className="text-right">
                            <Button
                              variant="secondary"
                              disabled={!memberId || lineupBulkSubmitting}
                              onClick={async () => {
                                if (!memberId) return;
                                try {
                                  setLineupBulkSubmitting(true);
                                  await bulkCreateParticipations([memberId], side);
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : 'Failed to add player');
                                } finally {
                                  setLineupBulkSubmitting(false);
                                }
                              }}
                            >
                              Assign
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 2 }}>
              <div style={{ fontWeight: 600 }}>In lineup</div>
              <div style={{ fontSize: 13, color: 'var(--app-muted-text)' }}>Select lineup entries and unassign them.</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const allIds = selected.map((p) => String(p.id || '').trim()).filter(Boolean);
                  const allSelected = allIds.length > 0 && allIds.every((id) => selectedLineupIds.has(id));
                  setSelectedLineupIds(allSelected ? new Set() : new Set(allIds));
                }}
                disabled={lineupBulkSubmitting || selected.length === 0}
              >
                {(() => {
                  const allIds = selected.map((p) => String(p.id || '').trim()).filter(Boolean);
                  const allSelected = allIds.length > 0 && allIds.every((id) => selectedLineupIds.has(id));
                  return allSelected ? 'Unselect all' : 'Select all';
                })()}
              </Button>
              <button
                type="button"
                className="app-action-button"
                disabled={lineupBulkSubmitting || selectedLineupIds.size === 0}
                onClick={async () => {
                  const ids = Array.from(selectedLineupIds.values()).filter(Boolean);
                  if (!ids.length) return;
                  try {
                    setLineupBulkSubmitting(true);
                    await bulkDeleteParticipations(ids);
                    setSelectedLineupIds(new Set());
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Failed to remove players');
                  } finally {
                    setLineupBulkSubmitting(false);
                  }
                }}
                style={{
                  padding: '8px 14px',
                  fontSize: '14px',
                  minWidth: '160px',
                  fontWeight: 500,
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                }}
              >
                Unassign ({selectedLineupIds.size})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th style={{ width: '44px' }}></th>
                  <th>Name</th>
                  <th style={{ width: '140px' }}>Role</th>
                  <th style={{ width: '120px' }} className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {selected.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-gray-500 text-center py-4">
                      No lineup selected
                    </td>
                  </tr>
                ) : (
                  selected.map((p) => {
                    const pid = String(p.id || '').trim();
                    const checked = Boolean(pid && selectedLineupIds.has(pid));
                    return (
                      <tr key={pid}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!pid || lineupBulkSubmitting}
                            onChange={() => {
                              if (!pid) return;
                              setSelectedLineupIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(pid)) next.delete(pid);
                                else next.add(pid);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <div className="font-medium">{p.member?.user_name || 'Unknown Player'}</div>
                          {p.data?.jersey_number ? <div className="text-xs text-gray-500">#{p.data.jersey_number}</div> : null}
                        </td>
                        <td>
                          <select
                            value={String(p.role || 'starter')}
                            disabled={lineupBulkSubmitting}
                            onChange={async (e) => {
                              const nextRole = e.target.value;
                              try {
                                await updateParticipation(p, { role: nextRole });
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to update role');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid var(--app-border)',
                              background: 'var(--app-surface)',
                              color: 'var(--app-text)',
                            }}
                          >
                            <option value="starter">Starter</option>
                            <option value="substitute">Substitute</option>
                          </select>
                        </td>
                        <td className="text-right">
                          <Button
                            variant="secondary"
                            disabled={lineupBulkSubmitting}
                            onClick={async () => {
                              try {
                                setLineupBulkSubmitting(true);
                                await bulkDeleteParticipations([pid]);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to remove player');
                              } finally {
                                setLineupBulkSubmitting(false);
                              }
                            }}
                          >
                            Unassign
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>
    );
  };

  if (pendingClubSlugResolve) return null;
  if (clubSlugRedirectTarget) return <Navigate to={clubSlugRedirectTarget} replace />;

  return (
    <>
      <div>
        <PageHeader
          title={match.title}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const isActive = !!match && String(activeContext?.match?.id ?? '') === String((match as any)?.id ?? '');
                const headerButtonStyle: React.CSSProperties = {
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                };
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!match || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('match', String(match.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    style={{
                      ...headerButtonStyle,
                      border: isActive ? '1px solid #10b981' : headerButtonStyle.border,
                      backgroundColor: isActive ? '#dcfce7' : headerButtonStyle.backgroundColor,
                      color: isActive ? '#166534' : headerButtonStyle.color,
                      fontWeight: isActive ? 600 : headerButtonStyle.fontWeight,
                      opacity: activatingContext || isActive ? 0.8 : 1,
                      cursor: activatingContext || isActive ? 'not-allowed' : 'pointer',
                    }}
                    title="Set this match as your active context"
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setIsMatchDetailModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setIsMatchEditModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDeleteMatch}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => openContentModal()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Generate Content (AI)
              </button>
              <button
                type="button"
                onClick={() => setIsCreateTxnModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Create transaction
              </button>
            </div>
          }
        />

        <CreateTransactionModal
          isOpen={isCreateTxnModalOpen}
          onClose={() => setIsCreateTxnModalOpen(false)}
          onCreated={() => {
            navigateToTab('transactions');
          }}
          title="Create match transaction"
          scope="match"
          organizationId={String(org?.id || '').trim()}
          defaultProjectId={match?.project?.id != null ? String(match.project.id) : project?.id != null ? String(project.id) : null}
          seasonId={String(resolvedSeasonUuid || '').trim() || null}
          periodId={String(match?.period?.id || '').trim() || null}
          activityId={String(match?.id || '').trim() || null}
          currentUserId={Number((user as any)?.id)}
          chargedUserId={Number((user as any)?.id)}
          walletOptions={matchWalletOptions}
        />

        <MatchDetailModal
          opened={isMatchDetailModalOpen}
          onClose={() => setIsMatchDetailModalOpen(false)}
          match={match as any}
        />

        <MatchEditModal
          opened={isMatchEditModalOpen}
          onClose={() => setIsMatchEditModalOpen(false)}
          match={match as any}
          onSave={async (payload) => {
            await saveMatchEdits(match as any, payload);
          }}
        />

        <ContentGenerationModal
            isOpen={isContentModalOpen}
            onClose={closeContentModal}
            matchData={match}
            season={season}
            organisationSport={org?.sport}
            organisationId={org?.id || orgId}
            template={selectedTemplate}
            contentTypeLabel={selectedContentTypeLabel}
        />

        {/* Content Preview Modal */}
        {isContentPreviewOpen && selectedContentItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
            onClick={closeContentPreview}
          >
            <div
              style={{
                backgroundColor: 'var(--app-card-bg)',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--app-border)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                    {selectedContentItem.template?.name || 'Generated Content'}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--app-muted-text)', marginTop: '4px' }}>
                    Generated {new Date(selectedContentItem.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={closeContentPreview}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: 'var(--app-muted-text)',
                    padding: '4px 8px',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px' }}>
                {selectedContentItem.output_file?.url ? (
                  <div style={{ textAlign: 'center' }}>
                    {/* Check if it's a video or image based on file extension or url */}
                    {selectedContentItem.output_file.url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video
                        src={selectedContentItem.output_file.url}
                        controls
                        style={{
                          maxWidth: '100%',
                          maxHeight: '60vh',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <img
                        src={selectedContentItem.output_file.url}
                        alt={selectedContentItem.template?.name || 'Generated content'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '60vh',
                          borderRadius: '8px',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">🖼️</div>
                    <p>Preview not available</p>
                    <p className="text-sm">The generated file is being processed</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderTop: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-bg)',
                  borderRadius: '0 0 12px 12px',
                }}
              >
                <Badge
                  variant={['completed', 'approved'].includes(selectedContentItem.status) ? 'success' : 'warning'}
                >
                  {selectedContentItem.status}
                </Badge>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedContentItem.output_file?.url && (
                    <a
                      href={selectedContentItem.output_file.url}
                      download={selectedContentItem.output_file.file_name || 'content'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: 'var(--app-primary)',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      ⬇️ Download
                    </a>
                  )}
                  <Button variant="secondary" onClick={closeContentPreview}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Asset Preview Modal */}
        {savedAssetPreview && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
            onClick={() => setSavedAssetPreview(null)}
          >
            <div
              style={{
                backgroundColor: 'var(--app-card-bg)',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '92%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--app-border)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{savedAssetPreview.title}</h3>
                  {savedAssetPreview.subtitle && (
                    <div style={{ fontSize: '13px', color: 'var(--app-muted-text)', marginTop: '4px' }}>
                      {savedAssetPreview.subtitle}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSavedAssetPreview(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: 'var(--app-muted-text)',
                    padding: '4px 8px',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  {savedAssetPreview.isVideo ? (
                    <video
                      src={savedAssetPreview.url}
                      controls
                      style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px' }}
                    />
                  ) : (
                    <img
                      src={savedAssetPreview.url}
                      alt={savedAssetPreview.title}
                      style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderTop: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-bg)',
                  borderRadius: '0 0 12px 12px',
                  gap: '8px',
                }}
              >
                <a
                  href={savedAssetPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--app-primary)',
                    color: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  🔗 Open
                </a>
                <Button variant="secondary" onClick={() => setSavedAssetPreview(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'content', label: 'Content' },
            { id: 'lineup', label: 'Lineup' },
            { id: 'transactions', label: 'Transactions' },
          ]}
          activeTab={activeTab}
        />

        <PageContent>
          {activeTab === 'overview' && (() => {
            // Derive logo URLs from club/project metadata
            const homeLogoUrl = (() => {
              const assets = (club as any)?.metadata?.teamreel_assets || (project as any)?.metadata?.teamreel_assets;
              const url = assets?.logo?.url;
              return url ? (url.startsWith('http') ? url : getAssetUrl(url)) : null;
            })();
            const awayLogoUrl = (() => {
              const url = match.metadata?.opponent_logo_url;
              return url ? (url.startsWith('http') ? url : getAssetUrl(url)) : null;
            })();

            // Content completion matrix: gather all match-level content types
            const allMatchContentItems = [
              ...CONTENT_TYPES.pre_match.items,
              ...CONTENT_TYPES.during_match.items,
              ...CONTENT_TYPES.post_match.items,
            ];

            return (
            <>
              <Card className="mb-6">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '24px 16px',
                  }}
                >
                  {/* Home team */}
                  <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {homeLogoUrl ? (
                      <img src={homeLogoUrl} alt={homeTeamName} style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--app-surface-secondary, #2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏠</div>
                    )}
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: 700 }}>{homeTeamName}</h3>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'center', minWidth: '140px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{scoreDisplay}</div>
                    <div style={{ marginTop: '12px', color: 'var(--app-text-secondary)' }}>
                      <Badge variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}>
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--app-text-secondary)' }}>
                      {date
                        ? `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : '—'}
                    </div>
                  </div>

                  {/* Away team */}
                  <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {awayLogoUrl ? (
                      <img src={awayLogoUrl} alt={awayTeamName} style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--app-surface-secondary, #2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚽</div>
                    )}
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: 700 }}>{awayTeamName}</h3>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    borderTop: '1px solid var(--app-border)',
                    padding: '10px 16px',
                    color: 'var(--app-text-secondary)',
                    fontSize: '0.9rem',
                  }}
                >
                  📍 {match.location || match.metadata?.venue || 'Unknown Venue'} • 🏆{' '}
                  {competition?.name || match.period?.name || 'Competition'}
                </div>
              </Card>

              {/* Content Generation Matrix */}
              <Card title="📊 Content Status">
                <div style={{ padding: '16px' }}>
                  <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--app-border, #333)', fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fase</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--app-border, #333)', fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content</th>
                          <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--app-border, #333)', fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['pre_match', 'during_match', 'post_match'] as const).map(categoryKey => {
                          const category = CONTENT_TYPES[categoryKey];
                          if (!category) return null;
                          return category.items.map((item, idx) => {
                            const latestMedia = getLatestMediaForSubtype(item.subtype);
                            const existingItem = getContentItemForSubtype(item.subtype);
                            const isGenerating = existingItem != null && ['queued', 'generating'].includes(existingItem.status);
                            const isFailed = existingItem?.status === 'failed';
                            const hasMedia = latestMedia != null;

                            let statusIcon = '⬜';
                            let statusText = 'Niet gemaakt';
                            let statusColor = 'var(--app-text-secondary, #999)';
                            if (isGenerating) {
                              statusIcon = '⏳';
                              statusText = 'Bezig...';
                              statusColor = '#f59e0b';
                            } else if (isFailed) {
                              statusIcon = '❌';
                              statusText = 'Mislukt';
                              statusColor = '#ef4444';
                            } else if (hasMedia) {
                              statusIcon = '✅';
                              statusText = 'Gereed';
                              statusColor = '#10b981';
                            }

                            return (
                              <tr key={item.id} style={{ borderBottom: idx === category.items.length - 1 ? '2px solid var(--app-border, #333)' : '1px solid var(--app-border, #222)' }}>
                                {idx === 0 && (
                                  <td
                                    rowSpan={category.items.length}
                                    style={{
                                      padding: '8px 10px',
                                      fontWeight: 600,
                                      fontSize: 12,
                                      color: 'var(--app-text-secondary, #aaa)',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid var(--app-border, #333)',
                                    }}
                                  >
                                    {category.label}
                                  </td>
                                )}
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ marginRight: 6 }}>{item.icon}</span>
                                  {item.label}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span title={statusText} style={{ cursor: 'default', color: statusColor, fontWeight: 600, fontSize: 12 }}>
                                    {statusIcon} {statusText}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--app-text-secondary, #999)' }}>
                    {(() => {
                      const total = allMatchContentItems.length;
                      const done = allMatchContentItems.filter(item => getLatestMediaForSubtype(item.subtype) != null).length;
                      const generating = allMatchContentItems.filter(item => {
                        const ci = getContentItemForSubtype(item.subtype);
                        return ci != null && ['queued', 'generating'].includes(ci.status);
                      }).length;
                      return (
                        <>
                          <span>✅ {done}/{total} gereed</span>
                          {generating > 0 && <span>⏳ {generating} bezig</span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              {/* Match Events & Lineups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Match Events">
                  {matchEvents.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">No events recorded.</div>
                  ) : (
                    <div className="space-y-3">
                      {matchEvents.map((evt) => {
                        const isHome = String(evt.team_project?.id || '') === String(match.project?.id || '');
                        return (
                          <div key={evt.id} className="flex items-center text-sm">
                            <div className="font-mono font-bold w-8 text-right mr-3 text-gray-400">{evt.minute}'</div>
                            <div className={`flex-1 flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                              <span className="text-xl mx-2" title={evt.event_type}>
                                {renderEventIcon(evt.event_type)}
                              </span>
                              <div>
                                <div className="font-medium">{evt.member?.user_name || 'Unknown'}</div>
                                {evt.related_member && (
                                  <div className="text-xs text-gray-500">({evt.related_member.user_name})</div>
                                )}
                                {String(evt.event_type || '').toLowerCase() === 'substitution' && evt.related_member && (
                                  <div className="text-xs text-green-600">IN: {evt.related_member.user_name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card title="Lineups">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{homeTeamName}</div>
                      {renderLineup(homeParticipations)}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{awayTeamName}</div>
                      {renderLineup(awayParticipations)}
                    </div>
                  </div>
                </Card>
              </div>
            </>
            );
          })()}

          {activeTab === 'content' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Sport info header */}
              {(competition?.sport || org?.sport) && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Templates for: <Badge variant="info" size="sm">
                      {competition?.sport?.sport_icon || org?.sport?.sport_icon || '⚽'} {competition?.sport?.name || org?.sport?.name}
                    </Badge>
                    {match?.metadata?.formation && (
                      <Badge variant="default" size="sm" style={{ marginLeft: '8px' }}>
                        Formation: {match.metadata.formation}
                      </Badge>
                    )}
                  </div>
                  {templatesLoading && (
                    <div className="text-sm text-gray-400">Loading templates...</div>
                  )}
                </div>
              )}

              {/* Match content types grouped by phase — MediaAssetCard tiles */}
              {matchMediaLoading ? (
                <Card title="Content">
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">⏳</div>
                    <p>Loading media...</p>
                  </div>
                </Card>
              ) : (
                (['pre_match', 'during_match', 'post_match'] as const).map(categoryKey => {
                  const category = CONTENT_TYPES[categoryKey];
                  if (!category) return null;
                  return (
                    <Card key={categoryKey} title={category.label}>
                      <MediaAssetGrid>
                        {category.items.map(item => {
                          // Get all templates for this subtype
                          const templates = availableTemplates[item.subtype] || [];
                          let matchedTemplate: ContentTemplate | undefined;

                          // Special handling for lineup: match on formation
                          if ((item.subtype === 'lineup' || item.subtype === 'lineup_flyer') && templates.length > 0) {
                            const matchFormation = match?.metadata?.formation;
                            if (matchFormation) {
                              matchedTemplate = templates.find(t =>
                                t.formation_detail?.code === matchFormation ||
                                t.name.toLowerCase().includes(matchFormation.toLowerCase().replace(/-/g, ''))
                              );
                            }
                            if (!matchedTemplate) matchedTemplate = templates[0];
                          } else {
                            matchedTemplate = templates[0];
                          }

                          const hasTemplate = !!matchedTemplate;
                          // Some subtypes skip template selection entirely (they go straight to confirm)
                          const templateNotRequired = ['match_intro', 'goal', 'poster'].includes(item.subtype);

                          // Check generation status from contentItems
                          const existingItem = getContentItemForSubtype(item.subtype);
                          const isGenerating = existingItem != null && ['queued', 'generating'].includes(existingItem.status);
                          const isFailed = existingItem?.status === 'failed';
                          const workflowStatus = existingItem?.status === 'approved' ? 'approved'
                            : existingItem?.status === 'rejected' ? 'rejected'
                            : null;

                          // Get latest saved media + history for this subtype
                          const latestMedia = getLatestMediaForSubtype(item.subtype);
                          const historyItems = getMediaHistoryForSubtype(item.subtype);

                          return (
                            <MediaAssetCard
                              key={`${categoryKey}-${item.id}`}
                              label={item.label}
                              subtype={item.subtype}
                              mediaItem={latestMedia}
                              icon={item.icon}
                              isGenerating={isGenerating}
                              isFailed={isFailed}
                              errorMessage={existingItem?.error_message ?? undefined}
                              workflowStatus={workflowStatus}
                              historyItems={historyItems}
                              onPreview={(mi) => {
                                const previewUrl = mi.file_url || getAssetUrl(mi.storage_path);
                                if (previewUrl) {
                                  const isVid = Boolean(
                                    mi.mime_type?.startsWith('video/') ||
                                    /\.(mp4|webm|mov)$/i.test(previewUrl)
                                  );
                                  setSavedAssetPreview({
                                    title: item.label,
                                    subtitle: 'Match media',
                                    url: previewUrl,
                                    isVideo: isVid,
                                  });
                                }
                              }}
                              onReplace={(hasTemplate || templateNotRequired) ? () => {
                                if (matchedTemplate) {
                                  openContentModal(matchedTemplate, item.label);
                                } else if (item.subtype === 'match_intro') {
                                  // Synthetic template so modal skips type selection
                                  openContentModal({
                                    id: 0, name: 'Match Intro', description: '', style_variant: '',
                                    template_type: 'pre_match', template_subtype: 'match_intro',
                                    is_active: true, input_requirements: {},
                                  } as any, item.label);
                                } else if (item.subtype === 'poster') {
                                  openContentModal({
                                    id: 0, name: 'Elftalfoto', description: '', style_variant: '',
                                    template_type: 'pre_match', template_subtype: 'poster',
                                    is_active: true,
                                    input_requirements: {
                                      members: {
                                        goalkeeper: { count: 1, asset_types: ['in_tenue'] },
                                        player: { count: 10, asset_types: ['in_tenue'] },
                                      },
                                    },
                                  } as any, item.label);
                                } else if (item.subtype === 'goal') {
                                  openContentModal({
                                    id: 0, name: 'Goal Celebration', description: '', style_variant: '',
                                    template_type: 'during_match', template_subtype: 'goal',
                                    is_active: true, input_requirements: {},
                                  } as any, item.label);
                                } else {
                                  openContentModal(undefined, item.label);
                                }
                              } : undefined}
                              onDelete={(mi) => handleDeleteMediaItem(mi)}
                              onRestore={(mi) => handleRestoreMediaItem(mi)}
                            />
                          );
                        })}
                      </MediaAssetGrid>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <GovernanceSummaryCard
                organisationId={String(org?.id || '')}
                projectId={String(match?.project?.id || project?.id || '')}
                title="Governance (Org policies)"
                description="Balance policy can warn/block match-scoped transactions when credits run low."
              />
              <TransactionsPanel
                title="Transactions"
                description="Match-scoped transactions (usage_event.metadata.activity_id)"
                filters={{
                  organization_id: String(org?.id || ''),
                  project_id: String(match?.project?.id || project?.id || ''),
                  activity_id: String(match?.id || ''),
                }}
              />
            </div>
          )}

          {activeTab === 'lineup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Formation Lineup Editor */}
              <Card title="⚽ Opstelling">
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Formation picker */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--app-text-secondary, #999)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Formatie</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: 8,
                    }}>
                      {Object.entries(FORMATION_LAYOUTS).map(([code, layout]) => {
                        const isSelected = lineupFormation === code;
                        return (
                          <button
                            key={code}
                            onClick={() => setLineupFormation(code)}
                            style={{
                              border: isSelected ? '2px solid #16a34a' : '1px solid var(--app-border, #333)',
                              borderRadius: 8,
                              cursor: 'pointer',
                              padding: 0,
                              background: isSelected ? 'rgba(22,163,74,0.1)' : 'var(--app-surface, #1e1e1e)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* Mini field preview */}
                            <div style={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: '3/4',
                              background: isSelected
                                ? 'linear-gradient(to bottom, #16a34a, #15803d)'
                                : 'linear-gradient(to bottom, #166534, #14532d)',
                              borderRadius: '7px 7px 0 0',
                            }}>
                              <div style={{ position: 'absolute', left: 8, right: 8, top: '15%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                              <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                              <div style={{
                                position: 'absolute', left: '50%', top: '50%',
                                width: 20, height: 20, transform: 'translate(-50%, -50%)',
                                border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%',
                              }} />
                              {layout.positions.map(pos => (
                                <div
                                  key={pos.slot}
                                  style={{
                                    position: 'absolute',
                                    left: `${pos.x}%`,
                                    top: `${pos.y}%`,
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                />
                              ))}
                            </div>
                            <div style={{
                              padding: '6px 4px',
                              textAlign: 'center',
                              fontSize: 12,
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#16a34a' : 'var(--app-text, #ccc)',
                            }}>{code}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field visualization */}
                  {lineupSquadLoading ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--app-text-secondary)' }}>
                      Spelers laden...
                    </div>
                  ) : (() => {
                    const formationLayout = FORMATION_LAYOUTS[lineupFormation] || FORMATION_LAYOUTS['4-3-3'];
                    // Dedup helper: use underlying user id to avoid duplicate names
                    const getUserKey = (p: any): string => {
                      const user = p.user || p.member;
                      if (user?.id) return String(user.id);
                      return String(p.id);
                    };
                    const gkPool = (lineupSquad.goalkeeper || [])
                      .filter((p: any, idx: number, arr: any[]) => arr.findIndex((x: any) => getUserKey(x) === getUserKey(p)) === idx);
                    const playersOnly = [...(lineupSquad.goalkeeper || []), ...(lineupSquad.player || [])];
                    const gkUserKeys = new Set(gkPool.map((p: any) => getUserKey(p)));
                    const playerPool = playersOnly
                      .filter((p: any) => !gkUserKeys.has(getUserKey(p)))
                      .filter((p: any, idx: number, arr: any[]) => arr.findIndex((x: any) => getUserKey(x) === getUserKey(p)) === idx);

                    const gkSelected = lineupSlots.goalkeeper || [];
                    const playerSelected = lineupSlots.player || [];

                    const getSquadMemberName = (p: any): string => {
                      const user = p.user || p.member;
                      if (!user) return 'Unknown';
                      if (user.name) return user.name;
                      if (user.user_name) return user.user_name;
                      const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                      if (full) return full;
                      if (user.email) return user.email;
                      return 'Unknown';
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: 500,
                          aspectRatio: '3 / 4',
                          margin: '0 auto',
                          background: 'linear-gradient(to bottom, #16a34a, #15803d)',
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: '1px solid var(--app-border, #333)',
                        }}>
                          {/* Field markings */}
                          <div style={{ position: 'absolute', left: 16, right: 16, top: '15%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
                          <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
                          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, transform: 'translate(-50%, -50%)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '14%', borderTop: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />
                          <div style={{ position: 'absolute', left: '22%', right: '22%', top: 0, height: '14%', borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />

                          {/* Position nodes */}
                          {formationLayout.positions.map(pos => {
                            const isGk = pos.slot === 1;
                            const role = isGk ? 'goalkeeper' : 'player';
                            const idx = isGk ? 0 : pos.slot - 2;
                            const selected = isGk ? gkSelected : playerSelected;
                            const currentId = selected[idx] || '';
                            const pool = isGk ? gkPool : playerPool;
                            const currentMember = currentId ? pool.find((p: any) => p.id === currentId) : null;
                            const jerseyNumber = currentMember?.metadata?.shirt_number || currentMember?.data?.jersey_number;

                            return (
                              <div
                                key={pos.slot}
                                style={{
                                  position: 'absolute',
                                  left: `${pos.x}%`,
                                  top: `${pos.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 2,
                                  zIndex: 10,
                                  minWidth: 100,
                                }}
                              >
                                {/* Position label */}
                                <div style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: 'rgba(255,255,255,0.7)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                }}>{pos.label}</div>

                                {/* Dropdown */}
                                <select
                                  value={currentId}
                                  onChange={(e) => {
                                    const newSelected = [...selected];
                                    while (newSelected.length <= idx) newSelected.push('');
                                    newSelected[idx] = e.target.value;
                                    setLineupSlots({ ...lineupSlots, [role]: [...newSelected] });
                                  }}
                                  style={{
                                    width: 120,
                                    padding: '4px 6px',
                                    fontSize: 11,
                                    fontWeight: currentId ? 700 : 400,
                                    background: currentId
                                      ? 'rgba(22,163,74,0.6)'
                                      : 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                    border: currentId
                                      ? '2px solid rgba(255,255,255,0.7)'
                                      : '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: 6,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.6)'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 6px center',
                                    paddingRight: 20,
                                  }}
                                >
                                  <option value="" style={{ background: '#1e1e1e', color: '#ccc' }}>— Kies —</option>
                                  {pool.map((p: any) => {
                                    const name = getSquadMemberName(p);
                                    const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                                    const allUsedIds = [...gkSelected, ...playerSelected].filter(Boolean);
                                    const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                                    return (
                                      <option
                                        key={p.id}
                                        value={p.id}
                                        disabled={isAlreadyUsed}
                                        style={{ background: '#1e1e1e', color: isAlreadyUsed ? '#666' : '#ccc' }}
                                      >
                                        {jersey ? `#${jersey} ` : ''}{name}{isAlreadyUsed ? ' ✗' : ''}
                                      </option>
                                    );
                                  })}
                                </select>

                                {/* Selected name display */}
                                {currentMember && (
                                  <div style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: '#fff',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                    maxWidth: 110,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                  }}>
                                    {jerseyNumber ? `#${jerseyNumber} ` : ''}{getSquadMemberName(currentMember)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary bar + Save button */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'var(--app-surface-secondary, #2a2a2a)',
                          borderRadius: 8,
                          fontSize: 13,
                          maxWidth: 500,
                          margin: '0 auto',
                          width: '100%',
                        }}>
                          <span style={{ color: 'var(--app-text-secondary, #999)' }}>
                            Formatie: <strong style={{ color: 'var(--app-text, #ccc)' }}>{lineupFormation}</strong>
                            {' • '}
                            {(() => {
                              const filled = [...gkSelected, ...playerSelected].filter(Boolean).length;
                              const total = formationLayout.positions.length;
                              return filled === total
                                ? <span style={{ color: '#10b981' }}>✓ Alle {total} posities ingevuld</span>
                                : <span>{filled} / {total} posities</span>;
                            })()}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {lineupSaveSuccess && (
                              <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>✓ Opgeslagen!</span>
                            )}
                            <button
                              onClick={saveLineup}
                              disabled={lineupSaving}
                              style={{
                                padding: '8px 20px',
                                fontSize: 13,
                                fontWeight: 600,
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: lineupSaving ? 'not-allowed' : 'pointer',
                                opacity: lineupSaving ? 0.7 : 1,
                              }}
                            >
                              {lineupSaving ? 'Opslaan...' : '💾 Opstelling opslaan'}
                            </button>
                          </div>
                        </div>

                        {/* Bench: squad members not in lineup */}
                        {(() => {
                          const allPool = [...gkPool, ...playerPool];
                          const usedIds = new Set([...gkSelected, ...playerSelected].filter(Boolean));
                          const benchMembers = allPool.filter((p: any) => !usedIds.has(p.id));

                          if (benchMembers.length === 0) return null;

                          return (
                            <div style={{
                              maxWidth: 500,
                              margin: '0 auto',
                              width: '100%',
                            }}>
                              <div style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'var(--app-text, #ccc)',
                                marginBottom: 8,
                              }}>Overige selectie ({benchMembers.length})</div>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                background: 'var(--app-surface-secondary, #2a2a2a)',
                                borderRadius: 8,
                                padding: '8px 0',
                              }}>
                                {benchMembers.map((p: any) => {
                                  const name = getSquadMemberName(p);
                                  const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                                  const status = lineupBenchStatus[p.id] || '';
                                  return (
                                    <div
                                      key={p.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 14px',
                                        gap: 8,
                                      }}
                                    >
                                      <span style={{
                                        fontSize: 13,
                                        color: 'var(--app-text, #ccc)',
                                        fontWeight: 500,
                                      }}>
                                        {jersey ? `#${jersey} ` : ''}{name}
                                      </span>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                          onClick={() => setLineupBenchStatus(prev => {
                                            const next = { ...prev };
                                            if (next[p.id] === 'wissel') { delete next[p.id]; } else { next[p.id] = 'wissel'; }
                                            return next;
                                          })}
                                          style={{
                                            padding: '3px 10px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            borderRadius: 4,
                                            border: status === 'wissel' ? '2px solid #f59e0b' : '1px solid var(--app-border, #444)',
                                            background: status === 'wissel' ? 'rgba(245,158,11,0.15)' : 'transparent',
                                            color: status === 'wissel' ? '#f59e0b' : 'var(--app-text-secondary, #999)',
                                            cursor: 'pointer',
                                          }}
                                        >Wissel</button>
                                        <button
                                          onClick={() => setLineupBenchStatus(prev => {
                                            const next = { ...prev };
                                            if (next[p.id] === 'afwezig') { delete next[p.id]; } else { next[p.id] = 'afwezig'; }
                                            return next;
                                          })}
                                          style={{
                                            padding: '3px 10px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            borderRadius: 4,
                                            border: status === 'afwezig' ? '2px solid #ef4444' : '1px solid var(--app-border, #444)',
                                            background: status === 'afwezig' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                            color: status === 'afwezig' ? '#ef4444' : 'var(--app-text-secondary, #999)',
                                            cursor: 'pointer',
                                          }}
                                        >Afwezig</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}
        </PageContent>
      </div>
    </>
  );
}
