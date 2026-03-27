/**
 * Content Library — Types, constants & utility functions
 *
 * Extracted from ContentLibraryPage.tsx for file-size compliance.
 */

import { CONTENT_TYPES } from '../identity/ContentGenerationModal';

// ============================================================================
// Types
// ============================================================================

export type HierarchyTab = 'match' | 'season' | 'member' | 'team' | 'club';

export interface OrganisationOption {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  slug: string;
  organisation?: string | { id: string };
  parent_project?: string | { id: string } | null;
}

export interface SeasonOption {
  id: string;
  name: string;
  key: string;
  slug?: string;
  project?: string;
}

export interface MatchOption {
  id: string;
  title: string;
  name?: string;
  slug?: string;
  activity_date?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  mime_type: string;
  file_url: string | null;
  storage_path: string | null;
  file_size_bytes?: number;
  state: string;
  extraction_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  project?: string | { id: string; name: string };
  activity?: string | { id: string; title: string };
  activity_id?: string | null;
}

// ============================================================================
// Constants
// ============================================================================

export type ContentCategory = 'all' | 'pre_match' | 'during_match' | 'post_match' | 'season' | 'member';

export const SUB_TABS: Record<HierarchyTab, { key: string; label: string }[]> = {
  match: [
    { key: 'all', label: 'Alles' },
    { key: 'pre_match', label: 'Pre-match' },
    { key: 'during_match', label: 'During' },
    { key: 'post_match', label: 'Post-match' },
  ],
  season: [
    { key: 'all', label: 'Alles' },
    { key: 'season', label: 'Season Content' },
    { key: 'transformation', label: 'Transformatie' },
  ],
  member: [
    { key: 'all', label: 'Alles' },
    { key: 'member_intro', label: 'Intro' },
    { key: 'member_goal_celebration', label: 'Celebration' },
    { key: 'member_in_tenue', label: 'In Tenue' },
  ],
  team: [
    { key: 'all', label: 'Alles' },
  ],
  club: [
    { key: 'all', label: 'Alles' },
  ],
};

export const CONTENT_TYPE_FILTERS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'book-open' },
  { key: 'flyer', label: 'Match Flyer', icon: 'megaphone' },
  { key: 'lineup', label: 'Lineup', icon: 'clipboard-list' },
  { key: 'walkon', label: 'Walk-on', icon: 'footprints' },
  { key: 'anthem', label: 'Anthem', icon: 'music' },
  { key: 'goal', label: 'Goal Celebration', icon: 'circle-dot' },
  { key: 'score_update', label: 'Score Update', icon: 'hash' },
  { key: 'end_score', label: 'Final Score', icon: 'flag' },
  { key: 'match_summary', label: 'Match Summary', icon: 'bar-chart' },
  { key: 'highlights', label: 'Highlights', icon: 'film' },
  { key: 'transformation', label: 'Transformation', icon: 'refresh-cw' },
  { key: 'season_recap', label: 'Season Recap', icon: 'calendar' },
  { key: 'member_intro', label: 'Member Intro', icon: 'hand' },
  { key: 'member_goal_celebration', label: 'Member Goal', icon: 'circle-dot' },
  { key: 'member_in_tenue', label: 'In Tenue', icon: 'shirt' },
];

export const CONTENT_CATEGORIES: { key: ContentCategory; label: string; icon: string; subtypes: string[] }[] = [
  { key: 'all', label: 'Alles', icon: 'book-open', subtypes: [] },
  { key: 'pre_match', label: 'Pre-Match', icon: 'clipboard-list', subtypes: ['flyer', 'lineup', 'walkon', 'anthem'] },
  { key: 'during_match', label: 'During Match', icon: 'zap', subtypes: ['goal', 'score_update'] },
  { key: 'post_match', label: 'Post-Match', icon: 'bar-chart', subtypes: ['end_score', 'match_summary', 'highlights'] },
  { key: 'season', label: 'Season', icon: 'calendar', subtypes: ['transformation', 'season_recap'] },
  { key: 'member', label: 'Member', icon: 'user', subtypes: ['member_intro', 'member_goal_celebration', 'member_in_tenue'] },
];

export const LEVEL_LABELS: Record<HierarchyTab, string> = {
  match: 'Match',
  season: 'Season',
  member: 'Member',
  team: 'Team',
  club: 'Club',
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getContentPhase(assetType: string): string {
  if (['flyer', 'lineup', 'walkon', 'anthem'].includes(assetType)) return 'pre_match';
  if (['goal', 'score_update'].includes(assetType)) return 'during_match';
  if (['end_score', 'match_summary', 'highlights'].includes(assetType)) return 'post_match';
  if (['transformation', 'season_recap'].includes(assetType)) return 'season';
  if (assetType.startsWith('member_')) return assetType;
  return 'other';
}

export function getAssetTypeLabel(assetType: string): string {
  const allItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
    ...CONTENT_TYPES.season.items,
    ...CONTENT_TYPES.member.items,
  ];
  const found = allItems.find(item => item.subtype === assetType);
  return found?.label || assetType;
}

export function getAssetTypeIcon(assetType: string): string {
  const allItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
    ...CONTENT_TYPES.season.items,
    ...CONTENT_TYPES.member.items,
  ];
  const found = allItems.find(item => item.subtype === assetType);
  return found?.icon || 'file';
}
