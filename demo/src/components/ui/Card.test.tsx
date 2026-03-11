import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies outlined variant classes by default', () => {
    const { container } = render(<Card>Default</Card>);
    expect(container.firstChild).toHaveClass('border', 'rounded-12');
  });

  it('applies cursor-pointer when clickable', () => {
    const { container } = render(<Card clickable>Clickable</Card>);
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('does not apply cursor-pointer by default', () => {
    const { container } = render(<Card>Static</Card>);
    expect(container.firstChild).not.toHaveClass('cursor-pointer');
  });

  it('applies padding class based on padding prop', () => {
    const { container } = render(<Card padding="lg">Large pad</Card>);
    expect(container.firstChild).toHaveClass('p-20');
  });

  it('applies no padding class for none', () => {
    const { container } = render(<Card padding="none">No pad</Card>);
    expect(container.firstChild).not.toHaveClass('p-12', 'p-16', 'p-20');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom">Custom</Card>);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('spreads extra HTML attributes', () => {
    render(<Card data-testid="my-card" role="article">Spread</Card>);
    expect(screen.getByTestId('my-card')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('merges custom style with variant styles', () => {
    const { container } = render(<Card style={{ color: 'red' }}>Styled</Card>);
    expect((container.firstChild as HTMLElement).style.color).toBe('red');
  });
});
