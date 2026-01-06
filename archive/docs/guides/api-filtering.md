# API Filtering Guide

This guide explains how to filter, search, and order results from the Django Core-App API.

## Overview

API endpoints support filtering, searching, and ordering through query parameters. These features help you retrieve exactly the data you need.

## Basic Filtering

Filter results using field-based query parameters:

```bash
# Filter by field value
GET /api/v1/organisations/?is_active=true

# Multiple filters (AND)
GET /api/v1/projects/?organisation_id=uuid&is_active=true
```

## Available Filters by Endpoint

### Organisations

| Parameter | Type | Example |
|-----------|------|---------|
| `is_active` | boolean | `?is_active=true` |
| `name` | string | `?name=Acme` |
| `created_at__gte` | datetime | `?created_at__gte=2024-01-01` |
| `created_at__lte` | datetime | `?created_at__lte=2024-12-31` |

### Projects

| Parameter | Type | Example |
|-----------|------|---------|
| `organisation` | UUID | `?organisation=uuid` |
| `is_active` | boolean | `?is_active=true` |
| `created_at__gte` | datetime | `?created_at__gte=2024-01-01` |

### Users

| Parameter | Type | Example |
|-----------|------|---------|
| `is_active` | boolean | `?is_active=true` |
| `email_verified` | boolean | `?email_verified=true` |
| `date_joined__gte` | datetime | `?date_joined__gte=2024-01-01` |

## Filter Lookups

### Comparison Operators

| Suffix | Description | Example |
|--------|-------------|---------|
| (none) | Exact match | `?status=active` |
| `__gt` | Greater than | `?amount__gt=100` |
| `__gte` | Greater or equal | `?created_at__gte=2024-01-01` |
| `__lt` | Less than | `?amount__lt=1000` |
| `__lte` | Less or equal | `?created_at__lte=2024-12-31` |
| `__in` | In list | `?status__in=active,pending` |

### String Operators

| Suffix | Description | Example |
|--------|-------------|---------|
| `__contains` | Contains (case-sensitive) | `?name__contains=Corp` |
| `__icontains` | Contains (case-insensitive) | `?name__icontains=corp` |
| `__startswith` | Starts with | `?name__startswith=Acme` |
| `__endswith` | Ends with | `?email__endswith=@example.com` |

### Null Checks

| Suffix | Description | Example |
|--------|-------------|---------|
| `__isnull` | Is null | `?deleted_at__isnull=true` |

## Date Range Filtering

Filter by date ranges:

```bash
# Events this month
GET /api/v1/audit/events/?created_at__gte=2024-01-01&created_at__lte=2024-01-31

# Events in last 7 days
GET /api/v1/audit/events/?created_at__gte=2024-01-24
```

### Date Formats

Supported formats:
- `YYYY-MM-DD` - Date only
- `YYYY-MM-DDTHH:MM:SS` - Date and time
- `YYYY-MM-DDTHH:MM:SSZ` - Date with UTC timezone
- `YYYY-MM-DDTHH:MM:SS+00:00` - Date with timezone offset

## Searching

Use the `search` parameter for full-text search:

```bash
# Search organisations by name
GET /api/v1/organisations/?search=acme

# Search users by email or name
GET /api/v1/users/?search=john
```

### Searchable Fields

| Endpoint | Searchable Fields |
|----------|-------------------|
| `/organisations/` | `name`, `description` |
| `/projects/` | `name`, `description` |
| `/users/` | `email`, `first_name`, `last_name` |

## Ordering

Use the `ordering` parameter to sort results:

```bash
# Order by name (ascending)
GET /api/v1/organisations/?ordering=name

# Order by created_at (descending)
GET /api/v1/organisations/?ordering=-created_at

# Multiple fields
GET /api/v1/projects/?ordering=organisation,-created_at
```

### Orderable Fields

| Endpoint | Orderable Fields |
|----------|------------------|
| `/organisations/` | `name`, `created_at`, `updated_at` |
| `/projects/` | `name`, `created_at`, `organisation` |
| `/users/` | `email`, `date_joined`, `last_login` |

## Python Examples

### Basic Filtering

```python
import requests

def get_active_organisations(api_url, token):
    response = requests.get(
        f'{api_url}/api/v1/organisations/',
        headers={'Authorization': f'Bearer {token}'},
        params={'is_active': 'true'}
    )
    return response.json()['results']
```

### Complex Filters

```python
from datetime import datetime, timedelta

def get_recent_projects(api_url, token, org_id, days=30):
    since = (datetime.now() - timedelta(days=days)).isoformat()

    response = requests.get(
        f'{api_url}/api/v1/projects/',
        headers={'Authorization': f'Bearer {token}'},
        params={
            'organisation': org_id,
            'is_active': 'true',
            'created_at__gte': since,
            'ordering': '-created_at',
        }
    )
    return response.json()['results']
```

### Search with Pagination

```python
def search_organisations(api_url, token, query):
    """Search organisations and return all matching results."""
    results = []
    url = f'{api_url}/api/v1/organisations/'
    params = {'search': query}

    while url:
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {token}'},
            params=params if '?' not in url else None
        )
        data = response.json()
        results.extend(data['results'])
        url = data['next']

    return results
```

## JavaScript Examples

### Building Query Strings

```javascript
function buildQueryString(params) {
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

async function getOrganisations(filters = {}) {
  const query = buildQueryString({
    is_active: filters.active,
    search: filters.search,
    ordering: filters.orderBy,
    created_at__gte: filters.since?.toISOString(),
  });

  const response = await fetch(`/api/v1/organisations/?${query}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### React Query Example

```javascript
import { useQuery } from '@tanstack/react-query';

function useOrganisations({ search, active, orderBy }) {
  return useQuery({
    queryKey: ['organisations', { search, active, orderBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (active !== undefined) params.set('is_active', active);
      if (orderBy) params.set('ordering', orderBy);

      const response = await fetch(
        `/api/v1/organisations/?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return response.json();
    }
  });
}
```

## Combining Filters

Filters can be combined for powerful queries:

```bash
# Active projects in a specific org, created this year, ordered by name
GET /api/v1/projects/?organisation=uuid&is_active=true&created_at__gte=2024-01-01&ordering=name
```

```python
def get_filtered_projects(api_url, token, **filters):
    """Flexible project filtering."""
    params = {
        'organisation': filters.get('org_id'),
        'is_active': filters.get('active', True),
        'created_at__gte': filters.get('since'),
        'created_at__lte': filters.get('until'),
        'search': filters.get('search'),
        'ordering': filters.get('order_by', '-created_at'),
    }
    # Remove None values
    params = {k: v for k, v in params.items() if v is not None}

    response = requests.get(
        f'{api_url}/api/v1/projects/',
        headers={'Authorization': f'Bearer {token}'},
        params=params
    )
    return response.json()
```

## Error Handling

### Invalid Filter Values

```json
{
  "type": "validation_error",
  "code": "invalid_filter",
  "message": "Invalid filter value",
  "details": [
    {
      "field": "is_active",
      "message": "Expected boolean, got 'yes'"
    }
  ]
}
```

### Unknown Filter Fields

Unknown filter fields are silently ignored. Check the API documentation for available filters.

## Related Documentation

- [API Pagination](api-pagination.md) - Paginating results
- [API Module](../modules/api.md) - API configuration
