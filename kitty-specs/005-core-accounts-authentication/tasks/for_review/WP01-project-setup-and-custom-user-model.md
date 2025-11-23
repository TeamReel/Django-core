---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
title: "Project Setup & Custom User Model"
phase: "Phase 0 - Infrastructure"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "12572"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-23T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Project Setup & Custom User Model

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

**Goal**: Establish `accounts` Django app with custom User model using email-as-username authentication, configure project settings for sessions and email, and create initial database migration.

**Success Criteria**:
- [ ] `src/accounts/` app exists with proper structure
- [ ] Custom User model implemented inheriting from AbstractBaseUser + PermissionsMixin
- [ ] UserManager with `create_user()` and `create_superuser()` methods
- [ ] `AUTH_USER_MODEL = 'accounts.User'` configured in settings
- [ ] Session configuration (24h inactive, 7d absolute, database-backed)
- [ ] Email backend configured (console for dev, SMTP for prod)
- [ ] Initial migration runs cleanly
- [ ] Can create users programmatically via Django shell
- [ ] Type hints present throughout code
- [ ] README.md documents user model extension pattern

## Context & Constraints

**Prerequisites**:
- Feature 001 (Project Skeleton) complete - Django project structure exists
- PostgreSQL database configured
- Python 3.12+ virtual environment

**Key Design Decisions** (from `research.md`):
- Email as username (single identifier field, no separate username)
- Custom user model via AbstractBaseUser (full control over fields)
- Mandatory email verification before access (is_active=False by default)
- Session-based authentication for web and API consistency

**References**:
- **Specification**: `kitty-specs/005-core-accounts-authentication/spec.md` (FR-001 to FR-009)
- **Data Model**: `kitty-specs/005-core-accounts-authentication/data-model.md` (User entity definition)
- **Implementation Plan**: `kitty-specs/005-core-accounts-authentication/plan.md` (Technical Context, Project Structure)
- **Constitution**: `.kittify/memory/constitution.md` (Principles I, II, III)

**Constraints**:
- Email must be unique across all users
- User model cannot be changed after migrations (design carefully)
- Session timeout: 24 hours inactive OR 7 days absolute (whichever comes first)
- Type hints required (py.typed marker file)

## Subtasks & Detailed Guidance

### Subtask T001 – Create accounts Django app structure

**Purpose**: Establish the foundation for the accounts app with proper Python package structure and type hint support.

**Steps**:
1. From repo root, run: `cd src; python manage.py startapp accounts`
2. Create `src/accounts/py.typed` marker file (empty file for type checker support)
3. Verify structure: `accounts/__init__.py`, `accounts/models.py`, `accounts/views.py`, `accounts/admin.py`, `accounts/apps.py`, `accounts/tests.py`
4. Delete `accounts/tests.py` (we use separate tests/ directory)
5. Create `accounts/managers.py` (for UserManager)
6. Create `accounts/signals.py` (for future post-save signal)

**Files**:
- `src/accounts/__init__.py` (Django generated)
- `src/accounts/py.typed` (CREATE empty file)
- `src/accounts/models.py` (Django generated, will modify in T002)
- `src/accounts/managers.py` (CREATE)
- `src/accounts/signals.py` (CREATE empty, populate in WP02)
- `src/accounts/apps.py` (Django generated)

**Parallel?**: No (foundation task)

**Notes**:
- The `py.typed` file enables type checkers like mypy to check this package
- Do NOT add accounts app to INSTALLED_APPS yet (wait until after AUTH_USER_MODEL configured)

---

### Subtask T002 – Create custom User model

**Purpose**: Implement custom user model with email-as-username authentication, email verification tracking, and role support.

**Steps**:
1. Open `src/accounts/models.py`
2. Import: `from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin`, `from django.db import models`, `from .managers import UserManager`
3. Define User class:
   ```python
   class User(AbstractBaseUser, PermissionsMixin):
       """Custom user model with email-as-username authentication."""

       id = models.BigAutoField(primary_key=True)
       email = models.EmailField(max_length=254, unique=True, db_index=True)
       password = models.CharField(max_length=128)  # inherited but explicit
       first_name = models.CharField(max_length=150, blank=True)
       last_name = models.CharField(max_length=150, blank=True)
       is_active = models.BooleanField(default=False)  # False until email verified
       is_staff = models.BooleanField(default=False)
       is_superuser = models.BooleanField(default=False)
       email_verified = models.BooleanField(default=False)
       email_verification_sent_at = models.DateTimeField(null=True, blank=True)
       date_joined = models.DateTimeField(auto_now_add=True)
       last_login = models.DateTimeField(null=True, blank=True)

       objects = UserManager()

       USERNAME_FIELD = 'email'
       REQUIRED_FIELDS = []  # No additional fields beyond email/password

       class Meta:
           db_table = 'accounts_user'
           indexes = [
               models.Index(fields=['email']),
               models.Index(fields=['is_active']),
               models.Index(fields=['email_verified']),
           ]

       def get_full_name(self) -> str:
           return f"{self.first_name} {self.last_name}".strip()

       def get_short_name(self) -> str:
           return self.first_name if self.first_name else self.email

       @property
       def is_superadmin(self) -> bool:
           return self.is_superuser

       @property
       def is_admin(self) -> bool:
           return self.groups.filter(name='admin').exists()

       @property
       def is_regular_user(self) -> bool:
           return self.groups.filter(name='user').exists() and not self.is_admin and not self.is_superadmin

       def __str__(self) -> str:
           return self.email
   ```
4. Add type hints throughout
5. Ensure all methods return proper types

**Files**:
- `src/accounts/models.py` (MODIFY)

**Parallel?**: No (blocks T003)

**Notes**:
- `is_active=False` by default ensures users cannot log in until email verified
- `email_verified` tracks verification status separately from is_active
- indexes on email (unique), is_active, and email_verified for query performance
- Role properties (is_superadmin, is_admin, is_regular_user) will work after WP02 creates groups

---

### Subtask T003 – Create UserManager

**Purpose**: Provide custom manager for user creation with email normalization and proper defaults.

**Steps**:
1. Open `src/accounts/managers.py`
2. Import: `from django.contrib.auth.models import BaseUserManager`
3. Define UserManager:
   ```python
   from django.contrib.auth.models import BaseUserManager
   from typing import Optional

   class UserManager(BaseUserManager):
       """Custom manager for User model with email-as-username."""

       def create_user(
           self,
           email: str,
           password: Optional[str] = None,
           **extra_fields
       ):
           """Create and save a regular user with email and password."""
           if not email:
               raise ValueError('Users must have an email address')

           email = self.normalize_email(email).lower()
           user = self.model(email=email, **extra_fields)
           user.set_password(password)
           user.save(using=self._db)
           return user

       def create_superuser(
           self,
           email: str,
           password: Optional[str] = None,
           **extra_fields
       ):
           """Create and save a superuser with email and password."""
           extra_fields.setdefault('is_staff', True)
           extra_fields.setdefault('is_superuser', True)
           extra_fields.setdefault('is_active', True)
           extra_fields.setdefault('email_verified', True)

           if extra_fields.get('is_staff') is not True:
               raise ValueError('Superuser must have is_staff=True')
           if extra_fields.get('is_superuser') is not True:
               raise ValueError('Superuser must have is_superuser=True')

           return self.create_user(email, password, **extra_fields)
   ```
4. Ensure type hints for parameters and return values

**Files**:
- `src/accounts/managers.py` (CREATE)

**Parallel?**: No (T002 must complete first)

**Notes**:
- Email normalization: lowercase + domain normalization
- `create_superuser` bypasses email verification (sets email_verified=True)
- Password hashing via `set_password()` (Django's PBKDF2 with 260k iterations)

---

### Subtask T004 [P] – Configure AUTH_USER_MODEL in settings

**Purpose**: Tell Django to use custom User model for authentication.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add near top of file (after imports, before INSTALLED_APPS):
   ```python
   # Custom User Model
   AUTH_USER_MODEL = 'accounts.User'
   ```
3. Add 'accounts.apps.AccountsConfig' to INSTALLED_APPS (before 'django.contrib.admin')
   ```python
   INSTALLED_APPS = [
       'accounts.apps.AccountsConfig',  # Must be before admin
       'django.contrib.admin',
       ...
   ]
   ```

**Files**:
- `src/config/settings/base.py` (MODIFY)

**Parallel?**: Yes (can proceed alongside T005-T006)

**Notes**:
- AUTH_USER_MODEL must be set before first migration
- accounts app must be before admin in INSTALLED_APPS for proper User model discovery

---

### Subtask T005 [P] – Configure session settings

**Purpose**: Set session timeout rules (24h inactive, 7d absolute) and database-backed storage.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add/modify session configuration:
   ```python
   # Session Configuration
   SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # Database-backed
   SESSION_COOKIE_AGE = 604800  # 7 days in seconds (absolute timeout)
   SESSION_SAVE_EVERY_REQUEST = False  # Only save when modified
   SESSION_COOKIE_HTTPONLY = True  # Security: no JS access
   SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
   SESSION_COOKIE_SECURE = False  # Set to True in production (HTTPS only)

   # Custom: Inactive timeout will be enforced via middleware (24 hours)
   SESSION_INACTIVITY_TIMEOUT = 86400  # 24 hours in seconds
   ```
3. Verify `django.contrib.sessions` in INSTALLED_APPS
4. Verify `SessionMiddleware` in MIDDLEWARE

**Files**:
- `src/config/settings/base.py` (MODIFY)

**Parallel?**: Yes (independent of T004, T006)

**Notes**:
- SESSION_COOKIE_SECURE will be True in production.py (HTTPS requirement)
- Inactive timeout middleware will be implemented in WP05 (T040)
- Database-backed sessions require migration (runs via Feature 001)

---

### Subtask T006 [P] – Configure email backends

**Purpose**: Set up console email backend for development and SMTP for production.

**Steps**:
1. Open `src/config/settings/local.py`
2. Add email configuration:
   ```python
   # Email Configuration (Development)
   EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
   EMAIL_FROM = 'noreply@localhost'
   ```
3. Open `src/config/settings/production.py`
4. Add email configuration:
   ```python
   # Email Configuration (Production)
   EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
   EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
   EMAIL_PORT = env.int('EMAIL_PORT', default=587)
   EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
   EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
   EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
   EMAIL_FROM = env('EMAIL_FROM', default='noreply@example.com')
   ```
5. Document environment variables in `.env.example` or settings comments

**Files**:
- `src/config/settings/local.py` (MODIFY)
- `src/config/settings/production.py` (MODIFY)

**Parallel?**: Yes (independent of other settings tasks)

**Notes**:
- Console backend prints emails to terminal (no SMTP needed for dev)
- Production requires SMTP credentials via environment variables
- Email sending implemented in WP04 (registration/verification)

---

### Subtask T007 – Create initial migration

**Purpose**: Generate Django migration for custom User model.

**Steps**:
1. Ensure AUTH_USER_MODEL configured (T004 complete)
2. Run: `cd src; python manage.py makemigrations accounts`
3. Verify migration file created: `src/accounts/migrations/0001_initial.py`
4. Review migration: Should create accounts_user table with all fields
5. Run migration: `python manage.py migrate`
6. Verify table exists: `python manage.py dbshell` → `\dt accounts_user;`

**Files**:
- `src/accounts/migrations/0001_initial.py` (DJANGO GENERATES)

**Parallel?**: No (requires T001-T004 complete)

**Notes**:
- Initial migration creates User table with indexes
- Cannot change AUTH_USER_MODEL after running migrations
- Migration includes PermissionsMixin fields (groups, user_permissions)

---

### Subtask T008 [P] – Create accounts app README

**Purpose**: Document user model extension pattern for downstream projects.

**Steps**:
1. Create `src/accounts/README.md`
2. Include sections:
   - **Overview**: Custom user model with email-as-username
   - **User Model Fields**: List all fields with descriptions
   - **Authentication Flow**: Registration → verification → login
   - **Extending the User Model**: How to subclass for product-specific fields
   - **Role System**: Explanation of superadmin/admin/user roles
   - **Token Security**: Email verification and password reset tokens
   - **API Endpoints**: Reference to contracts/ for OpenAPI specs
   - **Configuration**: Required settings and environment variables
3. Include code example for extending User model:
   ```python
   from accounts.models import User

   class CustomUser(User):
       phone_number = models.CharField(max_length=20, blank=True)
       avatar = models.ImageField(upload_to='avatars/', blank=True)

       class Meta:
           db_table = 'custom_user'
   ```

**Files**:
- `src/accounts/README.md` (CREATE)

**Parallel?**: Yes (documentation independent of code)

**Notes**:
- README is primary reference for developers using this module
- Update as new features added in later work packages

---

### Subtask T009 [P] – Add Django REST Framework to requirements

**Purpose**: Install DRF for API endpoint implementation.

**Steps**:
1. Open `requirements/base.txt`
2. Add: `djangorestframework>=3.14.0,<3.15.0`
3. Run: `pip install -r requirements/base.txt`
4. Open `src/config/settings/base.py`
5. Add to INSTALLED_APPS:
   ```python
   INSTALLED_APPS = [
       ...
       'rest_framework',
   ]
   ```
6. Add basic DRF configuration:
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework.authentication.SessionAuthentication',
       ],
       'DEFAULT_PERMISSION_CLASSES': [
           'rest_framework.permissions.IsAuthenticated',
       ],
       'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
       'PAGE_SIZE': 50,
   }
   ```

**Files**:
- `requirements/base.txt` (MODIFY)
- `src/config/settings/base.py` (MODIFY)

**Parallel?**: Yes (independent of user model creation)

**Notes**:
- DRF required for API endpoints in WP04-WP08
- Session authentication aligns with web authentication strategy
- Pagination default: 50 per page (performance requirement)

---

## Test Strategy

**Manual Verification**:
1. Run migrations: `python manage.py migrate` → should succeed
2. Django shell test:
   ```python
   python manage.py shell
   from accounts.models import User
   user = User.objects.create_user(email='test@example.com', password='Test123!@#')
   print(user.email)  # Should print 'test@example.com'
   print(user.is_active)  # Should print False
   print(user.email_verified)  # Should print False
   ```
3. Check database: User record should exist with correct defaults

**Unit Tests** (defer to WP10):
- User model field validation
- UserManager create_user() and create_superuser()
- Role property methods (after WP02 creates groups)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AUTH_USER_MODEL changed after migration | High | Set before first migration, document clearly |
| Email uniqueness constraint violated | Medium | Database constraint + form validation |
| Migration conflicts with existing users table | High | Run on clean database, test migration rollback |
| Type hints incomplete | Low | Use mypy in CI to enforce |
| Missing indexes slow queries | Medium | Defined in model Meta.indexes |

## Definition of Done Checklist

- [ ] `src/accounts/` app created with proper structure
- [ ] `py.typed` marker file present
- [ ] User model implemented with all required fields
- [ ] UserManager with create_user() and create_superuser() methods
- [ ] AUTH_USER_MODEL = 'accounts.User' configured
- [ ] Session configuration complete (24h/7d timeouts)
- [ ] Email backends configured (console/SMTP)
- [ ] Initial migration created and runs successfully
- [ ] Can create users via Django shell
- [ ] Type hints present throughout
- [ ] README.md created with extension documentation
- [ ] Django REST Framework installed and configured
- [ ] All files follow Black formatting
- [ ] Ruff linting passes with no errors

## Review Guidance

**Key Acceptance Checkpoints**:
1. **User model design**: Verify all fields match data-model.md specification
2. **Email as username**: Confirm USERNAME_FIELD = 'email', no separate username field
3. **Security defaults**: is_active=False and email_verified=False by default
4. **Session configuration**: 24h inactive + 7d absolute timeouts configured
5. **Type hints**: All methods and functions have proper type annotations
6. **Documentation**: README.md clearly explains extension pattern
7. **Migration**: Runs cleanly on fresh database without errors

**Context for Reviewers**:
- This is foundational work - all subsequent work packages depend on this
- User model cannot be changed after deployment (design carefully)
- Email-as-username decision documented in ADR (WP10)
- Role properties (is_admin, is_regular_user) will work after WP02 creates groups

## Activity Log

- 2025-11-23T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-23T21:51:55Z – claude – shell_pid=12572 – lane=doing – Started implementation of custom user model and project setup
- 2025-11-23T22:58:53+01:00 – claude – shell_pid=12572 – lane=doing – Completed all 9 subtasks: accounts app created, User model with email-as-username, UserManager, settings configured (AUTH_USER_MODEL, sessions, email backends), DRF installed, initial migration applied, README documentation complete. Manual verification successful (user creation via Django shell).

---

**Next Work Package**: WP02 (Django Groups & Permissions Setup)
**Dependencies**: None (starting work package)
**Estimated Effort**: 4-6 hours
