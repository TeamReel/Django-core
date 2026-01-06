# Context Propagation Integration Guide

> Learn how to maintain and inject organization/project context into all API requests
>
> **Audience**: Frontend developers integrating multi-tenancy context into client applications
> **Related**: [F03 Context Switcher](https://github.com/django-core/frontend/tree/main/packages/context-switcher) | [B06 Organisations](https://github.com/django-core/backend) | [B07 Projects](https://github.com/django-core/backend) | [API Baseline (B13)](https://github.com/django-core/backend/tree/main/docs/api)

## Overview

Multi-tenancy requires that every API request includes organization and project context via HTTP headers. This guide demonstrates how to:

1. **Maintain context state** in a centralized provider
2. **Propagate context** to all API requests automatically
3. **Validate context** before switching (optional but recommended)
4. **Persist context** across browser sessions
5. **Handle context loss** gracefully (e.g., revoked access)
6. **Integrate with authentication** (clear context on logout)

## Prerequisites

- **Frontend**: TypeScript 5.x, React 18.x (for React examples)
- **Backend**: B06 (Organisations API), B07 (Projects API), B13 (API Baseline with CSRF protection)
- **Authentication**: WP02 (Authentication Guide) - context depends on authenticated user
- **Contracts**: Import `ContextProvider`, `Organization`, `Project`, `RequestState` from `@django-core/integration-guides-examples`

## Context Types

The context provider maintains two pieces of tenant information:

```typescript
// From kitty-specs/030-frontend-backend-integration/contracts/types.ts

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
}

export interface ContextProvider {
  // Current context
  currentOrganization: Organization | undefined;
  currentProject: Project | undefined;

  // State tracking
  isLoading: boolean;

  // Operations
  setOrganization(org: Organization): Promise<void>; // validates access
  setProject(project: Project): Promise<void>;       // validates access
  clearContext(): void;

  // For ApiClient integration
  getContextHeaders(): Record<string, string>;
}
```

## Setting Organization Context

When user switches organizations in the UI (via F03 Context Switcher), call `setOrganization()`:

```typescript
// Vanilla TypeScript
import { createContextProvider } from './context-example/vanilla';

const contextProvider = createContextProvider({
  baseURL: 'https://api.example.com',
  onContextChange: (context) => {
    console.log('Context switched:', context.currentOrganization?.name);
  },
});

// User clicks "Switch to Acme Corp"
const acmeOrg = { id: 'org_123', name: 'Acme Corp', slug: 'acme' };
await contextProvider.setOrganization(acmeOrg);

// All subsequent API calls now include:
// X-Organization-ID: org_123
```

### React Integration

```typescript
// In React application
import { useContext } from './context-example/react';

function OrgSwitcher() {
  const context = useContext();
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);

  const handleSwitchOrg = async (org: Organization) => {
    try {
      await context.setOrganization(org);
      // UI updates automatically via context provider
      navigateTo('/dashboard');
    } catch (error) {
      showErrorNotification('Cannot access this organization');
    }
  };

  return (
    <select onChange={(e) => handleSwitchOrg(JSON.parse(e.target.value))}>
      {organizations.map((org) => (
        <option key={org.id} value={JSON.stringify(org)}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
```

## Setting Project Context

Projects are scoped to organizations. Set project context after organization:

```typescript
// Vanilla TypeScript
const projectX = {
  id: 'proj_456',
  name: 'Project X',
  slug: 'project-x',
  organizationId: 'org_123',
};

await contextProvider.setProject(projectX);

// All subsequent API calls now include:
// X-Organization-ID: org_123
// X-Project-ID: proj_456
```

### Validation Pattern

The `setProject()` method should validate that the project belongs to the current organization:

```typescript
// Backend validates that project.organizationId === currentOrganization.id
// Frontend can optionally pre-validate:

async function setProject(project: Project): Promise<void> {
  if (!this.currentOrganization) {
    throw new Error('Organization context required before setting project');
  }

  if (project.organizationId !== this.currentOrganization.id) {
    throw new Error('Project does not belong to current organization');
  }

  // Backend will validate access via B07
  const response = await this.apiRequest(
    `/api/organizations/${this.currentOrganization.id}/projects/${project.id}/validate`,
    'GET',
  );

  if (!response.ok) {
    throw new Error('You do not have access to this project');
  }

  this.state = { ...this.state, currentProject: project };
  this.options.onContextChange?.(this.state);
}
```

## Header Injection

Context headers must be included in **all** API requests:

```typescript
// Vanilla TypeScript - manual header injection
const headers = {
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken(),
  ...contextProvider.getContextHeaders(), // adds X-Organization-ID, X-Project-ID
};

const response = await fetch('/api/resources', { headers });
```

### Integration with ApiClient

The recommended pattern is to integrate context headers into your `ApiClient`:

```typescript
// examples/integration-guides/api-client-example/index.ts
import { createAuthProvider } from '../auth-example/vanilla';
import { createContextProvider } from '../context-example/vanilla';

export function createApiClient(options: {
  baseURL: string;
  auth: AuthProvider;
  context: ContextProvider;
}) {
  return {
    async request<T>(
      path: string,
      init?: RequestInit,
    ): Promise<T> {
      const headers = {
        ...init?.headers,
        'X-CSRFToken': auth.getCsrfToken(), // CSRF protection
        ...options.context.getContextHeaders(), // Context headers
      };

      const response = await fetch(`${options.baseURL}${path}`, {
        ...init,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    },
  };
}
```

## Persistence

Context preferences should persist across browser sessions via `localStorage`:

```typescript
// Vanilla TypeScript
const contextProvider = createContextProvider({
  baseURL: 'https://api.example.com',
  onContextChange: (context) => {
    // Persist to localStorage
    localStorage.setItem('currentOrg', context.currentOrganization?.id || '');
    localStorage.setItem('currentProject', context.currentProject?.id || '');
  },
});

// On page load, restore context
const savedOrgId = localStorage.getItem('currentOrg');
if (savedOrgId) {
  const org = await fetchOrganization(savedOrgId);
  await contextProvider.setOrganization(org);
}
```

### Considerations

- **Non-sensitive data**: Org/project IDs are not sensitive (user already authenticated)
- **Access validation**: Backend validates access on every request
- **TTL**: Consider TTL for cached org/project lists (30 minutes typical)
- **Sync across tabs**: Use `storage` event to sync context across browser tabs (optional)

```typescript
// Sync context across tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'currentOrg' && event.newValue) {
    const org = JSON.parse(event.newValue);
    contextProvider.setOrganization(org);
  }
});
```

## Handling Context Loss

Gracefully handle scenarios where user's access to org/project is revoked:

```typescript
// When API returns 403 (Forbidden)
try {
  const result = await apiClient.request('/api/resources');
} catch (error) {
  if (error.status === 403) {
    // Access revoked - clear context
    contextProvider.clearContext();

    // Redirect to org selection
    window.location.href = '/select-organization';
  }
}
```

### Context Validation Errors

Handle errors when switching context:

```typescript
try {
  await contextProvider.setOrganization(org);
} catch (error) {
  if (error instanceof ContextError) {
    switch (error.code) {
      case 'ORGANIZATION_NOT_FOUND':
        showError('Organization no longer exists');
        break;
      case 'ACCESS_DENIED':
        showError('You no longer have access to this organization');
        contextProvider.clearContext();
        break;
      case 'VALIDATION_FAILED':
        showError('Could not verify organization access');
        break;
    }
  }
}
```

## Integration with Authentication

Clear context when user logs out:

```typescript
// In AuthProvider
const logout = async (): Promise<void> => {
  // Clear auth state
  setState({ status: 'idle' });

  // Clear context (important!)
  contextProvider.clearContext();

  // Call server logout
  try {
    await apiRequest('/api/auth/logout', 'POST');
  } catch (error) {
    console.error('Server logout failed:', error);
  }
};
```

## Anti-Patterns ⚠️

### 1. Context in Local Variables

**Problem**: Context stored in local variables is lost on navigation
```typescript
// ❌ WRONG - context lost
let currentOrg;

function switchOrg(org: Organization) {
  currentOrg = org; // lost on page reload
}
```

**Solution**: Use centralized provider with persistence
```typescript
// ✅ CORRECT
await contextProvider.setOrganization(org); // persists to localStorage
```

### 2. Missing Context Headers

**Problem**: Requests sent without context headers hit wrong tenant
```typescript
// ❌ WRONG - context ignored
fetch('/api/resources', {
  headers: { 'X-CSRFToken': token },
  // X-Organization-ID missing!
});
```

**Solution**: Integrate context into ApiClient
```typescript
// ✅ CORRECT
await apiClient.request('/api/resources'); // headers injected automatically
```

### 3. Silent Failures on Context Loss

**Problem**: App continues using revoked context silently
```typescript
// ❌ WRONG - continues with invalid context
try {
  await apiClient.request('/api/resources');
} catch (error) {
  // Ignores 403 Forbidden
  console.error(error);
}
```

**Solution**: Validate and clear context on access denial
```typescript
// ✅ CORRECT
try {
  await apiClient.request('/api/resources');
} catch (error) {
  if (error.status === 403) {
    contextProvider.clearContext();
    redirectToOrgSelection();
  }
}
```

### 4. Multi-Tab Context Conflicts

**Problem**: User switches context in one tab, other tabs unaware
```typescript
// ❌ WRONG - tabs out of sync
// Tab 1: User switches to Acme Corp
contextProvider.setOrganization(acmeOrg);

// Tab 2: Still using old context
// API calls to acmeOrg appear to fail
```

**Solution**: Sync context via storage events
```typescript
// ✅ CORRECT
window.addEventListener('storage', (event) => {
  if (event.key === 'currentOrg') {
    const newOrg = JSON.parse(event.newValue || '{}');
    contextProvider.setOrganization(newOrg);
  }
});
```

### 5. Context Validation Not Validated

**Problem**: Assume user has access without validation
```typescript
// ❌ WRONG - no validation
const proj = { id: 'proj_789', organizationId: 'org_999' };
await contextProvider.setProject(proj);
// Doesn't check if user has access!
```

**Solution**: Validate via API call
```typescript
// ✅ CORRECT
const response = await apiClient.request(
  `/api/organizations/${org.id}/projects/${project.id}/validate`,
);
if (!response.ok) {
  throw new ContextError('ACCESS_DENIED');
}
await contextProvider.setProject(project);
```

### 6. Context Not Cleared on Logout

**Problem**: User logs out but context persists
```typescript
// ❌ WRONG - context remains
async function logout() {
  await apiClient.request('/api/auth/logout', 'POST');
  // Context still set!
  // Subsequent requests include org/project headers
}
```

**Solution**: Clear context during logout
```typescript
// ✅ CORRECT
async function logout() {
  contextProvider.clearContext(); // Clear first
  await apiClient.request('/api/auth/logout', 'POST');
  // Context now empty
}
```

## Pre-Deployment Integration Checklist

- [ ] ContextProvider initialized on app startup
- [ ] Context headers injected in all API requests via ApiClient
- [ ] Organization and project setters validate via API call
- [ ] Context persists to localStorage
- [ ] Context restored on page load
- [ ] Multi-tab sync implemented (via storage events)
- [ ] 403 Forbidden triggers context clearance and redirect
- [ ] Logout clears context before calling server
- [ ] Error boundaries handle ContextError exceptions
- [ ] Team reviewed for context drift scenarios (anti-patterns)
- [ ] E2E tests verify context injection in requests
- [ ] Product validated context switching behavior

## Related Resources

- [F03 Context Switcher UI Package](https://github.com/django-core/frontend/tree/main/packages/context-switcher)
- [B06 Organisations API](https://github.com/django-core/backend/tree/main/apps/organisations)
- [B07 Projects API](https://github.com/django-core/backend/tree/main/apps/projects)
- [ContextProvider Interface](../contracts/types.ts)
- [WP02: Authentication Guide](./auth-api.md)
- [WP04: Data Fetching Guide](./data-fetching.md) (next)
