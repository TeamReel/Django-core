import React from 'react';
import { ChevronRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import SmartEmptyState from './SmartEmptyState';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import type { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizard.module.css';

type Data = ReturnType<typeof useMatchWizardData>;

interface MatchStepProps {
  matchesError: Data['matchesError'];
  matchesLoading: Data['matchesLoading'];
  upcomingMatches: Data['upcomingMatches'];
  selectedMatch: Data['selectedMatch'];
  setSelectedMatch: Data['setSelectedMatch'];
  setCurrentStep: Data['setCurrentStep'];
}

export function MatchStep({
  matchesError,
  matchesLoading,
  upcomingMatches,
  selectedMatch,
  setSelectedMatch,
  setCurrentStep,
}: MatchStepProps) {
  return (
    <div className="flex-col gap-10">
      {matchesError ? (
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
      ) : matchesLoading ? (
        <div className="text-center p-32 text-muted">Laden...</div>
      ) : upcomingMatches.length === 0 ? (
        <SmartEmptyState type="matches" compact hideActions />
      ) : (
        upcomingMatches.map((match) => {
          const isSelected = selectedMatch?.id === match.id;
          const date = new Date(match.start_time);
          const relativeTime = formatRelativeTime(date, 'nl');
          const urgency = getDateUrgency(date);

          return (
            <button key={match.id}
              onClick={() => { setSelectedMatch(match); setCurrentStep('content'); }}
              className={styles.matchCard}
              data-selected={isSelected}>
              <div className={`rounded-12 flex-center fw-700 fs-14 ${styles.dateBadge}`}
                data-urgency={urgency}>{date.getDate()}</div>
              <div className="flex-1-min">
                <div className="fw-600 text-primary truncate fs-15">{match.title}</div>
                <div className="fs-13 text-muted">
                  {relativeTime} &middot; {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {isSelected
                ? <Check size={22} className={styles.iconCheck} />
                : <ChevronRight size={20} className={styles.iconChevron} />}
            </button>
          );
        })
      )}
    </div>
  );
}
