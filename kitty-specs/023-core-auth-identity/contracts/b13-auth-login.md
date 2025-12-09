# API Contract: POST /auth/login
*B13 Baseline API Endpoint*

**Feature**: F02 Core Auth Identity UI
**Backend**: B05 Core Accounts & Authentication
**Status**: ✅ **IMPLEMENTED** (tested in `tests/accounts/test_auth_api.py`)

---

## Endpoint Details

- **URL**: `POST /api/v1/auth/login`
- **Authentication**: None required (public endpoint)
- **Content-Type**: `application/json`
- **CSRF Protection**: ⚠️ **Required** (include `X-CSRFToken` header)

---

## Request

### Headers

```http
POST /api/v1/auth/login HTTP/1.1
Host: example.com
Content-Type: application/json
X-CSRFToken: <csrf_token_from_cookie>
```

### Body Schema

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**TypeScript Interface**:

```typescript
interface SignInRequest {
  email: string;    // Required, must be valid email format
  password: string; // Required, minimum 1 character (actual validation done server-side)
}
```

---

## Response

### Success (200 OK)

**Body**:

```json
{
  "id": 123,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "message": "Login successful"
}
```

**TypeScript Interface**:

```typescript
interface SignInResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  message: string;
}
```

**Side Effects**:
- Sets `sessionid` cookie (HttpOnly, SameSite=Lax, 7-day expiry)
- Stores `last_activity` timestamp in session (for 24hr inactivity timeout)
- Session cookie details:
  ```
  Set-Cookie: sessionid=<session_value>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
  ```

---

### Error Responses

#### 400 Bad Request - Validation Error

**Scenario**: Missing or invalid email/password format.

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "email": ["This field is required."],
      "password": ["This field is required."]
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

---

#### 400 Bad Request - Email Not Verified

**Scenario**: User exists but has not verified email address.

```json
{
  "status": "error",
  "error": {
    "code": "email_not_verified",
    "message": "Please verify your email address before logging in.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Frontend Handling**:
- Display error message to user
- Provide option to resend verification email (future feature)
- Do NOT reveal that account exists (for unverified emails from enumeration attempts)

---

#### 400 Bad Request - Account Inactive

**Scenario**: User account deactivated by administrator.

```json
{
  "status": "error",
  "error": {
    "code": "account_inactive",
    "message": "Your account has been deactivated. Please contact support.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

---

#### 400 Bad Request - Invalid Credentials

**Scenario**: Wrong email/password combination.

```json
{
  "status": "error",
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid email or password.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Security Note**: Generic message prevents email enumeration attacks. Backend returns same error whether:
- Email doesn't exist
- Password is wrong for existing user
- User exists but is inactive (in some cases)

---

#### 500 Internal Server Error

**Scenario**: Unexpected server error (database failure, unhandled exception).

```json
{
  "status": "error",
  "error": {
    "code": "server_error",
    "message": "An unexpected error occurred. Please try again later.",
    "details": {
      "error_id": "abc123def456"
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Frontend Handling**:
- Display generic error message
- Log `error_id` for support correlation
- Provide retry option

---

## Example Usage

### JavaScript (fetch)

```javascript
// Extract CSRF token from cookie
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('csrftoken='));
  return csrfCookie ? csrfCookie.split('=')[1] : '';
}

// Sign in request
async function signIn(email, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include', // Send cookies
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// Usage
try {
  const user = await signIn('user@example.com', 'Password123!');
  console.log('Logged in as:', user.email);
  // Redirect to dashboard or update UI state
} catch (error) {
  console.error('Sign in failed:', error.message);
  // Display error to user
}
```

---

### cURL

```bash
# Get CSRF token first (extract from cookie in response)
curl -c cookies.txt http://localhost:8000/api/v1/auth/login

# Extract CSRF token from cookies.txt
CSRF_TOKEN=$(grep csrftoken cookies.txt | awk '{print $7}')

# Sign in with credentials
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'

# Response (success):
# {
#   "id": 123,
#   "email": "user@example.com",
#   "first_name": "John",
#   "last_name": "Doe",
#   "role": "user",
#   "message": "Login successful"
# }
```

---

## Frontend Integration Notes

### Session Cookie Handling

- **Automatic**: Browser handles cookie storage, no manual action needed
- **Security**: HttpOnly prevents JavaScript access (XSS protection)
- **Credentials**: Always use `credentials: 'include'` in fetch/axios
- **Cross-origin**: Use `withCredentials: true` in axios for CORS

### Error Handling Patterns

```typescript
import { parseApiError } from './api-client';

async function handleSignIn(email: string, password: string) {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = parseApiError(errorData, response.status);

      // Handle specific error codes
      switch (error.code) {
        case 'email_not_verified':
          // Show email verification prompt
          break;
        case 'account_inactive':
          // Show contact support message
          break;
        case 'invalid_credentials':
          // Show generic "wrong email/password" message
          break;
        default:
          // Show generic error message
          break;
      }

      return { success: false, error };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    // Network error or JSON parse error
    return {
      success: false,
      error: {
        status: 0,
        code: 'network_error',
        message: 'Unable to connect. Please check your internet connection.',
      },
    };
  }
}
```

---

## Testing

### Test Cases (from `tests/accounts/test_auth_api.py`)

1. ✅ **Valid credentials**: Returns 200 with user data + session cookie
2. ✅ **Invalid email format**: Returns 400 validation_error
3. ✅ **Missing password**: Returns 400 validation_error
4. ✅ **Wrong password**: Returns 400 invalid_credentials
5. ✅ **Unverified email**: Returns 400 email_not_verified
6. ✅ **Inactive account**: Returns 400 account_inactive
7. ✅ **Role mapping**: Correctly maps Django permissions to role (superadmin/admin/user)

### Manual Testing

```bash
# Test successful login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "test@example.com", "password": "Test123!"}' \
  -c cookies.txt

# Test invalid credentials
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}' \
  -c cookies.txt

# Verify session cookie is set
cat cookies.txt | grep sessionid
```

---

## Security Considerations

### Rate Limiting

⚠️ **Recommendation**: Implement rate limiting on this endpoint to prevent brute-force attacks.

**Suggested limits**:
- 5 failed attempts per IP per 5 minutes
- 10 failed attempts per email per hour
- Use Redis-based rate limiting (django-ratelimit or custom middleware)

### Account Lockout

⚠️ **Future Enhancement**: Lock account after N failed login attempts.

**Proposed behavior**:
- Lock after 10 failed attempts in 1 hour
- Unlock after 30 minutes or via password reset
- Send notification email on lockout

### CSRF Token Refresh

- CSRF token is set on first GET request to any endpoint
- Token is valid for entire session duration
- No need to refresh token manually (Django handles rotation)

### Session Timeout

- **Absolute timeout**: 7 days (SESSION_COOKIE_AGE)
- **Inactivity timeout**: 24 hours (SESSION_INACTIVITY_TIMEOUT)
- **Enforced by**: `SessionInactivityMiddleware` on every authenticated request
- **Frontend action**: Handle 401 responses, redirect to login

---

## Related Endpoints

- **POST /auth/logout**: Sign out current user
- **GET /auth/me**: Verify session and get current user profile
- **POST /auth/register**: Create new user account
- **POST /auth/password-reset**: Request password reset email

---

## Changelog

| Date       | Change |
|------------|--------|
| 2025-12-07 | Initial contract documentation (F02 Phase 1) |
