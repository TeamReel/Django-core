/**
 * Tests for useRequestPasswordReset hook.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useRequestPasswordReset } from '../../src/hooks/useRequestPasswordReset';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';
import { apiClient } from '../../src/lib/apiClient';

// Mock apiClient
jest.mock('../../src/lib/apiClient', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

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
    afterLogout: '/sign-in',
  },
};

describe('useRequestPasswordReset', () => {
  beforeEach(() => {
    mockApiClient.mockClear();
  });

  it('should initialize with default state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
    expect(typeof result.current.requestReset).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should successfully request password reset', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Password reset email sent' }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(false);

    const requestPromise = result.current.requestReset('test@example.com');

    // Should be loading during request
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await requestPromise;

    // Should complete successfully
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/auth/password-reset/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );
  });

  it('should always show success even for non-existent email (security)', async () => {
    // Backend returns 200 even for non-existent emails to prevent enumeration
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'If email exists, reset link sent' }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    await result.current.requestReset('nonexistent@example.com');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle network errors', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    await expect(
      result.current.requestReset('test@example.com')
    ).rejects.toMatchObject({
      status: 0,
      formErrors: ['Network error'],
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(0);
    });
  });

  it('should handle API error responses', async () => {
    const mockError = {
      status: 400,
      message: 'Invalid request',
      errors: {
        email: ['Invalid email format'],
      },
    };

    mockApiClient.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockError,
      headers: new Headers(),
      statusText: 'Bad Request',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    await expect(
      result.current.requestReset('invalid-email')
    ).rejects.toMatchObject({
      status: 400,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(400);
    });
  });

  it('should reset state when reset() is called', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Success' }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    // Make a successful request
    await result.current.requestReset('test@example.com');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    // Reset the state
    result.current.reset();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
  });

  it('should handle multiple sequential requests', async () => {
    mockApiClient
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Success' }),
        headers: new Headers(),
        statusText: 'OK',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Success' }),
        headers: new Headers(),
        statusText: 'OK',
      } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    // First request
    await result.current.requestReset('test1@example.com');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    // Reset and make second request
    result.current.reset();

    await result.current.requestReset('test2@example.com');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    expect(mockApiClient).toHaveBeenCalledTimes(2);
  });
});
