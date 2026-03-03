/**
 * Unit tests for AlertStack component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertStack } from '../../src/components/AlertStack';

describe('AlertStack', () => {
  describe('rendering', () => {
    it('renders single alert', () => {
      render(
        <AlertStack>
          <div>Alert 1</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
    });

    it('renders multiple alerts', () => {
      render(
        <AlertStack>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
      expect(screen.getByText('Alert 3')).toBeInTheDocument();
    });

    it('renders ARIA region with label', () => {
      const { container } = render(
        <AlertStack>
          <div>Alert</div>
        </AlertStack>
      );

      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('aria-label', 'Alert notifications');
    });
  });

  describe('maxVisible prop', () => {
    it('shows all alerts when count <= maxVisible', () => {
      render(
        <AlertStack maxVisible={5}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
      expect(screen.getByText('Alert 3')).toBeInTheDocument();
      expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    it('limits visible alerts when count > maxVisible', () => {
      render(
        <AlertStack maxVisible={3}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
          <div>Alert 4</div>
          <div>Alert 5</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
      expect(screen.getByText('Alert 3')).toBeInTheDocument();
      expect(screen.queryByText('Alert 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Alert 5')).not.toBeInTheDocument();
    });

    it('uses default maxVisible of 5', () => {
      render(
        <AlertStack>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
          <div>Alert 4</div>
          <div>Alert 5</div>
          <div>Alert 6</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 5')).toBeInTheDocument();
      expect(screen.queryByText('Alert 6')).not.toBeInTheDocument();
    });
  });

  describe('View all button', () => {
    it('shows "View all" button when alerts > maxVisible', () => {
      render(
        <AlertStack maxVisible={2}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
        </AlertStack>
      );

      expect(screen.getByText('View all (3 alerts)')).toBeInTheDocument();
    });

    it('does not show "View all" when alerts <= maxVisible', () => {
      render(
        <AlertStack maxVisible={5}>
          <div>Alert 1</div>
          <div>Alert 2</div>
        </AlertStack>
      );

      expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    it('shows all alerts when "View all" clicked', async () => {
      const user = userEvent.setup();

      render(
        <AlertStack maxVisible={2}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
          <div>Alert 4</div>
        </AlertStack>
      );

      expect(screen.queryByText('Alert 3')).not.toBeInTheDocument();

      const viewAllButton = screen.getByText('View all (4 alerts)');
      await user.click(viewAllButton);

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
      expect(screen.getByText('Alert 3')).toBeInTheDocument();
      expect(screen.getByText('Alert 4')).toBeInTheDocument();
    });

    it('hides "View all" button after clicking', async () => {
      const user = userEvent.setup();

      render(
        <AlertStack maxVisible={2}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
        </AlertStack>
      );

      const viewAllButton = screen.getByText('View all (3 alerts)');
      await user.click(viewAllButton);

      expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    it('calls onViewAll callback when button clicked', async () => {
      const user = userEvent.setup();
      const onViewAll = vi.fn();

      render(
        <AlertStack maxVisible={2} onViewAll={onViewAll}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
        </AlertStack>
      );

      const viewAllButton = screen.getByText('View all (3 alerts)');
      await user.click(viewAllButton);

      expect(onViewAll).toHaveBeenCalledTimes(1);
    });

    it('has correct ARIA label on View all button', () => {
      render(
        <AlertStack maxVisible={2}>
          <div>Alert 1</div>
          <div>Alert 2</div>
          <div>Alert 3</div>
          <div>Alert 4</div>
          <div>Alert 5</div>
        </AlertStack>
      );

      const button = screen.getByRole('button', { name: 'View all 5 alerts' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    it('applies inline position by default', () => {
      const { container } = render(
        <AlertStack>
          <div>Alert</div>
        </AlertStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('inline');
    });

    it('applies top-center position', () => {
      const { container } = render(
        <AlertStack position="top-center">
          <div>Alert</div>
        </AlertStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('top-center');
    });

    it('applies inline position explicitly', () => {
      const { container } = render(
        <AlertStack position="inline">
          <div>Alert</div>
        </AlertStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('inline');
    });
  });

  describe('className', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <AlertStack className="custom-stack">
          <div>Alert</div>
        </AlertStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack.className).toContain('custom-stack');
    });

    it('handles undefined className', () => {
      const { container } = render(
        <AlertStack>
          <div>Alert</div>
        </AlertStack>
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles zero children', () => {
      const { container } = render(<AlertStack></AlertStack>);

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    it('handles single child', () => {
      render(
        <AlertStack maxVisible={5}>
          <div>Single Alert</div>
        </AlertStack>
      );

      expect(screen.getByText('Single Alert')).toBeInTheDocument();
      expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    it('handles maxVisible = 0', () => {
      render(
        <AlertStack maxVisible={0}>
          <div>Alert 1</div>
          <div>Alert 2</div>
        </AlertStack>
      );

      expect(screen.queryByText('Alert 1')).not.toBeInTheDocument();
      expect(screen.getByText('View all (2 alerts)')).toBeInTheDocument();
    });

    it('handles maxVisible = 1', () => {
      render(
        <AlertStack maxVisible={1}>
          <div>Alert 1</div>
          <div>Alert 2</div>
        </AlertStack>
      );

      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.queryByText('Alert 2')).not.toBeInTheDocument();
      expect(screen.getByText('View all (2 alerts)')).toBeInTheDocument();
    });
  });

  describe('integration', () => {
    it('works with complex alert components', () => {
      render(
        <AlertStack maxVisible={3}>
          <div role="alert" aria-live="assertive">
            <strong>Error:</strong> Something went wrong
          </div>
          <div role="alert" aria-live="polite">
            <strong>Warning:</strong> Check this
          </div>
          <div role="alert" aria-live="polite">
            <strong>Info:</strong> FYI
          </div>
        </AlertStack>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Check this')).toBeInTheDocument();
      expect(screen.getByText('FYI')).toBeInTheDocument();
    });
  });
});
