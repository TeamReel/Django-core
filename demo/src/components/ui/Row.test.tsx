import { render, screen } from '@testing-library/react';
import { Row } from './Row';

describe('Row', () => {
  it('renders children', () => {
    render(<Row><span>A</span><span>B</span></Row>);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('applies default gap-8 class', () => {
    const { container } = render(<Row>Content</Row>);
    expect(container.firstChild).toHaveClass('flex-row', 'gap-8');
  });

  it('applies custom gap class', () => {
    const { container } = render(<Row gap={16}>Content</Row>);
    expect(container.firstChild).toHaveClass('flex-row', 'gap-16');
  });

  it('defaults to center alignment', () => {
    const { container } = render(<Row>Content</Row>);
    expect(container.firstChild).toHaveClass('items-center');
  });

  it('applies justify-between style', () => {
    const { container } = render(<Row justify="between">Content</Row>);
    expect(container.firstChild).toHaveStyle({ justifyContent: 'space-between' });
  });

  it('applies flex-wrap when wrap is true', () => {
    const { container } = render(<Row wrap>Content</Row>);
    expect(container.firstChild).toHaveClass('flex-wrap');
  });

  it('does not wrap by default', () => {
    const { container } = render(<Row>Content</Row>);
    expect(container.firstChild).not.toHaveClass('flex-wrap');
  });

  it('merges custom className and style', () => {
    const { container } = render(
      <Row className="custom" style={{ color: 'red' }}>Content</Row>
    );
    expect(container.firstChild).toHaveClass('custom');
    expect((container.firstChild as HTMLElement).style.color).toBe('red');
  });

  it('spreads extra HTML attributes', () => {
    render(<Row data-testid="my-row">Content</Row>);
    expect(screen.getByTestId('my-row')).toBeInTheDocument();
  });
});
