import { render, screen } from '@testing-library/react';
import { WorkflowTimeline } from './WorkflowTimeline';
import type { TransitionHistoryEntry } from '../../hooks/useWorkflows';

// Mock workflow helpers
vi.mock('../../hooks/useWorkflows', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../hooks/useWorkflows');
  return {
    ...actual,
    getStateDisplay: (state: string) => ({
      label: state,
      icon: '●',
      color: '#22c55e',
      bgColor: '#22c55e20',
    }),
    getActionDisplay: (action: string) => ({
      label: action,
      icon: 'check',
      color: '#22c55e',
      bgColor: '#22c55e20',
      hoverBgColor: '#22c55e40',
    }),
  };
});

const history: TransitionHistoryEntry[] = [
  {
    id: '1',
    action: 'submit',
    from_state: 'draft',
    to_state: 'pending',
    actor_username: 'john',
    comment: 'Ready for review',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    action: 'approve',
    from_state: 'pending',
    to_state: 'approved',
    actor_username: 'admin',
    comment: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

describe('WorkflowTimeline', () => {
  it('renders timeline entries', () => {
    render(<WorkflowTimeline history={history} />);
    expect(screen.getByText(/submit/)).toBeInTheDocument();
    expect(screen.getAllByText(/approve/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows actor names', () => {
    render(<WorkflowTimeline history={history} />);
    expect(screen.getByText('john')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows comments when present', () => {
    render(<WorkflowTimeline history={history} />);
    expect(screen.getByText(/"Ready for review"/)).toBeInTheDocument();
  });

  it('shows state transitions', () => {
    render(<WorkflowTimeline history={history} />);
    expect(screen.getByText('draft → pending')).toBeInTheDocument();
    expect(screen.getByText('pending → approved')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<WorkflowTimeline history={[]} loading />);
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<WorkflowTimeline history={[]} />);
    expect(screen.getByText('No transitions recorded yet.')).toBeInTheDocument();
  });
});
