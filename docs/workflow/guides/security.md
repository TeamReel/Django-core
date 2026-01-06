# Security Guide

This guide covers security best practices and compliance for the Django Core-App.

## Quick Links

| Resource | Description |
|----------|-------------|
| [Security Model](../architecture/security-model.md) | Authentication, authorization, audit |
| [Security Checklist](../security-checklist.md) | OWASP ASVS Level 1 compliance |
| [API Authentication](api-authentication.md) | JWT token usage |
| [Webhook Verification](../webhook-signature-verification.md) | HMAC signature verification |

## Security Features

### Authentication

The platform uses JWT (JSON Web Tokens) for API authentication:

- **Access tokens**: Short-lived (15 minutes default)
- **Refresh tokens**: Long-lived (7 days default)
- **Token rotation**: Refresh tokens rotated on use

See [API Authentication Guide](api-authentication.md) for implementation details.

### Authorization (RBAC)

Role-based access control with hierarchical scopes:

```
Platform (system-wide)
└── Organisation (tenant)
    └── Project (workspace)
```

See [Permissions Module](../modules/permissions.md) for RBAC implementation.

### Security Headers

The platform enforces security headers in production:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Content-Security-Policy` | Configured per-app | Content restrictions |

### Rate Limiting

API rate limiting protects against abuse:

| Category | Limit | Window |
|----------|-------|--------|
| Authenticated | 1000 | 1 hour |
| Anonymous | 100 | 1 hour |
| Auth endpoints | 5 | 1 minute |

See [Rate Limiting Guide](rate-limiting.md) for handling rate limits.

### Audit Logging

All security-relevant actions are logged:

- Authentication events (login, logout, failed attempts)
- Authorization decisions (access granted, denied)
- Data modifications (create, update, delete)
- Configuration changes

See [Audit Module](../modules/audit.md) for audit event details.

## Security Checklist

### Pre-Production Checklist

Before deploying to production:

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` is unique and at least 50 characters
- [ ] `ALLOWED_HOSTS` is configured (no wildcards)
- [ ] HTTPS is enforced (`SECURE_SSL_REDIRECT = True`)
- [ ] Security headers are enabled
- [ ] Database uses SSL/TLS
- [ ] Redis uses authentication
- [ ] Password validators are configured
- [ ] Rate limiting is enabled
- [ ] Audit logging is enabled

### Verify Settings

```bash
# Run Django deployment checks
python manage.py check --deploy

# Run security baseline validation
python manage.py security_check
```

### OWASP ASVS Compliance

The platform implements OWASP ASVS Level 1 controls:

| Category | Controls | Status |
|----------|----------|--------|
| V1 - Architecture | 3 | ✅ |
| V2 - Authentication | 4 | ✅ |
| V3 - Session Management | 3 | ✅ |
| V5 - Validation | 2 | ✅ |
| V8 - Data Protection | 4 | ✅ |
| V10 - Malicious Code | 2 | ✅ |
| V11 - Business Logic | 1 | ✅ |
| V14 - Configuration | 7 | ✅ |

See [Security Checklist](../security-checklist.md) for detailed compliance documentation.

## Common Security Patterns

### Secure API Requests

```python
import requests

# Always use HTTPS
BASE_URL = 'https://api.example.com'

# Include auth header
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Use timeouts
response = requests.get(
    f'{BASE_URL}/api/v1/users/me/',
    headers=headers,
    timeout=30
)
```

### Webhook Signature Verification

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    """Verify webhook HMAC-SHA256 signature."""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(f'sha256={expected}', signature)
```

See [Webhook Verification](../webhook-signature-verification.md) for complete implementation.

### Secure Password Handling

Never log or store passwords in plain text:

```python
# Bad - logs password
logger.info(f"User {email} attempted login with password {password}")

# Good - redact sensitive data
logger.info(f"User {email} attempted login")
```

## Security Incident Response

### If You Suspect a Breach

1. **Document** the incident with timestamps
2. **Isolate** affected systems if needed
3. **Notify** security team immediately
4. **Preserve** logs and evidence
5. **Follow** incident response procedures

### Reporting Vulnerabilities

Report security vulnerabilities responsibly:

1. Email security team (do not open public issues)
2. Include reproduction steps
3. Allow time for fix before disclosure

## Related Documentation

- [Security Model](../architecture/security-model.md) - Detailed architecture
- [Security Checklist](../security-checklist.md) - ASVS compliance
- [API Authentication](api-authentication.md) - JWT guide
- [Audit Module](../modules/audit.md) - Audit logging
