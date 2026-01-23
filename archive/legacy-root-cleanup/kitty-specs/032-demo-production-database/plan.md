# Implementation Plan: Demo Production Database & Seed Data
*Path: [templates/plan-template.md](templates/plan-template.md)*


**Branch**: `032-demo-production-database` | **Date**: 2025-12-17 | **Spec**: [kitty-specs/032-demo-production-database/spec.md](kitty-specs/032-demo-production-database/spec.md)
**Input**: Feature specification from [kitty-specs/032-demo-production-database/spec.md](kitty-specs/032-demo-production-database/spec.md)

**Note**: Planning questions resolved: projects=80 exact; audit events=200-300 seeded; transactions window=30 days; notifications unread range 5-10 seeded; auto-seed on `demo` profile only.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Production-ready demo database with comprehensive seed data: 5 orgs, 20 users, exactly 80 projects, 200-300 audit events (seeded range), transactions over last 30 days, notifications 5-10 unread per demo account. Supports PostgreSQL primary and SQLite fallback. Management commands: idempotent seed, reset with --force, validate integrity. `demo` profile auto-seeds on startup; `demo-lite` requires manual seed. Performance targets: <60s startup, <30s seed, ~50MB DB.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework (existing), django-redis, django-prometheus (existing)
**Storage**: PostgreSQL (primary), SQLite fallback
**Testing**: pytest + pytest-django; Playwright E2E reuse demo data
**Target Platform**: Docker Compose `demo` and `demo-lite` profiles; local dev on Windows/macOS/Linux
**Project Type**: Backend (Django) with existing demo frontend
**Performance Goals**: Seed <30s; startup <60s; DB size ~50MB; idempotent seed rerun <5s when data exists
**Constraints**: Use existing B01-B21 models (no schema changes); no raw SQL specific to one backend; auto-seed only for `demo`; manual seed for `demo-lite`
**Scale/Scope**: 5 orgs, 20 users, 80 projects, 200-300 audit events, notifications 5-10 unread per demo account, transactions last 30 days

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
- [x] **No N+1 Queries**: Query optimization plan documented (bulk_create; select_related/prefetch)
- [x] **Pagination**: APIs use pagination for unbounded data (unchanged)
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
- [x] **Feature Branch**: Work occurs on `feature/NNN-name` branch (using `032-demo-production-database` worktree)
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
| [e.g., Product-specific logic in core] | [specific business need] | [why extension points insufficient] |
| [e.g., New heavyweight dependency] | [specific capability] | [why lightweight alternatives insufficient] |

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/032-demo-production-database/
├── plan.md              # This file (filled)
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── accounts/
│   └── management/commands/        # seed_demo_data, reset_demo_data, validate_demo_data
├── organisations/
├── projects/
├── audit/
├── notifications/
└── ... (existing Django apps)

tests/
├── integration/                    # E2E-ish Django/Playwright integration (seeded data asserts)
└── unit/                           # Command-level tests (idempotency, validation)

docker/
├── compose/                        # Profiles: demo (auto-seed), demo-lite (manual seed)
└── env/                            # .env.demo.example
```

**Structure Decision**: Single Django project layout under `src/` with management commands in existing apps; tests colocated under `tests/` integration/unit; compose profiles for demo and demo-lite.

**Database Assumptions**:
- **Indexes**: Existing B01-B21 models already have appropriate indexes (FKs auto-indexed; explicit indexes on common query fields). No additional demo-specific indexes required; seed queries use ORM select_related/prefetch for efficiency.
- **Read Replica**: Settings-only template in .env.demo (Django DATABASES config with replica entry); no physical replica deployed in demo profile (future production optimization).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
