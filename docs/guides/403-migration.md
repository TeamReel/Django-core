# 403 Response Format Migration Guide

## Overview

This guide documents the migration from legacy 403 format to structured format for permission-denied responses. The structured format enables better error handling, user messaging, and permission request workflows.

## Format Comparison

### Legacy Format (Before Migration)

```json
{
  "detail": "You do not have permission to perform this action"
}
```

**Limitations**:
- ❌ No machine-readable permission code
- ❌ No scope information
- ❌ Generic error message
- ❌ Difficult to build permission request workflows
- ❌ Hard to distinguish from other 403 errors

### Structured Format (After Migration)

```json
{
  "error": "forbidden",
  "permission": "organization.view_balance",
  "detail": "You do not have permission to view this organization's balance",
  "scope": "ORGANIZATION"
}
```

**Benefits**:
- ✅ Machine-readable `permission` code
- ✅ Explicit `scope` information
- ✅ Specific `detail` message
- ✅ Enables permission request UI
- ✅ Better debugging and logging
- ✅ Consistent error format

## Migration Timeline

### Phase 1: Backend Foundation (Completed)

**Status**: ✅ Complete

**Deliverables**:
- Centralized `evaluate_permission()` function in B08
- ACL enforcement across core modules
- Permission code registry
- Audit logging integration (B09)

**Affected Modules**:
- B08: Permissions & ACL
- B09: Audit Logging
- B11: Organisations
- B16: Projects
- B17: Settings

### Phase 2: 403 Standardization (Current)

**Status**: 🚧 In Progress

**Deliverables**:
- `/api/permissions/current/` endpoint (✅ complete)
- Structured 403 responses in B11, B16, B17, settings (✅ complete)
- Frontend api-client normalizer for backward compatibility (✅ complete)
- Frontend PermissionsProvider integration (✅ complete)

**Backward Compatibility**:
- `@django-core/api-client` automatically normalizes legacy format
- Existing clients continue to work without changes
- Legacy format supported during transition period

### Phase 3: Full Migration (Future)

**Status**: ⏳ Planned

**Timeline**: 6-12 months after Phase 2 completion

**Deliverables**:
- All remaining endpoints migrated to structured format
- Legacy format support deprecated (with 6-month notice)
- Remove legacy format handling from api-client

## Migrating Your Endpoint

### Step 1: Use DRF Permission Classes (Recommended)

The easiest way to adopt structured 403 responses is to use B08's permission classes:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = 'organization.view_balance'  # Custom attribute

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # Permission automatically checked by HasOrganizationPermission
        # Returns structured 403 if denied
        balance = organization.get_balance()

        return Response({'balance': balance})
```

**Automatic Benefits**:
- ✅ Structured 403 responses
- ✅ Audit logging (B09 integration)
- ✅ Consistent permission evaluation
- ✅ No manual error handling

### Step 2: Manual Permission Checks (Alternative)

If you need custom permission logic, use `evaluate_permission()` directly:

```python
from permissions.audit import evaluate_permission
from rest_framework.exceptions import PermissionDenied

class MyCustomView(APIView):
    def post(self, request):
        # Extract context from request
        org_id = request.data.get('organization_id')

        # Check permission with audit logging
        granted = evaluate_permission(
            user=request.user,
            permission='my_resource.create',
            context={
                'scope': 'ORGANIZATION',
                'organization_id': org_id,
                'request_id': request.META.get('HTTP_X_REQUEST_ID')
            }
        )

        if not granted:
            # Raise structured 403 error
            raise PermissionDenied({
                'error': 'forbidden',
                'permission': 'my_resource.create',
                'detail': 'You do not have permission to create this resource',
                'scope': 'ORGANIZATION'
            })

        # Permission granted - proceed with business logic
        resource = create_resource(request.data)
        return Response(serialize_resource(resource), status=201)
```

**Required Fields**:
- `error` (string): Always `"forbidden"`
- `permission` (string): Permission code (e.g., `"organization.view_balance"`)
- `detail` (string): Human-readable error message
- `scope` (string, optional): `"GLOBAL"`, `"ORGANIZATION"`, or `"PROJECT"`

### Step 3: Test the Migration

#### Backend Test (DRF Test Client)

```python
from rest_framework.test import APITestCase
from rest_framework import status

class StructuredForbiddenTest(APITestCase):
    def test_structured_403_response(self):
        # User without permission
        user = self.create_user_without_permission()
        self.client.force_authenticate(user=user)

        # Make request to protected endpoint
        response = self.client.get('/api/organizations/123/balance/')

        # Verify structured 403 format
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'forbidden')
        self.assertEqual(response.data['permission'], 'organization.view_balance')
        self.assertIn('detail', response.data)
        self.assertIn('scope', response.data)

        # Verify permission code is specific (not generic)
        self.assertNotEqual(response.data['permission'], 'unknown')
```

#### Frontend Test (api-client Integration)

```typescript
import { apiFetch } from '@django-core/api-client';

test('api-client normalizes structured 403 format', async () => {
  // Mock backend returning structured 403
  mockFetch('/api/organizations/123/balance/', {
    status: 403,
    body: {
      error: 'forbidden',
      permission: 'organization.view_balance',
      detail: 'You do not have permission to view organization balance',
      scope: 'ORGANIZATION'
    }
  });

  try {
    await apiFetch('/api/organizations/123/balance/');
    fail('Expected error to be thrown');
  } catch (error) {
    // Verify normalized error structure
    expect(error.error).toBe('forbidden');
    expect(error.permission).toBe('organization.view_balance');
    expect(error.detail).toBeDefined();
    expect(error.scope).toBe('ORGANIZATION');
  }
});
```

### Step 4: Update Frontend Error Handling (Optional)

Once your endpoint returns structured format, you can enhance frontend error messages:

```tsx
import { apiFetch } from '@django-core/api-client';

async function saveOrganization(orgId: string, data: any) {
  try {
    const response = await apiFetch(`/api/organizations/${orgId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return response.data;
  } catch (error) {
    // Check if permission error
    if (error.error === 'forbidden') {
      // Structured format available!
      const permissionCode = error.permission; // e.g., "organization.edit"
      const scopeLevel = error.scope; // e.g., "ORGANIZATION"

      // Show specific error with permission request link
      toast.error(
        `Missing permission: ${permissionCode}`,
        <a href="/permissions/request">Request Access</a>
      );
      return;
    }

    // Handle other errors
    throw error;
  }
}
```

## Frontend Compatibility

### Automatic Normalization

`@django-core/api-client` automatically normalizes both legacy and structured formats:

**Structured Format** (backend already migrated):
```json
{
  "error": "forbidden",
  "permission": "organization.view_balance",
  "detail": "You do not have permission to view this organization's balance",
  "scope": "ORGANIZATION"
}
```

**Legacy Format** (backend not yet migrated):
```json
{
  "detail": "You do not have permission to perform this action"
}
```

**Normalized Result** (what frontend receives):
```typescript
// Both formats normalized to:
{
  error: 'forbidden',
  permission: 'organization.view_balance', // or 'unknown' for legacy
  detail: '...',
  scope: 'ORGANIZATION' // or undefined for legacy
}
```

### No Frontend Changes Required

**During migration period, no frontend code changes are needed.** The api-client normalizer handles both formats transparently.

**Example** (works with both formats):
```typescript
try {
  await apiFetch('/api/organizations/123/balance/');
} catch (error) {
  if (error.error === 'forbidden') {
    // This works regardless of backend format
    console.log(`Missing permission: ${error.permission}`);
    // Will log "unknown" for legacy format
  }
}
```

## Testing Checklist

Use this checklist when migrating your endpoint:

- [ ] **Backend returns structured format**
  - [ ] Response includes `error`, `permission`, `detail` fields
  - [ ] `permission` field contains specific permission code (not "unknown")
  - [ ] `scope` field included if permission is scoped
  - [ ] `detail` message is specific and helpful (not generic)

- [ ] **Permission check uses evaluate_permission()**
  - [ ] Calls `evaluate_permission()` from `permissions.audit`
  - [ ] Includes `context` dict with scope and resource IDs
  - [ ] Logs to B09 audit system (not just Django logging)

- [ ] **Frontend api-client parses correctly**
  - [ ] 403 error thrown by api-client
  - [ ] Error object has `error`, `permission`, `detail`, `scope` fields
  - [ ] Permission code is specific (not "unknown")

- [ ] **Audit event created**
  - [ ] B09 audit event created with `event_type="permission.denied"`
  - [ ] Event metadata includes permission code, user ID, resource ID
  - [ ] Event queryable via Django admin (Audit → Audit Events)

- [ ] **No breaking changes**
  - [ ] Existing API clients continue to work
  - [ ] Frontend normalizer handles response correctly
  - [ ] Legacy format handling tested (if applicable)

## Example Migrations

### Before (Legacy Format)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

class OrganizationBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # Manual permission check (no audit logging)
        if not request.user.can_view_organization(organization):
            # ❌ Legacy format
            raise PermissionDenied('You do not have permission to perform this action')

        balance = organization.get_balance()
        return Response({'balance': balance})
```

**Issues**:
- ❌ No audit logging
- ❌ Generic error message
- ❌ No permission code
- ❌ Manual permission logic (not centralized)

### After (Structured Format with DRF Permission Class)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = 'organization.view_balance'

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # ✅ Permission automatically checked
        # ✅ Audit logged to B09
        # ✅ Structured 403 if denied
        balance = organization.get_balance()
        return Response({'balance': balance})
```

**Benefits**:
- ✅ Automatic audit logging
- ✅ Structured 403 response
- ✅ Specific permission code
- ✅ Centralized permission evaluation
- ✅ Less code

### After (Structured Format with Manual Check)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from permissions.audit import evaluate_permission

class OrganizationBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # ✅ Centralized permission check with audit logging
        if not evaluate_permission(
            user=request.user,
            permission='organization.view_balance',
            context={'scope': 'ORGANIZATION', 'organization_id': organization_id}
        ):
            # ✅ Structured 403 format
            raise PermissionDenied({
                'error': 'forbidden',
                'permission': 'organization.view_balance',
                'detail': 'You do not have permission to view this organization\'s balance',
                'scope': 'ORGANIZATION'
            })

        balance = organization.get_balance()
        return Response({'balance': balance})
```

**Benefits**:
- ✅ Automatic audit logging
- ✅ Structured 403 response
- ✅ Specific permission code
- ✅ Centralized permission evaluation
- ✅ Custom permission logic (if needed)

## Common Migration Patterns

### Pattern 1: Simple Object Permission

**Before**:
```python
if not request.user.can_view_project(project):
    raise PermissionDenied()
```

**After**:
```python
if not evaluate_permission(
    user=request.user,
    permission='projects.view',
    context={'scope': 'PROJECT', 'project_id': project.id}
):
    raise PermissionDenied({
        'error': 'forbidden',
        'permission': 'projects.view',
        'detail': 'You do not have permission to view this project',
        'scope': 'PROJECT'
    })
```

### Pattern 2: Organization-Scoped Resource

**Before**:
```python
if not request.user.is_org_admin(organization):
    raise PermissionDenied('Admin access required')
```

**After**:
```python
if not evaluate_permission(
    user=request.user,
    permission='organization.manage',
    context={'scope': 'ORGANIZATION', 'organization_id': organization.id}
):
    raise PermissionDenied({
        'error': 'forbidden',
        'permission': 'organization.manage',
        'detail': 'You do not have permission to manage this organization',
        'scope': 'ORGANIZATION'
    })
```

### Pattern 3: Global System Permission

**Before**:
```python
if not request.user.is_superuser:
    raise PermissionDenied('System admin access required')
```

**After**:
```python
if not evaluate_permission(
    user=request.user,
    permission='system.admin',
    context={'scope': 'GLOBAL'}
):
    raise PermissionDenied({
        'error': 'forbidden',
        'permission': 'system.admin',
        'detail': 'You do not have permission to access system administration',
        'scope': 'GLOBAL'
    })
```

## Rollback Strategy

If you need to rollback a migrated endpoint:

1. **Keep old permission check code**: Comment out instead of deleting during initial migration
2. **Switch permission class**: Replace `HasOrganizationPermission` with `IsAuthenticated`
3. **Revert error format**: Change `PermissionDenied({...})` back to `PermissionDenied('...')`
4. **Test legacy clients**: Verify existing API clients still work

**Example Rollback**:
```python
# Rollback: Comment out new code, uncomment old code
class OrganizationBalanceView(APIView):
    # NEW (structured)
    # permission_classes = [HasOrganizationPermission]
    # required_permission = 'organization.view_balance'

    # OLD (legacy)
    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # OLD (legacy check)
        if not request.user.can_view_organization(organization):
            raise PermissionDenied('You do not have permission to perform this action')

        # NEW (structured check) - commented for rollback
        # if not evaluate_permission(...):
        #     raise PermissionDenied({...})

        balance = organization.get_balance()
        return Response({'balance': balance})
```

## FAQ

### Q: Do I need to update my frontend code after migrating the backend?

**A**: No. The `@django-core/api-client` normalizer handles both legacy and structured formats automatically. You only need to update frontend code if you want to take advantage of new features (permission request workflows, specific error messages, etc.).

### Q: What if my endpoint uses custom permission logic that doesn't fit B08?

**A**: You can still use `evaluate_permission()` for audit logging and then add custom logic on top. Just make sure to raise `PermissionDenied({...})` with the structured format.

### Q: Can I migrate endpoints incrementally?

**A**: Yes! The migration is designed to be incremental. Migrate high-traffic or security-critical endpoints first, then gradually migrate others.

### Q: What happens if B09 (audit system) is unavailable?

**A**: Permission checks continue to work. B08 gracefully degrades to Django logging if B09 is unavailable. No permission checks are blocked by audit failures.

### Q: How do I know which permission code to use?

**A**: Check the B08 permission registry:
```python
from permissions.registry import permission_registry
all_permissions = permission_registry.all()
```

Or see the B08 README for standard permission codes.

### Q: What if I need a new permission code?

**A**: Register it in your app's `AppConfig.ready()` method:
```python
from permissions.registry import permission_registry

class MyAppConfig(AppConfig):
    def ready(self):
        permission_registry.register(
            permission='my_resource.action',
            resource_type='my_resource',
            description='Action on my resource',
            is_sensitive=False
        )
```

## Support

For questions about the migration:

- **Backend**: See B08 module README (`src/permissions/README.md`)
- **Frontend**: See `@django-core/permissions` package README
- **API Reference**: See `/docs/features/B08-permissions-acl-refactor.md`
- **Examples**: See quickstart guide (`kitty-specs/026-b08-permissions-acl/quickstart.md`)

## Related Documentation

- [B08 Permissions & ACL README](../../src/permissions/README.md)
- [B09 Audit Logging README](../../src/audit/README.md)
- [@django-core/permissions Package README](../../packages/permissions/README.md)
- [Quickstart Guide](../../kitty-specs/026-b08-permissions-acl/quickstart.md)
