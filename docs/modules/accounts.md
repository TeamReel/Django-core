# Accounts Module

Core authentication and user management for Django Core-App.

## Overview

The `accounts` module implements email-as-username authentication, role-based access control, and comprehensive user management. It serves as the authentication foundation for all downstream projects.

**App location**: `src/accounts/`  
**Feature spec**: `kitty-specs/005-core-accounts-authentication/`

## Configuration

### Required Settings

```python
# config/settings/base.py
AUTH_USER_MODEL = 'accounts.User'

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 604800  # 7 days
SESSION_INACTIVITY_TIMEOUT = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

INSTALLED_APPS = [
    'accounts.apps.AccountsConfig',  # Before django.contrib.admin
    ...
]
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_HOST` | Prod | SMTP server hostname |
| `EMAIL_PORT` | Prod | SMTP port (usually 587) |
| `EMAIL_HOST_USER` | Prod | SMTP username |
| `EMAIL_HOST_PASSWORD` | Prod | SMTP password |
| `EMAIL_FROM` | Prod | Sender email address |
| `SESSION_COOKIE_SECURE` | Prod | Set to True for HTTPS |

## Models

### User

Custom user model with email authentication.

| Field | Type | Description |
|-------|------|-------------|
| `id` | BigAutoField | Primary key |
| `email` | EmailField | Unique, primary identifier |
| `password` | CharField | Hashed password (PBKDF2) |
| `first_name` | CharField | Optional first name |
| `last_name` | CharField | Optional last name |
| `is_active` | BooleanField | Account active status |
| `is_staff` | BooleanField | Django admin access |
| `is_superuser` | BooleanField | Platform administrator |
| `email_verified` | BooleanField | Email verification status |
| `email_verification_sent_at` | DateTimeField | Last verification sent |
| `date_joined` | DateTimeField | Registration timestamp |
| `last_login` | DateTimeField | Last successful login |

**Role Properties**:
```python
user.is_superadmin  # user.is_superuser
user.is_admin       # in 'admin' group
user.is_regular_user  # in 'user' group only
```

## API Endpoints

### Public Endpoints

#### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### Password Reset

```http
POST /api/v1/auth/password-reset
Content-Type: application/json

{"email": "user@example.com"}
```

### Admin Endpoints

Requires `IsAdmin` permission (superadmin or admin group).

#### List Users

```http
GET /api/v1/admin/users
Authorization: Bearer <token>
```

#### Activate/Deactivate User

```http
PATCH /api/v1/admin/users/{id}/activate
PATCH /api/v1/admin/users/{id}/deactivate
Authorization: Bearer <token>
```

#### Change Role

```http
PATCH /api/v1/admin/users/{id}/role
Authorization: Bearer <token>
Content-Type: application/json

{"role": "admin"}
```

## Usage Examples

### Creating a Superuser

```bash
python manage.py createsuperuser
# Enter email and password when prompted
```

### Permission Classes

```python
from accounts.permissions import IsAdmin

class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        # Only accessible by superadmins and admins
        pass
```

### View Decorators

```python
from accounts.decorators import admin_required

@admin_required
def admin_dashboard(request):
    # Django template view for admins only
    pass
```

### Checking User Roles

```python
def check_permissions(user):
    if user.is_superadmin:
        return "Full platform access"
    elif user.is_admin:
        return "Tenant administration"
    elif user.is_regular_user:
        return "Basic access"
```

## Authentication Flows

### Registration Flow

1. User submits email/password
2. System creates user (`is_active=False`, `email_verified=False`)
3. Verification email sent (24-hour token)
4. User clicks verification link
5. System sets `email_verified=True`, `is_active=True`
6. User can sign in

### Password Reset Flow

1. User requests reset via email
2. System sends reset email (1-hour token)
3. User clicks link, sets new password
4. All existing sessions invalidated
5. User signs in with new password

## Role System

Three-tier role hierarchy:

| Role | Identifier | Capabilities |
|------|-----------|--------------|
| **Superadmin** | `is_superuser=True` | All permissions, Django admin |
| **Admin** | 'admin' group member | User management within tenant |
| **User** | 'user' group member | Basic application access |

### Permission Matrix

| Action | Superadmin | Admin | User |
|--------|------------|-------|------|
| View all users | ✓ | ✓ | ✗ |
| Activate/deactivate users | ✓ | ✓ (users only) | ✗ |
| Assign any role | ✓ | ✗ | ✗ |
| Assign 'user' role | ✓ | ✓ | ✗ |
| Change own role | ✗ | ✗ | ✗ |

## Security Considerations

- **Email Enumeration Protection**: Password reset always returns generic message
- **Brute-Force Protection**: Rate limiting on login endpoints
- **Session Security**: 24h inactive timeout, 7d absolute timeout
- **Password Requirements**: 8+ chars, mixed case, numbers, special chars
- **HTTP-only Cookies**: Prevents JavaScript access to session

## Related Features

- [Permissions](./permissions.md) - Role-based access control extension
- [ADR-001: Password Validation](../architecture/adr/index.md#security--authentication)
- [ADR-013: JWT Authentication](../architecture/adr/index.md#security--authentication)
