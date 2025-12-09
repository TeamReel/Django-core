/**
 * Unit tests for ProfileForm component.
 *
 * Tests:
 * - Renders with pre-populated name fields
 * - Validation: Empty first_name shows error
 * - Validation: Empty current_password shows error
 * - Success: Shows success message
 * - Server error: Displays inline error on current_password field
 * - Loading state: Inputs disabled, button shows spinner
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileForm } from '../../../src/components/forms/ProfileForm';
import { AuthProvider } from '../../../src/components/AuthProvider';
import { useUpdateProfile } from '../../../src/hooks/useUpdateProfile';
import { useCurrentUser } from '../../../src/hooks/useCurrentUser';
import type { User, AuthConfig, ApiError } from '../../../src/types';

// Mock hooks
jest.mock('../../../src/hooks/useUpdateProfile');
jest.mock('../../../src/hooks/useCurrentUser');

const mockUseUpdateProfile = useUpdateProfile as jest.MockedFunction<typeof useUpdateProfile>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

const mockConfig: AuthConfig = {
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

const mockUser: User = {
  id: 1,
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'user',
  email_verified: true,
  is_active: true,
};

describe('ProfileForm', () => {
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseCurrentUser.mockReturnValue(mockUser);
    mockUseUpdateProfile.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      success: false,
    });
  });

  it('should render with pre-populated name fields', () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;

    expect(firstNameInput.value).toBe('John');
    expect(lastNameInput.value).toBe('Doe');
  });

  it('should show validation error for empty first name', async () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i);
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const submitButton = screen.getByRole('button', { name: /Update Profile/i });

    // Clear first name
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.change(currentPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
    });

    // Mutate should not be called
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should show validation error for empty last name', async () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const submitButton = screen.getByRole('button', { name: /Update Profile/i });

    // Clear last name
    fireEvent.change(lastNameInput, { target: { value: '' } });
    fireEvent.change(currentPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should show validation error for empty current password', async () => {
    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i);
    const submitButton = screen.getByRole('button', { name: /Update Profile/i });

    // Change first name but don't enter password
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Current password is required for verification/i)).toBeInTheDocument();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should call mutate with trimmed values on valid submission', async () => {
    mockMutate.mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const submitButton = screen.getByRole('button', { name: /Update Profile/i });

    // Update fields with extra spaces
    fireEvent.change(firstNameInput, { target: { value: '  Jane  ' } });
    fireEvent.change(lastNameInput, { target: { value: '  Smith  ' } });
    fireEvent.change(currentPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        current_password: 'password123',
      });
    });
  });

  it('should display success message after successful update', async () => {
    mockUseUpdateProfile.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      success: true,
    });

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
  });

  it('should display server field error (incorrect password)', async () => {
    const mockError: ApiError = {
      status: 400,
      fieldErrors: {
        current_password: ['Current password is incorrect'],
      },
      formErrors: [],
    };

    mockUseUpdateProfile.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: mockError,
      success: false,
    });

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    expect(screen.getByText(/Current password is incorrect/i)).toBeInTheDocument();
  });

  it('should display server form error', async () => {
    const mockError: ApiError = {
      status: 500,
      fieldErrors: {},
      formErrors: ['An unexpected error occurred'],
    };

    mockUseUpdateProfile.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: mockError,
      success: false,
    });

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
  });

  it('should disable inputs and show loading button during submission', async () => {
    mockUseUpdateProfile.mockReturnValue({
      mutate: mockMutate,
      loading: true,
      error: null,
      success: false,
    });

    render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;
    const currentPasswordInput = screen.getByLabelText(/Current Password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /Loading.../i }) as HTMLButtonElement;

    expect(firstNameInput.disabled).toBe(true);
    expect(lastNameInput.disabled).toBe(true);
    expect(currentPasswordInput.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
  });

  it('should update form fields when user prop changes', async () => {
    const { rerender } = render(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    expect(firstNameInput.value).toBe('John');

    // Update mock to return different user
    const updatedUser: User = {
      ...mockUser,
      first_name: 'Jane',
      last_name: 'Smith',
    };
    mockUseCurrentUser.mockReturnValue(updatedUser);

    rerender(
      <AuthProvider config={mockConfig} skipInitialLoad>
        <ProfileForm />
      </AuthProvider>
    );

    await waitFor(() => {
      const updatedFirstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      expect(updatedFirstNameInput.value).toBe('Jane');
    });
  });
});
