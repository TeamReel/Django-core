---
work_package_id: "WP08"
subtasks:
  - "T053"
  - "T054"
  - "T055"
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
title: "Testing Suite"
phase: "Phase 2 - Testing"
lane: "planned"
assignee: ""
agent: "copilot-reviewer"
shell_pid: "$PID"
review_status: "has_feedback"
reviewed_by: "copilot-reviewer"
history:
  - timestamp: "2025-11-28T12:00:00Z"
    lane: "for_review"
    agent: "implementer"
    shell_pid: ""
    action: "Submitted for review"
  - timestamp: "2025-11-28T12:30:00Z"
    lane: "planned"
    agent: "copilot-reviewer"
    shell_pid: "$PID"
    action: "Code review complete - critical issues found with Redis dependency, missing coverage, import errors"
---

# Work Package Prompt: WP08 – Testing Suite

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. **Redis Dependency Failures** - All tests that use caching fail due to hardcoded Redis dependency. The `clear_cache` fixture in `conftest.py` tries to connect to actual Redis instead of using mocked Redis.
2. **Import Errors** - Several test files have import errors:
   - `test_permissions.py`: Cannot import `SettingsPermission` from `src.settings.permissions`
   - `test_rest_api.py` and `test_user_stories.py`: Conflicting Organisation models
3. **Extremely Low Coverage** - Current coverage is only 23%, far below required 80% threshold
4. **Uncovered Critical Components** - Essential modules have 0% coverage: api.py, cache.py, permissions.py, serializers.py, views.py
5. **Test Infrastructure Problems** - Tests cannot run in CI/review environments without Redis server

**What Was Done Well**:
- Basic model tests are working (test_simple.py, test_models_basic.py)
- Database migrations are functioning correctly
- Test directory structure is properly organized
- Models have correct field definitions and constraints

**Action Items** (must complete before re-review):
- [ ] Fix `conftest.py` to properly mock Redis instead of connecting to real Redis server
- [ ] Fix import errors in `test_permissions.py` (check if `SettingsPermission` class exists)
- [ ] Fix conflicting model imports in `test_rest_api.py` and `test_user_stories.py`
- [ ] Implement tests for all 0% coverage modules (api.py, cache.py, permissions.py, serializers.py, views.py)
- [ ] Achieve minimum 80% coverage requirement
- [ ] Ensure all tests can run without external Redis dependency
- [ ] Verify all 12 success criteria (T053-T064) are properly tested
- [ ] Fix Django warnings about deprecated `CheckConstraint.check` in migrations

---

## Context
This work package implements comprehensive test coverage for the Settings & Feature Flags system. The test suite ensures reliability, validates all functionality, and provides confidence for production deployment. It covers models, API layer, caching, permissions, and integration scenarios.

## Success Criteria
- [ ] T053: Create `tests/settings/conftest.py` with pytest fixtures (Redis mock, database factories)
- [ ] T054: Write model tests (`test_models.py`): unique constraints, check constraints, defaults
- [ ] T055: Write query API tests (`test_api.py`): scope resolution, cache hits/misses, graceful degradation
- [ ] T056: Write cache layer tests (`test_cache.py`): key generation, TTL, pub/sub invalidation
- [ ] T057: Write REST API tests (`test_views.py`): CRUD operations, filtering, pagination
- [ ] T058: Write serializer tests: validation logic, type checking, error messages
- [ ] T059: Write permission tests (`test_permissions.py`): scope-aware access control, B08 integration
- [ ] T060: Write audit integration tests (`test_integration.py`): signal emission, event capture
- [ ] T061: Write resolve endpoint tests: hierarchy precedence, all scope combinations
- [ ] T062: Run coverage report, verify 80%+ coverage on `src/settings/` module
- [ ] T063: Write integration test for User Story 1 acceptance scenarios (scoped rollout)
- [ ] T064: Write integration test for User Story 2 acceptance scenarios (query API caching)

## Dependencies
- WP01-WP07: All implementation work must be complete before testing
- Requires pytest, pytest-django, pytest-mock, pytest-cov
- Requires test database setup
- Requires Redis (mocked) for cache testing

## Requirements

### T053: Test Configuration & Fixtures
Create comprehensive test fixtures in `tests/settings/conftest.py`:
- Database factories for User, Organisation, Project, FeatureFlag, Setting
- Mock Redis client for cache testing
- Permission system fixtures with roles and assignments
- Test client configurations for API testing

### T054: Model Tests
Test database models in `test_models.py`:
- Unique constraints (key + scope combination)
- Check constraints (scope validation)
- Model defaults and field validation
- Relationship integrity (ForeignKey constraints)
- Model methods and properties

### T055: Query API Tests
Test Python query API in `test_api.py`:
- Scope hierarchy resolution (9 combinations)
- Cache hit/miss scenarios
- Graceful degradation when Redis unavailable
- Type coercion for settings
- Error handling and edge cases

### T056: Cache Layer Tests
Test caching functionality in `test_cache.py`:
- Cache key generation consistency
- TTL expiration behavior
- Pub/sub invalidation patterns
- Redis connection handling
- Cache performance characteristics

### T057: REST API Tests
Test DRF endpoints in `test_views.py`:
- CRUD operations (Create, Read, Update, Delete)
- Filtering and search functionality
- Pagination behavior
- Custom resolve endpoints
- Error responses and status codes

### T058: Serializer Tests
Test data serialization/validation:
- Input validation and error messages
- Type checking and coercion
- Required field enforcement
- Custom serializer logic
- Nested object serialization

### T059: Permission Tests
Test scope-aware permissions in `test_permissions.py`:
- Authentication requirements
- Scope-based access control
- B08 RBAC integration
- Superuser override behavior
- Admin interface permissions

### T060: Audit Integration Tests
Test audit system integration in `test_integration.py`:
- Django signal emission
- Audit event creation
- Event metadata accuracy
- Signal handling reliability
- Error conditions

### T061: Resolve Endpoint Tests
Test hierarchy resolution endpoints:
- All scope precedence combinations
- Project → Organisation → Global fallback
- Query parameter handling
- Response format validation
- Performance characteristics

### T062: Coverage Validation
Verify test coverage meets requirements:
- Generate coverage report for `src/settings/`
- Ensure ≥80% line coverage
- Identify any untested code paths
- Validate critical paths are covered

### T063: User Story 1 Integration Tests
Test scoped rollout scenarios:
- Feature flag rollout at different scopes
- Permission-based access control
- Scope hierarchy behavior
- Real-world usage patterns

### T064: User Story 2 Integration Tests
Test query API caching scenarios:
- Cache performance improvements
- Hierarchical value resolution
- Cache invalidation patterns
- Production-like usage scenarios

## Implementation Guidance

### Test Structure
```
tests/settings/
├── conftest.py           # Shared fixtures and configuration
├── test_models.py        # Model unit tests
├── test_api.py          # Query API tests
├── test_cache.py        # Cache layer tests
├── test_views.py        # REST API tests
├── test_serializers.py  # Serializer tests
├── test_permissions.py  # Permission tests
├── test_integration.py  # Audit integration tests
├── test_resolve.py      # Resolve endpoint tests
└── test_user_stories.py # End-to-end integration tests
```

### Testing Patterns
- Use pytest fixtures for consistent test data
- Mock external dependencies (Redis, external APIs)
- Test both happy path and error conditions
- Use parametrized tests for multiple scenarios
- Follow AAA pattern (Arrange, Act, Assert)

### Coverage Requirements
- Minimum 80% line coverage for `src/settings/` module
- 100% coverage for critical paths (permissions, cache invalidation)
- Focus on edge cases and error conditions
- Test all public API methods

### Performance Testing
- Verify cache performance improvements
- Test under realistic data volumes
- Validate query efficiency
- Check memory usage patterns

## Files to Create/Update
- `tests/settings/conftest.py` - Test configuration and fixtures
- `tests/settings/test_models.py` - Model unit tests
- `tests/settings/test_api.py` - Query API tests
- `tests/settings/test_cache.py` - Cache layer tests
- `tests/settings/test_views.py` - REST API tests
- `tests/settings/test_serializers.py` - Serializer tests
- `tests/settings/test_permissions.py` - Permission tests
- `tests/settings/test_integration.py` - Audit integration tests
- `tests/settings/test_resolve.py` - Resolve endpoint tests
- `tests/settings/test_user_stories.py` - End-to-end integration tests

## Validation Steps
1. Run full test suite: `pytest tests/settings/ -v`
2. Generate coverage report: `pytest tests/settings/ --cov=src.settings --cov-report=html`
3. Verify ≥80% coverage
4. Run tests multiple times to check for flaky tests
5. Validate all user story scenarios are covered
