/**
 * SeasonSection — Active season hero card + season pills for the Overview tab.
 *
 * Renders the currently active season as a prominent card with stats,
 * and other seasons as a horizontally scrollable pill row.
 */
import React, { useMemo, useCallback } from 'react';
import { type SeasonOption } from '../../components/SeasonSwitcher';
import type { Period } from '../../types/season';
import s from './SeasonSection.module.css';

interface SeasonSectionProps {
  season: Period | null;
  seasons: SeasonOption[];
  competitionsCount: number;
  matchesCount: number;
  membersCount: number;
  selectedSeasonId: string;
  onSeasonSwitch: (season: SeasonOption) => void;
}

export const SeasonSection: React.FC<SeasonSectionProps> = ({
  season,
  seasons,
  competitionsCount,
  matchesCount,
  membersCount,
  selectedSeasonId,
  onSeasonSwitch,
}) => {
  const otherSeasons = useMemo(
    () => seasons.filter((opt) => opt.id !== selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  if (!season) return null;

  const seasonName = String(season.name || 'Seizoen');

  return (
    <div className={s.section}>
      <div className={s.sectionLabel}>Seizoen</div>

      {/* Hero card — active season */}
      <div className={s.heroCard}>
        <div className={s.heroName}>{seasonName}</div>
        <span className={`${s.heroBadge} ${s.badgeActive}`}>Actief</span>
        <div className={s.heroStats}>
          <span>{matchesCount} wedstrijden</span>
          <span>·</span>
          <span>{competitionsCount} competities</span>
          <span>·</span>
          <span>{membersCount} leden</span>
        </div>
      </div>

      {/* Season pills — only if there are other seasons */}
      {otherSeasons.length > 0 && (
        <div className={s.pillsRow}>
          {otherSeasons.slice(0, 5).map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={s.pill}
              aria-label={`Wissel naar seizoen ${opt.name}`}
              onClick={() => onSeasonSwitch(opt)}
            >
              {opt.name}
            </button>
          ))}
          {otherSeasons.length > 5 && (
            <span className={s.pill} style={{ cursor: 'default' }}>
              Alle {seasons.length} seizoenen
            </span>
          )}
        </div>
      )}
    </div>
  );
};
