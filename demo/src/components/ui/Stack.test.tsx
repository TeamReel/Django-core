import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';

describe('Stack', () => {
  it('renders children', () => {
    render(<Stack><span>A</span><span>B</span></Stack>);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('applies default gap-16 class', () => {
    const { container } = render(<Stack>Content</Stack>);
    expect(container.firstChild).toHaveClass('flex-col', 'gap-16');
  });

  it('applies custom gap class', () => {
    const { container } = render(<Stack gap={8}>Content</Stack>);
    expect(container.firstChild).toHaveClass('flex-col', 'gap-8');
  });

  it('applies zero gap without gap class', () => {
    const { container } = render(<Stack gap={0}>Content</Stack>);
    expect(container.firstChild).toHaveClass('flex-col');
    expect(container.firstChild?.className).not.toContain('gap-');
  });

  it('applies alignment class', () => {
    const { container } = render(<Stack align="center">Content</Stack>);
    expect(container.firstChild).toHaveClass('items-center');
  });

  it('merges custom className', () => {
    const { container } = render(<Stack className="extra">Content</Stack>);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('spreads extra HTML attributes', () => {
    render(<Stack data-testid="my-stack">Content</Stack>);
    expect(screen.getByTestId('my-stack')).toBeInTheDocument();
  });
});
