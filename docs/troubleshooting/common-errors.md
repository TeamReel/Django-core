# Common Errors

This guide covers common errors you may encounter and how to resolve them.

## Authentication Errors

### 401 Unauthorized

**Cause**: Missing, expired, or invalid access token.

```json
{
  "type": "authentication_error",
  "code": "not_authenticated",
  "message": "Authentication credentials were not provided."
}
```

**Solutions**:

1. **Missing token**: Add the Authorization header:
   ```python
   headers = {'Authorization': f'Bearer {access_token}'}
   ```

2. **Expired token**: Refresh your access token:
   ```python
   response = requests.post(
       '/api/v1/auth/token/refresh/',
       json={'refresh': refresh_token}
   )
   access_token = response.json()['access']
   ```

3. **Invalid token**: Re-authenticate:
   ```python
   response = requests.post(
       '/api/v1/auth/token/',
       json={'email': email, 'password': password}
   )
   ```

### 403 Forbidden

**Cause**: Token is valid but user lacks permission.

```json
{
  "type": "permission_denied",
  "code": "permission_denied",
  "message": "You do not have permission to perform this action."
}
```

**Solutions**:

1. Check required permissions for the endpoint
2. Verify user's role in the organisation/project
3. Ensure the resource belongs to an accessible scope

### Token Expired vs Invalid

| Error | HTTP Status | `code` Value | Action |
|-------|-------------|--------------|--------|
| Token expired | 401 | `token_expired` | Refresh token |
| Token invalid | 401 | `token_not_valid` | Re-authenticate |
| Token revoked | 401 | `token_revoked` | Re-authenticate |

## Validation Errors

### 400 Bad Request

**Cause**: Invalid request data.

```json
{
  "type": "validation_error",
  "code": "invalid",
  "message": "Invalid input.",
  "details": {
    "email": ["Enter a valid email address."],
    "name": ["This field is required."]
  }
}
```

**Solutions**:

1. **Check field requirements**: Review the `details` object
2. **Validate data types**: Ensure correct types (string, number, etc.)
3. **Check field constraints**: Length limits, format patterns

### Common Validation Issues

| Field | Error | Cause | Solution |
|-------|-------|-------|----------|
| `email` | "Enter a valid email address" | Invalid format | Use valid email format |
| `password` | "This password is too common" | Weak password | Use stronger password |
| `slug` | "This field must be unique" | Duplicate | Use unique slug |
| `*` | "This field is required" | Missing field | Include required field |
| `*` | "This field may not be blank" | Empty string | Provide value |

## Rate Limiting

### 429 Too Many Requests

**Cause**: Rate limit exceeded.

```json
{
  "type": "throttled",
  "code": "rate_limit_exceeded",
  "message": "Request was throttled. Expected available in 60 seconds."
}
```

**Solutions**:

1. **Wait and retry**:
   ```python
   if response.status_code == 429:
       retry_after = int(response.headers.get('Retry-After', 60))
       time.sleep(retry_after)
   ```

2. **Implement exponential backoff**:
   ```python
   delay = min(base * (2 ** attempt), max_delay)
   time.sleep(delay)
   ```

3. **Cache responses** to reduce API calls
4. **Use bulk endpoints** when available

See [Rate Limiting Guide](../guides/rate-limiting.md) for details.

## Resource Errors

### 404 Not Found

**Cause**: Resource doesn't exist or user can't access it.

```json
{
  "type": "not_found",
  "code": "not_found",
  "message": "Not found."
}
```

**Common Causes**:

1. **Wrong ID**: Verify the resource ID
2. **Wrong scope**: Check organisation/project context
3. **Deleted resource**: Resource may have been removed
4. **No permission**: 404 is returned for inaccessible resources (security)

**Debugging**:

```python
# Check if resource exists in correct scope
response = requests.get(
    f'/api/v1/organisations/{org_id}/projects/',
    headers=headers
)
project_ids = [p['id'] for p in response.json()['results']]
print(f"Available projects: {project_ids}")
```

### 409 Conflict

**Cause**: Resource state conflict.

```json
{
  "type": "conflict",
  "code": "conflict",
  "message": "Cannot delete organisation with active projects."
}
```

**Common Scenarios**:

| Context | Error | Resolution |
|---------|-------|------------|
| Delete org | "active projects" | Archive/delete projects first |
| Delete project | "active members" | Remove members first |
| Update archived | "resource archived" | Unarchive first |
| Concurrent edit | "resource modified" | Refresh and retry |

## Server Errors

### 500 Internal Server Error

**Cause**: Unexpected server error.

```json
{
  "type": "server_error",
  "code": "error",
  "message": "A server error occurred.",
  "trace_id": "abc123"
}
```

**Actions**:

1. **Note the trace_id** for support
2. **Retry with exponential backoff**
3. **Check service status** page
4. **Contact support** if persistent

### 502/503/504 Gateway Errors

**Cause**: Infrastructure issues.

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| 502 | Bad Gateway | Backend server error |
| 503 | Service Unavailable | Maintenance/overload |
| 504 | Gateway Timeout | Request took too long |

**Actions**:

1. Wait and retry
2. Check status page
3. Reduce request complexity (smaller payloads, simpler queries)

## Database Errors

### Unique Constraint Violation

```json
{
  "type": "validation_error",
  "code": "unique",
  "message": "Invalid input.",
  "details": {
    "slug": ["organisation with this slug already exists."]
  }
}
```

**Resolution**: Use a different value for the unique field.

### Foreign Key Violation

```json
{
  "type": "validation_error",
  "code": "does_not_exist",
  "message": "Invalid input.",
  "details": {
    "organisation": ["Invalid pk \"invalid-id\" - object does not exist."]
  }
}
```

**Resolution**: Verify the referenced object exists.

## Error Response Format

All errors follow a consistent format:

```json
{
  "type": "error_type",
  "code": "error_code",
  "message": "Human-readable message",
  "details": { },
  "trace_id": "optional-trace-id"
}
```

| Field | Description |
|-------|-------------|
| `type` | Error category |
| `code` | Machine-readable error code |
| `message` | Human-readable description |
| `details` | Field-specific errors (validation) |
| `trace_id` | Support reference (server errors) |

## Error Handling Best Practices

### Python Example

```python
import requests

class APIError(Exception):
    def __init__(self, status, type, code, message, details=None):
        self.status = status
        self.type = type
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)

def handle_response(response):
    if response.ok:
        return response.json()

    try:
        error = response.json()
    except ValueError:
        error = {'message': response.text}

    raise APIError(
        status=response.status_code,
        type=error.get('type', 'unknown'),
        code=error.get('code', 'error'),
        message=error.get('message', 'Unknown error'),
        details=error.get('details')
    )
```

### JavaScript Example

```javascript
class APIError extends Error {
  constructor(status, type, code, message, details = {}) {
    super(message);
    this.status = status;
    this.type = type;
    this.code = code;
    this.details = details;
  }
}

async function handleResponse(response) {
  if (response.ok) {
    return response.json();
  }

  const error = await response.json().catch(() => ({}));

  throw new APIError(
    response.status,
    error.type || 'unknown',
    error.code || 'error',
    error.message || 'Unknown error',
    error.details
  );
}
```

## Related Documentation

- [API Authentication](../guides/api-authentication.md) - Token handling
- [Rate Limiting](../guides/rate-limiting.md) - Rate limit details
- [Debugging](debugging.md) - Debug techniques
- [Performance](performance.md) - Performance issues
