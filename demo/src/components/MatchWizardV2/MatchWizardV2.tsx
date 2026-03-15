/**
 * MatchWizardV2 – Main orchestrator
 *
 * Combines the generic Wizard system (WizardProvider + WizardShell)
 * with the domain-specific MatchWizardProvider to create a clean,
 * modular match content creation wizard.
 *
 * Flow: match → content → lineup → options → review → generating → result
 */
import React, { useEffect } from 'react';

import { WizardProvider, WizardStep, WizardShell, type WizardStepConfig } from '../Wizard';
import { MatchWizardProvider, useMatchWizard } from './MatchWizardContext';
import {
  MatchSelectStep,
  ContentTypeStep,
  LineupStep,
  OptionsStep,
  ReviewStep,
} from './steps';
import { GeneratingStep } from '@/pages/identity/ContentGenerationModal/GeneratingStep';
import { VideoQueuedStep } from '@/pages/identity/ContentGenerationModal/VideoQueuedStep';
import { SuccessStep } from '@/pages/identity/ContentGenerationModal/SuccessStep';
import ErrorStep from '@/pages/identity/ContentGenerationModal/ErrorStep';
import { useMatchWizardGeneration } from './useMatchWizardGeneration';

// ─── Wizard step configuration ────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'match', title: 'Selecteer wedstrijd', showBack: false },
  { id: 'content', title: 'Kies content' },
  { id: 'lineup', title: 'Opstelling' },
  { id: 'options', title: 'Opties' },
  { id: 'review', title: 'Bevestig generatie' },
  { id: 'generating', title: 'Bezig met genereren...', showBack: false, hidden: true },
  { id: 'video_queued', title: 'In de wachtrij', showBack: false, hidden: true },
  { id: 'success', title: 'Content klaar', showBack: false, hidden: true },
  { id: 'error', title: 'Fout opgetreden', hidden: true },
];

// ─── Props ────────────────────────────────────────────────

export interface MatchWizardV2Props {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

// ─── Inner Component (needs both contexts) ────────────────

export function MatchWizardInner({ isOpen, initialMatchId }: { isOpen: boolean; initialMatchId?: string }) {
  const mw = useMatchWizard();
  const gen = useMatchWizardGeneration(isOpen);

  // ── Auto-select match from initialMatchId ───────────────
  useEffect(() => {
    if (isOpen && !mw.selectedMatch && initialMatchId && mw.upcomingMatches.length > 0) {
      const found = mw.upcomingMatches.find(
        a => a.id === initialMatchId || a.slug === initialMatchId,
      );
      if (found) {
        mw.setSelectedMatch(found);
      }
    }
  }, [isOpen, initialMatchId, mw.upcomingMatches, mw.selectedMatch]);

  // ── Render ──────────────────────────────────────────────

  return (
    <>
      {/* Step 1: Match selection */}
      <WizardStep stepId="match">
        <MatchSelectStep />
      </WizardStep>

      {/* Step 2: Content type */}
      <WizardStep stepId="content">
        <ContentTypeStep />
      </WizardStep>

      {/* Step 3: Lineup */}
      <WizardStep stepId="lineup">
        <LineupStep />
      </WizardStep>

      {/* Step 4: Options */}
      <WizardStep stepId="options">
        <OptionsStep
          selectedType={gen.selectedType}
          selectedTemplate={mw.selectedTemplate}
          matchDataForApi={gen.matchDataForApi}
          seasonSquad={gen.seasonSquad}
          options={gen.options}
        />
      </WizardStep>

      {/* Step 5: Review */}
      <WizardStep stepId="review">
        <ReviewStep onGenerate={gen.handleGenerate} saveError={gen.saveError} />
      </WizardStep>

      {/* Step 6: Generating */}
      <WizardStep stepId="generating">
        <GeneratingStep
          progress={gen.progress}
          selectedType={gen.selectedType}
          selectedTemplate={mw.selectedTemplate}
          videoJobStatus={gen.videoPoll.videoJobStatus || ''}
          videoJobProgressRaw={gen.videoPoll.videoJobProgressRaw}
          videoJobMeta={gen.videoPoll.videoJobMeta}
          videoJobId={gen.videoPoll.videoJobId}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7a: Video Queued */}
      <WizardStep stepId="video_queued">
        <VideoQueuedStep
          videoOutputUrl={gen.videoPoll.videoOutputUrl}
          videoJobStatus={gen.videoPoll.videoJobStatus || ''}
          videoJobError={gen.videoPoll.videoJobError}
          videoJobProgressRaw={gen.videoPoll.videoJobProgressRaw}
          videoThumbnailUrl={gen.videoPoll.videoThumbnailUrl}
          videoApprovalStatus={gen.videoPoll.videoApprovalStatus}
          videoApprovalError={gen.videoPoll.videoApprovalError}
          handleVideoApproval={gen.videoPoll.handleVideoApproval}
          selectedType={gen.selectedType}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7b: Success */}
      <WizardStep stepId="success">
        <SuccessStep
          generatedOutput={gen.generatedOutput}
          generatedVariants={gen.generatedVariants}
          selectedVariantIndex={gen.selectedVariantIndex}
          setSelectedVariantIndex={gen.setSelectedVariantIndex}
          savingAsset={gen.savingAsset}
          saveSuccess={gen.saveSuccess}
          savedVariantIndices={gen.savedVariantIndices}
          selectedType={gen.selectedType}
          selectedTemplate={mw.selectedTemplate}
          matchData={gen.matchDataForApi}
          handleSaveAsAsset={gen.handleSaveAsAsset}
          handleSaveAllAsAssets={gen.handleSaveAllAsAssets}
          handleSaveVariantByIndex={gen.handleSaveVariantByIndex}
          handleGenerateInternal={gen.handleGenerate}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7c: Error */}
      <WizardStep stepId="error">
        <ErrorStep
          error={gen.generationError}
          onRetry={() => {}}
          onClose={() => {}}
        />
      </WizardStep>
    </>
  );
}

/** Step config — exported for reuse in ContentFlow */
export { WIZARD_STEPS as MATCH_WIZARD_STEPS };

// ─── Main Export ──────────────────────────────────────────

export default function MatchWizardV2({ isOpen, onClose, initialMatchId }: MatchWizardV2Props) {
  return (
    <MatchWizardProvider>
      <WizardProvider
        steps={WIZARD_STEPS}
        initialStepId="match"
        onClose={onClose}
      >
        <WizardShell isOpen={isOpen}>
          <MatchWizardInner isOpen={isOpen} initialMatchId={initialMatchId} />
        </WizardShell>
      </WizardProvider>
    </MatchWizardProvider>
  );
}
