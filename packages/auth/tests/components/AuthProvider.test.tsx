/**
 * Integration tests for AuthProvider component.
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

// Test component that uses useAuth hook
function TestComponent() {
  const { user, status, isLoading, error } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.formErrors.join(', ')}</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <div>Status: {status}</div>
      <div>User: {user.email}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
    document.cookie = 'csrftoken=test-token';
  });

  it('should initialize session on mount', async () => {
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

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should call /auth/me
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/me/',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    // Should show authenticated user
    await waitFor(() => {
      expect(screen.getByText('Status: authenticated')).toBeInTheDocument();
      expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
    });
  });

  it('should handle unauthenticated state (401)', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    render(
      <AuthProvider config={mockConfig}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
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

  it('should skip initial load when skipInitialLoad is true', async () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <TestComponent />
      </AuthProvider>
    );

    // Should not call /auth/me
    expect(mockFetch).not.toHaveBeenCalled();

    // Should show unauthenticated immediately
    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
  });

  it('should handle network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider config={mockConfig}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });
});

describe('useAuth hook', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
