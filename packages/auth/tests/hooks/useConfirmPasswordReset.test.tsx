/**
 * Tests for useConfirmPasswordReset hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useConfirmPasswordReset } from '../../src/hooks/useConfirmPasswordReset';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe('useConfirmPasswordReset', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should initialize with default state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
    expect(typeof result.current.confirmReset).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should successfully confirm password reset', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Password reset successful' }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(false);

    await act(async () => {
      await result.current.confirmReset(
        'abc123',
        'token456',
        'NewP@ssw0rd'
      );
    });

    // Should complete successfully
    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.error).toBeNull();

    expect(mockFetch).toHaveBeenCalledWith(
      '/auth/password-reset-confirm/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          uidb64: 'abc123',
          token: 'token456',
          new_password: 'NewP@ssw0rd',
        }),
      })
    );
  });

  it('should handle invalid/expired token (400)', async () => {
    const mockError = {
      status: 400,
      message: 'Invalid or expired token',
      errors: {
        token: ['This password reset token is invalid or has expired'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockError,
      headers: new Headers(),
      statusText: 'Bad Request',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    await expect(
      result.current.confirmReset('abc123', 'expired-token', 'NewP@ssw0rd')
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

  it('should handle password validation errors (400)', async () => {
    // Django REST Framework style field errors (direct field objects at root)
    const mockError = {
      new_password: [
        'Password must be at least 8 characters',
        'Password must include uppercase, lowercase, number, and special character',
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockError,
      headers: new Headers(),
      statusText: 'Bad Request',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    let error: any;
    await act(async () => {
      try {
        await result.current.confirmReset('abc123', 'token456', 'weak');
      } catch (e) {
        error = e;
      }
    });

    // Check the thrown error
    expect(error).toMatchObject({
      status: 400,
      fieldErrors: {
        new_password: expect.arrayContaining([
          'Password must be at least 8 characters',
        ]),
      },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.fieldErrors.new_password).toBeDefined();
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    await expect(
      result.current.confirmReset('abc123', 'token456', 'NewP@ssw0rd')
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

  it('should handle user not found (404)', async () => {
    const mockError = {
      status: 404,
      message: 'User not found',
      errors: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => mockError,
      headers: new Headers(),
      statusText: 'Not Found',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    await expect(
      result.current.confirmReset('invalid-uid', 'token456', 'NewP@ssw0rd')
    ).rejects.toMatchObject({
      status: 404,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(404);
    });
  });

  it('should reset state when reset() is called', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Success' }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    // Make a successful request
    await result.current.confirmReset('abc123', 'token456', 'NewP@ssw0rd');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    // Reset the state
    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
  });

  it('should handle multiple sequential requests', async () => {
    mockFetch
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
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useConfirmPasswordReset(), { wrapper });

    // First request
    await result.current.confirmReset('abc123', 'token1', 'Password1!');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    // Reset and make second request
    result.current.reset();

    await result.current.confirmReset('def456', 'token2', 'Password2!');

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
