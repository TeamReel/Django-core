# Implementation Tasks: Audit Logging System
*Path: [kitty-specs/009-audit-logging-system/tasks.md](kitty-specs/009-audit-logging-system/tasks.md)*

**Feature Branch**: `009-audit-logging-system`
**Date**: 2025-11-27
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Overview

This document breaks down the Audit Logging System implementation into 8 work packages containing 45 subtasks. Work packages are sequenced for incremental delivery with clear dependencies and parallelization opportunities.

**MVP Scope**: WP01 (Foundation) + WP02 (Validation) + WP03 (Admin UI) provides complete audit recording and search capability.

**Total Effort**: 45 subtasks across 8 work packages
- **Setup Phase**: WP01 (10 tasks)
- **Core Features**: WP02-WP05 (25 tasks)
- **Operational Tools**: WP06 (4 tasks)
- **Documentation**: WP07 (3 tasks)
- **Quality Gates**: WP08 (3 tasks)

---

## Work Package Status

| ID | Work Package | Priority | Status | Subtasks | Prompt |
|----|--------------|----------|--------|----------|--------|
| WP01 | Audit App Foundation & Core API | P1 | Done ✅ | 10 | [WP01-audit-app-foundation.md](tasks/done/WP01-audit-app-foundation.md) |
| WP02 | Event Recording & Validation | P1 | Done ✅ | 5 | [WP02-event-recording-validation.md](tasks/done/WP02-event-recording-validation.md) |
| WP03 | Django Admin Search & Filter | P1 | Done ✅ | 7 | [WP03-admin-search-filter.md](tasks/done/WP03-admin-search-filter.md) |
| WP04 | Timeline & CSV Export | P2 | Done ✅ | 6 | [WP04-timeline-csv-export.md](tasks/done/WP04-timeline-csv-export.md) |
| WP05 | B08 Permission Integration | P1 | Done ✅ | 7 | [WP05-b08-integration.md](tasks/done/WP05-b08-integration.md) |
| WP06 | Management Commands | P2 | Done ✅ | 4 | [WP06-management-commands.md](tasks/done/WP06-management-commands.md) |
| WP07 | Documentation & ADR | P2 | Planned | 3 | [WP07-documentation-adr.md](tasks/planned/WP07-documentation-adr.md) |
| WP08 | Testing & Quality Gates | P1 | Done ✅ | 3 | [WP08-testing-quality-gates.md](tasks/done/WP08-testing-quality-gates.md) |

---

## Setup Phase

### WP01: Audit App Foundation & Core API

**Goal**: Create audit Django app with AuditEvent model, audit_log.record() API, event registry, signals, and Prometheus metrics.

**Priority**: P1 (Blocking - nothing works without this)

**Independent Test**: Call `audit_log.record('auth.login', user=user, metadata={'ip': '127.0.0.1'})` from Python shell and verify event exists in database with correct fields.

**Subtasks**:
- [X] T001: Create audit Django app structure (models.py, admin.py, apps.py, __init__.py, py.typed)
- [X] T002: Create AuditEvent model with all fields (id, created_at, event_type, user, organization, project, metadata) and Meta configuration
- [X] T003: Create initial migration (0001_initial.py) with GIN index on metadata field and all standard indexes
- [X] T004 [P]: Implement event type registry (registry.py) with thread-safe registration, format validation, EventTypeMetadata dataclass
- [X] T005 [P]: Implement audit_log.record() API (api.py) with validation, graceful failure, signal emission, metric increment
- [X] T006 [P]: Create Django signal (audit_record_failed) in signals.py with sender, exception, event_data arguments
- [X] T007 [P]: Implement Prometheus metrics in metrics.py (audit_events_recorded_total, audit_failures_total counters with labels)
- [X] T008: Register core event types in apps.py ready() method (auth.login, auth.logout, auth.login_failed, auth.password_changed, permission.checked, permission.granted, permission.denied, role.assigned, role.revoked, config.updated, config.feature_toggled, resource.created, resource.deleted)
- [X] T009: Configure audit app in settings.INSTALLED_APPS and update database routing if needed
- [X] T010: Create src/audit/README.md with API documentation, usage examples, event type conventions

**Implementation Sketch**:
1. Run `django-admin startapp audit` in src/ directory
2. Define AuditEvent model following data-model.md schema
3. Generate migration with `makemigrations` and manually add GIN index
4. Implement registry.py with EventTypeMetadata and register_event_type()
5. Implement api.py with audit_log.record() including try/except for graceful failure
6. Wire up signals and metrics
7. Pre-register core event types in apps.py
8. Test basic recording flow

**Dependencies**: None (foundation work package)

**Parallelization**: T004 (registry), T005 (API), T006 (signals), T007 (metrics) can be implemented simultaneously by different developers - they have clean interfaces.

**Risks**:
- GIN index migration syntax - verify PostgreSQL-specific syntax
- Prometheus metrics integration - ensure django-prometheus is already configured from B06
- Event type registration timing - must happen in apps.py ready(), not at import time

**Success Criteria**:
- `python manage.py migrate` runs cleanly
- Can import `from audit.api import audit_log` and `from audit.registry import register_event_type`
- Recording an event returns AuditEvent instance
- Event appears in database with correct fields and timestamp
- Prometheus /metrics endpoint shows audit_events_recorded_total counter

**Prompt**: [tasks/planned/WP01-audit-app-foundation.md](tasks/planned/WP01-audit-app-foundation.md)

---

## Core Feature Implementation

### WP02: Event Recording & Validation

**Goal**: Add type hints throughout audit module, implement metadata size validation (10KB limit), automatic IP/user agent capture, comprehensive unit tests for recording logic.

**Priority**: P1 (Core functionality)

**Independent Test**: Unit test that attempts to record event with 15KB metadata raises ValueError with clear message. Unit test that records event without request context succeeds without IP/user agent.

**Subtasks**:
- [ ] T011: Add comprehensive type hints to audit/api.py, audit/registry.py, audit/models.py using Python 3.12+ syntax
- [ ] T012: Implement metadata size validation in audit_log.record() - serialize to JSON, check size, raise ValueError if >10KB
- [ ] T013: Implement automatic IP/user agent capture from request context in audit_log.record() - add request parameter, extract REMOTE_ADDR and HTTP_USER_AGENT
- [ ] T014 [P]: Write unit tests for audit_log.record() success cases (with/without user, with/without request, all field combinations)
- [ ] T015 [P]: Write unit tests for audit_log.record() validation errors (unregistered event type, metadata too large) and graceful failure (database unavailable)

**Implementation Sketch**:
1. Add type annotations using `from typing import Optional, Dict, Any` and django-stubs types
2. In audit_log.record(), add metadata size check before save
3. Add request parameter and extract IP/user agent into metadata
4. Write pytest test cases covering all validation paths
5. Use pytest.raises for error cases, mock database errors for graceful failure tests

**Dependencies**: WP01 (requires audit_log.record() to exist)

**Parallelization**: T014 and T015 tests can be written in parallel - one developer handles success cases, another handles error cases.

**Risks**:
- Type checking with django-stubs - may reveal type errors in existing Django patterns
- Metadata serialization edge cases - ensure proper handling of datetime, UUID, custom objects
- Request context availability - handle cases where audit_log.record() called outside request cycle

**Success Criteria**:
- `mypy src/audit/` runs with zero errors
- Recording event with 11KB metadata raises ValueError("Metadata size 11.00KB exceeds 10KB limit")
- Recording event with request automatically includes metadata['ip'] and metadata['user_agent']
- All unit tests pass with >95% coverage for api.py

**Prompt**: [tasks/planned/WP02-event-recording-validation.md](tasks/planned/WP02-event-recording-validation.md)

---

### WP03: Django Admin Search & Filter Interface

**Goal**: Create read-only Django admin interface with search, filters, pagination, query optimization, and seed command for generating test data.

**Priority**: P1 (Primary UI for audit consumption)

**Independent Test**: Open /admin/audit/auditevent/, filter by user and date range, verify only matching events displayed, verify pagination works, attempt to edit event and verify blocked.

**Subtasks**:
- [ ] T016: Create read-only AuditEventAdmin in admin.py with list_display=[created_at, event_type, user, organization, project]
- [ ] T017: Implement admin filters (list_filter) for user, event_type, created_at, organization, project - use Django's built-in filter classes
- [ ] T018: Configure admin pagination (list_per_page=100) and enable search (search_fields=[user__email, event_type, metadata])
- [ ] T019: Override admin permissions (has_add_permission, has_change_permission, has_delete_permission all return False), remove delete_selected action
- [ ] T020: Add select_related('user', 'organization', 'project') optimization in get_queryset() to avoid N+1 queries
- [ ] T021 [P]: Write admin tests (read-only enforcement, filter functionality, pagination, search)
- [ ] T022: Create management command audit_seed for generating 100+ test events with varied event types, users, dates

**Implementation Sketch**:
1. Create AuditEventAdmin class with readonly_fields for all fields
2. Override permission methods to return False
3. Add list_filter and search_fields
4. Implement get_queryset() with select_related()
5. Write admin tests using Django's test client and admin views
6. Create audit_seed command with Call Command API

**Dependencies**: WP01 (requires AuditEvent model and audit_log.record API)

**Parallelization**: T021 (admin tests) and T022 (seed command) can be done in parallel with admin implementation.

**Risks**:
- Admin search on JSONField - may be slow without proper indexing, verify GIN index usage
- Superuser bypass - ensure permission overrides work even for superusers
- Filter widget performance - may need custom filter widgets for large datasets

**Success Criteria**:
- Admin shows "View audit event" page but no "Add", "Change", or "Delete" buttons
- Filtering by user shows only that user's events
- Search by event_type finds matching events
- Clicking event shows detail view with all metadata fields
- `python manage.py audit_seed --count 100` creates 100 diverse events

**Prompt**: [tasks/planned/WP03-admin-search-filter.md](tasks/planned/WP03-admin-search-filter.md)

---

### WP04: Timeline & CSV Export

**Goal**: Add date hierarchy for timeline navigation, implement CSV export admin action with proper metadata handling.

**Priority**: P2/P3 (Nice to have for investigations and external analysis)

**Independent Test**: Export 50 events to CSV and verify file contains all events with columns: timestamp, user, event_type, organization, project, metadata (as JSON string).

**Subtasks**:
- [ ] T023: Configure admin date_hierarchy='created_at' for drill-down by year/month/day
- [ ] T024: Add admin fieldsets to organize detail view (Event Info, Context, Metadata sections)
- [ ] T025 [P]: Write integration test for chronological event retrieval with date range filter
- [ ] T026: Implement CSV export admin action (export_as_csv) handling queryset serialization
- [ ] T027: Handle metadata JSON serialization in CSV export - flatten or serialize as JSON string column
- [ ] T028 [P]: Write tests for CSV export (small dataset, large dataset >1000 events, metadata with special characters)

**Implementation Sketch**:
1. Add date_hierarchy to AuditEventAdmin
2. Define fieldsets with tuples of (section_name, {'fields': [...]})
3. Create export_as_csv action using csv.writer
4. Serialize metadata using json.dumps() for CSV column
5. Write test that exports events and parses CSV to verify content

**Dependencies**: WP03 (requires admin interface)

**Parallelization**: T025 (timeline test) and T028 (export tests) can be written in parallel.

**Risks**:
- Large exports may timeout - consider async export for >10k events
- Metadata JSON in CSV may break parsing if contains quotes/commas - ensure proper escaping
- Memory usage for large exports - use queryset.iterator() for streaming

**Success Criteria**:
- Date hierarchy shows year/month/day drill-down in admin
- Selecting 100 events and clicking "Export to CSV" downloads file
- CSV file opens in Excel/Google Sheets without errors
- Metadata column contains valid JSON strings

**Prompt**: [tasks/planned/WP04-timeline-csv-export.md](tasks/planned/WP04-timeline-csv-export.md)

---

### WP05: B08 Permission System Integration

**Goal**: Add audit_log.record() calls to B08 permission evaluator and RoleAssignment model to automatically log all permission checks and role changes.

**Priority**: P1 (High-value automatic logging per spec User Story 5)

**Independent Test**: Call `evaluator.check_permission(user, 'projects.create', organization)` and verify audit event created with event_type='permission.checked', metadata contains permission name and result.

**Subtasks**:
- [ ] T029: Add audit_log.record() call in permissions/evaluator.py check_permission() method - capture permission, resource, result (allowed/denied)
- [ ] T030: Add audit_log.record() call in permissions/models.py RoleAssignment.save() - capture role.assigned event on creation
- [ ] T031: Add audit_log.record() call in permissions/models.py RoleAssignment.delete() or custom delete method - capture role.revoked event
- [ ] T032: Handle B08 graceful degradation - wrap audit imports in try/except, audit works even if B08 not installed
- [ ] T033 [P]: Write B08 integration tests (permission.checked events created for allow and deny cases)
- [ ] T034 [P]: Write B08 integration tests (role.assigned/revoked events created for CRUD operations)
- [ ] T035: Update B08 documentation (permissions/README.md) with audit integration details and event types

**Implementation Sketch**:
1. In evaluator.py, add `from audit.api import audit_log` at top
2. After permission check result, call audit_log.record() with permission details
3. In RoleAssignment.save(), check if `self.pk is None` (creation), then call audit_log.record()
4. Override RoleAssignment.delete() to log before deletion
5. Write integration tests that perform B08 operations and query AuditEvent table

**Dependencies**: WP01 (requires audit_log.record()), WP02 (requires validation)

**Parallelization**: T033 and T034 integration tests can be written in parallel.

**Risks**:
- B08 code changes require coordination with B08 maintainers (if different team)
- Audit recording failures could break permission checks - ensure graceful degradation works
- Performance overhead - each permission check adds audit write, may impact latency (mitigated by async or fast writes)

**Success Criteria**:
- Checking permission creates audit event with metadata['permission'] and metadata['result']
- Creating RoleAssignment creates audit event with metadata['role_name'] and metadata['target_user_id']
- Deleting RoleAssignment creates audit event with metadata['reason']
- All integration tests pass
- B08 tests still pass (no regressions)

**Prompt**: [tasks/planned/WP05-b08-integration.md](tasks/planned/WP05-b08-integration.md)

---

## Operational Tools

### WP06: Management Commands

**Goal**: Create management commands for listing event types, exporting events, and cleaning up old events per retention policy.

**Priority**: P2 (Nice to have for operations)

**Independent Test**: Run `python manage.py audit_list_event_types` and verify all registered event types displayed with descriptions.

**Subtasks**:
- [ ] T036 [P]: Create audit_list_event_types command in management/commands/ - display all registered event types with descriptions in table format
- [ ] T037 [P]: Create audit_export command with --output, --days, --event-types options for CSV export from CLI
- [ ] T038 [P]: Create audit_cleanup command with --days option to delete events older than retention period, --dry-run flag
- [ ] T039 [P]: Write tests for management commands using call_command() and asserting stdout/database changes

**Implementation Sketch**:
1. Create BaseCommand subclasses in management/commands/
2. Use audit.registry.list_event_types() in audit_list_event_types
3. Use queryset filters and csv.writer in audit_export
4. Use queryset.filter(created_at__lt=cutoff_date).delete() in audit_cleanup
5. Write tests using StringIO to capture stdout

**Dependencies**: WP01 (requires registry and model)

**Parallelization**: All 4 commands (T036-T039) can be built in parallel - they are independent.

**Risks**:
- Cleanup command data loss - require confirmation or --force flag for non-dry-run
- Export large datasets - may timeout, use queryset.iterator()

**Success Criteria**:
- `audit_list_event_types` shows all event types with descriptions
- `audit_export --output events.csv --days 7` creates CSV with last 7 days
- `audit_cleanup --days 90 --dry-run` shows count of events to delete
- `audit_cleanup --days 90` actually deletes old events
- All command tests pass

**Prompt**: [tasks/planned/WP06-management-commands.md](tasks/planned/WP06-management-commands.md)

---

## Documentation & Knowledge Sharing

### WP07: Documentation & Architecture Decisions

**Goal**: Update main project documentation with audit system overview, create ADR for storage strategy, update copilot instructions.

**Priority**: P2 (Essential for maintainability)

**Independent Test**: Read main README and verify audit system section exists with links to quickstart.md.

**Subtasks**:
- [ ] T040: Update main project README.md with "Audit Logging" section covering capabilities, quickstart link, B08 integration
- [ ] T041: Create ADR (docs/architecture/decisions/ADR-009-audit-event-storage.md) documenting PostgreSQL JSON vs separate tables decision with rationale
- [ ] T042: Update .github/copilot-instructions.md with audit logging technologies (PostgreSQL JSONField + GIN, django-prometheus) - ALREADY DONE in planning phase

**Implementation Sketch**:
1. Add new section to main README with overview and links
2. Create ADR file following existing ADR template
3. Verify copilot-instructions.md has correct entries (should already be done)

**Dependencies**: None (documentation can be written anytime)

**Parallelization**: All 3 docs (T040-T042) can be written in parallel.

**Risks**:
- Documentation drift - ensure examples in README match actual API
- ADR rationale completeness - reference research.md decisions

**Success Criteria**:
- README has "Audit Logging" section with quickstart example
- ADR-009 exists with Context, Decision, Consequences sections
- Copilot instructions include audit technologies

**Prompt**: [tasks/planned/WP07-documentation-adr.md](tasks/planned/WP07-documentation-adr.md)

---

## Quality & Validation

### WP08: Testing & Quality Gates

**Goal**: Verify test coverage meets thresholds (>85% audit app, 100% API), run mypy type checking, update CHANGELOG.

**Priority**: P1 (Quality gates before merge)

**Independent Test**: CI passes all checks (linting, formatting, type checking, tests, coverage).

**Subtasks**:
- [X] T043: Run full test suite with coverage (`pytest --cov=src/audit --cov-report=term-missing`) and verify >85% coverage for audit app
- [X] T044: Run mypy type checking on audit module (`mypy src/audit/`) and fix any type errors
- [X] T045: Update CHANGELOG.md with Feature 009 additions (audit logging system, B08 integration, management commands)

**Implementation Sketch**:
1. Run pytest with coverage flags
2. Identify uncovered lines and add tests if needed to reach 85%
3. Run mypy and fix type annotations as needed
4. Add CHANGELOG entry following existing format

**Dependencies**: WP01-WP06 (must run after all implementation complete)

**Parallelization**: Cannot parallelize - must run sequentially (tests, then type check, then changelog).

**Risks**:
- Coverage below threshold - may need to add more tests
- Mypy errors on Django ORM patterns - may need type: ignore comments with justification
- CHANGELOG merge conflicts - coordinate with other features

**Success Criteria**:
- Coverage report shows >=85% for audit app
- Coverage report shows 100% for audit/api.py
- `mypy src/audit/` exits with status 0
- CHANGELOG has Feature 009 entry with all major changes
- CI pipeline passes

**Prompt**: [tasks/done/WP08-testing-quality-gates.md](tasks/done/WP08-testing-quality-gates.md)

---

## Dependencies Graph

```
WP01 (Foundation)
  ├─> WP02 (Validation)
  ├─> WP03 (Admin)
  │    └─> WP04 (Timeline/Export)
  └─> WP05 (B08 Integration)

WP01 + WP03 ─> WP06 (Commands)

WP07 (Documentation) - No dependencies

WP01-WP06 ─> WP08 (Quality Gates)
```

**Critical Path**: WP01 → WP02 → WP05 (Foundation → Validation → B08 Integration)

**Parallel Opportunities**:
- After WP01: WP02, WP03, WP07 can start in parallel
- After WP03: WP04, WP06 can start in parallel
- Within WP01: T004-T007 are independent
- Within each work package: Tests can be written in parallel with implementation

---

## MVP Recommendation

**Minimum Viable Product**: WP01 + WP02 + WP03 (22 subtasks)

This provides:
- Core audit recording API
- Event type registry
- Validation and graceful failure
- Django admin search/filter interface
- Query optimization
- Test data seeding

**Deferred for Post-MVP**:
- WP04: Timeline drill-down and CSV export (nice to have)
- WP05: B08 integration (can be added after MVP proven)
- WP06: Management commands (operational convenience)

**Why this MVP**: User Stories 1 and 2 (recording and searching) are P1 and provide immediate value. User Story 5 (B08) can be added after core system is proven stable.

---

## Implementation Notes

**Testing Strategy**: Each work package includes test subtasks. Focus on:
- Unit tests for audit/api.py (100% coverage required)
- Integration tests for B08 (verify events created)
- Admin tests for read-only enforcement
- Management command tests for safety

**Type Checking**: mypy configured with django-stubs. All audit module code must type-check cleanly.

**Performance**: GIN index on metadata field is critical for fast JSON queries. Verify index used with EXPLAIN ANALYZE in PostgreSQL.

**Security**: Read-only admin enforced at multiple layers (permissions + admin method overrides) for defense in depth.

**Observability**: Prometheus metrics and Django signals provide dual observability for audit system health.

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-27 | 1.0 | Initial task breakdown (8 work packages, 45 subtasks) | AI Agent |
