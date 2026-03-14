/**
 * ContentFlow — Unified content-creation flow inside CreateWizard (C3).
 *
 * Combines SmartMatchStep (C1) with the MatchWizardV2 generation steps
 * in a single WizardProvider / WizardShell, eliminating the jarring
 * shell-swap that existed before.
 *
 * Architecture:
 *   CreateWizardProvider (already above us)
 *     MatchWizardProvider (domain state for generation)
 *       WizardProvider (navigation: smartMatch → content → … → error)
 *         WizardShell (one continuous BottomSheet)
 *           SmartMatchStep  (match selection — bridges to MatchWizardContext)
 *           MatchWizardInner (content type → lineup → review → generate → …)
 */
import React, { useCallback, useEffect } from 'react';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../../Wizard';
import { MatchWizardProvider, useMatchWizard, MatchWizardInner } from '../../MatchWizardV2';
import { useMatchesData } from '../../MatchWizardV2/hooks';
import { useCreateWizard } from '../CreateWizardContext';
import { ChooseFlowStep } from '../steps/ChooseFlowStep';
import { SmartMatchStep } from '../steps/SmartMatchStep';
import type { Activity } from '@/hooks/useActivities';

// ─── Step config ──────────────────────────────────────────
// Replaces 'match' from MATCH_WIZARD_STEPS with 'smartMatch' + 'choose'.
// The rest mirrors MatchWizardV2's built-in steps.

const CONTENT_FLOW_STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'smartMatch', title: 'Kies wedstrijd' },
  { id: 'content', title: 'Kies content' },
  { id: 'lineup', title: 'Opstelling' },
  { id: 'options', title: 'Opties' },
  { id: 'review', title: 'Bevestig generatie' },
  { id: 'generating', title: 'Bezig met genereren...', showBack: false },
  { id: 'video_queued', title: 'In de wachtrij', showBack: false },
  { id: 'success', title: 'Content klaar', showBack: false },
  { id: 'error', title: 'Fout opgetreden' },
];

// ─── Props ────────────────────────────────────────────────

export interface ContentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, skip SmartMatchStep and start at content type selection */
  initialMatchId?: string;
}

// ─── Outer wrapper (provides MatchWizardProvider) ─────────

export function ContentFlow({ isOpen, onClose, initialMatchId }: ContentFlowProps) {
  const { resetAll, selectedFlow } = useCreateWizard();

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  // Determine start step:
  //  - initialMatchId known → skip straight to content
  //  - selectedFlow already set (user picked "content") → smartMatch
  //  - otherwise → choose
  const startStep = initialMatchId
    ? 'content'
    : selectedFlow
      ? 'smartMatch'
      : 'choose';

  return (
    <MatchWizardProvider>
      <WizardProvider
        steps={CONTENT_FLOW_STEPS}
        initialStepId={startStep}
        onClose={handleClose}
      >
        <WizardShell isOpen={isOpen} showProgress>
          <ContentFlowInner isOpen={isOpen} initialMatchId={initialMatchId} />
        </WizardShell>
      </WizardProvider>
    </MatchWizardProvider>
  );
}

// ─── Inner component (needs both contexts) ────────────────

function ContentFlowInner({
  isOpen,
  initialMatchId,
}: {
  isOpen: boolean;
  initialMatchId?: string;
}) {
  const mw = useMatchWizard();

  // When initialMatchId is provided, use useMatchesData to fetch and
  // auto‑set the match in MatchWizardContext.
  useMatchesData(isOpen && !!initialMatchId, initialMatchId);

  // Bridge: SmartMatchStep → MatchWizardContext
  const handleMatchSelect = useCallback(
    (match: Activity) => {
      mw.setSelectedMatch(match);
    },
    [mw.setSelectedMatch],
  );

  return (
    <>
      {/* Step 0: Choose flow (shown when user hasn't picked "content" yet) */}
      <WizardStep stepId="choose">
        <ChooseFlowStep />
      </WizardStep>

      {/* Step 1: Smart match selection (C1) */}
      <WizardStep stepId="smartMatch">
        <SmartMatchStep onMatchSelect={handleMatchSelect} />
      </WizardStep>

      {/* Steps 2+: MatchWizardV2 generation steps (content → … → error)
          MatchWizardInner also renders a <WizardStep stepId="match"> but it
          will never activate because 'match' is not in CONTENT_FLOW_STEPS. */}
      <MatchWizardInner isOpen={isOpen} initialMatchId={initialMatchId} />
    </>
  );
}

export default ContentFlow;
