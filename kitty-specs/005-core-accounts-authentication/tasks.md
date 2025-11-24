# Work Packages: Core Accounts & Authentication

**Feature Branch**: `005-core-accounts-authentication`
**Inputs**: Design documents from `kitty-specs/005-core-accounts-authentication/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package references a matching prompt file in `kitty-specs/005-core-accounts-authentication/tasks/planned/` for detailed implementation guidance.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution principles (`.kittify/memory/constitution.md`).

---

## Subtask Format: `[Txxx] [P?] Description`
- **[P]** indicates the subtask can proceed in parallel (different files/components).
- Precise file paths or modules included.

---

## Work Package WP01: Project Setup & Custom User Model (Priority: P0)

**Goal**: Establish accounts Django app structure, create custom user model with email-as-username, configure settings, and setup initial migrations per Constitution Principles I, II, III.

**Independent Test**: User model exists, migrations run cleanly, AUTH_USER_MODEL configured, can create users programmatically via Django shell.

**Prompt**: `tasks/planned/WP01-project-setup-and-custom-user-model.md`

### Included Subtasks
- [X] T001 Create `src/accounts/` Django app with `__init__.py`, `py.typed` marker
- [X] T002 Create custom User model in `accounts/models.py` (AbstractBaseUser + PermissionsMixin)
- [X] T003 Create UserManager in `accounts/managers.py` with `create_user()` and `create_superuser()` methods
- [X] T004 [P] Configure `AUTH_USER_MODEL = 'accounts.User'` in `config/settings/base.py`
- [X] T005 [P] Add session configuration to `config/settings/base.py` (24h inactive, 7d absolute, database-backed)
- [X] T006 [P] Add email backend configuration to `config/settings/local.py` (console) and `production.py` (SMTP)
- [X] T007 Create initial migration `0001_initial.py` for User model
- [X] T008 [P] Create accounts app README.md documenting user model extension pattern
- [X] T009 [P] Add djangorestframework to `requirements/base.txt`

**Status**: ✅ **COMPLETED** - See `tasks/done/WP01-project-setup-and-custom-user-model.md` for review notes

### Constitutional Alignment
- Principle I (Product-Agnostic): Generic user model, no product-specific fields
- Principle II (Architecture): Single-purpose accounts app, stable user model interface
- Principle III (Code Quality): Type hints, Python 3.12+, clear separation of concerns

### Implementation Notes
- User model fields: email (unique, USERNAME_FIELD), password, first_name, last_name, is_active (default=False), is_staff, is_superuser, email_verified (default=False), email_verification_sent_at, date_joined, last_login
- Indexes: email (unique), is_active, email_verified
- UserManager must handle email normalization (lowercase)
- Session middleware already configured via Feature 001

### Parallel Opportunities
- Settings configuration (T004-T006) can proceed independently of model creation
- README documentation (T008) independent of code tasks
- Requirements update (T009) independent of code

### Dependencies
- None (starting package).

### Risks & Mitigations
- AUTH_USER_MODEL change after migration → Set before any migrations run, document clearly
- Email uniqueness conflicts → Database constraint + form validation
- Migration conflicts → Run on clean database initially

---

## Work Package WP02: Django Groups & Permissions Setup (Priority: P0)

**Goal**: Create three-tier role system using Django Groups (superadmin/admin/user), configure permissions, implement post-save signal for auto role assignment per Constitution Principle V.

**Independent Test**: Three groups exist, admin group has user management permissions, new users automatically assigned to 'user' group, role properties work correctly.

**Prompt**: `tasks/planned/WP02-django-groups-and-permissions-setup.md`

### Included Subtasks
- [X] T010 Create data migration `0002_create_groups.py` to create superadmin/admin/user groups
- [X] T011 Assign permissions to admin group in migration (add_user, change_user, view_user)
- [X] T012 Add role helper properties to User model (is_superadmin, is_admin, is_regular_user)
- [X] T013 Create post-save signal in `accounts/signals.py` to auto-assign 'user' group
- [X] T014 Register signal in `accounts/apps.py` ready() method
- [X] T015 [P] Create custom DRF permission classes in `accounts/permissions.py` (IsSuperadmin, IsAdmin, IsAdminOrReadOnly)

**Status**: ✅ **COMPLETED** - See `tasks/done/WP02-django-groups-and-permissions-setup.md` for review notes

### Constitutional Alignment
- Principle II (Architecture): Leverages Django's built-in permissions system
- Principle V (Security): Role-based access control, least privilege by default
- Principle VI (Performance): Groups cached per request by Django

### Implementation Notes
- Superadmin role: is_superuser=True (Django's built-in superuser check)
- Admin role: Member of 'admin' group + has user management permissions
- User role: Member of 'user' group (default, no special permissions)
- Signal ensures every new user gets 'user' group unless explicitly assigned different role
- Permission classes follow DRF naming conventions

### Parallel Opportunities
- Permission classes (T015) can be created independently of migrations

### Dependencies
- WP01 (User model must exist before groups can be created)

### Risks & Mitigations
- Signal not registered → Test signal registration in app config tests
- Group not found → Migration ensures groups exist before signal fires
- Permission race condition → Signal uses get_or_create for group assignment

---

## Work Package WP03: Password Validation & Token Utilities (Priority: P0)

**Goal**: Implement password strength validation, create token generation/validation utilities for email verification and password reset per Constitution Principles V, XI.

**Independent Test**: Password validators reject weak passwords, tokens generate correctly and validate with expiry, token reuse prevented.

**Prompt**: `tasks/done/WP03-password-validation-and-token-utilities.md`

### Included Subtasks
- [X] T016 Create custom password validators in `accounts/validators.py` (uppercase, lowercase, number, special char)
- [X] T017 Configure password validators in `settings/base.py` (minimum 8 chars + custom validators)
- [X] T018 Create `EmailVerificationTokenGenerator` in `accounts/tokens.py` (24h expiry, state-bound)
- [X] T019 Instantiate `email_verification_token` generator in `accounts/tokens.py`
- [X] T020 [P] Update `accounts/README.md` with token security documentation

**Status**: ✅ **COMPLETED** - See `tasks/done/WP03-password-validation-and-token-utilities.md` for review notes

### Constitutional Alignment
- Principle V (Security): Strong password requirements, secure token generation
- Principle XI (Documentation): Token mechanism documented for extension

### Implementation Notes
- Password validators: MinimumLengthValidator(8), UppercaseValidator, LowercaseValidator, NumberValidator, SpecialCharacterValidator
- EmailVerificationTokenGenerator: Hash includes timestamp, user_pk, email_verified status (prevents reuse after verification)
- Password reset tokens: Use Django's built-in PasswordResetTokenGenerator (1-hour expiry)
- Tokens are URL-safe, base64-encoded, cryptographically signed with SECRET_KEY

### Parallel Opportunities
- Password validators (T016-T017) independent of token utilities (T018-T019)
- Documentation (T020) can be written in parallel

### Dependencies
- WP01 (User model must exist for token generation)

### Risks & Mitigations
- Weak token entropy → Use Django's default generator (cryptographically secure)
- Token expiry edge cases → Unit tests for expiry boundary conditions
- SECRET_KEY rotation invalidates tokens → Document in deployment guide

---

## Work Package WP04: User Story 1 – Registration & Email Verification (Priority: P1)

**Goal**: Implement user registration with email verification flow (US1), including form validation, email sending, verification link handling per Constitution Principles V, VII.

**Independent Test**: User can register with valid email/password, receive verification email (console in dev), click link, get activated, and sign in.

**Prompt**: `tasks/for_review/WP04-user-story-1-registration-and-email-verification.md`

### Included Subtasks
- [X] T021 Create registration form in `accounts/forms.py` (RegistrationForm with email/password/first_name/last_name)
- [X] T022 Create registration view in `accounts/views.py` (handles POST, validates, creates inactive user)
- [X] T023 Implement verification email sending (multipart HTML+text templates)
- [X] T024 Create email templates: `accounts/templates/accounts/email/verification.html` and `verification.txt`
- [X] T025 Create email verification view (validates token, activates user, sets email_verified=True)
- [X] T026 [P] Create DRF registration serializer in `accounts/serializers.py`
- [X] T027 [P] Create DRF registration API endpoint in `accounts/api/views.py` (POST /api/v1/auth/register)
- [X] T028 [P] Create email verification API endpoint (POST /api/v1/auth/verify-email/{user_id}/{token})
- [X] T029 Configure URL routing in `accounts/urls.py` and `accounts/api/urls.py`
- [X] T030 Update `config/urls.py` to include accounts URLs

**Status**: ✅ **COMPLETED** - See `tasks/for_review/WP04-user-story-1-registration-and-email-verification.md` for review notes

### Constitutional Alignment
- Principle I (Product-Agnostic): Generic registration, no product-specific fields
- Principle V (Security): Email verification required, inactive by default
- Principle VII (API Design): RESTful endpoints, consistent error responses

### Implementation Notes
- Registration creates user with is_active=False, email_verified=False
- Verification email sent immediately after registration
- Verification link format: `/accounts/verify-email/{user_id}/{token}/`
- API returns 201 Created on successful registration
- Email verification updates both email_verified and is_active to True
- Email enumeration protection: Don't reveal if email exists in error messages

### Parallel Opportunities
- Form-based views (T021-T025) and DRF API (T026-T028) can proceed in parallel
- Email templates (T024) independent of view logic
- URL routing (T029-T030) after views exist

### Dependencies
- WP01 (User model exists)
- WP03 (Token utilities and password validators exist)

### Risks & Mitigations
- Email delivery failures → Log failures, don't block registration, provide "resend" option
- Token expiry frustration → Clear error message with "resend verification" link
- Duplicate registration attempts → Email unique constraint handles this

---

## Work Package WP05: User Story 2 – Sign In/Sign Out (Priority: P1)

**Goal**: Implement secure sign in and sign out flows (US2) with session management, brute-force protection integration, and email verification checks per Constitution Principles V, VI.

**Independent Test**: Verified user can sign in with email/password, session persists across requests, sign out destroys session, unverified user blocked.

**Prompt**: `tasks/for_review/WP05-user-story-2-sign-in-and-sign-out.md`

### Included Subtasks
- [X] T031 Create login form in `accounts/forms.py` (LoginForm with email/password)
- [X] T032 Create login view in `accounts/views.py` (validates credentials, checks email_verified, creates session)
- [X] T033 Implement email verification check in login flow (reject if email_verified=False)
- [X] T034 Create logout view (destroys session, clears cookie)
- [X] T035 [P] Create DRF login serializer in `accounts/serializers.py`
- [X] T036 [P] Create DRF login API endpoint (POST /api/v1/auth/login) with session creation
- [X] T037 [P] Create DRF logout API endpoint (POST /api/v1/auth/logout)
- [X] T038 Integrate with Feature 003 security baseline for rate limiting on login endpoint
- [X] T039 Configure session middleware timeout checks (24h inactive, 7d absolute)
- [X] T040 Create custom middleware in `accounts/middleware.py` for inactive session timeout
- [X] T041 Register middleware in `config/settings/base.py`
- [X] T042 Update URL routing for login/logout endpoints

**Status**: ✅ **COMPLETED** - See `tasks/for_review/WP05-user-story-2-sign-in-and-sign-out.md` for review notes

### Constitutional Alignment
- Principle V (Security): Session-based auth, brute-force protection, email verification required
- Principle VI (Performance): Sessions database-backed with expiry cleanup
- Principle VII (API Design): Session cookies, consistent error responses

### Implementation Notes
- Login checks: email_verified=True and is_active=True required
- Session created via Django's login() function (sets session cookie)
- Custom middleware checks last_activity timestamp on each request
- If inactive > 24h → logout and return 401
- Absolute timeout (7d) handled by Django's SESSION_COOKIE_AGE
- Feature 003 rate limiting applied via decorator or middleware integration

### Parallel Opportunities
- Form-based views (T031-T034) and DRF API (T035-T037) can proceed in parallel
- Middleware (T040-T041) independent of views

### Dependencies
- WP01 (User model with email_verified field)
- WP04 (Email verification flow must exist)
- Feature 003 (Security baseline for rate limiting)

### Risks & Mitigations
- Session hijacking → Rely on Feature 003 secure cookies, HTTPS enforcement
- Brute-force attacks → Feature 003 rate limiting handles this
- Inactive timeout edge cases → Unit tests for timeout boundary conditions

---

## Work Package WP06: User Story 3 – Password Reset Flow (Priority: P1)

**Goal**: Implement secure password reset flow (US3) with email tokens, no email enumeration, 1-hour expiry per Constitution Principles V, VII.

**Independent Test**: User requests reset, receives email (console in dev), clicks link, sets new password, can sign in with new credentials.

**Prompt**: `tasks/for_review/WP06-user-story-3-password-reset-flow.md`

### Included Subtasks
- [X] T043 Create password reset request form in `accounts/forms.py` (email field only)
- [X] T044 Create password reset request view (validates email, sends token, no enumeration)
- [X] T045 Create password reset email templates: `accounts/templates/accounts/email/password_reset.html` and `password_reset.txt`
- [X] T046 Create password reset confirm form (token + new password fields)
- [X] T047 Create password reset confirm view (validates token, checks expiry, updates password)
- [X] T048 Invalidate all existing sessions on password change (security measure)
- [X] T049 [P] Create DRF password reset request serializer and endpoint (POST /api/v1/auth/password-reset-request)
- [X] T050 [P] Create DRF password reset confirm serializer and endpoint (POST /api/v1/auth/password-reset-confirm)
- [X] T051 Update URL routing for password reset endpoints
- [X] T052 [P] Document password reset security properties in accounts/README.md

**Status**: 🔄 **IN REVIEW** - Implementation complete, all 12 tests passed, awaiting review

### Constitutional Alignment
- Principle V (Security): No email enumeration, token expiry, session invalidation
- Principle VII (API Design): Consistent responses regardless of email existence

### Implementation Notes
- Request always returns "Check your email" message (even if email not found)
- Only send reset email to verified accounts (email_verified=True)
- Token expiry: 1 hour (Django's PasswordResetTokenGenerator default)
- Password reset confirm invalidates token after use (hash changes)
- All sessions deleted via `User.objects.filter(id=user.id).update_sessions()` → sessions.all().delete()
- Reset link format: `/accounts/reset-password/{uidb64}/{token}/`

### Parallel Opportunities
- Form-based views (T043-T048) and DRF API (T049-T050) can proceed in parallel
- Email templates (T045) independent of view logic
- Documentation (T052) can be written in parallel

### Dependencies
- WP01 (User model exists)
- WP03 (Password validators and token utilities exist)

### Risks & Mitigations
- Email enumeration timing attacks → Constant-time response for valid/invalid emails
- Token reuse → Token hash changes after password reset (auto-invalidated)
- Expired token frustration → Clear error message with "request new reset" link

---

## Work Package WP07: User Story 4 – Admin User Management (Priority: P2)

**Goal**: Implement admin user management interface (US4) via Django Admin and REST API, including user list, activate/deactivate, password reset per Constitution Principles V, VII.

**Independent Test**: Admin can view user list (paginated), activate/deactivate users, trigger password resets, regular users blocked from access.

**Prompt**: `tasks/done/WP07-user-story-4-admin-user-management.md`

### Included Subtasks
- [X] T053 Configure Django Admin for User model in `accounts/admin.py` (list display, filters, search)
- [X] T054 Create admin actions: activate_users, deactivate_users, send_password_reset
- [X] T055 Implement self-modification protection (cannot deactivate own account or change own role)
- [X] T056 [P] Create DRF admin user list endpoint (GET /api/v1/admin/users) with pagination
- [X] T057 [P] Create DRF admin user detail endpoint (GET /api/v1/admin/users/{id})
- [X] T058 [P] Create DRF admin activate endpoint (PATCH /api/v1/admin/users/{id}/activate)
- [X] T059 [P] Create DRF admin deactivate endpoint (PATCH /api/v1/admin/users/{id}/deactivate)
- [X] T060 [P] Create DRF admin password reset endpoint (POST /api/v1/admin/users/{id}/reset-password)
- [X] T061 Apply permission checks: superadmin can manage all, admin can manage 'user' role only
- [X] T062 Optimize user list query with select_related('groups') to avoid N+1
- [X] T063 Configure pagination (50 per page) for admin user list API
- [X] T064 Update URL routing for admin API endpoints

### Constitutional Alignment
- Principle V (Security): Role-based access control, self-modification protection
- Principle VI (Performance): Query optimization, pagination for large datasets
- Principle VII (API Design): Consistent responses, proper HTTP status codes

### Implementation Notes
- Django Admin: Displays email, name, is_active, email_verified, role, date_joined, last_login
- Admin actions available in list view (bulk operations)
- API permission classes: IsAdminOrSuperadmin for all endpoints
- Superadmin check: user.is_superuser
- Admin check: user.groups.filter(name='admin').exists()
- Self-modification check: if user.id == target_user.id → return 400
- Pagination: DRF's PageNumberPagination, 50 per page default

### Parallel Opportunities
- Django Admin (T053-T055) and DRF API (T056-T064) can proceed in parallel
- Permission classes already exist from WP02

### Dependencies
- WP01 (User model exists)
- WP02 (Groups and permissions configured)
- WP06 (Password reset functionality exists for admin-triggered resets)

### Risks & Mitigations
- N+1 queries on user list → select_related('groups') for role lookups
- Admin deactivating all superadmins → Prevent self-deactivation, require at least one active superadmin
- Large user lists → Pagination required, performance target <2s for 10k users

---

## Work Package WP08: User Story 5 – Role-Based Access Control (Priority: P2)

**Goal**: Implement role change functionality (US5), permission enforcement across views/APIs, prevent privilege escalation per Constitution Principles V, VII.

**Independent Test**: Superadmin can assign any role, admin can assign 'user' role only, users cannot change own role, permission checks work correctly across all endpoints.

**Prompt**: `tasks/planned/WP08-user-story-5-role-based-access-control.md`

### Included Subtasks
- [ ] T065 Create DRF role change endpoint (PATCH /api/v1/admin/users/{id}/role)
- [ ] T066 Implement role change validation: superadmin can assign all, admin can assign 'user' only
- [ ] T067 Prevent users from changing their own role (self-modification check)
- [ ] T068 Create role change serializer in `accounts/serializers.py`
- [ ] T069 [P] Apply permission checks to all existing endpoints (registration, login, admin APIs)
- [ ] T070 [P] Create permission check decorator for view-based access control
- [ ] T071 [P] Document role-based access control model in accounts/README.md
- [ ] T072 Update URL routing for role change endpoint

### Constitutional Alignment
- Principle V (Security): Least privilege, role-based access control, privilege escalation prevention
- Principle VII (API Design): Consistent permission denied responses (403 Forbidden)

### Implementation Notes
- Role change: Remove user from all groups, add to specified group (superadmin/admin/user)
- Superadmin role: is_superuser=True (special case, not a group)
- Validation: Check requester's role before allowing assignment
- Self-modification: if requester.id == target_user.id → return 400
- Permission decorator: @permission_required_or_403 wraps view methods
- DRF permission classes: Check user role in has_permission() method

### Parallel Opportunities
- Role change endpoint (T065-T068) independent of permission enforcement (T069-T070)
- Documentation (T071) can be written in parallel

### Dependencies
- WP02 (Groups and permission classes exist)
- WP07 (Admin user management endpoints exist)

### Risks & Mitigations
- Privilege escalation via API manipulation → Server-side checks on every request
- Role confusion → Clear role hierarchy documented (superadmin > admin > user)
- Admin promoting themselves → Self-modification check prevents this

---

## Work Package WP09: Enhanced createsuperuser Management Command (Priority: P2)

**Goal**: Create Django management command (US4/FR-021a) for initial superadmin creation with proper role assignment and email verification bypass per Constitution Principles V, VIII.

**Independent Test**: Command creates superuser with is_superuser=True, is_staff=True, is_active=True, email_verified=True, assigned to 'superadmin' group.

**Prompt**: `tasks/planned/WP09-enhanced-createsuperuser-management-command.md`

### Included Subtasks
- [ ] T073 Create `accounts/management/commands/createsuperuser.py` (override Django's default)
- [ ] T074 Implement interactive prompts for email and password
- [ ] T075 Set email_verified=True and is_active=True for superuser (bypass verification)
- [ ] T076 Assign superuser to 'superadmin' group automatically
- [ ] T077 Validate email uniqueness and password strength in command
- [ ] T078 [P] Document createsuperuser usage in accounts/README.md and quickstart.md

### Constitutional Alignment
- Principle V (Security): Superuser creation controlled, email verification bypassed intentionally
- Principle VIII (Developer Experience): Simple command for initial setup

### Implementation Notes
- Command name: `python manage.py createsuperuser` (overrides Django default)
- Interactive: Prompts for email, password (with confirmation)
- Non-interactive: Accepts --email and --no-input for automation
- Sets: is_superuser=True, is_staff=True, is_active=True, email_verified=True
- Group assignment: Uses signal or explicit group.user_set.add(user)
- Validation: Uses existing password validators and email validator

### Parallel Opportunities
- Documentation (T078) can be written in parallel with command implementation

### Dependencies
- WP01 (User model exists)
- WP02 (Groups exist, especially 'superadmin')
- WP03 (Password validators exist)

### Risks & Mitigations
- Group not found → Command checks group existence, fails gracefully if missing
- Email already exists → Validate uniqueness, show clear error
- Password too weak → Validators enforce strength requirements

---

## Work Package WP10: Testing, Documentation & Quality Gates (Priority: P2)

**Goal**: Implement comprehensive test suite, update documentation, configure CI/CD quality gates per Constitution Principles IV, VIII, X, XI.

**Independent Test**: All tests pass (>85% coverage for auth, 100% for permissions), CI pipeline green, documentation complete and accurate.

**Prompt**: `tasks/planned/WP10-testing-documentation-and-quality-gates.md`

### Included Subtasks
- [ ] T079 Create pytest fixtures in `tests/accounts/conftest.py` (user factories, groups, sessions)
- [ ] T080 Create factory_boy factories in `tests/accounts/factories.py` (UserFactory, superadmin/admin/user variants)
- [ ] T081 [P] Write unit tests for User model (`tests/accounts/test_models.py`)
- [ ] T082 [P] Write unit tests for authentication views (`tests/accounts/test_authentication.py`)
- [ ] T083 [P] Write unit tests for registration + verification (`tests/accounts/test_registration.py`)
- [ ] T084 [P] Write unit tests for password reset flow (`tests/accounts/test_password_reset.py`)
- [ ] T085 [P] Write unit tests for permissions (`tests/accounts/test_permissions.py`) - target 100% coverage
- [ ] T086 [P] Write unit tests for Django Admin (`tests/accounts/test_admin.py`)
- [ ] T087 [P] Write unit tests for validators (`tests/accounts/test_validators.py`)
- [ ] T088 [P] Write API tests for auth endpoints (`tests/accounts/api/test_auth_api.py`)
- [ ] T089 [P] Write API tests for admin endpoints (`tests/accounts/api/test_admin_api.py`)
- [ ] T090 Write integration tests for full auth flows (`tests/integration/test_auth_flow.py`)
- [ ] T091 Configure pytest-django settings and coverage thresholds in `pyproject.toml`
- [ ] T092 [P] Update `src/accounts/README.md` with complete app documentation
- [ ] T093 [P] Update `kitty-specs/005-core-accounts-authentication/quickstart.md` with tested examples
- [ ] T094 [P] Create ADR for email-as-username decision (Architecture Decision Record)
- [ ] T095 [P] Create ADR for three-tier role design
- [ ] T096 Configure CI pipeline to run pytest with coverage checks
- [ ] T097 Add mypy type checking to CI for accounts module
- [ ] T098 Verify Black and Ruff pass on all accounts code
- [ ] T099 Run security audit on authentication flows (OWASP Top 10 check)
- [ ] T100 Validate performance targets (1k concurrent logins <1s, user list 10k <2s)

### Constitutional Alignment
- Principle IV (Testing): Comprehensive test coverage, deterministic tests
- Principle VIII (Developer Experience): Clear documentation, easy setup
- Principle X (CI/CD): Quality gates in CI pipeline
- Principle XI (Documentation): Complete docs, ADRs for major decisions

### Implementation Notes
- Test coverage targets: >85% for authentication module, 100% for permission checks
- Fixtures: Create users with different roles, verified/unverified states
- Integration tests: Full flows from registration through login
- Security tests: Brute-force, CSRF, token expiry, email enumeration
- Performance tests: Load testing for concurrent login and user list queries
- ADRs: Document rationale for email-as-username and three-tier role choices
- CI: pytest, mypy, Black, Ruff, coverage report

### Parallel Opportunities
- All test files (T081-T090) can be written in parallel
- Documentation (T092-T095) independent of tests
- CI configuration (T096-T098) independent of test implementation

### Dependencies
- WP01-WP09 (All implementation complete before comprehensive testing)

### Risks & Mitigations
- Flaky tests → Avoid time-dependent assertions, use freezegun for time mocking
- Low coverage → Mandatory coverage gates in CI
- Missing edge cases → Code review focuses on test completeness

---

## Summary

**Total Work Packages**: 10 (WP01-WP10)
**Total Subtasks**: 100 (T001-T100)
**Estimated Effort**: 8-12 engineering days

### Phase Breakdown

**Phase 0 - Infrastructure (WP01-WP03)**: Foundation for all authentication work
- 20 subtasks
- Focus: Custom user model, groups/permissions, password validation, token utilities
- Parallel: Settings configuration, documentation, requirements

**Phase 1 - Core Auth Flows (WP04-WP06)**: Essential user-facing functionality
- 32 subtasks
- Focus: Registration, email verification, login/logout, password reset
- Parallel: Form-based views and DRF APIs can proceed simultaneously

**Phase 2 - Admin & Roles (WP07-WP09)**: Administrative capabilities
- 26 subtasks
- Focus: User management interface, role-based access control, superuser command
- Parallel: Django Admin and DRF Admin APIs independent

**Phase 3 - Quality & Docs (WP10)**: Testing, documentation, CI/CD
- 22 subtasks
- Focus: Comprehensive test suite, documentation updates, quality gates
- Parallel: Most test files and documentation can be created simultaneously

### Parallelization Highlights

- **Settings configuration** (T004-T006): Independent of model creation
- **DRF APIs** and **form-based views**: Can proceed in parallel throughout
- **Test files** (T081-T090): All test modules can be written concurrently
- **Documentation** (T020, T052, T071, T078, T092-T095): Independent of implementation
- **CI configuration** (T096-T098): Can be set up early and refined

### MVP Scope Recommendation

**Minimum Viable Product**: WP01-WP06 + WP09 + WP10 (testing/docs)
- Core authentication: Registration, verification, login, logout, password reset
- Basic infrastructure: User model, groups, password validation
- Superuser creation for initial access
- Comprehensive testing and documentation

**Deferred for v1.1**: WP07-WP08 (Admin user management and advanced role features)

### Next Steps

1. **Review this task breakdown** with team for completeness and prioritization
2. **Execute `/spec-kitty.implement WP01`** to start implementation
3. **Track progress** in this file by checking off completed subtasks
4. **Use prompt files** in `tasks/planned/` for detailed implementation guidance

### Performance Targets

- **Registration flow**: <3 minutes end-to-end (including email verification)
- **Login**: <5 seconds from credentials to authenticated session
- **Password reset**: <2 minutes end-to-end
- **Concurrent logins**: 1,000 requests <1s latency per request
- **Admin user list**: 10,000 users loaded in <2s with pagination

### Security Checklist

- [x] Email verification required before access
- [x] Strong password requirements enforced
- [x] Session timeouts configured (24h inactive, 7d absolute)
- [x] No email enumeration in password reset
- [x] Brute-force protection via Feature 003 integration
- [x] Secure token generation (cryptographically signed)
- [x] Self-modification protection for admins
- [x] Role-based access control enforced server-side
- [x] All sessions invalidated on password change
- [x] CSRF protection via Django/DRF defaults

---

**Constitution Alignment**: ✅ All work packages comply with Django Core-App Constitution principles.
**Feature Specification**: `kitty-specs/005-core-accounts-authentication/spec.md`
**Implementation Plan**: `kitty-specs/005-core-accounts-authentication/plan.md`
**Data Model**: `kitty-specs/005-core-accounts-authentication/data-model.md`
**API Contracts**: `kitty-specs/005-core-accounts-authentication/contracts/`
