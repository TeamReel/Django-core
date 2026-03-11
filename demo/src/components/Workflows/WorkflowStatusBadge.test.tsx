import { render, screen } from '@testing-library/react';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';

// Mock the useWorkflows hook
vi.mock('../../hooks/useWorkflows', () => ({
  getStateDisplay: (state: string) => ({
    label: state.charAt(0).toUpperCase() + state.slice(1),
    icon: '●',
    color: '#22c55e',
    bgColor: '#22c55e20',
  }),
}));

describe('WorkflowStatusBadge', () => {
  it('renders the state label', () => {
    render(<WorkflowStatusBadge state="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders the state icon', () => {
    render(<WorkflowStatusBadge state="pending" />);
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('renders different states', () => {
    const { rerender } = render(<WorkflowStatusBadge state="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<WorkflowStatusBadge state="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('accepts custom style', () => {
    const { container } = render(
      <WorkflowStatusBadge state="active" style={{ margin: 8 }} />
    );
    expect(container.firstChild).toHaveStyle({ margin: '8px' });
  });

  it('adjusts font size for sm size', () => {
    const { container } = render(<WorkflowStatusBadge state="active" size="sm" />);
    expect(container.firstChild).toHaveStyle({ fontSize: 10 });
  });
});
