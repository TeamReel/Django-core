# @django-core/permissions

Frontend permissions package for the django-core platform. Provides React components, hooks, and utilities for hierarchical permission checking integrated with the multi-tenancy context switcher.

## Features

- ✅ **Hierarchical Permissions**: Global → Organization → Project resolution
- ✅ **React Integration**: Provider, hooks, and declarative components
- ✅ **Multi-Tenancy Support**: Automatic integration with F02 (auth) and F03 (context-switcher)
- ✅ **Hybrid Caching**: 5-minute TTL per context with automatic refresh
- ✅ **Fail-Closed Security**: Safe defaults when permissions are unavailable
- ✅ **TypeScript**: Full type safety with comprehensive type definitions
- ✅ **Framework-Agnostic Utilities**: Pure functions for use outside React

## Installation

```bash
pnpm add @django-core/permissions
```

### Peer Dependencies

```json
{
  "@django-core/api-client": "workspace:*",
  "@django-core/auth-ui": "workspace:*",
  "@django-core/context-switcher": "workspace:*",
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```

## Quick Start

### 1. Wrap Your App with PermissionsProvider

```tsx
import { AuthProvider } from '@django-core/auth-ui';
import { ContextProvider } from '@django-core/context-switcher';
import { PermissionsProvider } from '@django-core/permissions';

function App() {
  return (
    <AuthProvider>
      <ContextProvider>
        <PermissionsProvider>
          <YourApp />
        </PermissionsProvider>
      </ContextProvider>
    </AuthProvider>
  );
}
```

### 2. Use PermissionGate for Declarative Checks

```tsx
import { PermissionGate } from '@django-core/permissions';

function ProjectActions() {
  return (
    <>
      {/* Hide button if permission denied */}
      <PermissionGate permission="projects.edit">
        <button>Edit Project</button>
      </PermissionGate>

      {/* Disable button if permission denied */}
      <PermissionGate permission="projects.delete" mode="disable">
        <button>Delete Project</button>
      </PermissionGate>

      {/* Show fallback if permission denied */}
      <PermissionGate
        permission="projects.publish"
        fallback={<span>View Only</span>}
      >
        <button>Publish Project</button>
      </PermissionGate>
    </>
  );
}
```

### 3. Use usePermissions Hook for Imperative Checks

```tsx
import { usePermissions } from '@django-core/permissions';

function MyComponent() {
  const { hasPermission, isLoading, error } = usePermissions();

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  const canEdit = hasPermission('projects.edit');
  const canDelete = hasPermission('projects.delete');

  return (
    <div>
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

## API Reference

### Types

#### `PermissionCode`

```typescript
type PermissionCode = string;
```

Permission identifier (e.g., `"projects.edit"`, `"org.view"`).

#### `PermissionScope`

```typescript
type PermissionScope = 'GLOBAL' | 'ORGANIZATION' | 'PROJECT';
```

Scope where permission is granted.

#### `PermissionMap`

```typescript
interface PermissionMap {
  global: PermissionCode[];
  organizations: Record<string, OrganizationPermissions>;
}

interface OrganizationPermissions {
  name: string;
  permissions: PermissionCode[];
  projects: Record<string, ProjectPermissions>;
}

interface ProjectPermissions {
  name: string;
  permissions: PermissionCode[];
}
```

Hierarchical permissions structure returned by `/api/v1/permissions/current/`.

#### `CheckPermissionOptions`

```typescript
interface CheckPermissionOptions {
  organizationId?: string;
  projectId?: string;
}
```

Options for checking permissions in specific context.

### Components

#### `<PermissionsProvider>`

Provider component that fetches and caches permissions.

**Props:**

- `children: ReactNode` - Child components
- `cacheTTL?: number` - Cache TTL in milliseconds (default: 300000 = 5 minutes)

**Example:**

```tsx
<PermissionsProvider cacheTTL={10 * 60 * 1000}>
  <App />
</PermissionsProvider>
```

#### `<PermissionGate>`

Declarative component for permission-based rendering.

**Props:**

- `permission: PermissionCode | PermissionCode[]` - Permission(s) to check
- `mode?: 'hide' | 'disable'` - How to handle denied permissions (default: `'hide'`)
- `fallback?: ReactNode` - Fallback content when permission denied (hide mode only)
- `children: ReactNode` - Content to render when permission granted
- `organizationId?: string` - Explicit organization context
- `projectId?: string` - Explicit project context
- `loadingComponent?: ReactNode` - Component to show while loading

**Examples:**

```tsx
// Hide mode (default)
<PermissionGate permission="projects.edit">
  <EditButton />
</PermissionGate>

// Disable mode
<PermissionGate permission="projects.delete" mode="disable">
  <button>Delete</button>
</PermissionGate>

// Multiple permissions (AND logic)
<PermissionGate permission={['projects.edit', 'projects.publish']}>
  <PublishButton />
</PermissionGate>

// Explicit context
<PermissionGate
  permission="org.edit"
  organizationId="org-123"
>
  <OrgSettings />
</PermissionGate>

// With fallback
<PermissionGate
  permission="projects.admin"
  fallback={<ViewOnlyBadge />}
>
  <AdminPanel />
</PermissionGate>

// With loading state
<PermissionGate
  permission="projects.edit"
  loadingComponent={<Spinner />}
>
  <EditButton />
</PermissionGate>
```

### Hooks

#### `usePermissions()`

Hook to access permissions context.

**Returns:**

```typescript
{
  permissions: PermissionMap | null;
  isLoading: boolean;
  error: Error | null;
  hasPermission: (code: PermissionCode, options?: CheckPermissionOptions) => boolean;
  refetchPermissions: () => Promise<void>;
}
```

**Example:**

```tsx
function MyComponent() {
  const {
    permissions,
    isLoading,
    error,
    hasPermission,
    refetchPermissions,
  } = usePermissions();

  // Check permission in current context
  const canEdit = hasPermission('projects.edit');

  // Check permission in explicit context
  const canEditOther = hasPermission('projects.edit', {
    organizationId: 'org-123',
    projectId: 'proj-456',
  });

  // Manual refresh
  const handleRefresh = async () => {
    await refetchPermissions();
  };

  return (
    <div>
      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {canEdit && <EditButton />}
      <button onClick={handleRefresh}>Refresh Permissions</button>
    </div>
  );
}
```

**Fail-Closed Behavior:**

If used outside `<PermissionsProvider>`, returns safe defaults:

- `permissions: null`
- `isLoading: false`
- `error: null`
- `hasPermission: () => false` (denies all permissions)
- `refetchPermissions: () => Promise<void>` (no-op)

### Utilities

#### `checkPermission()`

Pure utility for checking a single permission.

```typescript
function checkPermission(
  permissions: PermissionMap | null,
  code: PermissionCode,
  options?: CheckPermissionOptions
): boolean
```

**Resolution Order:**

1. **PROJECT** - If `organizationId` and `projectId` provided, check project permissions
2. **ORGANIZATION** - If `organizationId` provided, check organization permissions
3. **GLOBAL** - Check global permissions

**Example:**

```typescript
import { checkPermission } from '@django-core/permissions';

const permissions = {
  global: ['system.view'],
  organizations: {
    'org-123': {
      name: 'Acme Corp',
      permissions: ['org.edit'],
      projects: {
        'proj-456': {
          name: 'Project Alpha',
          permissions: ['projects.edit'],
        },
      },
    },
  },
};

// Check global permission
checkPermission(permissions, 'system.view'); // true

// Check organization permission
checkPermission(permissions, 'org.edit', {
  organizationId: 'org-123',
}); // true

// Check project permission
checkPermission(permissions, 'projects.edit', {
  organizationId: 'org-123',
  projectId: 'proj-456',
}); // true

// Hierarchical fallback
checkPermission(permissions, 'org.edit', {
  organizationId: 'org-123',
  projectId: 'proj-456',
}); // true (falls back to org level)
```

#### `checkAllPermissions()`

Check if ALL permissions are granted (AND logic).

```typescript
function checkAllPermissions(
  permissions: PermissionMap | null,
  codes: PermissionCode[],
  options?: CheckPermissionOptions
): boolean
```

**Example:**

```typescript
// All must be granted
checkAllPermissions(permissions, ['projects.edit', 'projects.view'], {
  organizationId: 'org-123',
  projectId: 'proj-456',
}); // true only if both granted
```

#### `checkAnyPermission()`

Check if ANY permission is granted (OR logic).

```typescript
function checkAnyPermission(
  permissions: PermissionMap | null,
  codes: PermissionCode[],
  options?: CheckPermissionOptions
): boolean
```

**Example:**

```typescript
// At least one must be granted
checkAnyPermission(permissions, ['projects.edit', 'projects.admin'], {
  organizationId: 'org-123',
  projectId: 'proj-456',
}); // true if either granted
```

## Caching Strategy

The package implements a hybrid caching strategy:

### Cache Key Format

```
${userId}:${organizationId || 'none'}:${projectId || 'none'}
```

### Cache Behavior

1. **Initial Load**: Fetch from `/api/v1/permissions/current/`
2. **Within TTL (5 min)**: Reuse cached permissions
3. **After TTL**: Refetch on next access
4. **Context Switch to NEW context**: Immediate fetch
5. **Context Switch to RECENT context (within TTL)**: Reuse cache
6. **Manual Refresh**: Call `refetchPermissions()` to force refetch

### Cache Invalidation

- Cache is automatically invalidated when:
  - User changes (logout/login)
  - Organization context switches
  - Project context switches
  - TTL expires
- Manual invalidation: `refetchPermissions()`

## Backend Integration

### API Endpoint

```
GET /api/v1/permissions/current/
```

**Response:**

```json
{
  "global": ["system.view"],
  "organizations": {
    "org-123": {
      "name": "Acme Corp",
      "permissions": ["org.view", "org.edit"],
      "projects": {
        "proj-456": {
          "name": "Project Alpha",
          "permissions": ["projects.view", "projects.edit"]
        }
      }
    }
  }
}
```

### Structured 403 Responses

When a backend endpoint returns 403, it should include:

```json
{
  "error": "permission_denied",
  "permission": "projects.delete",
  "detail": "You do not have permission to delete this project.",
  "scope": "PROJECT"
}
```

Frontend can use this to:

- Show specific error messages
- Guide users to request access
- Provide links to documentation

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

### Coverage Threshold

- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 85%
- **Statements**: 85%

### Testing Example

```tsx
import { render, screen } from '@testing-library/react';
import { PermissionsProvider, PermissionGate } from '@django-core/permissions';

test('should show edit button when permission granted', async () => {
  render(
    <PermissionsProvider>
      <PermissionGate permission="projects.edit">
        <button>Edit</button>
      </PermissionGate>
    </PermissionsProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});
```

## Development

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
pnpm format
```

## Architecture

### Package Dependencies

```
@django-core/permissions
├── @django-core/api-client (HTTP/CSRF)
├── @django-core/auth-ui (F02 - user context)
└── @django-core/context-switcher (F03 - org/project context)
```

### Component Hierarchy

```
<PermissionsProvider>
  └── [Fetches permissions via api-client]
  └── [Integrates with F02 useAuth()]
  └── [Integrates with F03 useContext()]
  └── [Provides PermissionsContext]
      └── <YourApp>
          └── usePermissions() hook
          └── <PermissionGate> component
```

### Data Flow

1. User logs in (F02 AuthProvider)
2. User selects organization/project (F03 ContextProvider)
3. PermissionsProvider fetches permissions from backend
4. Permissions cached with key: `${userId}:${orgId}:${projectId}`
5. Components use `usePermissions()` or `<PermissionGate>` to check
6. On context switch, provider checks cache or refetches

## Security Considerations

### Fail-Closed Design

- **Hook outside provider**: Returns `hasPermission: () => false`
- **Null permissions**: All checks return `false`
- **Empty permission array**: Treated as no permissions
- **API error**: Permissions cleared, all checks return `false`
- **Network failure**: Error state set, all checks return `false`

### Frontend vs Backend Permissions

**Frontend permissions are for UX only.** Always enforce permissions on the backend:

- ✅ Use `<PermissionGate>` to hide UI elements
- ✅ Use `hasPermission()` to disable buttons
- ❌ **Never** rely on frontend checks for security
- ✅ Backend must validate permissions on every request
- ✅ Backend returns 403 with structured error

## Troubleshooting

### "Hook used outside PermissionsProvider"

**Cause**: `usePermissions()` called without `<PermissionsProvider>` ancestor.

**Solution**: Wrap your app:

```tsx
<PermissionsProvider>
  <App />
</PermissionsProvider>
```

### Permissions Not Updating After Context Switch

**Cause**: Cache TTL hasn't expired yet.

**Solution**: Call `refetchPermissions()`:

```tsx
const { refetchPermissions } = usePermissions();
await refetchPermissions();
```

### Permission Checks Always Return False

**Possible Causes:**

1. **Not authenticated**: Check F02 `useAuth()` returns `user`
2. **Wrong context**: Verify F03 context matches permission scope
3. **Backend not returning permissions**: Check API response
4. **Cache cleared**: Permissions refetch on mount

**Debug:**

```tsx
const { permissions, error } = usePermissions();
console.log('Permissions:', permissions);
console.log('Error:', error);
```

### TypeScript Errors

**Cause**: Missing peer dependencies or `@types/*` packages.

**Solution**:

```bash
pnpm add -D @types/react @types/react-dom @types/node
```

## Contributing

### Code Style

- Follow TypeScript strict mode
- Use functional components (React.FC)
- Prefer hooks over class components
- Write comprehensive JSDoc comments
- Include usage examples in docs

### Testing Requirements

- Unit tests for all utilities
- Integration tests for components
- 85% code coverage minimum
- Test fail-closed behavior
- Test cache behavior

### Review Checklist

- [ ] All tests passing
- [ ] Coverage ≥85%
- [ ] TypeScript errors resolved
- [ ] ESLint warnings fixed
- [ ] Documentation updated
- [ ] Examples provided

## License

Proprietary - django-core platform

## Related Packages

- [@django-core/auth-ui](../auth) - Authentication and user context (F02)
- [@django-core/context-switcher](../context-switcher) - Multi-tenancy context (F03)
- [@django-core/api-client](../api-client) - CSRF-protected fetch wrapper
- [@django-core/design-system](../design-system) - UI components (F01)

## Support

For issues and questions:

- Backend permissions: See `src/django_core/apps/authorization/` module
- Frontend integration: See WP07 work package documentation
- API reference: `/docs/features/B08-permissions-acl-refactor.md`
