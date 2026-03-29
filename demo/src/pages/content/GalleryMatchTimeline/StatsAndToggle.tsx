/**
 * StatsAndToggle - Stats banner with view mode toggle
 */
import React from 'react';
import { LayoutGrid, Clock } from 'lucide-react';
import styles from '../GalleryMatchTimeline.stats.module.css';

interface StatsAndToggleProps {
  totalItems: number;
  matchCount: number;
  viewMode: 'timeline' | 'grid';
  onViewModeChange: (mode: 'timeline' | 'grid') => void;
}

export function StatsAndToggle({
  totalItems,
  matchCount,
  viewMode,
  onViewModeChange,
}: StatsAndToggleProps) {
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
