import { rest } from 'msw';

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
  rest.post(`${BASE_URL}/login/`, async (req, res, ctx) => {
    const body = await req.json() as { email: string; password: string };

    if (body.email === TEST_USER.email && body.password === TEST_PASSWORD) {
      return res(ctx.json({
        success: true,
        user: TEST_USER,
      }));
    }

    // Invalid credentials
    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        errors: {
          __all__: ['Invalid email or password. Please try again.'],
        },
      })
    );
  }),

  // Session verification endpoint
  rest.get(`${BASE_URL}/me/`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      user: TEST_USER,
    }));
  }),

  // Sign-out endpoint
  rest.post(`${BASE_URL}/logout/`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Logged out successfully',
    }));
  }),

  // Password reset request endpoint
  rest.post(`${BASE_URL}/password/reset/`, async (req, res, ctx) => {
    const body = await req.json() as { email: string };

    // Always succeed for password reset requests (realistic behavior)
    return res(ctx.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    }));
  }),

  // Password reset confirm endpoint
  rest.post(`${BASE_URL}/password/reset/confirm/`, async (req, res, ctx) => {
    const body = await req.json() as {
      uid: string;
      token: string;
      new_password1: string;
      new_password2: string;
    };

    // Validate passwords match
    if (body.new_password1 !== body.new_password2) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            new_password2: ['Passwords do not match.'],
          },
        })
      );
    }

    // Validate password strength (basic)
    if (body.new_password1.length < 8) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            new_password1: ['Password must be at least 8 characters long.'],
          },
        })
      );
    }

    // Success case
    return res(ctx.json({
      success: true,
      message: 'Password has been reset successfully.',
    }));
  }),

  // Profile update endpoint
  rest.patch(`${BASE_URL}/profile/`, async (req, res, ctx) => {
    const body = await req.json() as Partial<{
      first_name: string;
      last_name: string;
      email: string;
    }>;

    // Email change not allowed in this mock
    if (body.email && body.email !== TEST_USER.email) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            email: ['Email changes must be confirmed via email verification.'],
          },
        })
      );
    }

    // Success case - return updated user
    const updatedUser = {
      ...TEST_USER,
      first_name: body.first_name || TEST_USER.first_name,
      last_name: body.last_name || TEST_USER.last_name,
    };

    return res(ctx.json({
      success: true,
      user: updatedUser,
    }));
  }),

  // Password change endpoint
  rest.post(`${BASE_URL}/password/change/`, async (req, res, ctx) => {
    const body = await req.json() as {
      old_password: string;
      new_password1: string;
      new_password2: string;
    };

    // Validate old password
    if (body.old_password !== TEST_PASSWORD) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            old_password: ['Current password is incorrect.'],
          },
        })
      );
    }

    // Validate new passwords match
    if (body.new_password1 !== body.new_password2) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            new_password2: ['Passwords do not match.'],
          },
        })
      );
    }

    // Validate password strength
    if (body.new_password1.length < 8) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          errors: {
            new_password1: ['Password must be at least 8 characters long.'],
          },
        })
      );
    }

    // Success case
    return res(ctx.json({
      success: true,
      message: 'Password changed successfully.',
    }));
  }),
];

// Export test data for use in tests
export const testUser = TEST_USER;
export const testPassword = TEST_PASSWORD;
