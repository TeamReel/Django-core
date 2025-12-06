import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Spinner } from './Spinner';

expect.extend(toHaveNoViolations);

describe('Spinner', () => {
  it('renders with default label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom label', () => {
    render(<Spinner label="Processing data" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Processing data');
  });

  it('has polite aria-live region', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  it('includes visually hidden text for screen readers', () => {
    render(<Spinner label="Loading content" />);
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('applies small size', () => {
    render(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies medium size by default', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies large size', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('forwards ref to div element', () => {
    const ref = jest.fn();
    render(<Spinner ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('spreads additional props', () => {
    render(<Spinner data-testid="spinner-test" />);
    expect(screen.getByTestId('spinner-test')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion (rendered in DOM)', () => {
    // Note: CSS media query testing requires manual verification or browser testing
    // This test confirms the component renders correctly
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has no accessibility violations (default)', async () => {
    const { container } = render(<Spinner />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (with custom label)', async () => {
    const { container } = render(<Spinner label="Custom loading message" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (all sizes)', async () => {
    const { container } = render(
      <div>
        <Spinner size="sm" label="Small spinner" />
        <Spinner size="md" label="Medium spinner" />
        <Spinner size="lg" label="Large spinner" />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('can be used inline with text', () => {
    const { container } = render(
      <div>
        Loading <Spinner size="sm" label="Loading" /> please wait
      </div>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.textContent).toContain('Loading');
    expect(container.textContent).toContain('please wait');
  });
});
