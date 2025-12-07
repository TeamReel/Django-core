import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Progress } from './Progress';

expect.extend(toHaveNoViolations);

describe('Progress', () => {
  it('renders with correct aria attributes', () => {
    render(<Progress value={50} aria-label="Loading" />);
    const progressbar = screen.getByRole('progressbar');

    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calculates percentage correctly', () => {
    const { container } = render(<Progress value={75} />);
    const bar = container.querySelector('[role="progressbar"] > div');
    expect(bar).toHaveStyle({ width: '75%' });
  });

  it('respects custom max value', () => {
    const { container } = render(<Progress value={50} max={200} />);
    const bar = container.querySelector('[role="progressbar"] > div');
    expect(bar).toHaveStyle({ width: '25%' });

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemax', '200');
  });

  it('clamps value to 0-100 percentage', () => {
    const { container, rerender } = render(<Progress value={-10} />);
    let bar = container.querySelector('[role="progressbar"] > div');
    expect(bar).toHaveStyle({ width: '0%' });

    rerender(<Progress value={150} />);
    bar = container.querySelector('[role="progressbar"] > div');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('shows text label when provided', () => {
    render(<Progress value={50} label="Loading data" showLabel />);
    expect(screen.getByText('Loading data')).toBeInTheDocument();
  });

  it('shows percentage when showLabel is true without label', () => {
    render(<Progress value={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('does not show label by default', () => {
    render(<Progress value={50} label="Loading" />);
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('applies small size', () => {
    render(<Progress value={50} size="sm" aria-label="Progress" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('applies medium size by default', () => {
    render(<Progress value={50} aria-label="Progress" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('applies large size', () => {
    render(<Progress value={50} size="lg" aria-label="Progress" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('forwards ref to outer div element', () => {
    const ref = jest.fn();
    render(<Progress value={50} ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('applies custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('spreads additional props to outer div', () => {
    render(<Progress value={50} data-testid="progress-test" />);
    expect(screen.getByTestId('progress-test')).toBeInTheDocument();
  });

  it('uses custom aria-label when provided', () => {
    render(<Progress value={50} aria-label="Custom loading message" />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-label', 'Custom loading message');
  });

  it('generates default aria-label from percentage', () => {
    render(<Progress value={75} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-label', '75% complete');
  });

  it('has no accessibility violations (basic)', async () => {
    const { container } = render(<Progress value={50} aria-label="Loading" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (with label)', async () => {
    const { container } = render(<Progress value={75} label="Download progress" showLabel />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (all sizes)', async () => {
    const { container } = render(
      <div>
        <Progress value={50} size="sm" aria-label="Small" />
        <Progress value={50} size="md" aria-label="Medium" />
        <Progress value={50} size="lg" aria-label="Large" />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
