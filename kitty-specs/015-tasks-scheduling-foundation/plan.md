# Implementation Plan: Tasks & Scheduling Foundation
*Path: kitty-specs/015-tasks-scheduling-foundation/plan.md*

**Branch**: `015-tasks-scheduling-foundation` | **Date**: 2025-11-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/015-tasks-scheduling-foundation/spec.md`

## Summary

Implement async task execution and periodic scheduling infrastructure for Django Core-App using Celery. Provides baseline capability for offloading heavy operations to background workers with automatic retry, periodic job scheduling via beat scheduler, audit integration via custom base task class, and health check endpoints for monitoring. Settings-driven periodic task configuration with optional extension point for database-backed schedules.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Celery 5.3+ with Redis broker, celery-beat for scheduling, pytest-celery for testing
**Storage**: Redis (broker and lightweight result backend), PostgreSQL (B09 audit events only)
**Testing**: pytest + pytest-django with fakeredis for unit tests, real Redis for integration tests
**Target Platform**: Linux server (production), multi-OS for development (macOS, Windows WSL)
**Project Type**: Web (Django backend infrastructure)
**Performance Goals**: <100ms task queueing overhead, 100+ concurrent tasks per worker, ±10s scheduling accuracy
**Constraints**: Settings-driven schedules (baseline), manual worker management, explicit context propagation
**Scale/Scope**: Foundation for all async operations in Core-App, supports ~10k tasks/day baseline with room for growth

## Planning Decisions (from Discovery Phase)

1. **Worker Management**: Manual baseline (developers run `celery worker` commands, systemd/supervisor docs provided)
2. **Task Result Storage**: Redis backend for status tracking only (leverages existing broker infrastructure)
3. **Audit Integration**: `AuditedTask` base class with opt-in inheritance (uses Celery signals internally for B09 integration)
4. **Context Propagation**: Explicit argument passing (user_id, org_id, request_id passed manually by developers)
5. **Health Checks**: Both Django view at `/health/tasks/` and management command `check_workers`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: ✅ PASS - Task infrastructure provides only generic async execution patterns. Example tasks demonstrate integration but contain no product logic.
- [x] **Core Focus**: ✅ PASS - Async task foundation is core infrastructure concern, supports audit (B09), settings (B01), notifications (B12).
- [x] **Downstream Extension**: ✅ PASS - Downstream products define their own tasks using provided base classes and patterns.

### II. Architecture and Modularity
- [x] **Single Responsibility**: ✅ PASS - `tasks` app handles only async execution infrastructure. Does not mix concerns.
- [x] **Stable APIs**: ✅ PASS - Task decorator API follows Celery standard patterns. Base classes provide stable extension points.
- [x] **Minimal Dependencies**: ✅ PASS - Celery + Redis only. Both widely adopted, stable dependencies.
- [x] **No Circular Deps**: ✅ PASS - Tasks app integrates with B09 audit (one-way dependency). No circular imports.
- [x] **No Downstream Imports**: ✅ PASS - Core task infrastructure contains no product-specific imports. Example tasks are illustrative only.

### III. Code Quality and Style
- [x] **Python 3.12+**: ✅ PASS - Implementation maintains Python 3.12+ baseline.
- [x] **Type Hints**: ✅ PASS - Core modules (base.py, health.py, celery.py) will include complete type hints.
- [x] **Black Formatting**: ✅ PASS - All code formatted with Black via pre-commit hooks.
- [x] **Ruff Linting**: ✅ PASS - Ruff configured as primary linter.
- [x] **No Dead Code**: ✅ PASS - Minimal baseline implementation, no unused code.
- [x] **Readable Code**: ✅ PASS - Task patterns prioritize clarity. Functions remain focused.
- [x] **Curated Dependencies**: ✅ PASS - Celery and Redis justify themselves (industry-standard async infrastructure).

### IV. Testing Strategy
- [x] **pytest + pytest-django**: ✅ PASS - Test suite uses pytest with pytest-celery utilities.
- [x] **Test Coverage**: ✅ PASS - 80%+ coverage target for task infrastructure (NFR-005).
- [x] **Regression Tests**: ✅ PASS - Test plan includes retry behavior, failure scenarios, audit integration.
- [x] **Deterministic**: ✅ PASS - Unit tests use fakeredis (no external dependencies). Integration tests isolated.
- [x] **Coverage Thresholds**: ✅ PASS - 80% minimum enforced via pytest-cov in CI.
- [x] **Integration Tests**: ✅ PASS - Broker connectivity, periodic scheduling, audit event creation covered.

### V. Security and Privacy
- [x] **Secure Defaults**: ✅ PASS - Task infrastructure does not modify Django security settings. Inherits existing secure defaults.
- [x] **DEBUG Off**: ✅ PASS - No DEBUG-specific behavior in task code.
- [x] **No Secrets**: ✅ PASS - `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` configured via environment variables.
- [x] **Dependency Scanning**: ✅ PASS - CI scans Celery and dependencies for vulnerabilities.
- [x] **Centralized Auth**: ✅ PASS - `AuditedTask` propagates user_id/org_id for authorization checks within tasks.
- [x] **No Sensitive Logging**: ✅ PASS - Sensitive task arguments can be masked via Celery serializer configuration. Documented.

### VI. Performance and Reliability
- [x] **No N+1 Queries**: ✅ PASS - Task infrastructure does not introduce database queries. Task implementations responsible for optimization.
- [x] **Pagination**: N/A - Task execution does not return unbounded data.
- [x] **Explicit Caching**: ✅ PASS - Redis used only for broker and status tracking. Caching strategy clear.
- [x] **Structured Logging**: ✅ PASS - Tasks integrate with Django logging infrastructure. Task metadata included in logs.
- [x] **Health Checks**: ✅ PASS - `/health/tasks/` endpoint checks broker connectivity. `check_workers` command provides detailed status.
- [x] **Metrics Hooks**: ✅ PASS - Integration points documented for B18-observability (future work). Celery signals available for metrics.
- [x] **Graceful Degradation**: ✅ PASS - Failed tasks retry automatically. Broker unavailability raises clear errors. Workers support graceful shutdown.

### VII. UX and API Design
- [x] **DRF Required**: N/A - B15 does not expose REST APIs. Future task status API would use DRF.
- [x] **Consistent Responses**: ✅ PASS - Health check endpoint returns consistent JSON structure.
- [x] **Versioning Strategy**: ✅ PASS - Task API follows Celery conventions (stable). Breaking changes would follow Celery versioning.
- [x] **Clear Errors**: ✅ PASS - Task failures log exceptions with tracebacks. Health checks return appropriate HTTP status codes.
- [x] **Boundary Validation**: ✅ PASS - Task arguments validated within task functions. Context validation helpers provided.

### VIII. Developer Experience and Tooling
- [ ] **Easy Setup**: Local environment setup documented and simple
- [ ] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [ ] **Pre-commit Hooks**: Hooks match CI checks
- [ ] **Type Checking**: mypy runs cleanly on core modules
- [ ] **Task Scripts**: Common operations scripted
- [ ] **Developer Docs**: Setup and development docs exist

### IX. Branching and Git Workflow
- [ ] **Feature Branch**: Work occurs on `feature/NNN-name` branch
- [ ] **Linked to Spec**: PR will reference spec document
- [ ] **Focused PRs**: Changes remain small and focused
- [ ] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [ ] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [ ] **Merge Gates**: All CI checks must pass before merge
- [ ] **Scripted Deployment**: Deployment process documented/automated

### XI. Documentation and Knowledge Sharing
- [ ] **In-Repo Docs**: Documentation lives in repository
- [ ] **App README**: Each Django app has README
- [ ] **Getting Started**: Setup guide exists or will be updated
- [ ] **Extension Guide**: "How to extend" documentation exists or planned
- [ ] **Spec Sync**: Implementation keeps spec up to date
- [ ] **ADR Required**: Major architectural decisions documented (if applicable)

### XII. Constitution Evolution
- [ ] **No Constitution Changes**: This feature does not require constitution amendments
- [ ] **Template Updates**: No template changes required (or changes documented)

### Violations Requiring Justification

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., Product-specific logic in core] | [specific business need] | [why extension points insufficient] |
| [e.g., New heavyweight dependency] | [specific capability] | [why lightweight alternatives insufficient] |

**Constitution Check Status**: [✅ PASS / ⚠️ NEEDS REVIEW / ❌ VIOLATIONS PRESENT]

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
