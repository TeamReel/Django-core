import { useEffect, useMemo, useCallback } from 'react';
import { fetchFlags } from '../../utils/featureFlagsApi';
import { mediaApi, contentApi } from '../../api';
import type { MatchMediaItem } from '../../components/MediaAssetCard';
import type { ContentItem, MatchDetail } from './matchDetailTypes';
import { normalizeFlagKey as normalizeFlagKeyHelper, slugify as slugifyHelper } from './matchDetailTypes';
import type { ContentTemplate } from '../identity/ContentGenerationModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseMatchContentMediaParams {
  apiBaseUrl: string;
  match: MatchDetail | null;
  org: any;
  club: any;
  competition: any;
  // Setters
  setMatchMedia: (v: MatchMediaItem[]) => void;
  setMatchMediaLoading: (v: boolean) => void;
  setContentItems: (v: ContentItem[]) => void;
  setContentItemsLoading: (v: boolean) => void;
  setTemplateFlagMap: (v: Record<string, boolean>) => void;
  setTemplateFlagsLoading: (v: boolean) => void;
  setAvailableTemplates: (v: Record<string, ContentTemplate[]>) => void;
  setTemplatesLoading: (v: boolean) => void;
  setToasts: React.Dispatch<React.SetStateAction<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[]>>;
  templateFlagMap: Record<string, boolean>;
  matchMedia: MatchMediaItem[];
  contentItems: ContentItem[];
}

// ─── Hook: media, content items, templates, toasts ───────────────────────────

export function useMatchContentMedia(params: UseMatchContentMediaParams) {
  const {
    apiBaseUrl, match, org, club, competition,
    setMatchMedia, setMatchMediaLoading, setContentItems, setContentItemsLoading,
    setTemplateFlagMap, setTemplateFlagsLoading, setAvailableTemplates, setTemplatesLoading,
    setToasts, templateFlagMap, matchMedia, contentItems,
  } = params;

  // ── Fetch match media ──
  const fetchMatchMedia = useCallback(async () => {
    if (!match?.id) return;
    setMatchMediaLoading(true);
    try {
      const { results } = await mediaApi.listItems({ activityId: match.id });
      setMatchMedia(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error(err);
      console.error('[Media] Error fetching match media:', err);
    } finally {
      setMatchMediaLoading(false);
    }
  }, [match?.id]);

  useEffect(() => { if (match?.id) fetchMatchMedia(); }, [match?.id, fetchMatchMedia]);

  // ── Media grouping ──
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

  const refreshMatchMedia = useCallback(async () => { await fetchMatchMedia(); }, [fetchMatchMedia]);

  // ── Content items ──
  const fetchContentItems = useCallback(async () => {
    if (!match?.id) return;
    setContentItemsLoading(true);
    try {
      const { results } = await contentApi.listItems({ activityId: match.id });
      setContentItems((results as unknown as ContentItem[]).filter(Boolean));
    } catch (err) {
      console.error(err);
      console.error('[Content] Error fetching content items:', err);
    } finally {
      setContentItemsLoading(false);
    }
  }, [match?.id]);

  const getContentItemForSubtype = useCallback((subtype: string): ContentItem | null => {
    return contentItems.find(item => item.template?.template_subtype === subtype) || null;
  }, [contentItems]);

  useEffect(() => { if (match?.id) fetchContentItems(); }, [match?.id, fetchContentItems]);

  // ── Template flag helpers ──
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
    if (!templateFlagMap || Object.keys(templateFlagMap).length === 0) return true;
    const keys = buildTemplateFlagKeys(template);
    for (const key of keys) {
      const normalized = normalizeFlagKey(key);
      if (normalized in templateFlagMap) return Boolean(templateFlagMap[normalized]);
    }
    return true;
  };

  // ── Fetch template availability flags ──
  const fetchTemplateAvailabilityFlags = useCallback(async () => {
    if (!org?.id) return;
    setTemplateFlagsLoading(true);
    try {
      const flags = await fetchFlags(String(org.id), club?.id ? String(club.id) : undefined);
      const map: Record<string, boolean> = {};
      flags.forEach((flag) => { map[normalizeFlagKey(flag.key)] = Boolean(flag.enabled); });
      setTemplateFlagMap(map);
    } catch (err) {
      console.error(err);
      console.error('[Content] Failed to fetch template availability flags:', err);
    } finally {
      setTemplateFlagsLoading(false);
    }
  }, [org?.id, club?.id]);

  useEffect(() => { fetchTemplateAvailabilityFlags(); }, [fetchTemplateAvailabilityFlags]);

  // ── Fetch available templates ──
  const fetchAvailableTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { results: allTemplates } = await contentApi.listTemplates(
        { isActive: true },
        { pageSize: 500 },
      ) as unknown as { results: ContentTemplate[]; count: number; next: string | null; previous: string | null };

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
      console.error(err);
      console.error('[Content] Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [apiBaseUrl, competition?.sport, org?.sport, org?.id, club?.id, templateFlagMap]);

  useEffect(() => { fetchAvailableTemplates(); }, [fetchAvailableTemplates]);

  // ── Toasts ──
  const pushToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleContentGenerated = useCallback((message?: string) => {
    // Toast is now handled globally by useContentGeneration — just refresh media
    void refreshMatchMedia();
  }, [refreshMatchMedia]);

  return {
    fetchMatchMedia, mediaBySubtype, getLatestMediaForSubtype, getMediaHistoryForSubtype,
    refreshMatchMedia, fetchContentItems, getContentItemForSubtype,
    pushToast, dismissToast, handleContentGenerated,
  };
}
