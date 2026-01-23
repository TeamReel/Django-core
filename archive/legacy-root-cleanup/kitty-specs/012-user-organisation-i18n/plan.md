# Implementation Plan: User & Organisation i18n Preferences
*Path: kitty-specs/012-user-organisation-i18n/plan.md*

**Branch**: `012-user-organisation-i18n` | **Date**: 2025-11-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/012-user-organisation-i18n/spec.md`

## Summary

Extend the base i18n layer (B04) to support user and organisation-specific language, locale, and time zone preferences. Users can set personal preferences that override organisation defaults, which in turn override global Django settings. The system integrates with B10 (Settings & Feature Flags) for storage and caching, extends Django's LocaleMiddleware and TimezoneMiddleware for automatic activation, and provides explicit activation helpers for API requests and background jobs.

**Technical Approach**:
- Create dedicated `src/i18n_preferences/` Django app
- Extend B10's Setting model to add USER scope (new ScopeType.USER + user ForeignKey)
- Store preferences as JSON blobs via B10 (single key per user/org)
- Custom middleware classes inherit from Django's LocaleMiddleware/TimezoneMiddleware
- Leverage B10's Redis caching with graceful degradation (< 10ms warm, < 50ms cold)
- Precedence resolution: user > organisation > global

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, pytz (time zones), B10 Settings System
**Storage**: PostgreSQL (via B10's Setting model with USER scope extension), Redis (B10 cache layer)
**Testing**: pytest 8.0+, pytest-django, Django TestCase for integration tests
**Target Platform**: Linux server (Django web application)
**Project Type**: Web backend (Django multi-app architecture)
**Performance Goals**: < 10ms preference resolution (p95, warm cache), < 50ms (cold cache/Redis unavailable), support 10,000 concurrent users
**Constraints**: < 200ms p95 latency for API endpoints, graceful degradation without Redis (no HTTP 503), HTTP 400 validation errors for invalid preferences
**Scale/Scope**: Per-user + per-organisation preferences (1000s of orgs, 10,000s of users), 27 functional requirements, 50 test cases target, 95% coverage for resolution module

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
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows ✅ PASS (Generic i18n preference layer, no product logic)
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability) ✅ PASS (Extends core i18n/settings infrastructure)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points ✅ PASS (FR-027 documents extensibility via B10 settings schema)

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose ✅ PASS (i18n_preferences app focused solely on locale preference management)
- [x] **Stable APIs**: Public interfaces are documented and stable ✅ PASS (DRF endpoints documented, middleware extends Django built-ins)
- [x] **Minimal Dependencies**: Only necessary dependencies included ✅ PASS (Only adds pytz, leverages existing B10/DRF/Django)
- [x] **No Circular Deps**: Dependency graph is acyclic ✅ PASS (Depends on B10, accounts, organisations - no circles)
- [x] **No Downstream Imports**: Core does not import from product-specific projects ✅ PASS (No product imports)

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained ✅ PASS (Spec requires Python 3.12+)
- [x] **Type Hints**: Core modules will use type hints throughout ✅ PASS (Spec requires type hints, mypy validation)
- [x] **Black Formatting**: All code will be formatted with Black ✅ PASS (Pre-commit hooks enforce Black)
- [x] **Ruff Linting**: Ruff will be primary linter ✅ PASS (Ruff in CI pipeline)
- [x] **No Dead Code**: Implementation removes unused code ✅ PASS (New code only, no legacy removal needed)
- [x] **Readable Code**: Functions/classes remain small and focused ✅ PASS (Preference resolution, middleware, API - clear boundaries)
- [x] **Curated Dependencies**: New dependencies are justified and pinned ✅ PASS (pytz for IANA time zones, already pinned in Django ecosystem)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used ✅ PASS (Spec requires pytest 8.0+)
- [x] **Test Coverage**: Tests included for all features ✅ PASS (50 test cases planned, all FRs covered)
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence ✅ PASS (Standard practice)
- [x] **Deterministic**: Tests are not flaky or environment-dependent ✅ PASS (Unit + integration tests, no UI/timing dependencies)
- [x] **Coverage Thresholds**: Coverage targets defined and enforced ✅ PASS (95% for resolution module, 90% overall)
- [x] **Integration Tests**: Key user flows have integration test coverage ✅ PASS (Planning confirmed unit + integration strategy, full request/response cycle)

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured ✅ PASS (Django defaults maintained)
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments ✅ PASS (Django settings, no changes)
- [x] **No Secrets**: No secrets committed; env vars/secret managers used ✅ PASS (No secrets needed, preferences are non-sensitive)
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities ✅ PASS (CI pipeline includes dependency scanning)
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms ✅ PASS (DRF permissions, B08 for org admin actions)
- [x] **No Sensitive Logging**: Sensitive data not logged ✅ PASS (Language/timezone are non-PII, spec excludes user IDs in production logs)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented ✅ PASS (Single DB query per request via B10 cache, FR-023)
- [x] **Pagination**: APIs use pagination for unbounded data ✅ PASS (N/A - preference endpoints return single user/org record)
- [x] **Explicit Caching**: Caching strategy documented if used ✅ PASS (B10 Redis cache, keys: i18n:user:{id}, i18n:org:{id})
- [x] **Structured Logging**: Logging infrastructure in place ✅ PASS (FR-015: DEBUG level logging for locale activation)
- [x] **Health Checks**: Health check endpoints defined ✅ PASS (Leverages existing Django health checks)
- [x] **Metrics Hooks**: Observability metrics captured ✅ PASS (Metrics: cache_hit_rate, resolution_duration_ms, cache_degradation_events)
- [x] **Graceful Degradation**: Failure handling strategy defined ✅ PASS (Clarification: < 50ms with cold cache, no HTTP 503 on Redis failure)

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs ✅ PASS (Spec uses DRF for all API endpoints)
- [x] **Consistent Responses**: API response format standardized ✅ PASS (DRF serializers ensure consistency)
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation ✅ PASS (API versioned: /api/v1/preferences/)
- [x] **Clear Errors**: Error messages clear and safe (no data leaks) ✅ PASS (Clarification: HTTP 400 with DRF validation errors)
- [x] **Boundary Validation**: Validation in serializers/forms ✅ PASS (FR-005: Validate language/locale/timezone codes in serializers)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple ✅ PASS (Standard Django app, no special setup)
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured ✅ PASS (All in CI pipeline)
- [x] **Pre-commit Hooks**: Hooks match CI checks ✅ PASS (Pre-commit hooks already configured)
- [x] **Type Checking**: mypy runs cleanly on core modules ✅ PASS (Type hints required per spec)
- [x] **Task Scripts**: Common operations scripted ✅ PASS (Management command for migration: FR-025)
- [x] **Developer Docs**: Setup and development docs exist ✅ PASS (FR-027, doc deliverables: i18n-preferences.md, i18n-integration.md, ADR)

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `feature/NNN-name` branch ✅ PASS (Branch: 012-user-organisation-i18n)
- [x] **Linked to Spec**: PR will reference spec document ✅ PASS (Spec in kitty-specs/012-user-organisation-i18n/)
- [x] **Focused PRs**: Changes remain small and focused ✅ PASS (Feature scope well-defined)
- [x] **main Stable**: No direct commits to main ✅ PASS (Worktree workflow enforces this)

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI ✅ PASS (Existing CI pipeline covers all)
- [x] **Merge Gates**: All CI checks must pass before merge ✅ PASS (CI gates enforced)
- [x] **Scripted Deployment**: Deployment process documented/automated ✅ PASS (Standard Django migrations)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository ✅ PASS (docs/i18n-preferences.md, docs/i18n-integration.md)
- [x] **App README**: Each Django app has README ✅ PASS (src/i18n_preferences/README.md planned)
- [x] **Getting Started**: Setup guide exists or will be updated ✅ PASS (Part of i18n-preferences.md)
- [x] **Extension Guide**: "How to extend" documentation exists or planned ✅ PASS (FR-027: Document extending preference types)
- [x] **Spec Sync**: Implementation keeps spec up to date ✅ PASS (Standard practice)
- [x] **ADR Required**: Major architectural decisions documented (if applicable) ✅ PASS (ADR planned: "Why store preferences in B10 vs separate table")

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments ✅ PASS (No constitutional changes needed)
- [x] **Template Updates**: No template changes required (or changes documented) ✅ PASS (No template changes)

### Violations Requiring Justification

*No violations - all constitution checks passed*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/012-user-organisation-i18n/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification (input)
├── research.md          # Planning decisions and rationale
├── data-model.md        # Entity relationships and database schema
├── quickstart.md        # Phase-by-phase implementation guide
├── contracts/
│   └── api-preferences.yaml  # OpenAPI spec for DRF endpoints
├── checklists/
│   └── requirements.md  # Specification quality validation
└── tasks/
    └── [Created by /spec-kitty.tasks command]
```

### Implementation Structure (Django Multi-App)

```
src/
├── i18n_preferences/          # NEW: B12 feature app
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py              # Empty (uses B10's Setting model)
│   ├── services.py            # Preference resolution, precedence logic
│   ├── middleware.py          # PreferenceLocaleMiddleware, PreferenceTimezoneMiddleware
│   ├── serializers.py         # DRF serializers with validation
│   ├── views.py               # API views (user prefs, org defaults, effective)
│   ├── urls.py                # URL routing for /api/v1/preferences/
│   ├── permissions.py         # Org admin permission checks
│   ├── helpers.py             # activate_user_locale(), activate_org_locale()
│   ├── validators.py          # Language/locale/timezone code validation
│   ├── admin.py               # Django admin integration
│   ├── management/
│   │   └── commands/
│   │       └── migrate_user_i18n_preferences.py  # Data migration command
│   └── migrations/
│       └── 0001_initial_global_default.py  # Populate global default
│
├── settings/                  # MODIFIED: B10 app (add USER scope)
│   ├── models.py              # Add ScopeType.USER, user ForeignKey
│   ├── api.py                 # Extend _resolve_scope_hierarchy() for user
│   ├── permissions.py         # User-level setting permissions
│   └── migrations/
│       └── 0005_add_user_scope.py  # Schema change
│
└── [Other existing apps: accounts/, organisations/, projects/, etc.]

tests/
├── i18n_preferences/          # NEW: B12 tests
│   ├── test_services.py       # Unit: Preference resolution (15 cases)
│   ├── test_validators.py     # Unit: Code validation (5 cases)
│   ├── test_serializers.py    # Unit: DRF serializers (5 cases)
│   ├── test_middleware.py     # Integration: Middleware activation (10 cases)
│   ├── test_api.py            # Integration: API endpoints (12 cases)
│   ├── test_cache.py          # Integration: B10 cache behavior (2 cases)
│   └── test_migration.py      # Migration: Management command (5 cases)
│
└── settings/                  # MODIFIED: B10 tests
    └── test_user_scope.py     # NEW: Test USER scope resolution

docs/
├── i18n-preferences.md        # NEW: User guide
├── i18n-integration.md        # NEW: Developer integration guide
└── adr/
    └── NNN-i18n-preferences-in-b10.md  # NEW: ADR for B10 integration decision
```

**Structure Decision**: Django multi-app architecture (Option 1 variant). B12 creates new `i18n_preferences` app and extends existing `settings` app (B10) to add USER scope support. All code follows existing Django Core-App patterns.
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

**Structure Decision**: Django multi-app architecture (Option 1 variant). B12 creates new `i18n_preferences` app and extends existing `settings` app (B10) to add USER scope support. All code follows existing Django Core-App patterns.

---

## Phase 0: Research Summary ✅ COMPLETE

All planning questions answered and technical decisions documented in `research.md`:

### Key Decisions

1. **App Structure**: Dedicated `src/i18n_preferences/` Django app (maintains separation of concerns)
2. **B10 Integration**: Extend Setting model with USER scope (cleanest architecture, leverages existing cache/validation)
3. **Middleware Strategy**: Inherit from Django's LocaleMiddleware/TimezoneMiddleware (maximum compatibility)
4. **Testing Approach**: Unit + Integration tests (no E2E/UI needed for backend feature)
5. **Performance Strategy**: < 10ms warm cache, < 50ms cold/degraded (graceful without Redis)

### Research Artifacts

- ✅ `research.md`: All 5 planning decisions with rationale, alternatives, B10 investigation findings
- ✅ `data-model.md`: Entity relationships, validation rules, state transitions, query patterns, migrations
- ✅ `contracts/api-preferences.yaml`: Complete OpenAPI spec with examples, validation errors
- ✅ `quickstart.md`: Phase-by-phase implementation guide with acceptance criteria

---

## Phase 1: Design & Contracts ✅ COMPLETE

### Data Model Defined

**Core Entities** (see `data-model.md`):
- `Setting` (B10 model - extended): Stores preferences as JSON with USER/ORG/GLOBAL scopes
- `EffectivePreferences` (computed): Result of precedence resolution with source attribution

**Validation Rules**:
- Language: Must be in `settings.LANGUAGES` (ISO 639-1)
- Locale: Must be valid Django locale (BCP 47)
- Timezone: Must be in `pytz.all_timezones` (IANA)

**State Transitions**: User preference lifecycle, org default lifecycle, cache invalidation flows

### API Contracts Generated

**Endpoints** (see `contracts/api-preferences.yaml`):
- `GET/PATCH/DELETE /api/v1/preferences/me/` - User preferences
- `GET /api/v1/preferences/effective/` - Resolved preferences with sources
- `GET/PATCH/DELETE /api/v1/organisations/{id}/preferences/` - Org defaults (admin only)

**Response Formats**: JSON with DRF serializers, HTTP 400 validation errors, source attribution

### Quickstart Guide Created

**Implementation Phases** (see `quickstart.md`):
1. Extend B10 with USER scope (critical first step)
2. Create i18n_preferences app
3. Implement preference resolution
4. Implement middleware
5. Implement API endpoints
6. Implement explicit activation helpers
7. Create migration command
8. Documentation

**Testing Checklist**: 50 test cases (25 unit, 20 integration, 5 migration)
**Performance Benchmarks**: Metrics, alerts, deployment steps

### Agent Context Updated

✅ GitHub Copilot context updated with B12 technologies:
- Python 3.12+, Django 5.1+, DRF 3.14+, pytz
- PostgreSQL (B10 Setting model with USER scope), Redis (B10 cache)
- Web backend (Django multi-app architecture)

---

## Phase 2: Planning Complete - Ready for Implementation 🚀

**Constitution Check**: ✅ PASS (all 12 principles validated, zero violations)

**Planning Status**: All questions answered, technical approach validated, design artifacts complete

**Next Steps**:
1. Run `/spec-kitty.tasks` to generate work packages from this plan
2. Begin implementation with Phase 1 (Extend B10 with USER scope)
3. Follow quickstart.md for detailed acceptance criteria per phase

**Key Risks Mitigated**:
- ✅ B10 extension approach validated (USER scope is backwards compatible)
- ✅ Performance targets achievable (B10's proven cache layer, graceful degradation)
- ✅ Testing strategy comprehensive (unit + integration covers all layers)
- ✅ Migration path clear (User model fields → B10 settings via management command)

---

## Implementation Notes

### Critical Path

1. **B10 USER Scope Extension** (BLOCKING): Must complete before any B12 work
   - Owner: Settings app maintainer
   - Acceptance: USER-scoped Setting creation succeeds, tests pass

2. **Preference Resolution Service**: Core logic for precedence
   - Depends on: B10 USER scope
   - Acceptance: All precedence scenarios tested (15 unit tests)

3. **Middleware Integration**: Automatic locale activation
   - Depends on: Preference resolution
   - Acceptance: Authenticated users see personalized locale

4. **API Endpoints**: User-facing preference management
   - Depends on: Preference resolution
   - Acceptance: CRUD operations work, validation errors return HTTP 400

### Parallel Work Opportunities

After B10 extension complete, these can proceed in parallel:
- Preference resolution service (core logic)
- API serializers and validators
- Documentation (user guide, developer guide, ADR)
- Test infrastructure setup

### Success Validation

Before marking B12 complete:
- [ ] All 50 test cases pass (95% coverage on resolution module)
- [ ] Performance benchmarks met (< 10ms warm, < 50ms cold)
- [ ] Load test: 10k concurrent users with < 200ms p95 latency
- [ ] Documentation reviewed and merged (user guide, dev guide, ADR)
- [ ] Constitution Check re-validated (confirm no drift)

---

**Planning Phase Complete**: 2025-11-29
**Ready for**: `/spec-kitty.tasks` command to generate work packages
