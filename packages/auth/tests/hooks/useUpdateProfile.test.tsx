/**
 * Unit tests for useUpdateProfile hook.
 *
 * Tests:
 * - Success: Updates AuthContext, returns updated user
 * - Incorrect password (400): Populates error state
 * - Network error (500): Populates error state
 * - Loading state: Toggles correctly
 * - Duplicate requests: Prevents concurrent calls
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateProfile } from '../../src/hooks/useUpdateProfile';
import { apiClient } from '../../src/lib/apiClient';
import type { User } from '../../src/types';
import React from 'react';
import { AuthProvider } from '../../src/components/AuthProvider';

// Mock dependencies
jest.mock('../../src/lib/apiClient');
const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

// Mock auth config
const mockConfig = {
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
    afterLogout: '/login',
  },
};

// Test wrapper with AuthProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider config={mockConfig} skipInitialLoad>
      {children}
    </AuthProvider>
  );
};

describe('useUpdateProfile', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user',
    email_verified: true,
    is_active: true,
  };

  const updatedUser: User = {
    ...mockUser,
    first_name: 'Jane',
    last_name: 'Smith',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should successfully update profile and update AuthContext', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedUser }),
      status: 200,
    } as Response);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    let returnedUser: User | undefined;

    await act(async () => {
      returnedUser = await result.current.mutate({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      });
    });

    expect(mockApiClient).toHaveBeenCalledWith('http://localhost:8000/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      }),
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.error).toBeNull();
    expect(returnedUser).toEqual(updatedUser);
  });

  it('should handle incorrect password (400) error', async () => {
    const errorResponse = {
      status: 'error',
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          current_password: ['Current password is incorrect'],
        },
      },
      meta: {
        timestamp: '2025-12-09T08:00:00Z',
      },
    };

    mockApiClient.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    } as Response);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutate({
          first_name: 'Jane',
          last_name: 'Smith',
          current_password: 'wrongpassword',
        });
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.status).toBe(400);
    expect(result.current.error?.fieldErrors.current_password).toContain('Current password is incorrect');
  });

  it('should handle server error (500)', async () => {
    mockApiClient.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
    } as Response);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutate({
          first_name: 'Jane',
          last_name: 'Smith',
          current_password: 'password123',
        });
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.status).toBe(500);
  });

  it('should handle network error', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutate({
          first_name: 'Jane',
          last_name: 'Smith',
          current_password: 'password123',
        });
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.status).toBe(0);
    expect(result.current.error?.formErrors).toContain('Network error');
  });

  it('should set loading state during profile update', async () => {
    let resolveApiCall: (value: Response) => void;
    const apiPromise = new Promise<Response>((resolve) => {
      resolveApiCall = resolve;
    });

    mockApiClient.mockReturnValueOnce(apiPromise);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    // Start the mutation
    act(() => {
      result.current.mutate({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      });
    });

    // Check loading state is true
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the API call
    await act(async () => {
      resolveApiCall!({
        ok: true,
        json: async () => ({ data: updatedUser }),
        status: 200,
      } as Response);
    });

    // Check loading state is false
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should prevent duplicate concurrent profile update requests', async () => {
    mockApiClient.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ data: updatedUser }),
                status: 200,
              } as Response),
            100
          )
        )
    );

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    // Start first request
    const promise1 = act(async () => {
      return result.current.mutate({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      });
    });

    // Try to start second request immediately
    await act(async () => {
      try {
        await result.current.mutate({
          first_name: 'Jane',
          last_name: 'Smith',
          current_password: 'password123',
        });
        fail('Should have thrown error for duplicate request');
      } catch (err) {
        expect(err).toEqual(new Error('Profile update already in progress'));
      }
    });

    // Wait for first request to complete
    await promise1;

    // apiClient should only have been called once
    expect(mockApiClient).toHaveBeenCalledTimes(1);
  });

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useUpdateProfile());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});
