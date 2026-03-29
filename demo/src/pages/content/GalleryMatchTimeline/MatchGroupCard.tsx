/**
 * MatchGroupCard - Single match group with expandable content
 */
import React from 'react';
import { ChevronDown, Download, Share2 } from 'lucide-react';
import { ThumbnailCard } from './ThumbnailCard';
import { formatMatchDate } from './utils';
import type { MatchGroup } from './types';
import type { ContentItem } from '../contentLibraryTypes';
import styles from '../GalleryMatchTimeline.match.module.css';

interface MatchGroupCardProps {
  group: MatchGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onPreview: (item: ContentItem) => void;
  onDownloadAll: () => void;
  onShareMatch: () => void;
}

export function MatchGroupCard({
  group,
  isExpanded,
  onToggle,
  onPreview,
  onDownloadAll,
  onShareMatch,
}: MatchGroupCardProps) {
  const { day, month, full } = formatMatchDate(group.date);

  return (
    <div className={styles.matchGroup}>
      {/* Header */}
      <div
        className={styles.matchHeader}
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
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
        <ChevronDown size={18} className={styles.chevron} data-open={String(isExpanded)} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
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
            <button className={styles.matchActionBtn} onClick={onDownloadAll}>
              <Download size={14} /> Alles downloaden
            </button>
            <button className={styles.matchActionBtn} onClick={onShareMatch}>
              <Share2 size={14} /> Delen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
