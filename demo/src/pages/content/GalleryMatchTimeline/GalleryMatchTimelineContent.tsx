/**
 * GalleryMatchTimelineContent - Main timeline view content
 */
import React, { useState, useMemo } from 'react';
import { ContentCard } from '../ContentCard';
import { StatsAndToggle } from './StatsAndToggle';
import { MatchGroupCard } from './MatchGroupCard';
import { groupContentByMatch, isToday } from './utils';
import type { GalleryMatchTimelineProps, MatchGroup } from './types';
import layoutStyles from '../GalleryMatchTimeline.module.css';
import cardStyles from '../GalleryMatchTimeline.cards.module.css';

export function GalleryMatchTimelineContent({
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
  }, [groups.length]);

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
      <div className={cardStyles.emptyTimeline}>
        <span className={cardStyles.emptyIcon}></span>
        <span className={cardStyles.emptyTitle}>Nog geen content</span>
        <span className={cardStyles.emptySub}>
          Maak een wedstrijd aan en genereer je eerste content — flyers, line-ups, video's en meer.
        </span>
        {onNavigateToMatches && (
          <button className={cardStyles.emptyBtn} onClick={onNavigateToMatches}>
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
        <div className={layoutStyles.timeline}>
          <div className={cardStyles.otherGrid}>
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
        <div className={cardStyles.todayBanner}>
          <span className={cardStyles.todayPulse} />
          <span className={cardStyles.todayText}>
            Vandaag: {todayMatch.title}
          </span>
          <button
            className={cardStyles.todayAction}
            onClick={() => {
              if (!isExpanded(todayMatch.activityId)) toggleGroup(todayMatch.activityId);
            }}
          >
            Bekijk →
          </button>
        </div>
      )}

      <div className={layoutStyles.timeline}>
        {matchGroups.map(group => (
          <MatchGroupCard
            key={group.activityId}
            group={group}
            isExpanded={isExpanded(group.activityId)}
            onToggle={() => toggleGroup(group.activityId)}
            onPreview={onPreview}
            onDownloadAll={() => handleDownloadAll(group)}
            onShareMatch={() => handleShareMatch(group)}
          />
        ))}

        {/* Other content (not linked to a match) */}
        {otherGroup && otherGroup.items.length > 0 && (
          <>
            <div className={cardStyles.sectionHeader}>
              <span className={cardStyles.sectionTitle}>Overige content</span>
              <span className={cardStyles.sectionLine} />
              <span className={cardStyles.sectionCount}>{otherGroup.items.length} items</span>
            </div>
            <div className={cardStyles.otherGrid}>
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
