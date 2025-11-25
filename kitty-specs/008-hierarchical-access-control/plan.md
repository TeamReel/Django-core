# Implementation Plan: Hierarchical Access Control System
*Path: kitty-specs/008-hierarchical-access-control/plan.md*

**Branch**: `008-hierarchical-access-control` | **Date**: 2025-11-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/008-hierarchical-access-control/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Feature 008 implements a hierarchical role-based access control (RBAC) system with three scope levels (Global, Organization, Project) and additive inheritance where project-level roles can grant additional permissions beyond organization-level assignments. The system provides custom role definitions with assignable permission sets, Redis-cached permission evaluation (<2ms latency target), audit logging integration for sensitive operations, and a registry pattern for downstream Django apps to register custom permissions. Pre-defined starter roles (7 roles) are provided for immediate use, with support for in-place role modification and cache invalidation strategies to maintain consistency.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, django-redis (Redis caching), django-stubs (type hints)
**Storage**: PostgreSQL (Role, Permission, RoleAssignment models with foreign key constraints and unique indexes)
**Testing**: pytest + pytest-django (180+ test cases covering inheritance, caching, edge cases, security scenarios)
**Target Platform**: Linux/macOS/Windows server environments (Django WSGI/ASGI)
**Project Type**: Django web application with REST API
**Performance Goals**: <2ms permission check latency (95th percentile), 90% cache hit rate, <500ms role assignment operations (99th percentile)
**Constraints**: One role per user per scope level (enforced via unique constraint), 5-minute Redis cache TTL with immediate invalidation on role changes, eventual consistency acceptable (not real-time revocation)
**Scale/Scope**: Supports 10k+ users with 3 role assignments each (global + org + project), scalable to 100k+ role assignments with Redis caching

**Planning Decisions**:
1. **Cache Warming**: Hybrid strategy - pre-warm global/superuser roles on startup, lazy-load org/project roles on first access
2. **Permission Registry**: Django AppConfig.ready() hook pattern for registering custom permissions
3. **DRF Integration**: Custom permission classes (e.g., `HasPermission('projects.delete')`) in viewset `permission_classes`
4. **Audit Control**: Database `is_sensitive` boolean flag on Permission model, configurable via admin interface
5. **B09 Integration**: Build adapter layer with Django logging fallback (B09 spec exists but not implemented yet)

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
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose
- [x] **Stable APIs**: Public interfaces are documented and stable
- [x] **Minimal Dependencies**: Only necessary dependencies included
- [x] **No Circular Deps**: Dependency graph is acyclic
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: Core modules will use type hints throughout
- [x] **Black Formatting**: All code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Implementation removes unused code
- [x] **Readable Code**: Functions/classes remain small and focused
- [x] **Curated Dependencies**: New dependencies are justified and pinned

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: Tests included for all features
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
- [x] **Deterministic**: Tests are not flaky or environment-dependent
- [x] **Coverage Thresholds**: Coverage targets defined and enforced
- [x] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms
- [x] **No Sensitive Logging**: Sensitive data not logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented
- [x] **Pagination**: APIs use pagination for unbounded data
- [x] **Explicit Caching**: Caching strategy documented if used
- [x] **Structured Logging**: Logging infrastructure in place
- [x] **Health Checks**: Health check endpoints defined
- [x] **Metrics Hooks**: Observability metrics captured
- [x] **Graceful Degradation**: Failure handling strategy defined

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
- [x] **Consistent Responses**: API response format standardized
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
- [x] **Boundary Validation**: Validation in serializers/forms

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
- [x] **Type Checking**: mypy runs cleanly on core modules
- [x] **Task Scripts**: Common operations scripted
- [x] **Developer Docs**: Setup and development docs exist

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `feature/NNN-name` branch
- [x] **Linked to Spec**: PR will reference spec document
- [x] **Focused PRs**: Changes remain small and focused
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [x] **Merge Gates**: All CI checks must pass before merge
- [x] **Scripted Deployment**: Deployment process documented/automated

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
- [x] **App README**: Each Django app has README
- [x] **Getting Started**: Setup guide exists or will be updated
- [x] **Extension Guide**: "How to extend" documentation exists or planned
- [x] **Spec Sync**: Implementation keeps spec up to date
- [x] **ADR Required**: Major architectural decisions documented (if applicable)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required (or changes documented)

### Violations Requiring Justification

*No violations. All constitutional principles are satisfied.*

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
src/
├── permissions/                          # NEW: Hierarchical RBAC Django app
│   ├── __init__.py
│   ├── py.typed
│   ├── models.py                        # Role, Permission, RoleAssignment models
│   ├── managers.py                      # Custom managers with select_related optimization
│   ├── admin.py                         # Django admin for role/permission management
│   ├── apps.py                          # AppConfig with registry initialization
│   ├── registry.py                      # Permission registry for custom permissions
│   ├── cache.py                         # Redis caching layer with invalidation
│   ├── evaluator.py                     # Permission evaluation engine (additive inheritance)
│   ├── audit.py                         # B09 adapter layer with Django logging fallback
│   ├── signals.py                       # Post-save/delete signals for cache invalidation
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py             # Initial schema with indexes
│   ├── management/
│   │   └── commands/
│   │       ├── seed_default_roles.py   # Create 7 starter roles
│   │       └── warm_permission_cache.py # Pre-warm global roles on startup
│   ├── api/
│   │   ├── __init__.py
│   │   ├── serializers.py              # RoleSerializer, RoleAssignmentSerializer
│   │   ├── views.py                    # RoleViewSet, RoleAssignmentViewSet
│   │   ├── permissions.py              # HasPermission DRF permission class
│   │   └── urls.py                     # API routes for role management
│   └── README.md                        # App documentation and extension guide
├── accounts/                            # EXISTING: User model (dependency)
├── organisations/                       # EXISTING: Organisation model (dependency)
├── projects/                            # EXISTING: Project model (dependency)
└── config/
    ├── settings/
    │   ├── base.py                     # UPDATED: Add permissions to INSTALLED_APPS
    │   └── local.py                    # UPDATED: PERMISSIONS_CACHE_TTL = 300
    └── urls.py                          # UPDATED: Include permissions.api.urls

tests/
├── permissions/                         # NEW: Permission system tests
│   ├── __init__.py
│   ├── conftest.py                     # Fixtures for roles, users, orgs, projects
│   ├── test_models.py                  # Role, Permission, RoleAssignment tests
│   ├── test_evaluator.py               # Permission evaluation logic tests (50+ cases)
│   ├── test_cache.py                   # Cache hit/miss, invalidation tests
│   ├── test_registry.py                # Custom permission registration tests
│   ├── test_api.py                     # DRF endpoints tests (role CRUD, assignment)
│   ├── test_permissions_drf.py         # HasPermission DRF class tests
│   ├── test_audit.py                   # Audit logging integration tests
│   ├── test_signals.py                 # Cache invalidation signal tests
│   ├── test_integration.py             # End-to-end permission check scenarios
│   └── test_performance.py             # Latency and cache hit rate benchmarks
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
