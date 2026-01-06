# B05: Core Accounts & Authentication

**Phase:** 2
**Status:** ✅ Done
**Module ID:** 005
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 5. B05 – Core Accounts & Authentication

**Doel**: Custom user model, auth flows (login/logout/signup), roles en permissions baseline.

**Status**: ✅ Complete

**Key Features**:
- Custom User model (AbstractBaseUser)
- Django REST Framework authentication
- Token-based auth (JWT optional)
- Password reset flows
- Email verification
- django-stubs type hints

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Accounts & Authentication

**Feature Branch**: `005-core-accounts-authentication`
**Created**: 2025-11-23
**Status**: Draft
**Input**: User description: "Define a generic accounts module with a custom user model, authentication flows and base permissions suitable for multi-tenant SaaS products."

## Clarifications

### Session 2025-11-23

- Q: What should the session timeout policy be? → A: 24 hours inactive / 7 days absolute
- Q: How should the first superadmin be created? → A: Django management command (createsuperuser)
- Q: Should password validation include additional requirements? → A: Add uppercase+lowercase+special+number
- Q: What format should system emails use? → A: Both (multipart HTML+text fallback)
- Q: How should the admin user management interface be implemented? → A: Both Django Admin + REST API

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registration with Email Verification (Priority: P1)

New users can create an account using their email address and must verify their email before accessing the system. This establishes identity and ensures valid contact information.

**Why this priority**: Core authentication flow - without this, no users can enter the system. Represents the primary entry point for all user journeys.

**Independent Test**: Can be fully tested by submitting registration form with valid email, checking that verification email is sent, clicking verification link, and confirming account is activated.

**Acceptance Scenarios**:

1. **Given** I am on the registration page, **When** I submit valid email and password, **Then** system creates inactive account and sends verification email
2. **Given** I receive a verification email, **When** I click the verification link, **Then** my account is activated and I can sign in
3. **Given** I try to sign in with unverified email, **When** I submit credentials, **Then** system blocks access and shows "verify your email" message
4. **Given** my verification link expired, **When** I request a new one, **Then** system sends a fresh verification email

---

### User Story 2 - Secure Sign In/Sign Out (Priority: P1)

Users can sign in with their verified email and password, access the system, and sign out securely. Sessions persist across page loads.

**Why this priority**: Essential for any authenticated system - directly enables all other user functionality.

**Independent Test**: Can be fully tested by signing in with valid credentials, verifying session persists across requests, and confirming sign out destroys session.

**Acceptance Scenarios**:

1. **Given** I have a verified account, **When** I sign in with correct email/password, **Then** system creates authenticated session
2. **Given** I am signed in, **When** I navigate through the application, **Then** my session remains active
3. **Given** I am signed in, **When** I click sign out, **Then** system destroys my session and redirects to public page
4. **Given** I enter wrong password, **When** I submit credentials, **Then** system shows error message and security baseline rate limiting applies

---

### User Story 3 - Password Reset Flow (Priority: P1)

Users who forgot their password can request a secure password reset link via email and set a new password without admin intervention.

**Why this priority**: Critical self-service flow - reduces support burden and unblocks users immediately.

**Independent Test**: Can be fully tested by requesting password reset, receiving email with token, clicking link, setting new password, and signing in with new credentials.

**Acceptance Scenarios**:

1. **Given** I forgot my password, **When** I enter my email on the reset page, **Then** system sends password reset email with secure token
2. **Given** I receive reset email, **When** I click the link, **Then** system shows password reset form
3. **Given** I am on password reset form, **When** I submit valid new password, **Then** system updates password and allows me to sign in
4. **Given** reset token expired, **When** I try to use it, **Then** system shows error and offers to send new token
5. **Given** I request reset for non-existent email, **When** I submit, **Then** system shows generic "if email exists, check inbox" message (no information leakage)

---

### User Story 4 - Admin User Management (Priority: P2)

Administrators can view all users, see their status (active/inactive, verified/unverified), activate/deactivate accounts, and reset user passwords.

**Why this priority**: Essential administrative capability but not required for basic user flows. Enables support operations.

**Independent Test**: Can be fully tested by logging in as admin, accessing user list, performing activate/deactivate actions, and triggering password reset for a user.

**Acceptance Scenarios**:

1. **Given** I am signed in as admin, **When** I access user management interface, **Then** system displays list of all users with status indicators
2. **Given** I see an active user, **When** I deactivate their account, **Then** system marks user inactive and blocks their sign in
3. **Given** I see an inactive user, **When** I reactivate their account, **Then** system marks user active and allows sign in
4. **Given** I select a user, **When** I trigger password reset, **Then** system sends password reset email to that user
5. **Given** I am signed in as regular user, **When** I try to access user management, **Then** system denies access

---

### User Story 5 - Role-Based Access Control (Priority: P2)

The system supports three-tier roles (superadmin, admin, user) with different permission levels, allowing proper separation of concerns across platform and tenant boundaries.

**Why this priority**: Foundation for multi-tenancy and access control, but basic user flows work without complex permissions.

**Independent Test**: Can be fully tested by creating users with different roles, verifying each role's access to specific features, and confirming permission checks work correctly.

**Acceptance Scenarios**:

1. **Given** I am superadmin, **When** I access system features, **Then** I have platform-level access including all admin capabilities
2. **Given** I am admin, **When** I access system features, **Then** I have tenant-level administrative access
3. **Given** I am regular user, **When** I access system features, **Then** I have basic user-level access only
4. **Given** admin tries to perform superadmin action, **When** permission check runs, **Then** system denies access
5. **Given** superadmin assigns admin role to user, **When** that user signs in, **Then** system grants admin permissions

---

### User Story 6 - Extensible User Profile (Priority: P3)

Developers can extend the custom user model with additional fields without breaking core authentication functionality, enabling product-specific customizations.

**Why this priority**: Important for long-term maintainability but not needed for initial launch. Ensures future extensibility.

**Independent Test**: Can be fully tested by subclassing the user model, adding custom fields, running migrations, and verifying authentication still works.

**Acceptance Scenarios**:

1. **Given** developer extends user model, **When** they add custom fields, **Then** authentication flows continue working
2. **Given** custom user fields exist, **When** user signs in, **Then** system loads both core and custom attributes
3. **Given** migrations run, **When** new fields are added, **Then** database schema updates without breaking existing data

---

### Edge Cases

- **Concurrent verification**: User clicks verification link twice simultaneously - system should handle idempotently
- **Token reuse**: User attempts to reuse expired or already-used password reset token - system must reject
- **Account enumeration**: Attackers probe which emails are registered - password reset and registration flows should not leak existence of accounts
- **Email change**: User wants to change email address - requires re-verification of new email before switch
- **Role escalation**: User attempts to modify their own role via API manipulation - system must enforce server-side permission checks
- **Session hijacking**: Attacker steals session token - system relies on Feature 003 security baseline (secure cookies, HTTPS enforcement)
- **Brute force on verification**: Attacker tries to guess verification tokens - system enforces token complexity and expiration
- **Inactive admin**: Superadmin deactivates their own account - system should prevent (require another superadmin or special process)

## Requirements *(mandatory)*

### Functional Requirements

**Authentication Core**:
- **FR-001**: System MUST provide custom user model using email as primary identifier (username field equals email)
- **FR-002**: System MUST hash passwords using Django's default PBKDF2 with at least 260,000 iterations
- **FR-003**: System MUST require email verification before allowing account access
- **FR-004**: System MUST send verification emails with secure tokens (random, URL-safe, 32+ characters)
- **FR-004a**: System MUST send emails in multipart format (HTML with plain text fallback)
- **FR-005**: System MUST expire verification tokens after 24 hours
- **FR-006**: System MUST support sign in flow with email and password
- **FR-007**: System MUST support sign out flow that destroys session
- **FR-008**: System MUST use Django's session framework with database-backed sessions
- **FR-008a**: System MUST expire sessions after 24 hours of inactivity
- **FR-008b**: System MUST expire sessions after 7 days regardless of activity (absolute timeout)
- **FR-009**: System MUST integrate with Feature 003 security baseline for brute-force protection (no duplicate lockout logic in accounts module)

**Password Management**:
- **FR-010**: System MUST support password reset flow via email tokens
- **FR-011**: System MUST expire password reset tokens after 1 hour
- **FR-012**: System MUST enforce password requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character)
- **FR-013**: System MUST prevent password reset token reuse after successful password change
- **FR-014**: System MUST send password reset emails only to verified accounts

**Role & Permission System**:
- **FR-015**: System MUST define three roles: `superadmin` (platform-level), `admin` (tenant-level), `user` (basic access)
- **FR-016**: System MUST use Django's model-level permissions system (no object-level permissions)
- **FR-017**: System MUST assign default `user` role to newly registered accounts
- **FR-018**: System MUST allow superadmin to assign any role to users
- **FR-019**: System MUST allow admin to manage users with `user` role only (cannot modify other admins or superadmins)
- **FR-020**: System MUST enforce role-based access control on all administrative actions

**Admin User Management**:
- **FR-021**: System MUST provide interface for admins to view list of all users
- **FR-021a**: System MUST provide Django management command (createsuperuser) to create initial superadmin account
- **FR-021b**: System MUST provide both Django Admin interface and REST API endpoints for user management
- **FR-022**: System MUST display user status: email verified (yes/no), account active (yes/no), role
- **FR-023**: System MUST allow admins to activate/deactivate user accounts
- **FR-024**: System MUST allow admins to trigger password reset email for any user
- **FR-025**: System MUST block deactivated users from signing in
- **FR-026**: System MUST prevent admins from modifying their own role or active status

**Data & Security**:
- **FR-027**: System MUST validate email format on registration and profile updates
- **FR-028**: System MUST enforce unique email constraint across all users
- **FR-029**: System MUST log authentication events (sign in success/failure, password reset requests) for security auditing
- **FR-030**: System MUST not disclose whether an email exists during password reset (generic "check your inbox" message)
- **FR-031**: System MUST be extensible - allow downstream projects to subclass user model without breaking core authentication

**Multi-tenant Compatibility**:
- **FR-032**: User model MUST be designed for future tenant association (no hard-coded tenant logic yet)
- **FR-033**: System MUST support email uniqueness within tenant scope when multi-tenancy modules (B06-B07) are integrated

### Key Entities

- **User**: Represents an individual with system access
  - Core attributes: email (username), password (hashed), first_name, last_name, is_active, is_staff, date_joined, last_login
  - Authentication attributes: email_verified (boolean), email_verification_token, email_verification_sent_at
  - Role: relationship to role (superadmin/admin/user)
  - Future tenant relationship: designed to support foreign key to tenant model (not implemented in this feature)

- **Role**: Defines user's permission level
  - Types: `superadmin`, `admin`, `user`
  - Permissions: references Django's built-in permission system
  - Scope: platform-level (superadmin) vs tenant-level (admin) vs basic (user)

- **PasswordResetToken**: Tracks password reset requests
  - Attributes: user, token (secure random string), created_at, used (boolean)
  - Expiration: 1 hour from creation
  - Single use: marked as used after successful password change

- **Session** (Django built-in): Maintains authenticated state
  - Attributes: session_key, session_data, expire_date
  - Storage: database-backed via Django's session framework
  - Security: secure cookies, HTTP-only flags (handled by Feature 003)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Accounts module provides generic authentication and user management. Custom user model is designed for extension via subclassing. No product-specific workflows (billing, provisioning, org-specific roles) are implemented.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: Creates new `accounts` app focused solely on user identity and authentication. Integrates with existing `security_baseline` app (Feature 003) for brute-force protection. Future tenant relationship will be via foreign key (no tight coupling).

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: Follows established project standards from Features 001-004.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Justification**: Test coverage targets: >85% for authentication flows, 100% for permission checks, integration tests for email verification and password reset flows.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: Integrates with Feature 003 security baseline. Uses Django's password hashing. Tokens are cryptographically secure random strings. Email enumeration protection implemented. No passwords in logs.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Justification**: Admin user list will use pagination and select_related for role lookups. Email sending failures will be logged but not block registration (user can request new verification email). Session queries optimized via Django's session middleware.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Justification**: Authentication endpoints follow REST conventions. Validation in serializers/forms. Consistent error responses (400 for validation, 401 for auth failures, 403 for permission denied).

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Justification**: Will document custom user model extension pattern, role assignment process, and integration with security baseline. ADR for email-as-username decision and three-tier role design.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration and email verification flow in under 3 minutes
- **SC-002**: Users can sign in and access authenticated pages in under 5 seconds
- **SC-003**: Password reset flow from email request to new password set takes under 2 minutes
- **SC-004**: System handles 1,000 concurrent sign in requests without authentication latency exceeding 1 second
- **SC-005**: 95% of users successfully complete email verification on first attempt (no token expiration or email delivery issues)
- **SC-006**: Admin user management interface loads user list of 10,000 users in under 2 seconds (via pagination)
- **SC-007**: Zero authentication bypass vulnerabilities in security audit
- **SC-008**: Role-based permission checks execute in under 50ms per request
- **SC-009**: Email verification and password reset tokens expire correctly (no security vulnerabilities from token reuse)
- **SC-010**: Custom user model can be extended by downstream projects without breaking authentication (extensibility verified via test suite)

### Quality Metrics

- **Test Coverage**: >85% code coverage for authentication module, 100% for permission checks
- **Security**: No OWASP Top 10 vulnerabilities in authentication flows
- **Maintainability**: Custom user model extension documented with working examples
- **Integration**: Seamless integration with Feature 003 security baseline (no conflicts or duplicate logic)
- **Performance**: User list query performance <200ms for datasets up to 100,000 users (with pagination)

## Dependencies & Integration

### Depends On
- **Feature 001**: Core Project Skeleton - Django project structure and settings framework
- **Feature 003**: Core Security Baseline - Brute-force protection, secure session configuration, CSRF protection

### Enables
- **Feature 006**: Core Multi-Tenancy (planned) - User-tenant relationships
- **Feature 007**: Tenant Provisioning (planned) - Admin capabilities for tenant setup
- Future features requiring authenticated users and role-based access control

### External Dependencies
- Django 5.1+ authentication framework (AbstractBaseUser, PermissionsMixin)
- Django email backend (SMTP configuration for verification and password reset emails)
- PostgreSQL or compatible database for user storage and sessions

## Assumptions

1. **Email delivery is configured**: SMTP settings are configured in Django settings (not part of this feature scope)
2. **HTTPS in production**: Feature 003 security baseline enforces HTTPS for secure cookies and session security
3. **Single database**: Multi-database support for user authentication is not in scope (standard Django approach)
4. **English language initially**: Email templates and UI messages in English; internationalization support exists from Feature 004 but translations not required
5. **No social authentication**: OAuth, SAML, OIDC are explicitly out of scope for this feature
6. **Token storage in database**: Verification and password reset tokens stored in database (alternative: JWT or signed tokens - database approach chosen for revocation support)
7. **Email as immutable identifier**: Changing email requires re-verification flow (not part of MVP scope)
8. **Role assignment is manual**: No automatic role assignment based on email domain or org structure (future enhancement)

## Out of Scope

- Social authentication (Google, GitHub, Microsoft, etc.)
- Two-factor authentication (2FA/MFA)
- Single Sign-On (SSO) integration
- SAML or OIDC identity provider functionality
- User provisioning workflows (bulk import, CSV upload)
- Organization-specific roles or hierarchical permissions
- Billing or subscription management
- User activity tracking (beyond authentication events)
- Email change functionality (deferred to future feature)
- Account deletion or GDPR compliance tools
- API key authentication (separate feature)
- Magic link authentication
- Passwordless authentication

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Email delivery failures block user access | High | Medium | Provide "resend verification email" functionality; log email failures for ops monitoring |
| Token guessing attacks | High | Low | Use cryptographically secure random tokens (32+ chars); enforce expiration; rate limit token validation via Feature 003 |
| Account enumeration via timing attacks | Medium | Medium | Ensure consistent response times for valid/invalid emails in password reset flow |
| Session hijacking | High | Low | Rely on Feature 003 secure session configuration (HTTP-only, secure cookies, HTTPS enforcement) |
| Role escalation via API manipulation | High | Low | Enforce all permission checks server-side; never trust client-submitted roles |
| Custom user model extension breaks authentication | High | Medium | Provide comprehensive test suite and documentation for extension patterns; include working example in docs |
| Performance degradation with large user base | Medium | Medium | Implement pagination for user lists; optimize queries with select_related/prefetch_related |
| Email verification token conflicts | Low | Low | Use UUID or secure random with sufficient entropy (128+ bits) |

## Notes

- **Design decision - Email as username**: Simplifies user experience (one field) and aligns with modern SaaS patterns. Trade-off: email change requires more complex flow (deferred).
- **Design decision - Three-tier roles**: Balances simplicity with multi-tenant needs. Superadmin for platform ops, admin for tenant management, user for basic access. More granular permissions can be added via Django groups without changing role structure.
- **Design decision - Database-backed sessions**: Chosen over JWT for easier revocation and compatibility with Django admin. Trade-off: database query per request (acceptable with caching).
- **Integration with Feature 003**: Relies entirely on security baseline for brute-force protection. No duplicate rate limiting or account lockout logic in accounts module.
- **Multi-tenancy preparation**: User model designed with future tenant foreign key in mind, but no tenant logic implemented yet (avoids premature abstraction).
- **Extensibility**: Custom user model uses AbstractBaseUser + PermissionsMixin pattern, allowing downstream projects to add fields without migrations in core library.
