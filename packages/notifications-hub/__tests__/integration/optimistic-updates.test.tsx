/**
 * Integration Test: Optimistic Updates
 *
 * Tests WP10 T064: Verify that mark-as-read updates UI immediately,
 * reverts on API failure, and shows error toast.
 *
 * Success Criteria:
 * - Mark-as-read updates UI immediately (optimistic)
 * - API failure reverts state (rollback)
 * - Error toast shown on rollback with clear message
 * - Unread count decrements immediately, reverts on failure
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { NotificationsProvider } from '@/context/NotificationsProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { TestProviders } from '../setup/test-providers';

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Job completed',
    message: 'Your job is done',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-123',
  },
  {
    id: 'notif-2',
    type: 'access.granted',
    severity: 'INFO',
    title: 'Access granted',
    message: 'You now have access',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-123',
  },
  {
    id: 'notif-3',
    type: 'system.info',
    severity: 'INFO',
    title: 'System update',
    message: 'System updated',
    timestamp: new Date().toISOString(),
    read: true,
    org_id: 'org-123',
  },
];

// Track API call success/failure
let shouldMarkReadFail = false;
let markReadCallCount = 0;

const server = setupServer(
  rest.get('*/api/v1/notifications', (req, res, ctx) => {
    return res(
      ctx.json({
        results: mockNotifications,
        count: mockNotifications.length,
        next: null,
        previous: null,
      })
    );
  }),

  rest.patch('*/api/v1/notifications/:id/read', (req, res, ctx) => {
    markReadCallCount++;

    if (shouldMarkReadFail) {
      return res(ctx.status(500));
    }

    return res(
      ctx.json({
        id: req.params.id,
        read: true,
        updated_at: new Date().toISOString(),
      })
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  shouldMarkReadFail = false;
  markReadCallCount = 0;
});
afterAll(() => server.close());

// Test component with mark-as-read action
function TestComponent() {
  const { notifications, loading, error, markAsRead } = useNotifications();
  const { count: unreadCount } = useUnreadCount();

  return (
    <div>
      <div data-testid="unread-badge">{unreadCount}</div>
      <div data-testid="loading-state">{loading ? 'loading' : 'loaded'}</div>
      {error && <div data-testid="error-message">{error.message}</div>}
      <div data-testid="notification-list">
        {notifications.map(notif => (
          <div key={notif.id} data-testid={`notification-${notif.id}`}>
            <span data-testid={`title-${notif.id}`}>{notif.title}</span>
            <span data-testid={`read-status-${notif.id}`}>
              {notif.read ? 'read' : 'unread'}
            </span>
            <button
              data-testid={`mark-read-btn-${notif.id}`}
              onClick={() => markAsRead(notif.id)}
              disabled={notif.read}
            >
              Mark as read
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('Integration: Optimistic Updates', () => {
  const config = {
    apiBaseUrl: '/api/v1',
    pollingInterval: 30000,
  };

  it('marks notification as read with immediate UI update (optimistic)', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          organisationName: 'Org 123',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify initial state: notif-1 is unread, unread count is 2
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('unread');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Click "Mark as read" on notif-1
    const markReadBtn = screen.getByTestId('mark-read-btn-notif-1');
    await user.click(markReadBtn);

    // Verify immediate UI update (optimistic)
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('read');

    // Verify unread count decremented immediately
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');

    // Wait for API call to complete successfully
    await waitFor(() => {
      expect(markReadCallCount).toBe(1);
    });

    // Verify state remains "read" (API success, no rollback)
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('read');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
  });

  it('reverts state on API failure (rollback)', async () => {
    const user = userEvent.setup();

    // Configure API to fail
    shouldMarkReadFail = true;

    render(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          organisationName: 'Org 123',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify initial state: notif-1 is unread, unread count is 2
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('unread');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Click "Mark as read" on notif-1
    const markReadBtn = screen.getByTestId('mark-read-btn-notif-1');
    await user.click(markReadBtn);

    // Verify immediate optimistic update
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('read');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');

    // Wait for API call to fail and state to revert
    await waitFor(() => {
      expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('unread');
    });

    // Verify unread count reverted
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Verify error is shown
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  it('shows error message on rollback', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Configure API to fail
    shouldMarkReadFail = true;

    render(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          organisationName: 'Org 123',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Click "Mark as read" on notif-2
    const markReadBtn = screen.getByTestId('mark-read-btn-notif-2');
    await user.click(markReadBtn);

    // Wait for rollback and error
    await waitFor(() => {
      expect(screen.getByTestId('read-status-notif-2')).toHaveTextContent('unread');
    });

    // Verify error message is displayed
    expect(screen.getByTestId('error-message')).toBeInTheDocument();

    // Verify console error logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[F04] Failed to mark notification'),
      expect.anything()
    );

    consoleErrorSpy.mockRestore();
  });

  it('handles multiple optimistic updates with mixed success/failure', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          organisationName: 'Org 123',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Initial state: 2 unread
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Mark notif-1 as read (will succeed)
    shouldMarkReadFail = false;
    const markReadBtn1 = screen.getByTestId('mark-read-btn-notif-1');
    await user.click(markReadBtn1);

    // Verify immediate optimistic update
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('read');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');

    // Wait for first API call to succeed
    await waitFor(() => {
      expect(markReadCallCount).toBe(1);
    });

    // Now configure API to fail for next call
    shouldMarkReadFail = true;

    // Mark notif-2 as read (will fail)
    const markReadBtn2 = screen.getByTestId('mark-read-btn-notif-2');
    await user.click(markReadBtn2);

    // Verify immediate optimistic update
    expect(screen.getByTestId('read-status-notif-2')).toHaveTextContent('read');
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('0');

    // Wait for second API call to fail and rollback
    await waitFor(() => {
      expect(screen.getByTestId('read-status-notif-2')).toHaveTextContent('unread');
    });

    // Verify notif-1 still read (success), notif-2 reverted (failure)
    expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('read');
    expect(screen.getByTestId('read-status-notif-2')).toHaveTextContent('unread');

    // Verify unread count: 1 (notif-2 is unread, notif-1 is read)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
  });

  it('decrements unread count immediately and reverts on failure', async () => {
    const user = userEvent.setup();

    // Configure API to fail
    shouldMarkReadFail = true;

    render(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          organisationName: 'Org 123',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Initial unread count: 2
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Mark notif-1 as read
    const markReadBtn = screen.getByTestId('mark-read-btn-notif-1');
    await user.click(markReadBtn);

    // Verify unread count decremented immediately (optimistic)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');

    // Wait for API failure and rollback
    await waitFor(() => {
      expect(screen.getByTestId('read-status-notif-1')).toHaveTextContent('unread');
    });

    // Verify unread count reverted to 2
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');
  });
});
