# Feature Specification: B08 Permissions & ACL Security Refactor
*Path: [kitty-specs/026-b08-permissions-acl/spec.md](kitty-specs/026-b08-permissions-acl/spec.md)*

**Feature Branch**: `026-b08-permissions-acl`
**Created**: 2025-12-12
**Status**: Draft
**Type**: Non-Functional Refactor (Security-Focused)
**Input**: WP-R01 from refactor-plan-core-app-v1.1.0.md

---

## Overview

This is a **security-focused refactor** that eliminates ACL bypass vulnerabilities, integrates B08 Hierarchical Access Control with the B09 audit backend, and provides reusable frontend permission primitives for current packages (F01-F04) and future features (F05-F09).

**What This Feature Does**:
- Closes identified ACL bypass paths in B11 (transactions/credits), B16 (notifications), B17 (contextual routing), and settings APIs
- Integrates B08 permission decisions with B09 structured audit logging
- Standardizes 403 "permission denied" response format across all Core-App APIs
- Provides a shared `@django-core/permissions` frontend package for declarative permission checks in React

**What This Feature Does NOT Do**:
- Does not introduce new domain-specific permissions, roles, or business rules
- Does not rewrite B08 or B09 from scratch (targeted improvements only)
- Does not add new product features or UI components beyond permission primitives
- Does not affect downstream products outside the Core-App monorepo

---

## Clarifications

### Session 2025-12-12

- Q: The `PermissionGate` component behavior when permission is denied - should it support both "hide" and "disable" modes, or only "hide"? → A: Support both hide and disable modes via a `mode="hide"|"disable"` prop. Default is `mode="hide"` (fail-closed, remove from DOM), but products may opt into `mode="disable"` when maintaining layout/affordance is important.

- Q: What should the B08 API endpoint `/api/permissions/current/` response structure be? → A: Use a hierarchical format: `{global: ["system.read_audit"], organization: {"42": ["organization.view"]}, project: {"101": ["project.view"]}}`. The `hasPermission(code, {organizationId?, projectId?})` method should resolve using this hierarchy with fallbacks (project → organization → global).

---

## Glossary

**Permissions Endpoint**: The API endpoint `/api/permissions/current/` that returns the hierarchical permission structure for the current user.

**PermissionsProvider**: React context provider component in `@django-core/permissions` package that fetches and manages permission state.

**B11 Transaction API**: B11 balance views (`OrganizationBalanceView`, `ProjectBalanceView`) and transaction management endpoints.

**Service Layer**: Backend abstraction layer (B06 for organizations, B07 for projects) that encapsulates data access and enforces ACL checks.

**ACL Bypass**: Security vulnerability where API endpoints fail to enforce tenant-scoped access controls, allowing cross-organization/cross-project data access.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Security Engineer: Audit Permission Decisions (Priority: P1)

**Description**: As a security engineer, I want all permission decisions logged through the B09 structured audit backend so I can investigate security incidents, prove compliance, and understand access patterns across tenants.

**Why this priority**: Critical security requirement. Without structured audit logs, investigating incidents is manual and error-prone. This is the foundation for all other ACL improvements.

**Independent Test**: Can be tested by making an API call that triggers a permission check (e.g., GET /api/transactions/balance/) and verifying that a corresponding audit event appears in the B09 audit log with structured fields (user, resource, permission, outcome, timestamp).

**Acceptance Scenarios**:

1. **Given** B08 ACL evaluates a permission for a user accessing an org-scoped resource, **When** the permission check passes, **Then** B09 audit log contains an event with `{event_type: "permission.granted", user_id, organization_id, permission: "org.view", outcome: "allowed", resource_type: "organization"}`

2. **Given** B08 ACL evaluates a permission for a user accessing a project-scoped resource, **When** the permission check fails (user lacks permission), **Then** B09 audit log contains an event with `{event_type: "permission.denied", user_id, project_id, permission: "project.edit", outcome: "denied", resource_type: "project"}`

3. **Given** B09 audit backend is unavailable (database error), **When** B08 attempts to log a permission decision, **Then** the system falls back to Django logging gracefully without blocking the permission check

4. **Given** a permission check occurs at Global scope (no org/project context), **When** logged to B09, **Then** the audit event includes `{scope: "GLOBAL", organization_id: null, project_id: null}`

---

### User Story 2 - Backend Developer: Apply ACL Checks Consistently (Priority: P1)

**Description**: As a backend developer, I want a clear, documented pattern for applying B08 ACL checks to API views so I can secure new endpoints without accidentally bypassing authorization.

**Why this priority**: Developer experience directly impacts security posture. Without clear patterns, developers will implement ad-hoc checks or use `AllowAny`, creating vulnerabilities.

**Independent Test**: Can be tested by creating a new API view following the documented pattern, making requests with and without proper permissions, and verifying 403 responses are returned correctly.

**Acceptance Scenarios**:

1. **Given** a developer creates a new DRF API view for org-scoped resources, **When** they follow the "Adding Permission Checks" guide, **Then** the view uses `HasPermission` with the correct permission code (e.g., `organizations.view`) and inherits permission scope correctly

2. **Given** an API endpoint requires project-level permission, **When** a user with only org-level permission attempts access, **Then** the system returns 403 with structured error `{error: "forbidden", permission: "project.edit", detail: "User lacks project-level permission"}`

3. **Given** the B11 transactions API endpoints previously used `AllowAny`, **When** refactored to use B08 ACL, **Then** unauthorized users receive 403 responses instead of seeing sensitive balance data

4. **Given** B17 routing service needs to resolve notification recipients, **When** it queries projects/orgs, **Then** it uses B06/B07 service layer functions that enforce ACL instead of direct database queries

---

### User Story 3 - Frontend Developer: Declarative Permission Checks (Priority: P2)

**Description**: As a frontend developer, I want a shared permissions package with `usePermissions` hook and `PermissionGate` component so I can conditionally render UI elements based on user permissions without duplicating logic across packages.

**Why this priority**: High priority for developer experience and UI consistency. Prevents permission logic duplication and ensures UI reflects actual backend permissions.

**Independent Test**: Can be tested by integrating `@django-core/permissions` into a sample component, mocking permission responses, and verifying that UI elements render/hide based on permission state.

**Acceptance Scenarios**:

1. **Given** a frontend component wraps a button in `<PermissionGate permission="project.edit">`, **When** the user has `project.edit` permission for the current context, **Then** the button is visible and clickable

2. **Given** a frontend component wraps a button in `<PermissionGate permission="project.delete">`, **When** the user lacks `project.delete` permission for the current context, **Then** the button is hidden by default (removed from DOM) or disabled (visible but non-interactive) if `mode="disable"` is specified

3. **Given** a component uses `const {hasPermission} = usePermissions()`, **When** calling `hasPermission("org.manage_members")`, **Then** the hook returns `true` or `false` based on fetched permissions from the `PermissionsProvider`

4. **Given** an app provides its own permission context instead of using `PermissionsProvider`, **When** passing permissions directly to `checkPermission(permissions, "feature.view")`, **Then** the utility evaluates the permission without making API calls

---

### User Story 4 - Platform Engineer: Prevent Tenant Data Leakage (Priority: P1)

**Description**: As a platform engineer, I want all API endpoints that return tenant-scoped data (balances, notifications, settings) to enforce ACL checks so users cannot access data from organizations or projects they don't belong to.

**Why this priority**: Critical for multi-tenancy security and compliance. Data leakage across tenants is a catastrophic failure.

**Independent Test**: Can be tested by creating two organizations, assigning a user to only one, and attempting API calls for the other org's resources. Should receive 403 for unauthorized org.

**Acceptance Scenarios**:

1. **Given** user Alice belongs to Org A but not Org B, **When** Alice requests `GET /api/organizations/{org_b_id}/balance/`, **Then** the system returns 403 with `{error: "forbidden", permission: "organizations.view_balance", detail: "User is not a member of this organization"}`

2. **Given** user Bob has "Viewer" role in Project X (read-only), **When** Bob requests `POST /api/projects/{project_x_id}/transactions/` (credit deduction), **Then** the system returns 403 with `{error: "forbidden", permission: "project.create_transaction"}`

3. **Given** user Carol has "Admin" role in Org C, **When** Carol requests `GET /api/notifications/?org_id={org_c_id}`, **Then** the system returns only notifications scoped to Org C (filtered server-side, not client-side)

4. **Given** B17 routing service determines notification recipients for a project event, **When** resolving recipients, **Then** it only includes users with appropriate project access (checked via B08, not raw database membership)

---

### User Story 5 - Product Team: Consistent Error Responses (Priority: P2)

**Description**: As a product team member integrating Core-App APIs, I want consistent 403 error response format across all endpoints so I can build reliable error handling and display meaningful messages to users.

**Why this priority**: High priority for integration reliability. Inconsistent error formats force defensive parsing and increase integration complexity.

**Independent Test**: Can be tested by triggering permission errors on multiple endpoints (B11, B16, settings) and verifying all return the same JSON structure.

**Acceptance Scenarios**:

1. **Given** an API request fails authorization on any Core-App endpoint, **When** the error response is returned, **Then** it matches the canonical format: `{error: "forbidden", permission: "resource.action", detail: "Human-readable explanation"}`

2. **Given** the existing `@django-core/api-client` error normalizer, **When** it receives a 403 response, **Then** it correctly parses both legacy formats and new structured formats (backward compatible)

3. **Given** multiple permission violations occur in a single request (rare edge case), **When** the API returns an error, **Then** the response includes the first failed permission check (not all violations, to avoid information leakage)

4. **Given** a permission check fails due to missing context (no org/project in request), **When** the error is returned, **Then** the detail field explains: "Organization or project context required"

---

### Edge Cases

- **What happens when B09 audit backend is unavailable?**
  - System falls back to Django logging (existing behavior), permission checks still execute normally
  - Log a warning that audit events are not being persisted
  - Include health check flag: `audit_backend_available: false`

- **How does the system handle permission checks for Global scope resources?**
  - B08 evaluator checks if user has Global-scope permission (e.g., `IsStaff` or superuser)
  - Audit log includes `{scope: "GLOBAL", organization_id: null, project_id: null}`
  - Frontend `usePermissions` hook supports `scope` parameter: `hasPermission("system.admin", {scope: "GLOBAL"})`

- **What if a user has permissions at multiple scopes (e.g., Admin in Org A, Viewer in Project A1)?**
  - B08 evaluator uses hierarchical evaluation: checks project scope first, falls back to org scope, then global
  - Audit log records the effective scope used for the decision
  - Frontend hook returns the highest applicable permission level

- **How does the staged rollout handle endpoints that don't migrate immediately?**
  - `api-client` error normalizer detects response format (presence of `permission` field)
  - If legacy format: normalizes to new structure internally for consistent consumption
  - If new format: passes through unchanged
  - Both formats include additive fields during transition period

- **What happens if `PermissionsProvider` fetch fails (network error)?**
  - Hook returns `{loading: false, error: <Error>, hasPermission: () => false}` (fail-closed)
  - Components wrapped in `<PermissionGate>` hide by default (secure default)
  - Error boundary can display a "Permission check failed" message
  - Retry logic: exponential backoff (1s, 2s, 4s), max 3 retries

- **How are permissions cached to avoid excessive API calls?**
  - `PermissionsProvider` caches permissions for 5 minutes (configurable)
  - Cache key: `{user_id, org_id?, project_id?}` (context-aware)
  - Cache invalidated when context changes (org/project switch via F03)
  - Optional: `refetchPermissions()` function exposed for manual refresh

---

## Requirements *(mandatory)*

### Functional Requirements

#### Backend: B08 + B09 Integration

- **FR-001**: B08 permission evaluator MUST emit audit events to B09 backend for every permission check (granted or denied)
- **FR-002**: Audit events MUST include structured fields: `{event_type, user_id, organization_id?, project_id?, permission, outcome, resource_type, scope, timestamp, metadata}`
- **FR-003**: If B09 audit backend is unavailable, B08 MUST fall back to Django logging without blocking permission checks
- **FR-004**: B08 MUST replace the existing `DjangoLoggingBackend` default with `B09Backend` as the primary audit backend

#### Backend: ACL Enforcement in Critical APIs

- **FR-005**: B11 transaction API views (`OrganizationBalanceView`, `ProjectBalanceView`, `TransactionViewSet`) MUST replace `AllowAny` with `HasPermission` and enforce appropriate permission codes
- **FR-006**: B16 notification API views (`NotificationViewSet`) MUST enforce ACL checks for list/retrieve endpoints (permission: `notifications.view`)
- **FR-007**: Settings API views MUST enforce ACL checks based on org/project scope (permission: `settings.view`, `settings.edit`)
- **FR-008**: B17 routing service MUST use B06/B07 service layer functions (that enforce ACL) instead of direct database queries when resolving notification recipients. If B06/B07 service layer functions do not exist, they MUST be implemented as part of WP04.
- **FR-009**: System MUST filter queryset results server-side based on user's org/project memberships (no client-side filtering). This applies to: B11 `OrganizationBalanceView`/`ProjectBalanceView` (filter by user memberships), B16 `NotificationViewSet` (filter by notification.organization/project), Settings `SettingsViewSet` (filter by setting scope)

#### Backend: Standardized 403 Response Format

- **FR-010**: All Core-App API endpoints returning 403 errors MUST include a structured response body: `{error: "forbidden", permission: "resource.action", detail: "Human-readable explanation"}`
- **FR-011**: 403 responses MUST NOT leak sensitive information that enables enumeration attacks or exposes implementation details. Permission codes and human-readable error messages are acceptable. Internal implementation details (stack traces, query patterns) and exhaustive lists of all required permissions MUST NOT be included.
- **FR-012**: `@django-core/api-client` error normalizer MUST handle both legacy and new 403 formats during transition period (additive backward compatibility). Dual format support MUST be maintained for minimum 2 releases to allow gradual migration.

#### Frontend: Permissions Package

- **FR-013**: `@django-core/permissions` package MUST provide a `PermissionsProvider` component that fetches and caches user permissions using `@django-core/api-client`. API response format: `{global: string[], organization: {[id: string]: string[]}, project: {[id: string]: string[]}}`
- **FR-014**: `PermissionsProvider` MUST integrate with F02 auth context (current user) and F03 context switcher (current org/project)
- **FR-015**: Package MUST export a `usePermissions()` hook returning `{loading, error, hasPermission(permission, options?), refetchPermissions()}` where `hasPermission(code, {organizationId?, projectId?})` resolves hierarchically with fallbacks (project → organization → global)
- **FR-016**: Package MUST export a `<PermissionGate permission={string} mode={"hide"|"disable"} fallback={ReactNode?}>` component for conditional rendering
- **FR-017**: Package MUST export a `checkPermission(permissions, permission, options?)` utility for imperative checks without React context
- **FR-018**: Permission fetching MUST implement client-side caching with 5-minute TTL to avoid excessive API calls. Context-aware cache invalidation MUST occur immediately on org/project context switch. Input debouncing (300ms) MAY be implemented for autocomplete/search scenarios but is not required for MVP.
- **FR-019**: `PermissionGate` MUST default to `mode="hide"` (fail-closed, removes content from DOM) if permissions are loading, errored, or denied; `mode="disable"` keeps element visible but non-interactive (e.g., disabled button)

#### Testing & Quality

- **FR-020**: B08 `audit.py` module MUST achieve 90%+ test coverage (unit + integration tests)
- **FR-021**: `@django-core/permissions` frontend package MUST achieve 85%+ test coverage (unit + integration tests)
- **FR-022**: Integration tests MUST cover minimum 5 end-to-end flows: (1) Granted permission: User has permission → API returns 200, (2) Denied permission: User lacks permission → API returns 403 with structured error, (3) B09 unavailable: Audit backend down → API still returns 403/200, falls back to Django logging, (4) Frontend 403 handling: API returns 403 → frontend displays error normalized by api-client, (5) Permission inheritance: Project-level permission checked → resolves from org/global if missing
- **FR-023**: Tests MUST verify permission inheritance: project-level permissions inherit from org-level, org-level from global
- **FR-024**: Tests MUST verify ACL bypass is closed for B11 balance endpoints, B16 notifications, B17 routing service. Bypass attempt tests MUST return 403 status code with no data leakage in 100% of unauthorized scenarios.

#### Documentation

- **FR-025**: A "Adding Permission Checks to New Features" guide MUST be created in `docs/guides/` with code examples
- **FR-026**: B08 README MUST document the B09 audit backend integration and fallback behavior
- **FR-027**: `@django-core/permissions` README MUST include usage examples for `PermissionsProvider`, `usePermissions`, `PermissionGate`, and `checkPermission`
- **FR-028**: Migration notes MUST document the 403 response format change and staged rollout strategy

### Key Entities *(data structures involved)*

#### Backend: AuditEvent (B09)

- **Purpose**: Structured log of permission decisions for security auditing
- **Key Fields**: `event_type` (e.g., "permission.granted"), `user_id`, `organization_id`, `project_id`, `permission` (e.g., "project.edit"), `outcome` ("allowed" | "denied"), `resource_type`, `scope` ("GLOBAL" | "ORGANIZATION" | "PROJECT"), `timestamp`, `metadata` (JSON)
- **Relationship**: Created by B08 permission evaluator, persisted by B09 audit system

#### Backend: Permission (B08)

- **Purpose**: Represents an access right in the hierarchical ACL system
- **Key Attributes**: `permission_code` (string, e.g., "organizations.view_balance"), `scope` (Global/Org/Project), `role` (association)
- **Existing Entity**: No schema changes required, only usage enforcement

#### Frontend: PermissionState

- **Purpose**: Client-side representation of user's permissions for current context
- **Structure**: `{loading: boolean, error: Error | null, permissions: {global: string[], organization: Record<string, string[]>, project: Record<string, string[]>}, hasPermission: (permission: string, options?: {organizationId?: string, projectId?: string}) => boolean, refetchPermissions: () => Promise<void>}`
- **Source**: Fetched from B08 API endpoint `/api/permissions/current/` (hierarchical format)
- **Resolution Logic**: `hasPermission` resolves with fallback hierarchy: project (if projectId provided) → organization (if organizationId provided) → global

#### Frontend: PermissionGateProps

- **Purpose**: Configuration for conditional rendering component
- **Structure**: `{permission: string, mode?: "hide" | "disable", scope?: "GLOBAL" | "ORGANIZATION" | "PROJECT", fallback?: ReactNode, loading?: ReactNode, children: ReactNode}`
- **Behavior**: Renders `children` if permission granted. If denied: `mode="hide"` (default) removes from DOM, `mode="disable"` renders children with `disabled` prop or wrapper. Shows `fallback` if provided (both modes), `loading` during fetch

---

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented: permission codes are customizable per product, `PermissionGate` accepts custom fallback components

**Notes**: This is a pure infrastructure refactor. B08 ACL and B09 audit are product-agnostic primitives. The frontend permissions package is a reusable library with no domain-specific logic.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: B08 (authorization) → B09 (audit), frontend packages consume backend APIs via `api-client`
- [x] No circular dependencies introduced: B08 depends on B09 (one-way), frontend packages depend on backend APIs (HTTP boundary)
- [x] Extension points are stable: `PermissionsProvider` accepts custom fetching logic, `checkPermission` works with external permission sources
- [x] Repository-Aware Design: Reuses existing B08 ACL evaluator, B09 audit system, `@django-core/api-client`, F02 auth context, F03 context switcher

**Notes**: No new parallel ACL systems. All changes extend existing B08/B09 infrastructure.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (no downgrade)
- [x] Type hints will be used: all B08 service functions, B09 audit backend interface
- [x] Code will be formatted with Black and linted with Ruff (CI enforced)
- [x] TypeScript strict mode for `@django-core/permissions` package

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests for B08/B09 integration
- [x] Coverage targets defined: B08 audit.py 90%+, frontend permissions package 85%+
- [x] Integration tests planned: API → ACL → audit → 403 response → frontend error handling
- [x] Edge case tests: B09 unavailable fallback, permission inheritance, multi-scope evaluation

### Security & Privacy (Principle V)
- [x] Secure defaults maintained: fail-closed (deny access on permission check failure)
- [x] No secrets in code: B09 audit backend connection uses Django settings
- [x] Authentication/authorization handled through centralized B08 ACL (no ad-hoc checks)
- [x] No sensitive data logged in audit events: sanitized error messages, no internal IDs in public-facing responses

**Critical Security Improvements**:
- Closes ACL bypass in B11 (balance endpoints), B16 (notifications), B17 (routing service)
- Ensures all permission decisions are auditable via B09
- Prevents tenant data leakage through server-side queryset filtering

### Performance & Reliability (Principle VI)
- [x] No new N+1 queries: B17 routing service refactor will use `select_related`/`prefetch_related`
- [x] Pagination maintained: no changes to existing pagination
- [x] Structured logging included: B08 audit events include context for debugging
- [x] Graceful degradation: B09 unavailable → falls back to Django logging, permission checks still work

**Performance Considerations**:
- Frontend permissions cached (5-minute TTL) to reduce API calls
- B08 audit events emitted asynchronously (non-blocking)

### API Design (Principle VII)
- [x] DRF standards followed: 403 responses use standard HTTP semantics
- [x] API responses are consistent: standardized 403 format across all endpoints
- [x] Breaking changes use staged rollout: `api-client` normalizer handles both formats during transition
- [x] Validation at boundary: permission checks occur in DRF permission classes (before view logic)

### Documentation (Principle XI)
- [x] Feature documentation plan included: "Adding Permission Checks to New Features" guide
- [x] Module READMEs updated: B08, B09, `@django-core/permissions`
- [x] Migration notes documented: 403 format change, staged rollout strategy
- [x] No ADR required: this refactor follows established patterns (B08 ACL is existing architecture)

**Violations Requiring Justification**: None

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of API endpoints handling tenant-scoped data (balances, notifications, settings) enforce B08 ACL checks (verified by code audit + integration tests)

- **SC-002**: 100% of B08 permission decisions are logged to B09 audit backend when available (verified by integration tests checking audit event count matches permission check count)

- **SC-003**: All 403 responses from Core-App APIs include structured format `{error, permission, detail}` within 2 weeks of implementation (verified by API contract tests)

- **SC-004**: B08 `audit.py` module achieves 90%+ test coverage (measured by pytest-cov)

- **SC-005**: `@django-core/permissions` frontend package achieves 85%+ test coverage (measured by Jest coverage report)

- **SC-006**: Zero ACL bypass vulnerabilities remain in B11, B16, B17 after refactor (verified by security-focused integration tests attempting unauthorized access)

- **SC-007**: Frontend developers can integrate permission checks in <30 minutes using the "Adding Permission Checks" guide (validated via internal developer testing)

- **SC-008**: Permission check latency does not exceed 50ms for cached responses (measured via frontend performance metrics)

- **SC-009**: B09 audit backend unavailability does not block API requests (verified by integration test with B09 disabled - requests still succeed, fallback logging active)

- **SC-010**: All existing CI checks (pytest, Jest, Black, Ruff, mypy) pass with no new violations introduced

---

## Dependencies

### Internal (Core-App)

- **B05 (Accounts/Auth)**: Provides user model and authentication context
- **B06 (Organisations)**: Provides org membership and scoping
- **B07 (Projects)**: Provides project membership and scoping
- **B08 (Permissions/ACL)**: Target of refactor - permission evaluator and audit integration
- **B09 (Audit Logging)**: Target of integration - audit backend for permission events
- **B11 (Transactions/Credits)**: Critical API requiring ACL enforcement
- **B16 (Notifications)**: Critical API requiring ACL enforcement
- **B17 (Contextual Notifications)**: Routing service requiring ACL enforcement
- **B13 (API Foundation)**: DRF baseline, OpenAPI, standardized responses
- **F01 (Design System)**: UI components for frontend permissions package (if needed)
- **F02 (Auth UI)**: Auth context for `PermissionsProvider` integration
- **F03 (Context Switcher)**: Org/project context for permission evaluation
- **`@django-core/api-client`**: CSRF-protected fetch and error normalization

### External

- **Django 5.1+**: Permission framework, DRF integration
- **Django REST Framework 3.14+**: API views, serializers, permission classes
- **Redis**: (existing) Used by B08 for caching, no changes required
- **PostgreSQL**: (existing) B09 audit event persistence
- **React 18.x**: Frontend permissions package hooks and components
- **TypeScript 5.x**: Type safety for frontend package

---

## Assumptions

1. **B09 Audit Backend Stability**: Assumes B09 audit system is stable enough for integration. Fallback to Django logging provides safety net if assumption is incorrect.

2. **Existing Permission Codes**: Assumes B08 already defines permission codes for `organizations.view_balance`, `project.create_transaction`, `notifications.view`, etc. If missing, will be added as part of this refactor.

3. **No Breaking Changes to B08 API**: Assumes B08 public API (permission evaluator, permission classes) remains stable. No major refactoring of B08 internals required.

4. **Frontend Context Availability**: Assumes F02 auth context and F03 context switcher are stable and provide `currentUser`, `currentOrg`, `currentProject`. If not, `PermissionsProvider` will need additional integration work.

5. **5-Minute Cache TTL**: Assumes 5-minute permission cache is acceptable for UX. If permissions need to update faster (e.g., after role change), manual `refetchPermissions()` call is available.

6. **API Endpoint for Permissions**: B08 will expose `/api/permissions/current/` endpoint returning hierarchical permission structure: `{global: string[], organization: {[id: string]: string[]}, project: {[id: string]: string[]}}`. If endpoint doesn't exist, will be created as part of this feature.

7. **No Bulk Permission Changes**: Assumes permission revocations are rare (not real-time requirement). 5-minute cache is acceptable; invalidation on context switch is sufficient.

8. **Staged Rollout Acceptable**: Assumes a 2-4 week transition period for 403 response format change is acceptable to downstream consumers. All consumers use `@django-core/api-client`, so centralized normalizer handles compatibility.

---

## Out of Scope

- **New Permission Roles**: No creation of new roles (Admin, Viewer, etc.) - uses existing B08 role structure
- **Product-Specific Permissions**: No product-specific permission codes (e.g., "billing.view_invoices") - Core-App remains product-agnostic
- **UI Component Redesign**: No changes to F01 design system components - `PermissionGate` uses existing components
- **WebSocket Permission Checks**: No real-time permission updates via WebSocket - polling/cache-based only
- **Granular Field-Level Permissions**: No field-level ACL (e.g., "can edit project name but not description") - resource-level only
- **Permission Delegation**: No "act as" or impersonation features - direct user permissions only
- **B17 Query Optimization**: Direct DB access removed, but N+1 query optimization deferred to separate WP (focus on security, not performance)
- **End-to-End UI Tests**: Playwright/Cypress E2E tests deferred to separate WP (unit + integration tests only)
- **Full B08/B09 Rewrite**: Targeted improvements only - no architectural overhaul
- **Downstream Product Changes**: All changes stay within Core-App monorepo

---

## Notes

- **Timeline**: Estimated 4-5 days (extended from original 3-4 days to include B17 routing service refactor)
- **Priority**: P0 (blocks F05-F09 frontend features per Analyze-Refactor-First rule in constitution v1.1.0)
- **Related Work Packages**:
  - WP-R02: B11 credits API normalization (follows this WP)
  - WP-R03: B18 observability contract (parallel, no dependencies)
  - WP-R04: F03/F04 error handling (follows this WP, depends on standardized 403 format)
- **Constitution Compliance**: Fully aligned with constitution v1.1.0, including Repository-Aware Design (reuses existing B08/B09) and Analyze-Refactor-First (prerequisite for F05-F09)
- **Security Impact**: HIGH - closes critical ACL bypass vulnerabilities identified in 25-module analysis report

---

## Appendix: Reference Documentation

- **Refactor Plan**: c:\Users\brian\Documents\django-core\refactor-plan-core-app-v1.1.0.md (WP-R01)
- **Analysis Report**: c:\Users\brian\Documents\django-core\analysis-core-app-25-modules.md (Section 3: Constitution Alignment, Section 5: Security Risks)
- **B08 Module**: src/permissions/ (existing ACL implementation)
- **B09 Module**: src/audit/ (existing audit system)
- **API Client**: packages/api-client/ (existing error normalizer)
