/**
 * Integration test — MemberAddFlow
 *
 * Tests: wizard step flow for adding a member.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import React from 'react';

vi.mock('../../components/CreateWizard/CreateWizardContext', () => ({
  useCreateWizard: () => ({
    selectedFlow: 'member',
    selectFlow: vi.fn(),
    clearFlow: vi.fn(),
    setPrefill: vi.fn(),
    resetAll: vi.fn(),
    prefill: {},
  }),
  CreateWizardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/api', () => ({
  api: { post: vi.fn().mockResolvedValue({ id: '1' }), get: vi.fn().mockResolvedValue({ results: [] }) },
  ApiError: class extends Error {},
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
vi.mock('../../components/CreateWizard/steps/MemberSearchStep', () => ({
  MemberSearchStep: () => <div data-testid="member-search">Search</div>,
}));
vi.mock('../../components/CreateWizard/steps/MemberDetailsStep', () => ({
  MemberDetailsStep: () => <div data-testid="member-details">Details</div>,
}));
vi.mock('../../components/CreateWizard/steps/MemberRoleStep', () => ({
  MemberRoleStep: () => <div data-testid="member-role">Role</div>,
}));
vi.mock('../../components/CreateWizard/steps/MemberConfirmStep', () => ({
  MemberConfirmStep: () => <div data-testid="member-confirm">Confirm</div>,
}));
vi.mock('../../utils/errorHelpers', () => ({
  getErrorMessage: (e: any) => e?.message || 'Error',
}));

import { MemberAddFlow } from '../../components/CreateWizard/flows/MemberAddFlow';

describe('MemberAddFlow integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the wizard shell when open', () => {
    renderWithProviders(<MemberAddFlow isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('wizard-shell')).toBeInTheDocument();
  });

  it('renders wizard steps', () => {
    renderWithProviders(<MemberAddFlow isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('step-choose')).toBeInTheDocument();
    expect(screen.getByTestId('step-memberSearch')).toBeInTheDocument();
  });
});
