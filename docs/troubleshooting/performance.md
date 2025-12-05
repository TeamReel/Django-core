# Performance Troubleshooting

This guide covers common performance issues and optimization strategies.

## Diagnosing Slow Requests

### Check Response Time Headers

```python
response = requests.get('/api/v1/organisations/', headers=headers)

# Server processing time
server_timing = response.headers.get('Server-Timing')
print(f"Server timing: {server_timing}")

# Total request time
print(f"Request time: {response.elapsed.total_seconds():.3f}s")
```

### Profile Request Pipeline

```python
import time

def timed_request(method, url, **kwargs):
    """Time different phases of a request."""
    times = {}
    
    start = time.time()
    
    # DNS + connection
    session = requests.Session()
    prepared = session.prepare_request(requests.Request(method, url, **kwargs))
    times['prepare'] = time.time() - start
    
    # Send request
    start = time.time()
    response = session.send(prepared)
    times['send'] = time.time() - start
    
    # Read response
    start = time.time()
    _ = response.content
    times['read'] = time.time() - start
    
    print(f"Prepare: {times['prepare']*1000:.1f}ms")
    print(f"Send:    {times['send']*1000:.1f}ms")
    print(f"Read:    {times['read']*1000:.1f}ms")
    print(f"Total:   {sum(times.values())*1000:.1f}ms")
    
    return response
```

## Common Performance Issues

### Issue: Slow List Endpoints

**Symptoms**: List endpoints take several seconds.

**Causes**:
1. Fetching too many records
2. Complex filters
3. Missing database indexes

**Solutions**:

1. **Use pagination**:
   ```python
   # Bad: Fetch all records
   response = requests.get('/api/v1/users/')  # May timeout
   
   # Good: Paginate
   response = requests.get('/api/v1/users/', params={'limit': 100})
   ```

2. **Reduce page size**:
   ```python
   # Smaller pages = faster responses
   params = {'limit': 50}  # Default is 100
   ```

3. **Filter server-side**:
   ```python
   # Bad: Fetch all, filter client-side
   response = requests.get('/api/v1/users/')
   active = [u for u in response.json()['results'] if u['is_active']]
   
   # Good: Filter server-side
   response = requests.get('/api/v1/users/', params={'is_active': True})
   ```

### Issue: N+1 Query Pattern

**Symptoms**: Each item requires additional API calls.

**Solution**: Use related field expansion or bulk endpoints:

```python
# Bad: N+1 pattern
orgs = requests.get('/api/v1/organisations/').json()['results']
for org in orgs:
    members = requests.get(f'/api/v1/organisations/{org["id"]}/members/').json()

# Good: Single request with expansion (if available)
orgs = requests.get(
    '/api/v1/organisations/',
    params={'expand': 'members'}
).json()['results']
```

### Issue: Large Response Payloads

**Symptoms**: Responses take long to download/parse.

**Solutions**:

1. **Use field selection** (if available):
   ```python
   params = {'fields': 'id,name,slug'}
   ```

2. **Reduce page size**:
   ```python
   params = {'limit': 25}
   ```

3. **Use compression**:
   ```python
   headers['Accept-Encoding'] = 'gzip, deflate'
   ```

### Issue: Repeated Identical Requests

**Symptoms**: Same data fetched multiple times.

**Solution**: Implement caching:

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
    
    def get(self, path, use_cache=True):
        if use_cache and path in self.cache:
            data, expires = self.cache[path]
            if datetime.now() < expires:
                return data
        
        response = requests.get(
            f'{self.base_url}{path}',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        data = response.json()
        
        expires = datetime.now() + timedelta(seconds=self.cache_ttl)
        self.cache[path] = (data, expires)
        
        return data
```

## Optimization Strategies

### 1. Connection Pooling

Reuse HTTP connections:

```python
import requests

# Create session for connection pooling
session = requests.Session()
session.headers['Authorization'] = f'Bearer {token}'

# Reuse session for all requests
response1 = session.get('/api/v1/organisations/')
response2 = session.get('/api/v1/projects/')  # Reuses connection
```

### 2. Parallel Requests

Make independent requests in parallel:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_parallel(urls, token, max_workers=5):
    """Fetch multiple URLs in parallel."""
    headers = {'Authorization': f'Bearer {token}'}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {
            executor.submit(requests.get, url, headers=headers): url
            for url in urls
        }
        
        results = {}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result().json()
            except Exception as e:
                results[url] = {'error': str(e)}
        
        return results

# Fetch multiple resources in parallel
results = fetch_parallel([
    '/api/v1/organisations/',
    '/api/v1/projects/',
    '/api/v1/auth/me/'
], token)
```

### 3. Async Requests

Use async for high-throughput scenarios:

```python
import asyncio
import aiohttp

async def fetch_async(urls, token):
    """Fetch multiple URLs asynchronously."""
    headers = {'Authorization': f'Bearer {token}'}
    
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [session.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        
        results = []
        for response in responses:
            results.append(await response.json())
        
        return results

# Usage
results = asyncio.run(fetch_async([
    '/api/v1/organisations/',
    '/api/v1/projects/'
], token))
```

### 4. Efficient Pagination

Use generators for memory-efficient pagination:

```python
def paginate(url, token, page_size=100):
    """Memory-efficient pagination using generator."""
    headers = {'Authorization': f'Bearer {token}'}
    params = {'limit': page_size}
    
    while url:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        
        for item in data['results']:
            yield item
        
        url = data.get('next')
        params = {}  # Next URL includes params

# Process items one at a time
for org in paginate('/api/v1/organisations/', token):
    process(org)  # Never loads all items in memory
```

### 5. Batch Operations

Use bulk endpoints when available:

```python
# Bad: Individual requests
for user_id in user_ids:
    requests.post(
        f'/api/v1/organisations/{org_id}/members/',
        json={'user_id': user_id}
    )

# Good: Bulk request (if endpoint supports it)
requests.post(
    f'/api/v1/organisations/{org_id}/members/bulk/',
    json={'user_ids': user_ids}
)
```

## Monitoring Performance

### Track Request Metrics

```python
import time
from collections import defaultdict

class MetricsClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.metrics = defaultdict(list)
    
    def request(self, method, path, **kwargs):
        start = time.time()
        
        response = requests.request(
            method,
            f'{self.base_url}{path}',
            headers={'Authorization': f'Bearer {self.token}'},
            **kwargs
        )
        
        duration = time.time() - start
        self.metrics[path].append(duration)
        
        return response
    
    def report(self):
        print("Performance Report")
        print("-" * 50)
        for path, durations in sorted(self.metrics.items()):
            avg = sum(durations) / len(durations)
            max_d = max(durations)
            print(f"{path}")
            print(f"  Requests: {len(durations)}")
            print(f"  Avg: {avg*1000:.1f}ms")
            print(f"  Max: {max_d*1000:.1f}ms")
```

### Identify Slow Endpoints

```python
def analyze_response_times(metrics_client):
    """Identify slow endpoints."""
    slow_endpoints = []
    
    for path, durations in metrics_client.metrics.items():
        avg = sum(durations) / len(durations)
        if avg > 1.0:  # Slower than 1 second
            slow_endpoints.append((path, avg))
    
    slow_endpoints.sort(key=lambda x: x[1], reverse=True)
    
    print("Slow Endpoints (>1s average):")
    for path, avg in slow_endpoints:
        print(f"  {path}: {avg:.2f}s")
```

## Performance Best Practices

1. **Use connection pooling** - Reuse HTTP sessions
2. **Implement caching** - Cache read-only data
3. **Filter server-side** - Don't fetch unnecessary data
4. **Use pagination** - Don't load huge datasets
5. **Parallelize** - Make independent requests concurrently
6. **Use compression** - Enable gzip/deflate
7. **Monitor** - Track and alert on slow requests

## Related Documentation

- [Rate Limiting](../guides/rate-limiting.md) - Respect rate limits
- [API Pagination](../guides/api-pagination.md) - Pagination patterns
- [Debugging](debugging.md) - Debug slow requests
