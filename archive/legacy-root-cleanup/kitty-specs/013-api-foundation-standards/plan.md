# Implementation Plan: API Foundation & Standards
*Path: [kitty-specs/013-api-foundation-standards/plan.md](kitty-specs/013-api-foundation-standards/plan.md)*

**Branch**: `013-api-foundation-standards` | **Date**: 2025-11-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/013-api-foundation-standards/spec.md`

## Summary

Establish standardized Django REST Framework API foundation providing dual authentication (JWT + Session), consistent response envelopes, URL-based versioning, pagination, rate limiting, and OpenAPI documentation. Consolidates existing API endpoints under `/api/v1/` structure with global standards enforcement. No external API consumers exist yet, so B13 establishes the first stable API contract for the Core App.

## Planning Decisions Captured

**Q1: JWT Library Choice**
- **Decision**: djangorestframework-simplejwt with blacklist support
- **Rationale**: No existing JWT solution; simplejwt is industry standard with batteries-included features (token refresh, blacklist, DRF integration)

**Q2: Response Envelope Implementation**
- **Decision**: Custom DRF renderer + exception handler configured globally via DEFAULT_RENDERER_CLASSES
- **Rationale**: No external consumers exist; global enforcement ensures consistency from day one

**Q3: API Versioning Structure**
- **Decision**: Hybrid - version-agnostic viewsets in domain apps, versioned routers in central `src/api/v1/`
- **Rationale**: Clean separation of concerns; domain logic stays product-agnostic; versioning handled at routing layer

**Q4: OpenAPI Documentation**
- **Decision**: drf-spectacular for OpenAPI 3.0 schema generation
- **Rationale**: Modern, actively maintained, better DRF 3.14+ support than drf-yasg

**Q5: Rate Limiting Implementation**
- **Decision**: DRF's SimpleRateThrottle subclasses backed by existing Redis cache
- **Rationale**: DRF-native integration with proper headers; leverages existing B06 Redis infrastructure

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**:
- Django 5.1.4
- djangorestframework 3.14.0
- djangorestframework-simplejwt 5.3.1 (NEW)
- drf-spectacular 0.27.0 (NEW)
- django-redis 5.4.0 (existing, used for rate limiting)
**Storage**: PostgreSQL (existing)
**Testing**: pytest 8.0+, pytest-django (existing)
**Target Platform**: Linux server (existing)
**Project Type**: Django web application with REST API
**Performance Goals**:
- API response time <200ms for paginated lists (up to 100 items)
- Support 1000 concurrent API requests without degradation
- Rate limiting: 100 req/min (authenticated), 10 req/min (anonymous)
**Constraints**:
- No breaking changes (no external consumers, establishing first stable contract)
- Must integrate with B03 (security), B05 (auth), B06 (Redis), B08 (permissions), B09 (audit)
- Global envelope enforcement for all DRF endpoints
**Scale/Scope**:
- Foundation for all future APIs (users, organisations, projects initially)
- ~7 domain apps to consolidate under v1 routing
- JWT token lifecycle: 15min access, 7 day refresh with blacklist support

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
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows - B13 is pure infrastructure
- [x] **Core Focus**: Feature aligns with core concerns (API foundation for accounts, organisations, projects, settings, audit)
- [x] **Downstream Extension**: Base classes (BaseAPIViewSet, BaseSerializer) provide extension points for product-specific APIs

### II. Architecture and Modularity
- [x] **Single Responsibility**: New `api` app handles API foundation; domain apps (accounts, organisations, projects) remain focused
- [x] **Stable APIs**: v1 API contracts documented via OpenAPI schema; envelope format is stable
- [x] **Minimal Dependencies**: Only 2 new dependencies (simplejwt, drf-spectacular) - both essential
- [x] **No Circular Deps**: `api` app imports from domain apps; domain apps don't import from `api`
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained (no changes to Python version)
- [x] **Type Hints**: All `api` app modules will use type hints (renderers, serializers, viewsets, throttling)
- [x] **Black Formatting**: All code will be formatted with Black (existing tooling)
- [x] **Ruff Linting**: Ruff will be primary linter (existing tooling)
- [x] **No Dead Code**: New implementation only; no legacy code removal needed
- [x] **Readable Code**: Small focused classes (EnvelopeRenderer, throttle classes, base classes)
- [x] **Curated Dependencies**: simplejwt (5.3.1) and drf-spectacular (0.27.0) pinned and justified

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used (existing)
- [x] **Test Coverage**: Tests planned for envelope rendering, JWT auth, rate limiting, pagination
- [x] **Regression Tests**: All new features include unit and integration tests
- [x] **Deterministic**: Tests will use fixed time (freezegun), mock Redis, no network calls
- [x] **Coverage Thresholds**: Existing coverage targets apply to new `api` app
- [x] **Integration Tests**: End-to-end tests for authentication flows, rate limiting, envelope responses

### V. Security and Privacy
- [x] **Secure Defaults**: Builds on B03 security baseline; CSRF protection via SessionAuth; JWT secrets via SECRET_KEY
- [x] **DEBUG Off**: No changes to DEBUG configuration (inherits from B03)
- [x] **No Secrets**: JWT uses SECRET_KEY from environment; no hardcoded secrets
- [x] **Dependency Scanning**: Existing CI pip-audit will scan simplejwt and drf-spectacular
- [x] **Centralized Auth**: JWT + Session both integrated with B05 User model and B08 permissions
- [x] **No Sensitive Logging**: Envelope exception handler sanitizes error responses (FR-010)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: BaseAPIPagination uses select_related/prefetch_related patterns (documented in code)
- [x] **Pagination**: Global BaseAPIPagination (offset-based, default 20, max 100) per FR-014
- [x] **Explicit Caching**: Redis cache used for rate limiting only (existing B06 infrastructure)
- [x] **Structured Logging**: Existing django-prometheus integration captures API metrics
- [x] **Health Checks**: Existing /health/ endpoint unchanged
- [x] **Metrics Hooks**: DRF middleware + django-prometheus captures request metrics
- [x] **Graceful Degradation**: Rate limiting returns 429 with Retry-After; auth failures return 401/403 per FR-005a

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework 3.14.0 used throughout (existing + B13 enhancements)
- [x] **Consistent Responses**: Global envelope renderer ensures {"status": "...", "data"/"error": {...}} per FR-008/FR-009
- [x] **Versioning Strategy**: URL-based versioning (/api/v1/) with 6-month deprecation policy documented
- [x] **Clear Errors**: Envelope exception handler sanitizes errors, includes error codes and safe messages per FR-010
- [x] **Boundary Validation**: Validation in DRF serializers (existing pattern maintained)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup unchanged; new dependencies added to requirements/base.txt
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured (existing)
- [x] **Pre-commit Hooks**: Existing hooks apply to new `api` app code
- [x] **Type Checking**: mypy will run cleanly on `api` app modules (type hints mandatory)
- [x] **Task Scripts**: Existing Makefile supports new testing/linting needs
- [x] **Developer Docs**: README.md will be added to `src/api/` app; quickstart.md will document API usage

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `013-api-foundation-standards` branch (verified)
- [x] **Linked to Spec**: PR will reference kitty-specs/013-api-foundation-standards/spec.md
- [x] **Focused PRs**: Single feature (API foundation) with clear scope
- [x] **main Stable**: No direct commits to main; worktree workflow enforced

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Existing CI (Black, Ruff, mypy, pytest) applies to new code
- [x] **Merge Gates**: All CI checks must pass before merge (existing gates)
- [x] **Scripted Deployment**: Deployment process unchanged; new dependencies added to requirements

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: All docs in kitty-specs/013-api-foundation-standards/
- [x] **App README**: src/api/README.md will document purpose, architecture, extension points
- [x] **Getting Started**: quickstart.md will provide API usage examples
- [x] **Extension Guide**: Extension patterns documented in src/api/README.md (base classes, custom auth)
- [x] **Spec Sync**: plan.md and spec.md kept in sync throughout implementation
- [x] **ADR Required**: ADR needed for: (1) JWT auth strategy, (2) URL-based versioning approach

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations identified*

**Constitution Check Status**: ✅ **PASS** - All principles satisfied

---

**Gate Status**: ✅ Approved to proceed to Phase 0 Research

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

```
src/
├── api/                           # NEW: Central API infrastructure app
│   ├── __init__.py
│   ├── apps.py
│   ├── README.md                  # API architecture, extension patterns
│   ├── renderers.py               # EnvelopeJSONRenderer
│   ├── exceptions.py              # envelope_exception_handler
│   ├── throttling.py              # AuthenticatedUserThrottle, AnonymousUserThrottle
│   ├── pagination.py              # BaseAPIPagination
│   ├── serializers.py             # BaseSerializer (optional shared fields)
│   ├── views.py                   # BaseAPIViewSet, API root view
│   └── v1/
│       ├── __init__.py
│       ├── urls.py                # Central v1 router (registers domain viewsets)
│       └── views.py               # Version discovery endpoint
│
├── accounts/api/                  # EXISTING: Version-agnostic user API
│   ├── views.py                   # UserViewSet, auth endpoints
│   └── serializers.py             # UserSerializer
│
├── organisations/api/             # EXISTING: Version-agnostic organisation API
│   ├── views.py                   # OrganisationViewSet
│   └── serializers.py             # OrganisationSerializer
│
├── projects/api/                  # EXISTING: Version-agnostic project API
│   ├── views.py                   # ProjectViewSet
│   └── serializers.py             # ProjectSerializer
│
├── permissions/api/               # EXISTING: Version-agnostic permissions API
│   ├── views.py                   # RoleViewSet, PermissionViewSet
│   └── serializers.py             # RoleSerializer, PermissionSerializer
│
└── config/
    ├── settings/
    │   └── base.py                # UPDATED: Add simplejwt, drf-spectacular config
    └── urls.py                    # UPDATED: Route /api/v1/ to api.v1.urls

tests/
├── api/                           # NEW: API infrastructure tests
│   ├── test_renderers.py          # Envelope renderer tests
│   ├── test_exceptions.py         # Exception handler tests
│   ├── test_throttling.py         # Rate limiting tests
│   ├── test_pagination.py         # Pagination tests
│   ├── test_jwt_auth.py           # JWT authentication integration tests
│   └── test_v1_router.py          # v1 URL routing tests
│
├── accounts/
│   └── test_api.py                # UPDATED: Expect envelope responses
│
├── organisations/
│   └── test_api.py                # UPDATED: Expect envelope responses
│
└── projects/
    └── test_api.py                # UPDATED: Expect envelope responses

requirements/
└── base.txt                       # UPDATED: Add simplejwt, drf-spectacular
```

**Structure Decision**: Django web application with central API infrastructure app (`src/api/`) providing global standards (envelope, auth, throttling, pagination). Domain apps (accounts, organisations, projects, permissions) maintain version-agnostic viewsets. Versioning handled at routing layer (`api/v1/urls.py`) following hybrid architecture from Q3 planning decision.

## Complexity Tracking

*No violations identified - this section can remain empty per constitution compliance*
