/**
 * useContentSheet — Self-contained content state for inline editing from dashboard.
 *
 * Fetches match media, content items, and available templates.
 * Manages modal state for ContentGenerationModal and SavedAssetPreview.
 *
 * This avoids needing the full useMatchContentMedia orchestrator from the match
 * detail page, keeping the dashboard bundle dependency-light.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { mediaApi, contentApi } from '@/api';
import type { MediaItem } from '@/types/api/media';
import { logger } from '@/utils/logger';
import type { MatchMediaItem } from '@/components/MediaAssetCard';
import type { ContentTemplate } from '../../pages/identity/ContentGenerationModal';
import type { Match } from './ActiveMatchCard';

/* ── Types ──────────────────────────────────────────────────────── */

export type ContentItemStatus =
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected';

export interface ContentItem {
  id: string;
  template: { id: number; name: string; template_subtype?: string | null };
  status: ContentItemStatus;
  created_at: string;
  output_file?: { id: string; url: string; file_name?: string } | null;
  error_message?: string | null;
}

export type SavedAssetPreview = {
  title: string;
  url: string;
  isVideo: boolean;
  subtitle?: string;
} | null;

export interface ContentSheetState {
  // Data
  matchMedia: MatchMediaItem[];
  availableTemplates: Record<string, ContentTemplate[]>;

  // Loading
  matchMediaLoading: boolean;
  templatesLoading: boolean;

  // Getters
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getMediaHistoryForSubtype: (subtype: string) => MatchMediaItem[];
  getContentItemForSubtype: (subtype: string) => ContentItem | null;

  // Content modal actions
  openContentModal: (template?: ContentTemplate, label?: string) => void;
  contentModalOpen: boolean;
  contentModalTemplate: ContentTemplate | null;
  contentModalLabel: string;
  closeContentModal: () => void;

  // Preview state
  savedAssetPreview: SavedAssetPreview;
  setSavedAssetPreview: (preview: SavedAssetPreview) => void;

  // Media actions
  handleDeleteMediaItem: (item: MatchMediaItem) => void;
  handleRestoreMediaItem: (item: MatchMediaItem) => void;

  // Refresh
  refreshMedia: () => Promise<void>;
}

/* ── Hook ───────────────────────────────────────────────────────── */

export function useContentSheet(
  match: Match | null,
  orgSport?: { id: string | number; name?: string; parent_sport_id?: number | null } | null,
  clubId?: string | null,
): ContentSheetState {
  // Raw data state
  const [matchMedia, setMatchMedia] = useState<MatchMediaItem[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Modal state
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentModalTemplate, setContentModalTemplate] = useState<ContentTemplate | null>(null);
  const [contentModalLabel, setContentModalLabel] = useState('');
  const [savedAssetPreview, setSavedAssetPreview] = useState<SavedAssetPreview>(null);

  // ── Fetch match media ──

  const fetchMatchMedia = useCallback(async () => {
    if (!match?.id) return;
    setMatchMediaLoading(true);
    try {
      const { results } = await mediaApi.listItems({ activityId: match.id });
      setMatchMedia(Array.isArray(results) ? results : []);
    } catch (err) {
      logger.error('[ContentSheet] Error fetching match media', err);
    } finally {
      setMatchMediaLoading(false);
    }
  }, [match?.id]);

  useEffect(() => { if (match?.id) void fetchMatchMedia(); }, [match?.id, fetchMatchMedia]);

  // ── Media grouping by subtype ──

  const mediaBySubtype = useMemo(() => {
    const grouped: Record<string, { latest: MatchMediaItem; history: MatchMediaItem[] }> = {};
    const sorted = [...matchMedia].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const item of sorted) {
      const subtype = (item.extraction_metadata?.asset_type as string) || 'other';
      let normalizedSubtype = subtype.replace(/_[a-f0-9]{8}$/i, '');
      if (normalizedSubtype === 'goal_celebration') normalizedSubtype = 'goal';
      if (normalizedSubtype === 'match_flyer') normalizedSubtype = 'flyer';
      if (!grouped[normalizedSubtype]) {
        grouped[normalizedSubtype] = { latest: item, history: [] };
      } else {
        grouped[normalizedSubtype].history.push(item);
      }
    }
    return grouped;
  }, [matchMedia]);

  const getLatestMediaForSubtype = useCallback(
    (subtype: string): MatchMediaItem | null => mediaBySubtype[subtype]?.latest ?? null,
    [mediaBySubtype],
  );

  const getMediaHistoryForSubtype = useCallback(
    (subtype: string): MatchMediaItem[] => mediaBySubtype[subtype]?.history ?? [],
    [mediaBySubtype],
  );

  // ── Fetch content items ──

  const fetchContentItems = useCallback(async () => {
    if (!match?.id) return;
    try {
      const { results } = await contentApi.listItems({ activityId: match.id });
      setContentItems((results as unknown as ContentItem[]).filter(Boolean));
    } catch (err) {
      logger.error('[ContentSheet] Error fetching content items', err);
    }
  }, [match?.id]);

  useEffect(() => { if (match?.id) void fetchContentItems(); }, [match?.id, fetchContentItems]);

  const getContentItemForSubtype = useCallback(
    (subtype: string): ContentItem | null =>
      contentItems.find((item) => item.template?.template_subtype === subtype) || null,
    [contentItems],
  );

  // ── Fetch available templates (sport-filtered) ──

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { results: allTemplates } = await contentApi.listTemplates(
        { isActive: true },
        { pageSize: 500 },
      ) as unknown as { results: ContentTemplate[]; count: number; next: string | null; previous: string | null };

      const competitionSport = match?.period?.parent_period
        ? null // competition doesn't carry sport at this level
        : null;
      const sportId = orgSport?.id ? Number(orgSport.id) : undefined;

      const matchingTemplates = allTemplates.filter((t) => {
        // Org/project scoping
        const templateOrg = (t as unknown as Record<string, unknown>).organisation ?? null;
        const templateProject = (t as unknown as Record<string, unknown>).project ?? null;
        if (templateOrg && String(templateOrg) !== String(match?.organisation?.id || '')) return false;
        if (templateProject && String(templateProject) !== String(clubId || '')) return false;

        // Sport matching
        if (!t.sport) return true; // generic template
        if (!sportId) return false;
        const templateSport = t.sport ? Number(t.sport) : undefined;
        const templateDetailId = t.sport_detail?.id ? Number(t.sport_detail.id) : undefined;
        const templateParentSportId = t.sport_detail?.parent_sport_id
          ? Number(t.sport_detail.parent_sport_id)
          : undefined;
        if (templateSport === sportId) return true;
        if (templateDetailId === sportId) return true;
        if (templateParentSportId === sportId) return true;
        const orgParentId = orgSport?.parent_sport_id ? Number(orgSport.parent_sport_id) : undefined;
        if (orgParentId && templateSport === orgParentId) return true;
        return false;
      });

      const grouped: Record<string, ContentTemplate[]> = {};
      matchingTemplates.forEach((t) => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      logger.error('[ContentSheet] Error fetching templates', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [match?.organisation?.id, clubId, orgSport?.id, orgSport?.parent_sport_id]);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

  // ── Content modal actions ──

  const openContentModal = useCallback((template?: ContentTemplate, label?: string) => {
    setContentModalTemplate(template ?? null);
    setContentModalLabel(label ?? '');
    setContentModalOpen(true);
  }, []);

  const closeContentModal = useCallback(() => {
    setContentModalOpen(false);
    setContentModalTemplate(null);
    setContentModalLabel('');
  }, []);

  // ── Media delete / restore ──

  const handleDeleteMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      await mediaApi.deleteItem(item.id);
      setMatchMedia((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      logger.error('[ContentSheet] Error deleting media item', err);
    }
  }, []);

  const handleRestoreMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      await mediaApi.updateItem(item.id, { is_deleted: false } as unknown as Partial<MediaItem>);
      // Re-fetch to get latest state
      await fetchMatchMedia();
    } catch (err) {
      logger.error('[ContentSheet] Error restoring media item', err);
    }
  }, [fetchMatchMedia]);

  // ── Refresh after generation ──

  const refreshMedia = useCallback(async () => {
    await Promise.all([fetchMatchMedia(), fetchContentItems()]);
  }, [fetchMatchMedia, fetchContentItems]);

  return {
    matchMedia,
    availableTemplates,
    matchMediaLoading,
    templatesLoading,
    getLatestMediaForSubtype,
    getMediaHistoryForSubtype,
    getContentItemForSubtype,
    openContentModal,
    contentModalOpen,
    contentModalTemplate,
    contentModalLabel,
    closeContentModal,
    savedAssetPreview,
    setSavedAssetPreview,
    handleDeleteMediaItem,
    handleRestoreMediaItem,
    refreshMedia,
  };
}
