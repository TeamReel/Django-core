import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Grid } from './Grid';

describe('Grid', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Grid>
          <div>Child 1</div>
          <div>Child 2</div>
        </Grid>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('applies grid display', () => {
      const { container } = render(
        <Grid>
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toBeTruthy();
    });
  });

  describe('Column Configuration', () => {
    it('applies default 12 columns', () => {
      const { container } = render(
        <Grid>
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gridTemplateColumns).toBe('repeat(12, 1fr)');
    });

    it('applies custom number of columns', () => {
      const { container } = render(
        <Grid columns={3}>
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    });

    it('applies custom template string', () => {
      const { container } = render(
        <Grid columns="200px 1fr 200px">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gridTemplateColumns).toBe('200px 1fr 200px');
    });
  });

  describe('Gap Spacing', () => {
    it('applies default gap (4)', () => {
      const { container } = render(
        <Grid>
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gap).toBeTruthy();
    });

    it('applies custom gap', () => {
      const { container } = render(
        <Grid gap="8">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gap).toBeTruthy();
    });

    it('applies separate row and column gaps', () => {
      const { container } = render(
        <Grid rowGap="2" columnGap="6">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.rowGap).toBeTruthy();
      expect(grid.style.columnGap).toBeTruthy();
    });

    it('rowGap overrides gap for rows', () => {
      const { container } = render(
        <Grid gap="4" rowGap="8">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gap).toBeTruthy();
      expect(grid.style.rowGap).toBeTruthy();
    });

    it('columnGap overrides gap for columns', () => {
      const { container } = render(
        <Grid gap="4" columnGap="8">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gap).toBeTruthy();
      expect(grid.style.columnGap).toBeTruthy();
    });
  });

  describe('HTML Attributes', () => {
    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Grid ref={ref}>
          <div>Child</div>
        </Grid>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      const { container } = render(
        <Grid className="custom-class">
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('custom-class');
    });

    it('merges custom style', () => {
      const { container } = render(
        <Grid style={{ backgroundColor: 'red' }}>
          <div>Child</div>
        </Grid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.style.backgroundColor).toBe('red');
    });

    it('spreads additional props', () => {
      render(
        <Grid data-testid="grid-test">
          <div>Child</div>
        </Grid>
      );

      expect(screen.getByTestId('grid-test')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations (default)', async () => {
      const { container } = render(
        <Grid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Grid>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (custom columns)', async () => {
      const { container } = render(
        <Grid columns={3}>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </Grid>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (with gaps)', async () => {
      const { container } = render(
        <Grid rowGap="4" columnGap="6">
          <div>Content 1</div>
          <div>Content 2</div>
        </Grid>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
