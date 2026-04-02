/**
 * ConfirmStep — Orchestrator for confirm/configure step in ContentGenerationModal.
 * Delegates subtype-specific sections to ConfirmStepFlyer/ConfirmStepGoal;
 * keeps Match Summary inline (small enough).
 * Uses shared BackgroundSelector to eliminate 3× copy-paste.
 */
import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ContentTemplate, Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';
import { ConfirmStepFlyer } from './ConfirmStepFlyer';
import { ConfirmStepGoal } from './ConfirmStepGoal';
import styles from './ConfirmStep.module.css';

interface ConfirmStepProps {
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  contentTypeLabel?: string;
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string } | null;
    participations?: unknown[];
    start_time?: string;
  } | null;
  seasonSquad: Record<string, Participation[]>;
  // Match flyer
  matchFlyerVariant: 'modern' | 'action' | 'stadium';
  setMatchFlyerVariant: (v: 'modern' | 'action' | 'stadium') => void;
  flyerMemberId: string | null;
  setFlyerMemberId: (id: string | null) => void;
  flyerActionStyle: string;
  setFlyerActionStyle: (style: string) => void;
  flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
  setFlyerPhotoLayout: (layout: 'single' | 'triple' | 'hero_duo') => void;
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  setFlyerPhotoSlots: (slots: Array<{ member_id: string | null; style_variant: string }>) => void;
  // Goal celebration
  goalScoreHome: number;
  setGoalScoreHome: (n: number) => void;
  goalScoreAway: number;
  setGoalScoreAway: (n: number) => void;
  goalScorerId: string | null;
  setGoalScorerId: (id: string | null) => void;
  // Match summary
  summaryScoreHome: number;
  setSummaryScoreHome: (n: number) => void;
  summaryScoreAway: number;
  setSummaryScoreAway: (n: number) => void;
  summaryGoalScorers: string;
  setSummaryGoalScorers: (s: string) => void;
  // Background
  selectedBackgroundUrl: string | null;
  setSelectedBackgroundUrl: (url: string | null) => void;
  appBackgrounds: BackgroundItem[];
  // Team names and logos
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
}

export function ConfirmStep({
  selectedType, selectedTemplate, contentTypeLabel, matchData, seasonSquad,
  matchFlyerVariant, setMatchFlyerVariant,
  flyerMemberId, setFlyerMemberId,
  flyerActionStyle, setFlyerActionStyle,
  flyerPhotoLayout, setFlyerPhotoLayout,
  flyerPhotoSlots, setFlyerPhotoSlots,
  goalScoreHome, setGoalScoreHome, goalScoreAway, setGoalScoreAway,
  goalScorerId, setGoalScorerId,
  summaryScoreHome, setSummaryScoreHome, summaryScoreAway, setSummaryScoreAway,
  summaryGoalScorers, setSummaryGoalScorers,
  selectedBackgroundUrl, setSelectedBackgroundUrl, appBackgrounds,
  homeTeamName, awayTeamName, homeLogoUrl, awayLogoUrl,
}: ConfirmStepProps) {
  // Count participants with missing kit asset warnings
  const kitWarningCount = useMemo(() => {
    const participations = matchData?.participations;
    if (!participations) return 0;
    return participations.filter((p) => {
      const rec = p as Record<string, unknown> | null;
      const data = rec?.data as Record<string, unknown> | undefined;
      return !!data?.asset_warning;
    }).length;
  }, [matchData?.participations]);

  const isLineupSubtype = selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer';

  return (
    <div className="flex-col flex-center py-32 px-16">
      {/* Icon */}
      <div className={`flex-center rounded-12 mb-20 fs-24 fw-700 ${styles.iconContainer}`}>
        {(selectedType?.label || contentTypeLabel || '?').charAt(0).toUpperCase()}
      </div>

      {/* Title */}
      <h3 className="fs-20 fw-700 mb-8 text-primary">
        {selectedType?.subtype === 'goal' ? 'Doelpunt Viering Video'
          : selectedType?.subtype === 'flyer' ? 'Match Flyer'
          : selectedType?.subtype === 'match_intro' ? 'Wedstrijd Intro Video'
          : 'Klaar om te genereren'}
      </h3>

      {/* Description */}
      <p className="fs-14 text-center mb-24 text-muted max-w-400">
        {selectedType?.subtype === 'goal'
          ? 'Vul de doelpuntgegevens in en kies een speler.'
          : selectedType?.subtype === 'flyer'
            ? 'Kies een ontwerpstijl en genereer je match flyer.'
            : selectedType?.subtype === 'match_intro'
              ? 'Er wordt een 6 seconden intro video gegenereerd met header, logo\'s en wedstrijdinfo.'
              : <>Je gaat een <strong>{selectedType?.label || selectedTemplate?.name}</strong> maken.</>
        }
      </p>

      {/* Match info card */}
      {matchData && (
        <div className={`w-full max-w-480 rounded-8 border bg-surface-2 ${styles.matchInfoCard}`}>
          <div className="fs-13 text-primary">
            <strong>Wedstrijd:</strong> {matchData.title || `${matchData.project?.name} vs ${matchData.opponent_project?.name || 'Opponent'}`}
          </div>
          {matchData.start_time && (
            <div className="fs-13 mt-4 text-muted">
              {new Date(matchData.start_time).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          )}
        </div>
      )}

      {/* Kit asset warning for lineup content types */}
      {isLineupSubtype && kitWarningCount > 0 && (
        <div className="w-full max-w-480 mt-12 p-12 rounded-8 border flex-row gap-8 items-center" style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg, rgba(255,171,0,0.08))' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span className="fs-13 text-primary">
            {kitWarningCount} {kitWarningCount === 1 ? 'speler mist' : 'spelers missen'} de juiste tenue-assets. De video kan placeholder silhouetten bevatten.
          </span>
        </div>
      )}

      {/* === Match Flyer === */}
      {selectedType?.subtype === 'flyer' && (
        <ConfirmStepFlyer
          seasonSquad={seasonSquad}
          matchFlyerVariant={matchFlyerVariant} setMatchFlyerVariant={setMatchFlyerVariant}
          flyerMemberId={flyerMemberId} setFlyerMemberId={setFlyerMemberId}
          flyerActionStyle={flyerActionStyle} setFlyerActionStyle={setFlyerActionStyle}
          flyerPhotoLayout={flyerPhotoLayout} setFlyerPhotoLayout={setFlyerPhotoLayout}
          flyerPhotoSlots={flyerPhotoSlots} setFlyerPhotoSlots={setFlyerPhotoSlots}
          selectedBackgroundUrl={selectedBackgroundUrl} setSelectedBackgroundUrl={setSelectedBackgroundUrl}
          appBackgrounds={appBackgrounds}
        />
      )}

      {/* === Match Summary (inline — ~100 lines) === */}
      {selectedType?.subtype === 'match_summary' && (
        <div className="w-full max-w-480 mt-16 border rounded-12 overflow-hidden bg-surface">
          <div className={`border-bottom bg-surface-2 ${styles.sectionHeader}`}>
            <h4 className="fs-14 fw-700 m-0 text-primary">
              Wedstrijd Samenvatting
            </h4>
          </div>

          <div className="p-16 flex-col gap-16">
            {/* Score input */}
            <div>
              <label className="form-label-upper mb-8">Eindstand</label>
              <div className="flex-center gap-12">
                <div className="text-center">
                  <div className="fs-11 text-muted mb-4">{homeTeamName}</div>
                  <input type="number" min={0} max={99} value={summaryScoreHome}
                    onChange={(e) => setSummaryScoreHome(Math.max(0, parseInt(e.target.value) || 0))}
                    className={styles.scoreInput} />
                </div>
                <span className="fw-700 fs-24 text-primary">-</span>
                <div className="text-center">
                  <div className="fs-11 text-muted mb-4">{awayTeamName}</div>
                  <input type="number" min={0} max={99} value={summaryScoreAway}
                    onChange={(e) => setSummaryScoreAway(Math.max(0, parseInt(e.target.value) || 0))}
                    className={styles.scoreInput} />
                </div>
              </div>
            </div>

            {/* Goal scorers textarea */}
            <div>
              <label className="form-label-upper">Doelpuntenmakers (1 per regel)</label>
              <textarea
                value={summaryGoalScorers}
                onChange={(e) => setSummaryGoalScorers(e.target.value)}
                placeholder={"De Jong 23'\nBerghuis 67'\nKluivert 89'"}
                rows={5}
                className="form-textarea"
              />
            </div>

            {/* Background */}
            {appBackgrounds.length > 0 && (
              <BackgroundSelector
                selectedUrl={selectedBackgroundUrl}
                onSelect={setSelectedBackgroundUrl}
                backgrounds={appBackgrounds}
              />
            )}
          </div>
        </div>
      )}

      {/* === Goal Celebration === */}
      {selectedType?.subtype === 'goal' && (
        <ConfirmStepGoal
          seasonSquad={seasonSquad}
          goalScoreHome={goalScoreHome} setGoalScoreHome={setGoalScoreHome}
          goalScoreAway={goalScoreAway} setGoalScoreAway={setGoalScoreAway}
          goalScorerId={goalScorerId} setGoalScorerId={setGoalScorerId}
          homeTeamName={homeTeamName} awayTeamName={awayTeamName}
          homeLogoUrl={homeLogoUrl} awayLogoUrl={awayLogoUrl}
          selectedBackgroundUrl={selectedBackgroundUrl} setSelectedBackgroundUrl={setSelectedBackgroundUrl}
          appBackgrounds={appBackgrounds}
        />
      )}
    </div>
  );
}
