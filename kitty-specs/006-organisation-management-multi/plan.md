# Implementation Plan: Organisation Management & Multi-Tenancy
*Path: kitty-specs/006-organisation-management-multi/plan.md*


**Branch**: `006-organisation-management-multi` | **Date**: 2025-11-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/006-organisation-management-multi/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Create a generic organisation module enabling multi-tenancy through flat organisational structures with simple role-based membership. Users can create organisations, invite members, assign admin/member roles, and manage organisation lifecycle including soft-delete with 30-day restoration. Implementation uses UUID-based data model with Redis-backed rate limiting (5 orgs/user/day, 20 invites/org/hour) and Prometheus metrics for observability. The system provides RESTful API endpoints via Django REST Framework with role-based permissions enforced through custom DRF permission classes.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, django-redis 5.4.0, django-prometheus 2.3.1
**Storage**: PostgreSQL (Organisation and Membership models with UUID primary keys), Redis (rate limiting cache)
**Testing**: pytest + pytest-django, coverage targets: 100% models/managers/permissions, >90% views/API
**Target Platform**: Linux/Windows server (Django web application)
**Project Type**: Web application (backend API)
**Performance Goals**: <200ms p95 API response time, 1000+ concurrent users
**Constraints**: 5 org creations per user per 24 hours, 20 invitations per org per hour, 30-day soft-delete retention
**Scale/Scope**: Support 10,000+ organisations, 100,000+ memberships, horizontal scaling via Redis

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

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/006-organisation-management-multi/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model documentation
├── quickstart.md        # Phase 1 setup guide
├── contracts/           # Phase 1 API contracts
│   └── organisations-api.yaml  # OpenAPI 3.0 specification
├── research/            # Phase 0 research artifacts
│   ├── evidence-log.csv      # Research findings log
│   └── source-register.csv   # Source documentation
└── checklists/          # Validation artifacts
    └── requirements.md  # Specification validation checklist
```

### Source Code (repository root)

```
src/
├── organisations/       # New Django app for this feature
│   ├── __init__.py
│   ├── models.py       # Organisation, Membership models
│   ├── managers.py     # Custom model managers
│   ├── admin.py        # Django admin configuration
│   ├── apps.py         # App configuration
│   ├── api/            # REST API implementation
│   │   ├── __init__.py
│   │   ├── serializers.py   # DRF serializers
│   │   ├── views.py         # DRF viewsets
│   │   ├── urls.py          # API URL configuration
│   │   └── permissions.py   # Custom DRF permission classes
│   ├── migrations/     # Django migrations
│   │   └── 0001_initial.py
│   └── signals.py      # Django signals for metrics

tests/
└── organisations/      # Test suite for organisations app
    ├── __init__.py
    ├── conftest.py     # Pytest fixtures
    ├── factories.py    # Factory Boy factories
    ├── test_models.py  # Model tests
    ├── test_managers.py     # Manager tests
    ├── test_permissions.py  # Permission tests
    ├── test_signals.py      # Signal tests
    └── api/            # API test suite
        ├── __init__.py
        ├── test_serializers.py
        ├── test_views.py
        └── test_rate_limiting.py
```

**Structure Decision**: Single project with modular Django app structure. The `organisations` app uses sub-packages (api/, migrations/) to organize related functionality. This follows Django best practices and maintains clear separation of concerns:
- **models.py**: Core domain models (Organisation, Membership)
- **managers.py**: Custom QuerySet managers for complex queries
- **api/**: RESTful API layer (serializers, views, permissions, URLs)
- **admin.py**: Django admin interface configuration
- **signals.py**: Django signals for Prometheus metrics integration

Test structure mirrors source structure with separation of unit tests (models, managers, permissions) and API integration tests.

## Complexity Tracking

No violations - all architecture decisions align with Django best practices and constitution requirements. No additional complexity introduced beyond necessary dependencies (Redis for rate limiting, Prometheus for metrics) which are justified by functional requirements FR-025 through FR-032.
