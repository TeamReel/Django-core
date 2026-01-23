# Implementation Plan: B08 Permissions & ACL Security Refactor
*Path: [kitty-specs/026-b08-permissions-acl/plan.md](kitty-specs/026-b08-permissions-acl/plan.md)*

**Branch**: `026-b08-permissions-acl` | **Date**: 2025-12-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from WP-R01 (refactor-plan-core-app-v1.1.0.md)

## Summary

This security-focused refactor eliminates ACL bypass vulnerabilities in B11 (transactions/credits), B16 (notifications), B17 (contextual routing), and settings APIs by enforcing B08 hierarchical permission checks at all tenant-scoped endpoints. Permission decisions are integrated with B09 audit logging for compliance and investigation. A standardized 403 response format is rolled out across Core-App APIs with backward-compatible migration. A new `@django-core/permissions` frontend package provides declarative permission primitives (PermissionsProvider, usePermissions hook, PermissionGate component) for React applications, integrating with F02 auth context and F03 context switcher.

## Technical Context

### Planning Answers (from Discovery)

**Q1: Testing Strategy**
- **Answer**: Multi-layered security validation with unit tests for B08 permission helpers, integration tests per affected endpoint (B11/B16/B17/settings) covering allowed/denied scenarios, dedicated security test suite with explicit bypass attempts (wrong org/project, ID guessing, missing context), plus focused manual security review before merge
- **Impact**: Test structure includes `tests/security/` directory for bypass-attempt scenarios, affects FR-020 (90%+ coverage target)

**Q2: B08 → B09 Audit Integration**
- **Answer**: Centralized evaluator pattern - single `evaluate_permission()` function in B08 handles both ACL decision and B09 audit emission, with Django logging fallback when B09 unavailable
- **Impact**: All permission decorators/DRF classes call this function, prevents bypass if developers use B08 helpers, FR-001/FR-002 logic in one place

**Q3: Frontend Package Architecture**
- **Answer**: Layered architecture - `@django-core/permissions` as standalone package with low-level utilities (checkPermission, types) and high-level pre-configured PermissionsProvider + usePermissions hook that auto-wire F02/F03 contexts
- **Impact**: Package is product-agnostic and reusable outside core-app, maintains flexibility while providing convenient defaults

**Q4: API Rollout Strategy**
- **Answer**: Phased rollout with permissions endpoint first - implement `/api/permissions/current/` with hierarchical response, then gradually migrate critical endpoints (B11/B16/B17/settings) to new 403 format, with api-client normalizer providing backward compatibility
- **Impact**: Full 403 rollout continues in later WPs, but this feature covers critical ACL-related endpoints (2-4 week transition per Assumption #8)

**Q5: Permission Cache Strategy**
- **Answer**: Hybrid context-aware caching - per-context cache keyed by `{userId, orgId?, projectId?}` with 5-minute TTL, immediate refetch on context switch to new context, reuse cached data when switching back to recently-used context within TTL
- **Impact**: PermissionsProvider implementation maintains small cache, context switches feel instant for recent contexts

### Technology Stack

**Language/Version**: Python 3.12+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**:
- Backend: Django 5.1+, Django REST Framework 3.14+, Redis (existing), PostgreSQL (existing)
- Frontend: React 18.x, @django-core/api-client (existing), F02 auth context (existing), F03 context switcher (existing)

**Storage**: PostgreSQL (B09 audit events, existing B08 permissions schema)
**Testing**: pytest + pytest-django (backend), Jest + React Testing Library (frontend)
**Target Platform**: Web (Django server + React SPA)
**Project Type**: Monorepo with backend (src/) and frontend packages (packages/)

**Performance Goals**:
- Permission check latency <50ms for cached responses (SC-008)
- B08 audit events emitted asynchronously (non-blocking)
- Frontend permissions cached for 5 minutes (configurable)

**Constraints**:
- Zero ACL bypass vulnerabilities after refactor (SC-006)
- B09 unavailability must not block API requests (SC-009)
- 90%+ test coverage for B08 audit.py (SC-004)
- 85%+ test coverage for @django-core/permissions (SC-005)

**Scale/Scope**:
- Affects 4 backend modules (B08, B09, B11, B16, B17), settings APIs
- Creates 1 new frontend package (@django-core/permissions)
- Updates 1 existing frontend package (@django-core/api-client)
- 28 functional requirements across 5 subsystems
- 4-5 day timeline

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (security, ACL, audit, permissions infrastructure)
- [x] **Downstream Extension**: Product-specific permission codes can be added via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: B08 handles ACL, B09 handles audit, @django-core/permissions handles frontend primitives
- [x] **Stable APIs**: B08 evaluate_permission() is stable public interface, frontend exports are documented
- [x] **Minimal Dependencies**: No new heavyweight dependencies (uses existing Redis, PostgreSQL, React 18)
- [x] **No Circular Deps**: B08 → B09 (audit emission), frontend → F02/F03 (context consumption) - acyclic
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: B08 audit.py and evaluate_permission() will use type hints throughout
- [x] **Black Formatting**: All Python code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Refactor removes direct DB access in B17, no dead code added
- [x] **Readable Code**: Centralized evaluator pattern keeps logic focused, small functions
- [x] **Curated Dependencies**: No new dependencies required (uses existing stack)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used for backend
- [x] **Test Coverage**: Unit + integration + security tests for all features
- [x] **Regression Tests**: Security test suite explicitly tests bypass scenarios
- [x] **Deterministic**: Tests use fixtures, no flaky time-dependent behavior
- [x] **Coverage Thresholds**: 90%+ for B08 audit.py (SC-004), 85%+ for frontend (SC-005)
- [x] **Integration Tests**: Key flows (B11/B16/B17 endpoints) have integration coverage (SC-001, SC-006)

### V. Security and Privacy
- [x] **Secure Defaults**: PermissionGate defaults to mode="hide" (fail-closed), permission checks before view logic
- [x] **DEBUG Off**: No DEBUG-specific code introduced
- [x] **No Secrets**: No secrets committed, uses existing env vars
- [x] **Dependency Scanning**: CI will scan dependencies (no new dependencies added)
- [x] **Centralized Auth**: Uses existing B08 ACL + B05 auth, no parallel systems
- [x] **No Sensitive Logging**: 403 responses include permission codes but no user data (FR-011)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: B17 refactor removes direct DB access, uses service layer (query-optimized)
- [x] **Pagination**: No changes to existing pagination
- [x] **Explicit Caching**: Frontend 5-minute cache documented, per-context cache keys
- [x] **Structured Logging**: B09 audit events include structured context (user, resource, outcome)
- [x] **Health Checks**: B09 unavailability handled gracefully (SC-009)
- [x] **Metrics Hooks**: django-prometheus metrics for permission checks (B08 existing integration)
- [x] **Graceful Degradation**: B09 unavailable → Django logging fallback, permission checks still work (FR-002)

### VII. UX and API Design
- [x] **DRF Required**: All endpoints use Django REST Framework
- [x] **Consistent Responses**: Standardized 403 format `{error, permission, detail}` (FR-010)
- [x] **Versioning Strategy**: Staged rollout with api-client normalizer (backward-compatible, FR-012)
- [x] **Clear Errors**: 403 messages clear, no data leaks (FR-011)
- [x] **Boundary Validation**: Permission checks in DRF permission classes (before view logic)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: No changes to local environment setup
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest already configured
- [x] **Pre-commit Hooks**: Existing hooks unchanged
- [x] **Type Checking**: B08 audit.py will have full type hints for mypy
- [x] **Task Scripts**: No new scripts required
- [x] **Developer Docs**: "Adding Permission Checks to New Features" guide planned

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `026-b08-permissions-acl` branch
- [x] **Linked to Spec**: PR will reference spec.md
- [x] **Focused PRs**: Changes split into logical commits (endpoint first, then 403 migration)
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: pytest, Jest, Black, Ruff, mypy in CI (existing gates)
- [x] **Merge Gates**: SC-010 requires all CI checks pass
- [x] **Scripted Deployment**: Uses existing deployment process

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation in kitty-specs/026-b08-permissions-acl/
- [x] **App README**: B08, B09, @django-core/permissions READMEs will be updated
- [x] **Getting Started**: "Adding Permission Checks" quickstart guide planned (Phase 1)
- [x] **Extension Guide**: Permission code extension documented in B08 README
- [x] **Spec Sync**: Implementation tracked against spec.md requirements
- [x] **ADR Required**: No ADR needed - follows existing B08/B09 architecture patterns

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/026-b08-permissions-acl/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (Phase 0 output)
├── research.md          # Phase 0: Technical decisions and rationale
├── data-model.md        # Phase 1: Entity definitions and relationships
├── quickstart.md        # Phase 1: "Adding Permission Checks" developer guide
├── contracts/           # Phase 1: API contracts
│   ├── permissions-current-api.yaml    # GET /api/permissions/current/ OpenAPI spec
│   └── standardized-403-response.yaml  # 403 response format contract
├── checklists/
│   └── requirements.md  # Specification quality checklist (complete, 16/16 PASS)
└── tasks.md             # Phase 2: Task breakdown (created by /spec-kitty.tasks)
```

### Source Code (monorepo root)

```
src/
├── permissions/         # B08 - Hierarchical Access Control
│   ├── audit.py         # NEW: Centralized evaluate_permission() + B09 integration
│   ├── evaluator.py     # MODIFIED: Refactor to use audit.evaluate_permission()
│   ├── decorators.py    # MODIFIED: Update to call audit.evaluate_permission()
│   ├── api/
│   │   └── views.py     # NEW: PermissionsCurrentView (hierarchical endpoint)
│   ├── tests/
│   │   ├── test_audit_integration.py  # NEW: B08→B09 integration tests (90%+ coverage)
│   │   └── test_evaluator.py          # MODIFIED: Update for centralized pattern
│   └── README.md        # MODIFIED: Document extension points, permission codes
│
├── audit/               # B09 - Audit Logging System
│   └── README.md        # MODIFIED: Document B08 integration pattern
│
├── transactions/        # B11 - Transactions/Credits
│   ├── api/
│   │   └── views.py     # MODIFIED: Add ACL checks to OrganizationBalanceView, ProjectBalanceView
│   └── tests/
│       └── test_acl_enforcement.py  # NEW: Integration tests for B11 ACL
│
├── notifications/       # B16 - Notifications Baseline
│   ├── api/
│   │   └── views.py     # MODIFIED: Add ACL checks to NotificationViewSet
│   └── tests/
│       └── test_acl_enforcement.py  # NEW: Integration tests for B16 ACL
│
├── routing/             # B17 - Contextual Notification Service
│   ├── service.py       # MODIFIED: Remove direct DB queries, use B06/B07 service layer
│   └── tests/
│       └── test_acl_enforcement.py  # NEW: Integration tests for B17 ACL
│
└── settings/            # Settings APIs
    ├── api/
    │   └── views.py     # MODIFIED: Add ACL checks based on org/project scope
    └── tests/
        └── test_acl_enforcement.py  # NEW: Integration tests for settings ACL

tests/
├── security/            # NEW: Security-focused test suite
│   ├── test_acl_bypass_attempts.py     # Explicit bypass scenarios (wrong org/project, ID guessing)
│   └── test_permission_hierarchy.py    # Project → org → global inheritance tests
├── integration/
│   └── test_403_standardization.py     # NEW: End-to-end 403 format tests
└── manual/
    └── security_review_checklist.md    # NEW: Manual pen test checklist

packages/
├── api-client/          # Existing: @django-core/api-client
│   ├── src/
│   │   └── errors.ts    # MODIFIED: Update normalizer for dual 403 format support
│   └── tests/
│       └── errors.test.ts  # MODIFIED: Test both legacy and new 403 formats
│
└── permissions/         # NEW: @django-core/permissions
    ├── src/
    │   ├── index.ts                    # Package exports
    │   ├── types.ts                    # PermissionState, PermissionGateProps types
    │   ├── PermissionsProvider.tsx     # High-level: Auto-wire F02/F03, fetch/cache
    │   ├── usePermissions.ts           # Hook: {loading, error, hasPermission, refetch}
    │   ├── PermissionGate.tsx          # Component: mode="hide"|"disable"
    │   ├── checkPermission.ts          # Low-level: Framework-agnostic utility
    │   └── cache.ts                    # Context-aware cache implementation
    ├── tests/
    │   ├── PermissionsProvider.test.tsx    # Integration tests with F02/F03 mocks
    │   ├── usePermissions.test.ts          # Hook behavior tests
    │   ├── PermissionGate.test.tsx         # Component rendering tests (hide/disable)
    │   ├── checkPermission.test.ts         # Utility tests
    │   └── cache.test.ts                   # Cache invalidation tests (85%+ coverage)
    ├── package.json
    ├── tsconfig.json
    └── README.md                           # Usage guide, integration with F02/F03
```

**Structure Decision**: Monorepo with backend (src/) and frontend packages (packages/). Backend follows existing Django app structure with B08 as the central ACL module. Frontend creates new standalone package (@django-core/permissions) with layered architecture (low-level utilities + high-level provider). Security tests isolated in tests/security/ for explicit bypass scenarios.

---

## Phase 0: Research & Discovery

### Research Questions Resolved

Based on planning interrogation, the following technical decisions have been validated:

#### R1: Centralized Permission Evaluator Pattern

**Decision**: Implement `evaluate_permission(user, permission, resource, context)` in `src/permissions/audit.py`

**Rationale**:
- Single source of truth for all permission decisions prevents bypass
- Centralizes B09 audit integration with Django logging fallback
- All decorators (`@permission_required`) and DRF permission classes call this function
- Type-safe interface with clear contract: `(User, str, Optional[Resource], Context) -> bool`

**Alternatives Considered**:
- Decorator-level logging: Too many code paths, easy to bypass
- Signal-based: Async signal delivery could miss audit events, harder to reason about fallback
- Permission class level: Duplicated logic across multiple classes

**Implementation Notes**:
- Function signature: `def evaluate_permission(user: User, permission: str, resource: Optional[Any] = None, context: Optional[Dict[str, Any]] = None) -> bool`
- Returns `True` if permission granted, `False` if denied
- Side effect: Emits B09 audit event (or logs to Django if B09 unavailable)
- Context dict includes: `{scope: str, organization_id: int, project_id: int, request_id: str}`

#### R2: Hierarchical API Response Format

**Decision**: `/api/permissions/current/` returns nested structure:

```json
{
  "global": ["system.read_audit"],
  "organization": {
    "42": ["organization.view", "billing.read"]
  },
  "project": {
    "101": ["project.view", "project.edit"]
  }
}
```

**Rationale**:
- Supports hierarchical permission resolution (project → organization → global fallback)
- Enables efficient context-aware caching (keyed by `{userId, orgId?, projectId?}`)
- Frontend can preload permissions for current context without multiple API calls
- Structure matches B08's internal scope model (Global/Organization/Project)

**Alternatives Considered**:
- Flat array: Simple but loses scope information, requires additional API call per context switch
- Scoped object with single context: Forces API call on every context switch, no preloading
- GraphQL: Overkill for this use case, adds dependency

**Implementation Notes**:
- DRF view: `PermissionsCurrentView` in `src/permissions/api/views.py`
- Serializer: Custom serializer builds hierarchy from B08 permission queryset
- Caching: Response cached for 5 minutes per user (invalidated on role change)

#### R3: Dual 403 Format Support in api-client

**Decision**: Update `@django-core/api-client` error normalizer to handle both formats:

**Legacy format** (existing endpoints):
```json
{"detail": "You do not have permission to perform this action."}
```

**New format** (migrated endpoints):
```json
{
  "error": "forbidden",
  "permission": "organization.view_balance",
  "detail": "You do not have permission to view organization balance."
}
```

**Rationale**:
- Backward compatibility during 2-4 week transition period (Assumption #8)
- Centralized handling in api-client means frontend packages don't need updates
- Gradual migration reduces risk of breaking downstream consumers

**Alternatives Considered**:
- Big bang migration: High risk, requires coordinating all endpoint updates simultaneously
- Versioned API paths (/api/v2/): Overkill for response format change, doubles maintenance burden
- Frontend-level normalization: Duplicates logic across multiple packages

**Implementation Notes**:
- Detection: Check for presence of `permission` field in response
- Normalization: Transform legacy format to `{error: "forbidden", permission: "unknown", detail: <original>}`
- TypeScript type: `interface ForbiddenError { error: "forbidden"; permission: string; detail: string; }`

#### R4: Context-Aware Permission Cache

**Decision**: Hybrid caching strategy with per-context entries and TTL-based reuse

**Rationale**:
- Immediate refetch on new context switch ensures security (no stale permissions)
- Reusing cached data for recently-used contexts improves UX (instant switch)
- Small cache (5-minute TTL, max 10 contexts) prevents memory bloat
- Context-aware keys prevent permission leakage across org/project boundaries

**Alternatives Considered**:
- No caching: Too many API calls, poor UX on frequent context switches
- Optimistic caching: Security risk if permissions change while user in old context
- Immediate refetch always: Poor UX, feels slow when switching back to recent context

**Implementation Notes**:
- Cache structure: `Map<CacheKey, CachedPermissions>` where `CacheKey = "${userId}:${orgId}:${projectId}"`
- TTL: 5 minutes (configurable via `cacheTTL` prop on PermissionsProvider)
- Invalidation: On context switch (F03 integration), on explicit `refetchPermissions()` call
- LRU eviction: Keep max 10 contexts, evict least recently used when full

#### R5: PermissionGate Rendering Modes

**Decision**: Support both `mode="hide"` (default) and `mode="disable"` for failed permission checks

**Rationale**:
- `mode="hide"` is security-first default (fail-closed, removes from DOM)
- `mode="disable"` allows products to preserve layout/affordance (visible but non-interactive)
- Explicit opt-in for `disable` mode prevents accidental exposure of unauthorized UI

**Alternatives Considered**:
- Hide-only: Inflexible for UX scenarios where layout preservation matters
- Disable-only: Security risk if developers forget to handle denied state
- Configuration prop: `mode` prop is clearer than boolean flags like `showWhenDenied`

**Implementation Notes**:
- Default: `mode="hide"` (if prop omitted)
- Hide behavior: Return `null` (removes from React tree)
- Disable behavior: Clone `children` and inject `disabled` prop (for buttons/inputs), wrap in `<div aria-disabled="true">` for other elements
- Loading state: Always hide during `loading=true` (fail-closed)

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](data-model.md) for detailed entity definitions.

**Key Entities Modified**:
- **B08 Permission** (existing): No schema changes, usage enforcement via evaluator
- **B09 AuditEvent** (existing): Add `permission_code` field for permission-related events
- **Frontend PermissionState** (new): TypeScript interface for client-side permission representation
- **Frontend PermissionGateProps** (new): React component props interface

### API Contracts

See [contracts/](contracts/) directory for OpenAPI specifications.

**New Endpoints**:
- `GET /api/permissions/current/` - Returns hierarchical permissions for authenticated user's current context
  - Response: `{global: string[], organization: {[id: string]: string[]}, project: {[id: string]: string[]}}`
  - Status: 200 OK, 401 Unauthorized
  - Caching: 5-minute server-side cache per user

**Modified Endpoints** (403 format standardization):
- `GET /api/transactions/balance/` (B11)
- `GET /api/transactions/{id}/` (B11)
- `GET /api/notifications/` (B16)
- `GET /api/notifications/{id}/` (B16)
- `GET /api/settings/{key}/` (settings)
- `PUT /api/settings/{key}/` (settings)

All endpoints return structured 403:
```json
{
  "error": "forbidden",
  "permission": "resource.action",
  "detail": "Human-readable explanation"
}
```

### Developer Quickstart

See [quickstart.md](quickstart.md) for "Adding Permission Checks to New Features" guide.

**Topics Covered**:
1. Backend: Adding permission checks to new DRF views
2. Backend: Defining custom permission codes in B08
3. Backend: Testing permission enforcement
4. Frontend: Using PermissionsProvider in React apps
5. Frontend: Conditional rendering with PermissionGate
6. Frontend: Imperative permission checks with checkPermission()
7. Integration: Wiring F02 auth context and F03 context switcher

---

## Phase 2: Implementation Milestones

### Milestone 1: Backend Foundation (Day 1-2)

**Objective**: Implement centralized permission evaluator and B09 integration

**Tasks**:
1. Create `src/permissions/audit.py` with `evaluate_permission()` function
2. Add type hints and docstrings
3. Implement B09 audit event emission with Django logging fallback
4. Write unit tests for evaluator (90%+ coverage target)
5. Update existing B08 decorators to call `evaluate_permission()`
6. Update existing DRF permission classes to call `evaluate_permission()`

**Success Criteria**: SC-002 (100% of permission decisions logged), SC-004 (90%+ test coverage)

### Milestone 2: API Enforcement (Day 2-3)

**Objective**: Close ACL bypasses in B11, B16, B17, settings APIs

**Tasks**:
1. Add ACL checks to `OrganizationBalanceView` and `ProjectBalanceView` (B11)
2. Add ACL checks to `NotificationViewSet` (B16)
3. Refactor B17 routing service to use B06/B07 service layer (remove direct DB queries)
4. Add ACL checks to settings API views
5. Write integration tests per affected endpoint (allowed/denied scenarios)
6. Write security test suite with explicit bypass attempts

**Success Criteria**: SC-001 (100% of tenant-scoped endpoints enforce ACL), SC-006 (zero bypass vulnerabilities)

### Milestone 3: 403 Standardization (Day 3)

**Objective**: Implement phased 403 response format migration

**Tasks**:
1. Update `@django-core/api-client` error normalizer for dual format support
2. Create `/api/permissions/current/` endpoint with hierarchical response
3. Update B11 endpoints to emit new 403 format (additive backward compatibility)
4. Update B16 endpoints to emit new 403 format
5. Update B17 endpoints to emit new 403 format
6. Update settings endpoints to emit new 403 format
7. Write integration tests for 403 format standardization

**Success Criteria**: SC-003 (critical endpoints use structured 403 format), SC-009 (B09 unavailability doesn't block requests)

### Milestone 4: Frontend Package (Day 4)

**Objective**: Create `@django-core/permissions` package with React primitives

**Tasks**:
1. Scaffold package structure (`package.json`, `tsconfig.json`, `src/`, `tests/`)
2. Implement `PermissionsProvider` with F02/F03 integration
3. Implement `usePermissions()` hook
4. Implement `PermissionGate` component with `mode="hide"|"disable"`
5. Implement `checkPermission()` utility
6. Implement context-aware cache with hybrid invalidation strategy
7. Write unit + integration tests (85%+ coverage target)
8. Write package README with usage examples

**Success Criteria**: SC-005 (85%+ test coverage), SC-007 (developers can integrate in <30min), SC-008 (<50ms cached response latency)

### Milestone 5: Documentation & Review (Day 5)

**Objective**: Complete documentation and manual security review

**Tasks**:
1. Write [quickstart.md](quickstart.md) "Adding Permission Checks" guide
2. Update B08 README with extension points
3. Update B09 README with B08 integration pattern
4. Update `@django-core/permissions` README with examples
5. Conduct focused manual security review (pen test checklist)
6. Verify all CI checks pass (Black, Ruff, mypy, pytest, Jest)
7. Run full test suite and validate coverage targets

**Success Criteria**: SC-010 (all CI checks pass), all documentation complete, manual security review sign-off

---

## Risk Mitigation

### Risk 1: B09 Unavailability Breaks API Requests

**Mitigation**: FR-002 fallback to Django logging, integration test with B09 disabled (SC-009)

**Contingency**: If B09 integration proves unstable, temporarily disable B09 emission (log warnings only) until B09 is stabilized

### Risk 2: 403 Migration Breaks Downstream Consumers

**Mitigation**: Dual format support in api-client normalizer (backward compatible), phased rollout over 2-4 weeks

**Contingency**: Hotfix to revert 403 format on affected endpoints if critical breakage detected, extend transition period

### Risk 3: Permission Cache Causes Stale Authorization

**Mitigation**: Context-aware invalidation on F03 context switch, 5-minute TTL, explicit `refetchPermissions()` function

**Contingency**: Reduce TTL to 1 minute if stale permission issues arise, add manual cache clear button to UI

### Risk 4: Performance Degradation from Audit Logging

**Mitigation**: Asynchronous B09 event emission (non-blocking), B08 metrics hooks to monitor latency

**Contingency**: Add feature flag to disable audit logging if performance impact exceeds 10ms p95, optimize B09 bulk insert

### Risk 5: Security Test Suite Doesn't Catch Real Bypasses

**Mitigation**: Explicit bypass-attempt scenarios (wrong org/project, ID guessing), manual pen test review before merge

**Contingency**: Engage external security audit if bypass found post-merge, document incident and add regression test

---

## Complexity Tracking

*No constitutional violations requiring justification*
