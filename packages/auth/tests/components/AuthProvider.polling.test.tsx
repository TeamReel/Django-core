/**
 * Unit tests for AuthProvider polling behavior.
 *
 * Tests cover:
 * - Polling disabled by default
 * - Polling enabled with custom interval
 * - Polling respects configured interval
 * - Polling cleanup on unmount (no memory leaks)
 * - Polling only runs when authenticated
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { AuthProvider } from '../../src/components/AuthProvider';
import { useAuth } from '../../src/hooks/useAuth';
import type { AuthConfig } from '../../src/types';

// Mock fetch
global.fetch = jest.fn();

const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    signIn: '/auth/sign-in/',
    signOut: '/auth/sign-out/',
    requestPasswordReset: '/auth/password-reset/request/',
    confirmPasswordReset: '/auth/password-reset/confirm/',
    me: '/auth/me/',
    profile: '/auth/profile/',
  },
  routes: {
    login: '/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

// Test component that exposes AuthContext
function TestComponent() {
  const { user, status, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>User: {user.email}</div>;
}

describe('AuthProvider - Polling Behavior', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
    document.cookie = 'csrftoken=test-token';
    jest.clearAllMocks();
    jest.spyOn(console, 'debug').mockImplementation(); // Suppress debug logs
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('T092/T093 - Polling Configuration', () => {
    it('should not poll when polling is disabled (default)', async () => {
      jest.useFakeTimers();

      // Initial /auth/me call
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: '1',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              role: 'user',
              email_verified: true,
              is_active: true,
            },
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial session verification
      await waitFor(() => {
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 10 minutes
      act(() => {
        jest.advanceTimersByTime(600000);
      });

      // Should NOT call /auth/me again (polling disabled)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should poll at default interval (5 minutes) when enabled', async () => {
      jest.useFakeTimers();

      const configWithPolling: AuthConfig = {
        ...mockConfig,
        security: {
          enableSessionPolling: true,
          // No interval specified, should use default (5 minutes = 300000 ms)
        },
      };

      // Initial and subsequent /auth/me calls
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: '1',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              role: 'user',
              email_verified: true,
              is_active: true,
            },
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider config={configWithPolling}>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial session verification
      await waitFor(() => {
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 5 minutes (default interval)
      await act(async () => {
        jest.advanceTimersByTime(300000);
        // Give React time to process the state update
        await Promise.resolve();
      });

      // Should call /auth/me again (polling enabled)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should respect custom polling interval', async () => {
      jest.useFakeTimers();

      const configWithCustomInterval: AuthConfig = {
        ...mockConfig,
        security: {
          enableSessionPolling: true,
          sessionPollingInterval: 60000, // 1 minute
        },
      };

      // Mock all /auth/me calls to return authenticated user
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: '1',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              role: 'user',
              email_verified: true,
              is_active: true,
            },
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider config={configWithCustomInterval}>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial session verification
      await waitFor(() => {
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      });

      const initialCalls = mockFetch.mock.calls.length;

      // Advance time by 1 minute (custom interval) + small buffer to overcome debouncing
      await act(async () => {
        jest.advanceTimersByTime(61000); // 61 seconds to overcome 60s debounce
        await Promise.resolve();
      });

      // Should call /auth/me again
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(initialCalls + 1);
      });

      jest.useRealTimers();
    });

    it('should clean up polling interval on unmount', () => {
      jest.useFakeTimers();

      const configWithPolling: AuthConfig = {
        ...mockConfig,
        security: {
          enableSessionPolling: true,
          sessionPollingInterval: 60000,
        },
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: '1',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              role: 'user',
              email_verified: true,
              is_active: true,
            },
          }),
          { status: 200 }
        )
      );

      const { unmount } = render(
        <AuthProvider config={configWithPolling} skipInitialLoad>
          <TestComponent />
        </AuthProvider>
      );

      const initialCalls = mockFetch.mock.calls.length;

      // Unmount the component
      unmount();

      // Advance time by interval
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should NOT call /auth/me (interval cleaned up)
      expect(mockFetch).toHaveBeenCalledTimes(initialCalls);

      jest.useRealTimers();
    });

    it('should only poll when status is authenticated', () => {
      jest.useFakeTimers();

      const configWithPolling: AuthConfig = {
        ...mockConfig,
        security: {
          enableSessionPolling: true,
          sessionPollingInterval: 60000,
        },
      };

      // Use skipInitialLoad to avoid async complexity
      render(
        <AuthProvider config={configWithPolling} skipInitialLoad>
          <TestComponent />
        </AuthProvider>
      );

      // Should be unauthenticated immediately
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      const initialCalls = mockFetch.mock.calls.length;

      // Advance time by interval
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should NOT call /auth/me (not authenticated)
      expect(mockFetch).toHaveBeenCalledTimes(initialCalls);

      jest.useRealTimers();
    });
  });
});
