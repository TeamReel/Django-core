# Data Model: F02 Core Auth Identity UI
*Path: kitty-specs/023-core-auth-identity/data-model.md*

**Feature**: F02 Core Auth Identity UI
**Branch**: 023-core-auth-identity
**Date**: 2025-12-07

## Overview

This document defines all TypeScript types and data structures for F02 Core Auth Identity UI. These types establish contracts between the frontend package, B13 API layer, and consuming applications.

---

## Core Types

### AuthState

Global authentication state managed by `<AuthProvider>` and accessed via `useAuth()` hook.

```typescript
interface AuthState {
  /**
   * Current authenticated user profile.
   * Null if not authenticated or session verification pending.
   */
  user: User | null;

  /**
   * Authentication status indicator.
   * - 'authenticated': User session verified, user profile loaded
   * - 'unauthenticated': No active session or session expired
   * - 'loading': Initial session verification in progress
   * - 'error': Session verification failed (network error)
   */
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'error';

  /**
   * Loading state for auth operations.
   * True during: session verification, sign-in, sign-out.
   */
  isLoading: boolean;

  /**
   * Error from last auth operation or session verification.
   * Null when no error present.
   */
  error: ApiError | null;

  /**
   * Timestamp of last successful session verification.
   * Used for periodic session checks (24hr inactivity timeout).
   */
  lastVerified: number | null;
}
```

---

### User

User profile data returned from `/auth/login` and `/auth/me` endpoints.

```typescript
interface User {
  /**
   * Unique user identifier (database primary key).
   */
  id: number;

  /**
   * User's email address (used for authentication).
   */
  email: string;

  /**
   * User's first name.
   */
  first_name: string;

  /**
   * User's last name.
   */
  last_name: string;

  /**
   * User's role in the system.
   * - 'superadmin': Full system access
   * - 'admin': Organization-level access
   * - 'user': Standard user access
   */
  role: 'superadmin' | 'admin' | 'user';

  /**
   * Email verification status.
   * True if user has verified email via verification link.
   */
  email_verified: boolean;

  /**
   * Account active status.
   * False if account deactivated by administrator.
   */
  is_active: boolean;
}
```

**Computed Properties** (helper functions, not in API response):

```typescript
/**
 * Get display name for user (first_name + last_name).
 */
function getUserDisplayName(user: User): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

/**
 * Get initials for user avatar (e.g., "JD" for "John Doe").
 */
function getUserInitials(user: User): string {
  const first = user.first_name.charAt(0).toUpperCase();
  const last = user.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}
```

---

### AuthConfig

Configuration object passed to `<AuthProvider>` to wire up backend URLs and routing behavior.

```typescript
interface AuthConfig {
  /**
   * Base URL for API endpoints (e.g., "/api/v1").
   * Combined with endpoint paths to construct full URLs.
   */
  apiBaseUrl: string;

  /**
   * API endpoint paths relative to apiBaseUrl.
   */
  endpoints: {
    /**
     * POST /auth/login
     * Sign in with email + password.
     */
    signIn: string;

    /**
     * POST /auth/logout
     * Sign out current user.
     */
    signOut: string;

    /**
     * POST /auth/password-reset
     * Request password reset email.
     */
    requestPasswordReset: string;

    /**
     * POST /auth/password-reset-confirm
     * Confirm password reset with token.
     */
    confirmPasswordReset: string;

    /**
     * GET /auth/me
     * Verify session and get current user profile.
     * **Status**: TO BE IMPLEMENTED (not yet in B05)
     */
    me: string;

    /**
     * PATCH /auth/profile
     * Update current user profile.
     * **Status**: TO BE IMPLEMENTED (not yet in B05)
     */
    updateProfile: string;
  };

  /**
   * Application route paths for redirects.
   */
  routes: {
    /**
     * Sign-in page URL (e.g., "/auth/login").
     * Used for redirects after session expiry or unauthorized access.
     */
    login: string;

    /**
     * Default redirect URL after successful sign-in (e.g., "/app" or "/dashboard").
     * Overridden by ?next= query parameter if present.
     */
    defaultAfterLogin: string;

    /**
     * Redirect URL after sign-out (e.g., "/" or "/auth/login").
     */
    afterLogout: string;
  };

  /**
   * Security and behavior settings (optional).
   */
  security?: {
    /**
     * Enable/disable periodic session verification (default: true).
     * When enabled, calls /auth/me every 5 minutes to check session validity.
     */
    enableSessionPolling?: boolean;

    /**
     * Session polling interval in milliseconds (default: 300000 = 5 minutes).
     * Only used if enableSessionPolling is true.
     */
    sessionPollingInterval?: number;
  };
}
```

**Example Usage**:

```typescript
// SPA configuration
const authConfig: AuthConfig = {
  apiBaseUrl: '/api/v1',
  endpoints: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    requestPasswordReset: '/auth/password-reset',
    confirmPasswordReset: '/auth/password-reset-confirm',
    me: '/auth/me',
    updateProfile: '/auth/profile',
  },
  routes: {
    login: '/auth/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
  security: {
    enableSessionPolling: true,
    sessionPollingInterval: 300000, // 5 minutes
  },
};

// Django template configuration (injected via data-attributes)
<div
  id="auth-root"
  data-api-base-url="/api/v1"
  data-login-route="/auth/login"
  data-after-login-route="/app"
  data-after-logout-route="/"
></div>
```

---

## Error Types

### ApiError

Normalized error structure parsed from B13 API envelope responses.

```typescript
interface ApiError {
  /**
   * HTTP status code (400, 401, 403, 404, 500).
   */
  status: number;

  /**
   * Error code from B13 envelope (e.g., "validation_error", "authentication_failed").
   */
  code: string;

  /**
   * Human-readable error message.
   */
  message: string;

  /**
   * Field-specific validation errors (for 400 validation_error responses).
   * Keys are field names, values are arrays of error messages.
   */
  fieldErrors?: Record<string, string[]>;

  /**
   * Form-level errors (non-field-specific).
   * Examples: "Invalid credentials", "Session expired".
   */
  formErrors?: string[];

  /**
   * Timestamp from B13 meta object (ISO 8601 format).
   */
  timestamp?: string;
}
```

**B13 Envelope Format** (raw API response):

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "email": ["This field is required."],
      "password": ["Password must be at least 8 characters."]
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Normalized ApiError** (after parsing):

```typescript
const error: ApiError = {
  status: 400,
  code: 'validation_error',
  message: 'Validation failed',
  fieldErrors: {
    email: ['This field is required.'],
    password: ['Password must be at least 8 characters.'],
  },
  timestamp: '2025-12-07T10:30:00Z',
};
```

---

### Error Parsing Utility

```typescript
/**
 * Parse B13 API error response into normalized ApiError.
 * Handles validation errors, authentication errors, and generic errors.
 */
function parseApiError(response: any, status: number): ApiError {
  const errorData = response?.error || {};

  const error: ApiError = {
    status,
    code: errorData.code || 'unknown_error',
    message: errorData.message || 'An unexpected error occurred',
    timestamp: response?.meta?.timestamp,
  };

  // Parse field-specific validation errors
  if (errorData.details && typeof errorData.details === 'object') {
    error.fieldErrors = errorData.details;
  }

  // Handle non-field errors (e.g., "Invalid credentials")
  if (errorData.code === 'authentication_failed' || errorData.code === 'invalid_credentials') {
    error.formErrors = [errorData.message];
  }

  return error;
}
```

---

## Request/Response Shapes

### Sign In

**Endpoint**: `POST /auth/login`

**Request**:
```typescript
interface SignInRequest {
  email: string;
  password: string;
}
```

**Response (200 Success)**:
```typescript
interface SignInResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  message: string; // e.g., "Login successful"
}
```

**Errors**:
- **400 validation_error**: Missing email/password
- **400 email_not_verified**: User exists but email not verified
- **400 account_inactive**: User account deactivated by admin
- **400 invalid_credentials**: Wrong email/password (generic message for security)

---

### Sign Out

**Endpoint**: `POST /auth/logout`

**Request**: None (authenticated request)

**Response (204 No Content)**: Empty body

**Errors**: None (logout always succeeds)

---

### Request Password Reset

**Endpoint**: `POST /auth/password-reset`

**Request**:
```typescript
interface RequestPasswordResetRequest {
  email: string;
}
```

**Response (200 Success)**:
```typescript
interface RequestPasswordResetResponse {
  message: string; // "If an account exists, a reset link has been sent."
}
```

**Errors**:
- **400 validation_error**: Invalid email format

**Security Note**: Response is always the same regardless of email existence (prevents email enumeration).

---

### Confirm Password Reset

**Endpoint**: `POST /auth/password-reset-confirm`

**Request**:
```typescript
interface ConfirmPasswordResetRequest {
  uidb64: string;    // Base64-encoded user ID (from email link)
  token: string;     // Password reset token (from email link)
  new_password: string;
}
```

**Response (200 Success)**:
```typescript
interface ConfirmPasswordResetResponse {
  message: string; // "Password reset successful"
}
```

**Errors**:
- **400 invalid_token**: Token expired or invalid
- **400 validation_error**: Password doesn't meet complexity requirements

**Security Note**: All existing user sessions are invalidated after successful password reset.

---

### Get Current User (Session Verification)

**Endpoint**: `GET /auth/me`
**Status**: ⚠️ **TO BE IMPLEMENTED** (not yet in B05)

**Request**: None (authenticated request)

**Response (200 Success)**:
```typescript
interface GetCurrentUserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  email_verified: boolean;
  is_active: boolean;
}
```

**Errors**:
- **401 not_authenticated**: No active session
- **403 session_expired**: Session exceeded 24-hour inactivity timeout

---

### Update Profile

**Endpoint**: `PATCH /auth/profile`
**Status**: ⚠️ **TO BE IMPLEMENTED** (not yet in B05)

**Request**:
```typescript
interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  // Future: email change (requires verification)
}
```

**Response (200 Success)**:
```typescript
interface UpdateProfileResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  email_verified: boolean;
  is_active: boolean;
  message: string; // "Profile updated successfully"
}
```

**Errors**:
- **400 validation_error**: Invalid field values
- **401 not_authenticated**: Session expired

---

## Hook Return Types

### Mutation Hooks

All mutation hooks (`useSignIn`, `useSignOut`, `useRequestPasswordReset`, etc.) return this shape:

```typescript
interface MutationResult<TData, TVariables> {
  /**
   * Execute the mutation with given variables.
   */
  mutate: (variables: TVariables) => Promise<TData>;

  /**
   * Loading state (true during API request).
   */
  isLoading: boolean;

  /**
   * Error from last mutation (null if no error).
   */
  error: ApiError | null;

  /**
   * Data from last successful mutation (null if not called yet).
   */
  data: TData | null;

  /**
   * Reset mutation state (clear error, data, loading).
   */
  reset: () => void;
}
```

**Example**:

```typescript
const {
  mutate: signIn,
  isLoading,
  error,
  data,
} = useSignIn();

// Call mutation
await signIn({ email: 'user@example.com', password: 'Password123!' });
```

---

### Query Hooks

Query hooks (`useCurrentUser`, `useAuthStatus`) return this shape:

```typescript
interface QueryResult<TData> {
  /**
   * Data from query (null if loading or error).
   */
  data: TData | null;

  /**
   * Loading state (true during initial fetch or refetch).
   */
  isLoading: boolean;

  /**
   * Error from query (null if no error).
   */
  error: ApiError | null;

  /**
   * Refetch data (force refresh).
   */
  refetch: () => Promise<void>;
}
```

---

## Validation Schemas

### Password Complexity Rules

Frontend validation must match Django backend validators:

```typescript
interface PasswordValidationRules {
  minLength: 8;
  requireUppercase: true;  // At least 1 uppercase letter (A-Z)
  requireLowercase: true;  // At least 1 lowercase letter (a-z)
  requireNumber: true;     // At least 1 number (0-9)
  requireSpecial: true;    // At least 1 special char (!@#$%^&*()_+-=[]{}|;:,.<>?)
}
```

**Validation Function**:

```typescript
function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}
```

---

### Email Validation

```typescript
function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return 'Email is required';
  }

  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}
```

---

## Session Management

### Session State Machine

```
┌─────────────┐
│  loading    │ ──┬─→ Session check on mount
└─────────────┘   │
       │          │
       ├──────────┴─→ GET /auth/me
       │
       ├─→ 200: User data
       │   └─→ authenticated
       │
       └─→ 401: No session
           └─→ unauthenticated
```

### Session Expiry Scenarios

1. **24-Hour Inactivity Timeout**:
   - Backend middleware checks `last_activity` timestamp
   - If >24 hours since last request → 401 `session_expired`
   - Frontend: Clear auth state, redirect to login with `?next=`

2. **Absolute 7-Day Timeout**:
   - Django `SESSION_COOKIE_AGE = 604800` (7 days)
   - Cookie expires after 7 days regardless of activity
   - Frontend: Next request returns 401, same flow as above

3. **Manual Sign-Out**:
   - User clicks sign-out → `POST /auth/logout`
   - Backend calls Django `logout()`, clears session
   - Frontend: Clear auth state, redirect to `afterLogout` route

---

## CSRF Token Handling

### Token Extraction

```typescript
/**
 * Extract CSRF token from cookie set by Django middleware.
 * Cookie name: 'csrftoken' (not HttpOnly, readable by JavaScript).
 */
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('csrftoken='));
  return csrfCookie ? csrfCookie.split('=')[1].trim() : null;
}
```

### Request Headers

```typescript
/**
 * Build headers for authenticated API requests.
 */
function buildRequestHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  return headers;
}
```

---

## Implementation Notes

### Type Safety

- All exported types must have JSDoc comments
- Use `strict: true` in `tsconfig.json`
- No `any` types in public API surface
- Discriminated unions for status states (e.g., `status: 'authenticated' | 'unauthenticated'`)

### Serialization

- All API requests/responses use JSON
- Dates serialized as ISO 8601 strings (UTC)
- No `undefined` in JSON (use `null` for missing values)

### Naming Conventions

- Types: PascalCase (e.g., `AuthState`, `User`)
- Functions: camelCase (e.g., `useAuth`, `parseApiError`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `SESSION_POLLING_INTERVAL`)
- Private internals: prefix with underscore (e.g., `_apiClient`)

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2025-12-07 | Initial data model specification |
