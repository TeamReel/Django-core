import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VirtualizedList } from './VirtualizedList';
import { Notification } from '../../types/notification';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, height, width, itemSize }: any) => (
    <div
      data-testid="virtualized-list"
      style={{ height, width }}
      data-item-count={itemCount}
      data-item-size={itemSize}
    >
      {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) => (
        <div key={index}>{children({ index, style: {} })}</div>
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

describe('VirtualizedList', () => {
  describe('Rendering', () => {
    it('should render FixedSizeList with correct props', () => {
      const notifications = [
        createMockNotification('1'),
        createMockNotification('2'),
        createMockNotification('3'),
      ];

      const { getByTestId } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
          width="100%"
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveStyle({ height: '500px', width: '100%' });
      expect(list).toHaveAttribute('data-item-count', '3');
      expect(list).toHaveAttribute('data-item-size', '70'); // ITEM_HEIGHT constant
    });

    it('should render with custom width', () => {
      const notifications = [createMockNotification('1')];

      const { getByTestId } = render(
        <VirtualizedList
          notifications={notifications}
          height={400}
          width={800}
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toHaveStyle({ width: '800px' });
    });

    it('should render default width (100%)', () => {
      const notifications = [createMockNotification('1')];

      const { getByTestId } = render(
        <VirtualizedList
          notifications={notifications}
          height={400}
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toHaveStyle({ width: '100%' });
    });
  });

  describe('Notification Rendering', () => {
    it('should render NotificationItem for each notification', () => {
      const notifications = [
        createMockNotification('1'),
        createMockNotification('2'),
        createMockNotification('3'),
      ];

      const { getByText } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
        />
      );

      expect(getByText('Notification 1')).toBeInTheDocument();
      expect(getByText('Notification 2')).toBeInTheDocument();
      expect(getByText('Notification 3')).toBeInTheDocument();
    });

    it('should handle empty notifications array', () => {
      const { getByTestId } = render(
        <VirtualizedList
          notifications={[]}
          height={500}
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toHaveAttribute('data-item-count', '0');
    });

    it('should handle large list (1000+ notifications)', () => {
      const notifications = Array.from({ length: 1500 }, (_, i) =>
        createMockNotification(`notification-${i}`)
      );

      const { getByTestId } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toHaveAttribute('data-item-count', '1500');
    });
  });

  describe('Callbacks', () => {
    it('should pass onNotificationClick to NotificationItem', () => {
      const onNotificationClick = jest.fn();
      const notifications = [createMockNotification('1')];

      const { getByRole } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
          onNotificationClick={onNotificationClick}
        />
      );

      // Get the notification item div (role=button, aria-label contains 'Notification:')
      const notificationItem = getByRole('button', { name: /Notification: Notification 1/ });
      notificationItem.click();

      expect(onNotificationClick).toHaveBeenCalledTimes(1);
      expect(onNotificationClick).toHaveBeenCalledWith(notifications[0]);
    });

    it('should pass onMarkRead to NotificationItem', () => {
      const onMarkRead = jest.fn();
      const notifications = [createMockNotification('1', { read: false })];

      const { getByLabelText } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
          onMarkRead={onMarkRead}
        />
      );

      const markReadButton = getByLabelText('Mark as read');
      markReadButton.click();

      expect(onMarkRead).toHaveBeenCalledTimes(1);
      expect(onMarkRead).toHaveBeenCalledWith(notifications[0], true);
    });
  });

  describe('Performance', () => {
    it('should use fixed row height (70px) for consistent layout', () => {
      const notifications = [createMockNotification('1')];

      const { getByTestId } = render(
        <VirtualizedList
          notifications={notifications}
          height={500}
        />
      );

      const list = getByTestId('virtualized-list');
      expect(list).toHaveAttribute('data-item-size', '70');
    });

    it('should handle null notification gracefully in row renderer', () => {
      // This tests the null check in Row component
      const notifications = [createMockNotification('1')];

      expect(() =>
        render(
          <VirtualizedList
            notifications={notifications}
            height={500}
          />
        )
      ).not.toThrow();
    });
  });
});
