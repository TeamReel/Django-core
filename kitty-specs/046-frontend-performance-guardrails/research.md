# Research: Feature 046 – Frontend Performance Guardrails

**Created**: 2026-02-03
**Status**: Complete

## Research Summary

### Decision 1: Guardrail Implementation Pattern

**Decision**: Extend existing `BaseAPIPagination` class

**Rationale**:
- `BaseAPIPagination` already exists in `src/api/pagination.py` and is the `DEFAULT_PAGINATION_CLASS`
- Adding guardrail logic to this class provides automatic coverage for all endpoints
- No changes needed to individual views (zero-touch upgrade)
- DRF-native pattern, not fighting the framework

**Alternatives Considered**:
1. **Middleware approach**: Would require parsing response bodies after serialization—too late in the request cycle, harder to enforce limits before the expensive query runs
2. **ViewSet Mixin**: Would require updating every ViewSet or base class—more invasive
3. **New pagination class**: Would duplicate existing `BaseAPIPagination` functionality

### Decision 2: Feature Flag Integration

**Decision**: Use existing B10 `get_flag()` API with global scope flags

**Rationale**:
- B10 feature flags are production-ready with scope hierarchy (global → org → project → user)
- Global scope is appropriate for infrastructure features like guardrails
- `get_flag()` supports caching and fallback defaults

**Implementation**:
```python
from settings.api import get_flag

# In pagination class
enabled = get_flag('frontend_fetch_guardrails_enabled', default=True)
max_pages = get_flag('frontend_fetch_max_pages_default', default=5)
```

### Decision 3: Cache Headers (ETag/If-None-Match)

**Decision**: Add `CacheHeadersMixin` to base ViewSet classes

**Rationale**:
- Cache headers are a cross-cutting concern separate from pagination
- Mixin pattern allows selective application (some endpoints may not want caching)
- ETag based on `max(updated_at)` from queryset—efficient single DB call

**Implementation**:
- `ETag` header: MD5 hash of `max(updated_at).isoformat()` from result set
- `If-None-Match` support: Compare incoming header, return 304 if match
- `Last-Modified`: ISO timestamp of `max(updated_at)`

### Decision 4: Observability Logging

**Decision**: Use Python structured logging with existing B20 patterns

**Rationale**:
- Project already uses structured logging
- Log at INFO level for exceeded limits, WARNING for >80% budget usage
- Include: endpoint, limit_type, requested_value, limit_value, user_id, org_id

**Log Format**:
```python
logger.warning(
    "fetch_budget_warning",
    extra={
        "endpoint": request.path,
        "limit_type": "max_pages",
        "requested": 4,
        "limit": 5,
        "usage_percent": 80,
        "user_id": request.user.id,
        "org_id": getattr(request.user, 'organisation_id', None),
    }
)
```

### Decision 5: Per-Endpoint Overrides

**Decision**: Django settings dict keyed by endpoint path pattern

**Rationale**:
- Settings-based configuration allows ops changes without code deployment
- Path patterns support wildcards for flexibility
- Consistent with Django idioms

**Configuration**:
```python
# settings/base.py
FETCH_GUARDRAIL_OVERRIDES = {
    '/api/v1/activities/': {'max_pages': 10, 'max_items': 1000},
    '/api/v1/users/': {'max_pages': 3, 'max_items': 150},
    # Default if not matched: global settings
}
```

## Integration Points

### Existing Code to Modify

1. **`src/api/pagination.py`** – Add guardrail logic to `BaseAPIPagination`
2. **`src/config/settings/base.py`** – Add guardrail settings and feature flag defaults
3. **`src/api/__init__.py`** – Export new mixin

### Existing Code to Leverage

1. **`src/settings/api.py`** – `get_flag()` for feature flag checks
2. **`src/api/renderers.py`** – `EnvelopeJSONRenderer` already handles response wrapping
3. **`src/api/exceptions.py`** – `envelope_exception_handler` for consistent errors

### New Files

1. **`src/api/guardrails.py`** – Guardrail logic, budget tracking, mixin
2. **`tests/api/test_guardrails.py`** – Unit tests for guardrail logic

## Dependencies

- **B10 Feature Flags**: ✅ Available via `settings.api.get_flag()`
- **B20 Structured Logging**: ✅ Available via Python logging
- **DRF Pagination**: ✅ `BaseAPIPagination` exists as default
