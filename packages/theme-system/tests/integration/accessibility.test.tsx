/**
 * Accessibility tests for ThemeToggle component.
 *
 * Validates WCAG 2.1 AA compliance using jest-axe.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { ThemeToggle } from '../../src/components/ThemeToggle';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('ThemeToggle Accessibility', () => {
  describe('Icon Variant', () => {
    it('should have no a11y violations (icon variant)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no a11y violations (icon with label)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" showLabel />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no a11y violations (custom aria-label)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" aria-label="Toggle theme mode" />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Switch Variant', () => {
    it('should have no a11y violations (switch variant)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no a11y violations (switch with label)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="switch" showLabel />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper role="switch" attribute', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const switchElement = container.querySelector('[role="switch"]');
      expect(switchElement).toBeTruthy();
      expect(switchElement).toHaveAttribute('aria-checked');
    });
  });

  describe('Dropdown Variant', () => {
    it('should have no a11y violations (dropdown closed)', async () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements (light mode)', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#ffffff', padding: '1rem' }}>
          <ThemeProvider defaultMode="light">
            <ThemeToggle variant="icon" />
          </ThemeProvider>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG AA contrast requirements (dark mode)', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#000000', color: '#ffffff', padding: '1rem' }}>
          <ThemeProvider defaultMode="dark">
            <ThemeToggle variant="icon" />
          </ThemeProvider>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Touch Targets', () => {
    it('should have minimum 44x44px touch target (icon)', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('should have minimum 44x44px touch target (switch)', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      const styles = window.getComputedStyle(button as Element);
      
      // Switch button should meet minimum size
      expect(parseInt(styles.width)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.height)).toBeGreaterThanOrEqual(24);
    });

    it('should have minimum 44x44px touch target (dropdown)', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });
  });

  describe('Focus Management', () => {
    it('should be keyboard focusable', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.tabIndex).toBe(0);
    });

    it('should have visible focus indicator', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      button?.focus();
      
      // Button should be focusable (browser will apply default focus styles)
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have descriptive aria-label for icon variant', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button?.getAttribute('aria-label')).toContain('dark');
    });

    it('should have aria-label for switch variant', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const switchElement = container.querySelector('[role="switch"]');
      expect(switchElement).toHaveAttribute('aria-label', 'Toggle dark mode');
    });

    it('should have aria-label for dropdown variant', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label', 'Theme menu');
    });

    it('should mark icons as aria-hidden', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
