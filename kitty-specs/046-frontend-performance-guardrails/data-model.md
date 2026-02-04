# Data Model: Feature 046 – Frontend Performance Guardrails

**Created**: 2026-02-03
**Status**: Complete

## Overview

This feature introduces **no new database models**. All configuration is stored in:
1. Django settings (static defaults)
2. Existing B10 FeatureFlag model (runtime overrides)

## Configuration Entities

### FetchGuardrailConfig (Settings-based)

**Purpose**: Default guardrail limits and per-endpoint overrides

**Location**: `src/config/settings/base.py`

```python
# Default guardrail settings
FETCH_GUARDRAIL_ENABLED = True
FETCH_GUARDRAIL_MAX_PAGES = 5
FETCH_GUARDRAIL_MAX_ITEMS = 500  # max_pages × page_size cap
FETCH_GUARDRAIL_WARNING_THRESHOLD = 0.8  # 80% budget usage triggers warning log

# Per-endpoint overrides (optional)
FETCH_GUARDRAIL_OVERRIDES = {
    # 'endpoint_path_pattern': {'max_pages': N, 'max_items': N}
}

# Optimistic create settings
OPTIMISTIC_CREATE_ENABLED = True

# Observability settings
FETCH_GUARDRAIL_OBSERVABILITY_ENABLED = True
```

### Feature Flags (B10 Integration)

**Purpose**: Runtime control without deployment

**Model**: Existing `settings.FeatureFlag`

| Flag Key | Type | Default | Description |
|----------|------|---------|-------------|
| `frontend_fetch_guardrails_enabled` | bool | True | Master switch for pagination guardrails |
| `frontend_fetch_max_pages_default` | int | 5 | Default max pages limit |
| `frontend_fetch_max_items_default` | int | 500 | Default max items limit |
| `frontend_optimistic_create_enabled` | bool | True | Enable X-Client-Request-ID echo |
| `frontend_fetch_observability_enabled` | bool | True | Enable budget logging |

**Scope**: Global (no per-org/per-user override needed for infrastructure)

## Runtime Objects (Non-persisted)

### FetchBudget

**Purpose**: Track request budget consumption during pagination

**Fields**:
- `max_pages: int` – Configured page limit
- `max_items: int` – Configured item limit
- `current_page: int` – Requested page number
- `page_size: int` – Items per page
- `is_limited: bool` – Whether guardrails are active
- `usage_percent: float` – Percentage of budget consumed

**Lifecycle**: Created per-request, discarded after response

### GuardrailEvent

**Purpose**: Structured log payload for observability

**Fields**:
- `event_type: str` – "budget_exceeded" | "budget_warning"
- `endpoint: str` – Request path
- `limit_type: str` – "max_pages" | "max_items"
- `requested_value: int` – What client requested
- `limit_value: int` – What was configured
- `usage_percent: float` – Budget consumption percentage
- `user_id: int | None` – Authenticated user ID
- `org_id: int | None` – User's organisation ID
- `timestamp: datetime` – Event time

**Persistence**: Logged only, not stored in database

## Response Headers

### X-Fetch-Budget (List Responses)

**Format**: JSON string in HTTP header

```json
{
  "max_pages": 5,
  "max_items": 500,
  "current_page": 1,
  "is_limited": true
}
```

### ETag (List Responses)

**Format**: MD5 hash of max `updated_at` timestamp

```
ETag: "a1b2c3d4e5f6..."
```

### Last-Modified (Detail Responses)

**Format**: RFC 7231 HTTP-date

```
Last-Modified: Mon, 03 Feb 2026 12:00:00 GMT
```

### X-Client-Request-ID (Create Responses)

**Format**: Echo of client-provided UUID

```
X-Client-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

## Entity Relationships

```
┌─────────────────────┐
│   Django Settings   │
│  (FETCH_GUARDRAIL_*)│
└─────────┬───────────┘
          │ defaults
          ▼
┌─────────────────────┐
│   FeatureFlag       │ (B10)
│   (runtime override)│
└─────────┬───────────┘
          │ get_flag()
          ▼
┌─────────────────────┐
│  BaseAPIPagination  │
│  + guardrail logic  │
└─────────┬───────────┘
          │ generates
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│    FetchBudget      │     │   GuardrailEvent    │
│  (per-request state)│     │   (log payload)     │
└─────────────────────┘     └─────────────────────┘
```

## Migration Notes

**No migrations required** – This feature uses:
1. Django settings (no DB)
2. Existing FeatureFlag model (no schema changes)
3. HTTP headers (no DB)
4. Structured logs (no DB)
