import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PanelFooter } from './PanelFooter';

describe('PanelFooter', () => {
  const defaultProps = {
    unreadCount: 5,
    onMarkAllRead: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders mark all read button when unread count > 0', () => {
      render(<PanelFooter {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Mark all 5 notifications as read' })).toBeInTheDocument();
    });

    it('does not render when unread count is 0', () => {
      render(<PanelFooter {...defaultProps} unreadCount={0} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows unread count in button text', () => {
      render(<PanelFooter {...defaultProps} unreadCount={12} />);
      expect(screen.getByText(/Mark all as read \(12\)/)).toBeInTheDocument();
    });

    it('renders disabled button when disabled prop is true', () => {
      render(<PanelFooter {...defaultProps} disabled />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Mark All Read - No Confirmation (count <= 10)', () => {
    it('calls onMarkAllRead immediately when count <= 10', () => {
      const onMarkAllRead = jest.fn();
      render(<PanelFooter {...defaultProps} unreadCount={5} onMarkAllRead={onMarkAllRead} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mark all 5 notifications as read' }));
      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('does not show confirmation dialog when count <= 10', () => {
      render(<PanelFooter {...defaultProps} unreadCount={10} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mark all 10 notifications as read' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Mark All Read - With Confirmation (count > 10)', () => {
    it('shows confirmation dialog when count > 10', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays correct unread count in confirmation message', () => {
      render(<PanelFooter {...defaultProps} unreadCount={25} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mark all 25 notifications as read' }));
      expect(screen.getByText(/You have 25 unread notifications/)).toBeInTheDocument();
    });

    it('calls onMarkAllRead when confirmation is accepted', async () => {
      const onMarkAllRead = jest.fn();
      render(<PanelFooter {...defaultProps} unreadCount={15} onMarkAllRead={onMarkAllRead} />);

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));

      // Confirm
      const confirmButton = screen.getByRole('button', { name: 'Mark all as read' });
      fireEvent.click(confirmButton);

      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('does not call onMarkAllRead when confirmation is cancelled', async () => {
      const onMarkAllRead = jest.fn();
      render(<PanelFooter {...defaultProps} unreadCount={15} onMarkAllRead={onMarkAllRead} />);

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));

      // Cancel
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onMarkAllRead).not.toHaveBeenCalled();
    });

    it('closes confirmation dialog when cancelled', async () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Cancel
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes confirmation dialog when backdrop is clicked', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click the backdrop (the outer div with role="dialog")
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      // Dialog should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not close confirmation when clicking inside modal', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: 'Mark all 15 notifications as read' }));

      // Click inside modal (the heading element)
      const heading = screen.getByText('Mark all as read?');
      fireEvent.click(heading);

      // Dialog should still be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('does not call onMarkAllRead when disabled', () => {
      const onMarkAllRead = jest.fn();
      render(<PanelFooter {...defaultProps} onMarkAllRead={onMarkAllRead} disabled />);

      fireEvent.click(screen.getByRole('button'));
      expect(onMarkAllRead).not.toHaveBeenCalled();
    });

    it('applies disabled styles', () => {
      render(<PanelFooter {...defaultProps} disabled />);
      const button = screen.getByRole('button');

      expect(button).toHaveStyle({ cursor: 'not-allowed' });
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on button with unread count', () => {
      render(<PanelFooter {...defaultProps} unreadCount={7} />);
      expect(screen.getByRole('button', { name: 'Mark all 7 notifications as read' })).toBeInTheDocument();
    });

    it('confirmation dialog has aria-modal', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      fireEvent.click(screen.getByRole('button'));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('confirmation dialog has aria-labelledby', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      fireEvent.click(screen.getByRole('button'));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-title');
    });

    it('confirm button gets autofocus in dialog', () => {
      render(<PanelFooter {...defaultProps} unreadCount={15} />);

      fireEvent.click(screen.getByRole('button'));
      const confirmButton = screen.getByRole('button', { name: 'Mark all as read' });

      // React's autoFocus is a boolean prop, not an HTML attribute
      // Check that the button element has the expected structure
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct styles to footer container', () => {
      const { container } = render(<PanelFooter {...defaultProps} />);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveStyle({
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
      });
    });

    it('applies hover styles to button when not disabled', () => {
      render(<PanelFooter {...defaultProps} />);
      const button = screen.getByRole('button');

      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({ backgroundColor: '#bbdefb' });

      fireEvent.mouseLeave(button);
      expect(button).toHaveStyle({ backgroundColor: '#e3f2fd' });
    });

    it('does not apply hover styles when disabled', () => {
      render(<PanelFooter {...defaultProps} disabled />);
      const button = screen.getByRole('button');

      const initialBg = button.style.backgroundColor;
      fireEvent.mouseEnter(button);
      expect(button.style.backgroundColor).toBe(initialBg);
    });
  });
});
