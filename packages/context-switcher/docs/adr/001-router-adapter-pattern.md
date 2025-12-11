# ADR-001: Router Adapter Pattern

**Status:** Accepted

**Date:** 2024-12-11

**Deciders:** @django-core/frontend-team

---

## Context

The context switcher needs to synchronize organisation and project selection with the application's URL structure. Different frontend frameworks use different routing libraries (React Router, Next.js Router, hash routing, etc.), and some applications are server-rendered without a client-side router.

We need a solution that:
1. Works across different routing libraries
2. Supports both client-side and server-side routing
3. Allows applications to control their own URL structure
4. Doesn't force dependencies on specific routing libraries

## Decision

We will use the **Adapter Pattern** to abstract routing concerns. Applications provide a `RouterAdapter` object that implements three methods:

```typescript
interface RouterAdapter {
  getCurrentPath(): string;
  navigateTo(path: string): void;
  buildPathForContext(
    context: {
      orgSlug: string;
      projectSlug?: string | null;
    },
    options?: { replace?: boolean }
  ): string;
}
```

### Rationale

**Separation of Concerns:**
- Context switcher manages context state and UI
- Application controls URL structure and navigation

**Framework Agnostic:**
- No dependency on React Router, Next.js, or any specific library
- Works with any routing approach (client, server, hash, custom domains)

**Flexibility:**
- Applications choose their own URL patterns (`/:org/:project` vs `/orgs/:orgSlug/projects/:projectSlug`)
- Supports advanced patterns (subdomains, query params, hash routing)

**Testability:**
- Easy to mock for testing
- No need to set up routing infrastructure in tests

## Implementation

### React Router v6

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  },
};
```

### Next.js App Router

```typescript
import { useRouter, usePathname } from 'next/navigation';

const routerAdapter: RouterAdapter = {
  getCurrentPath: () => pathname,
  navigateTo: (path) => router.push(path),
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  },
};
```

### Server-Rendered (Django Templates)

```typescript
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => window.location.pathname,
  navigateTo: (path) => {
    window.location.href = path; // Full page reload
  },
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/orgs/${context.orgSlug}/projects/${context.projectSlug}/`;
    }
    return `/orgs/${context.orgSlug}/`;
  },
};
```

## Consequences

### Positive

- **Framework independence**: Works with any routing library or no library at all
- **Application control**: Applications define their own URL structure
- **Simple interface**: Only 3 methods to implement
- **Easy testing**: Mock adapters are trivial to create
- **Advanced patterns**: Supports subdomains, query params, deep linking

### Negative

- **Boilerplate**: Applications must implement the adapter (though examples reduce this)
- **Consistency risk**: Different applications might structure URLs differently
- **No validation**: Adapter implementations are not validated at build time

### Mitigations

- Provide comprehensive examples for all major frameworks
- Include TypeScript types for compile-time safety
- Document common patterns and best practices
- Consider providing factory functions for common use cases:

```typescript
import { createReactRouterAdapter } from '@django-core/context-switcher/adapters';

const adapter = createReactRouterAdapter(navigate, location);
```

## Alternatives Considered

### 1. Built-in React Router Integration

**Rejected because:**
- Forces React Router as a peer dependency
- Doesn't work with Next.js, hash routing, or server-rendered apps
- Locks users into a specific routing library

### 2. Multiple Framework-Specific Exports

```typescript
import { ContextSwitcherProvider } from '@django-core/context-switcher/react-router';
import { ContextSwitcherProvider } from '@django-core/context-switcher/nextjs';
```

**Rejected because:**
- Requires maintaining separate implementations for each framework
- Increases bundle size (all implementations shipped)
- Hard to support custom/niche routing solutions

### 3. URL Pattern Configuration

```typescript
<ContextSwitcherProvider
  config={{
    urlPattern: '/:orgSlug/:projectSlug',
  }}
>
```

**Rejected because:**
- Doesn't handle navigation (how to actually change URL)
- Doesn't support advanced patterns (subdomains, query params)
- Still requires framework-specific navigation logic

## Related ADRs

- [ADR-002: State Management](./002-state-management.md) - How context state is managed
- [ADR-003: Virtualization Strategy](./003-virtualization-strategy.md) - Performance for large lists

## References

- [Adapter Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/adapter)
- [React Router v6 Documentation](https://reactrouter.com/)
- [Next.js Routing Documentation](https://nextjs.org/docs/routing/introduction)
