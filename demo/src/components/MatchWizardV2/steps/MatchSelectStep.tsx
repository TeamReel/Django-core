/**
 * MatchSelectStep – Step 1: Select a match
 */
import React from 'react';
import { ChevronRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import SmartEmptyState from '../../SmartEmptyState';
import { formatRelativeTime, getDateUrgency } from '@/utils/relativeTime';
import styles from '../MatchWizardV2.module.css';

export function MatchSelectStep() {
  const { next } = useWizard();
  const {
    upcomingMatches,
    selectedMatch,
    setSelectedMatch,
    matchesLoading,
    matchesError,
  } = useMatchWizard();

  const handleSelectMatch = (match: typeof upcomingMatches[0]) => {
    setSelectedMatch(match);
    next();
  };

  if (matchesError) {
    return (
      <div className={styles.errorBanner}>
        <AlertTriangle size={20} className={styles.errorIcon} />
        <div className="flex-1-min">
          <div className="fw-600 fs-14 text-primary">Fout bij laden</div>
          <div className="fs-13 text-muted">{matchesError}</div>
        </div>
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>
          <RefreshCw size={16} />Opnieuw
        </button>
      </div>
    );
  }

  if (matchesLoading) {
    return <div className="text-center p-32 text-muted">Laden...</div>;
  }

  if (upcomingMatches.length === 0) {
    return <SmartEmptyState type="matches" compact hideActions />;
  }

  return (
    <div className="flex-col gap-10">
      {upcomingMatches.map((match) => {
        const isSelected = selectedMatch?.id === match.id;
        const date = new Date(match.start_time);
        const relativeTime = formatRelativeTime(date, 'nl');
        const urgency = getDateUrgency(date);

        return (
          <button
            key={match.id}
            onClick={() => handleSelectMatch(match)}
            className={styles.matchCard}
            data-selected={isSelected}
          >
            <div
              className={`rounded-12 flex-center fw-700 fs-14 ${styles.dateBadge}`}
              data-urgency={urgency}
            >
              {date.getDate()}
            </div>
            <div className="flex-1-min">
              <div className="fw-600 text-primary truncate fs-15">{match.title}</div>
              <div className="fs-13 text-muted">
                {relativeTime} &middot; {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {isSelected
              ? <Check size={22} className="status-success" />
              : <ChevronRight size={20} className="text-muted" />}
          </button>
        );
      })}
    </div>
  );
}
