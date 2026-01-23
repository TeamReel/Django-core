# API Contract: GET /auth/me
*B13 Baseline API Endpoint*

**Feature**: F02 Core Auth Identity UI
**Backend**: B05 Core Accounts & Authentication
**Status**: ❌ **TO BE IMPLEMENTED** (critical for F02, not yet in B05)

---

## Endpoint Details

- **URL**: `GET /api/v1/auth/me`
- **Authentication**: **Required** (session cookie must be present and valid)
- **Content-Type**: `application/json`
- **CSRF Protection**: Not required (GET request, read-only)

---

## Purpose

This endpoint verifies the current session is valid and returns authenticated user profile data. Used by frontend for:

1. **Session verification on app load**: Check if user is still authenticated
2. **Periodic session checks**: Detect session expiry (24hr inactivity timeout)
3. **User profile display**: Show current user name, email, role in UI
4. **Authorization decisions**: Enable/disable features based on user role

---

## Request

### Headers

```http
GET /api/v1/auth/me HTTP/1.1
Host: example.com
Cookie: sessionid=<session_id>
```

### Query Parameters

None

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
  "email_verified": true,
  "is_active": true
}
```

**TypeScript Interface**:

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

**Side Effects**:
- Updates `last_activity` timestamp in session (extends 24hr inactivity timeout)
- No database writes (read-only operation)

---

### Error Responses

#### 401 Unauthorized - Not Authenticated

**Scenario**: No session cookie present or session cookie invalid.

```json
{
  "status": "error",
  "error": {
    "code": "not_authenticated",
    "message": "Authentication credentials were not provided.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Frontend Handling**:
- Clear local auth state (user is not logged in)
- Redirect to login page with `?next=` parameter (if appropriate)

---

#### 401 Unauthorized - Session Expired

**Scenario**: Session exceeded 24-hour inactivity timeout.

```json
{
  "status": "error",
  "error": {
    "code": "session_expired",
    "message": "Your session has expired due to inactivity.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Frontend Handling**:
- Clear local auth state
- Show session expired message to user
- Redirect to login page with `?next=` parameter

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
- Retry once after 1-2 seconds
- If retry fails, fall back to unauthenticated state

---

## Example Usage

### JavaScript (fetch)

```javascript
// Verify current session
async function getCurrentUser() {
  const response = await fetch('/api/v1/auth/me', {
    method: 'GET',
    credentials: 'include', // Send session cookie
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired or not authenticated
      const error = await response.json();
      console.log('Not authenticated:', error.error.code);
      return null;
    }
    throw new Error('Failed to verify session');
  }

  return await response.json();
}

// Usage
try {
  const user = await getCurrentUser();
  if (user) {
    console.log('Authenticated as:', user.email);
    // Update UI with user data
  } else {
    console.log('Not authenticated');
    // Redirect to login
    window.location.href = '/auth/login';
  }
} catch (error) {
  console.error('Session verification failed:', error.message);
  // Handle error (retry or show offline message)
}
```

---

### React Hook Example

```typescript
import { useEffect, useState } from 'react';

function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            setUser(null); // Not authenticated
            return;
          }
          throw new Error('Session verification failed');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError({
          status: 0,
          code: 'network_error',
          message: 'Unable to verify session',
        });
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  return { user, isLoading, error };
}

// Usage in component
function App() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <Spinner label="Loading..." />;
  }

  if (!user) {
    return <SignInPage />;
  }

  return <Dashboard user={user} />;
}
```

---

### cURL

```bash
# Verify session (with existing session cookie)
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt \
  -H "Content-Type: application/json"

# Expected response (authenticated):
# {
#   "id": 123,
#   "email": "user@example.com",
#   "first_name": "John",
#   "last_name": "Doe",
#   "role": "user",
#   "email_verified": true,
#   "is_active": true
# }

# Expected response (not authenticated):
# HTTP 401 Unauthorized
# {
#   "status": "error",
#   "error": {
#     "code": "not_authenticated",
#     "message": "Authentication credentials were not provided."
#   }
# }
```

---

## Frontend Integration Notes

### Session Verification Strategy

**On App Load**:
```typescript
// App.tsx
useEffect(() => {
  // Verify session on initial mount
  verifySession();
}, []);
```

**Periodic Polling** (optional, recommended):
```typescript
// Check session every 5 minutes
useEffect(() => {
  const interval = setInterval(() => {
    verifySession();
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, []);
```

**On API 401 Errors**:
```typescript
// Global error handler
if (response.status === 401) {
  // Session expired mid-request
  clearAuthState();
  redirectToLogin(window.location.pathname); // Preserve current URL
}
```

---

### Error Handling Patterns

```typescript
async function verifySession(): Promise<User | null> {
  try {
    const response = await fetch('/api/v1/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        const errorData = await response.json();

        // Differentiate between not authenticated and session expired
        if (errorData.error.code === 'session_expired') {
          // Show expiry message to user
          showSessionExpiredMessage();
        }

        return null; // Not authenticated
      }

      throw new Error('Session verification failed');
    }

    return await response.json();
  } catch (error) {
    // Network error - assume offline, don't clear auth state yet
    console.error('Network error during session verification:', error);
    return null; // Return null but don't redirect (might be temporary)
  }
}
```

---

## Testing

### Test Cases (TO BE IMPLEMENTED)

1. ⬜ **Valid session**: Returns 200 with user data
2. ⬜ **No session cookie**: Returns 401 not_authenticated
3. ⬜ **Expired session (24hr)**: Returns 401 session_expired
4. ⬜ **Invalid session ID**: Returns 401 not_authenticated
5. ⬜ **Inactive user**: Returns 200 with `is_active: false` (or 403?)
6. ⬜ **Updates last_activity**: Extends 24hr timeout on each call

### Manual Testing

```bash
# Test with valid session
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt \
  -v

# Test without session
curl -X GET http://localhost:8000/api/v1/auth/me \
  -v

# Test with expired session (wait 24hrs or manually expire in DB)
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt \
  -v
```

---

## Implementation Guidance

### Backend Implementation (Django)

**Location**: `src/accounts/api/views.py`

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.serializers import UserSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    """
    Get current authenticated user profile.
    Requires active session.
    """
    user = request.user

    # Determine role based on permissions
    if user.is_superuser:
        role = 'superadmin'
    elif user.groups.filter(name='Admins').exists():
        role = 'admin'
    else:
        role = 'user'

    # Return user profile data
    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': role,
        'email_verified': user.email_verified,
        'is_active': user.is_active,
    })
```

**URL Routing** (add to `src/accounts/api/urls.py`):

```python
urlpatterns = [
    # ... existing routes
    path('auth/me', me_api, name='auth-me'),
]
```

**Tests** (add to `tests/accounts/test_auth_api.py`):

```python
class TestAuthMeAPI:
    def test_authenticated_user_returns_profile(self, api_client, verified_user):
        api_client.force_authenticate(user=verified_user)
        response = api_client.get('/api/v1/auth/me')

        assert response.status_code == 200
        assert response.data['email'] == verified_user.email
        assert 'id' in response.data
        assert 'role' in response.data

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/api/v1/auth/me')

        assert response.status_code == 401
        assert response.data['error']['code'] == 'not_authenticated'

    def test_expired_session_returns_401(self, api_client, verified_user):
        # Simulate expired session (24hr timeout)
        api_client.force_authenticate(user=verified_user)
        # Manually set last_activity to 25 hours ago
        session = api_client.session
        session['last_activity'] = (timezone.now() - timedelta(hours=25)).timestamp()
        session.save()

        response = api_client.get('/api/v1/auth/me')

        assert response.status_code == 401
        assert response.data['error']['code'] == 'session_expired'
```

---

## Security Considerations

### Rate Limiting

⚠️ **Not Critical**: This is a read-only endpoint, rate limiting is less critical than for login/logout.

**Suggested limits** (if implemented):
- 100 requests per IP per minute (generous for periodic polling)
- No per-user limit (authenticated users can check frequently)

### Session Hijacking

- Session cookie is HttpOnly (prevents XSS theft)
- Session cookie is SameSite=Lax (prevents CSRF)
- Session ID is rotated on login/logout (prevents fixation)

### Information Disclosure

⚠️ **Consideration**: Ensure user data doesn't leak sensitive info:
- Don't include password hashes
- Don't include internal IDs for other entities (org_id, project_id)
- Keep profile data minimal (what frontend actually needs)

---

## Related Endpoints

- **POST /auth/login**: Create session and get initial user data
- **POST /auth/logout**: Invalidate current session
- **PATCH /auth/profile**: Update user profile (returns updated user data)

---

## Changelog

| Date       | Change |
|------------|--------|
| 2025-12-07 | Initial contract documentation (F02 Phase 1, TO BE IMPLEMENTED) |
