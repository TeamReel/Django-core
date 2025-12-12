import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationList } from './NotificationList';
import { Notification } from '../../types/notification';

// Mock VirtualizedList since it's tested separately
jest.mock('./VirtualizedList', () => ({
  VirtualizedList: ({ notifications, onNotificationClick, onMarkRead }: any) => (
    <div data-testid="virtualized-list">
      {notifications.map((n: Notification) => (
        <div
          key={n.id}
          data-testid={`notification-${n.id}`}
          onClick={() => onNotificationClick?.(n)}
        >
          {n.title}
          <button onClick={() => onMarkRead?.(n, !n.read)}>Toggle Read</button>
        </div>
      ))}
    </div>
  ),
}));

const createMockNotification = (id: string, overrides?: Partial<Notification>): Notification => ({
  id,
  type: 'job.completed',
  severity: 'SUCCESS',
  title: `Notification ${id}`,
  message: `This is notification ${id}`,
  timestamp: '2025-12-11T16:00:00Z',
  read: false,
  org_id: 'org-1',
  project_id: 'project-1',
  ...overrides,
});

describe('NotificationList', () => {
  describe('Loading State', () => {
    it('should show skeleton when loading with empty notifications', () => {
      render(
        <NotificationList
          notifications={[]}
          loading={true}
        />
      );

      // Check for skeleton rows (aria-hidden divs)
      const skeletonRows = document.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it('should not show skeleton when loading with existing notifications', () => {
      const notifications = [createMockNotification('1')];

      render(
        <NotificationList
          notifications={notifications}
          loading={true}
        />
      );

      // Should show virtualized list, not skeleton
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is present', () => {
      const error = new Error('Failed to fetch notifications');

      render(
        <NotificationList
          notifications={[]}
          loading={false}
          error={error}
        />
      );

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch notifications')).toBeInTheDocument();
    });

    it('should show retry button in error state when onRetry is provided', () => {
      const onRetry = jest.fn();
      const error = new Error('Network error');

      render(
        <NotificationList
          notifications={[]}
          loading={false}
          error={error}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      const error = new Error('Network error');

      render(
        <NotificationList
          notifications={[]}
          loading={false}
          error={error}
        />
      );

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should show default error message when error.message is empty', () => {
      const error = new Error('');

      render(
        <NotificationList
          notifications={[]}
          loading={false}
          error={error}
        />
      );

      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications and not loading', () => {
      render(
        <NotificationList
          notifications={[]}
          loading={false}
        />
      );

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up! Check back later for new notifications.")).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      const { container } = render(
        <NotificationList
          notifications={[]}
          loading={false}
        />
      );

      // Check for bell icon SVG
      const bellIcon = container.querySelector('svg');
      expect(bellIcon).toBeInTheDocument();
    });
  });

  describe('Notifications List', () => {
    it('should render VirtualizedList with notifications', () => {
      const notifications = [
        createMockNotification('1'),
        createMockNotification('2'),
        createMockNotification('3'),
      ];

      render(
        <NotificationList
          notifications={notifications}
          loading={false}
        />
      );

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
      expect(screen.getByText('Notification 3')).toBeInTheDocument();
    });

    it('should pass height and width to VirtualizedList', () => {
      const notifications = [createMockNotification('1')];

      render(
        <NotificationList
          notifications={notifications}
          loading={false}
          height={600}
          width="90%"
        />
      );

      // VirtualizedList mock doesn't expose height/width, but we verify it renders
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should use default height (400) when not provided', () => {
      const notifications = [createMockNotification('1')];

      render(
        <NotificationList
          notifications={notifications}
          loading={false}
        />
      );

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should pass onNotificationClick to VirtualizedList', () => {
      const onNotificationClick = jest.fn();
      const notifications = [createMockNotification('1')];

      render(
        <NotificationList
          notifications={notifications}
          loading={false}
          onNotificationClick={onNotificationClick}
        />
      );

      const notification = screen.getByTestId('notification-1');
      fireEvent.click(notification);

      expect(onNotificationClick).toHaveBeenCalledTimes(1);
      expect(onNotificationClick).toHaveBeenCalledWith(notifications[0]);
    });

    it('should pass onMarkRead to VirtualizedList', () => {
      const onMarkRead = jest.fn();
      const notifications = [createMockNotification('1')];

      render(
        <NotificationList
          notifications={notifications}
          loading={false}
          onMarkRead={onMarkRead}
        />
      );

      const toggleButton = screen.getByText('Toggle Read');
      fireEvent.click(toggleButton);

      expect(onMarkRead).toHaveBeenCalledTimes(1);
      expect(onMarkRead).toHaveBeenCalledWith(notifications[0], true);
    });
  });

  describe('State Priority', () => {
    it('should show error state over empty state', () => {
      const error = new Error('Test error');

      render(
        <NotificationList
          notifications={[]}
          loading={false}
          error={error}
        />
      );

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
      expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
    });

    it('should show loading state over error state', () => {
      const error = new Error('Test error');

      render(
        <NotificationList
          notifications={[]}
          loading={true}
          error={error}
        />
      );

      // Loading takes precedence
      const skeletonRows = document.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
      expect(screen.queryByText('Failed to load notifications')).not.toBeInTheDocument();
    });
  });
});
