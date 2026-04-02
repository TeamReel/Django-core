/**
 * Master Data (Stamdata) - Centralized reference data from backend
 *
 * This module provides cached access to system-wide reference data like:
 * - MediaTags (78 system tags across 12 categories)
 * - Sports & Formations
 * - Template types/subtypes
 *
 * Usage:
 *   const { tags, loading, error } = useMasterData('mediaTags');
 *   const { sports } = useMasterData('sports');
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import { logger } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface MediaTag {
  id: string;
  name: string;
  slug: string;
  category: string;
  is_system: boolean;
  description?: string;
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

export interface FormationPosition {
  slot: number;
  position: string;
  x: number;
  y: number;
  line?: string;
  label?: string;
}

export interface Formation {
  id: string;
  code: string;
  name: string;
  positions: FormationPosition[];
  sport_name?: string;
  is_default?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export interface TemplateType {
  key: string;
  label: string;
  subtypes: { key: string; label: string }[];
}

// ============================================================================
// Cache (in-memory, per session)
// ============================================================================

interface MasterDataCache {
  mediaTags: MediaTag[] | null;
  mediaTagsByCategory: Map<string, MediaTag[]> | null;
  sports: Sport[] | null;
  formations: Formation[] | null;
  lastFetch: Record<string, number>;
}

const cache: MasterDataCache = {
  mediaTags: null,
  mediaTagsByCategory: null,
  sports: null,
  formations: null,
  lastFetch: {},
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchMediaTags(): Promise<MediaTag[]> {
  const { results } = await api.list<MediaTag>('/media/tags/', { params: { is_system: true }, pageSize: 200 });
  return results;
}

async function fetchSports(): Promise<Sport[]> {
  const { results } = await api.list<Sport>('/sport-configuration/sports/', { pageSize: 100 });
  return results;
}

async function fetchFormations(): Promise<Formation[]> {
  const { results } = await api.list<Formation>('/sport-configuration/formations/', { pageSize: 100 });
  return results;
}

// ============================================================================
// Grouped Data Helpers
// ============================================================================

function groupTagsByCategory(tags: MediaTag[]): Map<string, MediaTag[]> {
  const grouped = new Map<string, MediaTag[]>();

  tags.forEach((tag) => {
    const category = tag.category || 'other';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(tag);
  });

  // Sort each category alphabetically
  grouped.forEach((categoryTags, key) => {
    grouped.set(key, categoryTags.sort((a, b) => a.name.localeCompare(b.name)));
  });

  return grouped;
}

// ============================================================================
// Public API
// ============================================================================

export async function getMediaTags(forceRefresh = false): Promise<MediaTag[]> {
  const now = Date.now();
  const cacheValid = cache.mediaTags && (now - (cache.lastFetch['mediaTags'] || 0)) < CACHE_TTL_MS;

  if (cacheValid && !forceRefresh) {
    return cache.mediaTags!;
  }

  const tags = await fetchMediaTags();
  cache.mediaTags = tags;
  cache.mediaTagsByCategory = groupTagsByCategory(tags);
  cache.lastFetch['mediaTags'] = now;
  return tags;
}

export async function getMediaTagsByCategory(forceRefresh = false): Promise<Map<string, MediaTag[]>> {
  if (!cache.mediaTagsByCategory || forceRefresh) {
    await getMediaTags(forceRefresh);
  }
  return cache.mediaTagsByCategory!;
}

export async function getSports(forceRefresh = false): Promise<Sport[]> {
  const now = Date.now();
  const cacheValid = cache.sports && (now - (cache.lastFetch['sports'] || 0)) < CACHE_TTL_MS;

  if (cacheValid && !forceRefresh) {
    return cache.sports!;
  }

  const sports = await fetchSports();
  cache.sports = sports;
  cache.lastFetch['sports'] = now;
  return sports;
}

export async function getFormations(forceRefresh = false): Promise<Formation[]> {
  const now = Date.now();
  const cacheValid = cache.formations && (now - (cache.lastFetch['formations'] || 0)) < CACHE_TTL_MS;

  if (cacheValid && !forceRefresh) {
    return cache.formations!;
  }

  const formations = await fetchFormations();
  cache.formations = formations;
  cache.lastFetch['formations'] = now;
  return formations;
}

// ============================================================================
// React Hook
// ============================================================================

type MasterDataType = 'mediaTags' | 'mediaTagsByCategory' | 'sports' | 'formations';

interface UseMasterDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMasterData<T>(
  type: MasterDataType
): UseMasterDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      let result: unknown;
      switch (type) {
        case 'mediaTags':
          result = await getMediaTags(forceRefresh);
          break;
        case 'mediaTagsByCategory':
          result = await getMediaTagsByCategory(forceRefresh);
          break;
        case 'sports':
          result = await getSports(forceRefresh);
          break;
        case 'formations':
          result = await getFormations(forceRefresh);
          break;
      }
      setData(result as T);
    } catch (err) {
      logger.error('Failed to load master data', err);
      setError(err instanceof Error ? err.message : 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}

// ============================================================================
// Static Label Mappings (for display consistency)
// ============================================================================

export const TAG_CATEGORY_LABELS: Record<string, string> = {
  content_context: 'Content Context',
  subject: 'Subject',
  moment: 'Moment',
  status: 'Status',
  media_type: 'Media Type',
  orientation: 'Orientation',
  style: 'Style',
  sport: 'Sport',
  sport_variant: 'Sport Variant',
  formation: 'Formation',
  competition: 'Competition',
  platform: 'Platform',
  other: 'Other',
};

export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  during_match: 'During Match',
  pre_match: 'Pre Match',
  post_match: 'Post Match',
  member: 'Member',
  season: 'Season',
};

export const TEMPLATE_SUBTYPE_LABELS: Record<string, string> = {
  // During Match
  goal: 'Goal Celebration',
  end_score: 'Final Score',
  score_update: 'Score Update',
  substitution: 'Substitution',
  yellow_card: 'Yellow Card',
  red_card: 'Red Card',
  injury: 'Injury',
  highlights: 'Highlights',
  // Pre Match
  lineup: 'Lineup',
  flyer: 'Flyer',
  walkon: 'Walk-on',
  anthem: 'Anthem',
  // Post Match
  match_summary: 'Match Summary',
  // Member
  profile_photo: 'Profile Photo',
  legacy_photo: 'Legacy Photo',
  closeup: 'Closeup',
  intro: 'Introduction',
  in_tenue: 'In Tenue',
  // Season
  season_recap: 'Season Recap',
  transformation: 'Transformation',
};

export function getTemplateTypeLabel(type: string): string {
  return TEMPLATE_TYPE_LABELS[type] || titleCase(type);
}

export function getTemplateSubtypeLabel(subtype: string): string {
  return TEMPLATE_SUBTYPE_LABELS[subtype] || titleCase(subtype);
}

export function getTagCategoryLabel(category: string): string {
  return TAG_CATEGORY_LABELS[category] || titleCase(category);
}

function titleCase(value: string): string {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}
