import { render, screen, fireEvent } from '@testing-library/react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders with aria-label', () => {
    render(<IconButton icon={<span>X</span>} aria-label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('renders the icon element', () => {
    render(<IconButton icon={<span data-testid="icon">★</span>} aria-label="Star" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<IconButton icon={<span>X</span>} aria-label="Close" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows tooltip as title attribute', () => {
    render(<IconButton icon={<span>?</span>} aria-label="Help" tooltip="Get help" />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Get help');
  });

  it('applies disabled styling', () => {
    render(<IconButton icon={<span>X</span>} aria-label="Close" disabled />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ opacity: 0.5 });
  });

  it('is not disabled by default', () => {
    render(<IconButton icon={<span>X</span>} aria-label="Close" />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('merges custom className', () => {
    render(<IconButton icon={<span>X</span>} aria-label="X" className="extra" />);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });
});
