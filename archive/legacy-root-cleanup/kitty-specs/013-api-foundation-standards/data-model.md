# Data Model: API Foundation & Standards

**Feature**: 013-api-foundation-standards
**Date**: 2025-11-29

## Overview

B13 introduces two primary entities for API infrastructure:

1. **API Token** (JWT) - Stateless authentication tokens
2. **Rate Limit Quota** (Ephemeral) - Per-user/IP request tracking

These entities integrate with existing B05 User model and support the B13 API authentication + rate limiting requirements.

---

## Entity: API Token (JWT)

### Purpose
Provides stateless authentication for API requests using JSON Web Tokens (JWT). Supports both access tokens (short-lived) and refresh tokens (long-lived), with optional blacklisting for revocation.

### Storage
Managed by `djangorestframework-simplejwt`:
- **Outstanding Tokens**: `token_blacklist_outstandingtoken` table
- **Blacklisted Tokens**: `token_blacklist_blacklistedtoken` table

### Attributes

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | BigInteger | Yes | Primary key | Auto-increment |
| `jti` | UUID | Yes | JWT ID (unique token identifier) | Indexed, unique |
| `token` | Text | Yes | Encoded JWT string | Max length ~500 chars |
| `user` | ForeignKey | Yes | Reference to User (B05) | ON DELETE CASCADE |
| `created_at` | DateTime | Yes | Token creation timestamp | Auto-set |
| `expires_at` | DateTime | Yes | Token expiration timestamp | Calculated based on token type |
| `token_type` | Choice | Yes | "access" or "refresh" | Enum: ["access", "refresh"] |

### JWT Payload Structure

```json
{
  "token_type": "access",
  "exp": 1732892400,        // Expiration (Unix timestamp)
  "iat": 1732891500,        // Issued at (Unix timestamp)
  "jti": "a1b2c3d4-...",    // JWT ID (matches Outstanding Token jti)
  "user_id": 123,           // User primary key
  "username": "john.doe"    // Optional: for debugging
}
```

### Relationships

```
User (B05) ─┬─< OutstandingToken (simplejwt)
            │
            └─< BlacklistedToken (simplejwt)
                  └─ links to OutstandingToken.jti
```

- **User → OutstandingToken**: One-to-Many (User can have multiple active tokens)
- **OutstandingToken → BlacklistedToken**: One-to-One (Token can be blacklisted once)

### Lifecycle

#### 1. Token Creation (Login)
```python
# POST /api/v1/auth/token/
# Request: {"username": "...", "password": "..."}
# Response:
{
  "status": "success",
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  # 15min lifetime
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."  # 7 day lifetime
  }
}
```

**Database Changes**:
- Create `OutstandingToken` for access token (jti, token, user, expires_at)
- Create `OutstandingToken` for refresh token (jti, token, user, expires_at)

#### 2. Token Refresh
```python
# POST /api/v1/auth/token/refresh/
# Request: {"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."}
# Response:
{
  "status": "success",
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  # New access token
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."  # New refresh token (if rotation enabled)
  }
}
```

**Database Changes** (with `ROTATE_REFRESH_TOKENS=True`):
- Blacklist old refresh token (create `BlacklistedToken` entry)
- Create new `OutstandingToken` for new access token
- Create new `OutstandingToken` for new refresh token

#### 3. Token Validation (API Request)
```python
# GET /api/v1/organisations/
# Headers: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

# Validation Steps:
1. Decode JWT (verify signature using SECRET_KEY)
2. Check expiration (exp claim)
3. Check blacklist (query BlacklistedToken by jti)
4. Load user (User.objects.get(id=user_id))
5. Check user.is_active (403 if False)
```

**Database Queries**:
- Blacklist check: `SELECT 1 FROM token_blacklist_blacklistedtoken WHERE token_id = (SELECT id FROM token_blacklist_outstandingtoken WHERE jti = ?)`
- User lookup: `SELECT * FROM accounts_user WHERE id = ?`

#### 4. Token Revocation (Logout)
```python
# POST /api/v1/auth/logout/
# Request: {"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."}
# Response: {"status": "success", "data": null}
```

**Database Changes**:
- Create `BlacklistedToken` for provided refresh token
- Optional: Blacklist all user's outstanding tokens (global logout)

#### 5. Token Cleanup (Periodic Task)
```python
# Celery task or management command
# Remove expired blacklisted tokens (no longer needed after expiration)

BlacklistedToken.objects.filter(
    token__expires_at__lt=now()
).delete()
```

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_outstanding_token_jti` | `jti` | Fast JWT validation (blacklist check) |
| `idx_outstanding_token_user` | `user_id` | Lookup user's active tokens |
| `idx_outstanding_token_expires` | `expires_at` | Cleanup expired tokens |
| `idx_blacklisted_token_jti` | `token_id` (FK to OutstandingToken) | Fast blacklist check |

### Security Considerations

1. **Secret Management**: JWT signed using Django `SECRET_KEY` - must be kept secure and rotated periodically
2. **Token Lifetime**: Short access token lifetime (15min) limits window for stolen token abuse
3. **Refresh Token Rotation**: Mitigates refresh token theft (one-time use per refresh)
4. **Blacklist Growth**: Requires periodic cleanup of expired tokens to prevent unbounded growth
5. **User Deactivation**: JWT validation checks `user.is_active` (immediate access revocation)

### Edge Cases

- **Expired Token**: Returns 401 with `{"status": "error", "error": {"code": "token_expired", ...}}`
- **Blacklisted Token**: Returns 401 with `{"status": "error", "error": {"code": "token_blacklisted", ...}}`
- **Inactive User**: Returns 403 with `{"status": "error", "error": {"code": "user_inactive", ...}}`
- **Invalid Signature**: Returns 401 with `{"status": "error", "error": {"code": "invalid_token", ...}}`

---

## Entity: Rate Limit Quota (Ephemeral)

### Purpose
Tracks API request counts per user (authenticated) or IP address (anonymous) within rolling time windows. Enforces rate limits defined in B13 specification (100/min authenticated, 10/min anonymous).

### Storage
Stored in **Redis** (existing B06 infrastructure) as ephemeral key-value pairs with TTL.

### Key Patterns

```
# Authenticated user rate limit
throttle:auth:{user_id}       → "47"  # Request count
  TTL: 60 seconds              # Window duration

# Anonymous IP rate limit
throttle:anon:{ip_address}    → "8"   # Request count
  TTL: 60 seconds
```

### Attributes (Redis Value)

| Field | Type | Description |
|-------|------|-------------|
| Key | String | Composite key (scope:type:identifier) |
| Value | Integer | Request count in current window |
| TTL | Integer | Time-to-live in seconds (window duration) |

### Lifecycle

#### 1. First Request in Window
```python
# GET /api/v1/organisations/
# User ID: 123
# Current count: None (key doesn't exist)

redis.set("throttle:auth:123", 1, ex=60)
# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1732892460
```

#### 2. Subsequent Requests
```python
# GET /api/v1/projects/
# User ID: 123
# Current count: 47

redis.incr("throttle:auth:123")  # Increment to 48
# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 52
# X-RateLimit-Reset: 1732892460
```

#### 3. Rate Limit Exceeded
```python
# GET /api/v1/users/
# User ID: 123
# Current count: 100 (limit reached)

# Response: 429 Too Many Requests
{
  "status": "error",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Request limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retry_after": 23  # Seconds until window resets
    }
  }
}

# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1732892460
# Retry-After: 23
```

#### 4. Window Expiration
```python
# After 60 seconds, Redis key expires automatically
# Next request creates new window with count = 1
```

### Rate Limit Configuration

| User Type | Identifier | Rate Limit | Window | Throttle Class |
|-----------|------------|------------|--------|----------------|
| Authenticated | `user.id` | 100 requests | 1 minute | `AuthenticatedUserThrottle` |
| Anonymous | IP address | 10 requests | 1 minute | `AnonymousUserThrottle` |

### Relationships

```
User (B05) ─ (ephemeral) ─ Redis Key (throttle:auth:{user_id})
                            └─ Value: request count
                            └─ TTL: 60 seconds

Request IP ─ (ephemeral) ─ Redis Key (throttle:anon:{ip})
                            └─ Value: request count
                            └─ TTL: 60 seconds
```

**No Database Storage**: Rate limit state is ephemeral and not persisted to PostgreSQL.

### Redis Operations

```python
# Check and increment
current = redis.get(f"throttle:auth:{user_id}")
if current is None:
    redis.set(f"throttle:auth:{user_id}", 1, ex=60)
    current = 1
elif int(current) >= 100:
    raise Throttled("Rate limit exceeded")
else:
    current = redis.incr(f"throttle:auth:{user_id}")

# Calculate TTL for reset time
ttl = redis.ttl(f"throttle:auth:{user_id}")
reset_time = int(time.time()) + ttl
```

### Edge Cases

- **Redis Unavailable**: DRF throttle fails open (allows requests) to prevent Redis outage from blocking API
- **Shared IP (NAT)**: Multiple users behind same IP count against anonymous limit (10/min) - mitigated by requiring authentication
- **Distributed Rate Limiting**: Redis handles atomic increments; works across multiple Django app servers
- **Clock Skew**: Uses Redis server time (SET with EX) to avoid client clock issues

### Performance Considerations

- **Redis Latency**: Typical `GET`/`INCR` operations < 1ms
- **Cache Miss**: First request in window requires `SET` (negligible overhead)
- **Atomic Operations**: `INCR` is atomic (no race conditions in concurrent requests)
- **Memory Usage**: Each key ~50 bytes; 1M active users = ~50MB Redis memory

---

## Entity Relationships Diagram

```
┌─────────────────┐
│ User (B05)      │
│ ─────────────── │
│ id: int (PK)    │
│ username        │
│ is_active       │
└───────┬─────────┘
        │
        │ 1:N
        ▼
┌──────────────────────────┐
│ OutstandingToken         │
│ (simplejwt)              │
│ ──────────────────────── │
│ id: int (PK)             │
│ jti: UUID (unique)       │
│ token: Text              │
│ user_id: FK → User       │
│ created_at: DateTime     │
│ expires_at: DateTime     │
│ token_type: Choice       │
└───────┬──────────────────┘
        │
        │ 1:1 (optional)
        ▼
┌──────────────────────────┐
│ BlacklistedToken         │
│ (simplejwt)              │
│ ──────────────────────── │
│ id: int (PK)             │
│ token_id: FK → OutToken  │
│ blacklisted_at: DateTime │
└──────────────────────────┘

[User] ─(ephemeral)─> Redis: throttle:auth:{user_id} → count (TTL 60s)
[Request IP] ─(ephemeral)─> Redis: throttle:anon:{ip} → count (TTL 60s)
```

---

## Database Migrations

### Migration 1: Install simplejwt Tables

```python
# Auto-generated by simplejwt when added to INSTALLED_APPS
# Creates:
# - token_blacklist_outstandingtoken
# - token_blacklist_blacklistedtoken
```

**Estimated Size**:
- 10,000 active users × 2 tokens each = 20,000 rows (~5MB)
- Blacklist grows over time (periodic cleanup recommended)

### Migration 2: Indexes (if not auto-created)

```python
# Ensure indexes exist for performance
operations = [
    migrations.AddIndex(
        model_name="outstandingtoken",
        index=models.Index(fields=["jti"], name="idx_outstanding_jti"),
    ),
    migrations.AddIndex(
        model_name="outstandingtoken",
        index=models.Index(fields=["user_id"], name="idx_outstanding_user"),
    ),
]
```

---

## Testing Data Model

### Unit Tests

1. **Token Creation**: Verify OutstandingToken created on login
2. **Token Refresh**: Verify old token blacklisted, new tokens created
3. **Token Blacklist**: Verify blacklisted tokens rejected
4. **Token Expiration**: Verify expired tokens rejected
5. **User Deactivation**: Verify inactive user tokens rejected (403)

### Integration Tests

1. **Rate Limit Enforcement**: Verify Redis keys created/incremented correctly
2. **Rate Limit Reset**: Verify counters reset after window expiration
3. **Concurrent Requests**: Verify atomic Redis operations (no race conditions)
4. **Cross-Server Rate Limiting**: Verify rate limits enforced across multiple app instances

### Performance Tests

1. **Token Validation**: < 10ms with Redis blacklist check
2. **Rate Limit Check**: < 1ms Redis GET/INCR
3. **Blacklist Growth**: Monitor database size over time
4. **Redis Memory Usage**: Monitor key count and memory consumption

---

## Monitoring & Observability

### Metrics (django-prometheus)

```python
# Token metrics
jwt_token_issued_total{token_type="access|refresh"}
jwt_token_validated_total{status="success|blacklisted|expired"}
jwt_token_blacklisted_total{reason="logout|rotation"}

# Rate limiting metrics
api_rate_limit_exceeded_total{user_type="authenticated|anonymous"}
api_rate_limit_redis_errors_total
```

### Audit Logging (B09 Integration)

```python
# Log API authentication events
AuditEvent.objects.create(
    event_type="api.auth.token_issued",
    user=user,
    metadata={"token_type": "access", "jti": "..."}
)

AuditEvent.objects.create(
    event_type="api.rate_limit.exceeded",
    user=user or None,
    metadata={"limit": 100, "window": "1m", "ip": "..."}
)
```

---

## Security & Compliance

### GDPR Considerations

- **Token Storage**: Tokens contain user_id (personal data) - must be included in data export requests
- **Blacklist Retention**: Expired blacklist entries should be cleaned up (no need to retain after expiration)
- **Rate Limit Data**: Redis keys are ephemeral (TTL 60s) - no long-term storage of IP addresses

### PCI-DSS (if applicable)

- **Token Transport**: HTTPS required for token transmission
- **Token Storage**: Tokens in database encrypted at rest (database-level encryption)
- **Rate Limiting**: Helps mitigate brute-force attacks on API endpoints

---

## Future Enhancements

1. **Per-Endpoint Rate Limits**: Support different limits for resource-intensive endpoints
2. **Rate Limit Tiers**: Support higher limits for premium users
3. **Token Introspection**: Endpoint to check token validity without side effects
4. **OAuth2 Integration**: Replace simplejwt with full OAuth2 provider (if needed for third-party integrations)
5. **Geographic Rate Limiting**: Different limits per region/country
6. **Adaptive Rate Limiting**: Dynamic limits based on system load
