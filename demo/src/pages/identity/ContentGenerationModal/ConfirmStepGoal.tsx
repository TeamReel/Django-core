/**
 * ConfirmStepGoal — Goal Celebration section with score stepper + scorer dropdown.
 * Extracted from ConfirmStep to keep each file under 500 lines.
 */
import React from 'react';
import type { Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';

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
    <div style={{
      width: '100%', maxWidth: 480, marginTop: 20,
      border: '1px solid var(--app-border, #e5e7eb)',
      borderRadius: 12, overflow: 'hidden',
      background: 'var(--app-surface, white)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--app-border, #e5e7eb)',
        background: 'var(--app-surface-2, #f3f4f6)',
      }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--app-text, #111)' }}>
          Doelpunt Details
        </h4>
      </div>

      <div className="p-16 flex-col gap-16">
        {/* Score stepper */}
        <div>
          <label className="block fs-12 fw-600" style={{
            marginBottom: 10, color: 'var(--app-text-muted, #6b7280)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Nieuwe Stand</label>
          <div className="flex-center gap-16">
            <ScoreColumn
              teamName={homeTeamName}
              logoUrl={homeLogoUrl}
              score={goalScoreHome}
              onDecrement={() => setGoalScoreHome(Math.max(0, goalScoreHome - 1))}
              onIncrement={() => setGoalScoreHome(Math.min(99, goalScoreHome + 1))}
            />
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--app-text-muted, #6b7280)', marginTop: 20 }}>-</span>
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
          <label className="block fs-12 fw-600" style={{
            marginBottom: 10, color: 'var(--app-text-muted, #6b7280)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Doelpuntenmaker</label>
          <select
            value={goalScorerId || ''}
            onChange={(e) => setGoalScorerId(e.target.value || null)}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 8,
              background: 'var(--app-surface, white)', color: 'var(--app-text, #111)',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Selecteer speler --</option>
            {scorerOptions.map(({ member, name, hasCelebration, celebType, celebLabel }) => {
              const suffix = hasCelebration ? ` \u2014 ${celebLabel}` : ' (geen celebration video)';
              return (
                <option
                  key={`${member.id}_${celebType}`}
                  value={member.id}
                  disabled={!hasCelebration}
                  style={{ color: hasCelebration ? 'inherit' : '#999', fontWeight: hasCelebration ? 500 : 400 }}
                >
                  {name}{suffix}
                </option>
              );
            })}
          </select>
          {!goalScorerId && (
            <div className="fs-11" style={{ color: '#e11d48', marginTop: 6 }}>
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
    <div className="text-center" style={{ minWidth: 80 }}>
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 auto 4px' }} />
      ) : null}
      <div style={{
        fontSize: 11, fontWeight: 600, marginBottom: 6,
        color: 'var(--app-text-muted, #6b7280)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
      }}>
        {teamName}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
        <button type="button" onClick={onDecrement} style={{
          width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderRight: 'none',
          borderRadius: '8px 0 0 8px', background: 'var(--app-surface, white)',
          color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{'\u2212'}</button>
        <div style={{
          width: 48, height: 56, fontSize: 28, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderTop: '2px solid var(--app-border, #e5e7eb)',
          borderBottom: '2px solid var(--app-border, #e5e7eb)',
          background: 'var(--app-surface, white)', color: 'var(--app-text, #111)',
        }}>{score}</div>
        <button type="button" onClick={onIncrement} style={{
          width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderLeft: 'none',
          borderRadius: '0 8px 8px 0', background: 'var(--app-surface, white)',
          color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
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

    const tr = (member.metadata as any)?.teamreel_assets || {};
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
