# B08: Hierarchical Access Control

**Phase:** 2
**Status:** ✅ Done
**Module ID:** 008
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 8. B08 – Hierarchical Access Control

**Doel**: Permission model en evaluatie over global/org/project scopes.

**Status**: ✅ Complete

**Key Features**:
- Role model (global, organization, project scopes)
- Permission model (action-based)
- RoleAssignment model
- Permission evaluation engine
- Composite indexes for performance
- Permission caching via django-redis

---

**Fase 2 Compleet**: 4 modules (B05-B08)
**Outcome**: Full identity and access model ready for multi-tenant products
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Hierarchical Access Control System
*Path: kitty-specs/008-hierarchical-access-control/spec.md*

**Feature Branch**: `008-hierarchical-access-control`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Define hierarchical access control across users, organisations and projects, enabling fine-grained, inheritance-based permission logic with audit visibility."

## Clarifications

### Session 2025-11-25

- Q: When a role's permission set needs to change (e.g., "Organization Admin" gains a new permission), which behavior should the system enforce? → A: Roles can be modified in-place, triggering immediate cache invalidation for all users with that role
- Q: Should the system include pre-defined starter roles on initial deployment? → A: Yes - provide standard roles (Global Admin, Org Admin, Org Member, Org Viewer, Project Admin, Project Member, Project Viewer) with sensible permission defaults
- Q: When a user has multiple roles at the same scope level (e.g., both "Project Admin" and "Project Viewer" on the same project), how should the system behave? → A: Allow only one role per scope - assigning new role replaces previous one

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organization Admin Assigns Roles (Priority: P1)

As an organization admin, I need to assign roles to users at the organization level so that I can control who can manage organization resources and invite new members.

**Why this priority**: Foundation of the access control system. Without organization-level role assignment, no other authorization scenarios work. This is the entry point for all permission management.

**Independent Test**: Can be fully tested by creating an organization, assigning "Organization Admin" role to a user, and verifying they can perform admin actions (invite users, manage settings) while "Organization Viewer" role users cannot.

**Acceptance Scenarios**:

1. **Given** I am an organization owner, **When** I assign the "Organization Admin" role to a user, **Then** that user can invite new members and manage organization settings
2. **Given** I am an organization owner, **When** I assign the "Organization Viewer" role to a user, **Then** that user can view organization details but cannot modify them
3. **Given** I am an organization member (not admin), **When** I attempt to assign roles, **Then** the system denies access with a clear error message
4. **Given** a user has a role at organization level, **When** I remove that role, **Then** they lose access to organization resources within the cache TTL (5 minutes maximum)

---

### User Story 2 - Project Admin Grants Elevated Access (Priority: P1)

As a project admin, I need to grant project-specific roles that override organization-level restrictions so that external collaborators or temporary team members can contribute to specific projects without full organization access.

**Why this priority**: Core value proposition of hierarchical access control. Enables fine-grained permission management where project needs differ from organization defaults. Critical for multi-tenant collaboration scenarios.

**Independent Test**: Can be fully tested by creating a user with "Organization Viewer" role, assigning them "Project Admin" role on a specific project, and verifying they have full admin capabilities on that project only (additive inheritance working correctly).

**Acceptance Scenarios**:

1. **Given** a user has "Organization Viewer" role, **When** I assign them "Project Admin" role on a specific project, **Then** they gain full admin permissions on that project (most permissive wins)
2. **Given** a user has project-level role assignment, **When** they access project resources, **Then** their effective permissions are the union of organization-level and project-level permissions
3. **Given** I am a project admin, **When** I assign a role to a user on my project, **Then** that assignment only affects access to that specific project and its resources
4. **Given** a user has no explicit project role, **When** they access a project, **Then** they inherit permissions from their organization-level role

---

### User Story 3 - Developer Checks Authorization Programmatically (Priority: P1)

As a backend developer, I need a simple, consistent API to check user permissions so that I can secure Django views, DRF API endpoints, and async tasks without writing complex authorization logic.

**Why this priority**: Integration point for all consuming code. Without a clean authorization API, the permission system cannot be used effectively. Must be in place before other features can leverage access control.

**Independent Test**: Can be fully tested by writing a Django view that uses the authorization API to check if a user has "projects.delete" permission, then verifying it correctly evaluates organization and project roles with proper caching behavior.

**Acceptance Scenarios**:

1. **Given** I am implementing a DRF API endpoint, **When** I call `user.has_permission("projects.delete", project=project_obj)`, **Then** the system returns True/False based on evaluated roles with <2ms latency
2. **Given** a permission check is made, **When** the same check is repeated within the same request, **Then** the result is served from in-memory cache without re-evaluation
3. **Given** a permission check is made, **When** the user's role was modified recently, **Then** the check reflects the new permissions within 5 minutes (Redis cache TTL)
4. **Given** I am implementing authorization logic, **When** I need to check multiple permissions, **Then** I can batch-check them in a single call for better performance

---

### User Story 4 - Auditor Reviews Access Decisions (Priority: P2)

As a security auditor, I need to review why access was granted or denied for sensitive operations so that I can investigate security incidents and verify compliance with access policies.

**Why this priority**: Important for security and compliance but not required for basic system operation. Can be added after core authorization is working. Enhances observability and troubleshooting.

**Independent Test**: Can be fully tested by triggering a sensitive permission check (e.g., "projects.delete"), then verifying an audit log entry exists in B09-audit-logging with user, resource, permission, decision, and evaluation context.

**Acceptance Scenarios**:

1. **Given** a user attempts to delete a project, **When** the permission check is evaluated, **Then** an audit log entry is created with user ID, project ID, permission name, grant/deny decision, and evaluation timestamp
2. **Given** an audit log entry exists, **When** I review it, **Then** I can see which roles were evaluated and why the decision was made (e.g., "granted via project-level Admin role")
3. **Given** a sensitive permission is defined (e.g., organization deletion, role assignment), **When** it is checked, **Then** detailed evaluation context is logged even if the check result is cached
4. **Given** I am investigating an incident, **When** I query audit logs, **Then** I can filter by user, resource, permission, and decision within reasonable time (<1 second for 100k records)

---

### User Story 5 - System Integrator Applies Authorization Across Modules (Priority: P2)

As a system integrator building new Django apps, I need to apply the permission system to my custom resources without tight coupling so that I can secure new features consistently with the existing access control model.

**Why this priority**: Enables extensibility for future features. Not critical for initial release but important for long-term maintainability. Validates that the design is properly decoupled.

**Independent Test**: Can be fully tested by creating a new custom resource type (e.g., "reports"), defining custom permissions (e.g., "reports.generate"), and verifying role-based checks work without modifying the core authorization engine.

**Acceptance Scenarios**:

1. **Given** I am building a new Django app, **When** I define custom permissions for my resources, **Then** I can register them with the permission system using a standard registry pattern
2. **Given** I have custom permissions registered, **When** I assign roles with those permissions to users, **Then** authorization checks evaluate correctly using the same inheritance logic
3. **Given** I need to check permissions on custom resources, **When** I call the authorization API with my resource type and permission, **Then** the system evaluates roles without requiring core code changes
4. **Given** I have integrated the authorization system, **When** I need to add new permissions, **Then** I can do so by adding permission definitions without database schema changes

---

### Edge Cases

- **Cyclic role dependencies**: What happens when role inheritance could create cycles (e.g., Role A includes Role B, Role B includes Role A)? System must detect and reject cyclic definitions at role creation time.
- **Role modification impact**: When a role's permissions are modified in-place, all users with that role must have their cached evaluations invalidated immediately to reflect new permissions.
- **Role replacement on assignment**: When assigning a new role to a user at a scope where they already have a role, the system replaces the existing role assignment (enforced by unique constraint on user+scope+target).
- **Orphaned role assignments**: How does the system handle role assignments when the target organization or project is deleted? Role assignments should be cascade-deleted when parent resource is removed.
- **Permission check on deleted resources**: What happens when checking permissions on a resource that was recently deleted but still in cache? System should handle gracefully and return denial.
- **Cache invalidation race conditions**: How does the system handle permission checks during cache invalidation (e.g., role removed but cache not yet cleared)? Acceptable to grant access for up to cache TTL; critical operations should force cache refresh.
- **Global superuser permissions**: How do global admin/superuser roles interact with organization and project-level roles? Global roles should have implicit access to all organizations and projects without explicit assignment.
- **Permission checks without authentication**: What happens when anonymous/unauthenticated users trigger permission checks? System should deny by default and handle gracefully without errors.
- **Bulk role assignment failures**: What happens when assigning roles to multiple users and some assignments fail (e.g., user not found)? System should process all assignments atomically or provide partial success feedback with clear error messages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support custom role definitions with assignable permission sets (e.g., "Organization Admin" role with permissions ["org.invite_users", "org.manage_settings", "projects.create"]). Roles can be modified in-place; modifications trigger immediate cache invalidation for all affected users.
- **FR-001a**: System MUST provide pre-defined starter roles on initial deployment: Global Admin, Organization Admin, Organization Member, Organization Viewer, Project Admin, Project Member, Project Viewer with sensible default permissions mapped to resource types.
- **FR-002**: System MUST support permission assignment at three scope levels: Global (system-wide), Organization (all projects within org), and Project (specific project only). Users may have only one role per scope level; assigning a new role at the same scope replaces the previous assignment.
- **FR-003**: System MUST evaluate permissions using additive inheritance where project-level roles grant additional permissions beyond organization-level roles (most permissive wins)
- **FR-004**: System MUST cache role assignments and permission evaluations in Redis with 5-minute TTL to achieve <2ms latency for common permission checks
- **FR-005**: System MUST invalidate relevant cache entries when roles are assigned, removed, or modified
- **FR-006**: System MUST provide a programmatic API for permission checks usable in Django views, DRF viewsets, and async tasks (e.g., `user.has_permission(permission, resource=None)`)
- **FR-007**: System MUST emit audit events to B09-audit-logging for sensitive permission checks (configurable per permission type) including user, resource, permission, decision, and evaluation context
- **FR-008**: System MUST define pre-configured permission categories organized by resource type (e.g., "projects.create", "projects.update", "projects.delete", "projects.archive", "org.invite_users", "org.manage_billing")
- **FR-009**: System MUST prevent cyclic role dependencies and reject role definitions that would create inheritance cycles
- **FR-010**: System MUST cascade-delete role assignments when parent organization or project is deleted
- **FR-011**: System MUST handle permission checks on deleted or non-existent resources by denying access and logging the attempt
- **FR-012**: System MUST provide batch permission check API to reduce overhead when validating multiple permissions in a single request
- **FR-013**: System MUST support global superuser role with implicit access to all organizations and projects without explicit assignment
- **FR-014**: System MUST deny permission checks by default for anonymous/unauthenticated users
- **FR-015**: System MUST provide role assignment API that validates user and resource existence before creating assignments
- **FR-016**: System MUST store role assignments with audit metadata (assigned_by, assigned_at) for compliance and debugging
- **FR-017**: System MUST allow querying all users with a specific role at organization or project scope for administrative interfaces
- **FR-018**: System MUST support permission validation at resource boundaries (DRF serializers, Django forms) using declarative permission requirements
- **FR-019**: System MUST provide role and permission registry allowing downstream Django apps to register custom permissions without core code modifications

### Key Entities

- **Role**: Represents a named collection of permissions. Key attributes: name (e.g., "Organization Admin"), description, scope (global/organization/project), permission set (list of permission strings), created_at, updated_at. Relationships: assigned to users via RoleAssignment.

- **Permission**: Represents a specific capability on a resource type. Key attributes: permission string (e.g., "projects.delete"), resource_type (e.g., "project"), description, is_sensitive (triggers audit logging). Organized into categories by resource type for clarity.

- **RoleAssignment**: Links users to roles at specific scopes. Key attributes: user (reference to User model), role (reference to Role), scope (global/organization/project), target_organization (nullable, for org-scoped assignments), target_project (nullable, for project-scoped assignments), assigned_by (audit), assigned_at (audit). Unique constraint on (user, scope, target_organization, target_project) - enforces one role per user per scope level.

- **PermissionEvaluationContext**: Cached evaluation result. Key attributes: user, permission, resource_type, resource_id (nullable), decision (grant/deny), evaluated_roles (list of role IDs that contributed to decision), evaluated_at, cache_key. Stored in Redis with 5-minute TTL.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: The hierarchical access control system is a generic authorization framework with no product-specific rules. Permission categories (e.g., "projects.create") are resource-type-based, not product-based. The registry pattern allows downstream products to define their own permissions without modifying core code.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: Authorization logic will be isolated in a dedicated `permissions` Django app. Dependencies flow one direction: `permissions` → `organisations`, `projects`, `accounts` (read-only). B09-audit-logging integration uses event emission pattern (no tight coupling). Permission registry provides stable extension point.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: All authorization APIs will use type hints (e.g., `def has_permission(user: User, permission: str, resource: Optional[Model] = None) -> bool`). Django model definitions will use type annotations. Code will comply with existing pre-commit hooks.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Justification**: Test suite will include:
- Unit tests for permission evaluation logic (50+ tests covering inheritance, caching, edge cases)
- Integration tests for DRF permission classes (20+ tests)
- Performance tests for cache hit rates and latency targets (<2ms)
- Coverage target: >90% for permissions app

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: This feature IS the centralized authorization mechanism. Secure defaults: deny-by-default for all checks, cache only permission decisions (not sensitive data), audit logs exclude PII. Redis cache uses standard Django-redis integration (existing secure configuration).

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Justification**:
- N+1 prevention: Role queries use `select_related` and `prefetch_related` for user, organization, project relationships
- Caching strategy: Redis cache with 5-minute TTL achieves <2ms latency target
- Graceful degradation: If Redis unavailable, fall back to database-backed evaluation (slower but functional)
- Metrics: Track cache hit rate, evaluation latency, audit event volume

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Justification**: Role assignment APIs use DRF standards (RoleAssignmentSerializer validates user/role/resource existence). Permission check API is Python-native (not REST) but follows Django conventions. Breaking changes will use feature flags during transition periods.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Justification**: Will document:
- Authorization API usage guide for developers
- Extension guide for registering custom permissions in new Django apps
- ADR for additive inheritance strategy vs. restrictive model
- Cache invalidation strategy and TTL trade-offs

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Permission checks for cached roles complete in under 2 milliseconds for 95th percentile requests (measured via django-prometheus metrics)
- **SC-002**: Cache hit rate for permission evaluations exceeds 90% during normal operation (measured over 1-hour windows)
- **SC-003**: Developers can implement secure authorization for a new API endpoint with fewer than 10 lines of code (measured by code review samples)
- **SC-004**: System correctly evaluates hierarchical permissions with additive inheritance in 100% of test scenarios (180+ test cases covering all inheritance combinations)
- **SC-005**: Audit logs capture all sensitive permission decisions (configured as sensitive) with evaluation context within 100ms of decision (measured via logging timestamps)
- **SC-006**: Zero permission bypasses or privilege escalation vulnerabilities detected during security review and penetration testing
- **SC-007**: Role assignment and removal operations complete within 500ms including cache invalidation (measured at 99th percentile)
- **SC-008**: System gracefully degrades to database-backed evaluation when Redis is unavailable with <10s latency and clear error logging

## Assumptions

- **Redis availability**: Assumes Redis is already deployed and configured for caching (dependency on B06-organisation-management's Redis setup). If Redis is unavailable, system falls back to database evaluation.
- **B09 audit logging**: Assumes audit logging feature (B09) provides event ingestion API. If not available yet, audit events will be logged to Django logger temporarily.
- **Permission categories**: Assumes pre-defined permission categories will be sufficient for initial release (accounts, organisations, projects resources). New categories can be added via registry without migration.
- **Role modification frequency**: Assumes role definitions will be modified occasionally during system evolution but not constantly. Each modification triggers cache invalidation for all users with that role.
- **Single Django database**: Assumes all authorization data (roles, assignments) lives in primary PostgreSQL database. Future: could support read replicas for evaluation queries.
- **No external IAM integration in V1**: Assumes integration with external SSO/IAM systems (enterprise LDAP, Okta) is future work. V1 uses internal role model only.
- **UTF-8 permission strings**: Assumes permission strings use ASCII alphanumeric + dots (e.g., "projects.delete"). No internationalization of permission names in V1.

## Out of Scope

- **UI for role/permission management**: Administrative interfaces for managing roles and assignments are delegated to downstream products or future work. This feature provides APIs only.
- **External IAM/SSO integration**: Integration with enterprise identity providers (Okta, Azure AD, LDAP) is future work. V1 uses internal role model.
- **ABAC (Attribute-Based Access Control)**: Dynamic policies based on user attributes (e.g., "can edit if user.department == resource.owner.department") are out of scope. V1 supports role-based only.
- **Workflow-based approvals**: Multi-step approval workflows for permission requests (e.g., "request access → manager approves → grant role") are not included. V1 requires direct role assignment by authorized users.
- **Time-bound roles**: Temporary role assignments with automatic expiration (e.g., "grant access for 7 days") are future work. V1 roles are permanent until explicitly removed.
- **Permission delegation**: Allowing users to delegate their permissions to other users temporarily is out of scope for V1.
- **Advanced audit analytics**: Built-in dashboards, anomaly detection, or compliance reporting on audit logs are delegated to B09-audit-logging feature or future analytics tools.
- **Row-level security**: Database-level row security policies (PostgreSQL RLS) are not used. Authorization is enforced at application layer only.
- **Real-time permission revocation**: Immediate cache invalidation across all application instances when roles change is not guaranteed. Acceptable staleness: up to 5-minute cache TTL.

## Dependencies

- **B05-core-accounts-authentication**: User model and authentication system. Required for associating role assignments with users.
- **B06-organisation-management-multi**: Organisation model. Required for organization-scoped role assignments. Redis configuration for caching.
- **B07-projects-workspaces-management**: Project model. Required for project-scoped role assignments.
- **B09-audit-logging**: Audit event ingestion API. Required for logging sensitive permission decisions. If not available, will use temporary Django logging.
- **Redis**: Required for caching permission evaluations. Must support TTL-based expiration and key invalidation. Assumes django-redis integration exists.
- **PostgreSQL**: Required for storing role definitions, role assignments, and permission registry. Assumes Django ORM with foreign key constraints.

## Risks

- **Cache invalidation complexity**: Risk that cache invalidation fails or is delayed, causing stale permission evaluations. Mitigation: Conservative 5-minute TTL, force-refresh option for critical operations, monitoring of cache age.
- **Performance degradation with deep hierarchies**: Risk that permission evaluation becomes slow with many role assignments per user. Mitigation: Enforce one role per scope level (max 3 total: global + org + project), optimize query patterns with indexes, load test with realistic data volumes.
- **Authorization bypass vulnerabilities**: Risk of security bugs in permission evaluation logic allowing privilege escalation. Mitigation: Comprehensive test suite (180+ tests), security review before release, deny-by-default design, fuzz testing of evaluation engine.
- **Audit log volume**: Risk that verbose audit logging causes performance issues or storage costs. Mitigation: Make audit logging configurable per permission type, sample high-frequency checks, use async logging, set retention policies.
- **Redis unavailability impact**: Risk that Redis outage makes permission checks unacceptably slow. Mitigation: Database fallback mode, circuit breaker to detect Redis failures quickly, alerts on degraded performance.
- **Role definition sprawl**: Risk that teams create too many overlapping or conflicting roles. Mitigation: Document role design best practices, provide role templates, regular role audits, limit total number of custom roles.
- **Migration challenges from existing permissions**: Risk that migrating from Django's built-in permission system to hierarchical model is disruptive. Mitigation: Provide compatibility layer, phased rollout per app, migration scripts, rollback plan.
