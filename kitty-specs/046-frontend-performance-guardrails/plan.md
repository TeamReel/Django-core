# Implementation Plan: Frontend Performance Guardrails (B40)
*Path: kitty-specs/046-frontend-performance-guardrails/plan.md*


**Branch**: `046-frontend-performance-guardrails` | **Date**: 2025-02-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/046-frontend-performance-guardrails/spec.md`

## Summary

**Requirement**: Prevent frontend over-fetching through backend-enforced pagination limits, budget headers, and cache support.

**Technical Approach**: Extend existing `BaseAPIPagination` class to enforce page/item limits, emit `X-Fetch-Budget` header, integrate B10 feature flags for runtime control, and add observability logging. Zero changes to existing ViewSets.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, Django REST Framework, existing `src/api/pagination.py`
**Storage**: N/A (settings-based configuration only)
**Testing**: pytest + pytest-django, APIClient for request testing
**Target Platform**: Django API server (Railway)
**Project Type**: Backend-only (extends existing `src/api/` module)
**Performance Goals**: <5ms overhead per request for guardrail checks
**Constraints**: Zero breaking changes to existing pagination behavior when disabled
**Scale/Scope**: All paginated endpoints automatically covered (~20+ ViewSets)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: Extends existing `api` module (pagination concerns)
- [x] **Stable APIs**: Public interfaces are documented and stable
- [x] **Minimal Dependencies**: Only uses existing DRF and B10 feature flags
- [x] **No Circular Deps**: Dependency graph is acyclic
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: Core modules will use type hints throughout
- [x] **Black Formatting**: All code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Implementation removes unused code
- [x] **Readable Code**: Functions/classes remain small and focused
- [x] **Curated Dependencies**: No new dependencies required

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: Tests included for all features (target: 90%+)
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
- [x] **Deterministic**: Tests are not flaky or environment-dependent
- [x] **Coverage Thresholds**: Coverage targets defined and enforced
- [x] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [x] **Secure Defaults**: No security changes
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
- [x] **Dependency Scanning**: No new dependencies
- [x] **Centralized Auth**: N/A (pagination-only feature)
- [x] **No Sensitive Logging**: Budget logs contain no PII

### VI. Performance and Reliability
- [x] **No N+1 Queries**: No new queries added
- [x] **Pagination**: This feature IS the pagination guardrail
- [x] **Explicit Caching**: ETag/Last-Modified for cache support
- [x] **Structured Logging**: Budget events use structlog
- [x] **Health Checks**: N/A (extends existing endpoints)
- [x] **Metrics Hooks**: Budget exceeded/warning events logged
- [x] **Graceful Degradation**: Guardrails can be disabled via feature flag

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
- [x] **Consistent Responses**: API response format standardized (envelope format)
- [x] **Versioning Strategy**: No breaking changes (additive headers only)
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
- [x] **Boundary Validation**: Page limits validated before query execution

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
- [x] **Type Checking**: mypy runs cleanly on core modules
- [x] **Task Scripts**: Common operations scripted
- [x] **Developer Docs**: Quickstart guide created

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `046-frontend-performance-guardrails` branch
- [x] **Linked to Spec**: PR will reference spec document
- [x] **Focused PRs**: Changes remain small and focused (single concern)
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [x] **Merge Gates**: All CI checks must pass before merge
- [x] **Scripted Deployment**: Deployment process documented/automated

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
- [x] **App README**: Existing api app will be updated
- [x] **Getting Started**: Quickstart guide created
- [x] **Extension Guide**: Extension points documented (custom pagination classes)
- [x] **Spec Sync**: Implementation keeps spec up to date
- [x] **ADR Required**: No major architectural decisions needed

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations - all checks pass.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/046-frontend-performance-guardrails/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions
├── data-model.md        # Configuration entities
├── quickstart.md        # Developer quickstart
├── contracts/           # API contracts
│   └── openapi.yaml     # Header/response schemas
├── checklists/          # Quality checklists
│   └── requirements.md  # Requirements checklist
└── tasks.md             # Work packages (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── api/
│   ├── pagination.py    # MODIFY: Extend BaseAPIPagination with guardrails
│   ├── mixins.py        # CREATE: CacheHeadersMixin for ETag/Last-Modified
│   └── __init__.py      # MODIFY: Export new mixin
├── config/
│   └── settings/
│       └── base.py      # MODIFY: Add FETCH_GUARDRAIL_* settings

tests/
├── api/
│   ├── test_pagination_guardrails.py  # CREATE: Unit tests
│   └── test_cache_headers.py          # CREATE: Cache header tests
└── integration/
    └── test_guardrail_integration.py  # CREATE: E2E tests
```

**Structure Decision**: Extends existing `src/api/` module. No new Django apps created.

## Complexity Tracking

*No complexity violations - simple extension of existing pagination class.*

---

## Implementation Phases

### Phase 0: Research & Decisions ✅ COMPLETE
- **Output**: [research.md](research.md)
- **Decisions**:
  1. Guardrail Pattern → Extend `BaseAPIPagination` (not middleware)
  2. Feature Flags → B10 integration via `get_flag()`
  3. Cache Headers → Separate `CacheHeadersMixin` (ViewSet-level)
  4. Observability → Structured logging for budget events
  5. Per-Endpoint Overrides → Settings dict `FETCH_GUARDRAIL_OVERRIDES`

### Phase 1: Design & Contracts ✅ COMPLETE
- **Output**:
  - [data-model.md](data-model.md) - Configuration entities, runtime objects
  - [contracts/openapi.yaml](contracts/openapi.yaml) - API contract for headers
  - [quickstart.md](quickstart.md) - Developer guide

### Phase 2: Core Implementation (via /spec-kitty.tasks)
- **Work Packages**:
  - WP01: Settings & Configuration
  - WP02: Pagination Guardrails (MVP)
  - WP03: Cache Headers Mixin
  - WP04: Optimistic Create Support
  - WP05: Unit Tests (MVP)
  - WP06: Integration Tests
  - WP07: Documentation & Polish

---

## Estimates Summary

| Phase | Work Packages | Estimated Hours |
|-------|---------------|-----------------|
| Phase 0 | Research | 2h |
| Phase 1 | Design | 3h |
| Phase 2 | WP01-WP06 | 8-10h |
| **Total** | | **13-15h** |

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| B10 Feature Flags | Integration | ✅ Available (`settings.api.get_flag()`) |
| B20 Structured Logging | Integration | ✅ Available (`structlog`) |
| `BaseAPIPagination` | Existing Code | ✅ Available (`src/api/pagination.py`) |

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing pagination | Low | High | Feature flag off by default, comprehensive tests |
| Performance overhead | Low | Medium | <5ms target, benchmark in tests |
| Frontend confusion | Medium | Low | Clear error messages, X-Fetch-Budget header |

---

## Next Steps

1. Run `/spec-kitty.tasks` to create work packages
2. Begin WP01: Settings & Configuration
3. Iterate through remaining work packages
