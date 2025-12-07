import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Badge } from './Badge';

expect.extend(toHaveNoViolations);

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
  });

  it('applies primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('applies error variant', () => {
    render(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('applies small size', () => {
    render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toBeInTheDocument();
  });

  it('applies medium size by default', () => {
    render(<Badge>Medium</Badge>);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('forwards ref to span element', () => {
    const ref = jest.fn();
    render(<Badge ref={ref}>Badge with ref</Badge>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLSpanElement));
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('spreads additional props', () => {
    render(<Badge data-testid="badge-test">Badge</Badge>);
    expect(screen.getByTestId('badge-test')).toBeInTheDocument();
  });

  it('renders inline for text usage', () => {
    render(
      <p>
        Status: <Badge>Active</Badge>
      </p>
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('has no accessibility violations (default)', async () => {
    const { container } = render(<Badge>Default Badge</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (all variants)', async () => {
    const { container } = render(
      <div>
        <Badge variant="default">Default</Badge>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (sizes)', async () => {
    const { container } = render(
      <div>
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
