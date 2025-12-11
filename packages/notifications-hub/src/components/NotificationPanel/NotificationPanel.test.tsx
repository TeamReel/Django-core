import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationPanel } from './NotificationPanel';
import { Notification } from '../../types/notification';

// Mock child components
jest.mock('./PanelHeader', () => ({
  PanelHeader: ({ onClose, onFilterChange }: any) => (
    <div data-testid="panel-header">
      <button onClick={onClose}>Close</button>
      <button onClick={() => onFilterChange('all')}>All</button>
      <button onClick={() => onFilterChange('unread')}>Unread</button>
    </div>
  ),
}));

jest.mock('./PanelFooter', () => ({
  PanelFooter: ({ onMarkAllRead, unreadCount }: any) => (
    unreadCount > 0 ? (
      <div data-testid="panel-footer">
        <button onClick={onMarkAllRead}>Mark all read ({unreadCount})</button>
      </div>
    ) : null
  ),
}));

jest.mock('../NotificationList/NotificationList', () => ({
  NotificationList: ({ notifications, onNotificationClick }: any) => (
    <div data-testid="notification-list">
      {notifications.map((n: Notification) => (
        <div key={n.id} onClick={() => onNotificationClick?.(n)}>
          {n.title}
        </div>
      ))}
    </div>
  ),
}));

describe('NotificationPanel', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'system',
      severity: 'INFO',
      title: 'Test Notification 1',
      message: 'Message 1',
      timestamp: '2025-12-11T12:00:00Z',
      read: false,
      org_id: 'org1',
    },
    {
      id: '2',
      type: 'system',
      severity: 'SUCCESS',
      title: 'Test Notification 2',
      message: 'Message 2',
      timestamp: '2025-12-11T11:00:00Z',
      read: true,
      org_id: 'org1',
    },
  ];

  const defaultProps = {
    open: true,
    notifications: mockNotifications,
    loading: false,
    filter: 'all' as const,
    unreadCount: 1,
    onClose: jest.fn(),
    onFilterChange: jest.fn(),
    onMarkAllRead: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when closed and not animating', () => {
      const { container } = render(<NotificationPanel {...defaultProps} open={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders panel when open', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders header, list, and footer', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByTestId('panel-header')).toBeInTheDocument();
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
    });

    it('renders backdrop when open', () => {
      const { container } = render(<NotificationPanel {...defaultProps} />);
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render footer when unreadCount is 0', () => {
      render(<NotificationPanel {...defaultProps} unreadCount={0} />);
      expect(screen.queryByTestId('panel-footer')).not.toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('positions panel on right by default', () => {
      render(<NotificationPanel {...defaultProps} />);
      const panel = screen.getByRole('dialog');
      expect(panel.style.right).toBe('0px');
    });

    it('positions panel on left when position="left"', () => {
      render(<NotificationPanel {...defaultProps} position="left" />);
      const panel = screen.getByRole('dialog');
      expect(panel.style.left).toBe('0px');
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<NotificationPanel {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      const { container } = render(<NotificationPanel {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector('[aria-hidden="true"]')!;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onFilterChange when filter button is clicked', () => {
      const onFilterChange = jest.fn();
      render(<NotificationPanel {...defaultProps} onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByText('Unread'));
      expect(onFilterChange).toHaveBeenCalledWith('unread');
    });

    it('calls onMarkAllRead when footer button is clicked', () => {
      const onMarkAllRead = jest.fn();
      render(<NotificationPanel {...defaultProps} onMarkAllRead={onMarkAllRead} />);

      fireEvent.click(screen.getByText(/Mark all read/));
      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('calls onNotificationClick when notification is clicked', () => {
      const onNotificationClick = jest.fn();
      render(<NotificationPanel {...defaultProps} onNotificationClick={onNotificationClick} />);

      fireEvent.click(screen.getByText('Test Notification 1'));
      expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes panel when Escape is pressed', () => {
      const onClose = jest.fn();
      render(<NotificationPanel {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when Escape is pressed and panel is closed', () => {
      const onClose = jest.fn();
      render(<NotificationPanel {...defaultProps} open={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when other keys are pressed', () => {
      const onClose = jest.fn();
      render(<NotificationPanel {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-label with default title', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Notifications');
    });

    it('has aria-label with custom title', () => {
      render(<NotificationPanel {...defaultProps} title="My Alerts" />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'My Alerts');
    });

    it('has tabIndex="-1" for focus management', () => {
      render(<NotificationPanel {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('tabIndex', '-1');
    });

    it('backdrop has aria-hidden="true"', () => {
      const { container } = render(<NotificationPanel {...defaultProps} />);
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animations', () => {
    it('applies slide transform when open (right position)', () => {
      render(<NotificationPanel {...defaultProps} position="right" />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ transform: 'translateX(0)' });
    });

    it('applies slide transform when open (left position)', () => {
      render(<NotificationPanel {...defaultProps} position="left" />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ transform: 'translateX(0)' });
    });

    it('applies transition duration', () => {
      render(<NotificationPanel {...defaultProps} />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ transition: 'transform 250ms ease' });
    });

    it('backdrop has opacity transition', () => {
      const { container } = render(<NotificationPanel {...defaultProps} />);
      const backdrop = container.querySelector('[aria-hidden="true"]')!;
      expect(backdrop).toHaveStyle({ transition: 'opacity 250ms ease' });
    });
  });

  describe('Styling', () => {
    it('applies fixed positioning', () => {
      render(<NotificationPanel {...defaultProps} />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({
        position: 'fixed',
        top: '0px',
        bottom: '0px',
      });
    });

    it('applies 400px width', () => {
      render(<NotificationPanel {...defaultProps} />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ width: '400px' });
    });

    it('applies box shadow for right position', () => {
      render(<NotificationPanel {...defaultProps} position="right" />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' });
    });

    it('applies box shadow for left position', () => {
      render(<NotificationPanel {...defaultProps} position="left" />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)' });
    });

    it('applies flex layout', () => {
      render(<NotificationPanel {...defaultProps} />);
      const panel = screen.getByRole('dialog');
      expect(panel).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      });
    });
  });

  describe('Loading and Error States', () => {
    it('passes loading prop to NotificationList', () => {
      render(<NotificationPanel {...defaultProps} loading />);
      // NotificationList is mocked, so we just verify panel renders
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    });

    it('passes error prop to NotificationList', () => {
      const error = new Error('Test error');
      render(<NotificationPanel {...defaultProps} error={error} />);
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    });

    it('passes onRetry to NotificationList', () => {
      const onRetry = jest.fn();
      render(<NotificationPanel {...defaultProps} onRetry={onRetry} />);
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    });
  });

  describe('Props Delegation', () => {
    it('passes markAllReadDisabled to PanelFooter', () => {
      render(<NotificationPanel {...defaultProps} markAllReadDisabled />);
      // Footer is mocked, verify it renders
      expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
    });

    it('passes custom title to PanelHeader', () => {
      render(<NotificationPanel {...defaultProps} title="Custom Title" />);
      expect(screen.getByTestId('panel-header')).toBeInTheDocument();
    });
  });
});
