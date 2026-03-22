/**
 * CompetitionGrid — Competition cards for the Overview tab.
 *
 * Renders competitions of the active season as tappable cards in a responsive
 * grid. Each card shows name, type badge, and match count.
 * Tapping a card opens a summary sheet with the competition's matches.
 */
import React, { useState, useMemo } from 'react';
import type { Period } from '../../types/season';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import { getPeriodType } from '../../providers/seasonProviderHelpers';
import { ChevronRight } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { AppIcon } from '../../components/AppIcon';
import { ListSection } from '../../components/ListSection';
import s from './CompetitionGrid.module.css';

interface CompetitionGridProps {
  competitions: Period[];
  competitionsLoading: boolean;
  getMatchCount?: (comp: Period) => number;
  matches?: MatchRecord[];
  matchDisplayTitle?: (m: MatchRecord) => string;
  onMatchTap?: (m: MatchRecord) => void;
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
  matches = [],
  matchDisplayTitle,
  onMatchTap,
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
            matches={matches}
            matchDisplayTitle={matchDisplayTitle}
            onMatchTap={onMatchTap}
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
  matches?: MatchRecord[];
  matchDisplayTitle?: (m: MatchRecord) => string;
  onMatchTap?: (m: MatchRecord) => void;
  onClose: () => void;
}

const CompetitionSummarySheet: React.FC<CompetitionSummarySheetProps> = ({
  competition,
  matches = [],
  matchDisplayTitle,
  onMatchTap,
  onClose,
}) => {
  const type = getPeriodType(competition);
  const typeLabel = TYPE_LABELS[type] || 'Competitie';
  const typeClass = TYPE_CLASSES[type] || s.typeCompetition;

  const compMatches = useMemo(() => {
    const compId = String(competition.id || '').trim();
    if (!compId) return [];
    return matches.filter((m) => {
      const pid = String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '');
      return pid === compId;
    });
  }, [competition.id, matches]);

  return (
    <NavigationSheet
      isOpen
      onClose={onClose}
      title={String(competition.name || 'Competitie')}
    >
      <div className={s.sheetContent}>
        <span className={`${s.typeBadge} ${typeClass}`}>{typeLabel}</span>
        <div className={s.matchListSection}>
          {compMatches.length === 0 ? (
            <div className={s.sheetEmpty}>Geen wedstrijden</div>
          ) : (
            <ListSection title="Wedstrijden">
              {compMatches.map((m) => (
                <ListSection.Row
                  key={String(m.id)}
                  label={matchDisplayTitle ? matchDisplayTitle(m) : String(m.title || 'Wedstrijd')}
                  icon={ChevronRight}
                  onTap={() => { onMatchTap?.(m); onClose(); }}
                />
              ))}
            </ListSection>
          )}
        </div>
      </div>
    </NavigationSheet>
  );
};

// Suppress unused var warning — useEffect/useCallback no longer needed
