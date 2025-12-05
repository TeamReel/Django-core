# Debugging Guide

This guide covers techniques for debugging issues with the Django Core-App API.

## Request Debugging

### Inspect Request Details

Enable verbose logging to see request/response details:

```python
import logging
import requests

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('urllib3').setLevel(logging.DEBUG)

response = requests.get('/api/v1/organisations/')
```

### Log Request ID

Every response includes a request ID for tracing:

```python
response = requests.get('/api/v1/organisations/', headers=headers)
request_id = response.headers.get('X-Request-ID')
print(f"Request ID: {request_id}")
```

Include this ID when contacting support.

### Use curl for Testing

Test requests with curl to isolate issues:

```bash
# Basic request
curl -v -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/v1/organisations/

# POST with data
curl -v -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Org", "slug": "test-org"}' \
  https://api.example.com/api/v1/organisations/
```

## Authentication Debugging

### Decode JWT Token

Inspect token claims without verification:

```python
import base64
import json

def decode_jwt_payload(token):
    """Decode JWT payload (without verification)."""
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    
    payload = parts[1]
    # Add padding if needed
    payload += '=' * (4 - len(payload) % 4)
    decoded = base64.urlsafe_b64decode(payload)
    return json.loads(decoded)

claims = decode_jwt_payload(access_token)
print(f"User ID: {claims.get('user_id')}")
print(f"Expires: {claims.get('exp')}")
```

### Check Token Expiration

```python
import time

def is_token_expired(token, buffer_seconds=30):
    """Check if token is expired or about to expire."""
    claims = decode_jwt_payload(token)
    exp = claims.get('exp', 0)
    return time.time() > (exp - buffer_seconds)

if is_token_expired(access_token):
    print("Token is expired or about to expire")
```

### Test Token Validity

```python
def validate_token(token):
    """Test if token is valid by making a simple request."""
    response = requests.get(
        '/api/v1/auth/me/',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    if response.ok:
        print(f"Token valid. User: {response.json()['email']}")
        return True
    else:
        print(f"Token invalid: {response.json()}")
        return False
```

## Permission Debugging

### Check User Permissions

```python
def debug_permissions(token, org_id=None, project_id=None):
    """Debug user permissions."""
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get current user
    user = requests.get('/api/v1/auth/me/', headers=headers).json()
    print(f"User: {user['email']}")
    
    if org_id:
        # Get org membership
        resp = requests.get(
            f'/api/v1/organisations/{org_id}/members/me/',
            headers=headers
        )
        if resp.ok:
            member = resp.json()
            print(f"Org role: {member['role']['name']}")
            print(f"Permissions: {member['role']['permissions']}")
        else:
            print(f"Not a member of org {org_id}")
    
    if project_id:
        # Get project membership
        resp = requests.get(
            f'/api/v1/projects/{project_id}/members/me/',
            headers=headers
        )
        if resp.ok:
            member = resp.json()
            print(f"Project role: {member['role']['name']}")
        else:
            print(f"Not a member of project {project_id}")
```

### Trace Permission Denied

When you get 403 Forbidden:

1. **Check the endpoint docs** for required permissions
2. **Verify scope** - right org/project context?
3. **Check role assignment** - user has correct role?
4. **Check role permissions** - role has required permission?

```python
# Example: Debug why project creation fails
def debug_project_creation(token, org_id):
    headers = {'Authorization': f'Bearer {token}'}
    
    # Check org membership
    resp = requests.get(
        f'/api/v1/organisations/{org_id}/members/me/',
        headers=headers
    )
    
    if not resp.ok:
        print("ERROR: Not a member of this organisation")
        return
    
    member = resp.json()
    permissions = member['role']['permissions']
    
    if 'project.create' not in permissions:
        print(f"ERROR: Missing 'project.create' permission")
        print(f"Current permissions: {permissions}")
        print(f"Need role with 'project.create' permission")
    else:
        print("Has permission - check other issues")
```

## Request/Response Debugging

### Create Debug Wrapper

```python
import requests
import json

class DebugSession(requests.Session):
    """Requests session with debug logging."""
    
    def request(self, method, url, **kwargs):
        print(f"\n{'='*60}")
        print(f"REQUEST: {method.upper()} {url}")
        
        if 'headers' in kwargs:
            for k, v in kwargs['headers'].items():
                if k.lower() == 'authorization':
                    print(f"  {k}: Bearer ***")
                else:
                    print(f"  {k}: {v}")
        
        if 'json' in kwargs:
            print(f"  Body: {json.dumps(kwargs['json'], indent=2)}")
        
        response = super().request(method, url, **kwargs)
        
        print(f"\nRESPONSE: {response.status_code}")
        for k, v in response.headers.items():
            print(f"  {k}: {v}")
        
        try:
            body = response.json()
            print(f"  Body: {json.dumps(body, indent=2)}")
        except:
            print(f"  Body: {response.text[:500]}")
        
        print('='*60)
        return response

# Usage
session = DebugSession()
session.get('/api/v1/organisations/', headers=headers)
```

### Compare Working vs Failing Requests

```python
def compare_requests(working_response, failing_response):
    """Compare two responses to find differences."""
    print("Status codes:")
    print(f"  Working: {working_response.status_code}")
    print(f"  Failing: {failing_response.status_code}")
    
    print("\nHeader differences:")
    w_headers = set(working_response.headers.keys())
    f_headers = set(failing_response.headers.keys())
    
    for header in w_headers | f_headers:
        w_val = working_response.headers.get(header)
        f_val = failing_response.headers.get(header)
        if w_val != f_val:
            print(f"  {header}:")
            print(f"    Working: {w_val}")
            print(f"    Failing: {f_val}")
```

## Network Debugging

### Check Connection

```python
import socket

def check_connectivity(host, port=443):
    """Check if host is reachable."""
    try:
        socket.create_connection((host, port), timeout=5)
        print(f"✓ Can connect to {host}:{port}")
        return True
    except socket.error as e:
        print(f"✗ Cannot connect to {host}:{port}: {e}")
        return False

check_connectivity('api.example.com')
```

### Check DNS Resolution

```python
def check_dns(hostname):
    """Check DNS resolution."""
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✓ {hostname} resolves to {ip}")
        return ip
    except socket.gaierror as e:
        print(f"✗ DNS resolution failed: {e}")
        return None
```

### Check TLS/SSL

```bash
# Check TLS certificate
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check supported TLS versions
nmap --script ssl-enum-ciphers -p 443 api.example.com
```

## Common Issues Checklist

### Request Not Working

- [ ] Token included in Authorization header?
- [ ] Token format correct (`Bearer <token>`)?
- [ ] Token not expired?
- [ ] Content-Type set for POST/PUT/PATCH?
- [ ] Request body valid JSON?
- [ ] Correct HTTP method?
- [ ] Correct URL path?
- [ ] Required fields included?

### Permission Issues

- [ ] User authenticated?
- [ ] User is member of org/project?
- [ ] User role has required permission?
- [ ] Resource in correct scope?
- [ ] Resource not archived/deleted?

### Rate Limiting

- [ ] Checking rate limit headers?
- [ ] Implementing retry with backoff?
- [ ] Caching responses?
- [ ] Using bulk endpoints where available?

## Getting Help

When contacting support, include:

1. **Request ID** from `X-Request-ID` header
2. **Trace ID** from error response (if present)
3. **Timestamp** of the error
4. **Request details** (method, URL, headers, body)
5. **Response details** (status, headers, body)
6. **Expected vs actual behavior**
7. **Steps to reproduce**

## Related Documentation

- [Common Errors](common-errors.md) - Error reference
- [Performance](performance.md) - Performance issues
- [API Authentication](../guides/api-authentication.md) - Auth details
