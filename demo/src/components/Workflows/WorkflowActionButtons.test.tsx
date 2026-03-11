import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowActionButtons } from './WorkflowActionButtons';

// Mock workflow helpers
vi.mock('../../hooks/useWorkflows', () => ({
  getActionDisplay: (action: string) => ({
    label: action.charAt(0).toUpperCase() + action.slice(1),
    icon: 'check',
    color: '#22c55e',
    bgColor: '#22c55e20',
    hoverBgColor: '#22c55e40',
  }),
  executeTransition: vi.fn().mockResolvedValue({ id: '1', action: 'approve', to_state: 'approved' }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('WorkflowActionButtons', () => {
  it('renders action buttons for available actions', () => {
    render(
      <WorkflowActionButtons
        instanceId="123"
        availableActions={['approve', 'reject']}
      />
    );
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('renders nothing when no actions available', () => {
    const { container } = render(
      <WorkflowActionButtons
        instanceId="123"
        availableActions={[]}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows comment dialog for destructive actions', () => {
    render(
      <WorkflowActionButtons
        instanceId="123"
        availableActions={['reject']}
      />
    );
    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByText(/Reason for reject/)).toBeInTheDocument();
  });

  it('shows cancel button in comment dialog', () => {
    render(
      <WorkflowActionButtons
        instanceId="123"
        availableActions={['reject']}
      />
    );
    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
