# Quickstart: Adding Permission Checks to New Features
*Path: [kitty-specs/026-b08-permissions-acl/quickstart.md](kitty-specs/026-b08-permissions-acl/quickstart.md)*

**Feature**: 026-b08-permissions-acl
**Date**: 2025-12-12
**Audience**: Backend and frontend developers

## Overview

This guide shows you how to add permission checks to new features in the Django Core-App. It covers both backend (Django REST Framework) and frontend (React) integration with the B08 Hierarchical Access Control system.

**Time to complete**: 15-30 minutes

---

## Backend: Adding Permission Checks to DRF Views

### Step 1: Use the Centralized Permission Evaluator

All permission checks MUST go through `evaluate_permission()` in `src/permissions/audit.py`. This ensures audit logging and prevents bypass.

```python
from permissions.audit import evaluate_permission

# In your view or service function
def my_business_logic(user, organization):
    # Check permission before accessing sensitive data
    if not evaluate_permission(
        user=user,
        permission='organization.view_balance',
        resource=organization,
        context={'scope': 'ORGANIZATION', 'organization_id': organization.id}
    ):
        # Permission denied - this is automatically logged to B09
        raise PermissionDenied('You do not have permission to view organization balance.')

    # Permission granted - proceed with business logic
    balance = organization.get_balance()
    return balance
```

**Parameters**:
- `user`: Django User instance (from `request.user`)
- `permission`: Permission code string (e.g., `"organization.view_balance"`)
- `resource`: Optional model instance being accessed (for scoping)
- `context`: Optional dict with `{scope, organization_id, project_id, request_id}`

**Return Value**:
- `True` if permission granted
- `False` if permission denied
- **Side Effect**: Emits B09 audit event (or logs to Django if B09 unavailable)

---

### Step 2: Use DRF Permission Classes (Preferred for API Views)

For Django REST Framework views, use permission classes instead of calling `evaluate_permission()` directly.

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    # Declare required permission
    permission_classes = [HasOrganizationPermission]
    required_permission = 'organization.view_balance'  # Custom attribute

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # Permission already checked by HasOrganizationPermission
        # (calls evaluate_permission() internally)
        balance = organization.get_balance()

        return Response({'balance': balance})
```

**Available Permission Classes**:
- `HasOrganizationPermission`: Checks org-scoped permission
- `HasProjectPermission`: Checks project-scoped permission
- `HasGlobalPermission`: Checks global-scoped permission

**Custom Permission Class**:
```python
from permissions.api.permissions import BaseACLPermission

class MyCustomPermission(BaseACLPermission):
    def has_permission(self, request, view):
        # Extract context from request
        org_id = request.data.get('organization_id')

        # Call centralized evaluator
        return evaluate_permission(
            user=request.user,
            permission='my_resource.action',
            context={'scope': 'ORGANIZATION', 'organization_id': org_id}
        )
```

---

### Step 3: Return Structured 403 Responses

When permission denied, return the standardized 403 format:

```python
from rest_framework.exceptions import PermissionDenied

class OrganizationBalanceView(APIView):
    def get(self, request, organization_id):
        if not has_permission:
            # Structured 403 response
            raise PermissionDenied({
                'error': 'forbidden',
                'permission': 'organization.view_balance',
                'detail': 'You do not have permission to view organization balance.'
            })

        # ... proceed with business logic
```

**403 Response Format**:
```json
{
  "error": "forbidden",
  "permission": "organization.view_balance",
  "detail": "You do not have permission to view organization balance."
}
```

**Important**: Do NOT include sensitive data in `detail` field (user IDs, internal errors, enumeration of all permissions).

---

### Step 4: Define Custom Permission Codes (if needed)

If your feature requires new permission codes, add them to B08 fixtures:

```python
# src/permissions/fixtures/permissions.json
[
  {
    "model": "permissions.permission",
    "pk": 1,
    "fields": {
      "permission_code": "my_resource.view",
      "scope": "ORGANIZATION",
      "role": 2  # Admin role
    }
  },
  {
    "model": "permissions.permission",
    "pk": 2,
    "fields": {
      "permission_code": "my_resource.edit",
      "scope": "PROJECT",
      "role": 2  # Admin role
    }
  }
]
```

**Permission Code Naming Convention**:
- Format: `{resource}.{action}` (lowercase, underscores/dots only)
- Examples: `organization.view`, `project.edit`, `billing.read`, `settings.update`

---

### Step 5: Write Tests

**Unit Test** (permission evaluator logic):
```python
from django.test import TestCase
from permissions.audit import evaluate_permission
from myapp.models import User, Organization

class PermissionEvaluatorTest(TestCase):
    def test_user_with_permission_granted(self):
        user = User.objects.create(username='testuser')
        org = Organization.objects.create(name='Test Org')
        # Assign user to org with Admin role (has organization.view permission)
        user.assign_role('Admin', organization=org)

        result = evaluate_permission(
            user=user,
            permission='organization.view',
            resource=org,
            context={'scope': 'ORGANIZATION', 'organization_id': org.id}
        )

        self.assertTrue(result)

    def test_user_without_permission_denied(self):
        user = User.objects.create(username='testuser')
        org = Organization.objects.create(name='Test Org')
        # User has no role assignment → no permissions

        result = evaluate_permission(
            user=user,
            permission='organization.view',
            resource=org,
            context={'scope': 'ORGANIZATION', 'organization_id': org.id}
        )

        self.assertFalse(result)
```

**Integration Test** (API endpoint):
```python
from rest_framework.test import APITestCase
from rest_framework import status

class OrganizationBalanceAPITest(APITestCase):
    def test_user_with_permission_can_view_balance(self):
        user = self.create_user_with_permission('organization.view_balance')
        org = Organization.objects.create(name='Test Org')

        self.client.force_authenticate(user=user)
        response = self.client.get(f'/api/organizations/{org.id}/balance/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('balance', response.data)

    def test_user_without_permission_receives_403(self):
        user = self.create_user_without_permission()
        org = Organization.objects.create(name='Test Org')

        self.client.force_authenticate(user=user)
        response = self.client.get(f'/api/organizations/{org.id}/balance/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'forbidden')
        self.assertEqual(response.data['permission'], 'organization.view_balance')
```

**Security Test** (explicit bypass attempt):
```python
class SecurityBypassTest(APITestCase):
    def test_user_cannot_access_other_organization_balance(self):
        user = self.create_user_with_org_permission(org_id=1)
        other_org = Organization.objects.create(id=2, name='Other Org')

        self.client.force_authenticate(user=user)
        response = self.client.get(f'/api/organizations/{other_org.id}/balance/')

        # Should be denied even if user has permission in their own org
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

---

## Frontend: Using the Permissions Package

### Step 1: Wrap Your App with PermissionsProvider

```tsx
// App.tsx
import { PermissionsProvider } from '@django-core/permissions';
import { AuthProvider } from '@django-core/auth';  // F02
import { ContextSwitcher } from '@django-core/context-switcher';  // F03

function App() {
  return (
    <AuthProvider>
      <ContextSwitcher>
        <PermissionsProvider cacheTTL={5 * 60 * 1000}>
          <YourAppContent />
        </PermissionsProvider>
      </ContextSwitcher>
    </AuthProvider>
  );
}
```

**Props**:
- `cacheTTL` (optional): Cache duration in milliseconds (default: 5 minutes)
- `apiEndpoint` (optional): Override API endpoint (default: `/api/permissions/current/`)

**Integration**: `PermissionsProvider` automatically integrates with F02 (`currentUser`) and F03 (`currentOrg`, `currentProject`).

---

### Step 2: Use PermissionGate Component for Conditional Rendering

**Hide Mode (default)** - Remove from DOM if permission denied:
```tsx
import { PermissionGate } from '@django-core/permissions';

function OrganizationDashboard({ organizationId }) {
  return (
    <div>
      <h1>Organization Dashboard</h1>

      {/* Only render if user has permission */}
      <PermissionGate permission="organization.view_balance">
        <BalanceWidget organizationId={organizationId} />
      </PermissionGate>

      {/* With fallback message */}
      <PermissionGate
        permission="billing.read"
        fallback={<div>Contact admin for billing access</div>}
      >
        <BillingSection />
      </PermissionGate>
    </div>
  );
}
```

**Disable Mode** - Keep visible but disable interaction:
```tsx
<PermissionGate permission="project.edit" mode="disable">
  <Button>Edit Project</Button>
</PermissionGate>

// If permission denied, renders:
// <Button disabled>Edit Project</Button>
```

**Props**:
- `permission` (required): Permission code string
- `mode` (optional): `"hide"` (default) or `"disable"`
- `fallback` (optional): Content to show when permission denied (hide mode only)
- `loading` (optional): Content to show during permission fetch (hide mode only)
- `scope` (optional): Override context `{organizationId?, projectId?}`

---

### Step 3: Use usePermissions Hook for Imperative Checks

```tsx
import { usePermissions } from '@django-core/permissions';

function MyComponent() {
  const { loading, error, hasPermission, refetchPermissions } = usePermissions();

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage>Failed to load permissions</ErrorMessage>;
  }

  const handleAction = () => {
    if (!hasPermission('project.edit')) {
      alert('You do not have permission to edit this project');
      return;
    }

    // Proceed with action
    saveProject();
  };

  return (
    <div>
      <button onClick={handleAction}>Save Project</button>
      <button onClick={refetchPermissions}>Refresh Permissions</button>
    </div>
  );
}
```

**usePermissions Return Value**:
- `loading` (boolean): True during initial fetch or refetch
- `error` (Error | null): Fetch error (null if no error)
- `permissions` (PermissionData | null): Hierarchical permission data
- `hasPermission(code, options?)` (function): Check if user has permission
- `refetchPermissions()` (function): Manually refresh permissions (invalidates cache)

**hasPermission Options**:
```tsx
// Use current context from F03
hasPermission('project.view');

// Override context
hasPermission('project.view', { projectId: '101' });

// Check organization-scoped permission
hasPermission('organization.view', { organizationId: '42' });

// Check global permission
hasPermission('system.read_audit');  // No scope needed
```

---

### Step 4: Use checkPermission Utility (without React Context)

For non-React code or when you already have permission data:

```tsx
import { checkPermission } from '@django-core/permissions';

// In a service function or utility
function canEditProject(permissions: PermissionData, projectId: string): boolean {
  return checkPermission(permissions, 'project.edit', { projectId });
}

// Usage
const permissions = await fetchPermissions();
if (canEditProject(permissions, '101')) {
  // Proceed with edit
}
```

**Function Signature**:
```typescript
function checkPermission(
  permissions: PermissionData,
  permission: string,
  options?: { organizationId?: string; projectId?: string }
): boolean
```

---

### Step 5: Handle Permission Errors from API Calls

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
    // api-client normalizes 403 errors to structured format
    if (error.error === 'forbidden') {
      console.error(`Missing permission: ${error.permission}`);
      alert(`Access denied: ${error.detail}`);
      return;
    }

    // Handle other errors
    throw error;
  }
}
```

**ForbiddenError Structure** (normalized by api-client):
```typescript
{
  error: 'forbidden',
  permission: 'organization.edit',
  detail: 'You do not have permission to edit this organization.'
}
```

---

### Step 6: Write Tests

**Component Test** (PermissionGate):
```tsx
import { render, screen } from '@testing-library/react';
import { PermissionsProvider } from '@django-core/permissions';
import { MyComponent } from './MyComponent';

test('renders content when permission granted', async () => {
  // Mock permissions API
  mockFetch('/api/permissions/current/', {
    global: [],
    organization: { '42': ['organization.view'] },
    project: {}
  });

  render(
    <PermissionsProvider>
      <MyComponent />
    </PermissionsProvider>
  );

  // Wait for permission check
  await screen.findByText('Organization Details');

  expect(screen.getByText('Organization Details')).toBeInTheDocument();
});

test('hides content when permission denied', async () => {
  mockFetch('/api/permissions/current/', {
    global: [],
    organization: {},
    project: {}
  });

  render(
    <PermissionsProvider>
      <MyComponent />
    </PermissionsProvider>
  );

  await waitFor(() => {
    expect(screen.queryByText('Organization Details')).not.toBeInTheDocument();
  });
});
```

**Hook Test** (usePermissions):
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '@django-core/permissions';

test('hasPermission resolves with fallback hierarchy', async () => {
  mockFetch('/api/permissions/current/', {
    global: ['system.read'],
    organization: { '42': ['organization.view'] },
    project: { '101': ['project.edit'] }
  });

  const { result } = renderHook(() => usePermissions());

  await waitFor(() => expect(result.current.loading).toBe(false));

  // Project-scoped permission (most specific)
  expect(result.current.hasPermission('project.edit', { projectId: '101' })).toBe(true);

  // Organization-scoped permission (fallback)
  expect(result.current.hasPermission('organization.view', { organizationId: '42' })).toBe(true);

  // Global permission (least specific)
  expect(result.current.hasPermission('system.read')).toBe(true);

  // Denied (not in any scope)
  expect(result.current.hasPermission('billing.read')).toBe(false);
});
```

---

## Common Patterns

### Pattern 1: Conditional UI Based on Multiple Permissions

```tsx
function ProjectActions({ projectId }) {
  const { hasPermission } = usePermissions();

  const canView = hasPermission('project.view', { projectId });
  const canEdit = hasPermission('project.edit', { projectId });
  const canDelete = hasPermission('project.delete', { projectId });

  if (!canView) {
    return null;  // Hide entire component
  }

  return (
    <div>
      <button onClick={viewProject}>View</button>
      {canEdit && <button onClick={editProject}>Edit</button>}
      {canDelete && <button onClick={deleteProject}>Delete</button>}
    </div>
  );
}
```

---

### Pattern 2: Permission-Based Navigation Guard

```tsx
import { usePermissions } from '@django-core/permissions';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ permission, children }) {
  const { loading, hasPermission } = usePermissions();

  if (loading) {
    return <Spinner />;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/access-denied" />;
  }

  return children;
}

// Usage
<Route path="/admin" element={
  <ProtectedRoute permission="system.admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

---

### Pattern 3: Form Field Conditional Disable

```tsx
function ProjectForm({ projectId }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('project.edit', { projectId });

  return (
    <form>
      <input type="text" disabled={!canEdit} />
      <textarea disabled={!canEdit} />
      <button type="submit" disabled={!canEdit}>Save</button>
    </form>
  );
}
```

---

## Troubleshooting

### Issue: Permission checks always return false

**Cause**: User not authenticated or PermissionsProvider not wrapping app

**Solution**: Verify AuthProvider (F02) is parent of PermissionsProvider, check browser console for API errors

---

### Issue: Permissions not updating after role change

**Cause**: Cache not invalidated after permission change

**Solution**: Call `refetchPermissions()` manually, or reduce `cacheTTL` prop on PermissionsProvider

---

### Issue: 403 errors don't include permission field

**Cause**: Endpoint not yet migrated to new 403 format

**Solution**: api-client normalizer handles both formats, permission will be "unknown" for legacy responses

---

## Next Steps

- **Backend**: Read B08 module README (`src/permissions/README.md`) for advanced patterns
- **Frontend**: Read `@django-core/permissions` package README (`packages/permissions/README.md`) for API reference
- **Testing**: Review security test suite (`tests/security/`) for bypass-attempt examples
- **Audit Logging**: Read B09 module README (`src/audit/README.md`) for querying audit events

---

## References

- **Specification**: [spec.md](spec.md)
- **Data Model**: [data-model.md](data-model.md)
- **Research**: [research.md](research.md)
- **API Contracts**: [contracts/](contracts/) directory
