import { render, screen } from '@testing-library/react';
import SlotIcon from './SlotIcon';

describe('SlotIcon', () => {
  it('renders a known icon as SVG', () => {
    const { container } = render(<SlotIcon name="star" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('falls back to bullet for unknown icon name', () => {
    render(<SlotIcon name="does-not-exist" />);
    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('uses default size of 14', () => {
    const { container } = render(<SlotIcon name="home" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
  });

  it('accepts custom size', () => {
    const { container } = render(<SlotIcon name="trophy" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('renders different icons for different names', () => {
    const { rerender, container } = render(<SlotIcon name="user" />);
    const svg1 = container.querySelector('svg')?.innerHTML;
    rerender(<SlotIcon name="camera" />);
    const svg2 = container.querySelector('svg')?.innerHTML;
    // Different Lucide icons have different paths
    expect(svg1).not.toEqual(svg2);
  });
});
