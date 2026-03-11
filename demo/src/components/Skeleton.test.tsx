import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a shimmer element by default (text variant)', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders multiple lines for text variant with lines > 1', () => {
    const { container } = render(<Skeleton variant="text" lines={3} />);
    // Should have a wrapper div containing 3 shimmer divs
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.children?.length).toBe(3);
  });

  it('renders single element for avatar variant', () => {
    const { container } = render(<Skeleton variant="avatar" />);
    const el = container.firstChild as HTMLElement;
    // Avatar default is 50% border radius (circular)
    expect(el).toBeTruthy();
  });

  it('accepts custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--skeleton-w')).toBe('200px');
    expect(el.style.getPropertyValue('--skeleton-h')).toBe('50px');
  });

  it('accepts custom size for avatar', () => {
    const { container } = render(<Skeleton variant="avatar" size={60} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--skeleton-w')).toBe('60px');
    expect(el.style.getPropertyValue('--skeleton-h')).toBe('60px');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="extra" />);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('applies custom style', () => {
    const { container } = render(<Skeleton style={{ margin: 8 }} />);
    expect(container.firstChild).toHaveStyle({ margin: '8px' });
  });
});
