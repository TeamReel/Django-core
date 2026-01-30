# Implementation Plan: Content Templates & Generation (B31)

**Branch**: `040-content-templates-generation` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/040-content-templates-generation/spec.md`

**Status**: Planning Complete ✅

## Summary

B31 provides a reusable content generation workflow with approval tracking. Backend module enabling:
- Template management (sport-specific, timeout-configurable)
- Async content generation via Celery tasks
- Approval workflow with feedback loop
- Content library with retention policies
- Real-time status updates via WebSocket + polling fallback

**Technical Approach**: Single Django app (`content_generation`) with DRF ModelViewSets, B08 permissions, B15 Celery tasks, B22 file storage, B17 notifications. Backend API only - no frontend UI in this module.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.0+, DRF 3.14+, Celery 5.3+, Redis
**Storage**: PostgreSQL (via Django ORM), Redis (Celery broker), FileAssets (B22)
**Testing**: pytest + pytest-django + pytest-celery
**Target Platform**: Linux server (Railway production)
**Project Type**: Django backend API (no frontend)
**Performance Goals**: <2s Content Library load (1000 items), <5s status update latency
**Constraints**: Per-template generation timeout (30min default), org-configurable retention
**Scale/Scope**: 3 models, 15+ API endpoints, 5 new RBAC permissions, 433 existing role assignments

### Architecture Decisions (from Planning)

**App Structure**: Single Django app `src/content_generation/` (3 models: ContentTemplate, ContentItem, ContentApproval)
- Rationale: Cohesive domain (single lifecycle), follows B30 Activities pattern

**Task Queue**: Celery via B15 Tasks (existing Celery + Redis infrastructure)
- Rationale: Consistency with platform (B15 uses Celery), no new queue system

**API Pattern**: DRF ModelViewSets with custom `@action` decorators
- Rationale: Follows B13 API Baseline, consistent with B10/B06/B07

**Permissions**: Custom DRF classes using B08 `HasPermission('content_generation.*')`
- Rationale: TeamReel RBAC compatible, automatic audit logging

**Frontend Scope**: Backend API only - NO demo UI pages in this module
- Rationale: Demo pages handled separately in frontend module (F10b-Pages or new F-module)

### Integration Points

| Module | Integration | Purpose |
|--------|-------------|---------|
| B08 | Hierarchical Access Control | Permission enforcement via `HasPermission()` |
| B09 | Audit Trail | Log all generation/approval actions |
| B15 | Tasks & Scheduling | Celery task execution + cleanup cron |
| B17 | Notifications | Status change notifications |
| B22 | Files & Media | Output file storage + thumbnails |
| B23 | Real-time (WebSocket) | Status updates with polling fallback |
| B30 | Activities | Optional match/activity linking |
| B32 | Sport Configuration | Sport-specific template filtering |
| B34 | Generative Pipelines | Future: actual AI execution (B31 = tracking) |

### Non-Functional Requirements (from Clarifications)

**Timeouts** (Clarification Q1):
- Per-template: `ContentTemplate.timeout_minutes` (nullable)
- System default: 30 minutes (via B10: `CONTENT_GENERATION_DEFAULT_TIMEOUT_MINUTES`)
- Implementation: Celery `time_limit` parameter

**Real-time Updates** (Clarification Q2):
- Primary: B23 WebSocket connection
- Fallback: HTTP polling (3s → exponential backoff to 15s)
- Stop: On terminal states (completed/failed/approved/rejected)

**Retention Policy** (Clarification Q3):
- Per-org configurable via B10 settings
- Defaults: Failed=30 days, Rejected=90 days, Approved=indefinite
- Mechanism: Soft-delete (`deleted_at`), B15 daily cleanup cron

**Concurrency Handling** (Clarification Q4):
- Detect: Existing in-progress (queued/generating) for same template+activity
- UX: Warning modal with "Generate anyway?" option
- Behavior: Allow duplicates (user choice)

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
- [✓] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [✓] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [✓] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [✓] **Single Responsibility**: Each Django app has one clear purpose
- [✓] **Stable APIs**: Public interfaces are documented and stable
- [✓] **Minimal Dependencies**: Only necessary dependencies included
- [✓] **No Circular Deps**: Dependency graph is acyclic
- [✓] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [✓] **Python 3.12+**: Baseline version maintained
- [✓] **Type Hints**: Core modules will use type hints throughout
- [✓] **Black Formatting**: All code will be formatted with Black
- [✓] **Ruff Linting**: Ruff will be primary linter
- [✓] **No Dead Code**: Implementation removes unused code
- [✓] **Readable Code**: Functions/classes remain small and focused
- [✓] **Curated Dependencies**: New dependencies are justified and pinned

### IV. Testing Strategy
- [✓] **pytest + pytest-django**: Testing framework used
- [✓] **Test Coverage**: Tests included for all features (target: 80%)
- [✓] **Regression Tests**: Bug fixes include tests preventing recurrence
- [✓] **Deterministic**: Tests are not flaky or environment-dependent
- [✓] **Coverage Thresholds**: Coverage targets defined and enforced
- [✓] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [✓] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [✓] **DEBUG Off**: DEBUG disabled in non-dev environments
- [✓] **No Secrets**: No secrets committed; env vars/secret managers used (AI credentials)
- [✓] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [✓] **Centralized Auth**: Authentication/authorization uses B08 mechanisms
- [✓] **No Sensitive Logging**: Sensitive data not logged (only IDs/status)

### VI. Performance and Reliability
- [✓] **No N+1 Queries**: select_related() for template/project/activity FKs
- [✓] **Pagination**: APIs use pagination for Content Library
- [✓] **Explicit Caching**: Caching strategy documented if used
- [✓] **Structured Logging**: Logging infrastructure via B18 Observability
- [✓] **Health Checks**: Health check endpoints defined
- [✓] **Metrics Hooks**: Observability metrics captured
- [✓] **Graceful Degradation**: Failed generations are retryable

### VII. UX and API Design
- [✓] **DRF Required**: Django REST Framework ModelViewSets used
- [✓] **Consistent Responses**: API response format standardized (DRF defaults)
- [✓] **Versioning Strategy**: New endpoints only (no breaking changes)
- [✓] **Clear Errors**: Error messages clear and safe (no data leaks)
- [✓] **Boundary Validation**: Validation in serializers

### VIII. Developer Experience and Tooling
- [⚠️] **Easy Setup**: Local environment setup documented and simple *(Implementation phase - will update during WP08)*
- [⚠️] **Mandatory Tools**: Black, Ruff, mypy, pytest configured *(Implementation phase - will configure during WP01)*
- [⚠️] **Pre-commit Hooks**: Hooks match CI checks *(Implementation phase - will configure during WP08)*
- [⚠️] **Type Checking**: mypy runs cleanly on core modules *(Implementation phase - will validate during WP01-WP07)*
- [⚠️] **Task Scripts**: Common operations scripted *(Implementation phase - will add during WP08)*
- [⚠️] **Developer Docs**: Setup and development docs exist *(Implementation phase - module README in WP08)*

### IX. Branching and Git Workflow
- [✓] **Feature Branch**: Work occurs on `040-content-templates-generation` branch *(Already created)*
- [⚠️] **Linked to Spec**: PR will reference spec document *(Implementation phase - will link during PR creation)*
- [⚠️] **Focused PRs**: Changes remain small and focused *(Implementation phase - will split into reviewable chunks)*
- [✓] **main Stable**: No direct commits to main *(Enforced by workflow)*

### X. CI/CD and Quality Gates
- [⚠️] **CI Checks**: Linting, formatting, mypy, pytest in CI *(Implementation phase - will run during PR)*
- [⚠️] **Merge Gates**: All CI checks must pass before merge *(Implementation phase - enforced by PR workflow)*
- [⚠️] **Scripted Deployment**: Deployment process documented/automated *(Implementation phase - WP08)*

### XI. Documentation and Knowledge Sharing
- [✓] **In-Repo Docs**: Documentation lives in repository *(This spec, plan, tasks in kitty-specs/)*
- [⚠️] **App README**: Each Django app has README *(Implementation phase - will create in WP08)*
- [⚠️] **Getting Started**: Setup guide exists or will be updated *(Implementation phase - will update in WP08)*
- [✓] **Extension Guide**: "How to extend" documentation exists or planned *(Extension points documented in spec.md)*
- [⚠️] **Spec Sync**: Implementation keeps spec up to date *(Implementation phase - will update as needed)*
- [✓] **ADR Required**: Major architectural decisions documented *(research.md covers key decisions)*

### XII. Constitution Evolution
- [✓] **No Constitution Changes**: This feature does not require constitution amendments
- [✓] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations detected - all Constitution checks pass.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/040-content-templates-generation/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (Celery patterns, DRF permissions, WebSocket fallback)
├── data-model.md        # Phase 1 output (ContentTemplate, ContentItem, ContentApproval entities)
├── quickstart.md        # Phase 1 output (API usage examples)
├── contracts/           # Phase 1 output (15+ API endpoint contracts)
│   ├── templates.json
│   ├── content-items.json
│   └── approvals.json
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
src/
├── content_generation/           # B31 app
│   ├── models.py                # ContentTemplate, ContentItem, ContentApproval
│   ├── serializers.py           # DRF ModelSerializers
│   ├── views.py                 # DRF ModelViewSets with @action decorators
│   ├── tasks.py                 # Celery tasks (generate_content, cleanup_old_items)
│   ├── permissions.py           # DRF permission classes via B08
│   ├── services.py              # Business logic (AI integration, approval workflows)
│   ├── admin.py                 # Django Admin interface
│   ├── apps.py
│   ├── urls.py
│   └── migrations/
└── [existing B08-B32 modules]/

tests/
├── content_generation/
│   ├── test_models.py           # Model validation, state transitions
│   ├── test_views.py            # API endpoint tests (15+ endpoints)
│   ├── test_tasks.py            # Celery task tests (mocked AI)
│   ├── test_permissions.py      # RBAC permission tests
│   └── test_services.py         # Business logic tests
└── [existing test modules]/
```

**Structure Decision**: Single Django app `src/content_generation/` following existing Django Core pattern. Backend-only implementation (no frontend/). All source code lives in repository root, not in separate backend/ folder. Tests mirror source structure under `tests/content_generation/`.
