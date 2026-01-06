# Rate Limiting Guide

This guide explains how rate limiting works in the Django Core-App API.

## Overview

Rate limiting protects the API from abuse and ensures fair usage. When you exceed the limit, requests return `429 Too Many Requests` until the window resets.

## Default Limits

| Category | Limit | Window |
|----------|-------|--------|
| Authenticated requests | 1000 | 1 hour |
| Anonymous requests | 100 | 1 hour |
| Authentication endpoints | 5 | 1 minute |
| Password reset | 3 | 1 hour |
| File uploads | 10 | 1 minute |

## Rate Limit Headers

Every response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1699999999
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

## Rate Limit Exceeded

When you exceed the limit:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "type": "throttled",
  "code": "rate_limit_exceeded",
  "message": "Request was throttled. Expected available in 60 seconds."
}
```

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until you can retry |

## Python Examples

### Basic Rate Limit Handling

```python
import requests
import time

def api_request(url, token, max_retries=3):
    """Make API request with rate limit handling."""
    headers = {'Authorization': f'Bearer {token}'}

    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"Rate limited. Waiting {retry_after} seconds...")
            time.sleep(retry_after)
            continue

        return response

    raise Exception("Max retries exceeded")
```

### Proactive Rate Limit Check

```python
class RateLimitedClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
        self.remaining = None
        self.reset_time = None

    def request(self, method, path, **kwargs):
        # Check if we should wait
        if self.remaining is not None and self.remaining <= 5:
            wait_time = max(0, self.reset_time - time.time())
            if wait_time > 0:
                print(f"Approaching limit. Waiting {wait_time:.0f}s...")
                time.sleep(wait_time)

        response = requests.request(
            method,
            f'{self.base_url}{path}',
            headers=self.headers,
            **kwargs
        )

        # Update rate limit info
        self.remaining = int(response.headers.get('X-RateLimit-Remaining', 1000))
        self.reset_time = int(response.headers.get('X-RateLimit-Reset', 0))

        return response
```

### Batch Operations

When making many requests, spread them out:

```python
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def batch_fetch(urls, token, rate_limit=10, window=1):
    """Fetch multiple URLs respecting rate limits."""
    headers = {'Authorization': f'Bearer {token}'}
    results = []

    for i, url in enumerate(urls):
        # Respect rate limit
        if i > 0 and i % rate_limit == 0:
            time.sleep(window)

        response = requests.get(url, headers=headers)
        results.append(response.json())

    return results
```

## JavaScript Examples

### Fetch with Retry

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

### Rate Limit Aware Client

```javascript
class APIClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.remaining = null;
    this.resetTime = null;
  }

  async request(path, options = {}) {
    // Check if we should wait
    if (this.remaining !== null && this.remaining <= 5) {
      const waitTime = Math.max(0, this.resetTime - Date.now() / 1000);
      if (waitTime > 0) {
        console.log(`Approaching limit. Waiting ${waitTime.toFixed(0)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      }
    });

    // Update rate limit info
    this.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '1000');
    this.resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

    return response;
  }
}
```

## Best Practices

### 1. Implement Exponential Backoff

```python
import time
import random

def exponential_backoff(attempt, base=1, max_delay=60):
    """Calculate delay with jitter."""
    delay = min(base * (2 ** attempt), max_delay)
    jitter = random.uniform(0, delay * 0.1)
    return delay + jitter

def request_with_backoff(url, token, max_attempts=5):
    for attempt in range(max_attempts):
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {token}'}
        )

        if response.status_code != 429:
            return response

        delay = exponential_backoff(attempt)
        time.sleep(delay)

    raise Exception("Request failed after max attempts")
```

### 2. Cache Responses

Reduce API calls by caching responses:

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedAPIClient:
    def __init__(self, base_url, token, cache_ttl=300):
        self.base_url = base_url
        self.token = token
        self.cache_ttl = cache_ttl
        self.cache = {}

    def get(self, path):
        cache_key = path
        cached = self.cache.get(cache_key)

        if cached:
            data, expires = cached
            if datetime.now() < expires:
                return data

        response = requests.get(
            f'{self.base_url}{path}',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        data = response.json()

        expires = datetime.now() + timedelta(seconds=self.cache_ttl)
        self.cache[cache_key] = (data, expires)

        return data
```

### 3. Use Bulk Endpoints

When available, use bulk endpoints instead of multiple single requests:

```python
# Bad: Multiple requests
for user_id in user_ids:
    response = requests.get(f'/api/v1/users/{user_id}/')

# Good: Single bulk request
response = requests.get(
    '/api/v1/users/',
    params={'id__in': ','.join(user_ids)}
)
```

### 4. Monitor Rate Limit Headers

Track your usage to avoid hitting limits:

```python
import logging

def log_rate_limit_status(response):
    remaining = response.headers.get('X-RateLimit-Remaining')
    limit = response.headers.get('X-RateLimit-Limit')

    if remaining and limit:
        percent = int(remaining) / int(limit) * 100
        if percent < 20:
            logging.warning(f"Rate limit at {percent:.1f}% remaining")
```

## Requesting Higher Limits

If you need higher rate limits:

1. Contact support with your use case
2. Provide your organization ID
3. Explain the expected request volume
4. Describe the integration pattern

Enterprise customers may qualify for custom limits.

## Related Documentation

- [API Module](../modules/api.md) - API configuration
- [API Authentication](api-authentication.md) - Auth limits
- [Troubleshooting](../troubleshooting/common-errors.md) - 429 errors
