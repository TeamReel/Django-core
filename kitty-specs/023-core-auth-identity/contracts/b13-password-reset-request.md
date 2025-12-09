# API Contract: POST /auth/password-reset
*B13 Baseline API Endpoint*

**Feature**: F02 Core Auth Identity UI
**Backend**: B05 Core Accounts & Authentication
**Status**: ✅ **IMPLEMENTED** (tested in `tests/accounts/test_auth_api.py`)

---

## Endpoint Details

- **URL**: `POST /api/v1/auth/password-reset`
- **Authentication**: None required (public endpoint)
- **Content-Type**: `application/json`
- **CSRF Protection**: ⚠️ **Required** (include `X-CSRFToken` header)

---

## Purpose

Request a password reset email. Sends email with password reset link containing `uidb64` and `token` parameters. Link format: `/auth/password-reset-confirm?uidb64=<value>&token=<value>`

**Security**: Uses generic response message to prevent email enumeration attacks. Always returns success response regardless of whether email exists.

---

## Request

### Headers

```http
POST /api/v1/auth/password-reset HTTP/1.1
Host: example.com
Content-Type: application/json
X-CSRFToken: <csrf_token_from_cookie>
```

### Body Schema

```json
{
  "email": "user@example.com"
}
```

**TypeScript Interface**:

```typescript
interface RequestPasswordResetRequest {
  email: string; // Required, must be valid email format
}
```

---

## Response

### Success (200 OK)

**Body**:

```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**TypeScript Interface**:

```typescript
interface RequestPasswordResetResponse {
  message: string;
}
```

**Behavior**:
- **Email exists + verified + active**: Sends password reset email with link
- **Email doesn't exist**: Returns same message, does NOT send email
- **Email exists but not verified**: Returns same message, does NOT send email
- **Email exists but inactive**: Returns same message, does NOT send email

**Email Contents**:
- Subject: "Password Reset Request"
- Reset link: `https://example.com/auth/password-reset-confirm?uidb64=<base64_user_id>&token=<reset_token>`
- Token validity: 24 hours (Django default)
- Token type: Django's `default_token_generator` (one-time use)

**Side Effects**:
- Creates password reset token in backend
- Sends email via Django email backend
- No session changes (endpoint is stateless)

---

### Error Responses

#### 400 Bad Request - Validation Error

**Scenario**: Missing or invalid email format.

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "email": ["This field is required."]
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

---

#### 500 Internal Server Error

**Scenario**: Email sending failure (SMTP error, network issue).

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
- Display error message: "Unable to send reset email. Please try again."
- Provide retry button
- Log error_id for support

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

// Request password reset
async function requestPasswordReset(email) {
  const response = await fetch('/api/v1/auth/password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// Usage
try {
  const result = await requestPasswordReset('user@example.com');
  console.log(result.message);
  // Show success message to user
  alert('If an account exists, a reset link has been sent to your email.');
} catch (error) {
  console.error('Password reset request failed:', error.message);
  // Display error to user
}
```

---

### React Component Example

```typescript
import { useState } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';

function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError('Unable to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <Alert variant="success">
        If an account exists with this email, a password reset link has been sent.
        Check your inbox and follow the instructions.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        error={error}
      />
      <Button type="submit" loading={isLoading}>
        Send Reset Link
      </Button>
    </form>
  );
}
```

---

### cURL

```bash
# Request password reset
curl -X POST http://localhost:8000/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "user@example.com"}'

# Response:
# {
#   "message": "If an account exists with this email, a password reset link has been sent."
# }
```

---

## Frontend Integration Notes

### User Experience Flow

1. User clicks "Forgot Password?" link on sign-in page
2. User enters email address
3. User clicks "Send Reset Link" button
4. Frontend shows generic success message (regardless of email existence)
5. If email exists: User receives email with reset link
6. User clicks link in email → opens `/auth/password-reset-confirm?uidb64=...&token=...`
7. User enters new password → calls `/auth/password-reset-confirm` endpoint

### Success Message

**Always use generic message** to prevent email enumeration:

✅ **Good**:
```
If an account exists with this email, a password reset link has been sent.
Check your inbox and spam folder.
```

❌ **Bad** (reveals email existence):
```
Password reset link sent to user@example.com
```

### Rate Limiting Display

If rate limit is exceeded (future feature), show helpful message:

```
Too many password reset requests. Please wait 15 minutes before trying again.
```

---

## Testing

### Test Cases (from `tests/accounts/test_auth_api.py`)

1. ✅ **Valid email (exists, verified, active)**: Returns 200, sends email
2. ✅ **Valid email (doesn't exist)**: Returns 200, doesn't send email (anti-enumeration)
3. ✅ **Valid email (exists but not verified)**: Returns 200, doesn't send email
4. ✅ **Invalid email format**: Returns 400 validation_error
5. ✅ **Missing email**: Returns 400 validation_error

### Manual Testing

```bash
# Test valid email
curl -X POST http://localhost:8000/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "existing@example.com"}'

# Check email logs (development):
# python manage.py shell
# >>> from django.core.mail import outbox
# >>> print(outbox[-1].body)  # View last sent email

# Test non-existent email (should return same message)
curl -X POST http://localhost:8000/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "nonexistent@example.com"}'

# Test invalid email
curl -X POST http://localhost:8000/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"email": "not-an-email"}'
```

---

## Security Considerations

### Email Enumeration Prevention

**Implementation**: Always return same success message, regardless of:
- Email exists or not
- Email is verified or not
- User is active or not

**Rationale**: Prevents attackers from discovering valid email addresses in system.

### Rate Limiting

⚠️ **Recommendation**: Implement aggressive rate limiting to prevent abuse.

**Suggested limits**:
- 3 requests per email per hour
- 10 requests per IP per hour
- Exponential backoff after repeated attempts

**Without rate limiting**:
- Attacker can spam user inboxes
- Can enumerate emails by observing email delivery timing
- Can overload email server

### Token Security

- Tokens are one-time use (invalidated after successful reset)
- Tokens expire after 24 hours
- Tokens are cryptographically signed (Django's `default_token_generator`)
- Tokens are not stored in database (stateless, verified via signature)

### Email Delivery

⚠️ **Production Considerations**:
- Use transactional email service (SendGrid, Mailgun, AWS SES)
- Configure SPF, DKIM, DMARC records (prevent spoofing)
- Monitor email delivery rates (detect bounces, spam flags)
- Handle email failures gracefully (retry logic)

---

## Email Template

### Subject

```
Password Reset Request
```

### Body (Plain Text)

```
Hello,

You recently requested to reset your password for your account.
Click the link below to reset your password:

{{ reset_url }}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email.

Thanks,
The Team
```

### Body (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Password Reset Request</h2>
  <p>Hello,</p>
  <p>You recently requested to reset your password for your account.</p>
  <p>
    <a href="{{ reset_url }}"
       style="background-color: #007bff; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 4px; display: inline-block;">
      Reset Password
    </a>
  </p>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">{{ reset_url }}</p>
  <p><small>This link will expire in 24 hours.</small></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #666; font-size: 14px;">
    If you did not request a password reset, please ignore this email.
  </p>
</body>
</html>
```

---

## Related Endpoints

- **POST /auth/password-reset-confirm**: Confirm password reset with token
- **POST /auth/login**: Sign in after password reset
- **POST /auth/register**: Create new account (sends verification email)

---

## Implementation Notes

### Backend Source

From `src/accounts/api/views.py`:

```python
@api_view(['POST'])
def password_reset_request_api(request):
    """
    Send password reset email if user exists, verified, and active.
    Always returns generic success message (anti-enumeration).
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']

    # Only send email if user exists, verified, and active
    try:
        user = User.objects.get(
            email=email,
            email_verified=True,
            is_active=True
        )
        # Generate token and send email
        # (implementation details omitted)
    except User.DoesNotExist:
        pass  # Don't reveal email doesn't exist

    # Always return same message
    return Response({
        'message': 'If an account exists with this email, a password reset link has been sent.'
    })
```

---

## Changelog

| Date       | Change |
|------------|--------|
| 2025-12-07 | Initial contract documentation (F02 Phase 1) |
