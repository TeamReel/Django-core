---
work_package_id: "WP02"
subtasks:
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
title: "Pagination Guardrails"
phase: "Phase 2 - Core Implementation"
lane: "done"
assignee: ""
agent: "claude"
shell_pid: "7"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – Pagination Guardrails 🎯 MVP

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you begin addressing feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Extend `BaseAPIPagination` to enforce page/item limits
- Emit `X-Fetch-Budget` header on every paginated response
- Return HTTP 400 when limits exceeded
- Integrate with B10 feature flags for runtime control
- Support per-endpoint configuration overrides
- Add observability logging for budget events

**Success**: Request page 6 on any list endpoint → HTTP 400 with guardrail error + `X-Fetch-Budget` header

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (FR-001 through FR-005, FR-012 through FR-019)
- **Research Reference**: `kitty-specs/046-frontend-performance-guardrails/research.md` (Decision 1, 2, 4, 5)
- **Data Model Reference**: `kitty-specs/046-frontend-performance-guardrails/data-model.md` (FetchBudget, GuardrailEvent)
- **Target Files**:
  - `src/api/pagination.py` (modify existing)
  - `src/api/guardrails.py` (create new)
- **Constraint**: Zero breaking changes to existing API behavior when guardrails disabled

## Subtasks & Detailed Guidance

### Subtask T004 – Create `FetchBudget` dataclass

- **Purpose**: Runtime object to track pagination budget for each request
- **Steps**:
  1. Create `src/api/guardrails.py`
  2. Define the dataclass:
     ```python
     from dataclasses import dataclass
     import json

     @dataclass
     class FetchBudget:
         """Tracks pagination budget for a single request."""
         max_pages: int
         max_items: int
         current_page: int
         page_size: int
         is_limited: bool

         @property
         def usage_percent(self) -> float:
             """Calculate budget usage as percentage."""
             if not self.is_limited or self.max_pages == 0:
                 return 0.0
             return (self.current_page / self.max_pages) * 100

         def to_header_dict(self) -> dict:
             """Format for X-Fetch-Budget header."""
             return {
                 "max_pages": self.max_pages,
                 "max_items": self.max_items,
                 "current_page": self.current_page,
                 "is_limited": self.is_limited,
             }

         def to_header_json(self) -> str:
             """JSON string for HTTP header."""
             return json.dumps(self.to_header_dict())
     ```
- **Files**: `src/api/guardrails.py`
- **Parallel?**: No (needed by T005-T010)
- **Notes**: Keep it simple—this is a value object, not a Django model

### Subtask T005 – Add guardrail logic to `BaseAPIPagination`

- **Purpose**: Integrate budget checking into the existing pagination class
- **Steps**:
  1. Open `src/api/pagination.py`
  2. Import the new guardrails module and settings
  3. Override `paginate_queryset()` to check limits BEFORE querying:
     ```python
     from django.conf import settings
     from rest_framework.exceptions import ValidationError
     from .guardrails import FetchBudget, get_guardrail_config, log_budget_event

     class BaseAPIPagination(PageNumberPagination):
         # ... existing code ...

         def paginate_queryset(self, queryset, request, view=None):
             # Get guardrail config (respects feature flags and per-endpoint overrides)
             config = get_guardrail_config(request)

             if config['enabled']:
                 page_number = self.get_page_number(request, None)
                 if page_number > config['max_pages']:
                     # Log and reject
                     log_budget_event('exceeded', request, page_number, config)
                     raise ValidationError({
                         'detail': f"Page {page_number} exceeds maximum allowed pages ({config['max_pages']})",
                         'code': 'pagination_limit_exceeded',
                         'max_pages': config['max_pages'],
                     })

             # Store budget for header emission
             self._fetch_budget = FetchBudget(
                 max_pages=config['max_pages'],
                 max_items=config['max_items'],
                 current_page=self.get_page_number(request, None) or 1,
                 page_size=self.get_page_size(request),
                 is_limited=config['enabled'],
             )

             return super().paginate_queryset(queryset, request, view)
     ```
- **Files**: `src/api/pagination.py`
- **Parallel?**: No (core implementation)
- **Notes**: Check limit BEFORE `super()` call to avoid expensive query

### Subtask T006 – Implement `X-Fetch-Budget` header emission

- **Purpose**: Include budget metadata in every paginated response
- **Steps**:
  1. Override `get_paginated_response()` in `BaseAPIPagination`:
     ```python
     def get_paginated_response(self, data):
         response = super().get_paginated_response(data)

         # Add budget header if available
         if hasattr(self, '_fetch_budget') and self._fetch_budget:
             response['X-Fetch-Budget'] = self._fetch_budget.to_header_json()

             # Log warning if usage is high
             if self._fetch_budget.is_limited:
                 threshold = getattr(settings, 'FETCH_GUARDRAIL_WARNING_THRESHOLD', 0.8)
                 if self._fetch_budget.usage_percent >= threshold * 100:
                     log_budget_event('warning', self._request, self._fetch_budget.current_page, {
                         'max_pages': self._fetch_budget.max_pages,
                         'max_items': self._fetch_budget.max_items,
                     })

         return response
     ```
  2. Store request reference in `paginate_queryset()` for logging context
- **Files**: `src/api/pagination.py`
- **Parallel?**: No (depends on T005)
- **Notes**: Header is JSON string, not raw dict

### Subtask T007 – Add page limit enforcement with 400 response

- **Purpose**: Return proper error response when limit exceeded
- **Steps**:
  1. The limit check is in T005; ensure the error format matches spec:
     ```python
     # In guardrails.py, create a custom exception
     from rest_framework.exceptions import APIException

     class PaginationLimitExceeded(APIException):
         status_code = 400
         default_detail = 'Pagination limit exceeded'
         default_code = 'pagination_limit_exceeded'

         def __init__(self, requested_page: int, max_pages: int):
             detail = {
                 'status': 'error',
                 'error': {
                     'code': 'pagination_limit_exceeded',
                     'message': f'Page {requested_page} exceeds maximum allowed pages ({max_pages})',
                     'details': {
                         'requested_page': requested_page,
                         'max_pages': max_pages,
                         'limit_type': 'max_pages',
                     }
                 }
             }
             super().__init__(detail=detail)
     ```
  2. Use this exception in T005 instead of generic ValidationError
- **Files**: `src/api/guardrails.py`, `src/api/pagination.py`
- **Parallel?**: No (depends on T005)
- **Notes**: Error format must match envelope pattern from `EnvelopeJSONRenderer`

### Subtask T008 – Integrate B10 feature flags via `get_flag()`

- **Purpose**: Allow runtime control of guardrails without deployment
- **Steps**:
  1. Create `get_guardrail_config()` function in `guardrails.py`:
     ```python
     from settings.api import get_flag
     from django.conf import settings

     def get_guardrail_config(request) -> dict:
         """Get guardrail configuration, respecting feature flags and per-endpoint overrides."""
         # Check master switch (feature flag > setting)
         enabled = get_flag(
             'frontend_fetch_guardrails_enabled',
             default=getattr(settings, 'FETCH_GUARDRAIL_ENABLED', True)
         )

         # Get limits (feature flag > per-endpoint override > default setting)
         default_max_pages = get_flag(
             'frontend_fetch_max_pages_default',
             default=getattr(settings, 'FETCH_GUARDRAIL_MAX_PAGES', 5)
         )
         default_max_items = get_flag(
             'frontend_fetch_max_items_default',
             default=getattr(settings, 'FETCH_GUARDRAIL_MAX_ITEMS', 500)
         )

         # Check for per-endpoint override
         overrides = getattr(settings, 'FETCH_GUARDRAIL_OVERRIDES', {})
         endpoint_config = overrides.get(request.path, {})

         return {
             'enabled': enabled,
             'max_pages': endpoint_config.get('max_pages', default_max_pages),
             'max_items': endpoint_config.get('max_items', default_max_items),
         }
     ```
- **Files**: `src/api/guardrails.py`
- **Parallel?**: No (core dependency)
- **Notes**: Feature flag scope is global (no per-org/user for infrastructure)

### Subtask T009 – Implement per-endpoint override resolution

- **Purpose**: Allow different endpoints to have different limits
- **Steps**:
  1. The logic is in T008's `get_guardrail_config()`
  2. Add support for prefix matching (optional enhancement):
     ```python
     def _find_endpoint_override(path: str, overrides: dict) -> dict:
         """Find matching override, preferring exact match over prefix."""
         # Exact match first
         if path in overrides:
             return overrides[path]

         # Prefix match (longest prefix wins)
         matching = [(k, v) for k, v in overrides.items() if path.startswith(k)]
         if matching:
             matching.sort(key=lambda x: len(x[0]), reverse=True)
             return matching[0][1]

         return {}
     ```
- **Files**: `src/api/guardrails.py`
- **Parallel?**: No (part of T008 flow)
- **Notes**: Start with exact match; prefix matching is optional

### Subtask T010 – Add observability logging for budget events

- **Purpose**: Enable ops to monitor guardrail usage
- **Steps**:
  1. Create logging function in `guardrails.py`:
     ```python
     import logging
     from django.conf import settings

     logger = logging.getLogger(__name__)

     def log_budget_event(event_type: str, request, requested_page: int, config: dict) -> None:
         """Log a guardrail event for observability."""
         # Check if observability is enabled
         from settings.api import get_flag
         enabled = get_flag(
             'frontend_fetch_observability_enabled',
             default=getattr(settings, 'FETCH_GUARDRAIL_OBSERVABILITY_ENABLED', True)
         )
         if not enabled:
             return

         # Build log context
         extra = {
             'event': f'fetch_budget_{event_type}',
             'endpoint': request.path,
             'limit_type': 'max_pages',
             'requested': requested_page,
             'limit': config['max_pages'],
             'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
             'org_id': getattr(request.user, 'organisation_id', None) if hasattr(request, 'user') else None,
         }

         if event_type == 'exceeded':
             logger.warning('fetch_budget_exceeded', extra=extra)
         elif event_type == 'warning':
             extra['usage_percent'] = (requested_page / config['max_pages']) * 100
             logger.info('fetch_budget_warning', extra=extra)
     ```
- **Files**: `src/api/guardrails.py`
- **Parallel?**: No (completes the module)
- **Notes**: Use structured logging format for JSON parsing in production

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing pagination | Feature flag OFF by default in tests; gradual rollout |
| Performance overhead >5ms | Benchmark in tests; config lookup is O(1) |
| Incorrect page number extraction | Test edge cases (page=0, page=None, page="abc") |
| Feature flag import error | Graceful fallback to settings |

## Definition of Done Checklist

- [ ] T004: `FetchBudget` dataclass created in `guardrails.py`
- [ ] T005: `BaseAPIPagination.paginate_queryset()` checks limits
- [ ] T006: `X-Fetch-Budget` header emitted on responses
- [ ] T007: `PaginationLimitExceeded` exception returns 400
- [ ] T008: `get_guardrail_config()` integrates feature flags
- [ ] T009: Per-endpoint overrides resolved correctly
- [ ] T010: `log_budget_event()` logs structured events
- [ ] Manual test: `GET /api/v1/activities/?page=6` returns 400
- [ ] Manual test: `GET /api/v1/activities/?page=1` includes `X-Fetch-Budget` header
- [ ] No linting errors: `ruff check src/api/`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify limit check happens BEFORE database query
- Check error response matches envelope format
- Ensure feature flags properly override settings
- Confirm logging respects observability flag
- Test with guardrails disabled (should behave exactly like before)

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T19:34:58Z – claude – shell_pid=7 – lane=doing – Started implementation
- 2026-02-03T19:36:44Z – claude – shell_pid=7 – lane=for_review – Ready for review
- 2026-02-03T19:38:48Z – claude – shell_pid=7 – lane=done – Code review APPROVED without changes - All 7 subtasks verified and tested
