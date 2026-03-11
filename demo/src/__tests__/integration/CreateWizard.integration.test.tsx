/**
 * Integration test — CreateWizard
 *
 * Tests: open → flow selection → renders options.
 * All sub-flows mocked. ToastProvider mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import CreateWizard from '../../components/CreateWizard/CreateWizard';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

// Mock sub-flows
vi.mock('../../components/CreateWizard/flows/ContentFlow', () => ({
  default: () => <div data-testid="content-flow">ContentFlow</div>,
  ContentFlow: () => <div data-testid="content-flow">ContentFlow</div>,
}));
vi.mock('../../components/CreateWizard/flows/MatchCreateFlow', () => ({
  default: () => <div data-testid="match-flow">MatchCreateFlow</div>,
  MatchCreateFlow: () => <div data-testid="match-flow">MatchCreateFlow</div>,
}));
vi.mock('../../components/CreateWizard/flows/MemberAddFlow', () => ({
  default: () => <div data-testid="member-flow">MemberAddFlow</div>,
  MemberAddFlow: () => <div data-testid="member-flow">MemberAddFlow</div>,
}));
vi.mock('../../components/CreateWizard/flows/ProjectCreateFlow', () => ({
  default: () => <div data-testid="team-flow">TeamCreate</div>,
  ProjectCreateFlow: () => <div data-testid="team-flow">TeamCreate</div>,
}));
vi.mock('../../components/CreateWizard/flows/PeriodCreateFlow', () => ({
  default: () => <div data-testid="season-flow">SeasonCreate</div>,
  PeriodCreateFlow: () => <div data-testid="season-flow">SeasonCreate</div>,
}));

// Mock toast to avoid ToastProvider requirement
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [] }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockOnClose = vi.fn();

describe('CreateWizard integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders flow selection when open', () => {
    renderWithProviders(<CreateWizard isOpen onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(<CreateWizard isOpen={false} onClose={mockOnClose} />);
    expect(container.textContent).toBe('');
  });

  it('renders with initialFlow=match going to match flow', () => {
    renderWithProviders(<CreateWizard isOpen onClose={mockOnClose} initialFlow="match" />);
    expect(screen.getByTestId('match-flow')).toBeInTheDocument();
  });
});
