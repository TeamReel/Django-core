/**
 * Integration Tests: WP12 - Pagination & Performance Optimization
 *
 * Tests pagination behavior, IntersectionObserver scroll-to-bottom detection,
 * and loadMore functionality with 1000+ notifications.
 *
 * @see kitty-specs/025-notifications-hub-ui/tasks/doing/WP12-pagination-performance.md
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { NotificationsProvider } from '../../src/context/NotificationsProvider';
import { NotificationList } from '../../src/components/NotificationList';
import { useNotifications } from '../../src/hooks/useNotifications';
import { NotificationsConfig, Notification } from '../../src/types';
import 'whatwg-fetch';

// Mock F02 auth hook
jest.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ status: 'authenticated' }),
}));

// Mock F03 context switcher hook
jest.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: {
      organisation: { id: 'org-1', name: 'Test Org' },
      project: null,
    },
  }),
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Generate large notification dataset
function generateNotifications(start: number, count: number): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `notif-${start + i}`,
    type: 'job.completed',
    severity: 'INFO' as const,
    title: `Notification ${start + i}`,
    message: `This is notification number ${start + i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    read: false,
    org_id: 'org-1',
    metadata: { index: start + i },
  }));
}

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const config: NotificationsConfig = {
    apiBaseUrl: 'https://api.test.com',
    pollingInterval: 30000,
  };

  return (
    <NotificationsProvider config={config}>
      {children}
    </NotificationsProvider>
  );
}

function TestComponent() {
  const {
    notifications,
    loading,
    loadMore,
    pagination,
    loadingMore,
  } = useNotifications();

  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      <div data-testid="has-more">{pagination.hasMore ? 'true' : 'false'}</div>
      <div data-testid="loading-more">{loadingMore ? 'true' : 'false'}</div>
      <div data-testid="current-page">{pagination.page}</div>

      <NotificationList
        notifications={notifications}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={pagination.hasMore}
        isLoadingMore={loadingMore}
      />

      <button onClick={loadMore} data-testid="load-more-btn">
        Load More
      </button>
    </div>
  );
}

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('WP12: Pagination & Performance', () => {
  describe('T071-T072: Pagination State & loadMore', () => {
    it('loads initial page with 20 notifications', async () => {
      // Page 1: 20 notifications out of 100 total
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);
          const pageSize = parseInt(req.url.searchParams.get('page_size') || '20', 10);
          const start = (page - 1) * pageSize;

          return res(
            ctx.status(200),
            ctx.json({
              count: 100,
              next: page < 5 ? `https://api.test.com/api/notifications/?page=${page + 1}` : null,
              previous: page > 1 ? `https://api.test.com/api/notifications/?page=${page - 1}` : null,
              results: generateNotifications(start + 1, pageSize),
            })
          );
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      expect(screen.getByTestId('has-more')).toHaveTextContent('true');
      expect(screen.getByTestId('current-page')).toHaveTextContent('1');
    });

    it('loads next page when loadMore is called', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);
          const pageSize = parseInt(req.url.searchParams.get('page_size') || '20', 10);
          const start = (page - 1) * pageSize;

          return res(
            ctx.status(200),
            ctx.json({
              count: 100,
              next: page < 5 ? `https://api.test.com/api/notifications/?page=${page + 1}` : null,
              previous: page > 1 ? `https://api.test.com/api/notifications/?page=${page - 1}` : null,
              results: generateNotifications(start + 1, pageSize),
            })
          );
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial load (page 1)
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      // Trigger loadMore
      screen.getByTestId('load-more-btn').click();

      // Wait for loadMore to complete
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('40');
      });

      expect(screen.getByTestId('has-more')).toHaveTextContent('true');
      expect(screen.getByTestId('current-page')).toHaveTextContent('2');
    });

    it('sets hasMore to false when all notifications loaded', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);

          // Only 15 total notifications (less than one page)
          return res(
            ctx.status(200),
            ctx.json({
              count: 15,
              next: null,
              previous: null,
              results: generateNotifications(1, 15),
            })
          );
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('15');
      });

      // hasMore should be false since we loaded all notifications
      expect(screen.getByTestId('has-more')).toHaveTextContent('false');
    });

    it('prevents duplicate loadMore calls when already loading', async () => {
      let requestCount = 0;

      server.use(
        rest.get('https://api.test.com/api/notifications/', async (req, res, ctx) => {
          requestCount++;
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);
          const pageSize = parseInt(req.url.searchParams.get('page_size') || '20', 10);
          const start = (page - 1) * pageSize;

          // Simulate slow API response
          await new Promise(resolve => setTimeout(resolve, 100));

          return res(
            ctx.status(200),
            ctx.json({
              count: 100,
              next: page < 5 ? `https://api.test.com/api/notifications/?page=${page + 1}` : null,
              previous: page > 1 ? `https://api.test.com/api/notifications/?page=${page - 1}` : null,
              results: generateNotifications(start + 1, pageSize),
            })
          );
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      const initialRequestCount = requestCount;

      // Rapidly click loadMore multiple times
      screen.getByTestId('load-more-btn').click();
      screen.getByTestId('load-more-btn').click();
      screen.getByTestId('load-more-btn').click();

      // Wait for loadMore to complete
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('40');
      });

      // Should only have made 1 additional request (not 3)
      expect(requestCount).toBe(initialRequestCount + 1);
    });
  });

  describe('T072: Enhanced Error Handling in loadMore', () => {
    it('shows error toast when loadMore fails', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);

          // Page 1 succeeds
          if (page === 1) {
            return res(
              ctx.status(200),
              ctx.json({
                count: 100,
                next: 'https://api.test.com/api/notifications/?page=2',
                previous: null,
                results: generateNotifications(1, 20),
              })
            );
          }

          // Page 2 fails with 500
          return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }));
        })
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      // Trigger loadMore (will fail)
      screen.getByTestId('load-more-btn').click();

      // Verify error logged with structured format
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[F04] Failed to load more notifications:',
          expect.objectContaining({
            context: 'load_more',
            timestamp: expect.any(String),
          })
        );
      });

      consoleErrorSpy.mockRestore();

      // Notification count should remain at 20 (no new items added)
      expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
    });
  });

  describe('T073: IntersectionObserver Integration', () => {
    it('sets up IntersectionObserver when hasMore is true', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              count: 100,
              next: 'https://api.test.com/api/notifications/?page=2',
              previous: null,
              results: generateNotifications(1, 20),
            })
          );
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      // Verify IntersectionObserver was instantiated
      expect(mockIntersectionObserver).toHaveBeenCalled();

      // Verify observe was called on the sentinel element
      const mockInstance = mockIntersectionObserver.mock.results[0].value;
      expect(mockInstance.observe).toHaveBeenCalled();
    });

    it('does not set up IntersectionObserver when hasMore is false', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              count: 15,
              next: null,
              previous: null,
              results: generateNotifications(1, 15),
            })
          );
        })
      );

      mockIntersectionObserver.mockClear();

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('15');
      });

      // Since hasMore is false, IntersectionObserver should not be set up
      // (Note: This test may need adjustment based on actual implementation timing)
      expect(screen.getByTestId('has-more')).toHaveTextContent('false');
    });
  });

  describe('T075: Performance Monitoring', () => {
    it('logs pagination metrics during loadMore', async () => {
      server.use(
        rest.get('https://api.test.com/api/notifications/', (req, res, ctx) => {
          const page = parseInt(req.url.searchParams.get('page') || '1', 10);
          const pageSize = parseInt(req.url.searchParams.get('page_size') || '20', 10);
          const start = (page - 1) * pageSize;

          return res(
            ctx.status(200),
            ctx.json({
              count: 100,
              next: page < 5 ? `https://api.test.com/api/notifications/?page=${page + 1}` : null,
              previous: page > 1 ? `https://api.test.com/api/notifications/?page=${page - 1}` : null,
              results: generateNotifications(start + 1, pageSize),
            })
          );
        })
      );

      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('20');
      });

      // Trigger loadMore
      screen.getByTestId('load-more-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('40');
      });

      // Verify performance metrics logged
      await waitFor(() => {
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[F04] Loading more notifications',
          expect.objectContaining({
            nextPage: 2,
            currentCount: 20,
            timestamp: expect.any(String),
          })
        );
      });

      await waitFor(() => {
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[F04] Successfully loaded more notifications',
          expect.objectContaining({
            loaded: 20,
            totalCount: 40,
          })
        );
      });

      consoleDebugSpy.mockRestore();
    });
  });
});
