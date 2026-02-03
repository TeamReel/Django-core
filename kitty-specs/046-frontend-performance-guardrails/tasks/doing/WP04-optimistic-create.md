---
work_package_id: "WP04"
subtasks:
  - "T015"
  - "T016"
  - "T017"
title: "Optimistic Create Support"
phase: "Phase 2 - Core Implementation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "10500"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP04 – Optimistic Create Support

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

- Create `OptimisticCreateMixin` for ViewSets
- Echo `X-Client-Request-ID` header on create responses
- Ensure `created_at` includes millisecond precision in responses

**Success**: `POST /api/v1/activities/` with `X-Client-Request-ID: uuid` echoes the header back

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (FR-009 through FR-011)
- **Research Reference**: `kitty-specs/046-frontend-performance-guardrails/research.md`
- **Data Model Reference**: `kitty-specs/046-frontend-performance-guardrails/data-model.md` (X-Client-Request-ID header)
- **Target Files**:
  - `src/api/mixins.py` (extend with new mixin)
- **Constraint**: Only echo header when feature flag is enabled

## Subtasks & Detailed Guidance

### Subtask T015 – Create `OptimisticCreateMixin`

- **Purpose**: Provide reusable optimistic create behavior for ViewSets
- **Steps**:
  1. Open `src/api/mixins.py`
  2. Add the mixin class:
     ```python
     from django.conf import settings
     from settings.api import get_flag

     class OptimisticCreateMixin:
         """
         Mixin that supports optimistic UI patterns for create operations.

         Features:
         - Echoes X-Client-Request-ID header for reconciliation
         - Ensures created_at has millisecond precision

         Apply to ViewSets where frontends use optimistic creates.
         """

         def create(self, request, *args, **kwargs):
             """Override create to capture client request ID."""
             # Store the client request ID for later
             self._client_request_id = request.headers.get('X-Client-Request-ID')
             return super().create(request, *args, **kwargs)

         def finalize_response(self, request, response, *args, **kwargs):
             response = super().finalize_response(request, response, *args, **kwargs)

             # Echo client request ID on create responses
             if request.method == 'POST' and hasattr(self, '_client_request_id'):
                 self._add_optimistic_headers(response)

             return response

         def _add_optimistic_headers(self, response):
             """Add headers for optimistic create reconciliation."""
             # Check feature flag
             enabled = get_flag(
                 'frontend_optimistic_create_enabled',
                 default=getattr(settings, 'OPTIMISTIC_CREATE_ENABLED', True)
             )

             if not enabled:
                 return

             # Echo the client request ID
             if self._client_request_id:
                 response['X-Client-Request-ID'] = self._client_request_id
     ```
- **Files**: `src/api/mixins.py`
- **Parallel?**: Yes (independent of WP02, WP03)
- **Notes**: Mixin can be combined with `CacheHeadersMixin`

### Subtask T016 – Implement `X-Client-Request-ID` echo

- **Purpose**: Enable frontend to correlate optimistic items with server responses
- **Steps**:
  1. The core logic is in T015
  2. Add validation for UUID format (optional but recommended):
     ```python
     import uuid
     import logging

     logger = logging.getLogger(__name__)

     def _validate_client_request_id(self, value: str) -> bool:
         """Validate that the client request ID is a valid UUID."""
         try:
             uuid.UUID(value)
             return True
         except (ValueError, TypeError):
             logger.warning(
                 'invalid_client_request_id',
                 extra={'value': value[:50] if value else None}
             )
             return False
     ```
  3. Still echo even if invalid (log warning only)
- **Files**: `src/api/mixins.py`
- **Parallel?**: Yes (part of T015 but conceptually separate)
- **Notes**: Don't reject requests with invalid IDs—just log and echo anyway

### Subtask T017 – Ensure `created_at` millisecond precision

- **Purpose**: Provide precise timestamps for optimistic UI ordering
- **Steps**:
  1. This is typically already handled by Django's `DateTimeField`
  2. Verify serializers expose `created_at` with proper format:
     ```python
     # In your serializers, ensure:
     class BaseSerializer(serializers.ModelSerializer):
         created_at = serializers.DateTimeField(
             format='%Y-%m-%dT%H:%M:%S.%fZ',  # ISO 8601 with microseconds
             read_only=True
         )
     ```
  3. Check if there's a base serializer that can be updated
  4. If using DRF settings, ensure:
     ```python
     REST_FRAMEWORK = {
         'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S.%fZ',
         # ...
     }
     ```
- **Files**: `src/api/serializers.py` or `src/config/settings/base.py`
- **Parallel?**: Yes (independent of T015, T016)
- **Notes**: Microsecond precision (`%f`) includes milliseconds

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Header not echoed on errors | Check in `finalize_response` regardless of status |
| Invalid UUID causes issues | Log warning, still echo |
| Precision lost in serialization | Explicitly set datetime format |

## Definition of Done Checklist

- [ ] T015: `OptimisticCreateMixin` class created
- [ ] T016: `X-Client-Request-ID` echoed on POST responses
- [ ] T017: `created_at` includes millisecond precision
- [ ] Manual test: POST with header → header echoed in response
- [ ] Manual test: POST without header → no error, normal response
- [ ] Manual test: Check `created_at` format in response body
- [ ] No linting errors: `ruff check src/api/`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify header is echoed even on 4xx responses (for UI rollback)
- Check UUID validation logs warning but doesn't reject
- Confirm datetime format includes milliseconds
- Test with feature flag disabled (header should NOT be echoed)

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T19:44:12Z – claude – shell_pid=10500 – lane=doing – Started WP04 implementation
