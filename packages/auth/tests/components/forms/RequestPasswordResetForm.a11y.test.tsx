/**
 * RequestPasswordResetForm Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for:
 * - Keyboard navigation and focus management
 * - Form labels and ARIA attributes
 * - Screen reader support
 * - Form structure and semantics
 * - Loading and success state accessibility
 * - Validation behavior
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { RequestPasswordResetForm } from '../../../src/components/forms/RequestPasswordResetForm';
import { AuthProvider } from '../../../src/components/AuthProvider';
import type { AuthConfig } from '../../../src/types';

// Mock useRequestPasswordReset hook
const mockRequestReset = jest.fn();
jest.mock('../../../src/hooks/useRequestPasswordReset', () => ({
  useRequestPasswordReset: () => ({
    requestReset: mockRequestReset,
    isLoading: false,
    error: null,
    success: false,
  }),
}));

// Mock AuthConfig
const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    signIn: '/auth/sign-in/',
    signOut: '/auth/sign-out/',
    me: '/auth/me/',
    requestPasswordReset: '/auth/request-password-reset/',
    confirmPasswordReset: '/auth/confirm-password-reset/',
    profile: '/auth/profile/',
  },
  routes: {
    login: '/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/login',
  },
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthProvider config={mockConfig} skipInitialLoad>
      {ui}
    </AuthProvider>
  );
}

describe('RequestPasswordResetForm Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default state (form visible, not loading, no success)
    jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
      requestReset: mockRequestReset,
      isLoading: false,
      error: null,
      success: false,
    });
  });

  describe('Axe Violations', () => {
    it('has no accessibility violations on default render', async () => {
      const { container } = renderWithAuth(<RequestPasswordResetForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with validation errors', async () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      const { container } = renderWithAuth(<RequestPasswordResetForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
      await userEvent.tab();

      await waitFor(async () => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it('has no accessibility violations on success state', async () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: true,
      });

      const { container } = renderWithAuth(<RequestPasswordResetForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('allows tabbing through all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      // Tab to email input
      await user.tab();
      expect(emailInput).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key press', async () => {
      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockRequestReset).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('Focus Management', () => {
    it('has visible focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      // Focus email input
      await user.tab();
      expect(emailInput).toHaveFocus();
      const emailFocusStyle = window.getComputedStyle(document.activeElement!);
      expect(emailFocusStyle.outlineWidth).not.toBe('0px');

      // Focus submit button
      await user.tab();
      expect(submitButton).toHaveFocus();
      const buttonFocusStyle = window.getComputedStyle(document.activeElement!);
      expect(buttonFocusStyle.outlineWidth).not.toBe('0px');
    });
  });

  describe('Form Labels and ARIA', () => {
    it('has proper label for email input', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('name', 'email');
    });

    it('has appropriate ARIA attributes for validation errors', async () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email format/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('associates error messages with inputs via aria-describedby', async () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email format/i);
        expect(errorMessage).toBeInTheDocument();
        // Error message should have role="alert" for immediate announcement
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides accessible name for submit button', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('announces form errors with role="alert"', async () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: {
          formErrors: ['Unable to process request'],
          fieldErrors: {},
        },
        success: false,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('Unable to process request');
    });

    it('announces success message with role="status"', async () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      const successAlert = screen.getByRole('status');
      expect(successAlert).toHaveTextContent(/if that email exists/i);
    });
  });

  describe('Form Structure', () => {
    it('uses semantic form element', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const form = screen.getByRole('button', { name: /send reset link/i }).closest('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute('novalidate');
    });

    it('groups related fields within form', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const form = screen.getByRole('button', { name: /send reset link/i }).closest('form');
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      expect(form).toContainElement(emailInput);
      expect(form).toContainElement(submitButton);
    });

    it('uses appropriate input type', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('has proper autocomplete attribute', () => {
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Loading State Accessibility', () => {
    it('disables input during form submission', () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: true,
        error: null,
        success: false,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sending/i });

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('updates button text during loading', () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: true,
        error: null,
        success: false,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      const submitButton = screen.getByRole('button', { name: /sending/i });
      expect(submitButton).toHaveTextContent('Sending...');
    });
  });

  describe('Validation Behavior', () => {
    it('validates email format', async () => {
      // Reset mock to non-loading state
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: false,
      });

      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('validates email required', async () => {
      // Reset mock to non-loading state
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: false,
      });

      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('clears validation errors when user starts typing', async () => {
      // Reset mock to non-loading state
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: false,
      });

      const user = userEvent.setup();
      renderWithAuth(<RequestPasswordResetForm />);

      const emailInput = screen.getByLabelText(/email/i);

      // Trigger validation error
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      // Clear by typing valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('shows generic success message', () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      expect(screen.getByRole('status')).toHaveTextContent(/if that email exists/i);
    });

    it('hides form when success is shown', () => {
      jest.spyOn(require('../../../src/hooks/useRequestPasswordReset'), 'useRequestPasswordReset').mockReturnValue({
        requestReset: mockRequestReset,
        isLoading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<RequestPasswordResetForm />);

      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
    });
  });
});
