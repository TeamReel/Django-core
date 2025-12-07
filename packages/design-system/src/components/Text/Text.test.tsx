import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Text } from './Text';

expect.extend(toHaveNoViolations);

describe('Text', () => {
  it('renders as p by default', () => {
    render(<Text>Content</Text>);
    const element = screen.getByText('Content');
    expect(element.tagName).toBe('P');
  });

  it('renders with md size by default', () => {
    const { container } = render(<Text>Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('md');
  });

  it('renders with normal weight by default', () => {
    const { container } = render(<Text>Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('normal');
  });

  it('renders with primary color by default', () => {
    const { container } = render(<Text>Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('primary');
  });

  it('renders xs size', () => {
    const { container } = render(<Text size="xs">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('xs');
  });

  it('renders sm size', () => {
    const { container } = render(<Text size="sm">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('sm');
  });

  it('renders lg size', () => {
    const { container } = render(<Text size="lg">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('lg');
  });

  it('renders xl size', () => {
    const { container } = render(<Text size="xl">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('xl');
  });

  it('renders medium weight', () => {
    const { container } = render(<Text weight="medium">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('medium');
  });

  it('renders semibold weight', () => {
    const { container } = render(<Text weight="semibold">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('semibold');
  });

  it('renders bold weight', () => {
    const { container } = render(<Text weight="bold">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('bold');
  });

  it('renders secondary color', () => {
    const { container } = render(<Text color="secondary">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('secondary');
  });

  it('renders tertiary color', () => {
    const { container } = render(<Text color="tertiary">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('tertiary');
  });

  it('renders error color', () => {
    const { container } = render(<Text color="error">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('error');
  });

  it('renders success color', () => {
    const { container } = render(<Text color="success">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('success');
  });

  it('supports as prop for span', () => {
    render(<Text as="span">Content</Text>);
    const element = screen.getByText('Content');
    expect(element.tagName).toBe('SPAN');
  });

  it('supports as prop for label', () => {
    render(<Text as="label">Content</Text>);
    const element = screen.getByText('Content');
    expect(element.tagName).toBe('LABEL');
  });

  it('supports as prop for div', () => {
    render(<Text as="div">Content</Text>);
    const element = screen.getByText('Content');
    expect(element.tagName).toBe('DIV');
  });

  it('forwards ref to element', () => {
    const ref = jest.fn();
    render(<Text ref={ref}>Content</Text>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLParagraphElement);
  });

  it('applies custom className', () => {
    const { container } = render(<Text className="custom-class">Content</Text>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('custom-class');
  });

  it('spreads additional props', () => {
    render(<Text data-testid="custom-text">Content</Text>);
    expect(screen.getByTestId('custom-text')).toBeInTheDocument();
  });

  it('combines size, weight, and color', () => {
    const { container } = render(
      <Text size="lg" weight="bold" color="error">
        Content
      </Text>
    );
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('lg');
    expect(element.className).toContain('bold');
    expect(element.className).toContain('error');
  });

  describe('accessibility', () => {
    it('has no accessibility violations (default)', async () => {
      const { container } = render(<Text>Default text content</Text>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (as label)', async () => {
      const { container } = render(
        <Text as="label" htmlFor="input">
          Label text
        </Text>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (with variants)', async () => {
      const { container } = render(
        <Text size="lg" weight="bold" color="error">
          Error message
        </Text>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
