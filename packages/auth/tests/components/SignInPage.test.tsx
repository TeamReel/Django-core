/**
 * Tests for SignInPage component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInPage } from '../../src/components/pages/SignInPage';
import { AuthProvider } from '../../src/components/AuthProvider';
import type { AuthConfig, User } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location with proper setter
let mockHref = '';
const mockLocationHref = jest.fn();
delete (window as any).location;
(window as any).location = {
  get href() {
    return mockHref;
  },
  set href(value: string) {
    mockHref = value;
    mockLocationHref(value);
  },
  search: '',
  origin: 'http://localhost',
  pathname: '/',
};

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

const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider config={mockConfig} skipInitialLoad>
      {ui}
    </AuthProvider>
  );
};

describe('SignInPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocationHref.mockClear();
    mockHref = '';
    (window as any).location.search = '';
    (window as any).location.pathname = '/';
  });

  it('should render sign-in page with title', () => {
    renderWithAuth(<SignInPage />);

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('should render SignInForm component', () => {
    renderWithAuth(<SignInPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render forgot password link with default URL', () => {
    renderWithAuth(<SignInPage />);

    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('should render forgot password link with custom URL', () => {
    renderWithAuth(<SignInPage forgotPasswordUrl="/reset" />);

    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toHaveAttribute('href', '/reset');
  });

  it('should redirect to default URL after successful sign-in', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Mock setTimeout
    jest.useFakeTimers();

    renderWithAuth(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Run all timers (includes the setTimeout for redirect)
    jest.runAllTimers();

    expect(window.location.href).toBe('/');

    jest.useRealTimers();
  });

  it('should redirect to custom default URL after successful sign-in', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    jest.useFakeTimers();

    renderWithAuth(<SignInPage defaultRedirect="/dashboard" />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    expect(window.location.href).toBe('/dashboard');

    jest.useRealTimers();
  });

  it('should redirect to ?next= URL after successful sign-in', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Set query string
    window.location.search = '?next=/projects/123';

    jest.useFakeTimers();

    renderWithAuth(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    expect(window.location.href).toBe('/projects/123');

    jest.useRealTimers();
  });

  it('should prevent open redirect attacks with absolute URLs', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Try to redirect to external site
    window.location.search = '?next=http://evil.com';

    jest.useFakeTimers();

    renderWithAuth(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    // Should redirect to default, not evil.com
    expect(window.location.href).toBe('/');

    jest.useRealTimers();
  });

  it('should prevent open redirect attacks with protocol-relative URLs', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Try protocol-relative URL
    window.location.search = '?next=//evil.com';

    jest.useFakeTimers();

    renderWithAuth(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    // Should redirect to default, not evil.com
    expect(window.location.href).toBe('/');

    jest.useRealTimers();
  });

  it('should prevent javascript: protocol in redirect', async () => {
    const mockUser = createMockUser();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
      headers: new Headers(),
    });

    // Try javascript: protocol
    window.location.search = '?next=javascript:alert(1)';

    jest.useFakeTimers();

    renderWithAuth(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    // Should redirect to default, not execute javascript
    expect(window.location.href).toBe('/');

    jest.useRealTimers();
  });
});
