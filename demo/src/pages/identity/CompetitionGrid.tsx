/**
 * CompetitionGrid — Competition cards for the Overview tab.
 *
 * Renders competitions of the active season as tappable cards in a responsive
 * grid. Each card shows name, type badge, and match count.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Period } from '../../types/season';
import { getPeriodType } from '../../providers/seasonProviderHelpers';
import s from './CompetitionGrid.module.css';

interface CompetitionGridProps {
  competitions: Period[];
  competitionsLoading: boolean;
  getMatchCount?: (comp: Period) => number;
}

const TYPE_LABELS: Record<string, string> = {
  competition: 'Competitie',
  league: 'Competitie',
  cup: 'Beker',
  friendly: 'Vriendschappelijk',
  tournament: 'Toernooi',
};

const TYPE_CLASSES: Record<string, string> = {
  competition: s.typeCompetition,
  league: s.typeCompetition,
  cup: s.typeCup,
  friendly: s.typeFriendly,
  tournament: s.typeFriendly,
};

export const CompetitionGrid: React.FC<CompetitionGridProps> = ({
  competitions,
  competitionsLoading,
  getMatchCount,
}) => {
  const [selectedCompetition, setSelectedCompetition] = useState<Period | null>(null);

  if (competitionsLoading) {
    return (
      <div className={s.section}>
        <div className={s.sectionLabel}>Competities</div>
        <div className={s.grid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={s.card} style={{ opacity: 0.5, minHeight: 80 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={s.section}>
      <div className={s.sectionLabel}>Competities</div>

      {competitions.length === 0 ? (
        <div className={s.empty}>Geen competities in dit seizoen</div>
      ) : (
        <div className={s.grid}>
          {competitions.map((comp) => {
            const type = getPeriodType(comp);
            const typeLabel = TYPE_LABELS[type] || 'Competitie';
            const typeClass = TYPE_CLASSES[type] || s.typeCompetition;
            const matchCount = getMatchCount ? getMatchCount(comp) : null;

            return (
              <button
                key={String(comp.id)}
                type="button"
                className={s.card}
                aria-label={String(comp.name || 'Competitie')}
                onClick={() => setSelectedCompetition(comp)}
              >
                <div className={s.cardName}>{String(comp.name || 'Competitie')}</div>
                <span className={`${s.typeBadge} ${typeClass}`}>{typeLabel}</span>
                {matchCount !== null && (
                  <div className={s.cardMeta}>{matchCount} wedstrijden</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Competition summary sheet */}
      {selectedCompetition && (
        <React.Suspense fallback={null}>
          <CompetitionSummarySheet
            competition={selectedCompetition}
            onClose={() => setSelectedCompetition(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

// ── Inline CompetitionSummarySheet (lightweight) ─────────────────────────────
// Kept inline to avoid a separate lazy chunk for a simple overlay.

interface CompetitionSummarySheetProps {
  competition: Period;
  onClose: () => void;
}

const CompetitionSummarySheet: React.FC<CompetitionSummarySheetProps> = ({
  competition,
  onClose,
}) => {
  const type = getPeriodType(competition);
  const typeLabel = TYPE_LABELS[type] || 'Competitie';

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={s.sheetBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={String(competition.name || 'Competitie')}
    >
      <div className={s.sheetPanel}>
        <div className={s.cardName}>{String(competition.name || 'Competitie')}</div>
        <span className={`${s.typeBadge} ${TYPE_CLASSES[type] || s.typeCompetition}`}>
          {typeLabel}
        </span>
        <button type="button" className={s.sheetClose} onClick={onClose}>
          Sluiten
        </button>
      </div>
    </div>
  );
};
