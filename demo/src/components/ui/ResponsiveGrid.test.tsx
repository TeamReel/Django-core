import { render, screen } from '@testing-library/react';
import { ResponsiveGrid } from './ResponsiveGrid';

describe('ResponsiveGrid', () => {
  it('renders children', () => {
    render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('uses auto-fill grid by default', () => {
    const { container } = render(<ResponsiveGrid>Item</ResponsiveGrid>);
    expect(container.firstChild).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    });
  });

  it('uses fixed columns when specified', () => {
    const { container } = render(<ResponsiveGrid columns={3}>Item</ResponsiveGrid>);
    expect(container.firstChild).toHaveStyle({
      gridTemplateColumns: 'repeat(3, 1fr)',
    });
  });

  it('applies custom minWidth', () => {
    const { container } = render(<ResponsiveGrid minWidth="300px">Item</ResponsiveGrid>);
    expect(container.firstChild).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    });
  });

  it('applies custom gap', () => {
    const { container } = render(<ResponsiveGrid gap={24}>Item</ResponsiveGrid>);
    expect(container.firstChild).toHaveStyle({ gap: '24px' });
  });

  it('merges custom className and style', () => {
    const { container } = render(
      <ResponsiveGrid className="extra" style={{ padding: 8 }}>Item</ResponsiveGrid>
    );
    expect(container.firstChild).toHaveClass('extra');
    expect(container.firstChild).toHaveStyle({ padding: '8px' });
  });

  it('spreads extra HTML attributes', () => {
    render(<ResponsiveGrid data-testid="grid">Item</ResponsiveGrid>);
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });
});
