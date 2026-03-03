/**
 * MatchWizard - Step-by-step mobile wizard for match content creation
 *
 * Flow:
 * 1. Select/confirm match (active match pre-selected)
 * 2. Choose content type (pre / during / post)
 * 3. Set lineup (only for lineup-dependent content types)
 * 4. → Generate via ContentGenerationModal
 *
 * Consistent modal design: back arrow + title + close X in header.
 */
import React from 'react';
import { BottomSheet } from '@django-core/design-system';
import { ChevronRight, Check, Zap, Play, Clock } from 'lucide-react';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import ContentGenerationModal from '../pages/identity/ContentGenerationModal';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, CARD_STYLE, type MatchWizardProps } from './matchWizardTypes';
import { useMatchWizardData } from './useMatchWizardData';
import { MatchWizardLineupStep } from './MatchWizardLineupStep';

export default function MatchWizard({ isOpen, onClose, initialMatchId }: MatchWizardProps) {
  const d = useMatchWizardData(isOpen, onClose, initialMatchId);
  const {
    currentStep, setCurrentStep, selectedMatch,
    lineupSlots, lineupFormation, lineupSaving,
    selectedContentPhase, setSelectedContentPhase,
    isContentModalOpen, selectedTemplate, selectedContentTypeLabel,
    matchesLoading, upcomingMatches,
    handleContentSelect, handleLineupConfirm,
    handleContentModalClose, handleContentGenerated,
    handleBack, handleClose,
    getStepTitle, setSelectedMatch,
  } = d;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="flex-col" style={{ maxHeight: '65vh' }}>

        {/* ── Header: back + title + close ─────────────────────────── */}
        <div className="flex-row gap-12 border-bottom" style={{ padding: '4px 16px 12px', flexShrink: 0 }}>
          {currentStep !== 'match' ? (
            <button onClick={handleBack} aria-label="Terug"
              className="flex-center bg-surface-2 border cursor-pointer text-primary fs-20"
              style={{ width: '40px', height: '40px', borderRadius: '10px', lineHeight: 1 }}>←</button>
          ) : <div style={{ width: '40px' }} />}
          <span className="flex-1 text-center fw-600 fs-16 text-primary">{getStepTitle()}</span>
          <button onClick={handleClose} aria-label="Sluiten"
            className="flex-center bg-surface-2 border cursor-pointer text-primary fs-20"
            style={{ width: '40px', height: '40px', borderRadius: '10px', lineHeight: 1 }}>×</button>
        </div>

        {/* ── Step content (scrollable) ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-16">

          {/* ── Step 1: Match selection ─────────────────────────────── */}
          {currentStep === 'match' && (
            <div className="flex-col gap-10">
              {matchesLoading ? (
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>Laden...</div>
              ) : upcomingMatches.length === 0 ? (
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>Geen komende wedstrijden gevonden</div>
              ) : (
                upcomingMatches.map((match) => {
                  const isSelected = selectedMatch?.id === match.id;
                  const date = new Date(match.start_time);
                  const relativeTime = formatRelativeTime(date, 'nl');
                  const urgency = getDateUrgency(date);

                  return (
                    <button key={match.id}
                      onClick={() => { setSelectedMatch(match); setCurrentStep('content'); }}
                      style={{
                        ...CARD_STYLE,
                        border: isSelected ? '2px solid var(--app-primary)' : CARD_STYLE.border,
                        backgroundColor: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : CARD_STYLE.backgroundColor,
                      }}>
                      <div className="rounded-12 flex-center fw-700 fs-14" style={{
                        width: '44px', height: '44px', flexShrink: 0,
                        backgroundColor: urgency === 'urgent' ? 'var(--color-error)' : urgency === 'soon' ? 'var(--color-warning)' : 'var(--app-primary)',
                        color: 'white',
                      }}>{date.getDate()}</div>
                      <div className="flex-1-min">
                        <div className="fw-600 text-primary truncate" style={{ fontSize: '15px' }}>{match.title}</div>
                        <div className="fs-13" style={{ color: 'var(--app-text-muted)' }}>
                          {relativeTime} &middot; {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {isSelected
                        ? <Check size={22} style={{ color: 'var(--app-primary)', flexShrink: 0 }} />
                        : <ChevronRight size={20} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* ── Step 2: Content type selection ─────────────────────── */}
          {currentStep === 'content' && (
            <div className="flex-col gap-16">
              {/* Phase tabs */}
              <div className="gap-4 bg-surface-2" style={{ display: 'flex', padding: '3px', borderRadius: '10px' }}>
                {([
                  { key: 'pre', label: 'Voor', icon: Clock },
                  { key: 'during', label: 'Tijdens', icon: Play },
                  { key: 'post', label: 'Na', icon: Check },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button key={key}
                    onClick={() => setSelectedContentPhase(key)}
                    className="flex-1 flex-center gap-6 rounded-8 border-none fs-13 cursor-pointer"
                    style={{
                      padding: '10px 8px',
                      backgroundColor: selectedContentPhase === key ? 'var(--app-primary)' : 'transparent',
                      color: selectedContentPhase === key ? 'white' : 'var(--app-text-muted)',
                      fontWeight: selectedContentPhase === key ? 600 : 400,
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              {/* Content type cards */}
              <div className="flex-col gap-8">
                {CONTENT_TYPES[selectedContentPhase].map((content) => {
                  const Icon = content.icon;
                  const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);
                  return (
                    <button key={content.key}
                      onClick={() => handleContentSelect(content.key, content.label, content.subtype, content.templateType)}
                      style={CARD_STYLE}>
                      <div className="flex-center rounded-12" style={{
                        width: '44px', height: '44px', flexShrink: 0,
                        backgroundColor: 'var(--app-primary-light, rgba(59,142,165,0.08))',
                      }}>
                        <Icon size={22} style={{ color: 'var(--app-primary)' }} />
                      </div>
                      <div className="flex-1-min">
                        <div className="fw-600 text-primary" style={{ fontSize: '15px' }}>{content.label}</div>
                        <div className="fs-13" style={{ color: 'var(--app-text-muted)' }}>
                          {content.description}{needsLineup && ' (opstelling nodig)'}
                        </div>
                      </div>
                      <ChevronRight size={20} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Lineup ─────────────────────────────────────── */}
          {currentStep === 'lineup' && <MatchWizardLineupStep d={d} />}
        </div>

        {/* ── Bottom action bar ─────────────────────────────────────── */}
        {currentStep === 'match' && selectedMatch && (
          <div className="border-top" style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }}>
            <button onClick={() => setCurrentStep('content')}
              className="w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8"
              style={{ padding: '14px', backgroundColor: 'var(--app-primary)', color: 'white', fontSize: '15px' }}>
              Verder<ChevronRight size={18} />
            </button>
          </div>
        )}
        {currentStep === 'lineup' && (
          <div className="border-top" style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }}>
            <button onClick={handleLineupConfirm} disabled={lineupSaving}
              className="w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8"
              style={{ padding: '14px', backgroundColor: 'var(--app-primary)', color: 'white', fontSize: '15px', opacity: lineupSaving ? 0.7 : 1 }}>
              <Zap size={18} />{lineupSaving ? 'Opslaan...' : 'Genereer content'}
            </button>
          </div>
        )}
      </div>

      {/* Inline Content Generation Modal */}
      {selectedMatch && isContentModalOpen && (
        <ContentGenerationModal
          isOpen={isContentModalOpen}
          onClose={handleContentModalClose}
          onGenerated={handleContentGenerated}
          matchData={{
            id: String(selectedMatch.id),
            title: selectedMatch.title,
            project: (selectedMatch as any).project,
            opponent_project: (selectedMatch as any).opponent_project,
            participations: (selectedMatch as any).participations,
            start_time: selectedMatch.start_time,
            location: (selectedMatch as any).location,
            metadata: {
              formation: lineupFormation,
              lineup: { formation: lineupFormation, goalkeeper: lineupSlots.goalkeeper, player: lineupSlots.player },
              ...(selectedMatch as any).metadata,
            },
          }}
          organisationSport={(selectedMatch as any).project?.sport}
          organisationId={(selectedMatch as any).project?.organisation_id || (selectedMatch as any).organisation?.id}
          template={selectedTemplate}
          contentTypeLabel={selectedContentTypeLabel}
        />
      )}
    </BottomSheet>
  );
}
