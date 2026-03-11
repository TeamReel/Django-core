/**
 * ConfirmStepGoal — Goal Celebration section with score stepper + scorer dropdown.
 * Extracted from ConfirmStep to keep each file under 500 lines.
 */
import React from 'react';
import type { Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';
import styles from './ConfirmStepGoal.module.css';

const CELEB_LABELS: Record<string, string> = {
  arms_wide: 'Armen wijd',
  fist_pump: 'Vuist omhoog',
  point_to_sky: 'Wijs naar hemel',
  slide: 'Knieën slide',
};

interface ConfirmStepGoalProps {
  seasonSquad: Record<string, Participation[]>;
  goalScoreHome: number;
  setGoalScoreHome: (n: number) => void;
  goalScoreAway: number;
  setGoalScoreAway: (n: number) => void;
  goalScorerId: string | null;
  setGoalScorerId: (id: string | null) => void;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  selectedBackgroundUrl: string | null;
  setSelectedBackgroundUrl: (url: string | null) => void;
  appBackgrounds: BackgroundItem[];
}

export function ConfirmStepGoal({
  seasonSquad,
  goalScoreHome, setGoalScoreHome,
  goalScoreAway, setGoalScoreAway,
  goalScorerId, setGoalScorerId,
  homeTeamName, awayTeamName,
  homeLogoUrl, awayLogoUrl,
  selectedBackgroundUrl, setSelectedBackgroundUrl,
  appBackgrounds,
}: ConfirmStepGoalProps) {
  // Build unique members + scorer options
  const allMembers = [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])];
  const seenUserIds = new Set<string>();
  const uniqueMembers = allMembers.filter((p) => {
    const userId = (p.user || p.member)?.id;
    if (!userId || seenUserIds.has(userId)) return false;
    seenUserIds.add(userId);
    return true;
  });

  const scorerOptions = buildScorerOptions(uniqueMembers);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <h4 className={styles.headerTitle}>
          Doelpunt Details
        </h4>
      </div>

      <div className="p-16 flex-col gap-16">
        {/* Score stepper */}
        <div>
          <label className={`block fs-12 fw-600 ${styles.label}`}>Nieuwe Stand</label>
          <div className="flex-center gap-16">
            <ScoreColumn
              teamName={homeTeamName}
              logoUrl={homeLogoUrl}
              score={goalScoreHome}
              onDecrement={() => setGoalScoreHome(Math.max(0, goalScoreHome - 1))}
              onIncrement={() => setGoalScoreHome(Math.min(99, goalScoreHome + 1))}
            />
            <span className={styles.scoreSeparator}>-</span>
            <ScoreColumn
              teamName={awayTeamName}
              logoUrl={awayLogoUrl}
              score={goalScoreAway}
              onDecrement={() => setGoalScoreAway(Math.max(0, goalScoreAway - 1))}
              onIncrement={() => setGoalScoreAway(Math.min(99, goalScoreAway + 1))}
            />
          </div>
        </div>

        {/* Goal scorer dropdown */}
        <div>
          <label className={`block fs-12 fw-600 ${styles.label}`}>Doelpuntenmaker</label>
          <select
            className={styles.select}
            value={goalScorerId || ''}
            onChange={(e) => setGoalScorerId(e.target.value || null)}
          >
            <option value="">-- Selecteer speler --</option>
            {scorerOptions.map(({ member, name, hasCelebration, celebType, celebLabel }) => {
              const suffix = hasCelebration ? ` \u2014 ${celebLabel}` : ' (geen celebration video)';
              return (
                <option
                  className={styles.option}
                  key={`${member.id}_${celebType}`}
                  value={member.id}
                  disabled={!hasCelebration}
                  data-available={String(hasCelebration)}
                >
                  {name}{suffix}
                </option>
              );
            })}
          </select>
          {!goalScorerId && (
            <div className={`fs-11 ${styles.errorHint}`}>
              Selecteer een doelpuntenmaker
            </div>
          )}
        </div>

        {/* Background */}
        {appBackgrounds.length > 0 && (
          <BackgroundSelector
            selectedUrl={selectedBackgroundUrl}
            onSelect={setSelectedBackgroundUrl}
            backgrounds={appBackgrounds}
            columnMin="80px"
          />
        )}
      </div>
    </div>
  );
}

/* ─── Score column (team logo + name + stepper) ─── */

interface ScoreColumnProps {
  teamName: string;
  logoUrl?: string | null;
  score: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

function ScoreColumn({ teamName, logoUrl, score, onDecrement, onIncrement }: ScoreColumnProps) {
  return (
    <div className={`text-center ${styles.scoreColumn}`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className={styles.teamLogo} />
      ) : null}
      <div className={styles.teamName}>
        {teamName}
      </div>
      <div className={styles.stepperRow}>
        <button type="button" onClick={onDecrement} className={styles.stepperBtn} data-side="left">{'\u2212'}</button>
        <div className={styles.scoreDisplay}>{score}</div>
        <button type="button" onClick={onIncrement} className={styles.stepperBtn} data-side="right">+</button>
      </div>
    </div>
  );
}

/* ─── Build scorer options with celebration types ─── */

interface ScorerOption {
  member: Participation;
  name: string;
  celebType: string;
  celebLabel: string;
  hasCelebration: boolean;
}

function buildScorerOptions(uniqueMembers: Participation[]): ScorerOption[] {
  const options: ScorerOption[] = [];

  for (const member of uniqueMembers) {
    const user = member.user || member.member;
    const name = user
      ? (('name' in user && user.name) || ('user_name' in user && user.user_name) || `${user.first_name || ''} ${user.last_name || ''}`.trim())
      : 'Unknown';

    const tr = ((member.metadata as Record<string, unknown>)?.teamreel_assets || {}) as Record<string, any>;
    const videos = tr?.videos || {};
    const celebrationObj = videos?.celebration || {};
    const celebrationKeys = Object.keys(celebrationObj).filter(k => {
      const val = celebrationObj[k];
      return val && (typeof val === 'string' || (typeof val === 'object' && Object.keys(val).length > 0));
    });

    const celebTypes = [...new Set(celebrationKeys.map(k => {
      const parts = k.split('_');
      return parts.length > 1 ? parts.slice(1).join('_') : k;
    }))];

    if (celebTypes.length > 0) {
      for (const ct of celebTypes) {
        options.push({ member, name, celebType: ct, celebLabel: CELEB_LABELS[ct] || ct, hasCelebration: true });
      }
    } else {
      options.push({ member, name, celebType: '', celebLabel: '', hasCelebration: false });
    }
  }

  options.sort((a, b) => {
    if (a.hasCelebration && !b.hasCelebration) return -1;
    if (!a.hasCelebration && b.hasCelebration) return 1;
    const nameComp = a.name.localeCompare(b.name);
    if (nameComp !== 0) return nameComp;
    return a.celebLabel.localeCompare(b.celebLabel);
  });

  return options;
}
