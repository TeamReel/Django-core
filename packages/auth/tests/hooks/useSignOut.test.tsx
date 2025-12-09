/**
 * Tests for useSignOut hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSignOut } from '../../src/hooks/useSignOut';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';
import { apiClient } from '../../src/lib/apiClient';

// Mock apiClient
jest.mock('../../src/lib/apiClient', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

// Mock window.location
const originalLocation = window.location;

beforeAll(() => {
  delete (window as any).location;
  window.location = { href: '' } as any;
});

afterAll(() => {
  window.location = originalLocation;
});

const mockConfig: AuthConfig = {
  apiBaseUrl: '',
  endpoints: {
    me: '/auth/current-user/',
    signIn: '/auth/sign-in/',
    signOut: '/auth/sign-out/',
    profile: '/auth/profile/',
    requestPasswordReset: '/auth/password-reset/',
    confirmPasswordReset: '/auth/password-reset-confirm/',
  },
  routes: {
    login: '/sign-in',
    defaultAfterLogin: '/',
    afterLogout: '/',
  },
};

describe('useSignOut', () => {
  beforeEach(() => {
    mockApiClient.mockClear();
    window.location.href = '';
  });

  it('should initialize with default state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should successfully sign out and redirect to default page', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
      statusText: 'No Content',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/auth/sign-out/',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );

    // Should redirect to afterLogout route
    expect(window.location.href).toBe('/');
  });

  it('should redirect to custom afterLogout route', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
      statusText: 'No Content',
    } as Response);

    const customConfig = {
      ...mockConfig,
      routes: {
        ...mockConfig.routes,
        afterLogout: '/goodbye',
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={customConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(window.location.href).toBe('/goodbye');
  });

  it('should handle 401 (already logged out) gracefully', async () => {
    mockApiClient.mockRejectedValueOnce({
      status: 401,
      fieldErrors: {},
      formErrors: ['Unauthorized'],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    // Should not set error for 401
    expect(result.current.error).toBeNull();
    // Should still redirect
    expect(window.location.href).toBe('/');
  });

  it('should handle network errors but still sign out', async () => {
    const networkError = new Error('Network request failed');
    mockApiClient.mockRejectedValueOnce(networkError);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    // Should set error for network failures
    expect(result.current.error).toMatchObject({
      status: 0,
      formErrors: ['Network request failed'],
    });

    // Should still redirect despite error
    expect(window.location.href).toBe('/');
  });

  it('should handle server errors but still sign out', async () => {
    mockApiClient.mockRejectedValueOnce({
      status: 500,
      fieldErrors: {},
      formErrors: ['Internal server error'],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    // Should set error for 500
    expect(result.current.error).toMatchObject({
      status: 0,
    });

    // Should still redirect
    expect(window.location.href).toBe('/');
  });

  it('should prevent duplicate sign-out requests', async () => {
    let callCount = 0;
    mockApiClient.mockImplementation(
      () => {
        callCount++;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 204,
                json: async () => ({}),
                headers: new Headers(),
                statusText: 'No Content',
              } as Response),
            50
          )
        );
      }
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    // Trigger multiple sign-outs in quick succession
    const promise1 = result.current.signOut();
    const promise2 = result.current.signOut();
    const promise3 = result.current.signOut();

    await promise1;

    // Should only call API once (subsequent calls ignored due to loading state)
    expect(callCount).toBe(1);
  });

  it('should set loading state during sign-out', async () => {
    let resolveSignOut: (value: any) => void;
    const signOutPromise = new Promise((resolve) => {
      resolveSignOut = resolve;
    });

    mockApiClient.mockImplementation(() => signOutPromise);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignOut(), { wrapper });

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.signOut();
    });

    // Should be loading during request
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the request
    act(() => {
      resolveSignOut!({
        ok: true,
        status: 204,
        json: async () => ({}),
        headers: new Headers(),
        statusText: 'No Content',
      });
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/');
    });

    // Loading should be false after completion
    expect(result.current.loading).toBe(false);
  });

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSignOut());
    }).toThrow('useSignOut must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
