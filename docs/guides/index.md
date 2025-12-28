# Developer Guides

Practical how-to guides for common integration scenarios with the Django Core-App API.

## API Integration

Step-by-step guides for working with the API:

| Guide | Description |
|-------|-------------|
| [API Authentication](api-authentication.md) | JWT tokens, refresh flow, error handling |
| [API Pagination](api-pagination.md) | Cursor pagination, iterating results |
| [API Filtering](api-filtering.md) | Filter syntax, search, ordering |
| [Rate Limiting](rate-limiting.md) | Rate limits, headers, handling 429s |

## Webhook Integration

| Guide | Description |
|-------|-------------|
| [Webhook Integration](webhook-integration.md) | Signature verification, event handling |

## Security & Deployment

| Guide | Description |
|-------|-------------|
| [Security](security.md) | Security features, compliance, best practices |
| [Deployment](deployment.md) | Production deployment, configuration |

## Quick Start

### 1. Get an Access Token

```python
import requests

response = requests.post(
    'https://api.example.com/api/v1/auth/token/',
    json={'email': 'user@example.com', 'password': 'secret'}
)
token = response.json()['access']
```

### 2. Make an API Request

```python
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'https://api.example.com/api/v1/organisations/',
    headers=headers
)
orgs = response.json()['results']
```

### 3. Handle Pagination

```python
def fetch_all(url, headers):
    while url:
        response = requests.get(url, headers=headers)
        data = response.json()
        yield from data['results']
        url = data.get('next')

all_orgs = list(fetch_all(
    'https://api.example.com/api/v1/organisations/',
    headers
))
```

## Common Patterns

### Error Handling

All guides follow consistent error handling:

```python
import requests

def api_request(method, url, **kwargs):
    """Make API request with standard error handling."""
    try:
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as e:
        error = e.response.json()
        raise APIError(
            code=error.get('code'),
            message=error.get('message'),
            details=error.get('details')
        )
```

### Token Refresh

Most guides include token refresh handling:

```python
class APIClient:
    def request(self, method, url, **kwargs):
        response = requests.request(method, url, **kwargs)

        if response.status_code == 401:
            self.refresh_token()
            response = requests.request(method, url, **kwargs)

        return response
```

### Rate Limit Handling

All examples include rate limit handling:

```python
if response.status_code == 429:
    retry_after = int(response.headers.get('Retry-After', 60))
    time.sleep(retry_after)
    # Retry request
```

## Language Examples

Each guide includes examples in:

- **Python** - Using `requests` library
- **JavaScript** - Using `fetch` API

## API Reference

For complete API documentation with request/response examples, see the interactive [Swagger UI](/api/docs/).

## Related Resources

- [Module Documentation](../modules/index.md) - Per-module reference
- [Architecture](../architecture/index.md) - System design overview
- [Troubleshooting](../troubleshooting/index.md) - Common issues and solutions
