import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct width percentage', () => {
    const { container } = render(<ProgressBar percent={75} />);
    // Inner fill bar
    const wrapper = container.firstChild as HTMLElement;
    const track = wrapper.firstChild as HTMLElement;
    const fill = track.firstChild as HTMLElement;
    expect(fill).toHaveStyle({ width: '75%' });
  });

  it('clamps percent to 0', () => {
    const { container } = render(<ProgressBar percent={-20} />);
    const wrapper = container.firstChild as HTMLElement;
    const track = wrapper.firstChild as HTMLElement;
    const fill = track.firstChild as HTMLElement;
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('clamps percent to 100', () => {
    const { container } = render(<ProgressBar percent={150} />);
    const wrapper = container.firstChild as HTMLElement;
    const track = wrapper.firstChild as HTMLElement;
    const fill = track.firstChild as HTMLElement;
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar percent={42} showLabel />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('hides label by default', () => {
    render(<ProgressBar percent={42} />);
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  it('applies custom height', () => {
    const { container } = render(<ProgressBar percent={50} height={16} />);
    const track = container.querySelector('div > div');
    expect(track).toHaveStyle({ height: 16 });
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressBar percent={50} className="my-bar" />);
    expect(container.firstChild).toHaveClass('my-bar');
  });
});
