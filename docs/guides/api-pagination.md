# API Pagination Guide

This guide explains how to work with paginated responses in the Django Core-App API.

## Overview

The API uses cursor-based pagination for efficient traversal of large datasets. This approach provides consistent results even when data changes between requests.

## Response Format

Paginated endpoints return responses in this format:

```json
{
  "count": 1250,
  "next": "https://api.example.com/api/v1/organisations/?cursor=cD0xMjM",
  "previous": "https://api.example.com/api/v1/organisations/?cursor=cD0xMjI",
  "results": [
    {"id": 1, "name": "Organisation 1"},
    {"id": 2, "name": "Organisation 2"}
  ]
}
```

| Field | Description |
|-------|-------------|
| `count` | Total number of items (may be null for performance) |
| `next` | URL for next page (null if last page) |
| `previous` | URL for previous page (null if first page) |
| `results` | Array of items for current page |

## Basic Usage

### First Page

```bash
curl https://api.example.com/api/v1/organisations/ \
  -H "Authorization: Bearer {token}"
```

### Next Page

Use the `next` URL from the previous response:

```bash
curl "https://api.example.com/api/v1/organisations/?cursor=cD0xMjM" \
  -H "Authorization: Bearer {token}"
```

## Page Size

Control the number of items per page with `page_size`:

```bash
# Get 25 items per page
curl "https://api.example.com/api/v1/organisations/?page_size=25" \
  -H "Authorization: Bearer {token}"
```

| Parameter | Default | Maximum | Description |
|-----------|---------|---------|-------------|
| `page_size` | 50 | 100 | Items per page |

## Python Examples

### Simple Iteration

```python
import requests

def get_all_organisations(api_url, token):
    """Fetch all organisations across all pages."""
    url = f'{api_url}/api/v1/organisations/'
    headers = {'Authorization': f'Bearer {token}'}
    organisations = []
    
    while url:
        response = requests.get(url, headers=headers)
        data = response.json()
        organisations.extend(data['results'])
        url = data['next']
    
    return organisations
```

### Generator Pattern (Memory Efficient)

```python
def iter_organisations(api_url, token, page_size=50):
    """Iterate over organisations without loading all into memory."""
    url = f'{api_url}/api/v1/organisations/?page_size={page_size}'
    headers = {'Authorization': f'Bearer {token}'}
    
    while url:
        response = requests.get(url, headers=headers)
        data = response.json()
        
        for org in data['results']:
            yield org
        
        url = data['next']

# Usage
for org in iter_organisations(api_url, token):
    process_organisation(org)
```

### Async Pagination

```python
import aiohttp
import asyncio

async def fetch_page(session, url, headers):
    async with session.get(url, headers=headers) as response:
        return await response.json()

async def get_all_organisations(api_url, token):
    headers = {'Authorization': f'Bearer {token}'}
    url = f'{api_url}/api/v1/organisations/'
    organisations = []
    
    async with aiohttp.ClientSession() as session:
        while url:
            data = await fetch_page(session, url, headers)
            organisations.extend(data['results'])
            url = data['next']
    
    return organisations
```

## JavaScript Examples

### Fetch All Pages

```javascript
async function getAllOrganisations(baseUrl, token) {
  const organisations = [];
  let url = `${baseUrl}/api/v1/organisations/`;
  
  while (url) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    organisations.push(...data.results);
    url = data.next;
  }
  
  return organisations;
}
```

### Async Generator

```javascript
async function* iterOrganisations(baseUrl, token) {
  let url = `${baseUrl}/api/v1/organisations/`;
  
  while (url) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    for (const org of data.results) {
      yield org;
    }
    
    url = data.next;
  }
}

// Usage
for await (const org of iterOrganisations(baseUrl, token)) {
  console.log(org.name);
}
```

### React Hook

```javascript
function useOrganisations() {
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextUrl, setNextUrl] = useState('/api/v1/organisations/');
  
  const loadMore = useCallback(async () => {
    if (!nextUrl || loading) return;
    
    setLoading(true);
    const response = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    setOrganisations(prev => [...prev, ...data.results]);
    setNextUrl(data.next);
    setHasMore(!!data.next);
    setLoading(false);
  }, [nextUrl, loading]);
  
  return { organisations, loading, hasMore, loadMore };
}
```

## Best Practices

### 1. Use Cursors, Not Offsets

Cursor-based pagination is more reliable than offset-based:
- ✅ Cursors: Consistent results during data changes
- ❌ Offsets: May skip or duplicate items when data changes

### 2. Request Reasonable Page Sizes

```python
# Good: Reasonable size for most use cases
page_size = 50

# Bad: Too large, wastes bandwidth if not needed
page_size = 1000
```

### 3. Handle Rate Limits

When paginating through large datasets:

```python
import time

def iter_with_rate_limit(api_url, token, page_size=50):
    url = f'{api_url}/api/v1/organisations/?page_size={page_size}'
    headers = {'Authorization': f'Bearer {token}'}
    
    while url:
        response = requests.get(url, headers=headers)
        
        # Check rate limit headers
        remaining = int(response.headers.get('X-RateLimit-Remaining', 100))
        if remaining < 10:
            time.sleep(1)  # Slow down
        
        data = response.json()
        yield from data['results']
        url = data['next']
```

### 4. Stream Large Datasets

For exports or bulk operations, consider using export endpoints instead of pagination.

## Related Documentation

- [API Module](../modules/api.md) - API configuration
- [API Filtering](api-filtering.md) - Filtering results
- [Rate Limiting](rate-limiting.md) - Request limits
