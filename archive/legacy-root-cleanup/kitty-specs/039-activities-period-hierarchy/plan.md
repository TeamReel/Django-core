# Implementation Plan: Activities & Period Hierarchy

**Branch**: `039-activities-period-hierarchy` | **Date**: 2026-01-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/039-activities-period-hierarchy/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Generic event and resource planning system with nestable time-bound cycles (periods) and scheduled activities. Supports unlimited-depth period hierarchies (e.g., Organisation → Season → Month → Week) with dual-level participation tracking (period squads + activity lineups). Provides REST API for calendar views, tree navigation, and flexible outcome recording via JSON fields.

**Primary Requirement**: Enable products to manage hierarchical time periods (org-wide or project-specific), schedule activities within periods, and track member participation at both period level (squad/team) and activity level (lineup/attendees).

**Technical Approach**: New Django app `src/activities/` with 3 models (Period, Activity, Participation) using PostgreSQL recursive CTE for tree queries. Flat REST API routes with query param filtering. B14 search integration. API-only delivery (demo UI deferred to demo-shell).

## Technical Context

**Language/Version**: Python 3.12+ (matches Core baseline)
**Primary Dependencies**: Django 5.x, Django REST Framework, PostgreSQL 9.4+ (recursive CTE support)
**Storage**: PostgreSQL (required for WITH RECURSIVE queries, JSON fields)
**Testing**: pytest + pytest-django (Core standard)
**Target Platform**: Linux server (Django deployment)
**Project Type**: Web API (Django app within existing Core monorepo)
**Performance Goals**: <500ms for 10-level period hierarchy queries (SC-007), <300ms API p95 for calendar listing (SC-010)
**Constraints**: PostgreSQL-only (no MySQL/SQLite support for this feature due to CTE requirement), no external tree libraries (raw CTE implementation)
**Scale/Scope**: Support 1000 concurrent users (SC-006), handle 100 activities per calendar view <2s load time (SC-004)

**Confirmed Architecture Decisions** (from planning interrogation):
1. **App Structure**: New Django app `src/activities/` (clean isolation, independent testing)
2. **Tree Implementation**: Raw PostgreSQL recursive CTE via custom QuerySet (no django-treebeard/django-mptt)
3. **API Design**: Flat routes `/api/v1/periods/`, `/api/v1/activities/` with query param filtering (consistent with existing Core APIs)
4. **Frontend Scope**: API-only delivery; demo UI deferred to demo-shell integration (not blocking this feature)
5. **Search Integration**: Include B14 Full-Text Search registration for Period/Activity models

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows (generic time periods + activities reusable across sports/business/education)
- [x] **Core Focus**: Feature aligns with core concerns (resource planning, scheduling foundation for downstream products)
- [x] **Downstream Extension**: Product-specific needs handled via JSON data fields, configurable roles/types, custom validation in products

### II. Architecture and Modularity
- [x] **Single Responsibility**: `src/activities/` app focused solely on time-based resource planning (periods + activities + participation)
- [x] **Stable APIs**: REST endpoints follow Core patterns, versioned at `/api/v1/`, documented via OpenAPI
- [x] **Minimal Dependencies**: Zero external tree libraries; PostgreSQL CTE only dependency (already Core requirement)
- [x] **No Circular Deps**: Clean dependencies: activities → projects, organisations, accounts (one-way only)
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: Models, managers, serializers, views will use type hints throughout
- [x] **Black Formatting**: All code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Clean implementation, no commented-out code
- [x] **Readable Code**: QuerySet methods small, CTE queries well-documented
- [x] **Curated Dependencies**: No new external dependencies (PostgreSQL CTE is built-in)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: ≥90% for models/API, ≥85% for permissions (spec SC-008)
- [x] **Regression Tests**: Period deletion prevention, participation constraint validation tested
- [x] **Deterministic**: Tests use database transactions, no flaky time dependencies
- [x] **Coverage Thresholds**: Defined in spec (SC-008, SC-009)
- [x] **Integration Tests**: Full workflow test: create 3-level hierarchy → add squad → schedule → record outcome (spec User Story integration test)

### V. Security and Privacy
- [x] **Secure Defaults**: All endpoints use DRF permission classes (FR-028 through FR-033)
- [x] **DEBUG Off**: Django settings maintained (no changes to DEBUG behavior)
- [x] **No Secrets**: No sensitive data in models; configuration via settings
- [x] **Dependency Scanning**: No new dependencies to scan
- [x] **Centralized Auth**: Uses B08 Hierarchical Access Control for permissions
- [x] **No Sensitive Logging**: Participation data logged only in B09 audit trail (not application logs)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: `select_related('period', 'project')` and `prefetch_related('participants__member')` used throughout
- [x] **Pagination**: Activity list and period member list paginated at 20 items/page (FR-024)
- [x] **Explicit Caching**: Not required; CTE queries fast enough (<500ms guarantee)
- [x] **Structured Logging**: B09 audit integration for mutations, Django logger for errors with request_id
- [x] **Health Checks**: Uses existing Core health check endpoints (no changes needed)
- [x] **Metrics Hooks**: B09 audit events provide mutation metrics
- [x] **Graceful Degradation**: If B09 unavailable, audit events log to Django logger as fallback

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
- [x] **Consistent Responses**: Envelope pattern from B13, error responses follow B13 standards
- [x] **Versioning Strategy**: All APIs under `/api/v1/`, future changes via `/api/v2/`
- [x] **Clear Errors**: Validation errors expose field-level issues, no stack traces in responses
- [x] **Boundary Validation**: Serializers validate date ranges, participant constraints, permission checks at API boundary

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Uses existing Core setup (no additional steps beyond migrations)
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured in Core (inherited)
- [x] **Pre-commit Hooks**: Uses Core pre-commit hooks (no changes)
- [x] **Type Checking**: mypy will run cleanly on activities app
- [x] **Task Scripts**: Standard Django management commands (`migrate`, `test`)
- [x] **Developer Docs**: README.md in `src/activities/` per Constitution Article XI

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `039-activities-period-hierarchy` branch (worktree active)
- [x] **Linked to Spec**: PR will reference spec.md from kitty-specs/
- [x] **Focused PRs**: Single feature scope (periods + activities + participation)
- [x] **main Stable**: No direct commits to main (all via PR review)

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI (Core standard)
- [x] **Merge Gates**: All CI checks must pass before merge
- [x] **Scripted Deployment**: Uses Core deployment process (no changes needed)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository (`src/activities/README.md`, ADR planned)
- [x] **App README**: Will create `src/activities/README.md` per Constitution v1.1.0 requirements
- [x] **Getting Started**: Quickstart.md in feature specs covers API usage examples
- [x] **Extension Guide**: Will update `documents/06-workflow/extending-core.md` with custom activity types, roles, outcome data patterns
- [x] **Spec Sync**: Spec already aligned with implementation decisions
- [x] **ADR Required**: Will create `documents/03-system/architecture-decisions/012-period-hierarchy-design.md` documenting unlimited-depth tree vs fixed levels

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
src/activities/                      # New Django app
├── __init__.py
├── apps.py
├── models.py                       # Period, Activity, Participation
├── managers.py                     # PeriodQuerySet with CTE methods
├── admin.py                        # Django admin configuration
├── migrations/
│   └── 0001_initial.py            # Initial migration (3 models)
├── api/
│   ├── __init__.py
│   ├── serializers.py             # DRF serializers for 3 models
│   ├── views.py                   # ViewSets (PeriodViewSet, ActivityViewSet, ParticipationViewSet)
│   ├── permissions.py             # B08 integration (organisation.manage_periods, project.manage_activities)
│   └── urls.py                    # API routes
├── search.py                       # B14 search registration
├── signals.py                      # B09 audit event emission
└── tests/
    ├── test_models.py             # Model validation, constraints
    ├── test_managers.py           # CTE query tests (descendants, ancestors)
    ├── test_api.py                # API endpoint tests
    ├── test_permissions.py        # B08 permission enforcement tests
    └── test_integration.py        # Full workflow test (spec integration scenario)

tests/integration/
└── test_activities_workflow.py    # Cross-app integration tests (if needed)

src/config/settings/
└── base.py                         # Add 'activities' to INSTALLED_APPS

documents/03-system/architecture-decisions/
└── 012-period-hierarchy-design.md  # ADR: Unlimited-depth tree via CTE vs fixed levels

documents/06-workflow/
└── extending-core.md               # Update: Custom activity types, roles, outcome data patterns section
```

**Structure Decision**: Single Django app approach (Option 1 pattern). New `src/activities/` app contains all models, API, and tests. Follows Core standard: models at app root, API in `api/` subpackage, tests in `tests/` subdirectory. No frontend code in this feature (demo UI deferred to demo-shell).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
