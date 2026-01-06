# Troubleshooting

Guides for diagnosing and resolving common issues with the Django Core-App API.

## Quick Links

| Issue | Guide |
|-------|-------|
| API errors (4xx, 5xx) | [Common Errors](common-errors.md) |
| Auth/permission issues | [Common Errors - Authentication](common-errors.md#authentication-errors) |
| Rate limiting | [Common Errors - Rate Limiting](common-errors.md#rate-limiting) |
| Request debugging | [Debugging](debugging.md) |
| Slow responses | [Performance](performance.md) |

## Common Issues

### Authentication

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token missing/expired | [Auth errors](common-errors.md#401-unauthorized) |
| 403 Forbidden | Insufficient permissions | [Permission errors](common-errors.md#403-forbidden) |
| Token refresh fails | Refresh token expired | Re-authenticate |

### API Requests

| Issue | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Invalid data | [Validation errors](common-errors.md#400-bad-request) |
| 404 Not Found | Wrong ID or scope | [Resource errors](common-errors.md#404-not-found) |
| 429 Too Many Requests | Rate limit exceeded | [Rate limiting](common-errors.md#429-too-many-requests) |
| 500 Server Error | Server bug | [Server errors](common-errors.md#500-internal-server-error) |

### Performance

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow responses | Large payloads | [Pagination](performance.md#issue-slow-list-endpoints) |
| Timeouts | Complex queries | [Optimization](performance.md#optimization-strategies) |
| High latency | No connection reuse | [Connection pooling](performance.md#1-connection-pooling) |

## Diagnostic Tools

### Check Token

```python
import requests

def check_token(token):
    """Verify token is valid."""
    response = requests.get(
        '/api/v1/auth/me/',
        headers={'Authorization': f'Bearer {token}'}
    )
    if response.ok:
        user = response.json()
        print(f"✓ Token valid for {user['email']}")
    else:
        print(f"✗ Token invalid: {response.json()['message']}")
```

### Check Permissions

```python
def check_permissions(token, org_id):
    """Check user permissions in organisation."""
    response = requests.get(
        f'/api/v1/organisations/{org_id}/members/me/',
        headers={'Authorization': f'Bearer {token}'}
    )
    if response.ok:
        member = response.json()
        print(f"Role: {member['role']['name']}")
        print(f"Permissions: {member['role']['permissions']}")
    else:
        print("Not a member of this organisation")
```

### Check Rate Limits

```python
def check_rate_limit(response):
    """Display rate limit status."""
    limit = response.headers.get('X-RateLimit-Limit')
    remaining = response.headers.get('X-RateLimit-Remaining')
    reset = response.headers.get('X-RateLimit-Reset')

    print(f"Limit: {limit}")
    print(f"Remaining: {remaining}")
    print(f"Reset at: {reset}")
```

## Getting Help

### Before Contacting Support

1. **Check documentation** - Review relevant guides
2. **Search errors** - Look up error codes
3. **Reproduce** - Confirm issue is consistent
4. **Isolate** - Determine if issue is API or client

### Information to Provide

When contacting support, include:

- **Request ID** - From `X-Request-ID` header
- **Trace ID** - From error response (if present)
- **Timestamp** - When error occurred
- **Environment** - Production/staging/development
- **Request details** - Method, URL, headers, body
- **Response** - Status, headers, body
- **Expected behavior** - What you expected
- **Steps to reproduce** - How to recreate the issue

### Example Support Request

```
Subject: 403 Forbidden when creating project

Request ID: abc123-def456
Timestamp: 2024-01-15T10:30:00Z
Environment: Production

Request:
  POST /api/v1/organisations/org-123/projects/
  Authorization: Bearer <redacted>
  Content-Type: application/json
  Body: {"name": "Test Project", "slug": "test-project"}

Response:
  403 Forbidden
  {"type": "permission_denied", "code": "permission_denied",
   "message": "You do not have permission to perform this action."}

Expected: Project should be created (user is org admin)

Steps to reproduce:
1. Log in as user@example.com
2. Navigate to org-123
3. Try to create a project
```

## Related Documentation

- [Developer Guides](../guides/index.md) - How-to guides
- [API Module](../modules/api.md) - API reference
- [Security Model](../architecture/security-model.md) - Auth/permissions
