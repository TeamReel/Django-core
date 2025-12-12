---
work_package_id: WP09
title: Documentation & Developer Guides
lane: planned
subtasks:
  - T055
  - T056
  - T057
  - T058
  - T059
history:
  - date: 2025-12-12
    action: created
    by: spec-kitty-tasks
---

# WP09: Documentation & Developer Guides

## Objective

Create comprehensive documentation for backend and frontend developers to adopt permission checks: validate quickstart guide, update B08/B09 READMEs, write frontend package README, and document 403 migration strategy.

## Context

**User Story**: Story 2 + Story 3 (Developer Experience - P2)

**Why This Matters**:
- Enables self-service adoption of permission checks (reduces onboarding friction)
- Documents migration path for existing endpoints (reduces production errors)
- Provides reference examples for common patterns (improves code consistency)

**Success Criteria**:
- SC-007: New developers can integrate permission checks in <30 minutes
- FR-025 through FR-028: All documentation requirements satisfied

**Dependencies**: WP01-WP08 (requires implementation complete for accurate documentation)

---

## Subtasks

### T055: Validate quickstart.md Guide (Already Created in Planning Phase)

**What to Do**:
1. Open `kitty-specs/026-b08-permissions-acl/quickstart.md` (created during planning)

2. Validate content completeness:
   - **Backend section**: evaluate_permission() usage, DRF classes, 403 responses, permission codes, test patterns
   - **Frontend section**: PermissionsProvider setup, PermissionGate usage, usePermissions hook, checkPermission utility, error handling, test patterns
   - **Common patterns**: Hierarchical resolution examples, multi-scope checks, error handling
   - **Troubleshooting**: Common errors and solutions

3. Test guide with fresh developer:
   - Ask developer unfamiliar with B08 to follow guide
   - Time integration process (should be <30 minutes)
   - Collect feedback on unclear steps

4. Update guide based on feedback

**Acceptance Criteria**:
- Guide validated by at least one developer
- Integration time ≤30 minutes for new developer
- No missing steps or unclear instructions
- SC-007 satisfied

---

### T056: Update B08 README with evaluate_permission() Usage

**What to Do**:
1. Open `src/permissions/README.md` (or create if missing)

2. Add documentation sections:

**Overview**:
```markdown
# B08: Permissions & Access Control

## Overview
B08 provides centralized permission evaluation with audit logging integration. All permission checks must go through the `evaluate_permission()` function to ensure consistent ACL enforcement and comprehensive audit trails.

## Key Components
- **Permission Model**: Stores permission codes (e.g., `organization.view`, `project.edit`)
- **Role Model**: Groups permissions into reusable roles
- **RoleAssignment Model**: Links users to roles with scope (GLOBAL, ORGANIZATION, PROJECT)
- **Centralized Evaluator**: `evaluate_permission()` function in `permissions/audit.py`
```

**Usage Examples**:
```markdown
## Usage

### Backend: Evaluating Permissions

```python
from permissions.audit import evaluate_permission

# Check organization-scoped permission
granted = evaluate_permission(
    user=request.user,
    permission="organization.view_balance",
    context={"scope": "ORGANIZATION", "organization_id": org_id}
)

if not granted:
    raise PermissionDenied({
        "error": "forbidden",
        "permission": "organization.view_balance",
        "detail": "You do not have permission to view this organization's balance"
    })
```

### DRF Permission Classes

```python
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = "organization.view_balance"

    def get(self, request, organization_id):
        # Permission automatically enforced by DRF
        ...
```

## Extension Points

### Adding New Permission Codes

1. Add permission to fixtures:
```json
{
  "model": "permissions.permission",
  "pk": "my_feature.view",
  "fields": {
    "code": "my_feature.view",
    "name": "View My Feature",
    "scope": "ORGANIZATION"
  }
}
```

2. Use in views:
```python
evaluate_permission(user, "my_feature.view", context={...})
```
```

**Acceptance Criteria**:
- README includes overview, usage examples, extension points
- Code examples are runnable (tested in dev environment)
- FR-026 satisfied (B08 README updated)

---

### T057: Update B09 README with B08 Integration Pattern

**What to Do**:
1. Open `src/audit/README.md`

2. Add B08 integration section:

```markdown
# B09: Audit Logging

## B08 Integration

B09 automatically captures all permission decisions made through `evaluate_permission()`. Audit events include:

- **Event Type**: `permission.granted` or `permission.denied`
- **User ID**: User requesting permission
- **Permission Code**: Specific permission checked (e.g., `organization.view_balance`)
- **Scope**: GLOBAL, ORGANIZATION, or PROJECT
- **Outcome**: "allowed" or "denied"
- **Metadata**: Resource type, resource ID, request ID

### Audit Event Schema

```python
{
    "event_type": "permission.granted",
    "user_id": 123,
    "organization_id": 456,
    "project_id": null,
    "permission": "organization.view_balance",
    "outcome": "allowed",
    "scope": "ORGANIZATION",
    "metadata": {
        "request_id": "req-abc123",
        "resource_type": "Organization",
        "resource_id": 456
    },
    "timestamp": "2025-12-12T10:30:00Z"
}
```

### Querying Audit Events

```python
from audit.models import AuditEvent

# Find all denied permission attempts
denied_events = AuditEvent.objects.filter(
    event_type="permission.denied",
    user_id=user_id
).order_by("-timestamp")

# Find permission checks for specific resource
org_permission_events = AuditEvent.objects.filter(
    permission__startswith="organization.",
    organization_id=org_id
)
```

## Fallback Behavior

When B09 is unavailable, permission checks fall back to Django logging:
- Warning logged about B09 unavailability
- Permission decision logged to `permissions.audit` logger
- Permission check continues (not blocked by B09 failure)
```

**Acceptance Criteria**:
- README documents B08 integration pattern
- Audit event schema included
- Query examples provided
- Fallback behavior documented
- FR-027 satisfied (B09 README updated)

---

### T058: Write @django-core/permissions Package README

**What to Do**:
1. Create `packages/permissions/README.md`

2. Structure:

```markdown
# @django-core/permissions

React package for declarative permission checks with hierarchical resolution and context-aware caching.

## Installation

```bash
pnpm add @django-core/permissions
```

## Setup

Wrap your app in `PermissionsProvider`:

```tsx
import { PermissionsProvider } from "@django-core/permissions";
import { AuthProvider } from "@django-core/auth";
import { ContextSwitcher } from "@django-core/context-switcher";

function App() {
  return (
    <AuthProvider>
      <ContextSwitcher>
        <PermissionsProvider>
          <YourApp />
        </PermissionsProvider>
      </ContextSwitcher>
    </AuthProvider>
  );
}
```

## Usage

### PermissionGate Component (Hide Mode)

```tsx
import { PermissionGate } from "@django-core/permissions";

function MyComponent() {
  return (
    <PermissionGate permission="organization.view_balance">
      <div>Protected Content</div>
    </PermissionGate>
  );
}
```

### PermissionGate Component (Disable Mode)

```tsx
<PermissionGate permission="organization.edit" mode="disable">
  <button>Edit Organization</button>
</PermissionGate>
```

### usePermissions Hook

```tsx
import { usePermissions } from "@django-core/permissions";

function MyComponent() {
  const { checkPermission, isLoading } = usePermissions();

  if (isLoading) return <div>Loading permissions...</div>;

  const canEdit = checkPermission("organization.edit", "ORGANIZATION", orgId);

  return (
    <button disabled={!canEdit}>Edit</button>
  );
}
```

### checkPermission Utility (Framework-Agnostic)

```typescript
import { checkPermission } from "@django-core/permissions";

const permissions = {
  global: ["admin.view"],
  organizations: {
    "org-1": {
      name: "Org A",
      permissions: ["organization.view", "organization.edit"],
      projects: {},
    },
  },
};

const canEdit = checkPermission(permissions, "organization.edit", "ORGANIZATION", "org-1");
```

## API Reference

### PermissionsProvider Props
- `children`: React nodes to wrap

### usePermissions Return Value
- `isLoading`: boolean - Loading state
- `error`: Error | null - Error state
- `permissions`: PermissionData | null - Permission data
- `checkPermission(code, scope?, resourceId?)`: Function - Check permission
- `refetch()`: Function - Manually refetch permissions

### PermissionGate Props
- `permission`: string - Permission code to check
- `scope?`: "GLOBAL" | "ORGANIZATION" | "PROJECT" - Scope (default: inferred from context)
- `resourceId?`: string - Organization or project ID
- `mode?`: "hide" | "disable" - Display mode (default: "hide")
- `fallback?`: ReactNode - Content to show when permission denied
- `children`: ReactNode - Protected content

## F02/F03 Integration

This package automatically integrates with:
- `@django-core/auth` for current user
- `@django-core/context-switcher` for current organization/project

Permissions are automatically refetched when:
- User logs in/out
- Organization/project context changes

## Caching

Permissions are cached per context with:
- 5-minute TTL
- LRU eviction (max 10 contexts)
- Automatic invalidation on context switch

## Troubleshooting

### "usePermissionsContext must be used within PermissionsProvider"
- Ensure `PermissionsProvider` wraps all components using permission hooks/components

### Permissions not updating after context switch
- Check F03 context switcher is properly integrated
- Verify API endpoint `/api/permissions/current/` is accessible

### "permission: unknown" in 403 errors
- API endpoint using legacy 403 format (not yet migrated)
- api-client will normalize legacy format automatically
```

**Acceptance Criteria**:
- README includes installation, setup, usage, API reference, troubleshooting
- All code examples runnable
- F02/F03 integration documented
- FR-028 satisfied (frontend package README)

---

### T059: Document 403 Format Migration Strategy

**What to Do**:
1. Create `docs/guides/403-migration.md`

2. Structure:

```markdown
# 403 Response Format Migration Guide

## Overview

This guide documents the migration from legacy 403 format to structured format.

### Legacy Format (Before)
```json
{
  "detail": "You do not have permission to perform this action"
}
```

### Structured Format (After)
```json
{
  "error": "forbidden",
  "permission": "organization.view_balance",
  "detail": "You do not have permission: organization.view_balance",
  "scope": "ORGANIZATION"
}
```

## Migration Timeline

**Phase 1 (Completed)**: Backend foundation
- Centralized `evaluate_permission()` function
- ACL enforcement in B11, B16, B17, settings APIs

**Phase 2 (Current)**: 403 standardization
- `/api/permissions/current/` endpoint live
- B11, B16, B17, settings return structured format
- api-client normalizes legacy format (backward compatibility)

**Phase 3 (Future)**: Full migration
- All remaining endpoints migrated to structured format
- Legacy format support deprecated (after 6 months)

## Migrating Your Endpoint

1. Update permission class to raise structured format:
```python
from rest_framework.exceptions import PermissionDenied

class MyView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = "my_feature.view"

    def get(self, request, organization_id):
        # Permission check happens in permission class
        # If denied, raises:
        raise PermissionDenied({
            "error": "forbidden",
            "permission": "my_feature.view",
            "detail": "You do not have permission: my_feature.view",
            "scope": "ORGANIZATION"
        })
```

2. Test with api-client:
```typescript
import { apiFetch } from "@django-core/api-client";

try {
  await apiFetch("/api/my-feature/");
} catch (error) {
  if (error.permission) {
    // Structured format detected
    console.log(`Missing permission: ${error.permission}`);
  } else {
    // Other error
  }
}
```

## Frontend Compatibility

api-client automatically normalizes both formats:
- Structured format: returned as-is
- Legacy format: normalized to `{error: "forbidden", permission: "unknown", detail: "..."}`

No frontend changes required for migration!

## Testing Checklist

- [ ] Endpoint returns structured format on 403
- [ ] Response includes `error`, `permission`, `detail`, `scope` fields
- [ ] Frontend api-client parses response correctly
- [ ] B09 audit event created with permission code
- [ ] No breaking changes for existing clients
```

**Acceptance Criteria**:
- Migration guide documents timeline, migration steps, testing checklist
- Examples for both backend and frontend
- Backward compatibility emphasized
- FR-025 satisfied (migration guide)

---

## Definition of Done

- [ ] quickstart.md guide validated by developer (integration time ≤30 minutes)
- [ ] B08 README updated with evaluate_permission() usage and extension points
- [ ] B09 README updated with B08 integration pattern and audit event schema
- [ ] @django-core/permissions README includes installation, usage, API reference, troubleshooting
- [ ] 403 migration guide documents timeline, migration steps, testing checklist
- [ ] All code examples tested and runnable
- [ ] Documentation reviewed and approved

---

## Risks & Mitigations

**Risk**: Documentation out of sync with implementation
**Mitigation**: Write docs after implementation complete (WP09 after WP01-WP08), include version numbers

**Risk**: Examples don't work in production
**Mitigation**: Test all code examples in dev environment before merging

**Risk**: Migration guide unclear for developers
**Mitigation**: Include concrete examples, checklists, troubleshooting section

---

## Reviewer Guidance

**What to Verify**:
1. quickstart.md validated by at least one developer (confirm <30 min integration)
2. All code examples runnable (test in dev environment)
3. B08 README includes extension points for new permission codes
4. B09 README documents audit event schema accurately
5. Frontend README includes F02/F03 integration notes
6. Migration guide includes timeline, steps, testing checklist

**Manual Validation**:
1. Follow quickstart.md from scratch → Verify integration works in <30 min
2. Run code examples from each README → Verify no errors
3. Check migration guide examples → Verify structured format returned correctly

---

## Next Work Package

After WP09 complete, proceed to **WP10 (Security Review & CI Validation)** for final security testing and deployment readiness.
