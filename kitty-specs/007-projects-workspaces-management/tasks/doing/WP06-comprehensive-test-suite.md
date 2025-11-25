---
lane: "doing"
agent: "system"
---
# WP06: Comprehensive Test Suite

**Work Package ID**: WP06
**Status**: Planned
**Priority**: Critical (quality requirement)
**Estimated Effort**: 10-12 hours

## Objective
Achieve 90% test coverage with unit, integration, and API tests.

## Dependencies
WP03, WP04, WP05 (all features implemented)

## Subtasks

### T030: Test Fixtures
Create `tests/projects/conftest.py` with pytest fixtures:
- user, organisation, project factories

### T031-T032: Model & Manager Tests
- `test_models.py`: Slug generation, collisions, soft delete, validation
- `test_managers.py`: active() vs all_objects filtering

### T033-T036: API Tests
- `test_serializers.py`: Validation, uniqueness
- `test_views.py`: CRUD operations, pagination
- `test_permissions.py`: Org admin required
- `test_integration.py`: Full user workflows

### T037: Coverage Report
Run: `pytest --cov=projects tests/projects/ --cov-report=html`
Target: 90%+ coverage

## Success Criteria
- All user stories validated with API tests
- 90%+ coverage achieved
- Edge cases tested

## Activity Log

- 2025-11-25T15:00:27Z – system – shell_pid= – lane=doing – Started comprehensive test suite implementation
