# Implementation Tasks: API Foundation & Standards
*Path: [kitty-specs/013-api-foundation-standards/tasks.md](kitty-specs/013-api-foundation-standards/tasks.md)*

**Feature**: 013-api-foundation-standards
**Branch**: `013-api-foundation-standards`
**Created**: 2025-11-29

## Overview

This document breaks down B13 API Foundation & Standards into 6 executable work packages. Each work package is independently implementable and includes a detailed prompt file for implementation guidance.

**Total Subtasks**: 31
**Total Work Packages**: 6

---

## Work Package Structure

```
tasks/
├── planned/           # Work packages ready for implementation
│   ├── WP01-api-infrastructure-setup.md
│   ├── WP02-jwt-authentication.md
│   ├── WP03-response-envelope-system.md
│   ├── WP04-pagination-rate-limiting.md
│   ├── WP05-v1-api-consolidation.md
│   └── WP06-documentation-openapi.md
├── doing/             # Work packages in progress
├── for_review/        # Work packages awaiting review
└── done/              # Completed work packages
```

---

## Phase 1: Setup & Infrastructure (WP01)

### WP01: API Infrastructure Setup
**Priority**: P1 (Critical Path)
**Prompt**: [tasks/done/WP01-api-infrastructure-setup.md](tasks/done/WP01-api-infrastructure-setup.md)
**Goal**: Create `src/api/` Django app with base classes and global configuration
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T001: Create `src/api/` Django app structure (apps.py, __init__.py)
- [x] T002: Add djangorestframework-simplejwt==5.3.1 to requirements/base.txt
- [x] T003: Add drf-spectacular==0.27.0 to requirements/base.txt
- [x] T004: Update INSTALLED_APPS in settings/base.py (api, rest_framework_simplejwt.token_blacklist, drf_spectacular)
- [x] T005: Configure SIMPLE_JWT settings (15min access, 7 day refresh, rotation, blacklist)
- [x] T006: Run migrations for simplejwt blacklist tables
- [x] T007: Create BaseAPIViewSet in api/views.py with permission integration hooks
- [x] T008: Create BaseSerializer in api/serializers.py with timestamp/meta field patterns
- [x] T009: Create BaseAPIPagination in api/pagination.py (offset-based, default 20, max 100)

**Implementation Sketch**:
1. Create Django app: `python manage.py startapp api src/api`
2. Install dependencies: `pip install -r requirements/base.txt`
3. Configure settings for JWT and DRF spectacular
4. Run migrations: `python manage.py migrate`
5. Implement base classes following DRF patterns
6. Document extension points in docstrings

**Dependencies**: None (foundational)
**Parallel Opportunities**: T002-T003 [P], T007-T009 [P]
**Risks**: Migrations may conflict if run on existing database with custom auth; use migration squashing if needed

**Success Criteria**:
- `src/api/` app exists and is registered in INSTALLED_APPS
- simplejwt and drf-spectacular installed and configured
- Database migrations applied successfully (token_blacklist tables created)
- Base classes available for import by other work packages
- `python manage.py check` passes with no errors

---

## Phase 2: Authentication & Response Standards (WP02-WP03)

### WP02: JWT Authentication Implementation
**Priority**: P1 (User Story 1)
**Prompt**: [tasks/done/WP02-jwt-authentication.md](tasks/done/WP02-jwt-authentication.md)
**Goal**: Implement JWT token obtain/refresh/verify/logout endpoints with dual auth support
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T010: Configure REST_FRAMEWORK authentication classes (JWTAuthentication, SessionAuthentication)
- [x] T011: Create token obtain endpoint (POST /api/v1/auth/token/)
- [x] T012: Create token refresh endpoint (POST /api/v1/auth/token/refresh/)
- [x] T013: Create token verify endpoint (POST /api/v1/auth/token/verify/)
- [x] T014: Create logout endpoint (POST /api/v1/auth/logout/) with blacklist integration
- [x] T015: Implement JWT precedence logic (JWT over session when both present)
- [x] T016: Implement inactive user check (return 403 for deactivated accounts per FR-005a)
- [x] T017: Create auth URL routing in api/v1/urls.py

**Implementation Sketch**:
1. Configure authentication_classes in REST_FRAMEWORK settings
2. Use simplejwt's built-in views for token obtain/refresh/verify
3. Create custom logout view that blacklists refresh tokens
4. Override JWTAuthentication to check user.is_active (FR-005a)
5. Configure authentication precedence in middleware order
6. Wire up URL patterns under /api/v1/auth/

**Dependencies**: WP01 (base infrastructure)
**Parallel Opportunities**: T011-T014 [P] (endpoint implementations)
**Risks**: Token blacklist table must exist before logout can be tested; ensure migrations from WP01 are applied

**Success Criteria**:
- POST /api/v1/auth/token/ returns access + refresh tokens for valid credentials
- POST /api/v1/auth/token/refresh/ successfully refreshes tokens
- POST /api/v1/auth/logout/ blacklists tokens (subsequent use returns 401)
- Requests with both JWT and session use JWT (verify via audit logs)
- Valid token + inactive user returns 403 with appropriate error message
- All auth endpoints return envelope format responses

---

### WP03: Response Envelope System
**Priority**: P1 (User Story 2)
**Prompt**: [tasks/done/WP03-response-envelope-system.md](tasks/done/WP03-response-envelope-system.md)
**Goal**: Implement global response envelope with consistent success/error formatting and sanitized error handling
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T018: Create EnvelopeJSONRenderer in api/renderers.py
- [x] T019: Implement success envelope format ({"status": "success", "data": ..., "meta": ...})
- [x] T020: Create envelope_exception_handler in api/exceptions.py
- [x] T021: Implement error envelope format ({"status": "error", "error": {...}})
- [x] T022: Map HTTP status codes to error codes (401→not_authenticated, 403→permission_denied, etc.)
- [x] T023: Sanitize error responses (remove stack traces, database errors per FR-010)
- [x] T024: Configure DEFAULT_RENDERER_CLASSES and EXCEPTION_HANDLER in settings
- [x] T025: Add timestamp to meta field for all responses

**Implementation Sketch**:
1. Create EnvelopeJSONRenderer extending DRF's JSONRenderer
2. Override render() to wrap data in {"status": "success", "data": ...}
3. Create custom exception handler that catches all DRF exceptions
4. Map exception types to error codes and sanitize messages
5. Configure globally via REST_FRAMEWORK settings
6. Test with various endpoints to ensure consistency

**Dependencies**: WP01 (base infrastructure)
**Parallel Opportunities**: T018-T019 [P], T020-T023 [P]
**Risks**: Envelope wrapping may break existing tests expecting raw DRF responses; update tests to parse envelope

**Success Criteria**:
- All successful API responses have {"status": "success", "data": ...} format
- All error responses have {"status": "error", "error": {...}} format
- No stack traces or sensitive data in error responses
- Validation errors include field-level details in error.details
- 500 errors include error.id for support correlation
- Existing endpoint tests updated to expect envelope format

---

## Phase 3: Pagination & Rate Limiting (WP04)

### WP04: Pagination and Rate Limiting
**Priority**: P1 (User Stories 3 & 5)
**Prompt**: [tasks/done/WP04-pagination-rate-limiting.md](tasks/done/WP04-pagination-rate-limiting.md)
**Goal**: Implement pagination with metadata and Redis-backed rate limiting
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T026: Enhance BaseAPIPagination with metadata (count, next, previous URLs)
- [x] T027: Configure DEFAULT_PAGINATION_CLASS in settings
- [x] T028: Create AuthenticatedUserThrottle in api/throttling.py (100/min per user)
- [x] T029: Create AnonymousUserThrottle in api/throttling.py (10/min per IP)
- [x] T030: Inject rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [x] T031: Configure throttle classes globally in REST_FRAMEWORK settings
- [x] T032: Test rate limit enforcement returns 429 with Retry-After header

**Implementation Sketch**:
1. Extend BaseAPIPagination from WP01 to add pagination metadata to envelope.meta
2. Implement get_paginated_response() to populate meta.pagination
3. Create throttle classes extending DRF's SimpleRateThrottle
4. Implement get_cache_key() for user ID (authenticated) and IP (anonymous)
5. Configure Redis cache backend from B06 for throttle storage
6. Add rate limit headers in throttle classes
7. Configure globally so all viewsets inherit

**Dependencies**: WP01 (BaseAPIPagination), WP03 (envelope for meta field), B06 (Redis cache)
**Parallel Opportunities**: T026-T027 [P], T028-T029 [P]
**Risks**: Redis must be running for rate limiting tests; use mock Redis for unit tests, real Redis for integration tests

**Success Criteria**:
- List endpoints return paginated results with meta.pagination
- Page size defaults to 20, respects page_size parameter up to 100
- Rate limit headers present in all responses
- 101st request from authenticated user within 1 minute returns 429
- 11th request from anonymous IP within 1 minute returns 429
- Rate limits reset after window expires (60 seconds)
- Redis keys follow pattern: throttle:auth:{user_id}, throttle:anon:{ip}

---

## Phase 4: API Consolidation (WP05)

### WP05: v1 API Consolidation and Routing
**Priority**: P2 (User Story 4)
**Prompt**: [tasks/done/WP05-v1-api-consolidation.md](tasks/done/WP05-v1-api-consolidation.md)
**Goal**: Consolidate existing domain APIs under /api/v1/ with version routing
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T033: Create api/v1/__init__.py and api/v1/urls.py
- [x] T034: Create DRF DefaultRouter in api/v1/urls.py
- [x] T035: Register accounts.api.views.UserViewSet at /api/v1/users/
- [x] T036: Register organisations.api.views.OrganisationViewSet at /api/v1/organisations/
- [x] T037: Register projects.api.views.ProjectViewSet at /api/v1/projects/
- [x] T038: Register permissions.api.views.RoleViewSet at /api/v1/permissions/roles/
- [x] T039: Create API root view in api/v1/views.py (GET /api/v1/)
- [x] T040: Update config/urls.py to route /api/v1/ to api.v1.urls
- [x] T041: Remove legacy non-versioned URL patterns (/api/organisations/, /api/projects/)
- [x] T042: Update existing viewsets to use BaseAPIViewSet and BaseAPIPagination from WP01

**Implementation Sketch**:
1. Create v1 subdirectory under api app
2. Set up DefaultRouter and register all domain viewsets
3. Create API root view listing available endpoints
4. Update main urls.py to include api/v1/urls.py under /api/v1/ prefix
5. Remove old URL patterns to force all clients through v1
6. Update domain viewsets to inherit from BaseAPIViewSet
7. Verify B08 permission checks still work with new routing

**Dependencies**: WP01-WP04 (all base infrastructure), existing domain viewsets
**Parallel Opportunities**: T035-T038 [P] (viewset registrations)
**Risks**: Removing legacy URLs may break existing internal clients; verify no clients depend on old patterns before removing

**Success Criteria**:
- GET /api/v1/ returns list of available endpoints
- GET /api/v1/users/ returns paginated user list with envelope
- GET /api/v1/organisations/ returns organisations user has access to (B08 permissions)
- GET /api/v1/projects/ returns projects with hierarchical permission filtering
- All endpoints use BaseAPIPagination (consistent pagination)
- All endpoints enforce rate limits
- All responses use envelope format
- Legacy URLs return 404

---

## Phase 5: Documentation & Polish (WP06)

### WP06: OpenAPI Documentation and Developer Guide
**Priority**: P3 (User Story 6)
**Prompt**: [tasks/done/WP06-documentation-openapi.md](tasks/done/WP06-documentation-openapi.md)
**Goal**: Generate interactive API documentation and create developer guides
**Status**: ✅ **COMPLETE** (Reviewed and approved 2025-11-29)

**Subtasks**:
- [x] T043: Configure SPECTACULAR_SETTINGS in settings/base.py
- [x] T044: Create OpenAPI schema generation endpoint (GET /api/schema/)
- [x] T045: Create Swagger UI endpoint (GET /api/docs/)
- [x] T046: Add docstrings to all viewsets and serializers for schema generation
- [x] T047: Configure authentication in Swagger UI (JWT bearer token input)
- [x] T048: Test schema accuracy (all endpoints, request/response examples)
- [x] T049: Create src/api/README.md documenting architecture and extension patterns
- [x] T050: Document base class usage (BaseAPIViewSet, BaseSerializer, BaseAPIPagination)
- [x] T051: Create ADR for JWT authentication strategy
- [x] T052: Create ADR for URL-based versioning approach

**Implementation Sketch**:
1. Configure drf-spectacular settings with API title, version, description
2. Add spectacular's URLs to config/urls.py
3. Annotate viewsets with @extend_schema decorators for complex operations
4. Add docstrings to serializer fields for better schema descriptions
5. Test Swagger UI with live API calls (authenticate, make requests)
6. Write comprehensive README for api app explaining architecture
7. Document how to create custom viewsets extending base classes
8. Write ADRs explaining why JWT + simplejwt and why URL versioning

**Dependencies**: WP05 (all endpoints consolidated and working)
**Parallel Opportunities**: T043-T045 [P] (schema/docs setup), T049-T052 [P] (documentation writing)
**Risks**: Schema generation may fail if serializers are missing docstrings; add docstrings incrementally

**Success Criteria**:
- GET /api/docs/ displays interactive Swagger UI
- Swagger UI shows all v1 endpoints with request/response schemas
- "Authorize" button in Swagger UI accepts JWT tokens
- Test requests from Swagger UI succeed (envelope responses displayed correctly)
- src/api/README.md provides clear guidance for extending the API
- ADRs document key architectural decisions
- Developer can read README and create new API endpoint following standards

---

## Task Dependencies Graph

```
WP01 (Infrastructure)
  ↓
  ├──→ WP02 (JWT Auth)
  └──→ WP03 (Envelope) ──→ WP04 (Pagination & Rate Limiting)
                              ↓
                          WP05 (v1 Consolidation)
                              ↓
                          WP06 (Documentation)
```

**Critical Path**: WP01 → WP03 → WP04 → WP05 → WP06
**Parallel Opportunities**: WP02 can start immediately after WP01

---

## MVP Scope Recommendation

**Minimum Viable Product (MVP)**: WP01-WP03

This provides:
- ✅ JWT authentication (User Story 1)
- ✅ Response envelope consistency (User Story 2)
- ✅ Basic infrastructure for extension

**Not included in MVP** (can be added incrementally):
- Pagination (WP04) - can use DRF defaults initially
- Rate limiting (WP04) - can be added when abuse becomes a concern
- v1 consolidation (WP05) - can keep legacy URLs temporarily
- Documentation (WP06) - can document after API is stable

**Rationale**: MVP focuses on authentication and consistency, which are foundational and can't be retrofitted easily. Pagination, rate limiting, and documentation can be added iteratively without breaking existing integrations.

---

## Implementation Notes

### Parallelization Strategy

- **Setup Phase** (WP01): Mostly sequential (migrations must run after config)
- **Core Standards** (WP02-WP03): Can be developed in parallel after WP01
- **Features** (WP04): Can start after WP03 completes (needs envelope for metadata)
- **Consolidation** (WP05): Must wait for all infrastructure (WP01-WP04)
- **Documentation** (WP06): Can start once endpoints are stable (after WP05)

### Testing Strategy

Each work package includes:
- Unit tests for core components (renderers, throttles, pagination)
- Integration tests for end-to-end flows (auth, envelope, rate limiting)
- Contract tests for API response formats

**Test Execution**:
```bash
# Run all API tests
pytest tests/api/ -v

# Run specific work package tests
pytest tests/api/test_jwt_auth.py -v  # WP02
pytest tests/api/test_renderers.py -v  # WP03
pytest tests/api/test_throttling.py -v  # WP04
```

### Risk Mitigation

1. **Migration Conflicts**: Run migrations in isolated test database first
2. **Redis Dependency**: Use mock Redis for unit tests, docker-compose for integration tests
3. **Breaking Changes**: Keep legacy URLs during transition period (WP05)
4. **Performance**: Profile paginated queries before consolidation (WP04)
5. **Token Blacklist Growth**: Document cleanup strategy in WP02

---

## Next Steps

1. **Start with WP01**: Run `.kittify/scripts/implement.ps1 WP01-api-infrastructure-setup.md`
2. **Parallel Development**: After WP01, WP02 and WP03 can proceed in parallel
3. **Integration Testing**: After WP03, test full authentication + envelope flow
4. **Incremental Deployment**: Deploy WP01-WP03 as MVP, then add WP04-WP06

**Estimated Effort**:
- WP01: 4-6 hours (setup + migrations)
- WP02: 6-8 hours (JWT integration + testing)
- WP03: 4-6 hours (envelope + error handling)
- WP04: 6-8 hours (pagination + rate limiting)
- WP05: 4-6 hours (consolidation + permission testing)
- WP06: 4-6 hours (documentation + ADRs)

**Total**: ~28-40 hours for complete implementation
