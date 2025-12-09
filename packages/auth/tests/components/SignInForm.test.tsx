/**
 * Tests for SignInForm component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInForm } from '../../src/components/forms/SignInForm';
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

const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider config={mockConfig} skipInitialLoad>
      {ui}
    </AuthProvider>
  );
};

describe('SignInForm', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render email and password inputs', () => {
    renderWithAuth(<SignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    renderWithAuth(<SignInForm />);

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render forgot password link when provided', () => {
    renderWithAuth(<SignInForm forgotPasswordUrl="/forgot-password" />);

    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('should not render forgot password link when not provided', () => {
    renderWithAuth(<SignInForm />);

    expect(screen.queryByRole('link', { name: /forgot password/i })).not.toBeInTheDocument();
  });

  it('should show validation error for invalid email on blur', async () => {
    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for empty email on blur', async () => {
    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password on blur', async () => {
    renderWithAuth(<SignInForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should clear validation errors when user starts typing', async () => {
    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);

    // Trigger validation error
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    // Start typing valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  it('should not submit form with validation errors', async () => {
    renderWithAuth(<SignInForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should disable inputs while loading', async () => {
    const mockUser = createMockUser();

    // Mock slow response
    mockFetch.mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ data: mockUser }),
            headers: new Headers(),
          });
        }, 100);
      })
    );

    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

    // Fill form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });

  it('should call onSuccess callback on successful sign-in', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    const onSuccess = jest.fn();
    renderWithAuth(<SignInForm onSuccess={onSuccess} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('should call onError callback on failed sign-in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        status: 400,
        message: 'Invalid credentials',
      }),
      headers: new Headers(),
    });

    const onError = jest.fn();
    renderWithAuth(<SignInForm onError={onError} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should display form-level errors from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        status: 400,
        message: 'Invalid credentials',
      }),
      headers: new Headers(),
    });

    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should display field-level errors from API', async () => {
    // Django REST Framework style field errors (direct field objects at root)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        email: ['User with this email does not exist'],
      }),
      headers: new Headers(),
    });

    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/user with this email does not exist/i)).toBeInTheDocument();
    });
  });

  it('should have proper accessibility attributes', () => {
    renderWithAuth(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });
});
