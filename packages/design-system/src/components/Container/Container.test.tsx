import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Container } from './Container';

describe('Container', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Container>
          <div>Child content</div>
        </Container>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('applies container styles', () => {
      const { container } = render(
        <Container>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toBeTruthy();
    });
  });

  describe('Max Width Variants', () => {
    it('applies default maxWidth (lg)', () => {
      const { container } = render(
        <Container>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('lg');
    });

    it('applies sm maxWidth', () => {
      const { container } = render(
        <Container maxWidth="sm">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('sm');
    });

    it('applies md maxWidth', () => {
      const { container } = render(
        <Container maxWidth="md">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('md');
    });

    it('applies lg maxWidth', () => {
      const { container } = render(
        <Container maxWidth="lg">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('lg');
    });

    it('applies xl maxWidth', () => {
      const { container } = render(
        <Container maxWidth="xl">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('xl');
    });

    it('applies full maxWidth', () => {
      const { container } = render(
        <Container maxWidth="full">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('full');
    });
  });

  describe('Centering', () => {
    it('centers by default', () => {
      const { container } = render(
        <Container>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('centered');
    });

    it('applies centered when explicitly true', () => {
      const { container } = render(
        <Container centered={true}>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('centered');
    });

    it('does not center when false', () => {
      const { container } = render(
        <Container centered={false}>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).not.toContain('centered');
    });
  });

  describe('Padding', () => {
    it('applies default padding (4)', () => {
      const { container } = render(
        <Container>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.style.paddingInline).toBeTruthy();
    });

    it('applies custom padding', () => {
      const { container } = render(
        <Container padding="8">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.style.paddingInline).toBeTruthy();
    });

    it('applies small padding', () => {
      const { container } = render(
        <Container padding="2">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.style.paddingInline).toBeTruthy();
    });
  });

  describe('HTML Attributes', () => {
    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Container ref={ref}>
          <div>Content</div>
        </Container>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      const { container } = render(
        <Container className="custom-class">
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.className).toContain('custom-class');
    });

    it('merges custom style', () => {
      const { container } = render(
        <Container style={{ backgroundColor: 'red' }}>
          <div>Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      expect(containerEl.style.backgroundColor).toBe('red');
    });

    it('spreads additional props', () => {
      render(
        <Container data-testid="container-test">
          <div>Content</div>
        </Container>
      );

      expect(screen.getByTestId('container-test')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations (default)', async () => {
      const { container } = render(
        <Container>
          <main>
            <h1>Page Title</h1>
            <p>Content goes here</p>
          </main>
        </Container>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (small)', async () => {
      const { container } = render(
        <Container maxWidth="sm">
          <article>
            <h2>Article Title</h2>
            <p>Article content</p>
          </article>
        </Container>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (not centered)', async () => {
      const { container } = render(
        <Container centered={false}>
          <section>
            <h2>Section Title</h2>
            <p>Section content</p>
          </section>
        </Container>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
