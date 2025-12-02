---
work_package_id: "WP13"
subtasks: ["T092", "T093", "T094", "T095", "T096", "T097", "T098", "T099", "T100", "T101", "T102", "T103"]
title: "Unit & Integration Tests"
phase: "Phase 4 - Testing & Quality"
lane: "planned"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP13 – Unit & Integration Tests

## Objectives

Achieve 90%+ test coverage with unit tests for services and integration tests for full flow.

**Success**: `pytest tests/contextual_notifications/` shows 90%+ coverage.

## Key Subtasks

- T092: Test fixtures in `conftest.py` (orgs, projects, users, rules, preferences)
- T093 [P]: Model tests
- T094 [P]: EventService unit tests
- T095 [P]: RoutingService unit tests
- T096 [P]: PreferenceService unit tests
- T097 [P]: SuppressionService unit tests
- T098 [P]: PolicyService unit tests
- T099: Integration test: event → B16 notification
- T100: Integration test: preference override
- T101: Integration test: quiet hours rate limiting
- T102: Integration test: suppression window
- T103: Configure coverage thresholds (90% in pyproject.toml)

## Implementation

- Mock B16 NotificationService (`unittest.mock.patch`)
- Mock Redis (fakeredis or unittest.mock)
- Celery `task_always_eager=True` for sync execution
- Reusable fixtures for test data

## Definition of Done

- [ ] 90%+ coverage achieved
- [ ] All services have unit tests
- [ ] Integration tests cover key flows
- [ ] Tests pass in CI

## Dependencies

- WP02-WP09 (all services)
