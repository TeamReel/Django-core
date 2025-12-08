/**
 * Tests for useSignIn hook.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSignIn } from '../../src/hooks/useSignIn';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';
import { apiClient } from '../../src/lib/apiClient';

// Mock apiClient instead of global fetch
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
    requestPasswordReset: '/auth/password/reset/',
    confirmPasswordReset: '/auth/password/reset/confirm/',
  },
  routes: {
    login: '/sign-in',
    defaultAfterLogin: '/',
    afterLogout: '/sign-in',
  },
};

describe('useSignIn', () => {
  beforeEach(() => {
    mockApiClient.mockClear();
  });

  it('should initialize with default state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('should successfully sign in and update auth context', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    const signInPromise = result.current.signIn('test@example.com', 'password123');

    // Should be loading during request
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    const user = await signInPromise;

    // Should complete successfully
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(user).toEqual(mockUser);
    expect(mockApiClient).toHaveBeenCalledWith(
      '/auth/sign-in/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    );
  });

  it('should handle API error responses', async () => {
    const mockError = {
      status: 400,
      message: 'Invalid credentials',
      errors: {
        email: ['User with this email does not exist'],
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

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(
      result.current.signIn('wrong@example.com', 'wrongpass')
    ).rejects.toMatchObject({
      status: 400,
      formErrors: ['Invalid credentials'],
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(400);
    });
  });

  it('should handle network errors', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(
      result.current.signIn('test@example.com', 'password123')
    ).rejects.toMatchObject({
      status: 0,
      formErrors: ['Network error'],
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(0);
    });
  });

  it('should clear error when clearError is called', async () => {
    const mockError = {
      status: 400,
      message: 'Invalid credentials',
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

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(
      result.current.signIn('test@example.com', 'wrongpass')
    ).rejects.toMatchObject({
      status: 400,
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    result.current.clearError();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('should clear error when starting a new sign-in attempt', async () => {
    // First attempt fails
    mockApiClient.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ status: 400, message: 'Invalid credentials' }),
      headers: new Headers(),
      statusText: 'Bad Request',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(
      result.current.signIn('test@example.com', 'wrongpass')
    ).rejects.toMatchObject({ status: 400 });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Second attempt succeeds
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 1, email: 'test@example.com' } }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    const signInPromise = result.current.signIn('test@example.com', 'correctpass');

    // Error should be cleared immediately when starting new attempt
    expect(result.current.error).toBeNull();

    await signInPromise;

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
