# Task Breakdown: Projects & Workspaces Management

**Feature**: 007-projects-workspaces-management
**Branch**: `007-projects-workspaces-management`
**Created**: 2025-11-25
**Status**: Ready for Implementation

## Overview

This document breaks down the implementation of the Projects & Workspaces Management feature into discrete work packages. Each work package can be implemented independently and includes detailed subtasks.

**Total Work Packages**: 5
**Estimated Effort**: 1-2 weeks for complete implementation
**MVP Scope**: WP01 (Foundation) + WP02 (Core Model) + WP03 (User Story 1)

## Subtask Reference

Subtasks are referenced by ID (T001, T002, etc.) and organized into work packages below. Tasks marked with `[P]` can be parallelized safely across different files/concerns.

## Work Package Summary

| ID | Title | Priority | User Story | Subtasks | Dependencies |
|----|-------|----------|------------|----------|--------------|
| WP01 | Django App Structure & Setup | Critical | Setup | 5 | None |
| WP02 | Project Model & Managers | Critical | All | 8 | WP01 |
| WP03 | Project Creation & Listing (US1) | P1 | US1 | 6 | WP02 |
| WP04 | Project Updates & Archives (US2) | P2 | US2 | 5 | WP03 |
| WP05 | Resource Association Patterns (US3) | P3 | US3 | 4 | WP03 |

---

## Phase 1: Setup & Foundation

### WP01: Django App Structure & Setup

**Goal**: Create Django `projects` app with proper structure, configure in settings, and verify basic setup.

**Priority**: Critical (blocking all other work)

**Independent Test**: Django app loads without errors, settings are configured correctly, and migrations can be generated.

**Success Criteria**:
- Django `projects` app created with proper structure
- App added to INSTALLED_APPS
- URL routing configured
- App README.md created with extension guide
- `python manage.py check` passes
- Django admin site accessible

**Risks**:
- None (simple setup, no new dependencies)

**Subtasks**:

- [x] **T001**: Create `src/projects/` Django app with `__init__.py`, `apps.py`, `models.py`, `admin.py`, `signals.py`
- [x] **T002**: Create sub-packages: `projects/api/` with `serializers.py`, `views.py`, `urls.py`, `permissions.py`
- [x] **T003**: Add `projects` to `INSTALLED_APPS` in `src/config/settings/base.py`
- [x] **T004**: Include `projects.api.urls` in `src/config/urls.py` for both nested and top-level routing
- [x] **T005**: Create `projects/README.md` with app documentation and extension guide for product features

**Implementation Sketch**:
1. Create app directory structure manually or via Django's startapp
2. Create api/ subdirectory with __init__.py files
3. Update settings.py INSTALLED_APPS list
4. Add URL patterns for dual routing (nested under organisations + top-level)
5. Write README with FK pattern examples for extensions

**Parallel Opportunities**: T001-T002 [P] (structure), T003-T004 [P] (config), T005 [P] (docs)

**Dependencies**: None

**Estimated Effort**: 2-3 hours

---

## Phase 2: Core Infrastructure

### WP02: Project Model & Managers

**Goal**: Implement Project model with soft deletion, custom managers, slug generation, and database migrations.

**Priority**: Critical (required for all user stories)

**Independent Test**: Model can be instantiated, saved, and queried. Soft-delete works correctly. Slug generation handles collisions. Custom managers filter active/archived projects. Migrations apply cleanly.

**Success Criteria**:
- Project model with all fields (id, organisation, creator, name, slug, description, is_active, timestamps)
- Unique constraints: (organisation, slug), case-insensitive (name, organisation)
- Indexes: organisation_id, slug, is_active, (organisation_id, is_active)
- Custom managers: ActiveProjectManager (is_active=True), AllProjectManager
- Slug generation: Auto-generate from name with sequential suffix on collisions
- Soft deletion: archive() and restore() methods
- Validation: archived_at set when is_active=False
- Migrations generated and applied successfully

**Risks**:
- Slug collision algorithm performance under high concurrency
- Case-insensitive constraint compatibility (PostgreSQL only - acceptable per constitution)

**Subtasks**:

- [ ] **T006**: Define Project model in `projects/models.py` with all fields, foreign keys, and help text
- [ ] **T007**: Add unique constraints: `UNIQUE(organisation, slug)` and `UNIQUE(LOWER(name), organisation)`
- [ ] **T008**: Create database indexes on organisation_id, slug, is_active, and composite (organisation_id, is_active)
- [ ] **T009**: Implement custom managers in `projects/managers.py`: ActiveProjectManager and AllProjectManager
- [ ] **T010**: Implement slug generation algorithm in `_generate_unique_slug()` with sequential suffix pattern
- [ ] **T011**: Override `save()` method to auto-generate slug if empty and call `full_clean()`
- [ ] **T012**: Implement `clean()` method to validate archived_at consistency with is_active
- [ ] **T013**: Add `archive()` and `restore()` convenience methods for soft deletion
- [ ] **T014**: Generate and apply initial migration: `makemigrations projects && migrate`

**Implementation Sketch**:
1. Import models, fields, functions (Lower), timezone, slugify
2. Define Project model with all fields and ForeignKeys (Organisation, User)
3. Add Meta class with constraints, indexes, ordering
4. Create ActiveProjectManager and AllProjectManager classes
5. Implement _generate_unique_slug with loop and counter logic
6. Override save() to call slug generation
7. Override clean() to validate archived_at/is_active consistency
8. Add archive() and restore() methods
9. Run makemigrations and inspect SQL
10. Apply migrations and test in Django shell

**Parallel Opportunities**: T006-T008 [P] (model definition), T009-T013 can follow in sequence

**Dependencies**: WP01 (app structure must exist)

**Estimated Effort**: 6-8 hours

---

## Phase 3: User Stories (Priority Order)

### WP03: Project Creation & Listing API (User Story 1)

**Goal**: Implement REST API endpoints for creating projects and listing projects per organisation with proper permissions.

**Priority**: P1 (highest user story priority)

**Independent Test**: Authenticated org admin can POST to /api/organisations/{org_id}/projects/ with name, system creates project with auto-generated slug, GET returns project list with pagination.

**Success Criteria**:
- POST /api/organisations/{org_id}/projects/ endpoint accepts name, optional slug, optional description
- System auto-generates slug from name if not provided
- Handles slug collisions with sequential suffix
- GET /api/organisations/{org_id}/projects/ returns paginated project list (cursor pagination, 50/page)
- GET /api/projects/ (top-level) returns all user's projects across organisations
- GET /api/organisations/{org_id}/projects/{id}/ returns project details with nested org/creator
- Permissions: IsOrganisationAdmin for create, org membership for list/view
- Validation: name 1-200 chars, slug pattern, description max 2000 chars
- Only active projects returned by default (include_archived param for all)

**Risks**:
- Slug collision race conditions (mitigated by database constraint)
- Performance with 1000+ projects per org (mitigated by cursor pagination)

**Subtasks**:

- [ ] **T015**: Create ProjectSerializer and ProjectListSerializer in `projects/api/serializers.py` with nested org/creator
- [ ] **T016**: Implement validation in serializer: name length, slug pattern, description length, case-insensitive name uniqueness
- [ ] **T017**: Create ProjectViewSet in `projects/api/views.py` with create, list, retrieve actions
- [ ] **T018**: Configure cursor pagination (50 items/page) and queryset optimization (select_related)
- [ ] **T019**: Add URL patterns in `projects/api/urls.py`: nested under organisations + top-level routes
- [ ] **T020**: Implement permissions: reuse IsOrganisationAdmin from Feature 006, filter queryset by user's organisations

**Implementation Sketch**:
1. Create serializers with nested OrganisationSerializer and UserSerializer for read operations
2. Add validators: validate_name, validate_slug, validate uniqueness
3. Implement ProjectViewSet with get_queryset filtering by org_id (nested) or user orgs (top-level)
4. Add select_related('organisation', 'creator') for query optimization
5. Configure CursorPagination in viewset
6. Create two router registrations: one nested, one top-level
7. Apply IsOrganisationAdmin permission for create action

**Parallel Opportunities**: T015-T016 [P] (serializers), T017-T018 [P] (views), T019-T020 can follow

**Dependencies**: WP02 (Project model must exist)

**Estimated Effort**: 8-10 hours

---

### WP04: Project Updates & Archive/Restore (User Story 2)

**Goal**: Implement API endpoints for updating project details and archiving/restoring projects (soft deletion).

**Priority**: P2 (second priority user story)

**Independent Test**: Org admin can PATCH /api/projects/{id}/ to update name/description, can POST /api/projects/{id}/archive/ to archive, and POST /api/projects/{id}/restore/ to restore.

**Success Criteria**:
- PATCH /api/organisations/{org_id}/projects/{id}/ updates name and/or description
- PATCH /api/projects/{id}/ (top-level) also works with same permissions
- POST /api/projects/{id}/archive/ sets is_active=False, archived_at=now()
- POST /api/projects/{id}/restore/ sets is_active=True, archived_at=None
- Slug cannot be updated after creation
- Permissions: IsOrganisationAdmin for all update/archive operations
- Validation: prevent archiving already archived projects, prevent restoring active projects
- Archived projects excluded from default queries

**Risks**:
- None (straightforward CRUD operations)

**Subtasks**:

- [ ] **T021**: Add update and partial_update actions to ProjectViewSet with field validation
- [ ] **T022**: Implement @action for archive: validate is_active=True, call project.archive(), return 204
- [ ] **T023**: Implement @action for restore: validate is_active=False, call project.restore(), return 204
- [ ] **T024**: Add read-only constraint to slug field in serializer (cannot be updated)
- [ ] **T025**: Add tests for edge cases: archive archived project (400), restore active project (400)

**Implementation Sketch**:
1. ProjectViewSet already has update/partial_update from ModelViewSet
2. Add serializer field: slug = ReadOnlyField()
3. Create @action(detail=True, methods=['post']) for archive
4. Create @action(detail=True, methods=['post']) for restore
5. Add validation in actions to prevent invalid state transitions

**Parallel Opportunities**: T021-T022 [P], T023-T024 [P]

**Dependencies**: WP03 (CRUD endpoints must exist)

**Estimated Effort**: 4-5 hours

---

### WP05: Resource Association Patterns & Documentation (User Story 3)

**Goal**: Document and test patterns for associating product-specific resources with projects via foreign keys.

**Priority**: P3 (third priority user story)

**Independent Test**: Example resource model with project FK can be created, queried by project, and filtered correctly. Documentation shows integration patterns.

**Success Criteria**:
- projects/README.md includes FK pattern examples for extending with product features
- Example test case shows how to associate custom resource with project
- Example API filter pattern documented (e.g., /api/resources/?project=123)
- Validation that project associations respect organisation boundaries
- Confirmation that cascading deletes work correctly (project deleted → resources deleted)

**Risks**:
- None (documentation and pattern examples only)

**Subtasks**:

- [ ] **T026**: Update projects/README.md with "Extending Projects" section showing FK pattern
- [ ] **T027**: Add code examples: model definition, API serializer, viewset filtering
- [ ] **T028**: Create example test in tests/projects/test_integration.py showing resource association pattern
- [ ] **T029**: Document cascade behavior: project archived → resources should handle gracefully (no cascade on soft delete)

**Implementation Sketch**:
1. Write README section with title "Extending Projects for Product Features"
2. Show example model: `class Resource(models.Model): project = ForeignKey('projects.Project', on_delete=CASCADE)`
3. Show serializer example with project field validation
4. Show viewset filtering: `queryset.filter(project_id=project_id)`
5. Create integration test that creates project, creates resource with FK, queries by project

**Parallel Opportunities**: All tasks [P] (documentation and tests)

**Dependencies**: WP03 (API must exist for integration examples)

**Estimated Effort**: 3-4 hours

---

## Phase 4: Testing & Quality

### WP06: Comprehensive Test Suite

**Goal**: Achieve 90% test coverage with unit, integration, and API tests.

**Priority**: Critical (quality requirement)

**Independent Test**: `pytest tests/projects/` passes with 90%+ coverage. All user stories validated.

**Success Criteria**:
- Model tests: slug generation, collisions, soft delete, validation
- Manager tests: active/archived filtering
- Serializer tests: validation, nested objects
- API tests: CRUD operations, permissions, pagination
- Integration tests: end-to-end workflows
- 90%+ coverage per constitution requirement

**Subtasks**:

- [ ] **T030**: Create test fixtures in tests/projects/conftest.py: user, org, project factories
- [ ] **T031**: Write model tests in tests/projects/test_models.py: slug generation, case-insensitive name, soft delete
- [ ] **T032**: Write manager tests in tests/projects/test_managers.py: active() vs all_objects filtering
- [ ] **T033**: Write serializer tests in tests/projects/api/test_serializers.py: validation, uniqueness
- [ ] **T034**: Write API tests in tests/projects/api/test_views.py: create, list, retrieve, update, archive, restore
- [ ] **T035**: Write permission tests in tests/projects/api/test_permissions.py: org admin required
- [ ] **T036**: Write integration tests in tests/projects/api/test_integration.py: full user workflows
- [ ] **T037**: Run coverage report: `pytest --cov=projects tests/projects/ --cov-report=html`

**Parallel Opportunities**: T030 first, then T031-T036 [P] (independent test files)

**Dependencies**: WP03, WP04, WP05 (all features implemented)

**Estimated Effort**: 10-12 hours

---

## Phase 5: Polish & Documentation

### WP07: Django Admin, Signals, and Final Documentation

**Goal**: Configure Django admin interface, implement audit logging signal stubs, and finalize documentation.

**Priority**: Medium (polish and observability)

**Independent Test**: Django admin shows projects with search/filters. Signals log project events. All documentation complete.

**Success Criteria**:
- Django admin: list view with search (name), filters (is_active, organisation)
- Admin: inline view for organisation → projects
- Signal stubs: post_save, pre_delete handlers with structured logging
- Signal handlers ready for Feature 009 integration
- py.typed file for type hints
- All docstrings complete

**Subtasks**:

- [ ] **T038**: Create ProjectAdmin in projects/admin.py with list_display, search_fields, list_filter
- [ ] **T039**: Add ProjectInline to OrganisationAdmin in organisations app
- [ ] **T040**: Implement signal handlers in projects/signals.py: log creation, updates, archival
- [ ] **T041**: Register signals in projects/apps.py ready() method
- [ ] **T042**: Add py.typed file to projects/ for type hint support
- [ ] **T043**: Add docstrings to all classes and methods
- [ ] **T044**: Final review: run `python manage.py check --deploy`, `ruff check`, `black --check`

**Parallel Opportunities**: T038-T039 [P], T040-T041 [P], T042-T044 [P]

**Dependencies**: All previous work packages

**Estimated Effort**: 4-5 hours

---

## Implementation Order Recommendation

1. **Week 1**: WP01 (0.5 day) → WP02 (1 day) → WP03 (1.5 days) → WP04 (0.5 day)
2. **Week 2**: WP05 (0.5 day) → WP06 (1.5 days) → WP07 (0.5 day) → Buffer (1 day)

**Critical Path**: WP01 → WP02 → WP03 (MVP ready at this point)

**Parallelization**:
- WP05 (documentation) can be done alongside WP06 (testing)
- WP07 (admin/signals) can overlap with final testing

---

## Success Metrics

- [ ] All 44 subtasks completed
- [ ] All 9 spec success criteria met (SC-001 through SC-009)
- [ ] 90%+ test coverage achieved
- [ ] All user stories validated with API tests
- [ ] Performance targets met: <1s list queries, <30s create
- [ ] Zero constitutional violations
- [ ] Feature accepted and merged to main

---

## Risk Mitigation Summary

| Risk | Mitigation | Status |
|------|------------|--------|
| Slug collision race conditions | Database UNIQUE constraint as safety net | Designed |
| Performance with 1000+ projects | Cursor pagination + indexes | Designed |
| Case-insensitive constraint on non-PostgreSQL | Constitution mandates PostgreSQL only | N/A |
| Feature 009 integration delay | Stub interface with signals, easy to replace | Designed |

---

## Phase Gate Checklist

**Before Starting Implementation**:
- [x] Spec validated (requirements.md ✅ PASSED)
- [x] Research complete (research.md ✅)
- [x] Data model designed (data-model.md ✅)
- [x] API contracts specified (contracts/projects-api.yaml ✅)
- [x] Developer guide created (quickstart.md ✅)
- [x] Constitution check passed (plan.md ✅ PASS)

**Ready to Begin**: ✅ All gates passed - Implementation can start!

---

**Task Breakdown Status**: ✅ Complete - Ready for work package execution
