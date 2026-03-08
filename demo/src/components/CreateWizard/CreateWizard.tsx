/**
 * CreateWizard – Universal create wizard
 *
 * Entry component for the + button in MobileBottomNav.
 * Step 0: Choose what to create (content, match, member, team, season).
 * Step 1+: Sub-flow for the selected type.
 *
 * Architecture (dual-context pattern):
 *   CreateWizardProvider (domain: selectedFlow, prefill)
 *     WizardProvider (navigation: steps, current step, back/next)
 *       WizardShell (UI: BottomSheet, header, progress)
 *
 * Content flow delegates to MatchWizardV2 (standalone, already has its own
 * WizardProvider). Other flows currently show a stub placeholder.
 */
import React, { useCallback, useMemo } from 'react';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../Wizard';
import {
  CreateWizardProvider,
  useCreateWizard,
  type CreatePrefill,
} from './CreateWizardContext';
import { ChooseFlowStep } from './steps/ChooseFlowStep';
import { FlowStubStep } from './steps/FlowStubStep';
import MatchWizardV2 from '../MatchWizardV2';

// ─── Step config ──────────────────────────────────────────

const STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'flow', title: 'Aanmaken' },
];

// ─── Props ────────────────────────────────────────────────

export interface CreateWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Pre-fill context from current page */
  prefill?: CreatePrefill;
  /** Optional: match ID to pre-select (from custom events) */
  initialMatchId?: string;
}

// ─── Inner component (needs CreateWizardProvider context) ──

function CreateWizardInner({
  isOpen,
  onClose,
  initialMatchId,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}) {
  const { selectedFlow, clearFlow, resetAll } = useCreateWizard();

  // When the content flow is selected, delegate entirely to MatchWizardV2
  // (it has its own WizardProvider + WizardShell).
  if (selectedFlow === 'content') {
    return (
      <MatchWizardV2
        isOpen={isOpen}
        onClose={() => {
          resetAll();
          onClose();
        }}
        initialMatchId={initialMatchId}
      />
    );
  }

  // For all other flows: use the CreateWizard shell
  return (
    <WizardInnerShell
      isOpen={isOpen}
      onClose={onClose}
      selectedFlow={selectedFlow}
    />
  );
}

// ─── Wizard shell for non-content flows ───────────────────

function WizardInnerShell({
  isOpen,
  onClose,
  selectedFlow,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedFlow: string | null;
}) {
  const { resetAll, clearFlow } = useCreateWizard();

  // Dynamic title for step 1 based on selected flow
  const steps = useMemo<WizardStepConfig[]>(() => {
    const flowTitles: Record<string, string> = {
      match: 'Wedstrijd plannen',
      member: 'Lid toevoegen',
      team: 'Team aanmaken',
      season: 'Seizoen aanmaken',
    };
    return [
      { id: 'choose', title: 'Wat wil je doen?', showBack: false },
      { id: 'flow', title: flowTitles[selectedFlow || ''] || 'Aanmaken' },
    ];
  }, [selectedFlow]);

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  // When going back from step 1, clear the flow selection
  // (WizardProvider.back will handle step navigation)
  const handleBackFromFlow = useCallback(() => {
    clearFlow();
  }, [clearFlow]);

  return (
    <WizardProvider
      steps={steps}
      initialStepId={selectedFlow ? 'flow' : 'choose'}
      onClose={handleClose}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="choose">
          <ChooseFlowStep />
        </WizardStep>

        <WizardStep stepId="flow">
          {/* Stub for M1-M4 flows — will be replaced with real components */}
          <FlowStubStep />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// ─── Main export ──────────────────────────────────────────

export default function CreateWizard({
  isOpen,
  onClose,
  prefill = {},
  initialMatchId,
}: CreateWizardProps) {
  // Don't render anything when closed (preserves clean unmount)
  if (!isOpen) return null;

  return (
    <CreateWizardProvider initialPrefill={prefill}>
      <CreateWizardInner
        isOpen={isOpen}
        onClose={onClose}
        initialMatchId={initialMatchId}
      />
    </CreateWizardProvider>
  );
}
