/**
 * ContentStreakWidget — Gamification widget showing content generation streak.
 *
 * Displays a flame icon + streak count for consecutive matches
 * with complete base content (flyer, lineup, match_summary).
 *
 * Visual states:
 * - streak = 0 → motivational prompt
 * - streak 1-2 → default gold flame
 * - streak 3+ / 5+ / 10+ → milestone badge with emphasis
 * - isAtRisk → pulsing warning state
 */
import React from 'react';
import { Flame, AlertTriangle, ChevronRight } from 'lucide-react';
import type { ContentStreakData } from '../../hooks/useContentStreak';
import styles from './ContentStreakWidget.module.css';

interface ContentStreakWidgetProps {
  /** Streak data from useContentStreak hook */
  streak: ContentStreakData;
  /** Whether user has started using content features (≥2 past matches) */
  hasHistory: boolean;
  /** Loading state */
  loading?: boolean;
  /** CTA click handler (navigate to match content) */
  onAction?: () => void;
  /** Compact mode for team hub */
  compact?: boolean;
}

/** Determine milestone tier for visual treatment */
function getMilestoneTier(count: number): 'none' | 'bronze' | 'silver' | 'gold' {
  if (count >= 10) return 'gold';
  if (count >= 5) return 'silver';
  if (count >= 3) return 'bronze';
  return 'none';
}

export const ContentStreakWidget: React.FC<ContentStreakWidgetProps> = ({
  streak,
  hasHistory,
  loading = false,
  onAction,
  compact = false,
}) => {
  if (loading) {
    return (
      <div className={`${styles.widget} ${styles.loading}`}>
        <div className={styles.loadingSkeleton} />
      </div>
    );
  }

  // Only hide if no match history AND no active match to act on
  if (!hasHistory && !onAction) return null;

  const { currentStreak, isAtRisk } = streak;
  const milestone = getMilestoneTier(currentStreak);
  const isZero = currentStreak === 0;

  const widgetClasses = [
    styles.widget,
    compact && styles.compact,
    isAtRisk && styles.atRisk,
    milestone !== 'none' && styles[`milestone${milestone.charAt(0).toUpperCase()}${milestone.slice(1)}`],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={widgetClasses}
      role="status"
      aria-live="polite"
      aria-label={
        isZero
          ? 'Content streak: nog geen streak gestart'
          : `Content streak: ${currentStreak} wedstrijd${currentStreak !== 1 ? 'en' : ''} op rij`
      }
    >
      <div className={styles.flameWrap}>
        {isAtRisk ? (
          <AlertTriangle size={compact ? 20 : 24} className={styles.warningIcon} />
        ) : (
          <Flame
            size={compact ? 20 : 24}
            className={`${styles.flameIcon} ${isZero ? styles.flameInactive : ''}`}
          />
        )}
      </div>

      <div className={styles.content}>
        {isZero ? (
          <>
            <span className={`${styles.label} fw-600`}>Start je streak!</span>
            {!compact && (
              <span className={`${styles.sublabel} fs-12`}>
                Genereer alle content voor de volgende wedstrijd.
              </span>
            )}
          </>
        ) : isAtRisk ? (
          <>
            <span className={`${styles.label} fw-600`}>
              Streak van {currentStreak} dreigt te breken!
            </span>
            {!compact && (
              <span className={`${styles.sublabel} fs-12`}>
                Genereer content voor de volgende wedstrijd om je streak te behouden.
              </span>
            )}
          </>
        ) : (
          <>
            <span className={`${styles.label} fw-600`}>
              <span className={styles.streakCount}>{currentStreak}</span>
              {' '}wedstrijd{currentStreak !== 1 ? 'en' : ''} op rij
            </span>
            {!compact && milestone !== 'none' && (
              <span className={`${styles.sublabel} fs-12`}>
                {milestone === 'gold' && 'Legendestreak!'}
                {milestone === 'silver' && 'Topstreak!'}
                {milestone === 'bronze' && 'Goed bezig!'}
              </span>
            )}
          </>
        )}
      </div>

      {onAction && (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onAction}
          aria-label={
            isZero
              ? 'Ga naar wedstrijd content om streak te starten'
              : isAtRisk
                ? 'Ga naar wedstrijd content om streak te behouden'
                : 'Bekijk wedstrijd content'
          }
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};
