/**
 * Integration test — MatchWizard
 *
 * Tests: match selection step with available matches.
 * Heavy sub-components and design system mocked to prevent OOM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import MatchWizard from '../../components/MatchWizard';

const mockOnClose = vi.fn();
const mockSelectMatch = vi.fn();

vi.mock('../../components/useMatchWizardData', () => ({
  useMatchWizardData: () => ({
    currentStep: 'match',
    setCurrentStep: vi.fn(),
    selectedMatch: null,
    lineupSlots: [],
    lineupFormation: null,
    setLineupFormation: vi.fn(),
    lineupSaving: false,
    selectedContentPhase: 'pre',
    setSelectedContentPhase: vi.fn(),
    selectedTemplate: null,
    selectedContentTypeLabel: '',
    selectedType: null,
    isLineupFlow: false,
    options: {},
    seasonSquad: [],
    videoPoll: null,
    matchesLoading: false,
    upcomingMatches: [
      { id: 'm1', title: 'Team A vs Team B', start_time: '2025-01-15T10:00:00Z', metadata: { location: 'Stadium' } },
      { id: 'm2', title: 'Team A vs Team C', start_time: '2025-01-22T10:00:00Z', metadata: { location: 'Arena' } },
    ],
    pendingContent: [],
    progress: null,
    generationError: null,
    generatedOutput: null,
    generatedVariants: [],
    selectedVariantIndex: 0,
    setSelectedVariantIndex: vi.fn(),
    savingAsset: false,
    saveSuccess: false,
    savedVariantIndices: new Set(),
    homeTeamName: 'Team A',
    awayTeamName: 'Team B',
    matchDataForApi: null,
    handleContentSelect: vi.fn(),
    handleLineupConfirm: vi.fn(),
    handleOptionsConfirm: vi.fn(),
    handleReviewConfirm: vi.fn(),
    handleGenerate: vi.fn(),
    handleSaveAsAsset: vi.fn(),
    handleSaveAllAsAssets: vi.fn(),
    handleSaveVariantByIndex: vi.fn(),
    handleBack: vi.fn(),
    handleClose: mockOnClose,
    getStepTitle: () => 'Select a match',
    setSelectedMatch: mockSelectMatch,
    filledPositions: 0,
    totalPositions: 11,
    matchesError: null,
    templatesError: null,
    squadError: null,
    saveError: null,
    retrySquad: vi.fn(),
    retryTemplates: vi.fn(),
  }),
}));

// Mock heavy step components (real paths from MatchWizard.tsx)
vi.mock('../../pages/identity/ContentGenerationModal/MembersStep', () => ({ MembersStep: () => null }));
vi.mock('../../pages/identity/ContentGenerationModal/ConfirmStep', () => ({ ConfirmStep: () => null }));
vi.mock('../../pages/identity/ContentGenerationModal/GeneratingStep', () => ({ GeneratingStep: () => null }));
vi.mock('../../pages/identity/ContentGenerationModal/SuccessStep', () => ({ SuccessStep: () => null }));
vi.mock('../../pages/identity/ContentGenerationModal/ErrorStep', () => ({ default: () => null }));
vi.mock('../../pages/identity/ContentGenerationModal/VideoQueuedStep', () => ({ VideoQueuedStep: () => null }));
vi.mock('../../components/MatchWizardLineupStep', () => ({ MatchWizardLineupStep: () => null }));
vi.mock('../../components/SmartEmptyState', () => ({ default: () => <div>Empty</div> }));
vi.mock('../../utils/relativeTime', () => ({
  formatRelativeTime: () => '2 days from now',
  getDateUrgency: () => 'normal',
}));

vi.mock('@django-core/design-system', () => ({
  BottomSheet: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('MatchWizard integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders match cards', () => {
    renderWithProviders(<MatchWizard isOpen onClose={mockOnClose} />);
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument();
    expect(screen.getByText('Team A vs Team C')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderWithProviders(<MatchWizard isOpen onClose={mockOnClose} />);
    expect(screen.queryByLabelText(/sluiten|close/i)).toBeTruthy();
  });

  it('calls setSelectedMatch on card click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MatchWizard isOpen onClose={mockOnClose} />);
    await user.click(screen.getByText('Team A vs Team B'));
    expect(mockSelectMatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', title: 'Team A vs Team B' }),
    );
  });

  it('does not render when closed', () => {
    const { container } = renderWithProviders(<MatchWizard isOpen={false} onClose={mockOnClose} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
