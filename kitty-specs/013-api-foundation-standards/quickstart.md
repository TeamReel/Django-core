# Quick Start: API Foundation & Standards

**Feature**: 013-api-foundation-standards
**Last Updated**: 2025-11-29

This guide provides practical examples for using the B13 API Foundation features: JWT authentication, response envelopes, rate limiting, and pagination.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Envelopes](#response-envelopes)
3. [Rate Limiting](#rate-limiting)
4. [Pagination](#pagination)
5. [Error Handling](#error-handling)
6. [API Versioning](#api-versioning)

---

## Authentication

### 1. Obtain JWT Tokens (Login)

**Endpoint**: `POST /api/v1/auth/token/`

```bash
curl -X POST https://api.example.com/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "SecureP@ssw0rd"
  }'
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Token Lifetimes**:
- **Access Token**: 15 minutes (use for API requests)
- **Refresh Token**: 7 days (use to get new access tokens)

---

### 2. Use Access Token in API Requests

Include the access token in the `Authorization` header:

```bash
curl https://api.example.com/api/v1/organisations/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGci..."
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Acme Corp",
      "slug": "acme-corp"
    }
  ],
  "meta": {
    "pagination": {
      "count": 1,
      "next": null,
      "previous": null,
      "page_size": 20
    }
  }
}
```

---

### 3. Refresh Access Token

When the access token expires (after 15 minutes), use the refresh token:

```bash
curl -X POST https://api.example.com/api/v1/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGci..."
  }'
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGci...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGci..."
  }
}
```

**Note**: With token rotation enabled, the old refresh token is invalidated and a new one is issued.

---

### 4. Logout (Blacklist Refresh Token)

Revoke the refresh token to prevent further use:

```bash
curl -X POST https://api.example.com/api/v1/auth/logout/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1Qi..." \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1Qi..."
  }'
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": null
}
```

**Note**: The access token remains valid until it expires (max 15 minutes).

---

### Authentication Flow Diagram

```
┌─────────┐                      ┌─────────┐
│ Client  │                      │   API   │
└────┬────┘                      └────┬────┘
     │                                │
     │ POST /auth/token/              │
     │ {username, password}           │
     ├───────────────────────────────>│
     │                                │
     │ {access, refresh}              │
     │<───────────────────────────────┤
     │                                │
     │ GET /organisations/            │
     │ Authorization: Bearer <access> │
     ├───────────────────────────────>│
     │                                │
     │ {status: "success", data: ...} │
     │<───────────────────────────────┤
     │                                │
     │ (15 minutes later)             │
     │ POST /auth/token/refresh/      │
     │ {refresh}                      │
     ├───────────────────────────────>│
     │                                │
     │ {access, refresh}              │
     │<───────────────────────────────┤
     │                                │
     │ POST /auth/logout/             │
     │ {refresh}                      │
     ├───────────────────────────────>│
     │                                │
     │ {status: "success"}            │
     │<───────────────────────────────┤
     │                                │
```

---

## Response Envelopes

All API responses follow a consistent envelope format:

### Success Response

```json
{
  "status": "success",
  "data": <payload>,
  "meta": {
    "pagination": {...},
    "timestamp": "2025-11-29T12:00:00Z"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": {
      "name": ["This field is required."]
    }
  }
}
```

---

### Parsing Responses in Client Code

#### JavaScript

```javascript
async function fetchAPI(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json();

  if (body.status === 'success') {
    return body.data;  // Extract payload
  } else {
    throw new Error(body.error.message);
  }
}

// Usage
try {
  const organisations = await fetchAPI('https://api.example.com/api/v1/organisations/');
  console.log(organisations);  // Array of organisations
} catch (error) {
  console.error('API Error:', error.message);
}
```

#### Python

```python
import requests

def fetch_api(url, headers=None):
    response = requests.get(url, headers=headers or {})
    response.raise_for_status()

    body = response.json()

    if body['status'] == 'success':
        return body['data']
    else:
        error = body['error']
        raise Exception(f"{error['code']}: {error['message']}")

# Usage
try:
    organisations = fetch_api(
        'https://api.example.com/api/v1/organisations/',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    print(organisations)
except Exception as e:
    print(f"API Error: {e}")
```

---

## Rate Limiting

### Rate Limit Quotas

- **Authenticated Users**: 100 requests per minute (per user)
- **Anonymous Users**: 10 requests per minute (per IP address)

### Inspecting Rate Limit Status

All responses include rate limit headers:

```bash
curl -i https://api.example.com/api/v1/organisations/ \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response Headers**:
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1732892460
```

**Interpretation**:
- `X-RateLimit-Limit`: Total quota (100 requests/minute)
- `X-RateLimit-Remaining`: Requests left in current window (73)
- `X-RateLimit-Reset`: Unix timestamp when quota resets

---

### Handling Rate Limit Exceeded (429)

When quota is exhausted:

```bash
curl -i https://api.example.com/api/v1/organisations/ \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response** (429 Too Many Requests):
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1732892460
Retry-After: 23

{
  "status": "error",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Request limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retry_after": 23
    }
  }
}
```

**Client Implementation** (Python):
```python
import time
import requests

def fetch_with_retry(url, headers):
    while True:
        response = requests.get(url, headers=headers)

        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            continue

        response.raise_for_status()
        return response.json()['data']

# Usage
organisations = fetch_with_retry(
    'https://api.example.com/api/v1/organisations/',
    headers={'Authorization': f'Bearer {access_token}'}
)
```

---

## Pagination

All list endpoints support pagination with consistent parameters.

### Default Pagination

By default, API returns 20 items per page:

```bash
curl https://api.example.com/api/v1/projects/ \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response**:
```json
{
  "status": "success",
  "data": [
    {"id": 1, "name": "Project Alpha"},
    {"id": 2, "name": "Project Beta"},
    ...
  ],
  "meta": {
    "pagination": {
      "count": 42,
      "next": "https://api.example.com/api/v1/projects/?page=2",
      "previous": null,
      "page_size": 20
    }
  }
}
```

---

### Custom Page Size

Request up to 100 items per page:

```bash
curl "https://api.example.com/api/v1/projects/?page_size=50" \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response**:
```json
{
  "status": "success",
  "data": [...],
  "meta": {
    "pagination": {
      "count": 42,
      "next": null,
      "previous": null,
      "page_size": 50
    }
  }
}
```

---

### Navigating Pages

Use the `page` parameter:

```bash
# Page 1 (default)
curl "https://api.example.com/api/v1/projects/" \
  -H "Authorization: Bearer eyJ0eXAi..."

# Page 2
curl "https://api.example.com/api/v1/projects/?page=2" \
  -H "Authorization: Bearer eyJ0eXAi..."

# Page 3 with custom page size
curl "https://api.example.com/api/v1/projects/?page=3&page_size=50" \
  -H "Authorization: Bearer eyJ0eXAi..."
```

---

### Pagination Client Example (Python)

```python
def fetch_all_pages(url, headers):
    all_items = []

    while url:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        body = response.json()
        all_items.extend(body['data'])

        # Get next page URL from meta.pagination.next
        url = body.get('meta', {}).get('pagination', {}).get('next')

    return all_items

# Usage
all_projects = fetch_all_pages(
    'https://api.example.com/api/v1/projects/',
    headers={'Authorization': f'Bearer {access_token}'}
)
print(f"Total projects: {len(all_projects)}")
```

---

## Error Handling

### Error Response Format

All errors follow consistent envelope structure:

```json
{
  "status": "error",
  "error": {
    "code": "<machine_readable_code>",
    "message": "<human_readable_message>",
    "details": {...}
  }
}
```

---

### Common Error Codes

#### 400 Bad Request - Validation Error

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": {
      "name": ["This field is required."],
      "email": ["Enter a valid email address."]
    }
  }
}
```

#### 401 Unauthorized - Authentication Failed

```json
{
  "status": "error",
  "error": {
    "code": "authentication_failed",
    "message": "Invalid credentials provided"
  }
}
```

#### 401 Unauthorized - Token Expired

```json
{
  "status": "error",
  "error": {
    "code": "token_expired",
    "message": "Access token has expired. Please refresh."
  }
}
```

**Client Action**: Refresh token using `/auth/token/refresh/`

#### 403 Forbidden - Permission Denied

```json
{
  "status": "error",
  "error": {
    "code": "permission_denied",
    "message": "You do not have permission to perform this action."
  }
}
```

#### 403 Forbidden - User Inactive

```json
{
  "status": "error",
  "error": {
    "code": "user_inactive",
    "message": "Your account is inactive. Please contact support."
  }
}
```

#### 404 Not Found

```json
{
  "status": "error",
  "error": {
    "code": "not_found",
    "message": "The requested resource was not found."
  }
}
```

#### 429 Too Many Requests

```json
{
  "status": "error",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Request limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retry_after": 23
    }
  }
}
```

**Client Action**: Wait `retry_after` seconds before retrying

#### 500 Internal Server Error

```json
{
  "status": "error",
  "error": {
    "code": "server_error",
    "message": "An unexpected error occurred. Please try again later.",
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**Note**: `error.id` can be provided to support for debugging

---

### Error Handling Client (JavaScript)

```javascript
class APIError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function fetchAPI(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json();

  if (body.status === 'success') {
    return body.data;
  } else {
    const { code, message, details } = body.error;
    throw new APIError(code, message, details);
  }
}

// Usage with error handling
try {
  const org = await fetchAPI('https://api.example.com/api/v1/organisations/123/');
  console.log(org);
} catch (error) {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'token_expired':
        // Refresh token and retry
        await refreshAccessToken();
        return fetchAPI(url, options);

      case 'permission_denied':
        // Show permission error to user
        alert('You do not have permission to view this resource.');
        break;

      case 'not_found':
        // Handle 404
        console.warn('Resource not found');
        break;

      case 'validation_error':
        // Show field-level errors
        console.error('Validation errors:', error.details);
        break;

      default:
        console.error('API Error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## API Versioning

### URL Structure

All API endpoints are versioned under `/api/v1/`:

```
https://api.example.com/api/v1/users/
https://api.example.com/api/v1/organisations/
https://api.example.com/api/v1/projects/
https://api.example.com/api/v1/auth/token/
```

### Version Discovery

```bash
curl https://api.example.com/api/v1/
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "version": "1.0.0",
    "endpoints": {
      "users": "/api/v1/users/",
      "organisations": "/api/v1/organisations/",
      "projects": "/api/v1/projects/",
      "auth": "/api/v1/auth/"
    }
  }
}
```

### Deprecation Policy

- **Notice Period**: 6 months for breaking changes
- **Deprecation Header**: `Deprecation: true` + `Sunset: <date>`
- **Migration Path**: New version available before old version sunset

**Example Deprecated Endpoint**:
```
HTTP/1.1 200 OK
Deprecation: true
Sunset: Fri, 30 Jun 2026 23:59:59 GMT
Link: </api/v2/organisations/>; rel="successor-version"

{
  "status": "success",
  "data": [...]
}
```

---

## Complete Example: CRUD Operations

### Create Organisation

```bash
curl -X POST https://api.example.com/api/v1/organisations/ \
  -H "Authorization: Bearer eyJ0eXAi..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Org",
    "slug": "new-org"
  }'
```

**Response** (201 Created):
```json
{
  "status": "success",
  "data": {
    "id": 42,
    "name": "New Org",
    "slug": "new-org",
    "created_at": "2025-11-29T12:00:00Z"
  }
}
```

---

### Retrieve Organisation

```bash
curl https://api.example.com/api/v1/organisations/42/ \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": 42,
    "name": "New Org",
    "slug": "new-org",
    "created_at": "2025-11-29T12:00:00Z"
  }
}
```

---

### Update Organisation

```bash
curl -X PATCH https://api.example.com/api/v1/organisations/42/ \
  -H "Authorization: Bearer eyJ0eXAi..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Org Name"
  }'
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": 42,
    "name": "Updated Org Name",
    "slug": "new-org",
    "created_at": "2025-11-29T12:00:00Z"
  }
}
```

---

### Delete Organisation

```bash
curl -X DELETE https://api.example.com/api/v1/organisations/42/ \
  -H "Authorization: Bearer eyJ0eXAi..."
```

**Response** (204 No Content):
```
HTTP/1.1 204 No Content
```

**Note**: Successful deletion returns no body (status only)

---

## Testing with Postman

### Environment Variables

```json
{
  "api_base_url": "https://api.example.com",
  "access_token": "",
  "refresh_token": ""
}
```

### Pre-Request Script (Auto-Refresh Token)

```javascript
const refreshToken = pm.environment.get('refresh_token');

if (refreshToken) {
  pm.sendRequest({
    url: pm.environment.get('api_base_url') + '/api/v1/auth/token/refresh/',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    body: {
      mode: 'raw',
      raw: JSON.stringify({ refresh: refreshToken })
    }
  }, (err, res) => {
    if (!err && res.json().status === 'success') {
      const data = res.json().data;
      pm.environment.set('access_token', data.access);
      if (data.refresh) {
        pm.environment.set('refresh_token', data.refresh);
      }
    }
  });
}
```

---

## OpenAPI Documentation

Interactive API documentation available at:

```
https://api.example.com/api/docs/
```

**Features**:
- Try out endpoints directly in browser
- Automatic request/response examples
- JWT authentication support (lock icon)
- OpenAPI 3.0 schema download

---

## Next Steps

- **Product-Specific APIs**: Extend base classes (`BaseAPIViewSet`, `BaseSerializer`) for custom endpoints
- **Testing**: Use envelope format in API tests (`response.json()['data']`)
- **Monitoring**: Track rate limit metrics via Prometheus
- **Security**: Review B03 security baseline for HTTPS, CORS, CSRF requirements
