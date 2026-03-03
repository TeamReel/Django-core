import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, ToastProps } from './Toast';
import { Notification } from '@/types';

const mockNotification: Notification = {
  id: 'notif-1',
  type: 'comment',
  severity: 'INFO',
  title: 'New comment',
  message: 'You have a new comment on your post',
  timestamp: '2025-12-11T10:00:00Z',
  read: false,
  org_id: 'org-1',
};

const mockNotificationWithAction: Notification = {
  ...mockNotification,
  id: 'notif-2',
  action: {
    label: 'View Comment',
    type: 'navigate',
    target: '/comments/123',
  },
};

describe('Toast', () => {
  describe('Rendering', () => {
    it('renders notification title', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
        />
      );

      expect(screen.getByText('New comment')).toBeInTheDocument();
    });

    it('renders notification message', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
        />
      );

      expect(screen.getByText('You have a new comment on your post')).toBeInTheDocument();
    });

    it('renders without message if message is empty', () => {
      const notificationNoMessage = { ...mockNotification, message: '' };
      const { container } = render(
        <Toast
          notification={notificationNoMessage}
          onDismiss={jest.fn()}
        />
      );

      expect(container.textContent).toContain('New comment');
      expect(container.textContent).not.toContain('You have a new comment');
    });
  });

  describe('Styling variants', () => {
    it('applies info variant styling', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="info"
          onDismiss={jest.fn()}
        />
      );

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveStyle({
        backgroundColor: '#e3f2fd',
        borderLeft: '4px solid #2196f3',
      });
    });

    it('applies success variant styling', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="success"
          onDismiss={jest.fn()}
        />
      );

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveStyle({
        backgroundColor: '#e8f5e9',
        borderLeft: '4px solid #4caf50',
      });
    });

    it('applies warning variant styling', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="warning"
          onDismiss={jest.fn()}
        />
      );

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveStyle({
        backgroundColor: '#fff3e0',
        borderLeft: '4px solid #ff9800',
      });
    });

    it('applies error variant styling', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="error"
          onDismiss={jest.fn()}
        />
      );

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveStyle({
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #f44336',
      });
    });
  });

  describe('Actions', () => {
    it('renders action button when notification has action', () => {
      render(
        <Toast
          notification={mockNotificationWithAction}
          onDismiss={jest.fn()}
          onAction={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'View Comment' })).toBeInTheDocument();
    });

    it('calls onAction with notification id and action id when action clicked', () => {
      const onAction = jest.fn();
      render(
        <Toast
          notification={mockNotificationWithAction}
          onDismiss={jest.fn()}
          onAction={onAction}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'View Comment' }));

      expect(onAction).toHaveBeenCalledWith('notif-2', 'View Comment');
    });

    it('does not render action button when notification has no action', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /View/i })).not.toBeInTheDocument();
    });
  });

  describe('Dismiss behavior', () => {
    it('renders dismiss button when duration is not null', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
          duration={5000}
        />
      );

      expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
    });

    it('does not render dismiss button when duration is null (manual dismiss disabled)', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
          duration={null}
        />
      );

      expect(screen.queryByRole('button', { name: 'Dismiss notification' })).not.toBeInTheDocument();
    });

    it('calls onDismiss with notification id when dismiss button clicked', () => {
      const onDismiss = jest.fn();
      render(
        <Toast
          notification={mockNotification}
          onDismiss={onDismiss}
          duration={5000}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

      expect(onDismiss).toHaveBeenCalledWith('notif-1');
    });
  });

  describe('Accessibility', () => {
    it('has role="status" for screen readers', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
        />
      );

      expect(container.firstChild).toHaveAttribute('role', 'status');
    });

    it('has aria-live="polite" for non-error variants', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="info"
          onDismiss={jest.fn()}
        />
      );

      expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-live="assertive" for error variant', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          variant="error"
          onDismiss={jest.fn()}
        />
      );

      expect(container.firstChild).toHaveAttribute('aria-live', 'assertive');
    });

    it('has aria-atomic="true" for complete announcements', () => {
      const { container } = render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
        />
      );

      expect(container.firstChild).toHaveAttribute('aria-atomic', 'true');
    });

    it('action button has accessible label', () => {
      render(
        <Toast
          notification={mockNotificationWithAction}
          onDismiss={jest.fn()}
          onAction={jest.fn()}
        />
      );

      const button = screen.getByRole('button', { name: 'View Comment' });
      expect(button).toHaveAttribute('aria-label', 'View Comment');
    });

    it('dismiss button has accessible label', () => {
      render(
        <Toast
          notification={mockNotification}
          onDismiss={jest.fn()}
          duration={5000}
        />
      );

      const button = screen.getByRole('button', { name: 'Dismiss notification' });
      expect(button).toHaveAttribute('aria-label', 'Dismiss notification');
    });
  });
});
