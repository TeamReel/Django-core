# Quickstart: Core Accounts & Authentication

**Feature**: 005-core-accounts-authentication
**Date**: 2025-11-23

This guide helps developers quickly set up and use the accounts & authentication system.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Basic Usage](#basic-usage)
5. [Admin Operations](#admin-operations)
6. [Testing](#testing)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Prerequisites

- Python 3.12+
- PostgreSQL 13+ (running and accessible)
- Virtual environment tool (venv, virtualenv, or conda)
- Git
- SMTP server access (for production) or console email backend (for development)

---

## Installation

### 1. Clone and Setup

```powershell
# Clone the repository
git clone https://github.com/TeamReel/django-core.git
cd django-core

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # PowerShell
# OR: venv\Scripts\activate.bat  # CMD

# Install dependencies
pip install -r requirements/local.txt
```

### 2. Database Setup

```powershell
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE django_core;
CREATE USER django_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE django_core TO django_user;
\q

# Run migrations
cd src
python manage.py migrate
```

### 3. Create Superuser

```powershell
# Create initial superadmin account
python manage.py createsuperuser
# Enter email: admin@example.com
# Enter password: (8+ chars, complexity rules)
```

The superuser is automatically:
- Assigned to `superadmin` group
- `is_superuser=True`
- `is_staff=True`
- `email_verified=True` (bypasses verification requirement)
- `is_active=True`

---

## Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Django Core
SECRET_KEY=your-secret-key-here-min-50-chars
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://django_user:your_password@localhost:5432/django_core

# Email (Development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Email (Production)
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-email@gmail.com
# EMAIL_HOST_PASSWORD=your-app-password

# Sessions
SESSION_COOKIE_AGE=604800  # 7 days
SESSION_COOKIE_SECURE=False  # True in production (HTTPS)
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
```

### Settings Module

Development uses `config.settings.local`:

```python
# config/settings/local.py
from .base import *

DEBUG = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SESSION_COOKIE_SECURE = False  # Development only
```

Production uses `config.settings.production` (HTTPS, SMTP, secure cookies).

---

## Basic Usage

### 1. Start Development Server

```powershell
cd src
python manage.py runserver
# Server running at http://127.0.0.1:8000/
```

### 2. Register New User (API)

```powershell
# Using PowerShell
$body = @{
    email = "user@example.com"
    password = "SecureP@ss123"
    first_name = "John"
    last_name = "Doe"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Response:
# {
#   "id": 456,
#   "email": "user@example.com",
#   "first_name": "John",
#   "last_name": "Doe",
#   "email_verified": false,
#   "is_active": false,
#   "message": "Registration successful. Please check your email to verify your account."
# }
```

### 3. Verify Email

In **development**, the verification email appears in the console:

```
Subject: Verify your email address
To: user@example.com

Please click the link below to verify your email address:
http://127.0.0.1:8000/accounts/verify-email/456/1a2b3c-abc123.../
```

Click the link or call the API:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/verify-email/456/1a2b3c-abc123..." `
    -Method POST

# Response:
# {
#   "message": "Email verified successfully. You can now sign in."
# }
```

### 4. Login

```powershell
$body = @{
    email = "user@example.com"
    password = "SecureP@ss123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -SessionVariable session

# Response:
# {
#   "id": 456,
#   "email": "user@example.com",
#   "first_name": "John",
#   "last_name": "Doe",
#   "role": "user",
#   "message": "Login successful."
# }

# Session cookie stored in $session (use -WebSession $session for subsequent requests)
```

### 5. Logout

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/logout" `
    -Method POST `
    -WebSession $session

# Response: 204 No Content
```

---

## Admin Operations

### Django Admin Interface

Access at `http://127.0.0.1:8000/admin/`

**Login with superuser credentials** (created in step 3).

**Available Operations**:
- View/edit users
- Activate/deactivate accounts
- Assign roles (groups)
- Reset passwords (sends email)
- View sessions

### Admin API Endpoints

**List Users** (requires admin or superadmin role):

```powershell
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/admin/users?page=1&page_size=50" `
    -Method GET `
    -WebSession $adminSession

# Response:
# {
#   "count": 152,
#   "next": "/api/v1/admin/users?page=2",
#   "previous": null,
#   "results": [...]
# }
```

**Deactivate User**:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/admin/users/456/deactivate" `
    -Method PATCH `
    -WebSession $adminSession

# Response:
# {
#   "id": 456,
#   "is_active": false,
#   "message": "User deactivated successfully."
# }
```

**Change User Role**:

```powershell
$body = @{ role = "admin" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/admin/users/456/role" `
    -Method PATCH `
    -Body $body `
    -ContentType "application/json" `
    -WebSession $superadminSession

# Response:
# {
#   "id": 456,
#   "role": "admin",
#   "message": "User role changed to admin."
# }
```

---

## Testing

### Run Test Suite

```powershell
# All tests
cd src
pytest

# Accounts tests only
pytest tests/accounts/

# With coverage
pytest --cov=accounts --cov-report=html

# Specific test module
pytest tests/accounts/test_authentication.py

# Specific test function
pytest tests/accounts/test_authentication.py::test_user_registration
```

### Test Coverage

Target: **>85% for authentication, 100% for permissions**.

View coverage report:

```powershell
pytest --cov=accounts --cov-report=html
# Open htmlcov/index.html in browser
```

### Manual Testing

Use Django shell for quick testing:

```powershell
python manage.py shell
```

```python
from accounts.models import User
from django.contrib.auth.models import Group

# Create user
user = User.objects.create_user(email='test@example.com', password='Test123!@#')

# Verify email
user.email_verified = True
user.is_active = True
user.save()

# Assign role
user_group = Group.objects.get(name='user')
user.groups.add(user_group)

# Check role
print(user.is_regular_user)  # True
print(user.is_admin)  # False
```

---

## Common Workflows

### Password Reset Flow

**1. User requests password reset**:

```powershell
$body = @{ email = "user@example.com" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/password-reset-request" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Response:
# {
#   "message": "If an account with that email exists, a password reset link has been sent."
# }
```

**2. User receives email** (console in dev):

```
Subject: Reset your password
To: user@example.com

Click the link below to reset your password:
http://127.0.0.1:8000/accounts/reset-password/NDU2/1a2b3c-abc123.../

This link expires in 1 hour.
```

**3. User resets password**:

```powershell
$body = @{
    uidb64 = "NDU2"
    token = "1a2b3c-abc123..."
    new_password = "NewSecureP@ss456"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/password-reset-confirm" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Response:
# {
#   "message": "Password reset successful. You can now sign in with your new password."
# }
```

### Role Assignment Workflow

**Superadmin assigns admin role**:

1. Login as superadmin
2. Call change role endpoint (see Admin Operations)
3. Target user gains admin permissions immediately

**Admin assigns user role** (demotion):

1. Login as admin
2. Can only assign `user` role (not `admin` or `superadmin`)
3. Target user loses elevated permissions

### Session Timeout Handling

**Inactive timeout (24 hours)**:

Custom middleware checks `last_activity` on each request:

```python
# accounts/middleware.py
if now() - request.session.get('last_activity') > 24 hours:
    logout(request)
    return JsonResponse({'error': 'session_expired', 'message': 'Your session has expired.'}, status=401)
```

**Absolute timeout (7 days)**:

Django's built-in `SESSION_COOKIE_AGE` handles this automatically.

---

## Troubleshooting

### Issue: Email verification link not working

**Symptom**: Clicking verification link returns "Invalid token" error.

**Causes**:
1. Token expired (24 hours passed)
2. Email already verified (token invalid after verification)
3. SECRET_KEY changed (invalidates all tokens)

**Solutions**:
- Request new verification email (not implemented in MVP)
- Manually verify in Django Admin: Set `email_verified=True`, `is_active=True`
- Check SECRET_KEY consistency across environments

### Issue: Cannot log in after registration

**Symptom**: "Email not verified" error on login.

**Cause**: User didn't click verification link.

**Solution**:
- Check console for verification email (dev mode)
- Manually verify in Django Admin
- Resend verification email (future feature)

### Issue: Session expires too quickly

**Symptom**: Logged out after short period despite activity.

**Causes**:
1. Inactive timeout set too low (check `SESSION_INACTIVITY_TIMEOUT`)
2. Session cookie not being sent with requests
3. CSRF token issues

**Solutions**:
- Verify `SESSION_COOKIE_AGE` and inactivity timeout settings
- Check browser cookies (ensure `sessionid` present)
- Include CSRF token in POST/PATCH requests

### Issue: Admin cannot change user roles

**Symptom**: 403 Forbidden when assigning admin role.

**Cause**: Admins can only assign `user` role (not `admin` or `superadmin`).

**Solution**: Use superadmin account for admin role assignments.

### Issue: Password reset email not sending (production)

**Symptom**: No email received after reset request.

**Causes**:
1. SMTP configuration incorrect
2. Email provider blocking
3. Email in spam folder

**Solutions**:
- Verify `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- Check SMTP provider logs
- Use console backend for testing: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
- Test with: `python manage.py shell` → `from django.core.mail import send_mail; send_mail(...)`

### Issue: Performance slow with large user list

**Symptom**: Admin user list takes >2s to load.

**Causes**:
1. N+1 query problem (not using `select_related`)
2. No pagination
3. Too many results per page

**Solutions**:
- Verify `select_related('groups')` in view
- Use pagination (50 per page default)
- Add indexes on `is_active`, `email_verified`
- Check database query plan: `EXPLAIN ANALYZE SELECT...`

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/verify-email/{user_id}/{token}` | Verify email | No |
| POST | `/api/v1/auth/login` | Sign in | No |
| POST | `/api/v1/auth/logout` | Sign out | Yes |
| POST | `/api/v1/auth/password-reset-request` | Request password reset | No |
| POST | `/api/v1/auth/password-reset-confirm` | Confirm password reset | No |

### Admin Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/admin/users` | List users (paginated) | Admin, Superadmin |
| GET | `/api/v1/admin/users/{id}` | Get user details | Admin, Superadmin |
| PATCH | `/api/v1/admin/users/{id}/activate` | Activate user | Admin, Superadmin |
| PATCH | `/api/v1/admin/users/{id}/deactivate` | Deactivate user | Admin, Superadmin |
| POST | `/api/v1/admin/users/{id}/reset-password` | Send reset email | Admin, Superadmin |
| PATCH | `/api/v1/admin/users/{id}/role` | Change user role | Superadmin (all roles), Admin (user role only) |

### Full OpenAPI Specs

- **Authentication**: `contracts/auth.yaml`
- **Admin**: `contracts/admin.yaml`

View in Swagger UI (if configured):
```
http://127.0.0.1:8000/api/docs/
```

---

## Next Steps

1. **Extend User Model**: Add product-specific fields by subclassing `accounts.models.User`
2. **Customize Email Templates**: Edit `accounts/templates/accounts/email/*.html`
3. **Add Social Authentication**: Integrate django-allauth (out of scope for MVP)
4. **Implement 2FA**: Add TOTP/SMS verification (future feature)
5. **Setup Multi-Tenancy**: Add tenant foreign key (Feature 006)

---

## Resources

- **Feature Specification**: `spec.md`
- **Implementation Plan**: `plan.md`
- **Data Model**: `data-model.md`
- **Research**: `research.md`
- **Django Authentication Docs**: https://docs.djangoproject.com/en/5.1/topics/auth/
- **DRF Authentication**: https://www.django-rest-framework.org/api-guide/authentication/

---

## Support

For issues or questions:
1. Check this quickstart guide
2. Review `spec.md` for requirements clarification
3. Check test suite for usage examples: `tests/accounts/`
4. Consult research decisions: `research.md`
5. Open GitHub issue with detailed reproduction steps

---

**Happy Coding!** 🚀
