import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationActions } from './NotificationActions';
import { Notification } from '../../types/notification';

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

describe('NotificationActions', () => {
  describe('Rendering', () => {
    it('should render mark as read button for unread notifications', () => {
      const notification = createMockNotification({ read: false });
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      expect(markReadButton).toBeInTheDocument();
    });

    it('should render mark as unread button for read notifications', () => {
      const notification = createMockNotification({ read: true });
      render(<NotificationActions notification={notification} />);

      const markUnreadButton = screen.getByLabelText('Mark as unread');
      expect(markUnreadButton).toBeInTheDocument();
    });
  });

  describe('Mark as Read/Unread Action', () => {
    it('should call onMarkRead with true when marking unread notification as read', () => {
      const onMarkRead = jest.fn();
      const notification = createMockNotification({ read: false });
      render(<NotificationActions notification={notification} onMarkRead={onMarkRead} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      fireEvent.click(markReadButton);

      expect(onMarkRead).toHaveBeenCalledTimes(1);
      expect(onMarkRead).toHaveBeenCalledWith(true);
    });

    it('should call onMarkRead with false when marking read notification as unread', () => {
      const onMarkRead = jest.fn();
      const notification = createMockNotification({ read: true });
      render(<NotificationActions notification={notification} onMarkRead={onMarkRead} />);

      const markUnreadButton = screen.getByLabelText('Mark as unread');
      fireEvent.click(markUnreadButton);

      expect(onMarkRead).toHaveBeenCalledTimes(1);
      expect(onMarkRead).toHaveBeenCalledWith(false);
    });

    it('should not throw if onMarkRead is not provided', () => {
      const notification = createMockNotification();
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      expect(() => fireEvent.click(markReadButton)).not.toThrow();
    });
  });

  describe('Event Propagation', () => {
    it('should stop propagation when actions container is clicked', () => {
      const notification = createMockNotification();
      const { container } = render(
        <div onClick={jest.fn()}>
          <NotificationActions notification={notification} />
        </div>
      );

      const actionsContainer = container.querySelector('[style*="flex-shrink: 0"]');
      const event = new MouseEvent('click', { bubbles: true });
      const stopPropagation = jest.spyOn(event, 'stopPropagation');

      actionsContainer?.dispatchEvent(event);

      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should stop propagation when mark as read button is clicked', () => {
      const notification = createMockNotification();
      render(<NotificationActions notification={notification} onMarkRead={jest.fn()} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      const event = new MouseEvent('click', { bubbles: true });
      const stopPropagation = jest.spyOn(event, 'stopPropagation');

      markReadButton.dispatchEvent(event);

      expect(stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Button Icons', () => {
    it('should show filled circle with checkmark for unread notifications', () => {
      const notification = createMockNotification({ read: false });
      const { container } = render(<NotificationActions notification={notification} />);

      // Check for filled circle icon (checkmark path indicates "mark as read" action)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      const checkmarkPath = container.querySelector('path[d="M5 8L7 10L11 6"]');
      expect(checkmarkPath).toBeInTheDocument();
    });

    it('should show empty circle for read notifications', () => {
      const notification = createMockNotification({ read: true });
      const { container } = render(<NotificationActions notification={notification} />);

      // Check for empty circle icon (circle without fill)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      const emptyCircle = container.querySelector('circle[stroke="#757575"]');
      expect(emptyCircle).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for screen readers', () => {
      const notification = createMockNotification({ read: false });
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      expect(markReadButton).toHaveAttribute('aria-label', 'Mark as read');
    });

    it('should have title attribute for tooltip', () => {
      const notification = createMockNotification({ read: false });
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');
      expect(markReadButton).toHaveAttribute('title', 'Mark as read');
    });

    it('should hide icons from screen readers with aria-hidden', () => {
      const notification = createMockNotification();
      const { container } = render(<NotificationActions notification={notification} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Hover Styles', () => {
    it('should apply hover styles on mouse enter', () => {
      const notification = createMockNotification();
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');

      fireEvent.mouseEnter(markReadButton);

      expect(markReadButton).toHaveStyle({
        backgroundColor: '#f5f5f5',
        borderColor: '#bdbdbd',
      });
    });

    it('should remove hover styles on mouse leave', () => {
      const notification = createMockNotification();
      render(<NotificationActions notification={notification} />);

      const markReadButton = screen.getByLabelText('Mark as read');

      fireEvent.mouseEnter(markReadButton);
      fireEvent.mouseLeave(markReadButton);

      expect(markReadButton).toHaveStyle({
        backgroundColor: '#ffffff',
        borderColor: '#e0e0e0',
      });
    });
  });
});
