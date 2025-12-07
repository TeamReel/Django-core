import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Alert } from './Alert';

expect.extend(toHaveNoViolations);

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Test message</Alert>);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Alert title="Alert Title">Test message</Alert>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies info variant by default', () => {
    const { container } = render(<Alert>Info message</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveAttribute('role', 'status');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('applies error variant with assertive role', () => {
    const { container } = render(<Alert variant="error">Error message</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies warning variant with assertive role', () => {
    const { container } = render(<Alert variant="warning">Warning message</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies success variant with polite role', () => {
    const { container } = render(<Alert variant="success">Success message</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveAttribute('role', 'status');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('renders dismiss button when dismissible', () => {
    render(<Alert dismissible>Dismissible alert</Alert>);
    expect(screen.getByRole('button', { name: 'Dismiss alert' })).toBeInTheDocument();
  });

  it('does not render dismiss button by default', () => {
    render(<Alert>Non-dismissible alert</Alert>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = jest.fn();

    render(<Alert dismissible onDismiss={handleDismiss}>Dismissible alert</Alert>);

    await user.click(screen.getByRole('button', { name: 'Dismiss alert' }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to div element', () => {
    const ref = jest.fn();
    render(<Alert ref={ref}>Alert with ref</Alert>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('applies custom className', () => {
    const { container } = render(<Alert className="custom-class">Alert</Alert>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('spreads additional props', () => {
    const { container } = render(<Alert data-testid="alert-test">Alert</Alert>);
    expect(container.firstChild).toHaveAttribute('data-testid', 'alert-test');
  });

  it('has no accessibility violations (info)', async () => {
    const { container } = render(<Alert variant="info">Info message</Alert>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (error with dismiss)', async () => {
    const { container } = render(
      <Alert variant="error" dismissible onDismiss={() => {}}>
        Error message
      </Alert>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (with title)', async () => {
    const { container } = render(
      <Alert title="Important" variant="warning">
        Warning message
      </Alert>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
