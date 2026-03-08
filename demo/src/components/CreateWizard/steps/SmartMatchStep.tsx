/**
 * SmartMatchStep – "Pick-a-match" step inside CreateWizard.
 *
 * Shows matches close in time (< 48h) as highlighted cards at the top,
 * remaining upcoming matches below. When exactly one match falls within
 * the 48h window, it's pre-selected for 1-tap confirm.
 *
 * After selection the match ID is stored in CreateWizardContext.prefill
 * and the wizard advances to the content flow (MatchWizardV2).
 */
import React from 'react';
import { ChevronRight, CalendarClock, Zap, Calendar } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { useSmartMatch } from '../../../hooks/useSmartMatch';
import { formatRelativeTime, getDateUrgency } from '../../../utils/relativeTime';
import type { Activity } from '../../../hooks/useActivities';
import styles from '../CreateWizard.module.css';

export interface SmartMatchStepProps {
  /** Called with the full Activity when a match is selected (bridge to MatchWizardContext) */
  onMatchSelect?: (match: Activity) => void;
}

export function SmartMatchStep({ onMatchSelect }: SmartMatchStepProps = {}) {
  const { next } = useWizard();
  const { prefill, setPrefill } = useCreateWizard();
  const { highlighted, upcoming, loading, error } = useSmartMatch(prefill.teamIdForApi);

  // If there's exactly 1 highlighted match, pre-select it
  // (the user can still tap a different one)
  const autoMatch = highlighted.length === 1 ? highlighted[0] : null;

  const handleSelect = (match: Activity) => {
    setPrefill({ ...prefill, activityId: match.id });
    onMatchSelect?.(match);
    next();
  };

  // ─── Loading / Error / Empty ─────────────────────────────
  if (loading) {
    return (
      <div className={styles.smartMatchWrap}>
        <div className={styles.smartMatchLoading}>
          <CalendarClock size={28} className={styles.smartMatchLoadingIcon} />
          <span>Wedstrijden ophalen…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.smartMatchWrap}>
        <div className={styles.smartMatchEmpty}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const hasAny = highlighted.length > 0 || upcoming.length > 0;

  if (!hasAny) {
    return (
      <div className={styles.smartMatchWrap}>
        <div className={styles.smartMatchEmpty}>
          <Calendar size={32} className={styles.smartMatchEmptyIcon} />
          <p className={styles.smartMatchEmptyTitle}>Geen wedstrijden gevonden</p>
          <p className={styles.smartMatchEmptyHint}>
            {prefill.teamIdForApi
              ? 'Plan eerst een wedstrijd voor dit team.'
              : 'Selecteer een team om wedstrijden te zien.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.smartMatchWrap}>
      {/* ── Highlighted (< 48h) ─────────────────────── */}
      {highlighted.length > 0 && (
        <section className={styles.smartMatchSection}>
          <h3 className={styles.smartMatchSectionTitle}>
            <Zap size={16} className={styles.smartMatchAccentIcon} />
            Binnenkort
          </h3>
          <div className={styles.smartMatchList}>
            {highlighted.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                highlighted
                autoSelected={autoMatch?.id === match.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming ─────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className={styles.smartMatchSection}>
          <h3 className={styles.smartMatchSectionTitle}>Gepland</h3>
          <div className={styles.smartMatchList}>
            {upcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Match card ─────────────────────────────────────────

interface MatchCardProps {
  match: Activity;
  highlighted?: boolean;
  autoSelected?: boolean;
  onSelect: (match: Activity) => void;
}

function MatchCard({ match, highlighted, autoSelected, onSelect }: MatchCardProps) {
  const date = new Date(match.start_time);
  const relativeTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);

  return (
    <button
      className={`${styles.smartMatchCard} ${highlighted ? styles.smartMatchCardHighlighted : ''}`}
      data-urgency={urgency}
      data-auto={autoSelected || undefined}
      onClick={() => onSelect(match)}
    >
      <div className={styles.smartMatchBadge} data-urgency={urgency}>
        {date.getDate()}
      </div>
      <div className={styles.smartMatchInfo}>
        <span className={styles.smartMatchTitle}>{match.title}</span>
        <span className={styles.smartMatchMeta}>
          {relativeTime} &middot;{' '}
          {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          {match.location ? ` · ${match.location}` : ''}
        </span>
      </div>
      <ChevronRight size={20} className={styles.smartMatchChevron} />
    </button>
  );
}
