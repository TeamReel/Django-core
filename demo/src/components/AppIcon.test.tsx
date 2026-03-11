import { render } from '@testing-library/react';
import { AppIcon } from './AppIcon';
import { Star, Home } from 'lucide-react';

describe('AppIcon', () => {
  it('renders the given Lucide icon as SVG', () => {
    const { container } = render(<AppIcon icon={Star} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('uses default size of 18', () => {
    const { container } = render(<AppIcon icon={Star} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
  });

  it('accepts custom size', () => {
    const { container } = render(<AppIcon icon={Home} size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('forwards extra Lucide props', () => {
    const { container } = render(<AppIcon icon={Star} className="icon-cls" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('icon-cls');
  });
});
