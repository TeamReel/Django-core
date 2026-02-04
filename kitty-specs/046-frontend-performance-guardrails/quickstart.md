# Quickstart: Frontend Performance Guardrails

## Overview

This guide shows how to use and configure the pagination guardrails feature.

## For Frontend Developers

### 1. Reading Pagination Budget

Every paginated list response now includes an `X-Fetch-Budget` header:

```javascript
const response = await fetch('/api/v1/activities/?page=1');
const budget = JSON.parse(response.headers.get('X-Fetch-Budget'));

console.log(budget);
// {
//   "max_pages": 5,
//   "max_items": 500,
//   "current_page": 1,
//   "is_limited": true
// }

// Use this to show pagination limits in UI
if (budget.is_limited && page >= budget.max_pages) {
  showMessage('Showing first 500 results. Refine your search for more.');
}
```

### 2. Handling Pagination Limit Errors

If you request a page beyond the limit, you'll get a 400 error:

```javascript
const response = await fetch('/api/v1/activities/?page=10');

if (response.status === 400) {
  const error = await response.json();
  // {
  //   "status": "error",
  //   "error": {
  //     "code": "pagination_limit_exceeded",
  //     "message": "Page 10 exceeds maximum allowed pages (5)",
  //     "details": {
  //       "requested_page": 10,
  //       "max_pages": 5,
  //       "limit_type": "max_pages"
  //     }
  //   }
  // }
}
```

### 3. Using Cache Headers (ETag)

Avoid unnecessary fetches with conditional requests:

```javascript
let cachedETag = null;
let cachedData = null;

async function fetchActivities() {
  const headers = {};
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }

  const response = await fetch('/api/v1/activities/', { headers });

  if (response.status === 304) {
    // Data unchanged, use cached version
    return cachedData;
  }

  // New data available
  cachedETag = response.headers.get('ETag');
  cachedData = await response.json();
  return cachedData;
}
```

### 4. Optimistic Creates

For instant UI feedback on create operations:

```javascript
async function createActivity(data) {
  // Generate local ID for optimistic UI
  const clientRequestId = crypto.randomUUID();

  // Immediately show in UI (optimistic)
  addToList({ ...data, id: clientRequestId, _pending: true });

  try {
    const response = await fetch('/api/v1/activities/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Request-ID': clientRequestId,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      // Reconcile: replace optimistic item with real one
      reconcileItem(clientRequestId, result.data);
    } else {
      // Rollback: mark as failed or remove
      markAsFailed(clientRequestId);
      const error = await response.json();
      showError(error.error.message);
    }
  } catch (e) {
    markAsFailed(clientRequestId);
    showError('Network error, please retry');
  }
}
```

## For Backend Developers

### 1. Configure Global Defaults

In `settings/base.py`:

```python
# Guardrail defaults
FETCH_GUARDRAIL_ENABLED = True
FETCH_GUARDRAIL_MAX_PAGES = 5
FETCH_GUARDRAIL_MAX_ITEMS = 500
FETCH_GUARDRAIL_WARNING_THRESHOLD = 0.8  # Log warning at 80% usage

# Optimistic create support
OPTIMISTIC_CREATE_ENABLED = True

# Observability
FETCH_GUARDRAIL_OBSERVABILITY_ENABLED = True
```

### 2. Per-Endpoint Overrides

Some endpoints need different limits:

```python
# settings/base.py
FETCH_GUARDRAIL_OVERRIDES = {
    '/api/v1/activities/': {
        'max_pages': 10,
        'max_items': 1000,
    },
    '/api/v1/audit-logs/': {
        'max_pages': 20,  # Audit needs more history
    },
}
```

### 3. Runtime Control via Feature Flags

Use B10 feature flags for runtime control:

```python
from settings.api import set_flag

# Disable guardrails globally (emergency)
set_flag('frontend_fetch_guardrails_enabled', False)

# Adjust default limit
set_flag('frontend_fetch_max_pages_default', 10)
```

### 4. Monitoring Budget Events

Check logs for budget warnings and exceeded events:

```bash
# Find endpoints hitting limits
grep "fetch_budget_exceeded" /var/log/app.log | jq '.endpoint' | sort | uniq -c

# Find endpoints near limit (warnings)
grep "fetch_budget_warning" /var/log/app.log | jq '.endpoint' | sort | uniq -c
```

Log format:
```json
{
  "event": "fetch_budget_exceeded",
  "endpoint": "/api/v1/activities/",
  "limit_type": "max_pages",
  "requested": 6,
  "limit": 5,
  "user_id": 123,
  "org_id": 456,
  "timestamp": "2026-02-03T12:00:00Z"
}
```

### 5. Opting Out for Specific Endpoints

If an endpoint needs unlimited pagination:

```python
from api.pagination import UnlimitedPagination

class AdminAuditViewSet(viewsets.ModelViewSet):
    pagination_class = UnlimitedPagination  # No guardrails
```

## Testing

### Unit Test Example

```python
import pytest
from django.test import override_settings
from rest_framework.test import APIClient

@pytest.mark.django_db
class TestPaginationGuardrails:
    def test_budget_header_included(self, api_client):
        response = api_client.get('/api/v1/activities/')
        assert 'X-Fetch-Budget' in response.headers
        budget = json.loads(response.headers['X-Fetch-Budget'])
        assert budget['max_pages'] == 5
        assert budget['is_limited'] is True

    def test_page_limit_enforced(self, api_client):
        response = api_client.get('/api/v1/activities/?page=10')
        assert response.status_code == 400
        assert response.json()['error']['code'] == 'pagination_limit_exceeded'

    @override_settings(FETCH_GUARDRAIL_ENABLED=False)
    def test_guardrails_can_be_disabled(self, api_client):
        response = api_client.get('/api/v1/activities/?page=10')
        assert response.status_code == 200  # No limit enforced
```

## Troubleshooting

### "Page X exceeds maximum allowed pages"

**Cause**: Client requested page beyond configured limit.

**Solution**:
1. Use search/filters to narrow results
2. Adjust `FETCH_GUARDRAIL_OVERRIDES` for this endpoint if justified
3. Check if `max_pages` feature flag was changed

### X-Fetch-Budget header missing

**Cause**: Endpoint might not use `BaseAPIPagination`.

**Solution**: Ensure viewset doesn't override `pagination_class` with non-guardrail class.

### ETag always changing

**Cause**: Results include items being frequently updated.

**Solution**: This is expected behavior. ETag is based on max `updated_at`.

### Optimistic create ID not echoed

**Cause**: `frontend_optimistic_create_enabled` flag is False.

**Solution**: Check feature flag setting or enable globally.
