# ADR-013: JWT Authentication Strategy

**Status**: Accepted
**Date**: 2025-11-29
**Deciders**: Core Team
**Feature**: B13 API Foundation & Standards (WP02)

## Context

The Django Core application requires a robust authentication mechanism for REST APIs that:
- Supports stateless authentication for API clients
- Allows session-based authentication for browser clients
- Enforces security policies (inactive user checks, token expiration)
- Enables token revocation (logout functionality)
- Scales horizontally without session affinity requirements

Traditional session-based authentication requires server-side session storage and doesn't work well for:
- Mobile applications
- Third-party integrations
- Microservices architectures
- Load-balanced deployments

## Decision

We will implement **JWT (JSON Web Token) authentication as the primary authentication mechanism** for REST APIs, with session authentication as a fallback for browser-based clients.

### Implementation Details

1. **Library**: `djangorestframework-simplejwt 5.3.1`
   - Mature, well-maintained JWT implementation for Django REST Framework
   - Built-in token blacklisting support
   - Customizable token lifetimes and claims

2. **Token Types**:
   - **Access Token**: Short-lived (15 minutes), used for API requests
   - **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

3. **Token Endpoints**:
   - `POST /api/v1/auth/token/` - Obtain tokens with username/password
   - `POST /api/v1/auth/token/refresh/` - Get new access token with refresh token
   - `POST /api/v1/auth/token/verify/` - Verify token validity
   - `POST /api/v1/auth/logout/` - Blacklist refresh token

4. **Custom JWT Authentication Class** (`CustomJWTAuthentication`):
   ```python
   class CustomJWTAuthentication(JWTAuthentication):
       def get_user(self, validated_token):
           user = super().get_user(validated_token)
           if not user.is_active:
               raise PermissionDenied("Account has been deactivated")
           return user
   ```
   - Extends simplejwt's `JWTAuthentication`
   - Enforces `is_active` check on every request (FR-005a)
   - Returns 403 Forbidden for inactive users

5. **Token Blacklisting**:
   - Refresh tokens are blacklisted on logout
   - Blacklisted tokens stored in `token_blacklist_blacklistedtoken` table
   - Prevents replay attacks with stolen refresh tokens

6. **Dual Authentication Support**:
   ```python
   REST_FRAMEWORK = {
       "DEFAULT_AUTHENTICATION_CLASSES": [
           "api.authentication.CustomJWTAuthentication",  # Primary
           "rest_framework.authentication.SessionAuthentication",  # Fallback
       ],
   }
   ```
   - JWT checked first, session authentication as fallback
   - Supports browser-based clients (Django admin, internal tools)
   - Enables gradual migration from session to JWT

7. **Token Configuration**:
   ```python
   SIMPLE_JWT = {
       "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),  # Short-lived
       "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Persistent sessions
       "ROTATE_REFRESH_TOKENS": True,  # New refresh on each refresh
       "BLACKLIST_AFTER_ROTATION": True,  # Invalidate old tokens
       "ALGORITHM": "HS256",  # Standard HMAC SHA-256
       "SIGNING_KEY": SECRET_KEY,  # Use Django's secret key
       "AUTH_HEADER_TYPES": ("Bearer",),  # Standard format
   }
   ```

## Consequences

### Positive

1. **Stateless Authentication**:
   - No server-side session storage required
   - Horizontal scaling without session affinity
   - Reduces database load (no session table queries)

2. **Security**:
   - Short-lived access tokens limit exposure window (15 minutes)
   - Refresh token rotation prevents token reuse
   - Token blacklisting enables immediate revocation
   - Inactive user enforcement on every request

3. **Developer Experience**:
   - Standard JWT format works with existing tools (Postman, curl, etc.)
   - Clear authentication flow (`obtain → use → refresh → logout`)
   - Compatible with OpenAPI/Swagger UI

4. **Mobile & Integration Friendly**:
   - No cookies required (works across domains)
   - Long-lived refresh tokens enable persistent sessions
   - Standard `Authorization: Bearer <token>` header

5. **Backward Compatibility**:
   - Session authentication still supported for browser clients
   - Django admin continues to work without changes
   - Gradual migration path from session-based auth

### Negative

1. **Token Size**:
   - JWTs are larger than session IDs (typically 200-300 bytes)
   - Every request includes full token in headers
   - Increased bandwidth usage (minimal impact for most applications)

2. **Token Revocation Complexity**:
   - Access tokens can't be revoked until expiry (15 minutes)
   - Requires blacklist table for refresh tokens
   - Immediate access revocation requires additional mechanisms (not implemented)

3. **Secret Key Management**:
   - JWT security depends on `SECRET_KEY` confidentiality
   - Key rotation requires re-issuing all tokens
   - Must use environment variables, never commit to version control

4. **Database Dependency for Blacklist**:
   - Token blacklist requires database queries
   - Logout and refresh operations hit database
   - Mitigated by short access token lifetime (most requests don't check blacklist)

5. **Clock Synchronization**:
   - Token expiration depends on server time
   - Clock skew between servers can cause issues
   - Requires NTP configuration in production

## Alternatives Considered

### 1. Session-Based Authentication Only

**Pros**:
- Simple Django built-in solution
- Immediate revocation via session deletion
- No token size overhead

**Cons**:
- Requires server-side session storage
- Horizontal scaling requires shared session backend (Redis)
- Not API-friendly (cookie-based, CSRF tokens)
- Poor mobile/integration support

**Verdict**: Rejected. Not suitable for modern API-first applications.

### 2. OAuth 2.0 with Third-Party Provider

**Pros**:
- Delegated authentication (Google, GitHub, etc.)
- No password management
- Standard protocol

**Cons**:
- Dependency on external service availability
- Complex implementation (authorization server, client management)
- Overkill for internal APIs
- Requires internet connectivity

**Verdict**: Rejected for initial implementation. May be added later for SSO.

### 3. API Keys

**Pros**:
- Simple implementation
- Long-lived credentials
- Easy to rotate per client

**Cons**:
- No expiration (security risk)
- No user context (all requests as single user)
- Can't distinguish between users
- No refresh mechanism

**Verdict**: Rejected. Insufficient for user-based authentication. May be added for service-to-service auth.

### 4. Token Rotation Without Blacklist

**Pros**:
- Simpler implementation (no database table)
- Reduced database load

**Cons**:
- Can't implement logout
- Stolen refresh tokens valid until expiry
- No way to revoke compromised credentials immediately

**Verdict**: Rejected. Security risk outweighs simplicity benefit.

## Implementation Notes

### Token Lifetime Rationale

- **15-minute access tokens**: Balance between security and usability
  - Short enough to limit exposure if stolen
  - Long enough to avoid excessive refresh requests
  - Mobile apps can refresh in background

- **7-day refresh tokens**: Enable "remember me" functionality
  - Users don't need to re-enter credentials daily
  - Rotation on each use limits window for replay attacks
  - Blacklisting enables explicit logout

### Inactive User Enforcement

Checking `user.is_active` on **every request** (not just login) ensures:
- Immediate effect when admin deactivates account
- No grace period for malicious users
- Compliance with security requirement FR-005a

Alternative of checking only at login would allow inactive users to continue using unexpired access tokens (up to 15 minutes).

### Blacklist Table Growth

The `token_blacklist_blacklistedtoken` table grows over time. Mitigation strategies:
1. Periodic cleanup of expired tokens (tokens older than `REFRESH_TOKEN_LIFETIME`)
2. Database index on `expires_at` for efficient queries
3. Consider TTL-based cleanup in production (cron job or Django management command)

## References

- [RFC 7519: JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [djangorestframework-simplejwt Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- Feature Spec: [B13 API Foundation & Standards](../../kitty-specs/013-api-foundation-standards/spec.md)
- Implementation: [WP02: JWT Authentication](../../kitty-specs/013-api-foundation-standards/tasks/done/WP02-jwt-authentication.md)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-29 | Core Team | Initial decision: JWT with simplejwt, 15min/7day lifetimes, blacklisting |
