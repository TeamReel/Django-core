/**
 * CreateWizard – Universal create wizard
 *
 * Entry component for the + button in MobileBottomNav.
 * Step 0: Choose what to create (content, match, member, team, season).
 * Step 1+: Sub-flow for the selected type.
 *
 * Architecture (dual-context pattern):
 *   CreateWizardProvider (domain: selectedFlow, prefill)
 *     → Content flow: ContentFlow (C3 — unified SmartMatch → MatchWizardV2)
 *     → Match flow: MatchCreateFlow (M1 — opponent, date, venue → submit)
 *     → Member flow: MemberAddFlow (M2 — search/create user → role → submit)
 *     → Team flow: ProjectCreateFlow (M3 — type/context → details → submit)
 *     → Season flow: PeriodCreateFlow (M4 — type → details → submit)
 *     → Other flows: WizardInnerShell (stub)
 */
import React, { useCallback, useMemo } from 'react';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../Wizard';
import {
  CreateWizardProvider,
  useCreateWizard,
  type CreatePrefill,
  type CreateFlowType,
} from './CreateWizardContext';
import { ChooseFlowStep } from './steps/ChooseFlowStep';
import { FlowStubStep } from './steps/FlowStubStep';
import { ContentFlow } from './flows/ContentFlow';
import { MatchCreateFlow } from './flows/MatchCreateFlow';
import { MemberAddFlow } from './flows/MemberAddFlow';
import { ProjectCreateFlow } from './flows/ProjectCreateFlow';
import { PeriodCreateFlow } from './flows/PeriodCreateFlow';

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
  /** Optional: auto-select a flow (skip choose step) */
  initialFlow?: CreateFlowType;
  /** Optional: auto-select a content subtype (skip content type step) */
  initialSubtype?: string;
}

// ─── Inner component (needs CreateWizardProvider context) ──

function CreateWizardInner({
  isOpen,
  onClose,
  initialMatchId,
  initialSubtype,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
  initialSubtype?: string;
}) {
  const { selectedFlow } = useCreateWizard();

  // ── Content flow (C3): single unified wizard ──
  if (selectedFlow === 'content' || initialMatchId) {
    return (
      <ContentFlow
        isOpen={isOpen}
        onClose={onClose}
        initialMatchId={initialMatchId}
        initialSubtype={initialSubtype}
      />
    );
  }

  // ── Match create flow (M1) ──
  if (selectedFlow === 'match') {
    return (
      <MatchCreateFlow
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // ── Member add flow (M2) ──
  if (selectedFlow === 'member') {
    return (
      <MemberAddFlow
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // ── Project create flow (M3) ──
  if (selectedFlow === 'team') {
    return (
      <ProjectCreateFlow
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // ── Period create flow (M4) ──
  if (selectedFlow === 'season') {
    return (
      <PeriodCreateFlow
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // For all other flows: use the generic shell
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
  initialFlow,
  initialSubtype,
}: CreateWizardProps) {
  // Don't render anything when closed (preserves clean unmount)
  if (!isOpen) return null;

  return (
    <CreateWizardProvider initialPrefill={prefill} initialFlow={initialFlow}>
      <CreateWizardInner
        isOpen={isOpen}
        onClose={onClose}
        initialMatchId={initialMatchId}
        initialSubtype={initialSubtype}
      />
    </CreateWizardProvider>
  );
}
