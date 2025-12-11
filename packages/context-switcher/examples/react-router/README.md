# React Router Example

**Status:** Planned for future implementation

This example will demonstrate a complete React Router v6 integration with `@django-core/context-switcher`.

## Planned Features

- ✅ React Router v6 setup
- ✅ Organisation and project routing (`/:orgSlug/:projectSlug`)
- ✅ Protected routes requiring context
- ✅ Deep path preservation
- ✅ Multiple layouts (dashboard, settings)
- ✅ Keyboard shortcuts
- ✅ Error boundaries

## Quick Start (when implemented)

```bash
cd examples/react-router
pnpm install
pnpm dev
```

## Implementation Reference

For now, refer to the integration guide for React Router setup:

**See:** [Integration Guide - React Router v6](../../docs/integration-guide.md#react-router-v6)

## Code Structure (planned)

```
react-router/
├── src/
│   ├── App.tsx              # Root component with provider
│   ├── router.tsx           # Route definitions
│   ├── adapters/
│   │   └── reactRouter.ts   # Router adapter implementation
│   ├── layouts/
│   │   ├── AppShell.tsx     # Main layout with context switcher
│   │   └── AuthLayout.tsx   # Auth layout (login/register)
│   ├── pages/
│   │   ├── OrganisationDashboard.tsx
│   │   ├── ProjectDashboard.tsx
│   │   └── Settings.tsx
│   └── components/
│       └── ProtectedRoute.tsx
├── package.json
├── vite.config.ts
└── README.md
```

## Key Implementation Snippets

### Router Adapter

```tsx
// src/adapters/reactRouter.ts
import { useNavigate, useLocation } from 'react-router-dom';
import type { RouterAdapter } from '@django-core/context-switcher';

export function useReactRouterAdapter(): RouterAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    getCurrentPath: () => location.pathname,
    navigateTo: (path) => navigate(path),
    buildPathForContext: (context) => {
      if (context.projectSlug) {
        return `/${context.orgSlug}/${context.projectSlug}`;
      }
      return `/${context.orgSlug}`;
    },
  };
}
```

### App Shell

```tsx
// src/layouts/AppShell.tsx
import { ContextSwitcher } from '@django-core/context-switcher';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="app">
      <header>
        <Logo />
        <ContextSwitcher variant="horizontal" />
        <UserMenu />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

### Protected Route

```tsx
// src/components/ProtectedRoute.tsx
import { useContextSwitcher } from '@django-core/context-switcher';
import { Navigate, useParams } from 'react-router-dom';

export function ProtectedRoute({ children, requireProject = false }) {
  const { context } = useContextSwitcher();
  const { orgSlug, projectSlug } = useParams();

  if (context.isLoading) {
    return <LoadingSpinner />;
  }

  if (!context.organisation || context.organisation.slug !== orgSlug) {
    return <Navigate to="/organisations" />;
  }

  if (requireProject && (!context.project || context.project.slug !== projectSlug)) {
    return <Navigate to={`/${orgSlug}`} />;
  }

  return <>{children}</>;
}
```

## Contributing

To implement this example:

1. Create the directory structure above
2. Set up Vite + React + TypeScript
3. Install `react-router-dom` and `@django-core/context-switcher`
4. Implement the router adapter
5. Create example pages and layouts
6. Add comprehensive comments explaining each integration point
7. Update this README with actual running instructions

**Priority:** Medium - Useful for users adopting React Router

**See Also:**
- [Integration Guide](../../docs/integration-guide.md)
- [Customization Guide](../../docs/customization-guide.md)
- [Next.js Example](../nextjs/README.md)
