# Rate Limiting HTTP Headers

**Feature**: 013-api-foundation-standards
**Date**: 2025-11-29

## Overview

All API responses include rate limiting headers to inform clients of their quota status. These headers follow industry standards (RFC 6585, GitHub API conventions).

---

## Response Headers

### X-RateLimit-Limit

- **Type**: Integer
- **Description**: Total number of requests allowed in the current rate limit window
- **Example**: `100`
- **When Present**: All API responses (successful and rate-limited)

**Authenticated Users**: `100`
**Anonymous Users**: `10`

---

### X-RateLimit-Remaining

- **Type**: Integer
- **Description**: Number of requests remaining in the current rate limit window
- **Example**: `73`
- **When Present**: All API responses (successful and rate-limited)
- **Minimum Value**: `0` (when rate limit exceeded)

---

### X-RateLimit-Reset

- **Type**: Integer (Unix timestamp)
- **Description**: Unix timestamp (seconds since epoch) when the rate limit window resets
- **Example**: `1732892460` (represents `2025-11-29T12:01:00Z`)
- **When Present**: All API responses (successful and rate-limited)

**Calculation**:
```python
reset_timestamp = int(time.time()) + redis_ttl
```

Clients can calculate time until reset:
```javascript
const secondsUntilReset = resetTimestamp - Math.floor(Date.now() / 1000);
```

---

### Retry-After

- **Type**: Integer (seconds) OR HTTP date string
- **Description**: Number of seconds to wait before retrying (only on 429 responses)
- **Example**: `23` (wait 23 seconds)
- **When Present**: Only on `429 Too Many Requests` responses
- **Standard**: RFC 7231 Section 7.1.3

**Calculation**:
```python
retry_after = redis.ttl(f"throttle:auth:{user_id}")  # Seconds until window expires
```

---

## Example Responses

### Successful Request (Under Limit)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1732892460

{
  "status": "success",
  "data": {
    "id": 123,
    "name": "Example Organisation"
  }
}
```

**Interpretation**:
- Client has used 27 out of 100 allowed requests
- 73 requests remaining before hitting limit
- Rate limit window resets at Unix timestamp `1732892460` (in 33 seconds)

---

### Rate Limit Exceeded (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
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

**Interpretation**:
- Client has exhausted their quota (0 remaining)
- Must wait 23 seconds before retrying
- Rate limit resets at Unix timestamp `1732892460`

---

### First Request in Window

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1732892520

{
  "status": "success",
  "data": [...]
}
```

**Interpretation**:
- First request in a new rate limit window
- 99 requests remaining
- Window started now, resets in 60 seconds

---

### Anonymous Request (Lower Limit)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1732892490

{
  "status": "success",
  "data": [...]
}
```

**Interpretation**:
- Anonymous users have lower limits (10/min vs 100/min)
- 3 out of 10 requests consumed
- Encourages authentication for higher quotas

---

## Client Implementation Examples

### JavaScript (Fetch API)

```javascript
async function fetchWithRateLimit(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // Extract rate limit headers
  const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));

  console.log(`Rate limit: ${remaining}/${limit} remaining`);
  console.log(`Resets in: ${reset - Math.floor(Date.now() / 1000)}s`);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After'));
    console.warn(`Rate limited. Retry in ${retryAfter} seconds.`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return fetchWithRateLimit(url, options);
  }

  return response.json();
}
```

---

### Python (Requests Library)

```python
import requests
import time

def fetch_with_rate_limit(url, headers=None):
    response = requests.get(url, headers=headers or {})

    # Extract rate limit headers
    limit = int(response.headers.get('X-RateLimit-Limit', 0))
    remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
    reset = int(response.headers.get('X-RateLimit-Reset', 0))

    print(f"Rate limit: {remaining}/{limit} remaining")
    print(f"Resets at: {reset} ({reset - int(time.time())}s)")

    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 60))
        print(f"Rate limited. Retrying in {retry_after}s...")
        time.sleep(retry_after)
        return fetch_with_rate_limit(url, headers)

    response.raise_for_status()
    return response.json()['data']
```

---

### curl (Manual Inspection)

```bash
curl -i -H "Authorization: Bearer eyJ0eXAi..." \
  https://api.example.com/api/v1/organisations/

# Output:
# HTTP/1.1 200 OK
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 73
# X-RateLimit-Reset: 1732892460
# ...
```

---

## Rate Limit Scopes

### Authenticated Users

- **Scope**: Per user ID
- **Limit**: 100 requests per minute
- **Identifier**: `user.id` (from JWT or session)
- **Redis Key**: `throttle:auth:{user_id}`

**Example**:
- User ID 123 makes 50 requests → Remaining = 50
- User ID 456 makes 10 requests → Remaining = 90 (separate quota)

---

### Anonymous Users

- **Scope**: Per IP address
- **Limit**: 10 requests per minute
- **Identifier**: Client IP address (from `request.META['REMOTE_ADDR']`)
- **Redis Key**: `throttle:anon:{ip_address}`

**Example**:
- IP `192.168.1.100` makes 8 requests → Remaining = 2
- IP `192.168.1.101` makes 3 requests → Remaining = 7 (separate quota)

**Note**: Shared IP addresses (e.g., corporate NAT, public WiFi) share the same quota. Encourage authentication for dedicated quotas.

---

## Edge Cases

### Redis Unavailable

If Redis is unavailable (connection error):
- **Behavior**: DRF throttle fails open (allows request)
- **Headers**: Not injected (no rate limit enforcement)
- **Reasoning**: Prefer availability over strict rate limiting

**Mitigation**:
- Monitor Redis health via django-prometheus metrics
- Set up Redis high availability (replication, Sentinel, Cluster)

---

### Clock Skew

Rate limit windows use Redis server time (via `SET key value EX ttl`):
- **No Client Clock Dependency**: Reset timestamps calculated from server time
- **Consistent Across Servers**: All app servers use same Redis time source

---

### Concurrent Requests

Redis `INCR` is atomic:
- **No Race Conditions**: Multiple simultaneous requests correctly increment counter
- **Accurate Counting**: Even under high concurrency (1000+ req/s)

---

### Burst Traffic

Current implementation: **Token bucket** (resets every 60 seconds)
- **Allows Bursts**: Client can use all 100 requests instantly
- **Hard Reset**: Counter resets to 0 after 60 seconds

**Alternative** (not implemented): Sliding window
- **Smoother**: Average rate over rolling window
- **Complexity**: Requires sorted sets in Redis

---

## Monitoring & Alerts

### Prometheus Metrics

```promql
# Rate limit exceeded events
rate(api_rate_limit_exceeded_total[5m])

# Percentage of requests hitting rate limit
rate(api_rate_limit_exceeded_total[5m]) / rate(http_requests_total[5m]) * 100

# Users hitting rate limit
count(increase(api_rate_limit_exceeded_total{user_type="authenticated"}[1h])) by (user_id)
```

### Alert Example

```yaml
- alert: HighRateLimitExceeded
  expr: rate(api_rate_limit_exceeded_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate of 429 responses"
    description: "{{ $value }} requests/sec are being rate limited"
```

---

## Future Enhancements

1. **Per-Endpoint Limits**: Different limits for resource-intensive operations
   ```python
   class HeavyOperationThrottle(SimpleRateThrottle):
       scope = "heavy_operation"
       rate = "10/hour"  # More restrictive
   ```

2. **Rate Limit Tiers**: Higher limits for premium users
   ```python
   def get_cache_key(self, request, view):
       if request.user.is_premium:
           return None  # No rate limit for premium users
       return f"throttle_user_{request.user.id}"
   ```

3. **Quota Carry-Over**: Unused requests carry over to next window
   - Requires sliding window implementation
   - More complex Redis data structure

4. **Custom Headers**: Add `X-RateLimit-Resource` header to indicate scope
   ```
   X-RateLimit-Resource: users:read
   X-RateLimit-Limit: 100
   ```

---

## References

- **RFC 6585**: Additional HTTP Status Codes (429 Too Many Requests)
- **RFC 7231**: HTTP/1.1 Semantics (Retry-After header)
- **GitHub API**: Rate limiting conventions
- **DRF Throttling**: Django REST Framework throttling documentation
- **Redis INCR**: Atomic counter operations
