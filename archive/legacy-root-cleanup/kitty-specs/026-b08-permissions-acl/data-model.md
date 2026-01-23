# Data Model: B08 Permissions & ACL Security Refactor
*Path: [kitty-specs/026-b08-permissions-acl/data-model.md](kitty-specs/026-b08-permissions-acl/data-model.md)*

**Feature**: 026-b08-permissions-acl
**Date**: 2025-12-12
**Phase**: 1 (Design & Contracts)

## Overview

This feature introduces **no new database models**. All changes involve usage enforcement of existing B08 Permission and B09 AuditEvent models, plus new TypeScript interfaces for frontend state management.

---

## Backend Entities (Existing - No Schema Changes)

### B08: Permission

**Purpose**: Represents an access right in the hierarchical ACL system

**Existing Schema** (no changes):
```python
class Permission(models.Model):
    """
    Represents a permission in the hierarchical ACL system.
    Existing model - no schema changes required.
    """
    permission_code = models.CharField(max_length=100, unique=True)
    # e.g., "organizations.view_balance", "project.create_transaction"

    scope = models.CharField(
        max_length=20,
        choices=[('GLOBAL', 'Global'), ('ORGANIZATION', 'Organization'), ('PROJECT', 'Project')]
    )

    role = models.ForeignKey('Role', on_delete=models.CASCADE, related_name='permissions')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Usage in This Feature**:
- Queried by `evaluate_permission()` to determine if user has permission
- Serialized by `PermissionsCurrentView` into hierarchical JSON response
- No new permission codes added in this feature (uses existing codes)

**Relationships**:
- `role` → Role (many-to-one): Permission belongs to a role
- User → Role → Permission (via RoleAssignment): User has permissions through role assignments

---

### B09: AuditEvent

**Purpose**: Records permission decisions and security events for compliance and investigation

**Existing Schema** (may add field - see note below):
```python
class AuditEvent(models.Model):
    """
    Records audit events including permission decisions.
    Existing model - may add permission_code field if not present.
    """
    event_type = models.CharField(max_length=50)
    # e.g., "permission.granted", "permission.denied"

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True)

    resource_type = models.CharField(max_length=50)
    # e.g., "organization", "project", "transaction"

    resource_id = models.CharField(max_length=100, null=True)

    outcome = models.CharField(max_length=20)
    # e.g., "allowed", "denied"

    metadata = models.JSONField(default=dict)
    # Contains: {permission: str, request_id: str, ip_address: str, ...}

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['organization', 'timestamp']),
        ]
```

**Potential Schema Addition**:
```python
# If not already present, add during implementation:
permission_code = models.CharField(max_length=100, null=True, db_index=True)
# Makes permission-specific queries efficient without parsing metadata JSON
```

**Usage in This Feature**:
- `evaluate_permission()` emits audit events with `event_type="permission.granted"` or `"permission.denied"`
- `metadata` field includes: `{permission: str, scope: str, organization_id: int, project_id: int, request_id: str}`
- Fallback to Django logging if B09 unavailable (FR-002)

**Query Patterns**:
```python
# Find all permission denials for a user
AuditEvent.objects.filter(
    user=user,
    event_type='permission.denied',
    timestamp__gte=start_date
)

# Find all access attempts for an organization
AuditEvent.objects.filter(
    organization=org,
    event_type__startswith='permission.',
    timestamp__gte=start_date
)
```

---

## Frontend Entities (New - TypeScript Interfaces)

### PermissionData

**Purpose**: Hierarchical permission structure returned by `/api/permissions/current/` API

**TypeScript Definition**:
```typescript
/**
 * Hierarchical permission structure from /api/permissions/current/
 */
export interface PermissionData {
  /**
   * Global-scope permissions (apply to all organizations/projects)
   * e.g., ["system.read_audit", "system.manage_users"]
   */
  global: string[];

  /**
   * Organization-scoped permissions, keyed by organization ID
   * e.g., { "42": ["organization.view", "billing.read"] }
   */
  organization: Record<string, string[]>;

  /**
   * Project-scoped permissions, keyed by project ID
   * e.g., { "101": ["project.view", "project.edit"] }
   */
  project: Record<string, string[]>;
}
```

**Usage**:
- Fetched from `/api/permissions/current/` endpoint
- Cached by `PermissionsProvider` with 5-minute TTL
- Resolved by `hasPermission()` with fallback hierarchy (project → organization → global)

**Example Response**:
```json
{
  "global": ["system.read_audit"],
  "organization": {
    "42": ["organization.view", "billing.read"],
    "43": ["organization.view"]
  },
  "project": {
    "101": ["project.view", "project.edit"],
    "102": ["project.view"]
  }
}
```

---

### PermissionState

**Purpose**: Client-side state for permissions hook (`usePermissions()`)

**TypeScript Definition**:
```typescript
/**
 * State returned by usePermissions() hook
 */
export interface PermissionState {
  /**
   * Loading state during initial fetch or refetch
   */
  loading: boolean;

  /**
   * Error state if fetch failed (null if no error)
   */
  error: Error | null;

  /**
   * Hierarchical permission data (null during loading)
   */
  permissions: PermissionData | null;

  /**
   * Check if user has a specific permission
   *
   * @param permission - Permission code (e.g., "organization.view")
   * @param options - Optional scope context {organizationId?, projectId?}
   * @returns true if permission granted (with fallback hierarchy), false otherwise
   */
  hasPermission: (
    permission: string,
    options?: { organizationId?: string; projectId?: string }
  ) => boolean;

  /**
   * Manually refetch permissions (invalidates cache)
   */
  refetchPermissions: () => Promise<void>;
}
```

**State Transitions**:
```
Initial: { loading: true, error: null, permissions: null }
  ↓ (fetch success)
Loaded: { loading: false, error: null, permissions: <data> }
  ↓ (context switch - new context)
Loading: { loading: true, error: null, permissions: <data> }  // Keep old data during fetch
  ↓ (fetch success)
Loaded: { loading: false, error: null, permissions: <new data> }

Error Path:
  ↓ (fetch error)
Error: { loading: false, error: <Error>, permissions: null }
```

**hasPermission Resolution Logic**:
```typescript
function hasPermission(
  permission: string,
  options?: { organizationId?: string; projectId?: string }
): boolean {
  if (!permissions) return false;  // Fail-closed during loading

  // Check project scope first (most specific)
  if (options?.projectId) {
    const projectPerms = permissions.project[options.projectId] || [];
    if (projectPerms.includes(permission)) return true;
  }

  // Fallback to organization scope
  if (options?.organizationId) {
    const orgPerms = permissions.organization[options.organizationId] || [];
    if (orgPerms.includes(permission)) return true;
  }

  // Fallback to global scope (least specific)
  return permissions.global.includes(permission);
}
```

---

### PermissionGateProps

**Purpose**: Props interface for `<PermissionGate>` component

**TypeScript Definition**:
```typescript
/**
 * Props for PermissionGate component
 */
export interface PermissionGateProps {
  /**
   * Permission code required to render children
   * e.g., "organization.view", "project.edit"
   */
  permission: string;

  /**
   * Rendering mode when permission denied or loading
   * - "hide" (default): Remove from DOM (fail-closed)
   * - "disable": Keep visible but disable interaction
   */
  mode?: 'hide' | 'disable';

  /**
   * Optional scope context for permission check
   * If omitted, uses current context from F03 context switcher
   */
  scope?: {
    organizationId?: string;
    projectId?: string;
  };

  /**
   * Optional fallback content when permission denied (only for mode="hide")
   * e.g., <PermissionGate fallback={<div>Access denied</div>}>
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading content during permission fetch (only for mode="hide")
   * e.g., <PermissionGate loading={<Spinner />}>
   */
  loading?: React.ReactNode;

  /**
   * Content to render if permission granted
   */
  children: React.ReactNode;
}
```

**Usage Examples**:
```tsx
// Default mode (hide)
<PermissionGate permission="organization.view">
  <OrganizationDetails />
</PermissionGate>

// Disable mode (preserve layout)
<PermissionGate permission="project.edit" mode="disable">
  <Button>Edit Project</Button>
</PermissionGate>

// With fallback
<PermissionGate
  permission="billing.read"
  fallback={<div>Contact admin for billing access</div>}
>
  <BillingDashboard />
</PermissionGate>

// With explicit scope
<PermissionGate
  permission="project.view"
  scope={{ projectId: "101" }}
>
  <ProjectDetails projectId="101" />
</PermissionGate>
```

---

### ForbiddenError

**Purpose**: Standardized 403 error structure for api-client error normalizer

**TypeScript Definition**:
```typescript
/**
 * Standardized 403 "Permission Denied" error structure
 */
export interface ForbiddenError {
  /**
   * Error type (always "forbidden" for 403 responses)
   */
  error: 'forbidden';

  /**
   * Permission code that was required but not granted
   * e.g., "organization.view_balance"
   * Value is "unknown" for legacy 403 responses (cannot infer)
   */
  permission: string;

  /**
   * Human-readable error message (safe to display to users)
   * MUST NOT contain sensitive data (user IDs, internal implementation details)
   */
  detail: string;
}
```

**Usage**:
- Returned by `@django-core/api-client` error normalizer
- Consumed by frontend packages for error handling
- Supports both legacy and new 403 formats (dual format support)

**Example Responses**:
```typescript
// New format (migrated endpoint)
{
  error: 'forbidden',
  permission: 'organization.view_balance',
  detail: 'You do not have permission to view organization balance.'
}

// Legacy format (normalized by api-client)
{
  error: 'forbidden',
  permission: 'unknown',  // Cannot infer from legacy format
  detail: 'You do not have permission to perform this action.'
}
```

---

## Entity Relationships

### Backend (Existing)

```
User
  ↓ (via RoleAssignment)
Role
  ↓ (via permissions FK)
Permission
  ↓ (queried by evaluate_permission)
B08 Evaluator
  ↓ (emits audit event)
AuditEvent
```

**Permission Resolution Flow**:
1. User makes API request (DRF view)
2. DRF permission class calls `evaluate_permission(user, permission_code, resource, context)`
3. Evaluator queries `Permission` model via user's role assignments
4. Evaluator emits `AuditEvent` with outcome (allowed/denied)
5. Evaluator returns boolean result to DRF permission class
6. If denied, DRF view returns 403 with structured error

---

### Frontend (New)

```
PermissionsProvider
  ↓ (fetches from API)
PermissionData
  ↓ (cached with TTL)
PermissionCache
  ↓ (provided via React Context)
usePermissions() hook
  ↓ (consumes context)
PermissionState
  ↓ (used by components)
PermissionGate / hasPermission()
```

**Permission Check Flow**:
1. `PermissionsProvider` fetches `/api/permissions/current/` on mount
2. Response cached as `PermissionData` (5-minute TTL, per-context key)
3. `usePermissions()` hook consumes React Context, returns `PermissionState`
4. Component uses `hasPermission(code, {orgId?, projectId?})` to check permission
5. Resolution uses fallback hierarchy: project → organization → global
6. `PermissionGate` uses `hasPermission()` internally for conditional rendering

---

## Validation Rules

### Backend

**Permission Code Format**:
- Pattern: `{resource}.{action}` (e.g., `organization.view`, `project.edit`)
- Max length: 100 characters
- Lowercase with underscores/dots only

**Audit Event Requirements**:
- `event_type` must be `"permission.granted"` or `"permission.denied"`
- `user` must be non-null (cannot audit anonymous permission checks)
- `organization` or `project` should be non-null for scoped permissions
- `metadata` must include: `{permission: str, scope: str, request_id: str}`

### Frontend

**Permission Code Validation**:
- Non-empty string
- Format: `{resource}.{action}` (enforced by type, not runtime validation)

**Cache Key Validation**:
- `userId` must be non-empty
- `organizationId` and `projectId` are optional (null for global scope)
- Serialized as: `"{userId}:{orgId}:{projectId}"` (empty string for null values)

---

## Migration Strategy

### Backend Migrations

**No database migrations required** unless `permission_code` field needs to be added to `AuditEvent` model.

**Migration Decision (Phase 1)**:
1. Check if `AuditEvent.metadata` JSON field is sufficient for permission code storage
2. If B09 queries frequently filter by permission code → add `permission_code` field with index
3. If B09 queries are rare → use `metadata` field (no migration)

**Conditional Migration** (if needed):
```python
# migrations/0001_add_permission_code_to_audit_event.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('audit', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditevent',
            name='permission_code',
            field=models.CharField(max_length=100, null=True, db_index=True),
        ),
    ]
```

### Frontend Migrations

**No data migrations required** (frontend state is ephemeral, cached in memory only).

**Breaking Change Handling**:
- `PermissionData` structure is new → no legacy format to migrate
- `ForbiddenError` structure supports both legacy and new 403 formats (dual format support)

---

## Performance Considerations

### Backend

**Query Optimization**:
- `evaluate_permission()` uses `prefetch_related('permissions')` on user's role assignments
- `/api/permissions/current/` endpoint uses `select_related('role')` to avoid N+1 queries

**Caching**:
- Server-side: `/api/permissions/current/` response cached for 5 minutes per user (Redis)
- Client-side: Frontend caches API response for 5 minutes (in-memory)

**Audit Event Volume**:
- Every permission check generates 1 audit event (high volume)
- B09 should use async task queue (Celery) for event persistence (non-blocking)
- If volume is too high, consider sampling (e.g., log 10% of "granted" events, 100% of "denied")

### Frontend

**Cache Hit Rate**:
- Target: >80% cache hit rate (reduces API calls)
- Typical user: 2-3 organizations, 5-10 projects → 10-15 cache entries max

**Memory Usage**:
- Typical `PermissionData`: ~2KB JSON
- Max 10 cached contexts → ~20KB total memory usage (negligible)

---

## Open Questions for Implementation

1. **B09 AuditEvent schema**: Does `permission_code` field exist, or should it be added?
   - **Resolution**: Check B09 model in `src/audit/models.py` during Milestone 1

2. **B08 permission code registry**: Are all required permission codes (`organization.view_balance`, `project.create_transaction`, etc.) already defined?
   - **Resolution**: Audit B08 fixtures/seeds in `src/permissions/fixtures/` during Milestone 1

3. **F02 auth context shape**: What is the exact structure of `currentUser` in F02 AuthContext?
   - **Resolution**: Review `packages/auth/src/AuthContext.tsx` during Milestone 4

4. **F03 context switcher integration**: How does F03 expose `currentOrg` and `currentProject`?
   - **Resolution**: Review `packages/context-switcher/src/ContextSwitcherProvider.tsx` during Milestone 4

---

## References

- **Specification**: [spec.md](spec.md)
- **Research**: [research.md](research.md)
- **B08 Models**: `src/permissions/models.py` (existing)
- **B09 Models**: `src/audit/models.py` (existing)
- **API Contracts**: [contracts/](contracts/) directory
