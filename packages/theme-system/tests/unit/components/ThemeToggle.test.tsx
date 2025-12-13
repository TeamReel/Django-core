/**
 * Unit tests for ThemeToggle component.
 *
 * Validates rendering and interaction behavior for all variants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../src/components/ThemeProvider';
import { ThemeToggle } from '../../../src/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-brand');
  });

  describe('Icon Variant', () => {
    it('should render icon variant by default', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should toggle theme from light to dark on click', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle theme from dark to system on click', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="dark">
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should show label when showLabel is true', () => {
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="icon" showLabel />
        </ThemeProvider>
      );

      expect(screen.getByText('light')).toBeInTheDocument();
    });

    it('should use custom aria-label', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="icon" aria-label="Custom theme toggle" />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Custom theme toggle')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" className="custom-class" />
        </ThemeProvider>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Switch Variant', () => {
    it('should render switch variant', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should toggle between light and dark', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toHaveAttribute('aria-checked', 'false');

      await user.click(switchButton);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(switchButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should show "Dark mode" label when showLabel is true', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="switch" showLabel />
        </ThemeProvider>
      );

      expect(screen.getByText('Dark mode')).toBeInTheDocument();
    });

    it('should have aria-checked attribute', () => {
      render(
        <ThemeProvider defaultMode="dark">
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Dropdown Variant', () => {
    it('should render dropdown button', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should open menu on click', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should show all three mode options', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should select mode on menu item click', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Dark'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should close menu after selection', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(screen.getByText('Dark'));

      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should show checkmark next to current mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button'));

      const lightOption = screen.getByText('Light').closest('button');
      expect(lightOption?.textContent).toContain('✓');
    });
  });

  describe('Accessibility', () => {
    it('should have minimum touch target size (44x44px)', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = container.querySelector('button');
      expect(button).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultMode="light">
          <ThemeToggle variant="icon" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should have proper ARIA attributes for switch', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="switch" />
        </ThemeProvider>
      );

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toHaveAttribute('aria-label', 'Toggle dark mode');
      expect(switchButton).toHaveAttribute('aria-checked');
    });

    it('should have proper ARIA attributes for dropdown', () => {
      render(
        <ThemeProvider>
          <ThemeToggle variant="dropdown" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded');
    });
  });
});
