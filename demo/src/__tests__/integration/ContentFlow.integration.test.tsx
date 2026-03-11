/**
 * Integration test — ContentFlow
 *
 * Tests: rendering with wizard providers, close behaviour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import React from 'react';

// Mock CreateWizardContext (parent provides this)
vi.mock('../../components/CreateWizard/CreateWizardContext', () => ({
  useCreateWizard: () => ({
    selectedFlow: 'content',
    selectFlow: vi.fn(),
    clearFlow: vi.fn(),
    setPrefill: vi.fn(),
    resetAll: vi.fn(),
    prefill: {},
  }),
  CreateWizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock MatchWizardV2
vi.mock('../../components/MatchWizardV2', () => ({
  MatchWizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMatchWizard: () => ({
    setSelectedMatch: vi.fn(),
    selectedMatch: null,
  }),
  MatchWizardInner: () => <div data-testid="match-wizard-inner">MatchWizardInner</div>,
}));

// Mock MatchWizardV2/hooks
vi.mock('../../components/MatchWizardV2/hooks', () => ({
  useMatchesData: vi.fn(),
}));

// Mock Wizard
vi.mock('../../components/Wizard', () => ({
  WizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WizardShell: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="wizard-shell">{children}</div> : null,
  WizardStep: ({ children, stepId }: { children: React.ReactNode; stepId: string }) => (
    <div data-testid={`step-${stepId}`}>{children}</div>
  ),
}));

// Mock sub-steps
vi.mock('../../components/CreateWizard/steps/ChooseFlowStep', () => ({
  ChooseFlowStep: () => <div data-testid="choose-flow-step">ChooseFlowStep</div>,
}));

vi.mock('../../components/CreateWizard/steps/SmartMatchStep', () => ({
  SmartMatchStep: () => <div data-testid="smart-match-step">SmartMatchStep</div>,
}));

// Mock activities type
vi.mock('../../../hooks/useActivities', () => ({}));

import { ContentFlow } from '../../components/CreateWizard/flows/ContentFlow';

describe('ContentFlow integration', () => {
  const onClose = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it('renders the wizard shell when open', () => {
    renderWithProviders(<ContentFlow isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('wizard-shell')).toBeInTheDocument();
  });

  it('renders SmartMatchStep and ChooseFlowStep step containers', () => {
    renderWithProviders(<ContentFlow isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('step-choose')).toBeInTheDocument();
    expect(screen.getByTestId('step-smartMatch')).toBeInTheDocument();
  });

  it('renders MatchWizardInner for later steps', () => {
    renderWithProviders(<ContentFlow isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('match-wizard-inner')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<ContentFlow isOpen={false} onClose={onClose} />);
    expect(screen.queryByTestId('wizard-shell')).not.toBeInTheDocument();
  });
});
