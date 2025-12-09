/**
 * Tests for useSignIn hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSignIn } from '../../src/hooks/useSignIn';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig, User } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create complete User objects
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  email_verified: true,
  is_active: true,
  ...overrides,
});

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
    mockFetch.mockClear();
  });

  it('should initialize with default state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('should successfully sign in and update auth context', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    let user: User;
    await act(async () => {
      user = await result.current.signIn('test@example.com', 'password123');
    });

    // Should complete successfully
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(user!).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledWith(
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
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
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
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ status: 400, message: 'Invalid credentials' }),
      headers: new Headers(),
      statusText: 'Bad Request',
    } as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider config={mockConfig} skipInitialLoad>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useSignIn(), { wrapper });

    // First attempt fails
    let error: any;
    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrongpass');
      } catch (e) {
        error = e;
      }
    });

    expect(error).toMatchObject({ status: 400 });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Second attempt succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 1, email: 'test@example.com' } }),
      headers: new Headers(),
      statusText: 'OK',
    } as Response);

    await act(async () => {
      await result.current.signIn('test@example.com', 'correctpass');
    });

    // Error should be cleared after second attempt
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
