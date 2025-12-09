# API Contract: PATCH /auth/profile
*B13 Baseline API Endpoint*

**Feature**: F02 Core Auth Identity UI
**Backend**: B05 Core Accounts & Authentication
**Status**: ❌ **TO BE IMPLEMENTED** (required for F02 profile management)

---

## Endpoint Details

- **URL**: `PATCH /api/v1/auth/profile`
- **Authentication**: **Required** (session cookie must be present and valid)
- **Content-Type**: `application/json`
- **CSRF Protection**: ⚠️ **Required** (include `X-CSRFToken` header)

---

## Purpose

Update current authenticated user's profile information. Supports partial updates (only include fields to change).

**Future Enhancement**: Email changes will require verification flow (send confirmation email to new address).

---

## Request

### Headers

```http
PATCH /api/v1/auth/profile HTTP/1.1
Host: example.com
Content-Type: application/json
X-CSRFToken: <csrf_token_from_cookie>
Cookie: sessionid=<session_id>
```

### Body Schema

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "current_password": "user_password_for_verification"
}
```

**TypeScript Interface**:

```typescript
interface UpdateProfileRequest {
  first_name?: string; // Optional, minimum 1 character
  last_name?: string;  // Optional, minimum 1 character
  current_password: string; // Required for security verification
  // Future: email change (requires verification)
}
```

**Validation Rules**:
- `first_name`: 1-150 characters, letters/spaces/hyphens only
- `last_name`: 1-150 characters, letters/spaces/hyphens only
- `current_password`: **Required** - User's current password for verification (prevents unauthorized profile changes if session is hijacked)
- At least one field must be provided (empty PATCH not allowed)

---

## Response

### Success (200 OK)

**Body**:

```json
{
  "id": 123,
  "email": "user@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "user",
  "email_verified": true,
  "is_active": true,
  "message": "Profile updated successfully"
}
```

**TypeScript Interface**:

```typescript
interface UpdateProfileResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  email_verified: boolean;
  is_active: boolean;
  message: string;
}
```

**Side Effects**:
- Updates user record in database
- No session changes (user remains authenticated)
- Audit log entry created (future: B09 audit logging)

---

### Error Responses

#### 400 Bad Request - Validation Error

**Scenario**: Invalid field values or format.

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "first_name": ["This field cannot be blank."],
      "last_name": ["Ensure this field has no more than 150 characters."]
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

---

#### 400 Bad Request - Empty Request

**Scenario**: No fields provided in request body.

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "At least one field must be provided to update.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

---

#### 400 Bad Request - Invalid Password

**Scenario**: Provided `current_password` does not match user's actual password.

```json
{
  "status": "error",
  "error": {
    "code": "authentication_failed",
    "message": "Unable to verify credentials.",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Security Note**: Generic error message prevents password enumeration attacks.

---

#### 401 Unauthorized - Not Authenticated

**Scenario**: No session cookie or session expired.

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
- Clear auth state
- Redirect to login with `?next=/auth/profile`

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

// Update profile
async function updateProfile(updates) {
  const response = await fetch('/api/v1/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include', // Send session cookie
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// Usage
try {
  const updatedUser = await updateProfile({
    first_name: 'Jane',
    last_name: 'Smith',
  });
  console.log('Profile updated:', updatedUser);
  // Update UI with new user data
} catch (error) {
  console.error('Profile update failed:', error.message);
  // Display error to user
}
```

---

### React Component Example

```typescript
import { useState } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { useAuth } from '@django-core/auth-ui';

function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw parseApiError(errorData, response.status);
      }

      const updatedUser = await response.json();
      updateUser(updatedUser); // Update auth context
      setSuccess(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(false)}>
          Profile updated successfully!
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          {error.message}
        </Alert>
      )}

      <Input
        label="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
        error={error?.fieldErrors?.first_name?.[0]}
      />

      <Input
        label="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
        error={error?.fieldErrors?.last_name?.[0]}
      />

      <Input
        label="Email"
        value={user?.email}
        disabled
        helperText="Email cannot be changed at this time"
      />

      <Button type="submit" loading={isLoading}>
        Save Changes
      </Button>
    </form>
  );
}
```

---

### cURL

```bash
# Update profile (with active session)
curl -X PATCH http://localhost:8000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -b cookies.txt \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith"
  }'

# Response (success):
# {
#   "id": 123,
#   "email": "user@example.com",
#   "first_name": "Jane",
#   "last_name": "Smith",
#   "role": "user",
#   "email_verified": true,
#   "is_active": true,
#   "message": "Profile updated successfully"
# }

# Test without session (should fail with 401)
curl -X PATCH http://localhost:8000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"first_name": "Jane"}'
```

---

## Frontend Integration Notes

### Optimistic Updates

```typescript
// Update UI immediately, rollback on error
async function handleOptimisticUpdate(updates: Partial<User>) {
  const previousUser = user;

  // Optimistically update UI
  updateUser({ ...user, ...updates });

  try {
    const response = await fetch('/api/v1/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Update failed');
    }

    const updatedUser = await response.json();
    updateUser(updatedUser); // Confirm with server data
  } catch (error) {
    // Rollback on error
    updateUser(previousUser);
    showError('Failed to update profile');
  }
}
```

### Unsaved Changes Warning

```typescript
function ProfileForm() {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  function handleFieldChange(field: string, value: string) {
    setHasChanges(true);
    // ... update field
  }

  async function handleSubmit() {
    // ... save changes
    setHasChanges(false); // Clear flag on successful save
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields */}
    </form>
  );
}
```

---

## Testing

### Test Cases (TO BE IMPLEMENTED)

1. ⬜ **Update first name only**: Returns 200 with updated user
2. ⬜ **Update last name only**: Returns 200 with updated user
3. ⬜ **Update both names**: Returns 200 with updated user
4. ⬜ **Empty first name**: Returns 400 validation_error
5. ⬜ **First name too long (>150 chars)**: Returns 400 validation_error
6. ⬜ **No fields provided**: Returns 400 validation_error
7. ⬜ **Unauthenticated request**: Returns 401 not_authenticated
8. ⬜ **Expired session**: Returns 401 session_expired

### Manual Testing

```bash
# Test valid update
curl -X PATCH http://localhost:8000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -b cookies.txt \
  -d '{"first_name": "Jane", "last_name": "Smith"}'

# Test empty field
curl -X PATCH http://localhost:8000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -b cookies.txt \
  -d '{"first_name": ""}'

# Test no fields
curl -X PATCH http://localhost:8000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -b cookies.txt \
  -d '{}'

# Verify changes persisted
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt
```

---

## Implementation Guidance

### Backend Implementation (Django)

**Location**: `src/accounts/api/views.py`

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from accounts.serializers import UpdateProfileSerializer

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_api(request):
    """
    Update current authenticated user's profile.
    Supports partial updates (only include fields to change).
    """
    user = request.user

    serializer = UpdateProfileSerializer(
        user,
        data=request.data,
        partial=True  # Allow partial updates
    )

    if not serializer.validated_data:
        return Response(
            {
                'status': 'error',
                'error': {
                    'code': 'validation_error',
                    'message': 'At least one field must be provided to update.',
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer.is_valid(raise_exception=True)
    serializer.save()

    # Return updated user data
    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': get_user_role(user),
        'email_verified': user.email_verified,
        'is_active': user.is_active,
        'message': 'Profile updated successfully',
    })
```

**Serializer** (add to `src/accounts/serializers.py`):

```python
class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for partial profile updates."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'min_length': 1, 'max_length': 150},
            'last_name': {'required': False, 'min_length': 1, 'max_length': 150},
        }

    def validate_first_name(self, value):
        """Validate first name contains only letters, spaces, hyphens."""
        import re
        if not re.match(r'^[a-zA-Z\s\-]+$', value):
            raise serializers.ValidationError(
                'First name can only contain letters, spaces, and hyphens.'
            )
        return value

    def validate_last_name(self, value):
        """Validate last name contains only letters, spaces, hyphens."""
        import re
        if not re.match(r'^[a-zA-Z\s\-]+$', value):
            raise serializers.ValidationError(
                'Last name can only contain letters, spaces, and hyphens.'
            )
        return value
```

**URL Routing** (add to `src/accounts/api/urls.py`):

```python
urlpatterns = [
    # ... existing routes
    path('auth/profile', update_profile_api, name='auth-update-profile'),
]
```

---

## Security Considerations

### Authorization

- Users can only update their own profile (enforced by `IsAuthenticated` + `request.user`)
- No `user_id` parameter needed (always updates current user)
- Admins cannot update other users via this endpoint (use admin API for that)

### Input Validation

- Sanitize inputs to prevent XSS (Django does this automatically)
- Validate name fields contain only safe characters
- Enforce maximum lengths (150 chars per field)

### Audit Logging

⚠️ **Future Enhancement**: Log profile changes for audit trail.

**Recommended fields**:
- User ID
- Changed fields (before/after values)
- Timestamp
- IP address
- User agent

---

## Future Enhancements

### Email Change Flow

**Proposed implementation**:

1. User submits email change with new email
2. Backend sends verification email to new address
3. User clicks link in email → `POST /auth/verify-email-change?token=...`
4. Backend updates email if token valid
5. Old email receives notification of change

**Security considerations**:
- Require current password to initiate email change
- Send notification to old email address
- Invalidate existing sessions (force re-login)

### Profile Photo Upload

**Proposed implementation**:

```typescript
interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  profile_photo?: File; // Uploaded file
}

// Multipart form data
const formData = new FormData();
formData.append('first_name', firstName);
formData.append('profile_photo', photoFile);

fetch('/api/v1/auth/profile', {
  method: 'PATCH',
  headers: {
    'X-CSRFToken': getCsrfToken(),
  },
  credentials: 'include',
  body: formData, // Not JSON
});
```

---

## Related Endpoints

- **GET /auth/me**: Get current user profile (read-only)
- **POST /auth/login**: Authenticate and start session
- **PATCH /auth/password**: Change password (separate endpoint)

---

## Changelog

| Date       | Change |
|------------|--------|
| 2025-12-07 | Initial contract documentation (F02 Phase 1, TO BE IMPLEMENTED) |
