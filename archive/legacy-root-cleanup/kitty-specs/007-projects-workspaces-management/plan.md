# Implementation Plan: Projects & Workspaces Management
*Path: [kitty-specs/007-projects-workspaces-management/plan.md](kitty-specs/007-projects-workspaces-management/plan.md)*

**Branch**: `007-projects-workspaces-management` | **Date**: 2025-11-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/007-projects-workspaces-management/spec.md`

## Summary

Create a reusable project/workspace Django app that provides a context container within organisations for scoping resources, configuration, and workflows. The implementation follows a flat structure (no nesting) with organisation-level access control, soft deletion patterns, and dual API endpoints (nested + top-level) for flexibility. Audit logging will use a stub interface initially, allowing Feature 009 integration later without blocking development.

**Technical Approach**:
- New Django app `projects` with Project model
- Soft deletion via is_active flag and archived_at timestamp
- Sequential slug collision resolution (project-alpha, project-alpha-2, etc.)
- Both nested `/api/organisations/{org_id}/projects/` and top-level `/api/projects/` endpoints
- Permission integration with Feature 006 organisation roles (IsOrganisationAdmin)
- Stub audit logging interface for future Feature 009 integration

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints)
**Storage**: PostgreSQL (Project model with foreign keys to Organisation and User, unique constraints, indexes)
**Testing**: pytest + pytest-django with minimum 90% coverage target
**Target Platform**: Linux server (Django application)
**Project Type**: Django web application (backend API)
**Performance Goals**: <1 second project list queries for orgs with 100 projects; support pagination for 1000+ projects
**Constraints**: <30 seconds project creation; <1 second audit log writes; zero N+1 queries
**Scale/Scope**: Supports multiple organisations with 100-1000+ projects each; designed for multi-tenancy at scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (projects as context containers for multi-tenancy)
- [x] **Downstream Extension**: Product-specific needs handled via foreign key relationships to Project model

### II. Architecture and Modularity
- [x] **Single Responsibility**: `projects` Django app handles only project/workspace lifecycle
- [x] **Stable APIs**: REST API endpoints following DRF conventions with clear serializer contracts
- [x] **Minimal Dependencies**: Depends only on organisations (Feature 006) and accounts (Feature 005)
- [x] **No Circular Deps**: Projects imported by future features, never imports from them (string-based FK references)
- [x] **No Downstream Imports**: Core projects app remains agnostic to future resource types

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: All models, managers, serializers, views use type hints
- [x] **Black Formatting**: All code formatted with Black
- [x] **Ruff Linting**: Ruff configured and enforced
- [x] **No Dead Code**: Clean implementation with no unused functions
- [x] **Readable Code**: Small functions, clear naming, documented managers
- [x] **Curated Dependencies**: No new dependencies beyond existing Django/DRF stack

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: 90% minimum coverage for models, managers, views, serializers
- [x] **Regression Tests**: All edge cases covered (concurrent updates, slug collisions, permissions)
- [x] **Deterministic**: No flaky tests, proper test isolation with fixtures
- [x] **Coverage Thresholds**: 90% target enforced in CI
- [x] **Integration Tests**: Complete CRUD workflows tested end-to-end

### V. Security and Privacy
- [x] **Secure Defaults**: All settings inherit from Feature 001 secure configuration
- [x] **DEBUG Off**: No DEBUG-specific code, works in production mode
- [x] **No Secrets**: No secrets required (uses existing DB/Redis connections)
- [x] **Dependency Scanning**: No new dependencies to scan
- [x] **Centralized Auth**: Uses DRF authentication + Feature 006 permission classes
- [x] **No Sensitive Logging**: Audit logs contain only IDs and event types, no project content

### VI. Performance and Reliability
- [x] **No N+1 Queries**: select_related('organisation', 'creator') in querysets
- [x] **Pagination**: Default 20 items per page, configurable page_size parameter
- [x] **Explicit Caching**: No caching initially (simple queries perform well with indexes)
- [x] **Structured Logging**: Django logging with clear logger names (projects.*)
- [x] **Health Checks**: Project queries included in existing /health endpoint checks
- [x] **Metrics Hooks**: Stub for future prometheus metrics integration
- [x] **Graceful Degradation**: Soft deletion allows recovery; API returns clear errors on failures

### VII. UX and API Design
- [x] **DRF Required**: All endpoints use Django REST Framework
- [x] **Consistent Responses**: Standard DRF response format with status, data, errors
- [x] **Versioning Strategy**: Uses /api/ prefix, breaking changes would increment to /api/v2/
- [x] **Clear Errors**: ValidationError with field-level details, PermissionDenied with clear messages
- [x] **Boundary Validation**: All validation in ProjectSerializer (name length, uniqueness, required fields)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Standard Django app registration in INSTALLED_APPS, runs migrations
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest all configured
- [x] **Pre-commit Hooks**: Existing hooks cover this feature
- [x] **Type Checking**: mypy runs cleanly with django-stubs
- [x] **Task Scripts**: Uses existing Django management commands (runserver, migrate, test)
- [x] **Developer Docs**: README.md in projects/ app explaining model, permissions, extension pattern

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work on `007-projects-workspaces-management` branch
- [x] **Linked to Spec**: PR will reference kitty-specs/007-projects-workspaces-management/spec.md
- [x] **Focused PRs**: Single feature scope, reviewable size
- [x] **main Stable**: All work through PR to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Existing CI runs Black, Ruff, mypy, pytest
- [x] **Merge Gates**: All checks must pass (formatting, linting, types, tests)
- [x] **Scripted Deployment**: Uses existing Django deployment process (collectstatic, migrate, restart)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: All docs in kitty-specs/007-projects-workspaces-management/
- [x] **App README**: projects/README.md explains purpose, usage, extension points
- [x] **Getting Started**: Quickstart.md guides developers on creating/using projects
- [x] **Extension Guide**: README documents foreign key pattern for associating resources
- [x] **Spec Sync**: Plan and tasks reference spec.md
- [x] **ADR Required**: No major architectural decisions (follows established patterns from Feature 006)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature follows existing constitution without amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/007-projects-workspaces-management/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research findings (to be generated)
├── data-model.md        # Phase 1 entity relationships (to be generated)
├── quickstart.md        # Phase 1 developer guide (to be generated)
├── contracts/           # Phase 1 API contracts (to be generated)
│   └── projects-api.yaml
├── checklists/
│   └── requirements.md  # Spec quality checklist (completed)
└── tasks.md             # Phase 2 work packages (via /spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── projects/                      # NEW Django app
│   ├── __init__.py
│   ├── README.md                 # App documentation with extension guide
│   ├── apps.py                   # App configuration
│   ├── models.py                 # Project model with soft deletion
│   ├── managers.py               # ActiveProjectManager, AllProjectManager
│   ├── admin.py                  # Django admin configuration
│   ├── signals.py                # Audit logging stub hooks
│   ├── api/
│   │   ├── __init__.py
│   │   ├── serializers.py        # ProjectSerializer, ProjectListSerializer
│   │   ├── views.py              # ProjectViewSet with archive/restore actions
│   │   ├── urls.py               # Nested + top-level URL routing
│   │   └── permissions.py        # IsOrganisationAdminForProject
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py       # Initial Project model migration
│   └── py.typed                  # Type hint marker file
│
├── organisations/                 # EXISTING (Feature 006)
│   └── ... (no changes)
│
├── config/
│   ├── settings/base.py          # ADD 'projects' to INSTALLED_APPS
│   └── urls.py                   # INCLUDE projects.api.urls

tests/
├── projects/                     # NEW test directory
│   ├── __init__.py
│   ├── conftest.py              # Fixtures for projects, orgs, users
│   ├── test_models.py           # Project model tests (validation, slug generation, soft deletion)
│   ├── test_managers.py         # Manager tests (active/archived filtering)
│   ├── test_signals.py          # Audit logging stub tests
│   ├── api/
│   │   ├── __init__.py
│   │   ├── test_serializers.py  # Serializer validation tests
│   │   ├── test_views.py        # API endpoint tests (CRUD, permissions)
│   │   ├── test_permissions.py  # Permission class tests
│   │   └── test_integration.py  # End-to-end workflow tests
```

**Structure Decision**: Standard Django app structure following Feature 006 patterns. The `projects` app is self-contained with clear API boundaries. Tests mirror source structure for easy navigation. No new dependencies or complex patterns introduced.

## Complexity Tracking

*No violations present* - Feature 007 aligns with all constitutional principles. See Constitution Check section for validation details.

---

## Phase 0: Research

**Objective**: Answer technical questions, validate technology choices, document decisions with rationale.

**Status**: ✅ Complete

### Research Deliverables

1. **research.md** (✅ Complete)
   - 10 research questions answered with decisions and rationale
   - Technology stack validated (Python 3.12+, Django 5.1+, DRF 3.14+, PostgreSQL)
   - Alternatives considered for each decision
   - Implementation notes and code examples
   - Performance targets defined
   - Dependencies validated (Features 005, 006 complete; Feature 009 stubbed)
   - Risks identified with mitigations

### Key Research Decisions

| Question | Decision | Impact |
|----------|----------|--------|
| **Q1: Audit Logging** | Stub interface, integrate Feature 009 later | Unblocks development, maintains extension path |
| **Q2: Slug Collisions** | Sequential suffix (project-alpha-2) | Predictable, user-friendly pattern |
| **Q3: API Structure** | Dual endpoints (nested + top-level) | Flexibility for different client use cases |
| **Q4: Project Structure** | Flat (no hierarchy) | Simplicity, YAGNI compliance |
| **Q5: Permissions** | Organisation-level only | Reuses Feature 006, sufficient for MVP |
| **Q6: Soft Deletion** | is_active flag + archived_at | Consistency with Feature 006 pattern |
| **Q7: Slug Generation** | Auto-generate on save, allow override | Flexible, user-friendly API |
| **Q8: Name Uniqueness** | Case-insensitive per organisation | Prevents confusing duplicates |
| **Q9: Description Length** | 2000 characters (TextField) | Sufficient, prevents abuse |
| **Q10: Pagination** | Cursor-based, 50 items/page | Performance at scale (1000+ projects) |

### Technology Validation

All technology choices align with existing project standards:
- ✅ Python 3.12+ (existing)
- ✅ Django 5.1+ (existing)
- ✅ Django REST Framework 3.14+ (existing)
- ✅ django-stubs for type hints (existing)
- ✅ PostgreSQL with functional indexes (existing)
- ✅ pytest + pytest-django (existing)
- ✅ Black + Ruff (existing)

**No new dependencies required** - Feature 007 uses only existing project tools.

### Performance Targets Confirmed

| Operation | Target | Strategy |
|-----------|--------|----------|
| List 100 projects | <1 second | Indexed queries, select_related |
| Create project | <30 seconds | Efficient slug generation |
| Pagination (1000+) | <1 second/page | Cursor pagination |

### Phase 0 Gate: ✅ PASSED
- All research questions answered
- Technology stack validated
- Performance targets defined
- Dependencies confirmed
- No blockers identified

**Ready for Phase 1: Design & Contracts**

---

## Phase 1: Design & Contracts

**Objective**: Define data model, API contracts, and developer integration guide.

**Status**: ✅ Complete

### Design Deliverables

1. **data-model.md** (✅ Complete)
   - Complete Project model specification with all fields
   - Entity relationships (Organisation, User)
   - Database constraints (UNIQUE, indexes)
   - Custom managers (ActiveProjectManager, AllProjectManager)
   - Slug generation algorithm
   - Soft deletion pattern
   - Migration strategy
   - Extension points for future features

2. **contracts/projects-api.yaml** (✅ Complete)
   - OpenAPI 3.0.3 specification
   - Nested endpoints: `/api/organisations/{org_id}/projects/`
   - Top-level endpoints: `/api/projects/`
   - Complete CRUD operations
   - Archive/restore custom actions
   - Request/response schemas
   - Error responses
   - Pagination specification

3. **quickstart.md** (✅ Complete)
   - 15-minute developer integration guide
   - Common use cases with examples
   - API reference summary
   - Integration patterns for extending features
   - Testing guidelines
   - Performance tips

### Key Design Decisions Implemented

| Component | Design | Rationale |
|-----------|--------|-----------|
| **Data Model** | Single Project entity with soft deletion | Simplicity, follows Feature 006 pattern |
| **Slug Generation** | Auto-generate with sequential suffix on collision | User-friendly, predictable behavior |
| **API Structure** | Dual endpoints (nested + top-level) | Flexibility for different client needs |
| **Permissions** | Organisation-level via Feature 006 | No new permission models needed |
| **Soft Deletion** | `is_active` + `archived_at` | Consistent with Feature 006 |
| **Pagination** | Cursor-based, 50 items/page | Performance at scale |

### Data Model Summary

**Project Model**:
- Fields: id, organisation_id (FK), creator_id (FK), name, slug, description, is_active, created_at, updated_at, archived_at
- Constraints: UNIQUE(organisation, slug), UNIQUE(LOWER(name), organisation)
- Indexes: organisation_id, slug, is_active, (organisation_id, is_active)
- Managers: objects (active only), all_objects (all projects)

**Relationships**:
- Organisation → Project (1:N, CASCADE)
- User → Project (1:N as creator, PROTECT)

### API Contract Summary

**Nested Endpoints** (Organisation-scoped):
- `GET /api/organisations/{org_id}/projects/` - List projects
- `POST /api/organisations/{org_id}/projects/` - Create project
- `GET /api/organisations/{org_id}/projects/{id}/` - Get details
- `PATCH /api/organisations/{org_id}/projects/{id}/` - Update
- `POST /api/organisations/{org_id}/projects/{id}/archive/` - Archive
- `POST /api/organisations/{org_id}/projects/{id}/restore/` - Restore

**Top-Level Endpoints** (User-scoped):
- `GET /api/projects/` - List all user's projects
- `GET /api/projects/{id}/` - Get details
- `PATCH /api/projects/{id}/` - Update
- `POST /api/projects/{id}/archive/` - Archive
- `POST /api/projects/{id}/restore/` - Restore

### Integration Guide Summary

**Common Patterns**:
1. **Associate Resources**: Add FK to Project model
2. **Query by Project**: Filter queryset by project_id
3. **Project Context**: Fetch project details for navigation

**Performance Tips**:
- Use select_related('organisation', 'creator')
- Paginate large lists (50 items/page)
- Cache project details (5-minute TTL)

### Phase 1 Gate: ✅ PASSED
- Data model complete with migrations
- API contracts specified (OpenAPI 3.0.3)
- Developer quickstart guide created
- All extension points documented
- No design ambiguities remaining

**Ready for Phase 2: Task Breakdown**

---

## Phase 2: Task Breakdown & Work Packages

**Objective**: Break down implementation into discrete, testable work packages with subtasks.

**Status**: ✅ Complete

### Task Deliverables

1. **tasks.md** (✅ Complete)
   - 7 work packages (WP01-WP07) organized by phase
   - 44 subtasks (T001-T044) with clear acceptance criteria
   - Implementation order and parallelization opportunities
   - Effort estimates: 1-2 weeks total
   - MVP scope defined: WP01 + WP02 + WP03
   - Critical path identified
   - Risk mitigation strategies

### Work Package Summary

| ID | Title | Priority | Subtasks | Estimated Effort |
|----|-------|----------|----------|------------------|
| **WP01** | Django App Structure & Setup | Critical | 5 | 2-3 hours |
| **WP02** | Project Model & Managers | Critical | 9 | 6-8 hours |
| **WP03** | Project Creation & Listing API (US1) | P1 | 6 | 8-10 hours |
| **WP04** | Project Updates & Archive/Restore (US2) | P2 | 5 | 4-5 hours |
| **WP05** | Resource Association Patterns (US3) | P3 | 4 | 3-4 hours |
| **WP06** | Comprehensive Test Suite | Critical | 8 | 10-12 hours |
| **WP07** | Django Admin, Signals, Documentation | Medium | 7 | 4-5 hours |

**Total**: 44 subtasks, ~40-45 hours (1-2 weeks)

### Implementation Phases

**Week 1 (MVP)**:
- Day 1: WP01 (Setup) + WP02 (Model)
- Day 2-3: WP03 (Create/List API)
- Day 4: WP04 (Update/Archive API)
- Day 5: Buffer + testing

**Week 2 (Complete)**:
- Day 1: WP05 (Documentation) + WP06 (Tests)
- Day 2: WP06 (Tests cont.) + WP07 (Polish)
- Day 3-5: Buffer, reviews, refinement

### Critical Path

```
WP01 (Setup) → WP02 (Model) → WP03 (API) → WP04 (Update/Archive)
                                   ↓
                              WP05 (Patterns) → WP06 (Tests) → WP07 (Polish)
```

**MVP Ready After**: WP01 + WP02 + WP03 (basic CRUD operations functional)

### Parallelization Opportunities

- **WP05 (Documentation)** can run in parallel with **WP06 (Testing)**
- **WP07 (Admin/Signals)** can overlap with final testing
- Within each WP: Tasks marked `[P]` can be parallelized

### Phase 2 Gate: ✅ PASSED
- All work packages defined with clear goals
- All subtasks have acceptance criteria
- Dependencies mapped
- Effort estimated
- Implementation order planned
- Risks identified with mitigations

**Ready for Implementation**: ✅ All planning complete

---

## Planning Summary

### Completed Artifacts

| Artifact | Status | Lines | Description |
|----------|--------|-------|-------------|
| **spec.md** | ✅ Complete | 291 | Feature specification with 5 user stories, 20 requirements |
| **checklists/requirements.md** | ✅ PASSED | - | Specification quality validation |
| **research.md** | ✅ Complete | 353 | 10 research questions with decisions and rationale |
| **data-model.md** | ✅ Complete | 420 | Complete data model with migrations and extension points |
| **contracts/projects-api.yaml** | ✅ Complete | 650 | OpenAPI 3.0.3 specification with all endpoints |
| **quickstart.md** | ✅ Complete | 420 | 15-minute developer integration guide |
| **tasks.md** | ✅ Complete | 380 | 7 work packages, 44 subtasks, effort estimates |
| **plan.md** | ✅ Complete | 450 | This file - complete implementation plan |

**Total Documentation**: ~3,000 lines across 8 files

### Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audit Logging | Stub interface, integrate Feature 009 later | Unblocks development, maintains extension path |
| Slug Collisions | Sequential suffix (project-alpha-2) | Predictable, user-friendly |
| API Structure | Dual endpoints (nested + top-level) | Flexibility for different clients |
| Project Structure | Flat (no hierarchy) | Simplicity, YAGNI compliance |
| Permissions | Organisation-level only | Reuses Feature 006 |
| Soft Deletion | is_active + archived_at | Consistency with Feature 006 |
| Pagination | Cursor-based, 50/page | Performance at scale |

### Technology Stack (No New Dependencies)

- ✅ Python 3.12+ (existing)
- ✅ Django 5.1+ (existing)
- ✅ Django REST Framework 3.14+ (existing)
- ✅ django-stubs (existing)
- ✅ PostgreSQL (existing)
- ✅ pytest + pytest-django (existing)
- ✅ Black + Ruff (existing)

**Zero new dependencies** - Feature 007 uses only existing project tools.

### Success Criteria Mapping

| Success Criteria | Implementation | Validation |
|------------------|----------------|------------|
| **SC-001**: Create project with name | WP03 (T015-T020) | API test: POST /api/organisations/{id}/projects/ |
| **SC-002**: Unique name per org | WP02 (T007) | Database constraint + serializer validation |
| **SC-003**: Update project details | WP04 (T021) | API test: PATCH /api/projects/{id}/ |
| **SC-004**: View project list | WP03 (T015-T020) | API test: GET /api/projects/ |
| **SC-005**: Archive/restore | WP04 (T022-T023) | API test: POST /api/projects/{id}/archive/ |
| **SC-006**: Associate resources | WP05 (T026-T029) | Integration test with example resource |
| **SC-007**: Org-level permissions | WP03 (T020) | Permission test: non-admin cannot create |
| **SC-008**: Performance targets | WP02 (T008) + WP03 (T018) | Load test: 100 projects <1s, pagination |
| **SC-009**: Developer guide | WP05 (T026-T027) | quickstart.md completeness check |

### Constitutional Compliance

✅ **All 12 principles validated** (see Constitution Check section above)

**Zero violations** - Feature 007 aligns completely with Django Core-App constitution.

### Risk Summary

| Risk | Probability | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Slug collision race conditions | Low | Medium | Database UNIQUE constraint as safety net | Designed |
| Performance degradation (1000+ projects) | Medium | High | Cursor pagination + indexes | Designed |
| Audit logging stub forgotten | Low | Low | Documentation + Feature 009 checklist | Documented |
| Case-insensitive constraint fails | N/A | N/A | PostgreSQL only (constitution mandates) | N/A |

---

## Next Steps

1. ✅ **Planning Complete** - All artifacts generated
2. 🔜 **Update Agent Context** - Run update-agent-context.ps1
3. 🔜 **Begin Implementation** - Start with WP01 (Django app setup)
4. 🔜 **Track Progress** - Mark subtasks complete in tasks.md as work progresses
5. 🔜 **Review & Merge** - After all WPs complete, review and merge to main

**Planning Status**: ✅ 100% Complete - Ready for implementation phase
