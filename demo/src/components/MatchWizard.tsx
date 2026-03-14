/**
 * MatchWizard - Single unified wizard for match content creation
 *
 * Flow (all steps in ONE BottomSheet):
 * 1. Select/confirm match     → MatchStep
 * 2. Choose content type      → ContentStep
 * 3. Set lineup               → MatchWizardLineupStep
 * 4. Options (bg/style/score) → OptionsStep
 * 5. Review & confirm         → ReviewStep
 * 6. Generating (progress)    → GeneratingStep
 * 7. Result                   → VideoQueuedStep / SuccessStep / ErrorStep
 */
import React from 'react';
import { BottomSheet } from '@django-core/design-system';
import { ChevronRight } from 'lucide-react';

// Step components
import { MatchStep } from './MatchStep';
import { ContentStep } from './ContentStep';
import { OptionsStep } from './OptionsStep';
import { ReviewStep } from './ReviewStep';
import { MatchWizardLineupStep } from './MatchWizardLineupStep';

// Steps reused from ContentGenerationModal
import { GeneratingStep } from '../pages/identity/ContentGenerationModal/GeneratingStep';
import { VideoQueuedStep } from '../pages/identity/ContentGenerationModal/VideoQueuedStep';
import { SuccessStep } from '../pages/identity/ContentGenerationModal/SuccessStep';
import ErrorStep from '../pages/identity/ContentGenerationModal/ErrorStep';

import { type MatchWizardProps } from './matchWizardTypes';
import { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizard.module.css';

export default function MatchWizard({ isOpen, onClose, initialMatchId }: MatchWizardProps) {
  const d = useMatchWizardData(isOpen, onClose, initialMatchId);
  const {
    currentStep, setCurrentStep, selectedMatch,
    lineupFormation, setLineupFormation, lineupSaving,
    selectedContentPhase, setSelectedContentPhase,
    selectedTemplate, selectedContentTypeLabel,
    selectedType, isLineupFlow,
    options, seasonSquad, videoPoll,
    matchesLoading, upcomingMatches,
    pendingContent,
    progress, generationError, generatedOutput,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    homeTeamName, awayTeamName, matchDataForApi,
    handleContentSelect, handleLineupConfirm, handleOptionsConfirm, handleReviewConfirm,
    handleGenerate, handleSaveAsAsset, handleSaveAllAsAssets, handleSaveVariantByIndex,
    handleBack, handleClose,
    getStepTitle, setSelectedMatch, filledPositions, totalPositions,
    matchesError, templatesError, saveError,
    retryTemplates,
  } = d;

  const showBackButton = !['match', 'generating', 'video_queued', 'success'].includes(currentStep);

  const wizardFooter = currentStep === 'match' && selectedMatch ? (
    <button onClick={() => setCurrentStep('content')}
      className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}>
      Verder<ChevronRight size={18} />
    </button>
  ) : null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      bodyClassName={styles.sheetBody}
      footer={wizardFooter || undefined}
      showDragHandle={false}
    >
      <div className={`flex-col ${styles.root}`}>

        {/* ── Header: back + title + close ─────────────────────────── */}
        <div className={`flex-row gap-12 border-bottom ${styles.header}`}>
          {showBackButton ? (
            <button onClick={handleBack} aria-label="Terug"
              className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}>←</button>
          ) : <div className={styles.headerSpacer} />}
          <span className="flex-1 text-center fw-600 fs-16 text-primary">{getStepTitle()}</span>
          <button onClick={handleClose} aria-label="Sluiten"
            className={`flex-center bg-surface-2 border cursor-pointer text-primary fs-20 rounded-10 ${styles.headerBtn}`}>×</button>
        </div>

        {/* ── Step content (scrollable) ────────────────────────────── */}
        <div className={styles.scrollArea}>

          {currentStep === 'match' && (
            <MatchStep
              matchesError={matchesError}
              matchesLoading={matchesLoading}
              upcomingMatches={upcomingMatches}
              selectedMatch={selectedMatch}
              setSelectedMatch={setSelectedMatch}
              setCurrentStep={setCurrentStep}
            />
          )}

          {currentStep === 'content' && (
            <ContentStep
              selectedContentPhase={selectedContentPhase}
              setSelectedContentPhase={setSelectedContentPhase}
              templatesError={templatesError}
              retryTemplates={retryTemplates}
              handleContentSelect={handleContentSelect}
            />
          )}

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

          {currentStep === 'options' && (
            <OptionsStep
              pendingContent={pendingContent}
              selectedTemplate={selectedTemplate}
              selectedType={selectedType}
              selectedContentTypeLabel={selectedContentTypeLabel}
              isLineupFlow={isLineupFlow}
              options={options}
              seasonSquad={seasonSquad}
              lineupFormation={lineupFormation}
              setLineupFormation={setLineupFormation}
              handleOptionsConfirm={handleOptionsConfirm}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              matchDataForApi={matchDataForApi}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              pendingContent={pendingContent}
              selectedMatch={selectedMatch}
              lineupFormation={lineupFormation}
              filledPositions={filledPositions}
              totalPositions={totalPositions}
              saveError={saveError}
              handleReviewConfirm={handleReviewConfirm}
            />
          )}

          {currentStep === 'generating' && (
            <GeneratingStep
              progress={progress}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              videoJobStatus={videoPoll.videoJobStatus || ''}
              videoJobProgressRaw={videoPoll.videoJobProgressRaw}
              videoJobMeta={videoPoll.videoJobMeta}
              videoJobId={videoPoll.videoJobId}
              onClose={handleClose}
            />
          )}

          {currentStep === 'video_queued' && (
            <VideoQueuedStep
              videoOutputUrl={videoPoll.videoOutputUrl}
              videoJobStatus={videoPoll.videoJobStatus || ''}
              videoJobError={videoPoll.videoJobError}
              videoJobProgressRaw={videoPoll.videoJobProgressRaw}
              videoThumbnailUrl={videoPoll.videoThumbnailUrl}
              videoApprovalStatus={videoPoll.videoApprovalStatus}
              videoApprovalError={videoPoll.videoApprovalError}
              handleVideoApproval={videoPoll.handleVideoApproval}
              selectedType={selectedType}
              onClose={handleClose}
            />
          )}

          {currentStep === 'success' && (
            <SuccessStep
              generatedOutput={generatedOutput}
              generatedVariants={generatedVariants}
              selectedVariantIndex={selectedVariantIndex}
              setSelectedVariantIndex={setSelectedVariantIndex}
              savingAsset={savingAsset}
              saveSuccess={saveSuccess}
              savedVariantIndices={savedVariantIndices}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              matchData={matchDataForApi}
              handleSaveAsAsset={handleSaveAsAsset}
              handleSaveAllAsAssets={handleSaveAllAsAssets}
              handleSaveVariantByIndex={handleSaveVariantByIndex}
              handleGenerateInternal={handleGenerate}
              onClose={handleClose}
            />
          )}

          {currentStep === 'error' && (
            <ErrorStep
              error={generationError}
              onRetry={() => {
                const isLineupType = pendingContent?.subtype === 'lineup' || pendingContent?.subtype === 'lineup_flyer';
                const isLineupError = generationError?.includes('Opstelling niet compleet') || generationError?.includes('not enough');
                setCurrentStep(isLineupType && isLineupError ? 'lineup' : 'review');
              }}
              onClose={handleClose}
            />
          )}

        </div>
      </div>
    </BottomSheet>
  );
}
