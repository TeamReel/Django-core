# Quickstart: Multi-Tenancy Context Switcher
*Path: kitty-specs/024-multi-tenancy-context/quickstart.md*

**Feature**: F03 Multi-Tenancy Context Switcher
**Package**: `@django-core/context-switcher`
**Date**: 2025-12-09

## Overview

This guide shows how to integrate the context switcher into your application. The switcher works with any routing setup (React Router, Next.js, Django templates) via an adapter pattern.

**Prerequisites**:
- `@django-core/design-system` (F01) installed
- Backend implements B13 API endpoints (see `contracts/api-contracts.md`)
- React 18.x or higher

---

## Installation

```bash
# From workspace root
pnpm add @django-core/context-switcher @django-core/design-system @django-core/api-client

# Or in your app's package.json
{
  "dependencies": {
    "@django-core/context-switcher": "workspace:*",
    "@django-core/design-system": "workspace:*",
    "@django-core/api-client": "workspace:*"
  }
}
```

---

## Basic Setup (React Router)

### 1. Create Router Adapter

```typescript
// src/adapters/routerAdapter.ts
import { RouterAdapter } from '@django-core/context-switcher';
import { useLocation, useNavigate } from 'react-router-dom';

export function createReactRouterAdapter(): RouterAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    getCurrentPath: () => location.pathname,

    navigateTo: (path) => navigate(path),

    buildPathForContext: (ctx, options) => {
      const basePath = ctx.projectSlug
        ? `/${ctx.orgSlug}/${ctx.projectSlug}`
        : `/${ctx.orgSlug}`;

      if (options?.preservePath) {
        // Extract page path after org/project segments
        const segments = location.pathname.split('/').filter(Boolean);
        const pageSegments = segments.slice(ctx.projectSlug ? 2 : 1);

        if (pageSegments.length > 0) {
          return `${basePath}/${pageSegments.join('/')}`;
        }
      }

      return options?.fallbackPath || `${basePath}/dashboard`;
    }
  };
}
```

### 2. Wrap App with Provider

```typescript
// src/App.tsx
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import { BrowserRouter } from 'react-router-dom';
import { createReactRouterAdapter } from './adapters/routerAdapter';

function AppContent() {
  const routerAdapter = createReactRouterAdapter();

  return (
    <ContextSwitcherProvider
      routerAdapter={routerAdapter}
      apiBaseUrl="/api"
      keyboardShortcut="Ctrl+K"
      onBeforeContextChange={async (from, to) => {
        // Optional: Check for unsaved changes
        if (hasUnsavedChanges()) {
          return window.confirm('You have unsaved changes. Continue?');
        }
        return true;
      }}
      onContextChanged={(context) => {
        // Optional: Analytics tracking
        console.log('Context switched:', context);
      }}
    >
      {/* Your app routes */}
    </ContextSwitcherProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
```

### 3. Add Context Switcher to Header

```typescript
// src/components/AppHeader.tsx
import { ContextSwitcher } from '@django-core/context-switcher';
import { Header, Logo } from '@django-core/design-system';

export function AppHeader() {
  return (
    <Header>
      <Logo src="/logo.png" alt="App Logo" />

      {/* Context switcher in header */}
      <ContextSwitcher
        variant="header"
        showLogo={true}
      />

      {/* Other header items (nav, user menu, etc.) */}
    </Header>
  );
}
```

---

## Usage Examples

### Reading Current Context

```typescript
import { useCurrentContext } from '@django-core/context-switcher';

function MyComponent() {
  const { context, refresh } = useCurrentContext();

  if (context.isLoading) {
    return <Spinner />;
  }

  if (context.error) {
    return <ErrorBanner message={context.error.message} />;
  }

  return (
    <div>
      <h1>Current Org: {context.organisation?.name}</h1>
      {context.project && <p>Project: {context.project.name}</p>}

      <Button onClick={refresh}>Refresh Context</Button>
    </div>
  );
}
```

### Programmatic Context Switching

```typescript
import { useContextSwitcher, useAvailableContexts } from '@django-core/context-switcher';

function QuickSwitcher() {
  const { switchContext, isSwitching } = useContextSwitcher();
  const { organisations } = useAvailableContexts();

  const handleSwitch = async (org) => {
    await switchContext(org);
  };

  return (
    <div>
      {organisations.map(org => (
        <Button
          key={org.id}
          onClick={() => handleSwitch(org)}
          disabled={isSwitching}
        >
          {org.name}
        </Button>
      ))}
    </div>
  );
}
```

### Custom Keyboard Shortcut

```typescript
<ContextSwitcherProvider
  routerAdapter={routerAdapter}
  keyboardShortcut="Cmd+Shift+O"  // Custom shortcut
  // Or disable entirely:
  // disableKeyboardShortcut={true}
>
  {/* ... */}
</ContextSwitcherProvider>
```

### Custom Labels (i18n)

```typescript
<ContextSwitcherProvider
  routerAdapter={routerAdapter}
  labels={{
    organisationLabel: t('tenant.organisation'),
    projectLabel: t('tenant.workspace'),
    searchPlaceholder: t('search.placeholder'),
    noOrganisations: t('tenant.none'),
  }}
>
  {/* ... */}
</ContextSwitcherProvider>
```

---

## Next.js Setup

```typescript
// app/layout.tsx (App Router)
'use client';

import { ContextSwitcherProvider } from '@django-core/context-switcher';
import { useRouter, usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const nextJsAdapter = {
    getCurrentPath: () => pathname,
    navigateTo: (path) => router.push(path),
    buildPathForContext: (ctx, options) => {
      // Similar to React Router implementation
      const basePath = ctx.projectSlug
        ? `/${ctx.orgSlug}/${ctx.projectSlug}`
        : `/${ctx.orgSlug}`;

      if (options?.preservePath) {
        const segments = pathname.split('/').filter(Boolean);
        const pageSegments = segments.slice(ctx.projectSlug ? 2 : 1);
        return pageSegments.length > 0
          ? `${basePath}/${pageSegments.join('/')}`
          : basePath;
      }

      return options?.fallbackPath || `${basePath}/dashboard`;
    }
  };

  return (
    <html>
      <body>
        <ContextSwitcherProvider routerAdapter={nextJsAdapter}>
          {children}
        </ContextSwitcherProvider>
      </body>
    </html>
  );
}
```

---

## Django Templates (Server-Rendered)

For server-rendered Django templates, you can still use the context switcher by hydrating it client-side:

```html
<!-- templates/base.html -->
{% load static %}

<div id="context-switcher-root"
     data-api-url="{% url 'api:organisations-list' %}"
     data-current-org="{{ request.organisation.slug }}"
     data-current-project="{{ request.project.slug|default:'' }}">
</div>

<script type="module">
  import { hydrateContextSwitcher } from '@django-core/context-switcher';

  const root = document.getElementById('context-switcher-root');
  const currentPath = window.location.pathname;

  hydrateContextSwitcher(root, {
    routerAdapter: {
      getCurrentPath: () => currentPath,
      navigateTo: (path) => window.location.href = path,
      buildPathForContext: (ctx, options) => {
        // Django URL structure: /<org>/<project>/<page>/
        const basePath = ctx.projectSlug
          ? `/${ctx.orgSlug}/${ctx.projectSlug}`
          : `/${ctx.orgSlug}`;

        if (options?.preservePath) {
          const segments = currentPath.split('/').filter(Boolean);
          const pageSegments = segments.slice(ctx.projectSlug ? 2 : 1);
          return pageSegments.length > 0
            ? `${basePath}/${pageSegments.join('/')}/`
            : `${basePath}/`;
        }

        return `${basePath}/`;
      }
    }
  });
</script>
```

---

## Testing

### Unit Testing Context Switcher

```typescript
// __tests__/ContextSwitcher.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSwitcher, ContextSwitcherProvider } from '@django-core/context-switcher';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/organisations/', () => {
    return HttpResponse.json({
      organisations: [
        { id: '1', name: 'Acme Corp', slug: 'acme-corp' },
        { id: '2', name: 'Beta Inc', slug: 'beta-inc' }
      ]
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('opens organisation picker on click', async () => {
  const mockAdapter = {
    getCurrentPath: () => '/acme-corp/tasks',
    navigateTo: jest.fn(),
    buildPathForContext: jest.fn()
  };

  render(
    <ContextSwitcherProvider routerAdapter={mockAdapter}>
      <ContextSwitcher variant="header" />
    </ContextSwitcherProvider>
  );

  const trigger = screen.getByRole('button', { name: /acme corp/i });
  fireEvent.click(trigger);

  expect(await screen.findByText('Beta Inc')).toBeInTheDocument();
});
```

### Integration Testing Context Switch

```typescript
test('switches organisation and preserves path', async () => {
  const mockAdapter = {
    getCurrentPath: () => '/acme-corp/tasks',
    navigateTo: jest.fn(),
    buildPathForContext: (ctx, options) => {
      if (options?.preservePath) {
        return `/${ctx.orgSlug}/tasks`;
      }
      return `/${ctx.orgSlug}/dashboard`;
    }
  };

  render(
    <ContextSwitcherProvider routerAdapter={mockAdapter}>
      <ContextSwitcher variant="header" />
    </ContextSwitcherProvider>
  );

  // Open picker
  fireEvent.click(screen.getByRole('button', { name: /acme corp/i }));

  // Select Beta Inc
  fireEvent.click(await screen.findByText('Beta Inc'));

  // Verify navigation with preserved path
  expect(mockAdapter.navigateTo).toHaveBeenCalledWith('/beta-inc/tasks');
});
```

---

## Troubleshooting

### Context Not Loading

**Problem**: Context switcher shows loading spinner indefinitely.

**Solution**:
1. Check backend API endpoints are accessible: `GET /api/organisations/`
2. Verify CSRF token is being sent (open DevTools → Network → Headers)
3. Check browser console for API errors

### Keyboard Shortcut Not Working

**Problem**: Ctrl+K doesn't open context switcher.

**Solution**:
1. Check if another global shortcut is conflicting
2. Try custom shortcut: `keyboardShortcut="Cmd+Shift+O"`
3. Verify provider is mounted before using shortcut

### Context Switch Fails with 403

**Problem**: User can see organisation in list but gets 403 when switching.

**Solution**:
1. Backend authorization issue: Check B08 role assignments
2. User lost access between list fetch and switch
3. Add error handling: `onContextError={(err) => showToast(err.message)}`

### Search Not Working

**Problem**: Typing in search field doesn't filter list.

**Solution**:
1. Verify minimum 3 characters typed (by design)
2. Check 300ms debounce is working (type slowly)
3. Look for console errors in `useDebouncedValue` hook

---

## Next Steps

- **Customization**: See `data-model.md` for all configuration options
- **API Integration**: See `contracts/api-contracts.md` for backend requirements
- **Advanced Usage**: See `README.md` in the package for hooks API reference
- **Accessibility**: Run `axe-core` tests to verify WCAG compliance

---

## Support

For issues or questions:
1. Check package README: `packages/context-switcher/README.md`
2. Review spec: `kitty-specs/024-multi-tenancy-context/spec.md`
3. Review plan: `kitty-specs/024-multi-tenancy-context/plan.md`
4. Check existing tests for usage examples: `packages/context-switcher/__tests__/`
