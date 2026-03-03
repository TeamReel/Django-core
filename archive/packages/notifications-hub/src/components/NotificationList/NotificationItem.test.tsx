import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationItem } from './NotificationItem';
import { Notification } from '../../types/notification';

// Mock date-fns to avoid timezone issues in tests
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

const createMockNotification = (overrides?: Partial<Notification>): Notification => ({
  id: 'test-notification-1',
  type: 'job.completed',
  severity: 'SUCCESS',
  title: 'Test Notification',
  message: 'This is a test notification message',
  timestamp: '2025-12-11T16:00:00Z',
  read: false,
  org_id: 'org-1',
  project_id: 'project-1',
  ...overrides,
});

describe('NotificationItem', () => {
  describe('Rendering', () => {
    it('should render notification title and message', () => {
      const notification = createMockNotification();
      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(screen.getByText('This is a test notification message')).toBeInTheDocument();
    });

    it('should render formatted timestamp', () => {
      const notification = createMockNotification();
      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('should render severity indicator icon', () => {
      const notification = createMockNotification({ severity: 'SUCCESS' });
      const { container } = render(<NotificationItem notification={notification} />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('S'); // First letter of SUCCESS
    });
  });

  describe('Read/Unread Styling', () => {
    it('should apply unread styling (blue background, bold title) for unread notifications', () => {
      const notification = createMockNotification({ read: false });
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveStyle({ backgroundColor: '#f0f7ff' });

      const title = screen.getByText('Test Notification');
      expect(title).toHaveStyle({ fontWeight: 'bold' });
    });

    it('should apply read styling (white background, normal weight) for read notifications', () => {
      const notification = createMockNotification({ read: true });
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveStyle({ backgroundColor: '#ffffff' });

      const title = screen.getByText('Test Notification');
      expect(title).toHaveStyle({ fontWeight: 'normal' });
    });
  });

  describe('Severity Colors', () => {
    it.each([
      ['INFO', '#2196f3'],
      ['SUCCESS', '#4caf50'],
      ['WARNING', '#ff9800'],
      ['ERROR', '#f44336'],
      ['CRITICAL', '#d32f2f'],
    ])('should apply correct color for %s severity', (severity, expectedColor) => {
      const notification = createMockNotification({ severity: severity as any });
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveStyle({ borderLeft: `4px solid ${expectedColor}` });
    });
  });

  describe('Click Interactions', () => {
    it('should call onClick when notification is clicked', () => {
      const onClick = jest.fn();
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} onClick={onClick} />);

      const itemWrapper = container.firstChild as HTMLElement;
      fireEvent.click(itemWrapper);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(notification);
    });

    it('should call onClick when Enter key is pressed', () => {
      const onClick = jest.fn();
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} onClick={onClick} />);

      const itemWrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(itemWrapper, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(notification);
    });

    it('should call onClick when Space key is pressed', () => {
      const onClick = jest.fn();
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} onClick={onClick} />);

      const itemWrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(itemWrapper, { key: ' ' });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(notification);
    });

    it('should not call onClick for other keys', () => {
      const onClick = jest.fn();
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} onClick={onClick} />);

      const itemWrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(itemWrapper, { key: 'Tab' });

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should not throw if onClick is not provided', () => {
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(() => fireEvent.click(itemWrapper)).not.toThrow();
    });
  });

  describe('Mark as Read Action', () => {
    it('should call onMarkRead from NotificationActions', () => {
      const onMarkRead = jest.fn();
      const notification = createMockNotification({ read: false });
      render(<NotificationItem notification={notification} onMarkRead={onMarkRead} />);

      // Find mark as read button (button with "Mark as read" aria-label)
      const markReadButton = screen.getByLabelText('Mark as read');
      fireEvent.click(markReadButton);

      expect(onMarkRead).toHaveBeenCalledTimes(1);
      expect(onMarkRead).toHaveBeenCalledWith(notification, true);
    });

    it('should not throw if onMarkRead is not provided', () => {
      const notification = createMockNotification();
      render(<NotificationItem notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      expect(() => fireEvent.click(markReadButton)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have role button', () => {
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveAttribute('role', 'button');
    });

    it('should be keyboard focusable', () => {
      const notification = createMockNotification();
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveAttribute('tabIndex', '0');
    });

    it('should have descriptive aria-label for unread notifications', () => {
      const notification = createMockNotification({ read: false });
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveAttribute('aria-label', 'Notification: Test Notification. Unread');
    });

    it('should have descriptive aria-label for read notifications', () => {
      const notification = createMockNotification({ read: true });
      const { container } = render(<NotificationItem notification={notification} />);

      const itemWrapper = container.firstChild as HTMLElement;
      expect(itemWrapper).toHaveAttribute('aria-label', 'Notification: Test Notification. Read');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid timestamp gracefully', () => {
      const notification = createMockNotification({ timestamp: 'invalid-date' });
      render(<NotificationItem notification={notification} />);

      // date-fns is mocked to always return '2 hours ago', so we check for that
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('should truncate long titles with ellipsis', () => {
      const longTitle = 'A'.repeat(200);
      const notification = createMockNotification({ title: longTitle });
      const { container } = render(<NotificationItem notification={notification} />);

      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveStyle({ textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    });

    it('should truncate long messages with line clamp', () => {
      const longMessage = 'B'.repeat(500);
      const notification = createMockNotification({ message: longMessage });
      const { container } = render(<NotificationItem notification={notification} />);

      const messageElement = screen.getByText(longMessage);
      // Check for -webkit-box-orient which is set alongside WebkitLineClamp
      expect(messageElement).toHaveStyle({ display: '-webkit-box' });
    });
  });
});
