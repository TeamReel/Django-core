import { render, screen } from '@testing-library/react';
import { SplitView } from './SplitView';

describe('SplitView', () => {
  it('renders sidebar and main content', () => {
    render(
      <SplitView sidebar={<div>Sidebar content</div>}>
        Main content
      </SplitView>
    );
    expect(screen.getByText('Sidebar content')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('renders sidebar in aside element', () => {
    const { container } = render(
      <SplitView sidebar={<div>Nav</div>}>Body</SplitView>
    );
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('renders main in main element', () => {
    const { container } = render(
      <SplitView sidebar={<div>Nav</div>}>Body</SplitView>
    );
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('applies sidebar width style', () => {
    const { container } = render(
      <SplitView sidebar={<div>Nav</div>} sidebarWidth="320px">Body</SplitView>
    );
    const aside = container.querySelector('aside');
    expect(aside).toHaveStyle({ width: '320px' });
  });

  it('applies custom gap', () => {
    const { container } = render(
      <SplitView sidebar={<div>Nav</div>} gap={16}>Body</SplitView>
    );
    expect(container.firstChild).toHaveStyle({ gap: '16px' });
  });

  it('merges custom className', () => {
    const { container } = render(
      <SplitView sidebar={<div>Nav</div>} className="custom">Body</SplitView>
    );
    expect(container.firstChild).toHaveClass('custom');
  });
});
