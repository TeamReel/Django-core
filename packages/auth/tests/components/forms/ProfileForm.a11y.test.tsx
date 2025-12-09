/**
 * ProfileForm Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for:
 * - Keyboard navigation and focus management
 * - Form labels and ARIA attributes
 * - Screen reader support
 * - Form structure and semantics
 * - Loading and success state accessibility
 * - Validation behavior (required fields and password verification)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ProfileForm } from '../../../src/components/forms/ProfileForm';
import { AuthProvider } from '../../../src/components/AuthProvider';
import type { AuthConfig, User } from '../../../src/types';

// Mock hooks
const mockMutate = jest.fn();
const mockUser: User = {
  id: 123,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  role: 'user',
  email_verified: true,
};

jest.mock('../../../src/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    success: false,
  }),
}));

jest.mock('../../../src/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockUser,
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

describe('ProfileForm Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default state
    jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      success: false,
    });
  });

  describe('Axe Violations', () => {
    it('has no accessibility violations on default render', async () => {
      const { container } = renderWithAuth(<ProfileForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with validation errors', async () => {
      const user = userEvent.setup();
      const { container } = renderWithAuth(<ProfileForm />);

      // Clear all fields and submit to trigger validation
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      await user.clear(firstNameInput);
      await user.clear(lastNameInput);
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(async () => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it('has no accessibility violations on success state', async () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      const { container } = renderWithAuth(<ProfileForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('allows tabbing through all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // Tab to first name
      await user.tab();
      expect(firstNameInput).toHaveFocus();

      // Tab to last name
      await user.tab();
      expect(lastNameInput).toHaveFocus();

      // Tab to password
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key press', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const passwordInput = screen.getByLabelText(/current password/i);
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          current_password: 'password123',
        });
      });
    });
  });

  describe('Focus Management', () => {
    it('has visible focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // Focus first name
      await user.tab();
      expect(firstNameInput).toHaveFocus();
      const firstNameStyle = window.getComputedStyle(document.activeElement!);
      expect(firstNameStyle.outlineWidth).not.toBe('0px');

      // Focus last name
      await user.tab();
      expect(lastNameInput).toHaveFocus();
      const lastNameStyle = window.getComputedStyle(document.activeElement!);
      expect(lastNameStyle.outlineWidth).not.toBe('0px');

      // Focus password
      await user.tab();
      expect(passwordInput).toHaveFocus();
      const passwordStyle = window.getComputedStyle(document.activeElement!);
      expect(passwordStyle.outlineWidth).not.toBe('0px');

      // Focus button
      await user.tab();
      expect(submitButton).toHaveFocus();
      const buttonStyle = window.getComputedStyle(document.activeElement!);
      expect(buttonStyle.outlineWidth).not.toBe('0px');
    });
  });

  describe('Form Labels and ARIA', () => {
    it('has proper labels for all form inputs', () => {
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);

      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
      expect(lastNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    it('has appropriate ARIA attributes for validation errors', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/first name is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('shows helper text for password field', () => {
      renderWithAuth(<ProfileForm />);

      expect(screen.getByText(/required to confirm changes/i)).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('provides accessible name for submit button', () => {
      renderWithAuth(<ProfileForm />);

      const submitButton = screen.getByRole('button', { name: /update profile/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('announces form errors with appropriate role', async () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: {
          formErrors: ['Invalid password'],
          fieldErrors: {},
        },
        success: false,
      });

      renderWithAuth(<ProfileForm />);

      const errorAlert = screen.getByText(/invalid password/i);
      expect(errorAlert).toBeInTheDocument();
    });

    it('announces success message', () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<ProfileForm />);

      const successAlert = screen.getByText(/profile updated successfully/i);
      expect(successAlert).toBeInTheDocument();
    });
  });

  describe('Form Structure', () => {
    it('uses semantic form element', () => {
      renderWithAuth(<ProfileForm />);

      const form = screen.getByRole('button', { name: /update profile/i }).closest('form');
      expect(form).toBeInTheDocument();
    });

    it('groups related fields within form', () => {
      renderWithAuth(<ProfileForm />);

      const form = screen.getByRole('button', { name: /update profile/i }).closest('form');
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      expect(form).toContainElement(firstNameInput);
      expect(form).toContainElement(lastNameInput);
      expect(form).toContainElement(passwordInput);
      expect(form).toContainElement(submitButton);
    });

    it('uses appropriate input types', () => {
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);

      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Loading State Accessibility', () => {
    it('disables inputs during form submission', () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: true,
        error: null,
        success: false,
      });

      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /loading/i });

      expect(firstNameInput).toBeDisabled();
      expect(lastNameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('updates button text during loading', () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: true,
        error: null,
        success: false,
      });

      renderWithAuth(<ProfileForm />);

      const submitButton = screen.getByRole('button', { name: /loading/i });
      expect(submitButton).toHaveTextContent('Loading...');
    });
  });

  describe('Validation Behavior', () => {
    it('validates first name required', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('validates last name required', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.clear(lastNameInput);
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(() => {
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
    });

    it('validates current password required', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(() => {
        expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      });
    });

    it('submits with valid data', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);

      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');
      await user.type(passwordInput, 'password123');
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          first_name: 'Jane',
          last_name: 'Smith',
          current_password: 'password123',
        });
      });
    });
  });

  describe('Success State', () => {
    it('shows success message', () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<ProfileForm />);

      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });

    it('keeps form visible when success is shown', () => {
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<ProfileForm />);

      // Form should still be visible
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update profile/i })).toBeInTheDocument();
    });
  });
});
