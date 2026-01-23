# API Contract: POST /auth/logout
*B13 Baseline API Endpoint*

**Feature**: F02 Core Auth Identity UI
**Backend**: B05 Core Accounts & Authentication
**Status**: ✅ **IMPLEMENTED** (tested in `tests/accounts/test_auth_api.py`)

---

## Endpoint Details

- **URL**: `POST /api/v1/auth/logout`
- **Authentication**: None required (works with or without session)
- **Content-Type**: `application/json`
- **CSRF Protection**: ⚠️ **Required** (include `X-CSRFToken` header)

---

## Request

### Headers

```http
POST /api/v1/auth/logout HTTP/1.1
Host: example.com
Content-Type: application/json
X-CSRFToken: <csrf_token_from_cookie>
Cookie: sessionid=<session_id>
```

### Body Schema

**None** - Empty request body (or omit body entirely).

---

## Response

### Success (204 No Content)

**Body**: Empty (no response body)

**Side Effects**:
- Deletes session from database
- Clears `sessionid` cookie
- Sets `last_activity` to null (cleanup)
- Cookie deletion header:
  ```
  Set-Cookie: sessionid=; Path=/; Max-Age=0
  ```

---

### Error Responses

This endpoint **does not return errors**. Logout always succeeds:
- If session exists: Session is deleted
- If no session: No-op, still returns 204
- If CSRF token invalid: Django CSRF middleware returns 403 (before view)

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

// Sign out request
async function signOut() {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include', // Send cookies
  });

  if (!response.ok) {
    throw new Error('Sign out failed');
  }

  // No response body to parse (204 No Content)
  return { success: true };
}

// Usage
try {
  await signOut();
  console.log('Signed out successfully');
  // Redirect to home page or login page
  window.location.href = '/';
} catch (error) {
  console.error('Sign out failed:', error.message);
  // Still redirect even if logout failed
  window.location.href = '/';
}
```

---

### cURL

```bash
# Extract CSRF token from existing session
CSRF_TOKEN=$(grep csrftoken cookies.txt | awk '{print $7}')

# Sign out
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -b cookies.txt \
  -c cookies.txt

# Response: 204 No Content (empty body)
# Session cookie is cleared in cookies.txt
```

---

## Frontend Integration Notes

### Session Cleanup

After successful logout:
1. Clear frontend auth state (user, token, etc.)
2. Clear any cached data (localStorage, sessionStorage)
3. Redirect to home page or login page
4. Session cookie is automatically removed by browser

### Error Handling

```typescript
async function handleSignOut() {
  try {
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });

    // Logout endpoint always returns 204, no need to check status
    // Even if it fails, we still clear local state and redirect
  } catch (error) {
    // Network error - still proceed with local cleanup
    console.warn('Logout request failed, but clearing local state:', error);
  } finally {
    // ALWAYS clear local state and redirect, regardless of API response
    clearAuthState();
    window.location.href = '/';
  }
}
```

### React Hook Example

```typescript
import { useAuth } from '@django-core/auth-ui';

function useSignOut() {
  const { clearAuth } = useAuth();

  return async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });
    } finally {
      // Always clear auth state, even if request failed
      clearAuth();
      window.location.href = '/';
    }
  };
}
```

---

## Testing

### Test Cases (from `tests/accounts/test_auth_api.py`)

1. ✅ **Authenticated user logout**: Returns 204, clears session cookie
2. ✅ **Unauthenticated logout**: Returns 204 (no-op, no error)

### Manual Testing

```bash
# Test logout with active session
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -b cookies.txt \
  -c cookies.txt \
  -v

# Expected: HTTP 204 No Content
# Verify session cookie is cleared:
cat cookies.txt | grep sessionid
# Should be empty or show Max-Age=0

# Test logout without session (should still succeed)
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -v

# Expected: HTTP 204 No Content
```

---

## Security Considerations

### CSRF Protection

- **Why required**: Prevents malicious sites from logging users out via hidden forms
- **How it works**: Django validates `X-CSRFToken` header matches session token
- **Missing token**: Returns 403 Forbidden (before view is called)

### Logout Without Redirect

⚠️ **Important**: Frontend must handle redirect after logout. The API endpoint does NOT redirect (returns 204, not 302).

**Bad Practice**:
```javascript
// Don't do this - user stays on authenticated page
await fetch('/api/v1/auth/logout', { ... });
// No redirect, user sees stale UI
```

**Good Practice**:
```javascript
// Always redirect or update UI after logout
await fetch('/api/v1/auth/logout', { ... });
window.location.href = '/'; // Redirect to home
```

### Session Fixation Prevention

Django automatically rotates session ID on login/logout to prevent session fixation attacks:
- Old session ID is invalidated
- New session ID is generated (if user logs in again)

### Concurrent Sessions

- Django allows multiple sessions per user (different browsers/devices)
- Logout only clears current session, not all user sessions
- **Future Enhancement**: Add "logout all devices" feature

---

## Related Endpoints

- **POST /auth/login**: Sign in and create session
- **GET /auth/me**: Verify current session is still valid
- **POST /auth/password-reset**: Invalidates all sessions on password reset

---

## Implementation Notes

### Backend Source

From `src/accounts/api/views.py`:

```python
@api_view(['POST'])
def logout_api(request):
    """
    Log out the current user and clear session.
    Always returns 204 No Content, even if user is not authenticated.
    """
    logout(request)  # Django's built-in logout (clears session)
    return Response(status=status.HTTP_204_NO_CONTENT)
```

### URL Routing

From `src/accounts/api/urls.py`:

```python
urlpatterns = [
    path('auth/logout', logout_api, name='auth-logout'),
    # ... other auth endpoints
]
```

---

## Changelog

| Date       | Change |
|------------|--------|
| 2025-12-07 | Initial contract documentation (F02 Phase 1) |
