# Implementation Plan: B37 Workflow Engine & State Machine
*Path: [kitty-specs/048-workflow-engine-state/plan.md](kitty-specs/048-workflow-engine-state/plan.md)*


**Branch**: `048-workflow-engine-state` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/048-workflow-engine-state/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Generic workflow state machine for business processes. Workflows are defined as templates at system level, instantiated per project with permission overrides, and track progress through state transitions with full audit trail. Uses hybrid pattern: JSON definitions for admin-configurable workflows + Python execution for type-safe validators/hooks.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, Django REST Framework, Celery, Redis, PostgreSQL 15+
**Storage**: PostgreSQL 15+ with JSONB support, table partitioning (for TransitionHistory)
**Testing**: pytest + pytest-django, factory_boy for fixtures
**Target Platform**: Linux server (Railway deployment)
**Project Type**: Web backend (Django app within monorepo)
**Performance Goals**: <200ms p95 for state transitions (excluding async hooks), support 1000+ concurrent workflow instances
**Constraints**: Context JSON ≤64KB per instance, immutable TransitionHistory (audit compliance)
**Scale/Scope**: Generic core module supporting unlimited downstream products, designed for multi-tenant SaaS

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
- [x] **Coverage Thresholds**: Coverage targets defined and enforced (>90% models, >85% API, >80% services)
- [x] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms (B07 Projects)
- [x] **No Sensitive Logging**: Sensitive data not logged (context JSON logged by reference only)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented (select_related for GenericFK)
- [x] **Pagination**: APIs use pagination for unbounded data
- [x] **Explicit Caching**: Caching strategy documented if used (not required for MVP)
- [x] **Structured Logging**: Logging infrastructure in place (all transitions logged)
- [x] **Health Checks**: Health check endpoints defined (not specific to this feature)
- [x] **Metrics Hooks**: Observability metrics captured (transition execution time)
- [x] **Graceful Degradation**: Failure handling strategy defined (hooks don't block transitions)

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
- [x] **Consistent Responses**: API response format standardized
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation (new feature, no breaking changes)
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
- [x] **Boundary Validation**: Validation in serializers/forms

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
- [x] **Type Checking**: mypy runs cleanly on core modules
- [x] **Task Scripts**: Common operations scripted (Django management commands)
- [x] **Developer Docs**: Setup and development docs exist (module README, quickstart)

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `048-workflow-engine-state` branch
- [x] **Linked to Spec**: PR will reference spec document
- [x] **Focused PRs**: Changes remain small and focused (work packages)
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [x] **Merge Gates**: All CI checks must pass before merge
- [x] **Scripted Deployment**: Deployment process documented/automated (Railway)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
- [x] **App README**: Each Django app has README (documents/04-modules/B37-workflow-engine.md)
- [x] **Getting Started**: Setup guide exists or will be updated (quickstart.md)
- [x] **Extension Guide**: "How to extend" documentation exists or planned (validator/hook registration)
- [x] **Spec Sync**: Implementation keeps spec up to date
- [x] **ADR Required**: Major architectural decisions documented (research.md covers all decisions)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### XIII. Feature Delivery & Production Integration
- [x] **Migrations Ready**: Migration plan is production-safe (no destructive operations, additive only)
- [x] **Seed Data Planned**: Fixtures/factories will be created for testing and demo
- [x] **Admin Registration**: All models will be registered in Django Admin
- [x] **API Documentation**: Endpoints will be documented in Swagger/OpenAPI
- [x] **Demo Integration**: Feature will be visible/testable in demo app (minimal UI for creating instances/executing transitions)
- [x] **Manual Test File**: Test file will be created in `documents/08-testing/manual-tests/B37-workflow-engine.md`
- [x] **Documentation**: Module README and usage examples will be provided

### Violations Requiring Justification

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., Product-specific logic in core] | [specific business need] | [why extension points insufficient] |
| [e.g., New heavyweight dependency] | [specific capability] | [why lightweight alternatives insufficient] |

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
src/workflows/
├── __init__.py
├── apps.py
├── admin.py
├── urls.py
├── registry.py
├── managers.py
├── models/
│   ├── __init__.py
│   ├── template.py          # WorkflowTemplate model
│   ├── instance.py          # WorkflowInstance model
│   ├── history.py           # TransitionHistory model
│   └── permissions.py       # ProjectPermissionOverride model
├── services/
│   ├── __init__.py
│   └── engine.py            # WorkflowEngine service class
├── serializers/
│   ├── __init__.py
│   ├── template.py
│   ├── instance.py
│   ├── history.py
│   └── permissions.py
├── views/
│   ├── __init__.py
│   ├── templates.py         # WorkflowTemplateViewSet
│   ├── instances.py         # WorkflowInstanceViewSet
│   ├── history.py           # TransitionHistoryViewSet
│   └── permissions.py       # ProjectPermissionOverrideViewSet
└── examples.py              # Example validators and hooks

tests/workflows/
├── conftest.py              # Shared pytest fixtures
├── factories.py             # factory_boy factories
├── unit/
│   ├── test_models.py
│   ├── test_engine.py
│   ├── test_registry.py
│   └── test_serializers.py
└── integration/
    ├── test_template_api.py
    ├── test_instance_api.py
    ├── test_transition_api.py
    ├── test_permissions_api.py
    └── test_history_api.py

documents/04-modules/
└── B37-workflow-engine.md   # Module README

documents/08-testing/manual-tests/
└── B37-workflow-engine.md   # Manual test scenarios
```

**Structure Decision**: Django app within existing monorepo at `src/workflows/`. Uses standard Django app structure with separate subdirectories for models, services, serializers, and views to maintain organization as the app grows.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
