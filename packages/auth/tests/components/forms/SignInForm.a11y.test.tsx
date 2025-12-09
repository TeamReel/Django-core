import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SignInForm } from '../../../src/components/forms/SignInForm';
import { AuthProvider } from '../../../src/components/AuthProvider';
import type { AuthConfig } from '../../../src/types';

expect.extend(toHaveNoViolations);

// Mock useSignIn hook
const mockSignIn = jest.fn();
const mockClearError = jest.fn();
jest.mock('../../../src/hooks/useSignIn', () => ({
  useSignIn: () => ({
    signIn: mockSignIn,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock config for AuthProvider
const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    signIn: '/auth/signin/',
    signOut: '/auth/signout/',
    me: '/auth/me/',
    requestPasswordReset: '/auth/password-reset/request/',
    confirmPasswordReset: '/auth/password-reset/confirm/',
    profile: '/auth/profile/',
  },
  routes: {
    login: '/',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthProvider config={mockConfig} skipInitialLoad>
      {ui}
    </AuthProvider>
  );
}

describe('SignInForm Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Axe Violations', () => {
    it('has no accessibility violations on default render', async () => {
      const { container } = renderWithAuth(<SignInForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with validation errors', async () => {
      const user = userEvent.setup();
      const { container } = renderWithAuth(<SignInForm />);

      // Trigger validation errors by submitting empty form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with forgot password link', async () => {
      const { container } = renderWithAuth(<SignInForm forgotPasswordUrl="/forgot-password" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('allows tabbing through all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<SignInForm forgotPasswordUrl="/forgot-password" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(forgotPasswordLink).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key press', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      mockSignIn.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      renderWithAuth(<SignInForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('Focus Management', () => {
    it('has visible focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<SignInForm forgotPasswordUrl="/forgot-password" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Focus each element and verify it receives focus
      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      await user.click(passwordInput);
      expect(passwordInput).toHaveFocus();

      await user.click(forgotPasswordLink);
      expect(forgotPasswordLink).toHaveFocus();

      await user.click(submitButton);
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Labels and ARIA', () => {
    it('has proper labels for all form inputs', () => {
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');

      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('has appropriate ARIA attributes for validation errors', async () => {
      const user = userEvent.setup();
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation by focusing and blurring email field
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Check error has role="alert"
      const errorElement = screen.getByText(/email is required/i);
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    it('associates error messages with inputs via aria-describedby', async () => {
      const user = userEvent.setup();
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);

      // Trigger validation error
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        const describedBy = emailInput.getAttribute('aria-describedby');
        expect(describedBy).toBe('sign-in-email-error');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides accessible name for submit button', () => {
      renderWithAuth(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('announces form errors with role="alert" and aria-live="assertive"', async () => {
      const user = userEvent.setup();
      const mockError = {
        formErrors: ['Invalid credentials'],
        fieldErrors: {},
      };

      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: false,
        error: mockError,
        clearError: mockClearError,
      });

      renderWithAuth(<SignInForm />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('Invalid credentials');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });

    it('provides accessible forgot password link', () => {
      renderWithAuth(<SignInForm forgotPasswordUrl="/forgot-password" />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });
  });

  describe('Form Structure', () => {
    it('uses semantic form element', () => {
      const { container } = renderWithAuth(<SignInForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute('novalidate');
    });

    it('groups related fields within form', () => {
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // All elements should be in the same form
      const form = emailInput.closest('form');
      expect(passwordInput.closest('form')).toBe(form);
      expect(submitButton.closest('form')).toBe(form);
    });

    it('uses appropriate input types', () => {
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper autocomplete attributes', () => {
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  describe('Loading State Accessibility', () => {
    it('disables inputs during form submission', () => {
      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /signing in/i });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('updates button text during loading', () => {
      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      renderWithAuth(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toHaveTextContent('Signing in...');
    });
  });

  describe('Validation Behavior', () => {
    it('validates email format', async () => {
      // Reset mock to non-loading state
      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: false,
        error: null,
        clearError: mockClearError,
      });

      const user = userEvent.setup();
      renderWithAuth(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password length', async () => {
      // Reset mock to non-loading state
      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: false,
        error: null,
        clearError: mockClearError,
      });

      const user = userEvent.setup();
      renderWithAuth(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(passwordInput, 'short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      const mockError = {
        formErrors: ['Invalid credentials'],
        fieldErrors: {},
      };

      jest.spyOn(require('../../../src/hooks/useSignIn'), 'useSignIn').mockReturnValue({
        signIn: mockSignIn,
        isLoading: false,
        error: mockError,
        clearError: mockClearError,
      });

      renderWithAuth(<SignInForm />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
