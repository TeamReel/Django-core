/**
 * ConfirmStep — Orchestrator for confirm/configure step in ContentGenerationModal.
 * Delegates subtype-specific sections to ConfirmStepFlyer/ConfirmStepGoal;
 * keeps Match Summary inline (small enough).
 * Uses shared BackgroundSelector to eliminate 3× copy-paste.
 */
import React from 'react';
import type { ContentTemplate, Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';
import { ConfirmStepFlyer } from './ConfirmStepFlyer';
import { ConfirmStepGoal } from './ConfirmStepGoal';

interface ConfirmStepProps {
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  contentTypeLabel?: string;
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string };
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
  return (
    <div className="flex-col flex-center" style={{ padding: '32px 16px' }}>
      {/* Icon */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '16px', marginBottom: '20px',
        backgroundColor: 'var(--app-primary-light, rgba(59,142,165,0.1))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--app-primary, #3B8EA5)', fontSize: '28px', fontWeight: 700,
      }}>
        {(selectedType?.label || contentTypeLabel || '?').charAt(0).toUpperCase()}
      </div>

      {/* Title */}
      <h3 className="fs-20 fw-700 mb-8" style={{ color: 'var(--app-text, #111)' }}>
        {selectedType?.subtype === 'goal' ? 'Doelpunt Viering Video'
          : selectedType?.subtype === 'flyer' ? 'Match Flyer'
          : selectedType?.subtype === 'match_intro' ? 'Wedstrijd Intro Video'
          : 'Klaar om te genereren'}
      </h3>

      {/* Description */}
      <p className="fs-14 text-center mb-24" style={{ color: 'var(--app-text-muted, #6b7280)', maxWidth: '400px' }}>
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
        <div style={{
          width: '100%', maxWidth: 480, padding: '14px 18px', borderRadius: 10,
          border: '1px solid var(--app-border, #e5e7eb)',
          background: 'var(--app-surface-2, #f3f4f6)',
        }}>
          <div className="fs-13" style={{ color: 'var(--app-text, #111)' }}>
            <strong>Wedstrijd:</strong> {matchData.title || `${matchData.project?.name} vs ${matchData.opponent_project?.name || 'Opponent'}`}
          </div>
          {matchData.start_time && (
            <div className="fs-13 mt-4" style={{ color: 'var(--app-text-muted, #6b7280)' }}>
              {new Date(matchData.start_time).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          )}
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
        <div style={{
          width: '100%', maxWidth: 480, marginTop: 20,
          border: '1px solid var(--app-border, #e5e7eb)',
          borderRadius: 12, overflow: 'hidden',
          background: 'var(--app-surface, white)',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--app-border, #e5e7eb)',
            background: 'var(--app-surface-2, #f3f4f6)',
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--app-text, #111)' }}>
              Wedstrijd Samenvatting
            </h4>
          </div>

          <div className="p-16 flex-col gap-16">
            {/* Score input */}
            <div>
              <label className="block fs-11 fw-600 mb-8" style={{
                color: 'var(--app-text-muted, #6b7280)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Eindstand</label>
              <div className="flex-center gap-12">
                <div className="text-center">
                  <div style={{ fontSize: 11, color: 'var(--app-text-muted, #6b7280)', marginBottom: 4 }}>{homeTeamName}</div>
                  <input type="number" min={0} max={99} value={summaryScoreHome}
                    onChange={(e) => setSummaryScoreHome(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      width: 60, padding: '10px', fontSize: 28, fontWeight: 700, textAlign: 'center', borderRadius: 8,
                      border: '1px solid var(--app-border, #e5e7eb)',
                      background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
                    }} />
                </div>
                <span className="fw-700" style={{ fontSize: 28, color: 'var(--app-text, #111)' }}>-</span>
                <div className="text-center">
                  <div style={{ fontSize: 11, color: 'var(--app-text-muted, #6b7280)', marginBottom: 4 }}>{awayTeamName}</div>
                  <input type="number" min={0} max={99} value={summaryScoreAway}
                    onChange={(e) => setSummaryScoreAway(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      width: 60, padding: '10px', fontSize: 28, fontWeight: 700, textAlign: 'center', borderRadius: 8,
                      border: '1px solid var(--app-border, #e5e7eb)',
                      background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
                    }} />
                </div>
              </div>
            </div>

            {/* Goal scorers textarea */}
            <div>
              <label className="block fs-11 fw-600" style={{
                marginBottom: 6, color: 'var(--app-text-muted, #6b7280)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Doelpuntenmakers (1 per regel)</label>
              <textarea
                value={summaryGoalScorers}
                onChange={(e) => setSummaryGoalScorers(e.target.value)}
                placeholder={"De Jong 23'\nBerghuis 67'\nKluivert 89'"}
                rows={5}
                style={{
                  width: '100%', padding: '10px', fontSize: 13, borderRadius: 8, resize: 'vertical',
                  border: '1px solid var(--app-border, #e5e7eb)',
                  background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
                  fontFamily: 'inherit',
                }}
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
