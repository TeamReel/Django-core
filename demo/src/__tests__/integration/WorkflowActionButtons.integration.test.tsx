/**
 * Integration test — WorkflowActionButtons
 *
 * Tests: render action buttons → click non-destructive → destructive comment dialog.
 * Note: WorkflowActionButtons is a NAMED export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import { WorkflowActionButtons } from '../../components/Workflows/WorkflowActionButtons';

const mockExecuteTransition = vi.fn().mockResolvedValue({ id: 'h1' });

vi.mock('../../hooks/useWorkflows', () => ({
  executeTransition: (...args: unknown[]) => mockExecuteTransition(...args),
  getActionDisplay: (action: string) => ({
    label: action.charAt(0).toUpperCase() + action.slice(1),
    icon: null,
    color: '#333',
    bgColor: '#eee',
  }),
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const mockOnComplete = vi.fn();
const mockOnError = vi.fn();

describe('WorkflowActionButtons integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders action buttons', () => {
    renderWithProviders(
      <WorkflowActionButtons
        instanceId="w1"
        availableActions={['approve', 'reject']}
        onTransitionComplete={mockOnComplete}
        onError={mockOnError}
      />
    );
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('executes non-destructive action on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkflowActionButtons
        instanceId="w1"
        availableActions={['approve']}
        onTransitionComplete={mockOnComplete}
        onError={mockOnError}
      />
    );
    await user.click(screen.getByText('Approve'));
    await waitFor(() => expect(mockExecuteTransition).toHaveBeenCalledWith('w1', 'approve', undefined));
  });

  it('shows comment dialog for destructive reject action', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkflowActionButtons
        instanceId="w1"
        availableActions={['reject']}
        onTransitionComplete={mockOnComplete}
        onError={mockOnError}
      />
    );
    await user.click(screen.getByText('Reject'));
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());
  });

  it('returns empty for no actions', () => {
    const { container } = renderWithProviders(
      <WorkflowActionButtons
        instanceId="w1"
        availableActions={[]}
        onTransitionComplete={mockOnComplete}
        onError={mockOnError}
      />
    );
    expect(container.textContent).toBe('');
  });
});
