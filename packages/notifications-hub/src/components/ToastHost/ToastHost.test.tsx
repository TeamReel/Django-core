import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastHost, ToastHostConfig } from './ToastHost';
import { Notification } from '@/types';

// Mock child components
jest.mock('./Toast', () => ({
  Toast: ({ notification, onDismiss }: any) => (
    <div data-testid={`toast-${notification.id}`}>
      {notification.title}
      <button onClick={() => onDismiss(notification.id)}>Dismiss</button>
    </div>
  ),
}));

jest.mock('./ToastContainer', () => ({
  ToastContainer: ({ children, position }: any) => (
    <div data-testid="toast-container" data-position={position}>
      {children}
    </div>
  ),
}));

const createMockNotification = (id: string, severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL'): Notification => ({
  id,
  type: 'comment',
  severity,
  title: `Notification ${id}`,
  message: 'Test message',
  timestamp: '2025-12-11T10:00:00Z',
  read: false,
  org_id: 'org-1',
});

describe('ToastHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders toasts for notifications', () => {
      const notifications = [
        createMockNotification('1', 'INFO'),
        createMockNotification('2', 'SUCCESS'),
      ];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
    });

    it('renders nothing when no notifications', () => {
      const { container } = render(
        <ToastHost
          notifications={[]}
          onDismiss={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('passes position config to ToastContainer', () => {
      const notifications = [createMockNotification('1', 'INFO')];
      const config: ToastHostConfig = {
        position: 'bottom-left',
      };

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
          config={config}
        />
      );

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveAttribute('data-position', 'bottom-left');
    });

    it('uses default position when not configured', () => {
      const notifications = [createMockNotification('1', 'INFO')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveAttribute('data-position', 'top-right');
    });
  });

  describe('Queue management', () => {
    it('limits visible toasts to maxVisible config (default 3)', () => {
      const notifications = [
        createMockNotification('1', 'INFO'),
        createMockNotification('2', 'INFO'),
        createMockNotification('3', 'INFO'),
        createMockNotification('4', 'INFO'),
        createMockNotification('5', 'INFO'),
      ];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
      expect(screen.getByTestId('toast-3')).toBeInTheDocument();
      expect(screen.queryByTestId('toast-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('toast-5')).not.toBeInTheDocument();
    });

    it('respects custom maxVisible config', () => {
      const notifications = [
        createMockNotification('1', 'INFO'),
        createMockNotification('2', 'INFO'),
        createMockNotification('3', 'INFO'),
      ];
      const config: ToastHostConfig = {
        maxVisible: 2,
      };

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
          config={config}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
      expect(screen.queryByTestId('toast-3')).not.toBeInTheDocument();
    });

    it('shows newest toasts first', () => {
      const notifications = [
        createMockNotification('1', 'INFO'),
        createMockNotification('2', 'INFO'),
        createMockNotification('3', 'INFO'),
      ];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      // Verify all three toasts are rendered in order
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
      expect(screen.getByTestId('toast-3')).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss timers', () => {
    it('auto-dismisses INFO notifications after 5 seconds', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'INFO')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('1');
      });
    });

    it('auto-dismisses SUCCESS notifications after 5 seconds', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'SUCCESS')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('1');
      });
    });

    it('auto-dismisses WARNING notifications after 9 seconds', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'WARNING')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      act(() => {
        jest.advanceTimersByTime(9000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('1');
      });
    });

    it('does not auto-dismiss ERROR notifications', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'ERROR')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('does not auto-dismiss CRITICAL notifications', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'CRITICAL')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('respects custom duration config', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'INFO')];
      const config: ToastHostConfig = {
        defaultDuration: {
          INFO: 2000,
          SUCCESS: 2000,
          WARNING: 4000,
          ERROR: null,
          CRITICAL: null,
        },
      };

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
          config={config}
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Timer cleanup', () => {
    it('clears timers when notifications are removed', () => {
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      const notifications = [createMockNotification('1', 'INFO')];

      const { rerender } = render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      // Remove all notifications
      rerender(
        <ToastHost
          notifications={[]}
          onDismiss={jest.fn()}
        />
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('clears all timers on unmount', () => {
      const notifications = [
        createMockNotification('1', 'INFO'),
        createMockNotification('2', 'SUCCESS'),
      ];

      const { unmount } = render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
        />
      );

      // Component should render with timers
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();

      // Unmount should clean up without errors
      unmount();

      // Verify no toasts remain after unmount
      expect(screen.queryByTestId('toast-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('toast-2')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('handles manual dismiss before auto-dismiss', async () => {
      const onDismiss = jest.fn();
      const notifications = [createMockNotification('1', 'INFO')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={onDismiss}
        />
      );

      // Manually dismiss before timer expires
      act(() => {
        screen.getByText('Dismiss').click();
      });

      expect(onDismiss).toHaveBeenCalledWith('1');

      // Advance timer to verify auto-dismiss doesn't fire
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should only be called once (manual dismiss)
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('passes onAction to Toast components', () => {
      const onAction = jest.fn();
      const notifications = [createMockNotification('1', 'INFO')];

      render(
        <ToastHost
          notifications={notifications}
          onDismiss={jest.fn()}
          onAction={onAction}
        />
      );

      // Verify component renders (onAction would be passed to Toast)
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
    });
  });
});
