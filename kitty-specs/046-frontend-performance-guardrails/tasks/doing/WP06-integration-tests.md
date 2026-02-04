---
work_package_id: "WP06"
subtasks:
  - "T023"
  - "T024"
  - "T025"
  - "T026"
title: "Integration Tests"
phase: "Phase 2 - Core Implementation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "42868"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP06 – Integration Tests

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

- End-to-end validation of all user stories
- Test real HTTP requests against running API
- Verify response headers and status codes
- Test feature flag toggle behavior

**Success**: `pytest tests/integration/test_guardrail_integration.py -v` all pass

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (User Stories 1-5)
- **Target Files**:
  - `tests/integration/test_guardrail_integration.py` (create)
- **Constraint**: Tests require database (use `@pytest.mark.django_db`)
- **Constraint**: Create test fixtures with known data

## Subtasks & Detailed Guidance

### Subtask T023 – Integration test: page limit enforcement

- **Purpose**: End-to-end test of User Story 1 (Pagination Guardrails)
- **Steps**:
  1. Create `tests/integration/test_guardrail_integration.py`
  2. Implement tests:
     ```python
     import pytest
     import json
     from django.test import override_settings
     from rest_framework.test import APIClient
     from rest_framework import status

     @pytest.fixture
     def api_client():
         return APIClient()

     @pytest.fixture
     def authenticated_client(api_client, django_user_model):
         user = django_user_model.objects.create_user(
             username='testuser',
             email='test@example.com',
             password='testpass123'
         )
         api_client.force_authenticate(user=user)
         return api_client

     @pytest.mark.django_db
     class TestPaginationLimitEnforcement:
         """Integration tests for User Story 1: Pagination Guardrails."""

         @override_settings(
             FETCH_GUARDRAIL_ENABLED=True,
             FETCH_GUARDRAIL_MAX_PAGES=5,
         )
         def test_page_within_limit_returns_200(self, authenticated_client):
             """US1.AC2: Request within limits succeeds with budget header."""
             response = authenticated_client.get('/api/v1/activities/?page=1')

             assert response.status_code == status.HTTP_200_OK
             assert 'X-Fetch-Budget' in response.headers

             budget = json.loads(response.headers['X-Fetch-Budget'])
             assert budget['max_pages'] == 5
             assert budget['current_page'] == 1
             assert budget['is_limited'] is True

         @override_settings(
             FETCH_GUARDRAIL_ENABLED=True,
             FETCH_GUARDRAIL_MAX_PAGES=5,
         )
         def test_page_exceeds_limit_returns_400(self, authenticated_client):
             """US1.AC1: Page 6 exceeds limit, returns 400."""
             response = authenticated_client.get('/api/v1/activities/?page=6')

             assert response.status_code == status.HTTP_400_BAD_REQUEST

             data = response.json()
             assert data['error']['code'] == 'pagination_limit_exceeded'
             assert 'Page 6 exceeds maximum' in data['error']['message']

         @override_settings(FETCH_GUARDRAIL_ENABLED=False)
         def test_guardrails_disabled_allows_any_page(self, authenticated_client):
             """US1.AC3: With guardrails disabled, no limit enforcement."""
             response = authenticated_client.get('/api/v1/activities/?page=10')

             # Should succeed (may return empty page, but not 400)
             assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

         @override_settings(
             FETCH_GUARDRAIL_ENABLED=True,
             FETCH_GUARDRAIL_MAX_PAGES=5,
             FETCH_GUARDRAIL_OVERRIDES={
                 '/api/v1/activities/': {'max_pages': 10},
             },
         )
         def test_per_endpoint_override_respected(self, authenticated_client):
             """US1.AC4: Endpoint override allows higher limit."""
             response = authenticated_client.get('/api/v1/activities/?page=8')

             assert response.status_code == status.HTTP_200_OK
     ```
- **Files**: `tests/integration/test_guardrail_integration.py`
- **Parallel?**: No (foundational integration tests)
- **Notes**: Use a real endpoint that exists in the codebase

### Subtask T024 – Integration test: ETag/If-None-Match flow

- **Purpose**: End-to-end test of User Story 3 (Cache Invalidation)
- **Steps**:
  1. Add to `tests/integration/test_guardrail_integration.py`:
     ```python
     @pytest.mark.django_db
     class TestCacheInvalidation:
         """Integration tests for User Story 3: Cache Invalidation."""

         def test_list_response_includes_etag(self, authenticated_client):
             """US3.AC1: List response includes ETag header."""
             response = authenticated_client.get('/api/v1/activities/')

             assert response.status_code == status.HTTP_200_OK
             assert 'ETag' in response.headers
             assert response.headers['ETag'].startswith('"')

         def test_if_none_match_returns_304_when_unchanged(self, authenticated_client):
             """US3.AC3: Matching ETag returns 304 Not Modified."""
             # First request to get ETag
             response1 = authenticated_client.get('/api/v1/activities/')
             etag = response1.headers['ETag']

             # Second request with If-None-Match
             response2 = authenticated_client.get(
                 '/api/v1/activities/',
                 HTTP_IF_NONE_MATCH=etag,
             )

             assert response2.status_code == status.HTTP_304_NOT_MODIFIED
             assert response2.content == b''  # No body on 304

         def test_modified_data_returns_new_etag(self, authenticated_client):
             """US3.AC2: Modified data returns 200 with new ETag."""
             # First request
             response1 = authenticated_client.get('/api/v1/activities/')
             old_etag = response1.headers['ETag']

             # Modify data (create new activity)
             authenticated_client.post('/api/v1/activities/', {
                 'name': 'New Activity',
                 # ... required fields
             })

             # Request with old ETag
             response2 = authenticated_client.get(
                 '/api/v1/activities/',
                 HTTP_IF_NONE_MATCH=old_etag,
             )

             assert response2.status_code == status.HTTP_200_OK
             new_etag = response2.headers['ETag']
             assert new_etag != old_etag

         def test_detail_response_includes_last_modified(self, authenticated_client):
             """US3.AC1: Detail response includes Last-Modified header."""
             # Create an activity first
             create_response = authenticated_client.post('/api/v1/activities/', {
                 'name': 'Test Activity',
             })
             activity_id = create_response.json()['data']['id']

             # Get detail
             response = authenticated_client.get(f'/api/v1/activities/{activity_id}/')

             assert response.status_code == status.HTTP_200_OK
             assert 'Last-Modified' in response.headers
             assert 'GMT' in response.headers['Last-Modified']
     ```
- **Files**: `tests/integration/test_guardrail_integration.py`
- **Parallel?**: Yes (independent user story)
- **Notes**: May need to create test data in fixtures

### Subtask T025 – Integration test: optimistic create reconciliation

- **Purpose**: End-to-end test of User Story 2 (Optimistic Creates)
- **Steps**:
  1. Add to `tests/integration/test_guardrail_integration.py`:
     ```python
     @pytest.mark.django_db
     class TestOptimisticCreate:
         """Integration tests for User Story 2: Optimistic Create."""

         @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
         def test_client_request_id_echoed(self, authenticated_client):
             """US2.AC1: X-Client-Request-ID echoed in response."""
             client_id = '550e8400-e29b-41d4-a716-446655440000'

             response = authenticated_client.post(
                 '/api/v1/activities/',
                 {'name': 'Optimistic Activity'},
                 HTTP_X_CLIENT_REQUEST_ID=client_id,
             )

             assert response.status_code == status.HTTP_201_CREATED
             assert response.headers.get('X-Client-Request-ID') == client_id

         def test_created_at_has_millisecond_precision(self, authenticated_client):
             """US2.AC2: created_at includes millisecond precision."""
             response = authenticated_client.post(
                 '/api/v1/activities/',
                 {'name': 'Timestamped Activity'},
             )

             assert response.status_code == status.HTTP_201_CREATED
             created_at = response.json()['data']['created_at']

             # Should have microseconds in ISO format
             assert '.' in created_at  # Has decimal seconds
             assert created_at.endswith('Z') or '+' in created_at

         def test_validation_error_returns_structured_response(self, authenticated_client):
             """US2.AC3: Validation errors are structured for UI rollback."""
             response = authenticated_client.post(
                 '/api/v1/activities/',
                 {},  # Missing required fields
             )

             assert response.status_code == status.HTTP_400_BAD_REQUEST
             data = response.json()
             assert 'error' in data
             assert 'details' in data['error'] or 'message' in data['error']

         @override_settings(OPTIMISTIC_CREATE_ENABLED=False)
         def test_header_not_echoed_when_disabled(self, authenticated_client):
             """US5.AC3: Header ignored when feature disabled."""
             client_id = '550e8400-e29b-41d4-a716-446655440000'

             response = authenticated_client.post(
                 '/api/v1/activities/',
                 {'name': 'Disabled Feature Activity'},
                 HTTP_X_CLIENT_REQUEST_ID=client_id,
             )

             assert response.status_code == status.HTTP_201_CREATED
             assert 'X-Client-Request-ID' not in response.headers
     ```
- **Files**: `tests/integration/test_guardrail_integration.py`
- **Parallel?**: Yes (independent user story)
- **Notes**: Test both success and error responses

### Subtask T026 – Integration test: feature flag runtime toggle

- **Purpose**: End-to-end test of User Story 5 (Feature Flag Control)
- **Steps**:
  1. Add to `tests/integration/test_guardrail_integration.py`:
     ```python
     @pytest.mark.django_db
     class TestFeatureFlagControl:
         """Integration tests for User Story 5: Feature Flag Control."""

         @patch('api.guardrails.get_flag')
         def test_feature_flag_disables_guardrails(self, mock_get_flag, authenticated_client):
             """US5.AC1: Flag False disables guardrails."""
             mock_get_flag.return_value = False

             response = authenticated_client.get('/api/v1/activities/?page=100')

             # Should succeed even with extreme page number
             assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

         @patch('api.guardrails.get_flag')
         def test_feature_flag_changes_limit(self, mock_get_flag, authenticated_client):
             """US5.AC2: Changed limit flag updates behavior."""
             def flag_side_effect(key, default):
                 if key == 'frontend_fetch_guardrails_enabled':
                     return True
                 if key == 'frontend_fetch_max_pages_default':
                     return 10  # Changed from default 5
                 return default

             mock_get_flag.side_effect = flag_side_effect

             response = authenticated_client.get('/api/v1/activities/?page=8')

             assert response.status_code == status.HTTP_200_OK

             budget = json.loads(response.headers['X-Fetch-Budget'])
             assert budget['max_pages'] == 10
     ```
- **Files**: `tests/integration/test_guardrail_integration.py`
- **Parallel?**: Yes (independent tests)
- **Notes**: Use `@patch` to simulate feature flag changes

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tests require specific endpoint | Use `/api/v1/activities/` or create test endpoint |
| Test data pollution | Use fixtures with automatic cleanup |
| Slow tests | Mark with `@pytest.mark.slow` if >2s |
| Database state leakage | Use transaction rollback per test |

## Definition of Done Checklist

- [ ] T023: Page limit enforcement tests written
- [ ] T024: ETag/If-None-Match flow tests written
- [ ] T025: Optimistic create tests written
- [ ] T026: Feature flag toggle tests written
- [ ] All tests pass: `pytest tests/integration/test_guardrail_integration.py -v`
- [ ] Tests are marked with `@pytest.mark.django_db`
- [ ] No linting errors: `ruff check tests/integration/`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify tests use real HTTP requests (not mocked views)
- Check that response headers are validated
- Ensure tests cover all acceptance criteria from spec
- Confirm tests clean up after themselves

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T20:31:20Z – claude – shell_pid=42868 – lane=doing – Started WP06 implementation
