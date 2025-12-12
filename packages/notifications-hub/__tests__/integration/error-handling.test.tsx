/**
 * Integration Test: Error Handling
 *
 * Tests comprehensive error handling including:
 * - API errors with retry logic
 * - User-friendly error messages
 * - Observability signals
 * - Error boundary fallback
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { NotificationsProvider } from '@/context/NotificationsProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsConfig } from '@/types';
import { TestProviders } from '../setup/test-providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// MSW server
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test component that uses notifications
function TestComponent() {
  const { notifications, error, loading } = useNotifications();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div data-testid="error-message">Error: {error.message}</div>;
  }

  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      {notifications.map((n) => (
        <div key={n.id} data-testid={`notification-${n.id}`}>
          {n.title}
        </div>
      ))}
    </div>
  );
}

const mockConfig: NotificationsConfig = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  pollingInterval: 30000,
  maxToasts: 5,
  toastDuration: 5000,
};

describe('Error Handling Integration Tests', () => {
  /**
   * T070: API returns 500 → error message shown → retry succeeds
   */
  test('handles 500 error with retry and recovery', async () => {
    let requestCount = 0;

    // First two requests fail with 500, third succeeds
    server.use(
      rest.get('http://localhost:8000/api/v1/notifications', (req, res, ctx) => {
        requestCount++;
        if (requestCount <= 2) {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          );
        }
        return res(
          ctx.json({
            results: [
              {
                id: 'notif-1',
                type: 'test.notification',
                severity: 'INFO',
                title: 'Test Notification',
                message: 'Test message',
                timestamp: '2025-12-11T20:00:00Z',
                read: false,
                org_id: 'org-1',
              },
            ],
            count: 1,
            next: null,
            previous: null,
          })
        );
      })
    );

    render(
      <TestProviders>
        <NotificationsProvider config={mockConfig}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Initially loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // After retries, should show notification
    await waitFor(
      () => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
        expect(screen.getByText('Test Notification')).toBeInTheDocument();
      },
      { timeout: 10000 } // Allow time for retries (1s + 2s + success)
    );

    // Verify retry logic executed
    expect(requestCount).toBe(3);
  }, 15000); // Extended timeout for retry logic

  /**
   * Test: 401 error shows appropriate message
   */
  test('handles 401 authentication error', async () => {
    server.use(
      rest.get('http://localhost:8000/api/v1/notifications', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({ error: 'Unauthorized', code: 'auth_required' })
        );
      })
    );

    // Spy on console to verify observability logging
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <TestProviders>
        <NotificationsProvider config={mockConfig}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Should show error after failed request (no retry for 401)
    await waitFor(() => {
      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toBeInTheDocument();
      // Should NOT retry 401 errors
    });

    // Verify observability logging occurred
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[F04] Failed to fetch notifications:'),
      expect.objectContaining({
        context: 'fetch_notifications',
        error: expect.objectContaining({
          status: 401,
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test: 403 error shows appropriate message
   */
  test('handles 403 authorization error', async () => {
    server.use(
      rest.get('http://localhost:8000/api/v1/notifications', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ error: 'Forbidden', code: 'access_denied' })
        );
      })
    );

    render(
      <TestProviders>
        <NotificationsProvider config={mockConfig}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Should show error (no retry for 403)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  /**
   * Test: Network error (no status code) triggers retry
   */
  test('handles network error with retry', async () => {
    let requestCount = 0;

    server.use(
      rest.get('http://localhost:8000/api/v1/notifications', (req, res, ctx) => {
        requestCount++;
        if (requestCount <= 2) {
          // Simulate network failure
          return res.networkError('Failed to connect');
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

    render(
      <TestProviders>
        <NotificationsProvider config={mockConfig}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Should retry and eventually succeed
    await waitFor(
      () => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      },
      { timeout: 10000 }
    );

    // Verify at least 3 requests made (retries occurred)
    // May be more than 3 due to initial fetch on mount
    expect(requestCount).toBeGreaterThanOrEqual(3);
  }, 15000);

  /**
   * Test: Malformed notification data is filtered out
   */
  test('filters out malformed notification data', async () => {
    server.use(
      rest.get('http://localhost:8000/api/v1/notifications', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              // Valid notification
              {
                id: 'notif-1',
                type: 'test.valid',
                severity: 'INFO',
                title: 'Valid Notification',
                message: 'Valid message',
                timestamp: '2025-12-11T20:00:00Z',
                read: false,
                org_id: 'org-1',
              },
              // Invalid notification (missing title)
              {
                id: 'notif-2',
                type: 'test.invalid',
                severity: 'INFO',
                message: 'Missing title',
                timestamp: '2025-12-11T20:00:00Z',
                read: false,
                org_id: 'org-1',
              },
              // Invalid notification (invalid timestamp)
              {
                id: 'notif-3',
                type: 'test.invalid',
                severity: 'INFO',
                title: 'Invalid Timestamp',
                message: 'Invalid timestamp',
                timestamp: 'not-a-date',
                read: false,
                org_id: 'org-1',
              },
            ],
            count: 3,
            next: null,
            previous: null,
          })
        );
      })
    );

    // Spy on console to verify malformed data logging
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(
      <TestProviders>
        <NotificationsProvider config={mockConfig}>
          <TestComponent />
        </NotificationsProvider>
      </TestProviders>
    );

    // Should only show 1 valid notification (2 invalid filtered out)
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
      expect(screen.getByText('Valid Notification')).toBeInTheDocument();
    });

    // Verify malformed data was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[F04] Malformed notification:',
      expect.objectContaining({
        reason: expect.any(String),
        data: expect.any(String),
      })
    );

    consoleWarnSpy.mockRestore();
  });

  /**
   * Test: ErrorBoundary catches component crashes
   */
  test('ErrorBoundary catches and displays fallback', () => {
    // Component that throws error
    function BrokenComponent() {
      throw new Error('Test component crash');
    }

    // Suppress error console output for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary fallback={<div>Fallback UI</div>}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    // Should show fallback UI
    expect(screen.getByText('Fallback UI')).toBeInTheDocument();

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[F04] ErrorBoundary caught error:',
      expect.any(Error),
      expect.any(Object)
    );

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test: ErrorBoundary default fallback UI
   */
  test('ErrorBoundary shows default fallback when no custom fallback provided', () => {
    function BrokenComponent() {
      throw new Error('Test component crash');
    }

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    // Should show default fallback with error message
    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred. Please refresh the page to try again.')
    ).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
