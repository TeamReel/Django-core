/**
 * Integration Test: Context Switching
 *
 * Tests WP10 T060: Verify that switching org/project clears notifications,
 * shows skeleton loading state, and fetches new context-specific data.
 *
 * Success Criteria:
 * - Switching org clears inbox, shows skeleton, fetches new org's notifications
 * - Switching project fetches project-scoped notifications
 * - Unread badge updates immediately on context switch
 * - All state changes logged to console
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { NotificationsProvider } from '@/context/NotificationsProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { TestProviders } from '../setup/test-providers';

// Mock notifications for org-123
const org123Notifications = [
  {
    id: 'notif-org123-1',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Org 123 Notification 1',
    message: 'This is from org 123',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-123',
  },
  {
    id: 'notif-org123-2',
    type: 'system.info',
    severity: 'INFO',
    title: 'Org 123 Notification 2',
    message: 'Another from org 123',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-123',
  },
];

// Mock notifications for org-456
const org456Notifications = [
  {
    id: 'notif-org456-1',
    type: 'access.granted',
    severity: 'INFO',
    title: 'Org 456 Notification 1',
    message: 'This is from org 456',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-456',
  },
];

// Mock notifications for project-specific (within org-123)
const project789Notifications = [
  {
    id: 'notif-proj789-1',
    type: 'task.assigned',
    severity: 'INFO',
    title: 'Project 789 Task',
    message: 'Task assigned in project 789',
    timestamp: new Date().toISOString(),
    read: false,
    org_id: 'org-123',
    project_id: 'proj-789',
  },
];

const server = setupServer(
  rest.get('/api/v1/notifications', (req, res, ctx) => {
    const org = req.url.searchParams.get('org');
    const project = req.url.searchParams.get('project');

    if (org === 'org-123' && project === 'proj-789') {
      return res(
        ctx.json({
          results: project789Notifications,
          count: project789Notifications.length,
          next: null,
          previous: null,
        })
      );
    }

    if (org === 'org-123') {
      return res(
        ctx.json({
          results: org123Notifications,
          count: org123Notifications.length,
          next: null,
          previous: null,
        })
      );
    }

    if (org === 'org-456') {
      return res(
        ctx.json({
          results: org456Notifications,
          count: org456Notifications.length,
          next: null,
          previous: null,
        })
      );
    }

    return res(
      ctx.json({
        results: [],
        count: 0,
        next: null,
        previous: null,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test component that displays notifications and badge
function TestComponent() {
  const { notifications, loading } = useNotifications();
  const unreadCount = useUnreadCount();

  return (
    <div>
      <div data-testid="unread-badge">{unreadCount}</div>
      <div data-testid="loading-state">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="notification-list">
        {notifications.length === 0 && !loading && <div>No notifications</div>}
        {notifications.map(notif => (
          <div key={notif.id} data-testid={`notification-${notif.id}`}>
            {notif.title}
          </div>
        ))}
      </div>
    </div>
  );
}

describe('Integration: Context Switching', () => {
  const config = {
    apiBaseUrl: '/api/v1',
    pollingInterval: 30000,
  };

  it('switches org and clears notifications, shows loading, fetches new data', async () => {
    // Initial render with org-123
    const { rerender } = render(
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

    // Wait for initial org-123 notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify org-123 notifications are displayed
    expect(screen.getByTestId('notification-notif-org123-1')).toHaveTextContent(
      'Org 123 Notification 1'
    );
    expect(screen.getByTestId('notification-notif-org123-2')).toHaveTextContent(
      'Org 123 Notification 2'
    );

    // Verify unread count (2 unread from org-123)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Switch to org-456 by rerendering with new context
    rerender(
      <TestProviders
        contextValue={{
          orgId: 'org-456',
          organisationName: 'Org 456',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Verify notifications are cleared immediately (CONTEXT_CHANGE action)
    await waitFor(() => {
      const list = screen.getByTestId('notification-list');
      expect(list).toHaveTextContent('No notifications');
    });

    // Verify loading state is shown
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');

    // Wait for org-456 notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify org-456 notifications are displayed
    expect(screen.getByTestId('notification-notif-org456-1')).toHaveTextContent(
      'Org 456 Notification 1'
    );

    // Verify org-123 notifications are NOT displayed
    expect(screen.queryByTestId('notification-notif-org123-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-notif-org123-2')).not.toBeInTheDocument();

    // Verify unread count updated (1 unread from org-456)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
  });

  it('switches project within org and fetches project-scoped notifications', async () => {
    // Initial render with org-123, no project
    const { rerender } = render(
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

    // Wait for initial org-level notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify org-level notifications are displayed (2 from org-123)
    expect(screen.getByTestId('notification-notif-org123-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-notif-org123-2')).toBeInTheDocument();

    // Switch to project-789 within org-123
    rerender(
      <TestProviders
        contextValue={{
          orgId: 'org-123',
          projectId: 'proj-789',
          organisationName: 'Org 123',
          projectName: 'Project 789',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Verify notifications are cleared
    await waitFor(() => {
      const list = screen.getByTestId('notification-list');
      expect(list).toHaveTextContent('No notifications');
    });

    // Wait for project-scoped notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Verify project-789 notification is displayed
    expect(screen.getByTestId('notification-notif-proj789-1')).toHaveTextContent(
      'Project 789 Task'
    );

    // Verify org-level notifications are NOT displayed
    expect(screen.queryByTestId('notification-notif-org123-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-notif-org123-2')).not.toBeInTheDocument();

    // Verify unread count updated (1 unread from proj-789)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
  });

  it('badge updates immediately on context switch (shows 0 during load)', async () => {
    // Initial render with org-123
    const { rerender } = render(
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

    // Badge shows 2 unread
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    // Switch to org-456
    rerender(
      <TestProviders
        contextValue={{
          orgId: 'org-456',
          organisationName: 'Org 456',
        }}
      >
        <NotificationsProvider config={config}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Badge immediately shows 0 (CONTEXT_CHANGE clears state)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('0');

    // Wait for org-456 data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    });

    // Badge updates to 1 (org-456 has 1 unread)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
  });
});
