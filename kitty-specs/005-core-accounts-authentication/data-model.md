# Data Model: Core Accounts & Authentication

**Feature**: 005-core-accounts-authentication
**Date**: 2025-11-23
**Status**: Complete

## Overview

This document defines the data entities for the accounts and authentication system. The model centers around a custom User model with email-as-username authentication, role-based permissions via Django Groups, and stateless signed tokens for email verification and password reset.

---

## Entities

### 1. User (Custom Model)

**Purpose**: Central identity entity representing an individual with system access.

**Django Model**: `accounts.models.User`

**Inherits From**:
- `AbstractBaseUser`: Provides password hashing and authentication
- `PermissionsMixin`: Provides groups and permissions integration

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | BigAutoField | PK, auto-increment | Primary key |
| `email` | EmailField | Unique, max 254 chars, indexed | Email address (also serves as username) |
| `password` | CharField | max 128 chars | Hashed password (PBKDF2, 260k iterations) |
| `first_name` | CharField | max 150 chars, optional | User's first name |
| `last_name` | CharField | max 150 chars, optional | User's last name |
| `is_active` | BooleanField | default=False | Account active status (False until email verified) |
| `is_staff` | BooleanField | default=False | Can access Django admin |
| `is_superuser` | BooleanField | default=False | Has all permissions |
| `email_verified` | BooleanField | default=False | Email verification status |
| `email_verification_sent_at` | DateTimeField | nullable | When verification email last sent |
| `date_joined` | DateTimeField | auto_now_add | Account creation timestamp |
| `last_login` | DateTimeField | nullable, auto-updated | Last successful login timestamp |

**Indexes**:
- `email` (unique index)
- `is_active` (for filtering active users)
- `email_verified` (for filtering verified users)

**Custom Manager**:
- `UserManager` with `create_user()` and `create_superuser()` methods
- `USERNAME_FIELD = 'email'`
- `REQUIRED_FIELDS = []` (no additional required fields beyond email/password)

**Methods**:
- `get_full_name()` → str: Returns `f"{first_name} {last_name}".strip()`
- `get_short_name()` → str: Returns `first_name` or `email`
- `is_superadmin` (property) → bool: Returns `is_superuser`
- `is_admin` (property) → bool: Returns `True` if in 'admin' group
- `is_regular_user` (property) → bool: Returns `True` if in 'user' group only

**Relationships**:
- `groups` (ManyToMany → Group): User's role groups via PermissionsMixin
- `user_permissions` (ManyToMany → Permission): Direct permissions via PermissionsMixin
- `session_set` (Reverse FK → Session): User's active sessions

**Validation Rules**:
- Email must be valid email format (Django EmailValidator)
- Email must be unique (database constraint + form validation)
- Password must meet strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- First/last name: no special validation (optional fields)

**State Transitions**:

```
[Created] → email_verified=False, is_active=False
    ↓ (email verification)
[Verified] → email_verified=True, is_active=True
    ↓ (admin action)
[Deactivated] → is_active=False (account locked)
    ↓ (admin action)
[Reactivated] → is_active=True (account unlocked)
```

**Lifecycle**:
1. User registers → User created (inactive, unverified)
2. Verification email sent → `email_verification_sent_at` updated
3. User clicks verification link → `email_verified=True`, `is_active=True`
4. User can now sign in
5. Admin can deactivate → `is_active=False`
6. Admin can reactivate → `is_active=True`

**Notes**:
- Email serves as both username and primary contact
- Cannot change email after verification (out of scope for MVP)
- Designed for future tenant foreign key (not implemented yet)
- Extends naturally: downstream projects can subclass without breaking auth

---

### 2. Group (Django Built-in)

**Purpose**: Defines user roles with associated permissions.

**Django Model**: `django.contrib.auth.models.Group`

**Fields** (built-in):

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `name` | CharField | Unique, max 150 chars | Group name |
| `permissions` | ManyToMany → Permission | | Permissions assigned to group |

**Predefined Groups** (created via data migration):

| Group Name | Description | Permissions |
|------------|-------------|-------------|
| `superadmin` | Platform administrators | All permissions (via is_superuser flag) |
| `admin` | Tenant-level administrators | User management: add_user, change_user, view_user |
| `user` | Regular users | No special permissions (default) |

**Relationships**:
- `user_set` (Reverse ManyToMany → User): Users in this group
- `permissions` (ManyToMany → Permission): Permissions granted to group members

**Assignment Rules**:
- New users automatically assigned to `user` group (via post-save signal)
- Only superadmin can assign `superadmin` role
- Admins can assign `user` role only
- Users cannot change their own role

---

### 3. Permission (Django Built-in)

**Purpose**: Granular permission definitions for access control.

**Django Model**: `django.contrib.auth.models.Permission`

**Fields** (built-in):

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `name` | CharField | max 255 chars | Human-readable permission name |
| `content_type` | FK → ContentType | | Model this permission applies to |
| `codename` | CharField | max 100 chars | Machine-readable permission code |

**Relevant Permissions** (auto-created by Django):

| Codename | Name | Description |
|----------|------|-------------|
| `add_user` | Can add user | Create new user accounts |
| `change_user` | Can change user | Edit existing user accounts |
| `delete_user` | Can delete user | Delete user accounts (not used in MVP) |
| `view_user` | Can view user | View user list and details |

**Usage**:
- Permissions checked via Django's permission system: `user.has_perm('accounts.add_user')`
- Group-based: Users inherit permissions from their groups
- DRF integration: Permission classes check these

---

### 4. Session (Django Built-in)

**Purpose**: Maintains authenticated user state across requests.

**Django Model**: `django.contrib.sessions.models.Session`

**Fields** (built-in):

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `session_key` | CharField | PK, max 40 chars | Unique session identifier |
| `session_data` | TextField | | Encoded session data (pickled) |
| `expire_date` | DateTimeField | Indexed | Session expiration timestamp |

**Session Data** (stored in session_data):

| Key | Type | Description |
|-----|------|-------------|
| `_auth_user_id` | int | User ID (set by Django auth) |
| `_auth_user_backend` | str | Auth backend used |
| `_auth_user_hash` | str | Hash to detect password changes |

**Configuration**:
- `SESSION_ENGINE = 'django.contrib.sessions.backends.db'` (database-backed)
- `SESSION_COOKIE_AGE = 604800` (7 days = absolute timeout)
- `SESSION_SAVE_EVERY_REQUEST = False` (save only when modified)
- Custom middleware updates `expire_date` based on inactivity (24h)
- `SESSION_COOKIE_HTTPONLY = True` (security)
- `SESSION_COOKIE_SECURE = True` (production HTTPS only)
- `SESSION_COOKIE_SAMESITE = 'Lax'` (CSRF protection)

**Lifecycle**:
1. User logs in → Session created with `expire_date = now() + 7 days`
2. On each request → If `last_activity > 24h ago`, session invalidated
3. User logs out → Session deleted
4. Session expires → Automatic cleanup (Django management command)

**Indexes**:
- `expire_date` (for cleanup queries)
- `session_key` (primary key, automatic)

---

### 5. Email Verification Token (Virtual - No Database Model)

**Purpose**: Secure, time-limited token for email verification.

**Storage**: Stateless (cryptographically signed, embedded in URL)

**Implementation**: Custom `EmailVerificationTokenGenerator` (subclass of `PasswordResetTokenGenerator`)

**Token Structure**:
```
<timestamp>-<user_pk>-<hash>
```

**Components**:
- **Timestamp**: Base36-encoded creation timestamp (for expiry check)
- **User PK**: User's primary key
- **Hash**: HMAC-SHA256 of (timestamp + user_pk + email_verified + SECRET_KEY)

**Token Generation**:
```python
token = token_generator.make_token(user)
# Returns: "1a2b3c-456-7d8e9f..."
```

**Token Validation**:
1. Decode timestamp from token
2. Check if `now() - timestamp <= 24 hours`
3. Verify HMAC signature matches
4. Check user's `email_verified` status hasn't changed (prevents reuse)

**Expiration**: 24 hours from generation (FR-005)

**Security Properties**:
- Cannot be forged without SECRET_KEY
- Automatically invalid after email verified (hash changes)
- Time-limited (24h expiry)
- No database storage needed (cleanup-free)

**URL Format**:
```
https://example.com/accounts/verify-email/<user_id>/<token>/
```

---

### 6. Password Reset Token (Virtual - No Database Model)

**Purpose**: Secure, time-limited token for password reset.

**Storage**: Stateless (cryptographically signed, embedded in URL)

**Implementation**: Django's `PasswordResetTokenGenerator`

**Token Structure**:
```
<timestamp>-<hash>
```

**Components**:
- **Timestamp**: Base36-encoded creation timestamp
- **Hash**: HMAC-SHA256 of (timestamp + user_pk + password + last_login + SECRET_KEY)

**Token Validation**:
1. Decode timestamp from token
2. Check if `now() - timestamp <= 1 hour` (FR-011)
3. Verify HMAC signature matches
4. Check user's password hash hasn't changed (prevents reuse after reset)

**Expiration**: 1 hour from generation (FR-011)

**Security Properties**:
- Cannot be forged without SECRET_KEY
- Automatically invalid after password reset (hash changes)
- Time-limited (1h expiry)
- Includes last_login to invalidate after user signs in

**URL Format**:
```
https://example.com/accounts/reset-password/<uidb64>/<token>/
```

Where `uidb64` is base64-encoded user ID.

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          User (Custom)                          │
│  - email (unique, username)                                     │
│  - password (hashed)                                            │
│  - email_verified                                               │
│  - is_active                                                    │
│  - is_staff, is_superuser                                       │
└────────┬────────────────────────────────────┬──────────────────┘
         │                                    │
         │ ManyToMany (via PermissionsMixin)  │ OneToMany
         ↓                                    ↓
┌─────────────────┐                  ┌──────────────────┐
│  Group          │                  │  Session         │
│  - name         │                  │  - session_key   │
│                 │                  │  - session_data  │
└────────┬────────┘                  │  - expire_date   │
         │                            └──────────────────┘
         │ ManyToMany
         ↓
┌─────────────────────┐
│  Permission         │
│  - codename         │
│  - content_type     │
└─────────────────────┘

Virtual Entities (No DB):
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ EmailVerificationToken       │    │ PasswordResetToken           │
│ (signed, stateless)          │    │ (signed, stateless)          │
│ - Expiry: 24h                │    │ - Expiry: 1h                 │
│ - Bound to email_verified    │    │ - Bound to password hash     │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## Data Volume Estimates

| Entity | Initial | 1 Year | 5 Years | Notes |
|--------|---------|--------|---------|-------|
| User | 10 | 10,000 | 100,000 | Growth depends on product adoption |
| Group | 3 | 3 | 3-10 | Stable (may add org-specific roles) |
| Permission | ~20 | ~50 | ~100 | Grows with new features |
| Session | 10 | 5,000 | 20,000 | Active sessions (7-day cleanup) |

**Storage Estimates**:
- User: ~500 bytes/record → 50 MB for 100k users
- Session: ~300 bytes/record → 6 MB for 20k sessions
- Groups/Permissions: Negligible (<1 MB)

**Growth Patterns**:
- Users: Linear growth with product adoption
- Sessions: Proportional to active users (daily/weekly actives)
- Groups/Permissions: Slow growth (new features)

---

## Indexes & Query Optimization

**Critical Indexes**:
1. `User.email` (unique) - Login queries
2. `User.is_active` - Filter active users in admin
3. `User.email_verified` - Filter verified users
4. `Session.expire_date` - Cleanup queries
5. `Session.session_key` (PK) - Session lookups

**Common Query Patterns**:

```python
# Login (by email)
User.objects.get(email=email)  # Index: email

# Admin user list with roles
User.objects.select_related('groups').filter(is_active=True)  # Indexes: is_active; select_related avoids N+1

# Check if user has permission
user.has_perm('accounts.add_user')  # Uses permission cache

# Session lookup
Session.objects.get(session_key=key)  # Index: session_key (PK)

# Cleanup expired sessions
Session.objects.filter(expire_date__lt=now())  # Index: expire_date
```

**Performance Notes**:
- User list pagination: 50 per page (FR-006 requirement: <2s for 10k users)
- Session queries: Database-backed but cached per request
- Permission checks: Cached per request (Django's permission backend)

---

## Migration Strategy

**Migration Order**:
1. `0001_initial.py` - Create custom User model
   - Must run before any app referencing User via FK
   - Sets `AUTH_USER_MODEL = 'accounts.User'`
2. `0002_create_groups.py` - Data migration to create default groups
   - Creates: superadmin, admin, user groups
   - Assigns permissions to admin group
3. `0003_user_groups_signal.py` - Add post-save signal to auto-assign 'user' group

**Backward Compatibility**:
- New installation: Migrations run in order
- Existing installation: N/A (Feature 005 is new)
- Future: User model designed for extension (subclassing supported)

---

## Constraints & Business Rules

1. **Email Uniqueness**: One account per email address (DB constraint + validation)
2. **Email Verification Required**: `is_active=False` until `email_verified=True`
3. **Session Timeout**: Inactive 24h OR absolute 7d (whichever comes first)
4. **Password Strength**: Validated on registration and change (8+ chars, complexity rules)
5. **Role Assignment**: Users can have multiple groups, but typically one role
6. **Superadmin Protection**: Cannot deactivate own account (check in view/API)
7. **Token Single-Use**: Verification/reset tokens invalid after use (state change)
8. **Email Enumeration Protection**: Reset flow doesn't reveal if email exists

---

## Future Extensibility

**Multi-Tenancy (Feature 006)**:
- Add `tenant` ForeignKey to User model (nullable initially)
- Add unique constraint: `(email, tenant)` - email unique per tenant
- Groups become tenant-scoped

**Additional Fields** (downstream products):
```python
class CustomUser(User):
    phone_number = models.CharField(...)
    avatar = models.ImageField(...)
    timezone = models.CharField(...)
    # ... product-specific fields
```

**Additional Roles**:
- Create new groups via data migrations
- Assign permissions to new groups
- No code changes needed (Django's group system)

---

## References

1. Django 5.1 Custom User Model Documentation
2. Django Groups and Permissions
3. Django Sessions Framework
4. PasswordResetTokenGenerator Source Code
5. Feature 003 Specification (Security Baseline)
