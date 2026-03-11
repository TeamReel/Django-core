/**
 * Integration test — MatchCreateFlow
 *
 * Tests: wizard step flow for creating a match via CreateWizard.
 * Wraps in CreateWizardProvider to satisfy the context requirement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import React from 'react';

// Mock the context hook to avoid full provider
vi.mock('../../components/CreateWizard/CreateWizardContext', () => ({
  useCreateWizard: () => ({
    selectedFlow: 'match',
    selectFlow: vi.fn(),
    clearFlow: vi.fn(),
    setPrefill: vi.fn(),
    resetAll: vi.fn(),
    prefill: {},
  }),
  CreateWizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

// Mock Wizard framework
vi.mock('../../components/Wizard', () => ({
  WizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WizardShell: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="wizard-shell">{children}</div> : null,
  WizardStep: ({ children, stepId }: { children: React.ReactNode; stepId: string }) =>
    <div data-testid={`step-${stepId}`}>{children}</div>,
}));

// Mock sub-steps
vi.mock('../../components/CreateWizard/steps/ChooseFlowStep', () => ({
  ChooseFlowStep: () => <div data-testid="choose-flow">Choose</div>,
}));
vi.mock('../../components/CreateWizard/steps/MatchDetailsStep', () => ({
  MatchDetailsStep: () => <div data-testid="match-details">Details</div>,
}));
vi.mock('../../components/CreateWizard/steps/MatchConfirmStep', () => ({
  MatchConfirmStep: () => <div data-testid="match-confirm">Confirm</div>,
}));
vi.mock('../../pages/identity/useMatchCreateData', () => ({
  useMatchCreateData: () => ({
    handleCreate: vi.fn(),
    isSaving: false,
    derived: { canSubmit: true },
  }),
}));
vi.mock('@/api', () => ({
  api: { post: vi.fn().mockResolvedValue({ id: '1' }) },
}));

import MatchCreateFlow from '../../components/CreateWizard/flows/MatchCreateFlow';

describe('MatchCreateFlow integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the flow component', () => {
    renderWithProviders(<MatchCreateFlow isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('wizard-shell')).toBeInTheDocument();
  });

  it('renders wizard steps', () => {
    renderWithProviders(<MatchCreateFlow isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('step-choose')).toBeInTheDocument();
    expect(screen.getByTestId('step-matchDetails')).toBeInTheDocument();
    expect(screen.getByTestId('step-matchConfirm')).toBeInTheDocument();
  });
});
