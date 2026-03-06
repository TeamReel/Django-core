/**
 * GalleryMatchTimeline — Match-grouped content history
 *
 * Groups content items by match and displays them as a chronological timeline.
 * Each match shows a header card with date/opponent/score and a horizontal
 * scrollable row of content thumbnails. Items without a match are shown in a
 * separate "Other" section at the bottom.
 *
 * Additional features:
 * - "Today" banner if a match is happening today
 * - Quick stats (total items, matches with content)
 * - Share-all / download-all per match
 * - Expand/collapse match groups for speed
 * - View toggle: timeline vs flat grid
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, Download, Share2, LayoutGrid, Clock } from 'lucide-react';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { getAssetTypeLabel, getAssetTypeIcon, type ContentItem } from './contentLibraryTypes';
import { ContentCard } from './ContentCard';
import styles from './GalleryMatchTimeline.module.css';

// ============================================================================
// Types
// ============================================================================

export interface MatchGroup {
  /** Activity (match) ID — or '__other__' for ungrouped items */
  activityId: string;
  /** Display title */
  title: string;
  /** ISO date string */
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
}

// ============================================================================
// Utilities
// ============================================================================

function groupContentByMatch(items: ContentItem[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>();

  for (const item of items) {
    const meta = item.extraction_metadata || {};
    const activityId = typeof item.activity === 'object'
      ? item.activity?.id || '__other__'
      : (item.activity as string) || '__other__';

    const activityTitle = (meta.activity_title as string)
      || (typeof item.activity === 'object' ? item.activity?.title : '')
      || '';

    if (!groups.has(activityId)) {
      groups.set(activityId, {
        activityId,
        title: activityTitle || (activityId === '__other__' ? 'Overige content' : `Match ${activityId.slice(0, 8)}`),
        date: (meta.activity_date as string) || item.created_at || '',
        opponent: (meta.opponent as string) || '',
        homeAway: (meta.home_away as string) || '',
        scoreHome: meta.score_home as number | undefined,
        scoreAway: meta.score_away as number | undefined,
        items: [],
      });
    }

    groups.get(activityId)!.items.push(item);
  }

  // Sort groups: most recent first, __other__ at the end
  const sorted = [...groups.values()].sort((a, b) => {
    if (a.activityId === '__other__') return 1;
    if (b.activityId === '__other__') return -1;
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateB - dateA;
  });

  return sorted;
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function formatMatchDate(dateStr: string): { day: string; month: string; full: string } {
  if (!dateStr) return { day: '—', month: '', full: '' };
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('nl-NL', { month: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

// ============================================================================
// Main Component
// ============================================================================

interface GalleryMatchTimelineProps {
  items: ContentItem[];
  onPreview: (item: ContentItem) => void;
  onDownload: (item: ContentItem) => void;
  onShare: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onNavigateToMatches?: () => void;
}

export function GalleryMatchTimeline({
  items,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onNavigateToMatches,
}: GalleryMatchTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  const groups = useMemo(() => groupContentByMatch(items), [items]);

  // Auto-expand first 3 groups on initial render
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    groups.slice(0, 3).forEach(g => set.add(g.activityId));
    return set;
  }, [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Combine: auto-expanded + manually expanded
  const isExpanded = (id: string) => expandedGroups.has(id) || initialExpanded.has(id);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (isExpanded(id)) {
        next.delete(id);
        // Also remove from initial — we track collapse explicitly
        initialExpanded.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Stats
  const matchGroups = groups.filter(g => g.activityId !== '__other__');
  const otherGroup = groups.find(g => g.activityId === '__other__');
  const todayMatch = matchGroups.find(g => isToday(g.date));

  // Download all items for a match
  const handleDownloadAll = (group: MatchGroup) => {
    group.items.forEach(item => onDownload(item));
  };

  // Share first item of a match (or could be extended)
  const handleShareMatch = async (group: MatchGroup) => {
    const firstWithUrl = group.items.find(i => i.file_url || i.storage_path);
    if (firstWithUrl) onShare(firstWithUrl);
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyTimeline}>
        <span className={styles.emptyIcon}>🎬</span>
        <span className={styles.emptyTitle}>Nog geen content</span>
        <span className={styles.emptySub}>
          Maak een wedstrijd aan en genereer je eerste content — flyers, line-ups, video's en meer.
        </span>
        {onNavigateToMatches && (
          <button className={styles.emptyBtn} onClick={onNavigateToMatches}>
            Ga naar Wedstrijden
          </button>
        )}
      </div>
    );
  }

  // ── Grid view (flat) ──
  if (viewMode === 'grid') {
    return (
      <>
        <StatsAndToggle
          totalItems={items.length}
          matchCount={matchGroups.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className={styles.timeline}>
          <div className={styles.otherGrid}>
            {items.map(item => (
              <ContentCard
                key={item.id}
                item={item}
                onPreview={onPreview}
                onDownload={onDownload}
                onShare={onShare}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── Timeline view (grouped by match) ──
  return (
    <>
      <StatsAndToggle
        totalItems={items.length}
        matchCount={matchGroups.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {todayMatch && (
        <div className={styles.todayBanner}>
          <span className={styles.todayPulse} />
          <span className={styles.todayText}>
            Vandaag: {todayMatch.title}
          </span>
          <button
            className={styles.todayAction}
            onClick={() => {
              if (!isExpanded(todayMatch.activityId)) toggleGroup(todayMatch.activityId);
            }}
          >
            Bekijk →
          </button>
        </div>
      )}

      <div className={styles.timeline}>
        {matchGroups.map(group => {
          const { day, month, full } = formatMatchDate(group.date);
          const open = isExpanded(group.activityId);

          return (
            <div key={group.activityId} className={styles.matchGroup}>
              {/* Header */}
              <div
                className={styles.matchHeader}
                onClick={() => toggleGroup(group.activityId)}
                role="button"
                aria-expanded={open}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.activityId); } }}
              >
                {/* Date badge */}
                <div className={styles.matchDateBadge} title={full}>
                  <span className={styles.matchDay}>{day}</span>
                  <span className={styles.matchMonth}>{month}</span>
                </div>

                {/* Info */}
                <div className={styles.matchInfo}>
                  <span className={styles.matchTitle}>
                    {group.opponent ? `vs ${group.opponent}` : group.title}
                  </span>
                  <span className={styles.matchMeta}>
                    {group.homeAway && (
                      <span className={styles.homeAwayBadge} data-type={group.homeAway}>
                        {group.homeAway === 'home' ? 'Thuis' : 'Uit'}
                      </span>
                    )}
                    {full && <span>{full}</span>}
                  </span>
                </div>

                {/* Score */}
                {group.scoreHome !== undefined && group.scoreAway !== undefined && (
                  <span className={styles.matchScore}>
                    {group.scoreHome} – {group.scoreAway}
                  </span>
                )}

                {/* Content count */}
                <span className={styles.matchCount}>{group.items.length}</span>

                {/* Chevron */}
                <ChevronDown size={18} className={styles.chevron} data-open={String(open)} />
              </div>

              {/* Expanded content */}
              {open && (
                <div className={styles.contentBody}>
                  <div className={styles.contentScroll}>
                    {group.items.map(item => (
                      <ThumbnailCard
                        key={item.id}
                        item={item}
                        onPreview={onPreview}
                      />
                    ))}
                  </div>
                  <div className={styles.matchActions}>
                    <button className={styles.matchActionBtn} onClick={() => handleDownloadAll(group)}>
                      <Download size={14} /> Alles downloaden
                    </button>
                    <button className={styles.matchActionBtn} onClick={() => handleShareMatch(group)}>
                      <Share2 size={14} /> Delen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Other content (not linked to a match) */}
        {otherGroup && otherGroup.items.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Overige content</span>
              <span className={styles.sectionLine} />
              <span className={styles.sectionCount}>{otherGroup.items.length} items</span>
            </div>
            <div className={styles.otherGrid}>
              {otherGroup.items.map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatsAndToggle({
  totalItems,
  matchCount,
  viewMode,
  onViewModeChange,
}: {
  totalItems: number;
  matchCount: number;
  viewMode: 'timeline' | 'grid';
  onViewModeChange: (mode: 'timeline' | 'grid') => void;
}) {
  return (
    <div className={styles.statsBanner}>
      <div className={styles.statChip}>
        <span className={styles.statNumber}>{totalItems}</span>
        <span className={styles.statLabel}>Items</span>
      </div>
      <div className={styles.statChip}>
        <span className={styles.statNumber}>{matchCount}</span>
        <span className={styles.statLabel}>Wedstrijden</span>
      </div>
      <div className={styles.viewToggle}>
        <button
          className={styles.viewBtn}
          data-active={String(viewMode === 'timeline')}
          onClick={() => onViewModeChange('timeline')}
          title="Tijdlijn"
        >
          <Clock size={14} /> Tijdlijn
        </button>
        <button
          className={styles.viewBtn}
          data-active={String(viewMode === 'grid')}
          onClick={() => onViewModeChange('grid')}
          title="Grid"
        >
          <LayoutGrid size={14} /> Grid
        </button>
      </div>
    </div>
  );
}

function ThumbnailCard({ item, onPreview }: { item: ContentItem; onPreview: (item: ContentItem) => void }) {
  const meta = item.extraction_metadata || {};
  const assetType = (meta.asset_type as string) || 'other';
  const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  return (
    <div
      className={styles.thumbCard}
      onClick={() => onPreview(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onPreview(item); }}
    >
      <div className={styles.thumbImageWrap}>
        {url ? (
          isVideo ? (
            <video
              src={url}
              className={styles.thumbImage}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={url}
              alt={item.title || getAssetTypeLabel(normalizedType)}
              className={styles.thumbImage}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <div className={styles.thumbFallback}>
            {getAssetTypeIcon(normalizedType)}
          </div>
        )}
        {isVideo && <span className={styles.thumbBadge}>🎬 Video</span>}
      </div>
      <div className={styles.thumbInfo}>
        <span className={styles.thumbType}>{getAssetTypeLabel(normalizedType)}</span>
        <span className={styles.thumbDate}>
          {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}
