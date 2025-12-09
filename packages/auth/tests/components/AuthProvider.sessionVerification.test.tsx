/**
 * Unit tests for AuthProvider session verification logic.
 *
 * Tests cover:
 * - Session verification on mount
 * - Handling valid session responses (200 OK)
 * - Handling invalid session responses (401)
 * - Handling network errors (500)
 * - Debouncing redundant verification calls
 * - lastVerified timestamp updates
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  const { user, status, isLoading, error, lastVerified, initializeSession } = useAuth();

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.formErrors.join(', ')}</div>}
      {!isLoading && !error && (
        <>
          <div>Status: {status}</div>
          {user && <div>User: {user.email}</div>}
          {lastVerified && <div>Last Verified: {lastVerified}</div>}
          <button onClick={initializeSession}>Verify Session</button>
        </>
      )}
    </div>
  );
}

describe('AuthProvider - Session Verification', () => {
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

  describe('T090 - Handle /auth/me Success (200 OK)', () => {
    it('should populate AuthContext with user data on valid session', async () => {
      mockFetch.mockResolvedValueOnce(
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

      // Should call /auth/me on mount
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/auth/me/',
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        );
      });

      // Should populate user data and set status='authenticated'
      await waitFor(() => {
        expect(screen.getByText('Status: authenticated')).toBeInTheDocument();
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      });
    });

    it('should set lastVerified timestamp on successful verification', async () => {
      const nowBefore = Date.now();

      mockFetch.mockResolvedValueOnce(
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

      await waitFor(() => {
        expect(screen.getByText(/Last Verified:/)).toBeInTheDocument();
      });

      const lastVerifiedText = screen.getByText(/Last Verified:/);
      const lastVerifiedValue = parseInt(lastVerifiedText.textContent!.split(': ')[1], 10);

      // Verify timestamp is recent (within 1 second of test start)
      expect(lastVerifiedValue).toBeGreaterThanOrEqual(nowBefore);
      expect(lastVerifiedValue).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('T091 - Handle /auth/me Failure (401)', () => {
    it('should clear AuthContext on expired session (401)', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Status: unauthenticated')).toBeInTheDocument();
      });

      // User should not be displayed
      expect(screen.queryByText(/User:/)).not.toBeInTheDocument();
    });

    it('should clear AuthContext on forbidden (403)', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 })
      );

      render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Status: unauthenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Network Errors', () => {
    it('should handle network error (500) gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'error',
            error: {
              code: 'SERVER_ERROR',
              message: 'Internal server error',
            },
          }),
          { status: 500 }
        )
      );

      render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Error: Internal server error')).toBeInTheDocument();
      });
    });

    it('should handle fetch rejection (network failure)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'));

      render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Error: Network connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('T096 - Debounce Redundant Verification Calls', () => {
    it('should prevent duplicate concurrent requests', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
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
            }, 100);
          })
      );

      const { rerender } = render(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger re-render while first request is in flight
      rerender(
        <AuthProvider config={mockConfig}>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for first request to complete
      await waitFor(() => {
        expect(screen.getByText('Status: authenticated')).toBeInTheDocument();
      });

      // Should only have called /auth/me once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should skip verification if verified less than 60 seconds ago', async () => {
      // First verification
      mockFetch.mockResolvedValueOnce(
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

      // Wait for first verification
      await waitFor(() => {
        expect(screen.getByText('Status: authenticated')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Try to verify again immediately by clicking button
      const verifyButton = screen.getByText('Verify Session');
      verifyButton.click();

      // Should not call /auth/me again (debounced)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Should see debug log about skipping redundant call
      expect(console.debug).toHaveBeenCalledWith(
        '[AuthProvider] Session verified recently, skipping redundant call'
      );
    });

    it('should allow verification after 60 seconds', async () => {
      jest.useFakeTimers();

      // First verification
      mockFetch.mockResolvedValueOnce(
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

      // Wait for first verification
      await waitFor(() => {
        expect(screen.getByText('Status: authenticated')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 61 seconds
      jest.advanceTimersByTime(61000);

      // Mock second verification
      mockFetch.mockResolvedValueOnce(
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

      // Try to verify again by clicking button
      const verifyButton = screen.getByText('Verify Session');
      verifyButton.click();

      // Should call /auth/me again (debounce expired)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('skipInitialLoad Behavior', () => {
    it('should skip session verification when skipInitialLoad is true', () => {
      render(
        <AuthProvider config={mockConfig} skipInitialLoad>
          <TestComponent />
        </AuthProvider>
      );

      // Should not call /auth/me
      expect(mockFetch).not.toHaveBeenCalled();

      // Should be unauthenticated immediately
      expect(screen.getByText('Status: unauthenticated')).toBeInTheDocument();
    });
  });
});
