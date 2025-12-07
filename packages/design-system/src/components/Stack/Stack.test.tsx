import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Stack } from './Stack';

describe('Stack', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Stack>
          <div>Child 1</div>
          <div>Child 2</div>
        </Stack>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('applies default direction (column)', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('column');
    });

    it('applies row direction', () => {
      const { container } = render(
        <Stack direction="row">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('row');
    });

    it('applies column direction', () => {
      const { container } = render(
        <Stack direction="column">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('column');
    });
  });

  describe('Gap Spacing', () => {
    it('applies default gap (4)', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.gap).toBeTruthy();
    });

    it('applies custom gap', () => {
      const { container } = render(
        <Stack gap="8">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.gap).toBeTruthy();
    });
  });

  describe('Alignment', () => {
    it('applies align prop', () => {
      const { container } = render(
        <Stack align="center">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.alignItems).toBe('center');
    });

    it('applies justify prop', () => {
      const { container } = render(
        <Stack justify="space-between">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.justifyContent).toBe('space-between');
    });

    it('applies both align and justify', () => {
      const { container } = render(
        <Stack align="center" justify="center">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.alignItems).toBe('center');
      expect(stack.style.justifyContent).toBe('center');
    });
  });

  describe('Wrap Behavior', () => {
    it('does not apply wrap by default', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).not.toContain('wrap');
    });

    it('applies wrap when enabled', () => {
      const { container } = render(
        <Stack wrap>
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('wrap');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Stack ref={ref}>
          <div>Child</div>
        </Stack>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      const { container } = render(
        <Stack className="custom-class">
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('custom-class');
    });

    it('merges custom style', () => {
      const { container } = render(
        <Stack style={{ backgroundColor: 'red' }}>
          <div>Child</div>
        </Stack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.style.backgroundColor).toBe('red');
    });

    it('spreads additional props', () => {
      render(
        <Stack data-testid="stack-test">
          <div>Child</div>
        </Stack>
      );

      expect(screen.getByTestId('stack-test')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations (default)', async () => {
      const { container } = render(
        <Stack>
          <div>Child 1</div>
          <div>Child 2</div>
        </Stack>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (row)', async () => {
      const { container } = render(
        <Stack direction="row">
          <button>Button 1</button>
          <button>Button 2</button>
        </Stack>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (with alignment)', async () => {
      const { container } = render(
        <Stack align="center" justify="center">
          <div>Centered content</div>
        </Stack>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
