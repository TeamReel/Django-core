import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchFlags } from '../../utils/featureFlagsApi';
import { periodPathKey } from '../../utils/periodPath';
import { type MatchMediaItem } from '../../components/MediaAssetCard';
import { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import { useAuth } from '@django-core/auth-ui';
import { type ContentTemplate, FORMATION_LAYOUTS } from '../identity/ContentGenerationModal';
import { actionButtonStyle } from '../identity/detail/detailStyles';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { useBrandProfile, getAssetUrl } from '../../hooks/useBrandProfile';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken } from '../../types/season';
import {
  type Participation,
  type ActivityEvent,
  type OrgMember,
  type SeasonSquadParticipation,
  type ProjectMember,
  type MatchDetail,
  type ContentItem,
  looksLikeIdentifier,
  getEnvelopeData,
  getEnvelopeListResults,
  normalizeFlagKey as normalizeFlagKeyHelper,
  slugify as slugifyHelper,
  buildTemplateFlagKeys as buildTemplateFlagKeysHelper,
} from './matchDetailTypes';

export type { MatchDetailDataReturn } from './matchDetailTypes';
export type {
  Participation, ActivityEvent, OrgMember, SeasonSquadParticipation,
  ProjectMember, MatchDetail, ContentItemStatus, ContentItem,
} from './matchDetailTypes';
import type { MatchDetailDataReturn } from './matchDetailTypes';

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function useMatchDetailData(): MatchDetailDataReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const {
    org,
    project,
    club,
    season,
    resolvedSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    clubBrand,
    brandLogoUrl,
    isPlayer,
    apiBaseUrl,
  } = useSeasonContext();

  const { competitionId, matchId } = useParams<{
    competitionId: string;
    matchId: string;
  }>();

  const [opponentClub, setOpponentClub] = useState<Project | null>(null);

  const opponentClubBrand = useBrandProfile({
    projectId: opponentClub?.id ? String(opponentClub.id) : undefined,
    organisationId: org?.id ? String(org.id) : undefined,
    autoFetch: !!opponentClub?.id,
  });

  const [competition, setCompetition] = useState<Period | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [resolvedCompetitionUuid, setResolvedCompetitionUuid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  useEffect(() => {
    if (!providerLoading && providerError) {
      setLoading(false);
      setError(providerError);
    }
  }, [providerLoading, providerError]);

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

  // Content Items
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentItemsLoading, setContentItemsLoading] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [isContentPreviewOpen, setIsContentPreviewOpen] = useState(false);

  // Match media
  const [matchMedia, setMatchMedia] = useState<MatchMediaItem[]>([]);
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);

  const fetchMatchMedia = useCallback(async () => {
    if (!match?.id) return;
    setMatchMediaLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/media/items/?activity=${match.id}`,
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
  }, [match?.id, apiBaseUrl]);

  useEffect(() => {
    if (match?.id) fetchMatchMedia();
  }, [match?.id, fetchMatchMedia]);

  const mediaBySubtype = useMemo(() => {
    const grouped: Record<string, { latest: MatchMediaItem; history: MatchMediaItem[] }> = {};
    const sorted = [...matchMedia].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    for (const item of sorted) {
      const subtype = (item.extraction_metadata?.asset_type as string) || 'other';
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

  const getLatestMediaForSubtype = useCallback((subtype: string): MatchMediaItem | null => {
    return mediaBySubtype[subtype]?.latest ?? null;
  }, [mediaBySubtype]);

  const getMediaHistoryForSubtype = useCallback((subtype: string): MatchMediaItem[] => {
    return mediaBySubtype[subtype]?.history ?? [];
  }, [mediaBySubtype]);

  const refreshMatchMedia = useCallback(async () => {
    await fetchMatchMedia();
  }, [fetchMatchMedia]);

  const handleDeleteMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/media/items/${item.id}/`,
        { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok || response.status === 204) {
        await fetchMatchMedia();
      } else {
        console.error('[Media] Delete failed:', response.status);
      }
    } catch (err) {
      console.error('[Media] Error deleting media item:', err);
    }
  }, [apiBaseUrl, fetchMatchMedia]);

  const handleRestoreMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/generative/assets/save/`,
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
        await fetchMatchMedia();
      } else {
        console.error('[Media] Restore failed:', response.status);
      }
    } catch (err) {
      console.error('[Media] Error restoring media item:', err);
    }
  }, [apiBaseUrl, match?.id, org?.id, match?.project?.id, project?.id, fetchMatchMedia]);

  const [savedAssetPreview, setSavedAssetPreview] = useState<{
    title: string;
    url: string;
    isVideo: boolean;
    subtitle?: string;
  } | null>(null);

  /* ---------- template flag helpers (from matchDetailTypes) -------- */
  const normalizeFlagKey = normalizeFlagKeyHelper;

  const slugify = slugifyHelper;

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
      return true;
    }
    const keys = buildTemplateFlagKeys(template);
    for (const key of keys) {
      const normalized = normalizeFlagKey(key);
      if (normalized in templateFlagMap) {
        return Boolean(templateFlagMap[normalized]);
      }
    }
    return true;
  };

  /* ---------- content items -------------------------------------- */
  const fetchContentItems = useCallback(async () => {
    if (!match?.id) return;
    setContentItemsLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/content-generation/items/?activity=${match.id}`,
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
  }, [match?.id, apiBaseUrl]);

  const getContentItemForSubtype = useCallback((subtype: string): ContentItem | null => {
    return contentItems.find(item => item.template?.template_subtype === subtype) || null;
  }, [contentItems]);

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
    fetchContentItems();
    void refreshMatchMedia();
  };

  /* ---------- toasts --------------------------------------------- */
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
    pushToast(message || '\u{1F4CB} Content wordt gegenereerd en komt in de approval queue.', 'success');
    void refreshMatchMedia();
  }, [pushToast, refreshMatchMedia]);

  const openContentPreview = (item: ContentItem) => {
    setSelectedContentItem(item);
    setIsContentPreviewOpen(true);
  };

  const closeContentPreview = () => {
    setIsContentPreviewOpen(false);
    setSelectedContentItem(null);
  };

  /* ---------- template availability flags ------------------------ */
  const fetchTemplateAvailabilityFlags = useCallback(async () => {
    if (!org?.id) return;
    setTemplateFlagsLoading(true);
    try {
      const flags = await fetchFlags(String(org.id), club?.id ? String(club.id) : undefined);
      const map: Record<string, boolean> = {};
      flags.forEach((flag) => {
        map[normalizeFlagKey(flag.key)] = Boolean(flag.enabled);
      });
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

  /* ---------- fetch available templates -------------------------- */
  const fetchAvailableTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('page_size', '500');

      const response = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return;

      const data = await response.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      const allTemplates: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

      const competitionSport = competition?.sport;
      const orgSport = org?.sport;
      const sportId = competitionSport?.id ? Number(competitionSport.id) : (orgSport?.id ? Number(orgSport.id) : undefined);

      const matchingTemplates = allTemplates.filter(t => {
        const templateOrg = (t as any).organisation ?? null;
        const templateProject = (t as any).project ?? null;

        if (templateOrg && String(templateOrg) !== String(org?.id || '')) return false;
        if (templateProject && String(templateProject) !== String(club?.id || '')) return false;
        if (!t.sport) return true;
        if (!sportId) return false;

        const templateSport = t.sport ? Number(t.sport) : undefined;
        const templateDetailId = t.sport_detail?.id ? Number(t.sport_detail.id) : undefined;
        const templateParentSportId = t.sport_detail?.parent_sport_id ? Number(t.sport_detail.parent_sport_id) : undefined;

        if (templateSport === sportId) return true;
        if (templateDetailId === sportId) return true;
        if (templateParentSportId === sportId) return true;

        const competitionParentId = competitionSport?.parent_sport_id ? Number(competitionSport.parent_sport_id) : undefined;
        const orgParentId = orgSport?.parent_sport_id ? Number(orgSport.parent_sport_id) : undefined;

        if (competitionParentId && templateSport === competitionParentId) return true;
        if (!competitionSport && orgParentId && templateSport === orgParentId) return true;

        return false;
      });

      const availabilityFiltered = matchingTemplates.filter((t) => isTemplateEnabled(t));

      const grouped: Record<string, ContentTemplate[]> = {};
      availabilityFiltered.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      console.error('[Content] Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [apiBaseUrl, competition?.sport, org?.sport, org?.id, club?.id, templateFlagMap]);

  useEffect(() => {
    fetchAvailableTemplates();
  }, [fetchAvailableTemplates]);

  /* ---------- transactions --------------------------------------- */
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

  /* ---------- roster state --------------------------------------- */
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

  /* ---------- formation lineup editor state ---------------------- */
  const [lineupFormation, setLineupFormation] = useState<string>('4-3-3');
  const [lineupSlots, setLineupSlots] = useState<Record<string, string[]>>({ goalkeeper: [], player: [] });
  const [lineupSquad, setLineupSquad] = useState<Record<string, any[]>>({ goalkeeper: [], player: [], coach: [], assistant: [] });
  const [lineupSquadLoading, setLineupSquadLoading] = useState(false);
  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupSaveSuccess, setLineupSaveSuccess] = useState(false);
  const [lineupBenchStatus, setLineupBenchStatus] = useState<Record<string, string>>({});

  /* ---------- route params + path derivation --------------------- */
  const seasonKeyOrId = effectiveSeasonId;
  const effectiveCompetitionIdVal = String(competitionId || '').trim();
  const effectiveMatchIdVal = String(matchId || '').trim();

  const pendingClubSlugResolve = false;
  const clubSlugRedirectTarget: string | null = null;

  const competitionBasePath = useMemo(() => {
    const seasonKey = String(seasonKeyOrId || '').trim();
    const compKey = String(effectiveCompetitionIdVal || '').trim();
    if (!seasonKey || !compKey) return '';
    return `${seasonsBasePath}/${seasonKey}/${compKey}`;
  }, [effectiveCompetitionIdVal, seasonKeyOrId, seasonsBasePath]);

  const matchBasePath = useMemo(() => {
    if (!competitionBasePath || !effectiveMatchIdVal) return '';
    return `${competitionBasePath}/${effectiveMatchIdVal}`;
  }, [competitionBasePath, effectiveMatchIdVal]);

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = isPlayer
      ? new Set(['overview', 'lineup'])
      : new Set(['overview', 'content', 'lineup', 'transactions']);
    if (allowed.has(raw)) return raw;
    const legacyMap: Record<string, string> = {
      hierarchy: 'details',
      match: 'details',
      date: 'details',
    };
    return legacyMap[raw] || 'overview';
  }, [location.search, isPlayer]);

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

  /* ================================================================
   *  Effects: fetch competition + match + opponent
   * ============================================================== */

  useEffect(() => {
    const run = async () => {
      if (!resolvedSeasonId || !effectiveCompetitionIdVal || !effectiveMatchIdVal) return;
      try {
        setLoading(true);
        setError(null);

        let competitionUuid = '';
        const isUuidComp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveCompetitionIdVal);
        if (isUuidComp) {
          competitionUuid = effectiveCompetitionIdVal;
        } else {
          const found = providerCompetitions.find((p: any) => periodPathKey(p) === effectiveCompetitionIdVal);
          competitionUuid = String(found?.id || '').trim();
        }

        if (!competitionUuid) throw new Error('Competition not found');
        setResolvedCompetitionUuid(competitionUuid);

        const [competitionRes, matchRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(effectiveMatchIdVal)}/`, { credentials: 'include' }),
        ]);

        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const competitionJson = getEnvelopeData<Period>(await competitionRes.json());
        setCompetition(competitionJson);

        const desiredCompetitionKey = periodPathKey(competitionJson) || '';
        if (desiredCompetitionKey && String(desiredCompetitionKey) !== String(effectiveCompetitionIdVal)) {
          const suffix = location.search ? location.search : '';
          navigate(
            `${seasonsBasePath}/${seasonKeyOrId}/${desiredCompetitionKey}/${effectiveMatchIdVal}${suffix}`,
            { replace: true }
          );
          return;
        }

        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        const matchJson = getEnvelopeData<MatchDetail>(await matchRes.json());
        setMatch(matchJson);

        const oppClubId = String(matchJson.metadata?.teamreel?.match_context?.opponent_club_id || '').trim();
        if (oppClubId && orgSlugOrId) {
          try {
            const oppClubRes = await fetch(
              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(oppClubId)}/`,
              { credentials: 'include' }
            );
            if (oppClubRes.ok) setOpponentClub(getEnvelopeData<Project>(await oppClubRes.json()));
          } catch { /* ignore */ }
        }

        const desiredMatchKey = String((matchJson as any)?.slug || '').trim();
        if (desiredMatchKey && desiredMatchKey !== String(effectiveMatchIdVal)) {
          const suffix = location.search ? location.search : '';
          const compKey = periodPathKey(competitionJson) || String(effectiveCompetitionIdVal);
          navigate(
            `${seasonsBasePath}/${seasonKeyOrId}/${compKey}/${desiredMatchKey}${suffix}`,
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
    resolvedSeasonId,
    providerCompetitions,
    effectiveCompetitionIdVal,
    effectiveMatchIdVal,
    seasonsBasePath,
    seasonKeyOrId,
    orgSlugOrId,
  ]);

  /* ================================================================
   *  Effects: roster loading
   * ============================================================== */

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
          return { id, user: { id, full_name: label } };
        };

        const seasonUuid = String(resolvedSeasonId || '').trim();
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

        const eligibleFromProjectMembers: OrgMember[] = asArray(projectMembers)
          .map((m: any) => {
            const memberId = String(m?.organisation_membership_id || '').trim();
            if (!memberId) return null;
            return { id: memberId, user: m?.user } as OrgMember;
          })
          .filter(Boolean) as OrgMember[];

        eligibleFromProjectMembers.sort((a: any, b: any) => {
          const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
          const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
          return an.localeCompare(bn);
        });

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
              const label = String(p?.member?.user_name || '\u2014').trim();
              squadMembers.push(buildSyntheticMember(mid, label || '\u2014'));
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
  }, [apiBaseUrl, club?.id, match?.project?.id, orgSlugOrId, resolvedSeasonId]);

  /* ================================================================
   *  Effects: squad for formation lineup editor
   * ============================================================== */

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

  // Load saved lineup from match metadata
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

  /* ================================================================
   *  CRUD: match edits, lineup save, delete
   * ============================================================== */

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
      headers: { 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
    });

    if (!res.ok) {
      alert('Error deleting match');
      return;
    }

    if (competitionBasePath) {
      navigate(`${competitionBasePath}?tab=matches`);
    } else {
      navigate(-1);
    }
  };

  /* ================================================================
   *  Derived display values (safe for null match)
   * ============================================================== */

  const date = match?.start_time ? new Date(match.start_time) : null;
  const status = String(match?.metadata?.status || 'scheduled');

  const isHome = match?.metadata?.teamreel?.match_context?.is_home
    ?? match?.metadata?.is_home
    ?? (match?.metadata?.teamreel?.match_context?.venue || match?.metadata?.venue || 'Home') === 'Home';

  const ownTeamName = club?.name || match?.project?.name || 'Eigen team';
  const opponentName = opponentClub?.name || match?.opponent_project?.name || 'Tegenstander';

  const homeTeamName = isHome ? ownTeamName : opponentName;
  const awayTeamName = isHome ? opponentName : ownTeamName;

  const ownLogoUrl = brandLogoUrl;
  const opponentLogoUrl = opponentClubBrand.getAsset?.('logo_upload')
    ? getAssetUrl(opponentClubBrand.getAsset('logo_upload')!.url)
    : opponentClubBrand.getAsset?.('logo')
      ? getAssetUrl(opponentClubBrand.getAsset('logo')!.url)
      : null;
  const homeLogoUrl = isHome ? ownLogoUrl : opponentLogoUrl;
  const awayLogoUrl = isHome ? opponentLogoUrl : ownLogoUrl;

  const scoreDisplay = status === 'finished'
    ? `${match?.metadata?.home_score ?? 0} - ${match?.metadata?.away_score ?? 0}`
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

  const allParticipations = match?.participations || [];
  const homeParticipations = allParticipations
    .filter(
      (p) => p.data?.side === 'home' || String(p.data?.team_id || '') === String(match?.project?.id || '')
    )
    .sort(sortLineup);
  const awayParticipations = allParticipations
    .filter(
      (p) =>
        p.data?.side === 'away' ||
        (match?.opponent_project && String(p.data?.team_id || '') === String(match.opponent_project.id))
    )
    .sort(sortLineup);

  const matchEvents = (match?.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

  /* ================================================================
   *  Participation CRUD
   * ============================================================== */

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
    if (!match?.id) return;
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
    if (!memberId || !match) return;
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
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
      headers: { 'X-CSRFToken': getCsrfToken() },
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
    if (!ids.length || !match) return;

    if (ids.length > 1) {
      const teamId = side === 'home' ? String(match.project?.id || '') : String(match.opponent_project?.id || '');
      const teamName = side === 'home' ? homeTeamName : awayTeamName;

      const res = await fetch(`${apiBaseUrl}/api/v1/participations/bulk/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          activity_id: String(match.id),
          member_ids: ids,
          role: 'starter',
          status: 'confirmed',
          data: { side, team_id: teamId || undefined, team_name: teamName },
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
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    navigate,
    location,
    user,
    org,
    project,
    club,
    season,
    resolvedSeasonId,
    providerLoading,
    isPlayer,
    apiBaseUrl,
    orgSlugOrId,
    clubSlugOrId,
    seasonsBasePath,
    brandLogoUrl,
    effectiveCompetitionId: effectiveCompetitionIdVal,
    effectiveMatchId: effectiveMatchIdVal,
    opponentClub,
    opponentClubBrand,
    competition,
    match,
    setMatch,
    resolvedCompetitionUuid,
    loading,
    error,
    activatingContext,
    setActivatingContext,
    activeContext,
    setActiveContextState,
    isCreateTxnModalOpen,
    setIsCreateTxnModalOpen,
    isMatchDetailModalOpen,
    setIsMatchDetailModalOpen,
    isMatchEditModalOpen,
    setIsMatchEditModalOpen,
    isContentModalOpen,
    selectedTemplate,
    selectedContentTypeLabel,
    openContentModal,
    closeContentModal,
    contentItems,
    contentItemsLoading,
    selectedContentItem,
    isContentPreviewOpen,
    openContentPreview,
    closeContentPreview,
    fetchContentItems,
    getContentItemForSubtype,
    matchMedia,
    matchMediaLoading,
    mediaBySubtype,
    getLatestMediaForSubtype,
    getMediaHistoryForSubtype,
    refreshMatchMedia,
    handleDeleteMediaItem,
    handleRestoreMediaItem,
    savedAssetPreview,
    setSavedAssetPreview,
    availableTemplates,
    templatesLoading,
    toasts,
    dismissToast,
    handleContentGenerated,
    matchWalletOptions,
    eligibleMembers,
    orgMembersAll,
    teamProjectMembers,
    clubProjectMembers,
    rosterLoading,
    rosterError,
    addHomeMemberId,
    setAddHomeMemberId,
    addAwayMemberId,
    setAddAwayMemberId,
    lineupBulkSubmitting,
    setLineupBulkSubmitting,
    lineupEligibleSearchHome,
    setLineupEligibleSearchHome,
    lineupEligibleSearchAway,
    setLineupEligibleSearchAway,
    selectedEligibleLineupMemberIdsHome,
    setSelectedEligibleLineupMemberIdsHome,
    selectedEligibleLineupMemberIdsAway,
    setSelectedEligibleLineupMemberIdsAway,
    selectedLineupParticipationIdsHome,
    setSelectedLineupParticipationIdsHome,
    selectedLineupParticipationIdsAway,
    setSelectedLineupParticipationIdsAway,
    lineupFormation,
    setLineupFormation,
    lineupSlots,
    setLineupSlots,
    lineupSquad,
    lineupSquadLoading,
    lineupBenchStatus,
    setLineupBenchStatus,
    lineupSaving,
    lineupSaveSuccess,
    saveLineup,
    competitionBasePath,
    matchBasePath,
    activeTab,
    navigateToTab,
    date,
    status,
    isHome: !!isHome,
    ownTeamName,
    opponentName,
    homeTeamName,
    awayTeamName,
    ownLogoUrl,
    opponentLogoUrl,
    homeLogoUrl,
    awayLogoUrl,
    scoreDisplay,
    homeParticipations,
    awayParticipations,
    matchEvents,
    detailActionButtonStyle,
    saveMatchEdits,
    handleDeleteMatch,
    createParticipation,
    updateParticipation,
    deleteParticipation,
    bulkCreateParticipations,
    bulkDeleteParticipations,
    refreshMatch,
    pendingClubSlugResolve,
    clubSlugRedirectTarget,
  };
}
