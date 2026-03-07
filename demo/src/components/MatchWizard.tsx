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
import { ChevronRight, Check, Zap, Play, Clock, Calendar, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import SmartEmptyState from './SmartEmptyState';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import ContentGenerationModal from '../pages/identity/ContentGenerationModal';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, type MatchWizardProps, type ContentType } from './matchWizardTypes';
import { useMatchWizardData } from './useMatchWizardData';
import { MatchWizardLineupStep } from './MatchWizardLineupStep';
import styles from './MatchWizard.module.css';

export default function MatchWizard({ isOpen, onClose, initialMatchId }: MatchWizardProps) {
  const d = useMatchWizardData(isOpen, onClose, initialMatchId);
  const {
    currentStep, setCurrentStep, selectedMatch,
    lineupSlots, lineupFormation, lineupSaving,
    selectedContentPhase, setSelectedContentPhase,
    isContentModalOpen, selectedTemplate, selectedContentTypeLabel,
    matchesLoading, upcomingMatches,
    pendingContent,
    handleContentSelect, handleLineupConfirm, handleReviewConfirm,
    handleContentModalClose, handleContentGenerated,
    handleBack, handleClose,
    getStepTitle, setSelectedMatch, filledPositions, totalPositions,
    matchesError, templatesError, squadError, saveError,
    retrySquad, retryTemplates,
  } = d;

  // Wizard footer — rendered via BottomSheet native footer slot so it's
  // always visible outside the scrollable body, guaranteed by the design-system
  // flex layout (no dependency on utility classes inside the body).
  const wizardFooter = (() => {
    if (currentStep === 'match' && selectedMatch) {
      return (
        <button onClick={() => setCurrentStep('content')}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}>
          Verder<ChevronRight size={18} />
        </button>
      );
    }
    if (currentStep === 'review') {
      return null;
    }
    return null;
  })();

  return (
    <>
    <BottomSheet
      isOpen={isOpen && !isContentModalOpen}
      onClose={handleClose}
      bodyClassName={styles.sheetBody}
      footer={wizardFooter || undefined}
      showDragHandle={false}
    >
      <div className={`flex-col ${styles.root}`}>

        {/* ── Header: back + title + close ─────────────────────────── */}
        <div className={`flex-row gap-12 border-bottom ${styles.header}`}>
          {currentStep !== 'match' ? (
            <button onClick={handleBack} aria-label="Terug"
              className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}>←</button>
          ) : <div className={styles.headerSpacer} />}
          <span className="flex-1 text-center fw-600 fs-16 text-primary">{getStepTitle()}</span>
          <button onClick={handleClose} aria-label="Sluiten"
            className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}>×</button>
        </div>

        {/* ── Step content (scrollable) ────────────────────────────── */}
        <div className={styles.scrollArea}>

          {/* ── Step 1: Match selection ─────────────────────────────── */}
          {currentStep === 'match' && (
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
          )}

          {/* ── Step 2: Content type selection ─────────────────────── */}
          {currentStep === 'content' && (
            <div className="flex-col gap-16">
              {/* Phase tabs */}
              <div className={`flex-row gap-4 bg-surface-2 rounded-10 ${styles.phaseTabBar}`}>
                {([
                  { key: 'pre', label: 'Voor', icon: Clock },
                  { key: 'during', label: 'Tijdens', icon: Play },
                  { key: 'post', label: 'Na', icon: Check },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button key={key}
                    onClick={() => setSelectedContentPhase(key)}
                    className={`flex-1 flex-center gap-6 rounded-8 border-none fs-13 cursor-pointer transition ${styles.phaseTab}`}
                    data-active={selectedContentPhase === key}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              {/* Content type cards */}
              {templatesError ? (
                <div className={styles.errorBanner}>
                  <AlertTriangle size={20} className={styles.errorIcon} />
                  <div className="flex-1-min">
                    <div className="fw-600 fs-14 text-primary">Sjablonen laden mislukt</div>
                    <div className="fs-13 text-muted">{templatesError}</div>
                  </div>
                  <button onClick={retryTemplates} className={styles.retryBtn}>
                    <RefreshCw size={16} />Opnieuw
                  </button>
                </div>
              ) : null}
              <div className="flex-col gap-10">
                {CONTENT_TYPES[selectedContentPhase].map((content: ContentType) => {
                  const Icon = content.icon;
                  const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);
                  return (
                    <button key={content.key}
                      onClick={() => handleContentSelect(content.key, content.label, content.subtype, content.templateType)}
                      className={styles.contentCard}>
                      <div className={styles.thumbArea} data-output={content.outputType}>
                        {content.thumbnail ? (
                          <img src={content.thumbnail} alt={content.label} className={styles.thumbImg} />
                        ) : (
                          <Icon size={28} className={styles.thumbIcon} />
                        )}
                        <span className={styles.outputBadge} data-output={content.outputType}>
                          {content.outputType === 'video' ? 'VIDEO' : content.outputType === 'image' ? 'IMAGE' : 'TEXT'}
                        </span>
                      </div>
                      <div className="flex-1-min">
                        <div className="fw-600 text-primary fs-15">{content.label}</div>
                        <div className="fs-12 text-muted" style={{ lineHeight: 1.4 }}>
                          {content.description}{needsLineup && ' · Opstelling nodig'}
                        </div>
                      </div>
                      <ChevronRight size={20} className={styles.iconChevron} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Lineup ─────────────────────────────────────── */}
          {currentStep === 'lineup' && (
            <div className={styles.lineupStepWrap}>
              <MatchWizardLineupStep d={d} />
              <div className={styles.lineupActionsInline}>
                <button
                  onClick={handleLineupConfirm}
                  disabled={lineupSaving}
                  className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
                  data-saving={lineupSaving}
                >
                  {lineupSaving ? 'Opslaan...' : 'Verder'}<ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Confirm ───────────────────────────── */}
          {currentStep === 'review' && pendingContent && selectedMatch && (() => {
            const allTypes = [...CONTENT_TYPES.pre, ...CONTENT_TYPES.during, ...CONTENT_TYPES.post];
            const ct = allTypes.find(c => c.key === pendingContent.key);
            if (!ct) return null;
            const Icon = ct.icon;
            const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(ct.subtype);
            const matchDate = new Date(selectedMatch.start_time);

            return (
              <div className="flex-col gap-16">
                {/* Large preview */}
                <div className={styles.reviewPreview} data-output={ct.outputType}>
                  {ct.thumbnail ? (
                    <img src={ct.thumbnail} alt={ct.label} className={styles.reviewPreviewImg} />
                  ) : (
                    <Icon size={48} className={styles.reviewPreviewIcon} />
                  )}
                  <span className={styles.reviewOutputBadge} data-output={ct.outputType}>
                    {ct.outputType === 'video' ? 'VIDEO' : ct.outputType === 'image' ? 'IMAGE' : 'TEXT'}
                  </span>
                </div>

                {/* Content type label */}
                <div className="text-center">
                  <div className="fw-700 text-primary fs-18">{ct.label}</div>
                  <div className="fs-13 text-muted" style={{ marginTop: 4 }}>{ct.description}</div>
                </div>

                {/* Summary card */}
                <div className={styles.reviewCard}>
                  <div className={styles.reviewRow}>
                    <Calendar size={16} className={styles.reviewRowIcon} />
                    <span className="fw-600 fs-14 text-primary">{selectedMatch.title}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <Clock size={16} className={styles.reviewRowIcon} />
                    <span className="fs-13 text-muted">
                      {matchDate.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })}{' '}
                      om {matchDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {(selectedMatch as any).location && (
                    <div className={styles.reviewRow}>
                      <MapPin size={16} className={styles.reviewRowIcon} />
                      <span className="fs-13 text-muted">{(selectedMatch as any).location}</span>
                    </div>
                  )}
                  {needsLineup && (
                    <div className={styles.reviewRow}>
                      <Check size={16} className={styles.reviewRowIcon} />
                      <span className="fs-13 text-muted">
                        Opstelling: {lineupFormation} &middot; {filledPositions}/{totalPositions} posities ingevuld
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.reviewActionsInline}>
                  {saveError && (
                    <div className={styles.errorBannerCompact}>
                      <AlertTriangle size={16} className={styles.errorIcon} />
                      <span className="fs-13 flex-1">{saveError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleReviewConfirm}
                    className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
                  >
                    <Zap size={18} />Genereer content
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </BottomSheet>

    {/* Content Generation Modal — rendered outside BottomSheet to avoid stacking */}
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
    </>
  );
}
