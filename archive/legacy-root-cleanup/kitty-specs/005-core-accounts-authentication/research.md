# Research: Core Accounts & Authentication

**Feature**: 005-core-accounts-authentication
**Date**: 2025-11-23
**Status**: Complete

## Research Questions & Findings

### Q1: Authentication Architecture Approach

**Decision**: Django's built-in auth + custom user model (AbstractBaseUser + PermissionsMixin)

**Rationale**:
- Mature, battle-tested Django authentication framework
- AbstractBaseUser provides full control over user model (email as username)
- PermissionsMixin integrates seamlessly with Django's permission system
- Compatible with Django Admin out of the box
- Supports database-backed sessions (requirement from spec)
- No additional dependencies required (batteries included)

**Alternatives Considered**:
- **DRF TokenAuthentication**: Rejected because spec requires database-backed sessions, not stateless tokens
- **JWT (djangorestframework-simplejwt)**: Rejected because tokens can't be revoked easily (security concern), and spec specifies session timeout management
- **Custom auth system**: Unnecessary complexity, Django's system meets all requirements

**Sources**:
- Django 5.1 Authentication Documentation
- Django Custom User Model Best Practices
- Feature 003 security baseline integration requirements

---

### Q2: Email Backend Configuration

**Decision**: Django SMTP backend (console for dev, SMTP for production)

**Rationale**:
- Django's built-in email backends are sufficient for MVP
- Console backend for development (no external service needed)
- SMTP backend for production provides flexibility (any SMTP server)
- Synchronous sending acceptable for low-volume auth emails
- Failure handling: log errors, don't block user registration (user can request resend)
- Multipart emails (HTML + text) supported natively

**Alternatives Considered**:
- **Third-party service (SendGrid/Mailgun/AWS SES)**: Deferred to deployment phase, Django SMTP backend can use these via SMTP anyway
- **Celery async tasks**: Adds complexity (Celery dependency, broker requirement), not needed for MVP auth email volume

**Implementation Notes**:
- EMAIL_BACKEND setting configurable per environment
- Verification emails: 24h token expiry (FR-005)
- Password reset emails: 1h token expiry (FR-011)
- Email templates: `accounts/email/` directory with HTML + text versions

**Sources**:
- Django Email Documentation
- Best practices for transactional emails

---

### Q3: Role Implementation Strategy

**Decision**: Django Groups with permissions assigned per group

**Rationale**:
- Leverages Django's built-in Group and Permission models
- Three groups created: `superadmin`, `admin`, `user`
- Permissions assigned via group membership
- Extensible: new groups/permissions can be added without code changes
- Compatible with Django Admin's permission UI
- Supports future multi-tenancy (group membership can be tenant-scoped)

**Alternatives Considered**:
- **Custom Role model**: Over-engineering for three static roles, adds DB complexity
- **CharField on User model**: Inflexible, harder to add new roles or permission granularity

**Implementation Details**:
- Groups created via data migration
- Permissions mapped:
  - `superadmin`: all permissions (is_superuser=True)
  - `admin`: user management permissions (add/change/delete User)
  - `user`: no special permissions (default Django user)
- Helper methods on User model: `is_superadmin`, `is_admin`, `is_regular_user`

**Sources**:
- Django Groups and Permissions Documentation
- Multi-tenant Django patterns

---

### Q4: API Authentication Method

**Decision**: Session-based authentication (cookies) for both web and REST API

**Rationale**:
- Consistent authentication across web and API (same session)
- Meets spec requirement: database-backed sessions
- CSRF protection works naturally with session auth
- Session timeout enforcement (24h inactive / 7d absolute from clarifications)
- Compatible with Feature 003 security baseline (secure cookies, HTTPS)
- Simpler for browser-based API clients (no token management)

**Alternatives Considered**:
- **Token-based (DRF Token)**: Different auth mechanism for API vs web, token management overhead
- **Hybrid (sessions + tokens)**: Unnecessary complexity for initial MVP, can add API tokens later if needed for mobile apps

**Implementation**:
- DRF SessionAuthentication class
- CSRF enforcement on state-changing operations
- Same login endpoint serves web and API clients
- Session cookie settings from Feature 003 (secure, httponly, samesite)

**Sources**:
- Django REST Framework Authentication Documentation
- Session security best practices

---

### Q5: Token Storage Strategy

**Decision**: Django's PasswordResetTokenGenerator (signed tokens, no DB storage)

**Rationale**:
- Tokens are cryptographically signed (HMAC with SECRET_KEY)
- Stateless: no database table needed for tokens
- Automatic expiration via timestamp in token
- Built-in protection against token reuse (user's password hash changes after reset)
- Email verification uses same pattern with custom generator
- Reduced database writes (no token cleanup job needed)

**Alternatives Considered**:
- **Separate model (EmailVerificationToken, PasswordResetToken)**: Database growth, cleanup overhead, unnecessary when signed tokens work
- **Fields on User model**: Pollutes user model with temporary data, still requires cleanup logic

**Implementation Details**:
- Custom token generator for email verification (subclass PasswordResetTokenGenerator)
- Password reset uses Django's default token generator
- Token validation checks:
  1. Signature valid (not tampered)
  2. Timestamp within expiry window (24h for verification, 1h for reset)
  3. User's password hasn't changed (prevents reuse after reset)
- Token format: URL-safe base64 encoded

**Sources**:
- Django PasswordResetTokenGenerator source code
- Cryptographic token best practices

---

## Technical Decisions Summary

| Decision Area | Chosen Approach | Key Benefit |
|---------------|----------------|-------------|
| User Model | AbstractBaseUser + PermissionsMixin | Full control, email as username |
| Roles | Django Groups | Leverages built-in permissions |
| Sessions | Database-backed with timeouts | Revocable, timeout enforcement |
| Email | Django SMTP (console/SMTP) | Simple, configurable per environment |
| API Auth | Session-based (cookies) | Consistent with web, CSRF protection |
| Tokens | Signed tokens (no DB) | Stateless, automatic expiration |
| Password Rules | Django validators + custom | Uppercase+lowercase+number+special |

---

## Integration Points

### Feature 003: Security Baseline
- **Brute-force protection**: Login view wrapped with rate limiting from security baseline
- **Secure cookies**: Session cookie settings (secure, httponly, samesite) configured in Feature 003
- **HTTPS enforcement**: Required in production (handled by security baseline)
- **CSRF protection**: Enabled globally, enforced on auth endpoints

### Feature 004: Internationalization
- **Email templates**: Support for translation via Django's i18n framework
- **Error messages**: Translatable strings using gettext
- **Language negotiation**: Respects Accept-Language header from i18n middleware

### Feature 001: Project Skeleton
- **Settings structure**: AUTH_USER_MODEL in base settings, email config per environment
- **Health checks**: Auth system health check added to existing health endpoint
- **Migrations**: User model migration runs after Django's built-in auth migrations

---

## Performance Considerations

**Query Optimization**:
- User list: `select_related('groups')` to avoid N+1 queries
- Pagination: 50 users per page for admin interface
- Session lookup: Indexed by session_key (Django default)

**Caching Strategy**:
- Session data cached via Django's session engine (cache backend configurable)
- Permission checks cached per request (Django's permission backend does this)
- No custom caching needed for MVP

**Email Sending**:
- Synchronous for MVP (acceptable for low volume)
- Error handling: log failure, don't block user flow
- Future: Can add Celery for async sending if volume increases

---

## Security Research

**Password Storage**:
- Django's PBKDF2 hasher with 260,000 iterations (FR-002)
- PASSWORD_HASHERS setting uses Django defaults
- Automatic hash upgrade on login if iterations increase

**Password Validation**:
- Custom validator: minimum 8 chars, uppercase + lowercase + number + special
- Django's built-in validators: CommonPasswordValidator, UserAttributeSimilarityValidator
- Validation applied at registration and password change

**Token Security**:
- Signed with SECRET_KEY (must be kept secret)
- Includes timestamp to prevent replay after expiry
- URL-safe encoding prevents injection attacks
- Token invalidated after password reset (password hash changes)

**Email Enumeration Protection** (FR-030):
- Password reset: Generic "check your inbox" message regardless of email existence
- Registration: Email sent only if address not already registered, but message doesn't reveal this
- Timing attacks: Constant-time comparison for token validation

---

## Testing Strategy

**Unit Tests** (>85% coverage target):
- User model: field validation, email uniqueness, role helpers
- Authentication: login success/failure, logout
- Registration: form validation, email verification flow
- Password reset: token generation, validation, expiry
- Permissions: role-based access checks
- Validators: password strength rules

**Integration Tests**:
- Full registration flow: signup → email → verify → login
- Full password reset flow: request → email → reset → login
- Admin user management: list users, activate/deactivate, reset password
- API endpoints: all authentication and admin REST endpoints

**Security Tests**:
- Brute force resistance (via Feature 003)
- CSRF protection on state-changing operations
- Session timeout enforcement
- Token reuse prevention
- Email enumeration protection

---

## Deployment Considerations

**Environment Variables** (production):
- `SECRET_KEY`: Django secret (must be unique per deployment)
- `EMAIL_HOST`: SMTP server hostname
- `EMAIL_PORT`: SMTP port (usually 587 for TLS)
- `EMAIL_HOST_USER`: SMTP authentication username
- `EMAIL_HOST_PASSWORD`: SMTP authentication password
- `EMAIL_USE_TLS`: Enable TLS (True for production)
- `DEFAULT_FROM_EMAIL`: Sender address for system emails

**Database Migrations**:
- Custom user model migration must run before any app referencing User
- Data migration to create default groups (superadmin, admin, user)
- Migration to create initial superadmin (via createsuperuser command in deploy script)

**Static Files**:
- No static files needed for backend-only feature
- Email templates included in package (not served as static)

---

## Open Questions (None)

All planning questions answered during discovery phase. No blocking unknowns remain.

---

## References

1. Django 5.1 Documentation - Custom User Models
2. Django 5.1 Documentation - Authentication
3. Django REST Framework - Authentication
4. OWASP Authentication Cheat Sheet
5. Feature 003 Specification - Security Baseline
6. Feature 004 Specification - Internationalization
