# API Authentication Guide

This guide covers authentication methods for the Django Core-App API.

## Overview

The API uses JWT (JSON Web Tokens) for authentication. Clients authenticate once to receive tokens, then include the access token in subsequent requests.

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth

    Client->>API: POST /api/v1/auth/login
    API->>Auth: Validate credentials
    Auth-->>API: User verified
    API-->>Client: {access_token, refresh_token}

    Note over Client: Store tokens securely

    Client->>API: GET /api/v1/resource
    Note right of Client: Authorization: Bearer {access_token}
    API-->>Client: Resource data
```

## Obtaining Tokens

### Login

```bash
curl -X POST https://api.example.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

**Response**:
```json
{
  "access": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Token Lifetimes

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 15 minutes | API requests |
| Refresh Token | 7 days | Obtain new access tokens |

## Using Access Tokens

Include the access token in the `Authorization` header:

```bash
curl https://api.example.com/api/v1/users/me/ \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Python Example

```python
import requests

# Login and get tokens
response = requests.post(
    'https://api.example.com/api/v1/auth/login/',
    json={'email': 'user@example.com', 'password': 'password'}
)
tokens = response.json()

# Use access token for requests
headers = {'Authorization': f'Bearer {tokens["access"]}'}
me = requests.get(
    'https://api.example.com/api/v1/users/me/',
    headers=headers
)
print(me.json())
```

### JavaScript Example

```javascript
// Login
const loginResponse = await fetch('/api/v1/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const tokens = await loginResponse.json();

// Use access token
const response = await fetch('/api/v1/users/me/', {
  headers: { 'Authorization': `Bearer ${tokens.access}` }
});
const user = await response.json();
```

## Refreshing Tokens

When the access token expires, use the refresh token to get a new one:

```bash
curl -X POST https://api.example.com/api/v1/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response**:
```json
{
  "access": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Auto-Refresh Pattern

```python
import requests
from datetime import datetime, timedelta

class APIClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.token_expires = None

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/login/',
            json={'email': email, 'password': password}
        )
        tokens = response.json()
        self.access_token = tokens['access']
        self.refresh_token = tokens['refresh']
        self.token_expires = datetime.now() + timedelta(minutes=14)

    def refresh(self):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/token/refresh/',
            json={'refresh': self.refresh_token}
        )
        self.access_token = response.json()['access']
        self.token_expires = datetime.now() + timedelta(minutes=14)

    def request(self, method, path, **kwargs):
        # Auto-refresh if token expiring soon
        if self.token_expires and datetime.now() > self.token_expires:
            self.refresh()

        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'

        return requests.request(
            method,
            f'{self.base_url}{path}',
            headers=headers,
            **kwargs
        )
```

## Logout

Invalidate the refresh token:

```bash
curl -X POST https://api.example.com/api/v1/auth/logout/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"refresh": "{refresh_token}"}'
```

## Error Handling

### Common Authentication Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `token_not_valid` | Token expired or invalid |
| 401 | `authentication_failed` | Invalid credentials |
| 401 | `user_not_active` | Account deactivated |
| 403 | `permission_denied` | Valid token but insufficient permissions |

### Error Response Format

```json
{
  "type": "authentication_error",
  "code": "token_not_valid",
  "message": "Token is invalid or expired",
  "details": []
}
```

### Handling Token Expiration

```javascript
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    const error = await response.json();

    if (error.code === 'token_not_valid') {
      // Try to refresh
      const refreshed = await refreshTokens();
      if (refreshed) {
        // Retry original request
        return apiRequest(url, options);
      } else {
        // Redirect to login
        window.location.href = '/login';
      }
    }
  }

  return response;
}
```

## Security Best Practices

1. **Store tokens securely**
   - Browser: Use `httpOnly` cookies or secure storage
   - Mobile: Use platform secure storage (Keychain, Keystore)
   - Never store in `localStorage` for sensitive apps

2. **Use HTTPS only**
   - All API requests must use HTTPS in production

3. **Handle token expiration gracefully**
   - Implement auto-refresh before expiration
   - Redirect to login when refresh fails

4. **Clear tokens on logout**
   - Remove from storage
   - Call logout endpoint

## Related Documentation

- [Accounts Module](../modules/accounts.md) - Authentication details
- [ADR-013: JWT Authentication](../architecture/adr/index.md#security--authentication)
- [Rate Limiting](rate-limiting.md) - Request limits
