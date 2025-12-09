import { http, HttpResponse } from 'msw';

/**
 * MSW Request Handlers for Integration Tests
 *
 * Provides realistic API mocking for all authentication endpoints.
 * Uses realistic test data (no placeholders like "test@test.com").
 */

const BASE_URL = '/api/v1/auth';

// Realistic test user data
const TEST_USER = {
  id: 1,
  email: 'sarah.chen@techcorp.io',
  first_name: 'Sarah',
  last_name: 'Chen',
};

const TEST_PASSWORD = 'SecurePass123!@#';

export const handlers = [
  // Sign-in endpoint
  http.post(`${BASE_URL}/login/`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === TEST_USER.email && body.password === TEST_PASSWORD) {
      return HttpResponse.json({
        success: true,
        user: TEST_USER,
      });
    }

    // Invalid credentials
    return HttpResponse.json(
      {
        success: false,
        errors: {
          __all__: ['Invalid email or password. Please try again.'],
        },
      },
      { status: 400 }
    );
  }),

  // Session verification endpoint
  http.get(`${BASE_URL}/me/`, () => {
    return HttpResponse.json({
      success: true,
      user: TEST_USER,
    });
  }),

  // Sign-out endpoint
  http.post(`${BASE_URL}/logout/`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  // Password reset request endpoint
  http.post(`${BASE_URL}/password/reset/`, async ({ request }) => {
    const body = await request.json() as { email: string };

    // Always succeed for password reset requests (realistic behavior)
    return HttpResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    });
  }),

  // Password reset confirm endpoint
  http.post(`${BASE_URL}/password/reset/confirm/`, async ({ request }) => {
    const body = await request.json() as {
      uid: string;
      token: string;
      new_password1: string;
      new_password2: string;
    };

    // Validate passwords match
    if (body.new_password1 !== body.new_password2) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            new_password2: ['Passwords do not match.'],
          },
        },
        { status: 400 }
      );
    }

    // Validate password strength (basic)
    if (body.new_password1.length < 8) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            new_password1: ['Password must be at least 8 characters long.'],
          },
        },
        { status: 400 }
      );
    }

    // Success case
    return HttpResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  }),

  // Profile update endpoint
  http.patch(`${BASE_URL}/profile/`, async ({ request }) => {
    const body = await request.json() as Partial<{
      first_name: string;
      last_name: string;
      email: string;
    }>;

    // Email change not allowed in this mock
    if (body.email && body.email !== TEST_USER.email) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            email: ['Email changes must be confirmed via email verification.'],
          },
        },
        { status: 400 }
      );
    }

    // Success case - return updated user
    const updatedUser = {
      ...TEST_USER,
      first_name: body.first_name || TEST_USER.first_name,
      last_name: body.last_name || TEST_USER.last_name,
    };

    return HttpResponse.json({
      success: true,
      user: updatedUser,
    });
  }),

  // Password change endpoint
  http.post(`${BASE_URL}/password/change/`, async ({ request }) => {
    const body = await request.json() as {
      old_password: string;
      new_password1: string;
      new_password2: string;
    };

    // Validate old password
    if (body.old_password !== TEST_PASSWORD) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            old_password: ['Current password is incorrect.'],
          },
        },
        { status: 400 }
      );
    }

    // Validate new passwords match
    if (body.new_password1 !== body.new_password2) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            new_password2: ['Passwords do not match.'],
          },
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (body.new_password1.length < 8) {
      return HttpResponse.json(
        {
          success: false,
          errors: {
            new_password1: ['Password must be at least 8 characters long.'],
          },
        },
        { status: 400 }
      );
    }

    // Success case
    return HttpResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  }),
];

// Export test data for use in tests
export const testUser = TEST_USER;
export const testPassword = TEST_PASSWORD;
