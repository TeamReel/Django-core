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
import React, { useCallback, useEffect, useMemo } from 'react';

import { WizardProvider, WizardShell, WizardStep, useWizard, type WizardStepConfig } from '../../Wizard';
import { MatchWizardProvider, useMatchWizard, MatchWizardInner } from '../../MatchWizardV2';
import { useMatchesData } from '../../MatchWizardV2/hooks';
import { useTemplatesData } from '../../MatchWizardV2/hooks';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES } from '../../MatchWizardV2/types';
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
  { id: 'generating', title: 'Bezig met genereren...', showBack: false, hidden: true },
  { id: 'video_queued', title: 'In de wachtrij', showBack: false, hidden: true },
  { id: 'success', title: 'Content klaar', showBack: false, hidden: true },
  { id: 'error', title: 'Fout opgetreden', hidden: true },
];

/**
 * Compute steps with correct hidden flags based on the content flow path.
 * When launched with a specific subtype from MatchSheet, early steps (choose,
 * smartMatch, content) are always skipped, and lineup/options are conditionally
 * skipped based on the subtype. Marking skipped steps as hidden ensures the
 * progress bar shows accurate "Stap X van Y" counts.
 */
function computeSteps(initialSubtype?: string, initialMatchId?: string): WizardStepConfig[] {
  if (!initialSubtype || !initialMatchId) return CONTENT_FLOW_STEPS;

  const skipIds = new Set(['choose', 'smartMatch', 'content']);
  if (!LINEUP_REQUIRED_SUBTYPES.has(initialSubtype)) {
    skipIds.add('lineup');
  }
  if (!HAS_OPTIONS_SUBTYPES.has(initialSubtype)) {
    skipIds.add('options');
  }

  return CONTENT_FLOW_STEPS.map(step =>
    skipIds.has(step.id) ? { ...step, hidden: true } : step,
  );
}

// ─── Props ────────────────────────────────────────────────

export interface ContentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, skip SmartMatchStep and start at content type selection */
  initialMatchId?: string;
  /** If provided, auto-select this content subtype and skip content type step */
  initialSubtype?: string;
}

// ─── Outer wrapper (provides MatchWizardProvider) ─────────

export function ContentFlow({ isOpen, onClose, initialMatchId, initialSubtype }: ContentFlowProps) {
  const { resetAll, selectedFlow } = useCreateWizard();

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  // Determine start step:
  //  - initialSubtype known (specific content type) → skip straight to lineup/options/review
  //  - initialMatchId known → skip straight to content
  //  - selectedFlow already set (user picked "content") → smartMatch
  //  - otherwise → choose
  const startStep = initialSubtype && initialMatchId
    ? 'content'  // will auto-advance in ContentFlowInner
    : initialMatchId
      ? 'content'
      : selectedFlow
        ? 'smartMatch'
        : 'choose';

  // Dynamic steps: hide skipped steps so the progress bar shows accurate counts
  const steps = useMemo(
    () => computeSteps(initialSubtype, initialMatchId),
    [initialSubtype, initialMatchId],
  );

  return (
    <MatchWizardProvider>
      <WizardProvider
        steps={steps}
        initialStepId={startStep}
        initialHistory={startStep !== 'choose' ? ['choose'] : []}
        onClose={handleClose}
      >
        <WizardShell isOpen={isOpen} showProgress>
          <ContentFlowInner isOpen={isOpen} initialMatchId={initialMatchId} initialSubtype={initialSubtype} />
        </WizardShell>
      </WizardProvider>
    </MatchWizardProvider>
  );
}

// ─── Inner component (needs both contexts) ────────────────

function ContentFlowInner({
  isOpen,
  initialMatchId,
  initialSubtype,
}: {
  isOpen: boolean;
  initialMatchId?: string;
  initialSubtype?: string;
}) {
  const mw = useMatchWizard();
  const { goTo } = useWizard();

  // When initialMatchId is provided, use useMatchesData to fetch and
  // auto‑set the match in MatchWizardContext.
  useMatchesData(isOpen && !!initialMatchId, initialMatchId);

  // Auto-select content subtype and skip ContentTypeStep when initialSubtype is provided
  const { fetchTemplates, selectTemplateForSubtype } = useTemplatesData();
  const hasAutoSelected = React.useRef(false);

  useEffect(() => {
    if (!initialSubtype || hasAutoSelected.current || !mw.selectedMatch) return;

    // Find the content type across all phases
    const allPhases = ['pre', 'during', 'post'] as const;
    for (const phase of allPhases) {
      const items = CONTENT_TYPES[phase];
      const found = items.find(c => c.subtype === initialSubtype);
      if (found) {
        hasAutoSelected.current = true;
        mw.setSelectedContentPhase(phase);
        mw.setPendingContent({
          key: found.key,
          label: found.label,
          subtype: found.subtype,
          templateType: found.templateType,
        });

        // Fetch templates then resolve — must await so the template is
        // available before OptionsStep checks selectedTemplate.
        const autoSelect = async () => {
          const loaded = await fetchTemplates();
          selectTemplateForSubtype(found.subtype, loaded);

          // Navigate to the correct next step
          if (LINEUP_REQUIRED_SUBTYPES.has(found.subtype)) {
            goTo('lineup');
          } else if (HAS_OPTIONS_SUBTYPES.has(found.subtype)) {
            goTo('options');
          } else {
            goTo('review');
          }
        };
        autoSelect();
        break;
      }
    }
  }, [initialSubtype, mw.selectedMatch, mw.setSelectedContentPhase, mw.setPendingContent, fetchTemplates, selectTemplateForSubtype, goTo]);

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
