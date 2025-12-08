/**
 * Integration test for complete sign-in flow.
 * Tests the interaction between SignInPage, SignInForm, useSignIn hook, and AuthProvider.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInPage } from '../../src/components/pages/SignInPage';
import { AuthProvider, AuthContext } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    me: '/auth/me/',
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

describe('Sign-In Flow Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should complete full sign-in flow and update auth context', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      email_verified: true,
      is_active: true,
    };

    // Mock successful sign-in response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Capture auth state changes
    let authState: any = null;

    const TestWrapper = () => {
      const auth = React.useContext(AuthContext);
      authState = auth;
      return <SignInPage />;
    };

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <TestWrapper />
      </AuthProvider>
    );

    // Initial state - unauthenticated
    expect(authState?.user).toBeNull();
    expect(authState?.status).toBe('unauthenticated');

    // Fill in form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/sign-in/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });

    // Wait for auth state to update
    await waitFor(() => {
      expect(authState?.user).toEqual(mockUser);
      expect(authState?.status).toBe('authenticated');
    });
  });

  it('should handle sign-in failure and show error message', async () => {
    // Mock failed sign-in response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        status: 401,
        message: 'Invalid email or password',
      }),
      headers: new Headers(),
    });

    // Capture auth state changes
    let authState: any = null;

    const TestWrapper = () => {
      const auth = React.useContext(AuthContext);
      authState = auth;
      return <SignInPage />;
    };

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <TestWrapper />
      </AuthProvider>
    );

    // Fill in form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Submit form
    fireEvent.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    // Auth state should remain unauthenticated
    expect(authState?.user).toBeNull();
    expect(authState?.status).not.toBe('authenticated');
  });

  it('should validate form client-side before making API call', async () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <SignInPage />
      </AuthProvider>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Submit empty form
    fireEvent.click(submitButton);

    // Should show validation errors without calling API
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should disable form inputs during sign-in request', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      email_verified: true,
      is_active: true,
    };

    // Mock slow response
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: mockUser }),
            headers: new Headers(),
          });
        }, 100);
      })
    );

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <SignInPage />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check that inputs are disabled during request
    await waitFor(() => {
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });
  });
});
