/**
 * Content Library Page — Generated Content Browser
 *
 * Shows all generated content from templates, organized by hierarchy level
 * and content phase. This is the actual output users can post on social media.
 *
 * Difference from Media Library:
 * - Media Library = uploads, brand assets, support content
 * - Content Library = generated output from templates (flyers, lineups, reels, etc.)
 *
 * Panel B tabs: Match, Season, Member, Team, Club
 * Each level has content phase sub-tabs:
 * - Match: Pre-match, During, Post-match
 * - Season: Season content
 * - Member: Intro, Celebration, etc.
 *
 * Data source: /api/v1/media/items/ filtered by project/activity
 *
 * Supports two modes:
 * - Standalone: renders full page at /contentlib
 * - Embedded: renders as a component inside AI Studio (pass `embedded={true}`)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Stack, Text, Alert, Badge, Button } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { formatFileSize } from '../../hooks/useFileAssets';
import { CONTENT_TYPES } from '../identity/ContentGenerationModal';

// ============================================================================
// Types
// ============================================================================

export type HierarchyTab = 'match' | 'season' | 'member' | 'team' | 'club';

interface OrganisationOption {
  id: string;
  name: string;
  slug: string;
}

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
  organisation?: string | { id: string };
  parent_project?: string | { id: string } | null;
}

interface SeasonOption {
  id: string;
  name: string;
  key: string;
  project?: string;
}

interface MatchOption {
  id: string;
  title: string;
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
}

// Sub-tab definitions per hierarchy level
const SUB_TABS: Record<HierarchyTab, { key: string; label: string }[]> = {
  match: [
    { key: 'all', label: 'Alles' },
    { key: 'pre_match', label: 'Pre-match' },
    { key: 'during_match', label: 'During' },
    { key: 'post_match', label: 'Post-match' },
  ],
  season: [
    { key: 'all', label: 'Alles' },
    { key: 'season', label: 'Season Content' },
    { key: 'transformation', label: 'Then & Now' },
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

// All content type filter options (flat list for gallery view)
const CONTENT_TYPE_FILTERS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📚' },
  // Pre-match
  { key: 'flyer', label: 'Match Flyer', icon: '📣' },
  { key: 'lineup', label: 'Lineup', icon: '📋' },
  { key: 'walkon', label: 'Walk-on', icon: '🚶' },
  { key: 'anthem', label: 'Anthem', icon: '🎵' },
  // During match
  { key: 'goal', label: 'Goal Celebration', icon: '⚽' },
  { key: 'score_update', label: 'Score Update', icon: '🔢' },
  // Post-match
  { key: 'end_score', label: 'Final Score', icon: '🏁' },
  { key: 'match_summary', label: 'Match Summary', icon: '📊' },
  { key: 'highlights', label: 'Highlights', icon: '🎬' },
  // Season
  { key: 'transformation', label: 'Then & Now', icon: '🔄' },
  { key: 'season_recap', label: 'Season Recap', icon: '📅' },
  // Member
  { key: 'member_intro', label: 'Member Intro', icon: '👋' },
  { key: 'member_goal_celebration', label: 'Member Goal', icon: '⚽' },
  { key: 'member_in_tenue', label: 'In Tenue', icon: '👕' },
];

// Content category tabs with their subtypes
type ContentCategory = 'all' | 'pre_match' | 'during_match' | 'post_match' | 'season' | 'member';

const CONTENT_CATEGORIES: { key: ContentCategory; label: string; icon: string; subtypes: string[] }[] = [
  { key: 'all', label: 'Alles', icon: '📚', subtypes: [] },
  { key: 'pre_match', label: 'Pre-Match', icon: '📋', subtypes: ['flyer', 'lineup', 'walkon', 'anthem'] },
  { key: 'during_match', label: 'During Match', icon: '⚡', subtypes: ['goal', 'score_update'] },
  { key: 'post_match', label: 'Post-Match', icon: '📊', subtypes: ['end_score', 'match_summary', 'highlights'] },
  { key: 'season', label: 'Season', icon: '📅', subtypes: ['transformation', 'season_recap'] },
  { key: 'member', label: 'Member', icon: '👤', subtypes: ['member_intro', 'member_goal_celebration', 'member_in_tenue'] },
];

// Map asset_type to content phase
function getContentPhase(assetType: string): string {
  // Pre-match
  if (['flyer', 'lineup', 'walkon', 'anthem'].includes(assetType)) return 'pre_match';
  // During match
  if (['goal', 'score_update'].includes(assetType)) return 'during_match';
  // Post-match
  if (['end_score', 'match_summary', 'highlights'].includes(assetType)) return 'post_match';
  // Season
  if (['transformation', 'season_recap'].includes(assetType)) return 'season';
  // Member
  if (assetType.startsWith('member_')) return assetType;
  return 'other';
}

// Get friendly label for asset type
function getAssetTypeLabel(assetType: string): string {
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

// Get icon for asset type
function getAssetTypeIcon(assetType: string): string {
  const allItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
    ...CONTENT_TYPES.season.items,
    ...CONTENT_TYPES.member.items,
  ];
  const found = allItems.find(item => item.subtype === assetType);
  return found?.icon || '📄';
}

// ============================================================================
// Content Card Component
// ============================================================================

function ContentCard({
  item,
  onPreview,
  onDownload,
  onShare,
  onDelete,
}: {
  item: ContentItem;
  onPreview?: (item: ContentItem) => void;
  onDownload?: (item: ContentItem) => void;
  onShare?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
}) {
  const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
  const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  // Extract context from metadata
  const projectName = typeof item.project === 'object' ? item.project?.name : '';
  const activityTitle = (item.extraction_metadata?.activity_title as string) || (typeof item.activity === 'object' ? item.activity?.title : '');
  const sportType = (item.extraction_metadata?.sport_type as string) || '';
  const clubName = (item.extraction_metadata?.club_name as string) || '';
  const teamName = (item.extraction_metadata?.team_name as string) || '';
  const seasonKey = (item.extraction_metadata?.season_key as string) || '';
  const tags = (item.extraction_metadata?.tags as string[]) || [];

  // Match-specific context
  const opponent = (item.extraction_metadata?.opponent as string) || '';
  const activityDate = (item.extraction_metadata?.activity_date as string) || '';
  const homeAway = (item.extraction_metadata?.home_away as string) || '';
  const scoreHome = item.extraction_metadata?.score_home as number | undefined;
  const scoreAway = item.extraction_metadata?.score_away as number | undefined;

  return (
    <Card
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      onClick={() => onPreview?.(item)}
    >
      {/* Thumbnail */}
      <div style={{
        height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
        overflow: 'hidden', position: 'relative',
      }}>
        {url ? (
          isVideo ? (
            <video
              src={url}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={url}
              alt={item.title || getAssetTypeLabel(normalizedType)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>
            {getAssetTypeIcon(normalizedType)}
          </span>
        )}
        {/* Type badge */}
        <span style={{
          position: 'absolute', top: 8, left: 8,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          backgroundColor: '#2563eb', color: '#fff',
        }}>
          {getAssetTypeLabel(normalizedType)}
        </span>
        {isVideo && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            backgroundColor: '#dc2626', color: '#fff',
          }}>
            🎬 Video
          </span>
        )}
        {/* Sport badge */}
        {sportType && (
          <span style={{
            position: 'absolute', bottom: 8, left: 8,
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
          }}>
            ⚽ {sportType}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title || getAssetTypeLabel(normalizedType)}
        </Text>

        {/* Context: Club / Team / Activity */}
        {(clubName || teamName || projectName || activityTitle) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {clubName && (
              <span style={{ fontSize: 11, color: 'var(--app-text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                🏟️ {clubName}
              </span>
            )}
            {teamName && (
              <span style={{ fontSize: 11, color: 'var(--app-text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                👕 {teamName}
              </span>
            )}
            {!clubName && !teamName && projectName && (
              <span style={{ fontSize: 11, color: 'var(--app-text-secondary)' }}>
                {projectName}
              </span>
            )}
          </div>
        )}

        {/* Activity / Match title */}
        {activityTitle && (
          <Text size="xs" color="secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activityTitle}
          </Text>
        )}

        {/* Match details: opponent, date, score */}
        {(opponent || activityDate || scoreHome !== undefined) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 10, color: 'var(--app-text-secondary)' }}>
            {opponent && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {homeAway === 'away' ? '📍' : '🏠'} vs {opponent}
              </span>
            )}
            {activityDate && (
              <span>
                📅 {new Date(activityDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {scoreHome !== undefined && scoreAway !== undefined && (
              <span style={{ fontWeight: 700, color: 'var(--app-text-primary)' }}>
                {scoreHome} - {scoreAway}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 6,
                backgroundColor: 'var(--app-surface-2, #f3f4f6)',
                color: 'var(--app-text-secondary)',
              }}>
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span style={{ fontSize: 10, color: 'var(--app-text-secondary)' }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata row */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
          <Badge size="sm" variant="default">
            {item.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
          </Badge>
          {seasonKey && (
            <Badge size="sm" variant="default">
              📅 {seasonKey}
            </Badge>
          )}
        </div>

        <Text size="xs" color="secondary" style={{ marginTop: 2 }}>
          {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
          {item.file_size_bytes && item.file_size_bytes > 0 && (
            <> &middot; {formatFileSize(item.file_size_bytes)}</>
          )}
        </Text>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--app-border)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(item); }}
            title="Download"
            style={{
              flex: 1, padding: '6px 8px', border: '1px solid var(--app-border)', borderRadius: 4,
              backgroundColor: 'var(--app-surface)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            ⬇️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare?.(item); }}
            title="Share"
            style={{
              flex: 1, padding: '6px 8px', border: '1px solid var(--app-border)', borderRadius: 4,
              backgroundColor: 'var(--app-surface)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            📤
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}
            title="Delete"
            style={{
              flex: 1, padding: '6px 8px', border: '1px solid var(--app-border)', borderRadius: 4,
              backgroundColor: 'var(--app-surface)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Filter Chip Component
// ============================================================================

function FilterChip({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? 'var(--color-primary, #2563eb)' : 'var(--app-border)'}`,
        backgroundColor: active ? 'var(--color-primary-light, #dbeafe)' : 'transparent',
        color: active ? 'var(--color-primary, #2563eb)' : 'var(--app-text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8,
        backgroundColor: active ? 'var(--color-primary, #2563eb)' : 'var(--app-surface-2, #f3f4f6)',
        color: active ? '#fff' : 'var(--app-text-secondary)',
      }}>
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <Text color="secondary">{message}</Text>
      <Text size="sm" color="secondary" style={{ marginTop: 4 }}>{sub}</Text>
    </Card>
  );
}

// ============================================================================
// Props Interface
// ============================================================================

export interface ContentLibraryViewProps {
  /** When true, renders without page chrome (for embedding in AI Studio) */
  embedded?: boolean;
  /** Override the active level (match/season/member/team/club) - useful when embedded */
  overrideLevel?: HierarchyTab;
}

// ============================================================================
// Main Page
// ============================================================================

export const ContentLibraryView: React.FC<ContentLibraryViewProps> = ({
  embedded = false,
  overrideLevel,
}) => {
  const location = useLocation();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { user } = useAuth();
  const orgId = (context as any)?.organisation?.id as string | undefined;
  const orgSlug = (context as any)?.organisation?.slug as string | undefined;

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  // Read level from URL or use override prop (when embedded in AI Studio)
  const params = new URLSearchParams(location.search);
  const rawTab = overrideLevel || params.get('level') || params.get('tab') || 'match';
  const activeLevel = (['match', 'season', 'member', 'team', 'club'].includes(rawTab) ? rawTab : 'match') as HierarchyTab;

  // Read category from URL param (from Panel B sidebar)
  const urlCategory = params.get('category') as ContentCategory | null;

  // Data state
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state - directory-style dropdowns
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Sub-filter state: category (pre_match, during_match, etc.) + subtype (flyer, lineup, etc.)
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory>(urlCategory || 'all');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  type SortOption = 'newest' | 'oldest' | 'title' | 'type';
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  // Sync category from URL when it changes (Panel B sidebar navigation)
  useEffect(() => {
    if (urlCategory && ['all', 'pre_match', 'during_match', 'post_match', 'season', 'member'].includes(urlCategory)) {
      setCategoryFilter(urlCategory);
      setSubtypeFilter('all');
    }
  }, [urlCategory]);

  // Load organisations
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000 },
        );
        setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };
    load();
  }, [isSuperAdmin, myOrganisations]);

  // Load clubs and teams when org changes
  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      const selectedOrg = selectedOrgId
        ? organisations.find((o) => String(o.id) === String(selectedOrgId))
        : null;

      const orgSlugForApi = selectedOrg?.slug || orgSlug || '';

      if (!orgSlugForApi) {
        setClubs([]);
        setTeams([]);
        return;
      }

      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch {
        // ignore
      }
    };
    load();
  }, [selectedOrgId, organisations, orgSlug]);

  // Filter teams by selected club
  const filteredTeams = useMemo(() => {
    if (!selectedClubId) return teams;
    return teams.filter((t) => {
      const parentId = typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project;
      return String(parentId) === String(selectedClubId);
    });
  }, [teams, selectedClubId]);

  // Load seasons when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setSeasons([]);
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        // Fetch seasons for the team
        const response = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project=${selectedTeamId}&period_type=season&page_size=100`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const items = data?.results || data?.data?.results || [];
          setSeasons(items.map((s: any) => ({ id: String(s.id), name: s.name, key: s.key || s.slug })));
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [selectedTeamId]);

  // Load matches when season changes
  useEffect(() => {
    if (!selectedSeasonId) {
      setMatches([]);
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/activities/?period=${selectedSeasonId}&activity_type=match&page_size=100&ordering=-activity_date`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const items = data?.results || data?.data?.results || [];
          setMatches(items.map((m: any) => ({
            id: String(m.id),
            title: m.title || m.name,
            slug: m.slug,
            activity_date: m.activity_date,
          })));
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [selectedSeasonId]);

  // Load content items
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();
      let url = `${apiBaseUrl}/api/v1/media/items/?page_size=200`;

      // Apply filters
      if (selectedMatchId) {
        url += `&activity=${selectedMatchId}`;
      } else if (selectedTeamId) {
        url += `&project=${selectedTeamId}`;
      } else if (selectedClubId) {
        url += `&project=${selectedClubId}`;
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data?.results || data?.data?.results || [];
        setContentItems(Array.isArray(items) ? items : []);
      } else {
        setError('Kon content niet laden');
      }
    } catch (err) {
      setError('Fout bij laden van content');
      console.error('[ContentLibrary] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMatchId, selectedTeamId, selectedClubId]);

  // Fetch content when filters change
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Reset filters when level changes
  useEffect(() => {
    setCategoryFilter('all');
    setSubtypeFilter('all');
    setSearchQuery('');
  }, [activeLevel]);

  // Filter content by category + subtype + search
  const filteredContent = useMemo(() => {
    let result = contentItems;

    // Category filter (pre_match, during_match, post_match, season, member)
    if (categoryFilter !== 'all') {
      const category = CONTENT_CATEGORIES.find(c => c.key === categoryFilter);
      if (category && category.subtypes.length > 0) {
        result = result.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return category.subtypes.includes(normalizedType);
        });
      }
    }

    // Subtype filter (flyer, lineup, goal, etc.)
    if (subtypeFilter !== 'all') {
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
        const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
        return normalizedType === subtypeFilter;
      });
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || '';
        const clubName = (item.extraction_metadata?.club_name as string) || '';
        const teamName = (item.extraction_metadata?.team_name as string) || '';
        return (
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          assetType.toLowerCase().includes(q) ||
          getAssetTypeLabel(assetType).toLowerCase().includes(q) ||
          clubName.toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'type':
          const typeA = (a.extraction_metadata?.asset_type as string) || '';
          const typeB = (b.extraction_metadata?.asset_type as string) || '';
          return typeA.localeCompare(typeB);
        default:
          return 0;
      }
    });

    return result;
  }, [contentItems, categoryFilter, subtypeFilter, searchQuery, sortBy]);

  // Count items per category and subtype
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contentItems.length };

    CONTENT_CATEGORIES.forEach(cat => {
      if (cat.key !== 'all') {
        counts[cat.key] = contentItems.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return cat.subtypes.includes(normalizedType);
        }).length;
      }
    });

    return counts;
  }, [contentItems]);

  // Count items per subtype (for chips within active category)
  const subtypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };

    // Get subtypes for current category
    const category = CONTENT_CATEGORIES.find(c => c.key === categoryFilter);
    const subtypes = category?.subtypes || [];

    // If category is 'all', count all subtypes
    if (categoryFilter === 'all') {
      CONTENT_TYPE_FILTERS.forEach(f => {
        counts[f.key] = 0;
      });
    } else {
      subtypes.forEach(st => {
        counts[st] = 0;
      });
    }

    // Count matching items
    contentItems.forEach(item => {
      const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
      const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');

      if (categoryFilter === 'all' || subtypes.includes(normalizedType)) {
        counts[normalizedType] = (counts[normalizedType] || 0) + 1;
        counts.all = (counts.all || 0) + 1;
      }
    });

    return counts;
  }, [contentItems, categoryFilter]);

  const clearFilters = () => {
    setSelectedOrgId('');
    setSelectedClubId('');
    setSelectedTeamId('');
    setSelectedSeasonId('');
    setSelectedMatchId('');
    setCategoryFilter('all');
    setSubtypeFilter('all');
    setSearchQuery('');
  };

  // Level labels for header
  const levelLabels: Record<HierarchyTab, string> = {
    match: 'Match',
    season: 'Season',
    member: 'Member',
    team: 'Team',
    club: 'Club',
  };

  const handlePreview = (item: ContentItem) => {
    setPreviewItem(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
  };

  const handleDownload = async (item: ContentItem) => {
    const url = item.file_url || getAssetUrl(item.storage_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = item.title || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async (item: ContentItem) => {
    const url = item.file_url || getAssetUrl(item.storage_path);
    if (navigator.share && url) {
      try {
        await navigator.share({
          title: item.title || 'Generated Content',
          url: url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else if (url) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link gekopieerd naar klembord');
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (confirm(`Weet je zeker dat je "${item.title || 'dit item'}" wilt verwijderen?`)) {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/media/items/${item.id}/`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          // Remove from local state
          setContentItems(prev => prev.filter(i => i.id !== item.id));
        } else {
          alert('Verwijderen mislukt');
        }
      } catch {
        alert('Verwijderen mislukt');
      }
    }
  };

  if (!orgId) {
    return (
      <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: 'var(--app-bg)', padding: 24 }}>
        <Alert variant="info">Selecteer een organisatie om de content library te bekijken.</Alert>
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: 'var(--app-bg)' }}>
      {/* Header - only show when not embedded */}
      {!embedded && (
        <div style={{ padding: 24, borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
          <Stack direction="column" gap="1">
            <Text size="xl" weight="bold">Gallery</Text>
            <Text size="md" color="secondary">
              Al je gegenereerde content op één plek
            </Text>
          </Stack>
        </div>
      )}

      {/* Toolbar: directory-style filters */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--app-border)' }}>
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoeken..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 6,
            border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)',
            fontSize: 13,
          }}
        />

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
            backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 140,
          }}
        >
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="title">A-Z op titel</option>
          <option value="type">Op type</option>
        </select>

        {/* Organisation filter (only for superadmin) */}
        {isSuperAdmin && organisations.length > 1 && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
              setSelectedTeamId('');
              setSelectedSeasonId('');
              setSelectedMatchId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        )}

        {/* Club filter */}
        {clubs.length > 0 && (
          <select
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              setSelectedTeamId('');
              setSelectedSeasonId('');
              setSelectedMatchId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Club: All</option>
            {[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        )}

        {/* Team filter */}
        {filteredTeams.length > 0 && (
          <select
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              setSelectedSeasonId('');
              setSelectedMatchId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Team: All</option>
            {[...filteredTeams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        )}

        {/* Season filter */}
        {seasons.length > 0 && (
          <select
            value={selectedSeasonId}
            onChange={(e) => {
              setSelectedSeasonId(e.target.value);
              setSelectedMatchId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Season: All</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
        )}

        {/* Match filter (only show on match tab) */}
        {activeLevel === 'match' && matches.length > 0 && (
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 200,
            }}
          >
            <option value="">Match: All</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.title}
                {match.activity_date && ` (${new Date(match.activity_date).toLocaleDateString('nl-NL')})`}
              </option>
            ))}
          </select>
        )}

        {/* Clear button */}
        <Button
          variant="secondary"
          size="md"
          onClick={clearFilters}
          style={{ marginLeft: 'auto' }}
        >
          Clear
        </Button>
      </div>

      {/* Content area */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Stack direction="column" gap="4">

          {/* Subtype filter chips (show when category has subtypes) */}
          {categoryFilter !== 'all' && CONTENT_CATEGORIES.find(c => c.key === categoryFilter)?.subtypes.length! > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <FilterChip
                active={subtypeFilter === 'all'}
                onClick={() => setSubtypeFilter('all')}
                label="All"
                count={subtypeCounts.all || 0}
              />
              {CONTENT_CATEGORIES.find(c => c.key === categoryFilter)?.subtypes.map(st => {
                const filter = CONTENT_TYPE_FILTERS.find(f => f.key === st);
                const count = subtypeCounts[st] || 0;
                if (count === 0) return null;
                return (
                  <FilterChip
                    key={st}
                    active={subtypeFilter === st}
                    onClick={() => setSubtypeFilter(st)}
                    label={`${filter?.icon || '📄'} ${filter?.label || getAssetTypeLabel(st)}`}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* When 'all' category is selected, show all content type filters */}
          {categoryFilter === 'all' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CONTENT_TYPE_FILTERS.map(({ key, label, icon }) => {
                const count = subtypeCounts[key] || 0;
                if (key !== 'all' && count === 0) return null;
                return (
                  <FilterChip
                    key={key}
                    active={subtypeFilter === key}
                    onClick={() => setSubtypeFilter(key)}
                    label={`${icon} ${label}`}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && <Alert variant="error">{error}</Alert>}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Text color="secondary">Content laden...</Text>
            </div>
          )}

          {/* Content Grid */}
          {!loading && (
            filteredContent.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {filteredContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onShare={handleShare}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🎬"
                message="Geen content gevonden."
                sub={
                  contentItems.length > 0
                    ? 'Pas je filters of zoekopdracht aan.'
                    : 'Genereer content via de match of season pagina.'
                }
              />
            )
          )}

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <Text size="xs" color="secondary">
              {filteredContent.length} van {contentItems.length} items
            </Text>
          </div>
        </Stack>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closePreview}
        >
          <div
            style={{
              backgroundColor: 'var(--app-surface)', borderRadius: 12,
              maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text weight="bold" size="lg">{previewItem.title || 'Preview'}</Text>
              <Button variant="secondary" size="sm" onClick={closePreview}>Sluiten</Button>
            </div>
            {(() => {
              const url = previewItem.file_url || getAssetUrl(previewItem.storage_path);
              const isVideo = Boolean(
                previewItem.mime_type?.startsWith('video/') ||
                (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
              );
              return url && (
                isVideo ? (
                  <video
                    src={url}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={url}
                    alt={previewItem.title}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                  />
                )
              );
            })()}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const url = previewItem.file_url || getAssetUrl(previewItem.storage_path);
                  if (url) window.open(url, '_blank');
                }}
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Standalone Page Export
// ============================================================================

/** Standalone page wrapper for /contentlib route */
const ContentLibraryPage: React.FC = () => <ContentLibraryView embedded={false} />;

export default ContentLibraryPage;
