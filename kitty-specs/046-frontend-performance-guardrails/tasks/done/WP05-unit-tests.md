---
work_package_id: "WP05"
subtasks:
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
title: "Unit Tests"
phase: "Phase 2 - Core Implementation"
lane: "done"
assignee: ""
agent: "claude"
shell_pid: "42868"
review_status: "approved without changes"
reviewed_by: "claude"
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Unit Tests

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

- Achieve >85% code coverage on guardrail logic
- Unit tests for pagination guardrails, budget calculation, feature flags
- Unit tests for cache headers mixin
- Unit tests for optimistic create mixin

**Success**: `pytest tests/api/test_pagination_guardrails.py tests/api/test_cache_headers.py tests/api/test_optimistic_create.py -v` all pass

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (all user stories)
- **Target Files**:
  - `tests/api/test_pagination_guardrails.py` (create)
  - `tests/api/test_cache_headers.py` (create)
  - `tests/api/test_optimistic_create.py` (create)
- **Constraint**: Tests must be deterministic (no flaky tests)
- **Constraint**: Mock external calls (feature flags, logging)

## Subtasks & Detailed Guidance

### Subtask T018 – Unit tests for pagination guardrails

- **Purpose**: Test core guardrail logic in `BaseAPIPagination`
- **Steps**:
  1. Create `tests/api/test_pagination_guardrails.py`
  2. Test cases:
     ```python
     import pytest
     import json
     from unittest.mock import patch, MagicMock
     from django.test import override_settings
     from rest_framework.test import APIRequestFactory
     from api.pagination import BaseAPIPagination
     from api.guardrails import FetchBudget, PaginationLimitExceeded

     @pytest.fixture
     def factory():
         return APIRequestFactory()

     class TestPaginationGuardrails:
         """Test pagination guardrail enforcement."""

         @override_settings(
             FETCH_GUARDRAIL_ENABLED=True,
             FETCH_GUARDRAIL_MAX_PAGES=5,
         )
         @patch('api.guardrails.get_flag')
         def test_page_within_limit_succeeds(self, mock_get_flag, factory):
             """Page 3 of 5 should succeed."""
             mock_get_flag.return_value = True
             # ... test implementation

         @override_settings(
             FETCH_GUARDRAIL_ENABLED=True,
             FETCH_GUARDRAIL_MAX_PAGES=5,
         )
         @patch('api.guardrails.get_flag')
         def test_page_exceeds_limit_returns_400(self, mock_get_flag, factory):
             """Page 6 of 5 should return 400."""
             mock_get_flag.return_value = True
             # ... test implementation

         @override_settings(FETCH_GUARDRAIL_ENABLED=False)
         @patch('api.guardrails.get_flag')
         def test_guardrails_disabled_allows_any_page(self, mock_get_flag, factory):
             """With guardrails off, page 100 should work."""
             mock_get_flag.return_value = False
             # ... test implementation

         def test_x_fetch_budget_header_included(self, factory):
             """Response should include X-Fetch-Budget header."""
             # ... test implementation

         def test_error_response_format(self, factory):
             """Error response should match envelope format."""
             # ... test implementation
     ```
- **Files**: `tests/api/test_pagination_guardrails.py`
- **Parallel?**: No (foundational tests)
- **Notes**: Use `@override_settings` for config tests, `@patch` for feature flags

### Subtask T019 – Unit tests for budget calculation

- **Purpose**: Test `FetchBudget` dataclass methods
- **Steps**:
  1. Add to `tests/api/test_pagination_guardrails.py`:
     ```python
     class TestFetchBudget:
         """Test FetchBudget dataclass."""

         def test_usage_percent_calculation(self):
             """Usage percent should be current_page / max_pages * 100."""
             budget = FetchBudget(
                 max_pages=5,
                 max_items=500,
                 current_page=4,
                 page_size=100,
                 is_limited=True,
             )
             assert budget.usage_percent == 80.0

         def test_usage_percent_when_not_limited(self):
             """Usage percent should be 0 when not limited."""
             budget = FetchBudget(
                 max_pages=5,
                 max_items=500,
                 current_page=4,
                 page_size=100,
                 is_limited=False,
             )
             assert budget.usage_percent == 0.0

         def test_to_header_dict(self):
             """Header dict should have correct structure."""
             budget = FetchBudget(
                 max_pages=5,
                 max_items=500,
                 current_page=1,
                 page_size=100,
                 is_limited=True,
             )
             header = budget.to_header_dict()
             assert header == {
                 'max_pages': 5,
                 'max_items': 500,
                 'current_page': 1,
                 'is_limited': True,
             }

         def test_to_header_json(self):
             """Header JSON should be valid."""
             budget = FetchBudget(
                 max_pages=5,
                 max_items=500,
                 current_page=1,
                 page_size=100,
                 is_limited=True,
             )
             header_json = budget.to_header_json()
             parsed = json.loads(header_json)
             assert parsed['max_pages'] == 5

         def test_max_items_limit_hit_before_max_pages(self):
             """Edge case: max_items hit before max_pages (small page_size)."""
             # Scenario: page_size=1, max_pages=5, max_items=3
             # Requesting page 4 would fetch items 4+, exceeding max_items=3
             # System must enforce whichever limit is hit first (edge case from spec)
             budget = FetchBudget(
                 max_pages=5,
                 max_items=3,
                 current_page=4,
                 page_size=1,
                 is_limited=True,
             )
             # Verify that current_page * page_size exceeds max_items
             assert budget.current_page * budget.page_size > budget.max_items
     ```
- **Files**: `tests/api/test_pagination_guardrails.py`
- **Parallel?**: Yes (pure unit tests)
- **Notes**: No database needed for dataclass tests; includes edge case for small page_size per spec

### Subtask T020 – Unit tests for feature flag integration

- **Purpose**: Test that feature flags properly override settings
- **Steps**:
  1. Add to `tests/api/test_pagination_guardrails.py`:
     ```python
     class TestFeatureFlagIntegration:
         """Test feature flag integration."""

         @override_settings(FETCH_GUARDRAIL_MAX_PAGES=5)
         @patch('api.guardrails.get_flag')
         def test_feature_flag_overrides_setting(self, mock_get_flag):
             """Feature flag should override Django setting."""
             mock_get_flag.side_effect = lambda key, default: {
                 'frontend_fetch_guardrails_enabled': True,
                 'frontend_fetch_max_pages_default': 10,  # Override
             }.get(key, default)

             from api.guardrails import get_guardrail_config
             request = MagicMock()
             request.path = '/api/v1/test/'

             config = get_guardrail_config(request)
             assert config['max_pages'] == 10  # Flag value, not setting

         @patch('api.guardrails.get_flag')
         def test_disabled_flag_skips_guardrails(self, mock_get_flag):
             """When flag is False, guardrails should be disabled."""
             mock_get_flag.return_value = False

             from api.guardrails import get_guardrail_config
             request = MagicMock()
             request.path = '/api/v1/test/'

             config = get_guardrail_config(request)
             assert config['enabled'] is False
     ```
- **Files**: `tests/api/test_pagination_guardrails.py`
- **Parallel?**: Yes (isolated tests)
- **Notes**: Always mock `get_flag()` to avoid external dependencies

### Subtask T021 – Unit tests for cache headers mixin

- **Purpose**: Test `CacheHeadersMixin` functionality
- **Steps**:
  1. Create `tests/api/test_cache_headers.py`:
     ```python
     import pytest
     import hashlib
     from datetime import datetime, timezone
     from unittest.mock import MagicMock, patch
     from django.db.models import Max
     from api.mixins import CacheHeadersMixin

     class TestCacheHeadersMixin:
         """Test CacheHeadersMixin functionality."""

         def test_etag_generation(self):
             """ETag should be MD5 hash of max updated_at."""
             # Create mock queryset
             mock_queryset = MagicMock()
             timestamp = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
             mock_queryset.exists.return_value = True
             mock_queryset.aggregate.return_value = {'max_updated': timestamp}

             mixin = CacheHeadersMixin()
             mixin.cache_timestamp_field = 'updated_at'

             etag = mixin._generate_etag(mock_queryset)

             expected = hashlib.md5(timestamp.isoformat().encode()).hexdigest()
             assert etag == expected

         def test_etag_none_for_empty_queryset(self):
             """ETag should be None for empty queryset."""
             mock_queryset = MagicMock()
             mock_queryset.exists.return_value = False

             mixin = CacheHeadersMixin()
             etag = mixin._generate_etag(mock_queryset)

             assert etag is None

         def test_if_none_match_returns_304(self):
             """Matching If-None-Match should return 304."""
             # ... test implementation

         def test_last_modified_format(self):
             """Last-Modified should use RFC 7231 format."""
             mixin = CacheHeadersMixin()
             dt = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)

             formatted = mixin._format_http_date(dt)

             assert 'Mon, 03 Feb 2026' in formatted
             assert 'GMT' in formatted
     ```
- **Files**: `tests/api/test_cache_headers.py`
- **Parallel?**: Yes (independent module)
- **Notes**: Mock queryset to avoid database

### Subtask T022 – Unit tests for optimistic create mixin

- **Purpose**: Test `OptimisticCreateMixin` functionality
- **Steps**:
  1. Create `tests/api/test_optimistic_create.py`:
     ```python
     import pytest
     from unittest.mock import MagicMock, patch
     from django.test import override_settings
     from api.mixins import OptimisticCreateMixin

     class TestOptimisticCreateMixin:
         """Test OptimisticCreateMixin functionality."""

         @patch('api.mixins.get_flag')
         def test_client_request_id_echoed(self, mock_get_flag):
             """X-Client-Request-ID should be echoed in response."""
             mock_get_flag.return_value = True

             mixin = OptimisticCreateMixin()
             mixin._client_request_id = '550e8400-e29b-41d4-a716-446655440000'

             response = MagicMock()
             mixin._add_optimistic_headers(response)

             response.__setitem__.assert_called_with(
                 'X-Client-Request-ID',
                 '550e8400-e29b-41d4-a716-446655440000'
             )

         @patch('api.mixins.get_flag')
         def test_no_header_when_disabled(self, mock_get_flag):
             """Header should not be set when feature flag is off."""
             mock_get_flag.return_value = False

             mixin = OptimisticCreateMixin()
             mixin._client_request_id = '550e8400-e29b-41d4-a716-446655440000'

             response = MagicMock()
             mixin._add_optimistic_headers(response)

             response.__setitem__.assert_not_called()

         @patch('api.mixins.get_flag')
         def test_no_header_when_not_provided(self, mock_get_flag):
             """No header should be set if client didn't provide one."""
             mock_get_flag.return_value = True

             mixin = OptimisticCreateMixin()
             mixin._client_request_id = None

             response = MagicMock()
             mixin._add_optimistic_headers(response)

             response.__setitem__.assert_not_called()

         def test_uuid_validation_warning(self):
             """Invalid UUID should log warning but still work."""
             mixin = OptimisticCreateMixin()

             with patch('api.mixins.logger') as mock_logger:
                 result = mixin._validate_client_request_id('not-a-uuid')
                 assert result is False
                 mock_logger.warning.assert_called_once()

         def test_validation_error_response_structure(self):
             """Validation errors must be structured for UI rollback (FR-011)."""
             # Test that create() with invalid data returns structured error
             # Error response must include 'error' key with 'code' and 'message'
             # and optional 'details' for field-level errors
             # Implementation handles via DRF serializer validation + envelope renderer
             pass
     ```
- **Files**: `tests/api/test_optimistic_create.py`
- **Parallel?**: Yes (independent module)
- **Notes**: Test both enabled and disabled states; include FR-011 validation error structure test

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tests depend on database state | Use fixtures with explicit data |
| Flaky tests from timing | Use fixed timestamps, mock datetime |
| Mock setup errors | Verify mock calls in assertions |

## Parallel Opportunities

- T019-T022 can all proceed in parallel (different modules)
- **Early Start**: T018-T020 can begin immediately after WP02; only T021-T022 require WP03/WP04

## Dependencies

- Depends on WP02, WP03, WP04 (implementation must exist)
- **Phased**: T018-T020 depend only on WP02; T021 depends on WP03; T022 depends on WP04

## Definition of Done Checklist

- [ ] T018: Pagination guardrail tests written
- [ ] T019: Budget calculation tests written
- [ ] T020: Feature flag integration tests written
- [ ] T021: Cache headers mixin tests written
- [ ] T022: Optimistic create mixin tests written
- [ ] All tests pass: `pytest tests/api/test_*.py -v`
- [ ] Coverage >85%: `pytest --cov=api tests/api/ --cov-report=term-missing`
- [ ] No linting errors: `ruff check tests/api/`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify tests cover both happy path and error cases
- Check that mocks are used appropriately (no real DB calls)
- Ensure tests are deterministic (run twice, same result)
- Confirm edge cases are covered (empty queryset, None values)

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T19:49:38Z – claude – shell_pid=10500 – lane=doing – Started WP05 implementation
- 2026-02-03T20:25:09Z – claude – shell_pid=42868 – lane=for_review – Completed implementation - Unit tests added and passing
- 2026-02-03T20:27:03Z – claude – shell_pid=42868 – lane=done – Code review APPROVED without changes - Unit tests verified
