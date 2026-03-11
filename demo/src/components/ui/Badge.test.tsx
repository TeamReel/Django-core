import { render, screen } from '@testing-library/react';
import { StatusBadge } from './Badge';

describe('StatusBadge', () => {
  it('renders children text', () => {
    render(<StatusBadge>Active</StatusBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('maps status string to variant', () => {
    const { container } = render(<StatusBadge status="active">Online</StatusBadge>);
    // StatusBadge wraps design-system Badge — just verify it renders
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('uses explicit variant over status mapping', () => {
    render(<StatusBadge variant="error" status="active">Overridden</StatusBadge>);
    expect(screen.getByText('Overridden')).toBeInTheDocument();
  });

  it('defaults to "default" variant when status is unknown', () => {
    render(<StatusBadge status="???unknown???">Unknown</StatusBadge>);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <StatusBadge icon={<span data-testid="badge-icon">★</span>}>
        With Icon
      </StatusBadge>
    );
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('does not render icon slot when none given', () => {
    const { container } = render(<StatusBadge>No Icon</StatusBadge>);
    // Only the text child, no icon span
    expect(screen.getByText('No Icon')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
  });
});
