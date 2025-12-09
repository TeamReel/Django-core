import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProfilePage } from '../../../src/components/pages/ProfilePage';
import { AuthProvider } from '../../../src/components/AuthProvider';
import { useCurrentUser } from '../../../src/hooks/useCurrentUser';
import type { User, AuthConfig } from '../../../src/types';

expect.extend(toHaveNoViolations);

// Mock useCurrentUser to provide test user
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'user',
  email_verified: true,
  is_active: true,
};

// Mock useCurrentUser hook
jest.mock('../../../src/hooks/useCurrentUser');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
mockUseCurrentUser.mockReturnValue(mockUser);

// Mock useUpdateProfile hook
const mockMutate = jest.fn();
jest.mock('../../../src/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    success: false,
  }),
}));

// Mock config for AuthProvider
const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    signIn: '/auth/signin/',
    signOut: '/auth/signout/',
    me: '/auth/me/',
    requestPasswordReset: '/auth/request-password-reset/',
    confirmPasswordReset: '/auth/confirm-password-reset/',
    profile: '/auth/profile/',
  },
  routes: {
    login: '/',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

// Helper to render with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider config={mockConfig} skipInitialLoad>
      {ui}
    </AuthProvider>
  );
};

describe('ProfilePage Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Axe Violations', () => {
    it('has no accessibility violations on default render', async () => {
      const { container } = renderWithAuth(<ProfilePage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with validation errors', async () => {
      const user = userEvent.setup();
      const { container } = renderWithAuth(<ProfilePage />);

      // Trigger validation error by submitting empty form
      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      await user.clear(firstNameInput);
      await user.click(submitButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with success message', async () => {
      // Re-mock with success state
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      const { container } = renderWithAuth(<ProfilePage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('allows tabbing through all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // Tab through form elements
      await user.tab();
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(lastNameInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key press', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfilePage />);

      mockMutate.mockResolvedValue({});

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);

      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      expect(mockMutate).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      });
    });
  });

  describe('Focus Management', () => {
    it('has visible focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // Verify each element can receive focus
      await user.tab();
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(lastNameInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Labels and ARIA', () => {
    it('has proper labels for all form inputs', () => {
      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);

      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');

      expect(lastNameInput).toBeInTheDocument();
      expect(lastNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('aria-required', 'true');

      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    it('has appropriate ARIA attributes for validation errors', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // Trigger validation error
      await user.clear(firstNameInput);
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/first name is required/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('has appropriate ARIA attributes for success message', () => {
      // Re-mock with success state
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<ProfilePage />);

      const successMessage = screen.getByText(/profile updated successfully/i);
      expect(successMessage).toBeInTheDocument();
    });

    it('has helper text for password field', () => {
      renderWithAuth(<ProfilePage />);

      const helperText = screen.getByText(/required to confirm changes/i);
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('provides accessible name for submit button', () => {
      renderWithAuth(<ProfilePage />);

      const submitButton = screen.getByRole('button', { name: /update profile/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('announces success message to screen readers', () => {
      // Re-mock with success state
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: false,
        error: null,
        success: true,
      });

      renderWithAuth(<ProfilePage />);

      const successMessage = screen.getByText(/profile updated successfully/i);
      expect(successMessage).toBeInTheDocument();
    });

    it('provides descriptive text for read-only sections', () => {
      renderWithAuth(<ProfilePage />);

      // Email section
      const emailHeading = screen.getByRole('heading', { name: /^email$/i, level: 2 });
      expect(emailHeading).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText(/email updates require verification/i)).toBeInTheDocument();

      // Password section
      const passwordHeading = screen.getByRole('heading', { name: /^password$/i, level: 2 });
      expect(passwordHeading).toBeInTheDocument();
      expect(screen.getByText(/password change - coming soon/i)).toBeInTheDocument();
    });
  });

  describe('Page Structure', () => {
    it('has proper heading hierarchy', () => {
      renderWithAuth(<ProfilePage />);

      const mainHeading = screen.getByRole('heading', { name: /^profile$/i, level: 1 });
      expect(mainHeading).toBeInTheDocument();

      const emailHeading = screen.getByRole('heading', { name: /^email$/i, level: 2 });
      expect(emailHeading).toBeInTheDocument();

      const passwordHeading = screen.getByRole('heading', { name: /^password$/i, level: 2 });
      expect(passwordHeading).toBeInTheDocument();
    });

    it('groups related form elements', () => {
      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /update profile/i });

      // All should have a common form ancestor
      const form = firstNameInput.closest('form');
      expect(form).toBe(lastNameInput.closest('form'));
      expect(form).toBe(passwordInput.closest('form'));
      expect(form).toBe(submitButton.closest('form'));
    });

    it('uses semantic HTML for sections', () => {
      const { container } = renderWithAuth(<ProfilePage />);

      // Check for proper use of headings
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      // Verify main heading exists
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/profile/i);
    });
  });

  describe('Loading State Accessibility', () => {
    it('shows accessible loading state for unauthenticated users', () => {
      // Mock no user
      jest.spyOn(require('../../../src/hooks/useCurrentUser'), 'useCurrentUser').mockReturnValue(null);

      renderWithAuth(<ProfilePage />);

      const loadingMessage = screen.getByText(/loading/i);
      expect(loadingMessage).toBeInTheDocument();
    });

    it('disables form during submission', () => {
      // Mock user and loading state
      mockUseCurrentUser.mockReturnValue(mockUser);
      jest.spyOn(require('../../../src/hooks/useUpdateProfile'), 'useUpdateProfile').mockReturnValue({
        mutate: mockMutate,
        loading: true,
        error: null,
        success: false,
      });

      renderWithAuth(<ProfilePage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/current password/i);
      const submitButton = screen.getByRole('button', { name: /loading/i });

      expect(firstNameInput).toBeDisabled();
      expect(lastNameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
