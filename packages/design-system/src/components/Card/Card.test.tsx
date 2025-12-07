import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Card } from './Card';

expect.extend(toHaveNoViolations);

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Test content</Card>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies outlined variant by default', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('outlined');
  });

  it('applies elevated variant', () => {
    const { container } = render(<Card variant="elevated">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('elevated');
  });

  it('applies filled variant', () => {
    const { container } = render(<Card variant="filled">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('filled');
  });

  it('applies md padding by default', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('md');
  });

  it('applies none padding', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('none');
  });

  it('applies sm padding', () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('sm');
  });

  it('applies lg padding', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('lg');
  });

  it('forwards ref to div element', () => {
    const ref = jest.fn();
    render(<Card ref={ref}>Content</Card>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  it('spreads additional props', () => {
    render(<Card data-testid="custom-card">Content</Card>);
    expect(screen.getByTestId('custom-card')).toBeInTheDocument();
  });

  it('combines variant and padding', () => {
    const { container } = render(
      <Card variant="elevated" padding="lg">
        Content
      </Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('elevated');
    expect(card.className).toContain('lg');
  });

  describe('accessibility', () => {
    it('has no accessibility violations (outlined)', async () => {
      const { container } = render(<Card variant="outlined">Content</Card>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (elevated with nested content)', async () => {
      const { container } = render(
        <Card variant="elevated">
          <h2>Title</h2>
          <p>Description</p>
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (filled with no padding)', async () => {
      const { container } = render(
        <Card variant="filled" padding="none">
          Content
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
