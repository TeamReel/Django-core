/**
 * useStudioData — Data hook for the Studio History page
 *
 * Fetches:
 * 1. Media items (generated content) from /api/v1/media/items/
 * 2. Video jobs from /api/v1/video/jobs/
 *
 * Groups content by content type (subtype) and provides live video job status.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { mediaApi, videoApi } from '../../api';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAppSelection } from '../../hooks/useAppSelection';
import { logger } from '@/utils/logger';
import { CONTENT_TYPES } from '../identity/ContentGenerationModal';
import type { ContentItem } from '../content/contentLibraryTypes';

// ============================================================================
// Types
// ============================================================================

export type ContentGroupKey =
  | 'lineup' | 'lineup_flyer' | 'flyer' | 'match_intro' | 'poster' | 'walkon' | 'anthem'
  | 'goal' | 'score_update'
  | 'end_score' | 'match_summary' | 'highlights'
  | 'duo_portret_cover' | 'duo_portret_overlay' | 'sidebyside_cover' | 'sidebyside_overlay'
  | 'transformation' | 'walking_composite'
  | 'member_intro' | 'member_goal_celebration' | 'member_in_tenue' | 'member_action_photo'
  | 'member_legacy_closeup' | 'member_legacy_in_tenue'
  | 'other';

export interface ContentGroup {
  key: string;
  label: string;
  icon: string;
  phase: string;
  items: ContentItem[];
}

export interface VideoJobSummary {
  id: string;
  job_type: string;
  status: string;
  progress_percent: number;
  error_message?: string | null;
  output_url?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  completed_at?: string | null;
  config?: Record<string, unknown>;
}

export interface MatchGroup {
  /** Activity (match) ID — or '__non_match__' for season/member content */
  activityId: string;
  /** Display title, e.g. "vs Opponent" or "Seizoen & Leden" */
  title: string;
  /** ISO date string (activity date or earliest item date) */
  date: string;
  /** Opponent name */
  opponent: string;
  /** home | away */
  homeAway: string;
  /** Scores */
  scoreHome?: number;
  scoreAway?: number;
  /** Content items in this group */
  items: ContentItem[];
  /** Whether this is the non-match bucket */
  isNonMatch: boolean;
}

export interface StudioData {
  // Content
  contentItems: ContentItem[];
  contentGroups: ContentGroup[];
  matchGroups: MatchGroup[];
  nonMatchGroup: MatchGroup | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Video jobs
  videoJobs: VideoJobSummary[];
  activeJobs: VideoJobSummary[];
  recentCompletedJobs: VideoJobSummary[];
  videoJobsLoading: boolean;

  // Stats
  totalItems: number;
  totalVideos: number;
  totalImages: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Ordered list of content type sections for display */
const SECTION_ORDER: { key: string; phase: string }[] = [
  // Pre-match
  { key: 'lineup', phase: 'pre_match' },
  { key: 'lineup_flyer', phase: 'pre_match' },
  { key: 'flyer', phase: 'pre_match' },
  { key: 'match_intro', phase: 'pre_match' },
  { key: 'poster', phase: 'pre_match' },
  { key: 'walkon', phase: 'pre_match' },
  { key: 'anthem', phase: 'pre_match' },
  // During match
  { key: 'goal', phase: 'during_match' },
  { key: 'score_update', phase: 'during_match' },
  // Post-match
  { key: 'end_score', phase: 'post_match' },
  { key: 'match_summary', phase: 'post_match' },
  { key: 'highlights', phase: 'post_match' },
  // Season
  { key: 'transformation', phase: 'season' },
  { key: 'duo_portret_cover', phase: 'season' },
  { key: 'duo_portret_overlay', phase: 'season' },
  { key: 'sidebyside_cover', phase: 'season' },
  { key: 'sidebyside_overlay', phase: 'season' },
  { key: 'walking_composite', phase: 'season' },
  // Member
  { key: 'member_intro', phase: 'member' },
  { key: 'member_goal_celebration', phase: 'member' },
  { key: 'member_in_tenue', phase: 'member' },
  { key: 'member_action_photo', phase: 'member' },
  { key: 'member_legacy_closeup', phase: 'member' },
  { key: 'member_legacy_in_tenue', phase: 'member' },
];

/** Resolve label + icon from CONTENT_TYPES constants */
function getTypeInfo(subtype: string): { label: string; icon: string } {
  const allItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
    ...CONTENT_TYPES.season.items,
    ...CONTENT_TYPES.member.items,
    ...(CONTENT_TYPES as any).custom?.items || [],
  ];
  const found = allItems.find((item) => item.subtype === subtype);
  return { label: found?.label || subtype, icon: found?.icon || '📄' };
}

// ============================================================================
// Hook
// ============================================================================

export function useStudioData(): StudioData {
  const { context } = useContextSwitcher();
  const { teamIdForApi } = useAppSelection();
  const orgSlug = (context as any)?.organisation?.slug as string | undefined;

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videoJobs, setVideoJobs] = useState<VideoJobSummary[]>([]);
  const [videoJobsLoading, setVideoJobsLoading] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch content items ──
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { results } = await mediaApi.listItems(
        { ordering: '-created_at', ...(teamIdForApi ? { project: teamIdForApi } : {}) },
        { pageSize: 500 },
      );
      setContentItems(Array.isArray(results) ? results : []);
    } catch (err) {
      logger.error('[Studio] Content fetch error', err);
      setError('Fout bij laden van content');
    } finally {
      setLoading(false);
    }
  }, [teamIdForApi]);

  // ── Fetch video jobs ──
  const fetchVideoJobs = useCallback(async () => {
    try {
      const { results: raw } = await videoApi.listJobs(
        { ordering: '-created_at' },
        { pageSize: 50 },
      );
      const jobs: VideoJobSummary[] = (Array.isArray(raw) ? raw : []).map((j) => ({
        id: j.id,
        job_type: j.job_type,
        status: j.status,
        progress_percent: j.progress_percent || 0,
        error_message: j.error_message,
        output_url: j.output_url || (j.output_file as any)?.url,
        thumbnail_url: j.thumbnail_url,
        created_at: j.created_at,
        completed_at: j.completed_at,
        config: j.config,
      }));
      setVideoJobs(jobs);
    } catch (err) {
      logger.error('[Studio] Video jobs fetch error', err);
    } finally {
      setVideoJobsLoading(false);
    }
  }, []);

  // ── Initial fetch ──
  useEffect(() => {
    fetchContent();
    fetchVideoJobs();
  }, [fetchContent, fetchVideoJobs]);

  // ── Poll active video jobs every 8s ──
  useEffect(() => {
    const hasActive = videoJobs.some(j => j.status === 'queued' || j.status === 'processing');
    if (hasActive) {
      pollRef.current = setInterval(() => { fetchVideoJobs(); }, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [videoJobs, fetchVideoJobs]);

  // ── Refresh handler ──
  const refresh = useCallback(async () => {
    await Promise.all([fetchContent(), fetchVideoJobs()]);
  }, [fetchContent, fetchVideoJobs]);

  // ── Group content by subtype ──
  const contentGroups = useMemo(() => {
    const groupMap = new Map<string, ContentItem[]>();

    for (const item of contentItems) {
      const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
      const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
      const key = SECTION_ORDER.find(s => s.key === normalizedType) ? normalizedType : 'other';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    // Build ordered groups (only those that have items)
    const groups: ContentGroup[] = [];
    for (const { key, phase } of SECTION_ORDER) {
      const items = groupMap.get(key);
      if (items && items.length > 0) {
        const info = getTypeInfo(key);
        groups.push({ key, label: info.label, icon: info.icon, phase, items });
      }
    }

    // Add "other" group at the end
    const otherItems = groupMap.get('other');
    if (otherItems && otherItems.length > 0) {
      groups.push({ key: 'other', label: 'Overig', icon: '📄', phase: 'other', items: otherItems });
    }

    return groups;
  }, [contentItems]);

  // ── Video job splits ──
  const activeJobs = useMemo(
    () => videoJobs.filter(j => j.status === 'queued' || j.status === 'processing'),
    [videoJobs],
  );
  const recentCompletedJobs = useMemo(
    () => videoJobs.filter(j => j.status === 'completed').slice(0, 5),
    [videoJobs],
  );

  // ── Group content by match/activity ──
  const { matchGroups, nonMatchGroup } = useMemo(() => {
    const NON_MATCH_KEY = '__non_match__';
    const groupMap = new Map<string, MatchGroup>();

    // Phases that are NOT match-related
    const nonMatchPhases = new Set(['season', 'member']);

    for (const item of contentItems) {
      const meta = item.extraction_metadata || {};
      const assetType = (meta.asset_type as string) || 'other';
      const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
      const sectionInfo = SECTION_ORDER.find(s => s.key === normalizedType);
      const isNonMatchContent = sectionInfo ? nonMatchPhases.has(sectionInfo.phase) : false;

      // Resolve activity ID from:
      // 1. item.activity_id (top-level field from API serializer)
      // 2. extraction_metadata.activity_id (stored during content generation)
      // 3. item.activity (legacy: could be string UUID or {id, title} object)
      const rawActivityId =
        item.activity_id
        || (meta.activity_id as string)
        || (typeof item.activity === 'object' ? item.activity?.id : (item.activity as string))
        || null;

      // Determine activity key
      const activityId = isNonMatchContent || !rawActivityId
        ? NON_MATCH_KEY
        : rawActivityId;

      if (!groupMap.has(activityId)) {
        const activityTitle = (meta.activity_title as string)
          || (typeof item.activity === 'object' ? item.activity?.title : '')
          || '';
        groupMap.set(activityId, {
          activityId,
          title: activityId === NON_MATCH_KEY
            ? 'Seizoen & Leden'
            : (meta.opponent as string)
              ? `vs ${meta.opponent as string}`
              : activityTitle || `Wedstrijd`,
          date: (meta.activity_date as string) || item.created_at || '',
          opponent: (meta.opponent as string) || '',
          homeAway: (meta.home_away as string) || '',
          scoreHome: meta.score_home as number | undefined,
          scoreAway: meta.score_away as number | undefined,
          items: [],
          isNonMatch: activityId === NON_MATCH_KEY,
        });
      }

      groupMap.get(activityId)!.items.push(item);
    }

    // Extract non-match group
    const nonMatch = groupMap.get(NON_MATCH_KEY) || null;
    groupMap.delete(NON_MATCH_KEY);

    // Sort matches by date descending (newest first)
    const matches = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return { matchGroups: matches, nonMatchGroup: nonMatch };
  }, [contentItems]);

  // ── Stats ──
  const totalItems = contentItems.length;
  const totalVideos = contentItems.filter(i => i.mime_type?.startsWith('video/')).length;
  const totalImages = contentItems.filter(i => i.mime_type?.startsWith('image/')).length;

  return {
    contentItems,
    contentGroups,
    matchGroups,
    nonMatchGroup,
    loading,
    error,
    refresh,
    videoJobs,
    activeJobs,
    recentCompletedJobs,
    videoJobsLoading,
    totalItems,
    totalVideos,
    totalImages,
  };
}
