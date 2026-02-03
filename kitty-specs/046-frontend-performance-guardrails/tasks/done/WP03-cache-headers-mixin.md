---
work_package_id: "WP03"
subtasks:
  - "T011"
  - "T012"
  - "T013"
  - "T014"
title: "Cache Headers Mixin"
phase: "Phase 2 - Core Implementation"
lane: "done"
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

# Work Package Prompt: WP03 – Cache Headers Mixin

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

- Create `CacheHeadersMixin` for ViewSets
- Generate ETag from `max(updated_at)` on list responses
- Support `If-None-Match` header with HTTP 304 response
- Add `Last-Modified` header on detail responses

**Success**: `GET /api/v1/activities/` with `If-None-Match: <etag>` returns HTTP 304

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (FR-006 through FR-008)
- **Research Reference**: `kitty-specs/046-frontend-performance-guardrails/research.md` (Decision 3)
- **Data Model Reference**: `kitty-specs/046-frontend-performance-guardrails/data-model.md` (Response Headers)
- **Target Files**:
  - `src/api/mixins.py` (create or extend)
- **Constraint**: Mixin pattern for selective application; not all endpoints need caching

## Subtasks & Detailed Guidance

### Subtask T011 – Create `CacheHeadersMixin` class

- **Purpose**: Provide reusable caching behavior for ViewSets
- **Steps**:
  1. Create or open `src/api/mixins.py`
  2. Define the mixin class structure:
     ```python
     import hashlib
     from datetime import datetime
     from django.db.models import Max
     from django.http import HttpResponse
     from rest_framework import status

     class CacheHeadersMixin:
         """
         Mixin that adds ETag and Last-Modified headers to responses.

         For list views: ETag based on max(updated_at)
         For detail views: Last-Modified based on instance.updated_at

         Apply to ViewSets that benefit from client-side caching.
         """

         # Override in subclass to specify the timestamp field
         cache_timestamp_field = 'updated_at'

         def finalize_response(self, request, response, *args, **kwargs):
             response = super().finalize_response(request, response, *args, **kwargs)

             # Only add cache headers for successful GET requests
             if request.method != 'GET' or response.status_code >= 400:
                 return response

             # Determine if list or detail view
             if self.action == 'list':
                 self._add_list_cache_headers(request, response)
             elif self.action == 'retrieve':
                 self._add_detail_cache_headers(request, response)

             return response
     ```
- **Files**: `src/api/mixins.py`
- **Parallel?**: No (base structure needed for T012-T014)
- **Notes**: Use `finalize_response()` to access both request and response

### Subtask T012 – Implement ETag generation from `max(updated_at)`

- **Purpose**: Generate consistent ETag for list responses
- **Steps**:
  1. Add method to `CacheHeadersMixin`:
     ```python
     def _generate_etag(self, queryset) -> str | None:
         """Generate ETag from max updated_at timestamp."""
         if not queryset.exists():
             return None

         max_updated = queryset.aggregate(
             max_updated=Max(self.cache_timestamp_field)
         )['max_updated']

         if max_updated is None:
             return None

         # MD5 hash of ISO timestamp
         timestamp_str = max_updated.isoformat()
         return hashlib.md5(timestamp_str.encode()).hexdigest()

     def _add_list_cache_headers(self, request, response):
         """Add ETag header to list responses."""
         # Get the queryset from the view
         queryset = self.filter_queryset(self.get_queryset())

         etag = self._generate_etag(queryset)
         if etag:
             response['ETag'] = f'"{etag}"'

             # Also add Last-Modified from the same timestamp
             max_updated = queryset.aggregate(
                 max_updated=Max(self.cache_timestamp_field)
             )['max_updated']
             if max_updated:
                 response['Last-Modified'] = self._format_http_date(max_updated)
     ```
- **Files**: `src/api/mixins.py`
- **Parallel?**: No (depends on T011)
- **Notes**: ETag must be quoted per HTTP spec; use weak ETags if needed (`W/"etag"`)

### Subtask T013 – Add `If-None-Match` handling with 304 response

- **Purpose**: Return 304 Not Modified when ETag matches
- **Steps**:
  1. Override `list()` method to check incoming ETag:
     ```python
     from rest_framework.response import Response

     def list(self, request, *args, **kwargs):
         """Override list to support If-None-Match."""
         # Check for conditional request
         if_none_match = request.headers.get('If-None-Match')

         if if_none_match:
             # Generate current ETag
             queryset = self.filter_queryset(self.get_queryset())
             current_etag = self._generate_etag(queryset)

             if current_etag:
                 # Compare (strip quotes from incoming header)
                 incoming_etag = if_none_match.strip('"').strip("'")
                 if incoming_etag == current_etag:
                     response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
                     response['ETag'] = f'"{current_etag}"'
                     return response

         # Normal list processing
         return super().list(request, *args, **kwargs)
     ```
  2. Ensure 304 response includes ETag header
- **Files**: `src/api/mixins.py`
- **Parallel?**: No (depends on T012)
- **Notes**: 304 must NOT include response body

### Subtask T014 – Implement `Last-Modified` header for detail views

- **Purpose**: Provide cache validation for individual resources
- **Steps**:
  1. Add method for detail views:
     ```python
     from email.utils import format_datetime
     from datetime import timezone

     def _format_http_date(self, dt: datetime) -> str:
         """Format datetime as RFC 7231 HTTP-date."""
         if dt.tzinfo is None:
             dt = dt.replace(tzinfo=timezone.utc)
         return format_datetime(dt, usegmt=True)

     def _add_detail_cache_headers(self, request, response):
         """Add Last-Modified header to detail responses."""
         # Get the instance from response data or re-fetch
         instance = self.get_object()

         updated_at = getattr(instance, self.cache_timestamp_field, None)
         if updated_at:
             response['Last-Modified'] = self._format_http_date(updated_at)

             # Also add ETag for detail views
             timestamp_str = updated_at.isoformat()
             etag = hashlib.md5(timestamp_str.encode()).hexdigest()
             response['ETag'] = f'"{etag}"'
     ```
  2. Consider supporting `If-Modified-Since` header (optional)
- **Files**: `src/api/mixins.py`
- **Parallel?**: Yes (independent of T012-T013 ETag flow)
- **Notes**: RFC 7231 date format: `Mon, 03 Feb 2026 12:00:00 GMT`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Extra DB query for ETag | Use `.aggregate()` which is single query |
| ETag changes on unrelated updates | Only use `updated_at` field, nothing else |
| 304 caching issues in browsers | Ensure ETag is quoted correctly |
| Timezone issues in Last-Modified | Always convert to UTC |

## Definition of Done Checklist

- [ ] T011: `CacheHeadersMixin` class created in `mixins.py`
- [ ] T012: `_generate_etag()` method implemented
- [ ] T013: `If-None-Match` returns 304 when matched
- [ ] T014: `Last-Modified` header added to detail views
- [ ] Manual test: List response includes `ETag` header
- [ ] Manual test: Request with matching `If-None-Match` returns 304
- [ ] Manual test: Detail response includes `Last-Modified` header
- [ ] No linting errors: `ruff check src/api/`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify ETag is quoted (`"abc123"` not `abc123`)
- Check 304 response has no body
- Ensure Last-Modified uses correct RFC 7231 format
- Confirm `.aggregate()` is used (not queryset iteration)
- Test with ViewSet that doesn't have `updated_at` field

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T19:42:37Z – claude – shell_pid=10500 – lane=doing – Started WP03 implementation
- 2026-02-03T19:43:55Z – claude – shell_pid=10500 – lane=for_review – Completed implementation - Ready for review
- 2026-02-03T19:47:23Z – claude – shell_pid=10500 – lane=done – Code review APPROVED without changes - All 4 subtasks verified and tested
