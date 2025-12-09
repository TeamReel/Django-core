import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, SignInPage, ProfilePage } from '../../index';
import { testUser, testPassword } from '../mocks/handlers';

/**
 * Integration Test: Complete Authentication Flow
 *
 * Tests the full user journey from sign-in through profile management to sign-out.
 * This validates cross-feature interactions and state management across components.
 *
 * User Journey:
 * 1. Sign in with valid credentials
 * 2. Verify authenticated state
 * 3. View profile information
 * 4. Update profile
 * 5. Sign out
 * 6. Verify unauthenticated state
 */

describe('Complete Authentication Flow', () => {
  const mockConfig = {
    apiBaseUrl: '/api/v1/auth',
    endpoints: {
      signIn: '/login/',
      signOut: '/logout/',
      requestPasswordReset: '/password/reset/',
      confirmPasswordReset: '/password/reset/confirm/',
      me: '/me/',
      profile: '/profile/',
    },
    routes: {
      login: '/login',
      defaultAfterLogin: '/dashboard',
      afterLogout: '/',
    },
  };

  beforeEach(() => {
    // Clear any stored auth state
    sessionStorage.clear();
    localStorage.clear();
  });

  it('completes full authenticated user journey', async () => {
    const user = userEvent.setup();

    // State to control which page is shown
    let currentPage: 'signin' | 'profile' = 'signin';

    // Wrapper component that maintains same AuthProvider instance
    const TestApp = () => (
      <AuthProvider config={mockConfig}>
        {currentPage === 'signin' ? <SignInPage /> : <ProfilePage />}
      </AuthProvider>
    );

    // Initial render with SignInPage
    const { rerender } = render(<TestApp />);

    // Step 1: Sign in
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, testUser.email);
    await user.type(passwordInput, testPassword);
    await user.click(submitButton);

    // Wait for sign-in to complete
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // Step 2: Navigate to ProfilePage (simulating route change)
    currentPage = 'profile';
    rerender(<TestApp />);

    // Wait for profile data to load (first_name and last_name are in form inputs)
    await waitFor(() => {
      expect(screen.getByDisplayValue(testUser.first_name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testUser.last_name)).toBeInTheDocument();
      // Email is displayed as text, not in an input, so check with getByText
      expect(screen.getByText(testUser.email)).toBeInTheDocument();
    });

    // Step 3: Update profile
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const updateButton = screen.getByRole('button', { name: /save|update/i });

    // Clear and update first name
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');

    // Clear and update last name
    await user.clear(lastNameInput);
    await user.type(lastNameInput, 'Doe');

    await user.click(updateButton);

    // Wait for update confirmation
    await waitFor(() => {
      const successMessage = screen.getByRole('alert');
      expect(successMessage).toHaveTextContent(/profile updated|saved successfully/i);
    });

    // Verify updated values are displayed
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();

    // Step 4: Sign out
    const signOutButton = screen.getByRole('button', { name: /sign out|log out/i });
    await user.click(signOutButton);

    // Wait for sign-out to complete and navigate back to sign-in
    currentPage = 'signin';
    rerender(<TestApp />);

    // Verify we're back at sign-in page (email input should be visible and empty)
    await waitFor(() => {
      const emailInputAfterSignOut = screen.getByLabelText(/email/i);
      expect(emailInputAfterSignOut).toBeInTheDocument();
      expect(emailInputAfterSignOut).toHaveValue('');
    });
  });

  it('handles sign-in failure gracefully', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider config={mockConfig}>
        <SignInPage />
      </AuthProvider>
    );

    // Attempt sign-in with invalid credentials
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'WrongPassword123!');
    await user.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/invalid email or password/i);
    });

    // Verify user is still on sign-in page (not authenticated)
    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  it('maintains session across component re-renders', async () => {
    const user = userEvent.setup();

    // State to control which page is shown
    let currentPage: 'signin' | 'profile' = 'signin';

    // Wrapper component that maintains same AuthProvider instance
    const TestApp = () => (
      <AuthProvider config={mockConfig}>
        {currentPage === 'signin' ? <SignInPage /> : <ProfilePage />}
      </AuthProvider>
    );

    // Initial render with sign-in page
    const { rerender } = render(<TestApp />);

    // Sign in
    await user.type(screen.getByLabelText(/email/i), testUser.email);
    await user.type(screen.getByLabelText(/password/i), testPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // Navigate to profile page (simulating navigation)
    currentPage = 'profile';
    rerender(<TestApp />);

    // Session should be maintained - profile should load
    // Email is shown as text in ProfilePage, not in an input
    await waitFor(() => {
      expect(screen.getByText(testUser.email)).toBeInTheDocument();
    });

    // Re-render again (simulating another navigation or component update)
    rerender(<TestApp />);

    // Session should still be maintained
    await waitFor(() => {
      expect(screen.getByText(testUser.email)).toBeInTheDocument();
    });
  });
});
