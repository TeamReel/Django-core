# Troubleshooting Guide

Common issues and solutions for `@django-core/context-switcher`.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Errors](#runtime-errors)
- [Context Not Loading](#context-not-loading)
- [Context Not Switching](#context-not-switching)
- [URL Synchronization Issues](#url-synchronization-issues)
- [Styling Issues](#styling-issues)
- [Performance Issues](#performance-issues)
- [TypeScript Errors](#typescript-errors)

---

## Installation Issues

### Peer Dependency Warnings

**Problem:**
```
npm WARN @django-core/context-switcher@0.1.0 requires a peer of react@^18.0.0 but none is installed.
```

**Solution:**
Install all required peer dependencies:

```bash
pnpm add react@^18.0.0 react-dom@^18.0.0
```

### Module Not Found: @django-core/design-system

**Problem:**
```
Module not found: Can't resolve '@django-core/design-system'
```

**Solution:**
Install the design system package:

```bash
pnpm add @django-core/design-system
```

### Module Not Found: @django-core/api-client

**Problem:**
```
Module not found: Can't resolve '@django-core/api-client'
```

**Solution:**
Install the API client package:

```bash
pnpm add @django-core/api-client
```

---

## Runtime Errors

### useContextSwitcher() Hook Called Outside Provider

**Problem:**
```
Error: useContextSwitcher must be used within a ContextSwitcherProvider
```

**Solution:**
Ensure your component is wrapped with `ContextSwitcherProvider`:

```tsx
// ❌ Wrong
function App() {
  return <MyComponent />; // useContextSwitcher called here
}

// ✅ Correct
function App() {
  return (
    <ContextSwitcherProvider config={{ routerAdapter, apiBaseUrl: '/api' }}>
      <MyComponent /> {/* Now useContextSwitcher works */}
    </ContextSwitcherProvider>
  );
}
```

### RouterAdapter is Required

**Problem:**
```
Error: routerAdapter is required in ContextSwitcherProvider config
```

**Solution:**
Provide a valid router adapter:

```tsx
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

<ContextSwitcherProvider
  config={{
    routerAdapter, // ✅ Required
    apiBaseUrl: '/api',
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Cannot Read Property 'name' of Null

**Problem:**
```
TypeError: Cannot read property 'name' of null
```

**Solution:**
Always check if context is loaded before accessing properties:

```tsx
function MyComponent() {
  const { context } = useContextSwitcher();

  // ❌ Wrong - crashes if organisation is null
  return <h1>{context.organisation.name}</h1>;

  // ✅ Correct - safe access
  if (context.isLoading) {
    return <LoadingSpinner />;
  }

  return <h1>{context.organisation?.name || 'No organisation selected'}</h1>;
}
```

---

## Context Not Loading

### API Returns 401 Unauthorized

**Problem:**
API requests fail with 401 Unauthorized.

**Solution:**
Ensure your API client includes credentials:

```tsx
import { createApiClient } from '@django-core/api-client';

const apiClient = createApiClient({
  baseURL: '/api',
  withCredentials: true, // ✅ Include cookies
});

<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiClient,
  }}
>
  {children}
</ContextSwitcherProvider>
```

### API Returns 404 Not Found

**Problem:**
```
GET /api/organisations 404 (Not Found)
```

**Solution:**
Check your `apiBaseUrl` configuration:

```tsx
// ❌ Wrong - incorrect base URL
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api', // Your API is actually at /api/v1
  }}
>

// ✅ Correct
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api/v1',
  }}
>
```

### CORS Errors

**Problem:**
```
Access to fetch at 'https://api.example.com/organisations' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Solution:**
Configure CORS on your backend:

**Django:**
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True
```

**Express:**
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
```

### Context Loads on First Mount but Not After Refresh

**Problem:**
Context loads initially but is lost after page refresh.

**Solution:**
Ensure your backend saves context to session:

```python
# Django view
def update_context(request):
    org_id = request.data.get('organisationId')
    project_id = request.data.get('projectId')

    # ✅ Save to session
    request.session['context_organisation_id'] = org_id
    request.session['context_project_id'] = project_id

    return Response({'status': 'ok'})
```

---

## Context Not Switching

### switchContext() Does Not Navigate

**Problem:**
`switchContext()` is called but URL doesn't change.

**Solution:**
Verify your router adapter's `navigateTo` implementation:

```tsx
// ❌ Wrong - function has no effect
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => {
    console.log('Navigating to:', path); // Logs but doesn't navigate
  },
  buildPathForContext: (context) => `/${context.orgSlug}`,
};

// ✅ Correct - actually navigates
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path), // React Router
  // OR
  navigateTo: (path) => router.push(path), // Next.js
  // OR
  navigateTo: (path) => { window.location.href = path; }, // Plain JS
  buildPathForContext: (context) => `/${context.orgSlug}`,
};
```

### Context Switches but UI Doesn't Update

**Problem:**
Context changes in state but components don't re-render.

**Solution:**
Ensure you're using the `useContextSwitcher` hook correctly:

```tsx
// ❌ Wrong - destructured values don't update
function MyComponent() {
  const { organisation } = useContextSwitcher().context;

  return <h1>{organisation?.name}</h1>; // Doesn't update
}

// ✅ Correct - access context object directly
function MyComponent() {
  const { context } = useContextSwitcher();

  return <h1>{context.organisation?.name}</h1>; // Updates correctly
}
```

### onBeforeContextChange Blocks Switch

**Problem:**
Context switch is silently cancelled.

**Solution:**
Check your `onBeforeContextChange` callback:

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    onBeforeContextChange: (newContext) => {
      // ❌ Always returns false - blocks all switches
      return false;

      // ✅ Correct - conditional logic
      if (hasUnsavedChanges) {
        return confirm('You have unsaved changes. Continue?');
      }
      return true;
    },
  }}
>
```

---

## URL Synchronization Issues

### URL Not Updating After Context Switch

**Problem:**
Context changes but URL stays the same.

**Solution:**
Verify `buildPathForContext` returns a valid path:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context) => {
    console.log('Building path for:', context); // Debug output

    // ✅ Return valid path
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  },
};
```

### Context Doesn't Match URL

**Problem:**
URL shows `/org-a/project-x` but context shows different organisation/project.

**Solution:**
Ensure your route params match the adapter's path structure:

```tsx
// Routes
<Routes>
  <Route path="/:orgSlug/:projectSlug" element={<ProjectPage />} />
</Routes>

// Adapter - must match route structure
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context) => {
    // ✅ Matches /:orgSlug/:projectSlug
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  },
};
```

### Deep Paths Not Preserved

**Problem:**
Switching context navigates to organisation home instead of preserving deep path like `/settings/members`.

**Solution:**
Implement path preservation in your adapter:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context, options) => {
    const basePath = context.projectSlug
      ? `/${context.orgSlug}/${context.projectSlug}`
      : `/${context.orgSlug}`;

    // ✅ Extract and preserve sub-path
    const segments = location.pathname.split('/').filter(Boolean);
    const subPath = segments.slice(2).join('/'); // Skip org/project

    if (subPath && !options?.replace) {
      return `${basePath}/${subPath}`;
    }

    return basePath;
  },
};
```

---

## Styling Issues

### Styles Not Applied

**Problem:**
Custom className has no effect.

**Solution:**
Ensure your CSS is loaded and has sufficient specificity:

```css
/* ❌ Wrong - too generic, might be overridden */
.custom-switcher {
  background-color: red;
}

/* ✅ Correct - more specific selector */
.app-header .custom-switcher {
  background-color: red !important;
}
```

### Modal/Picker Not Visible

**Problem:**
Picker opens but is not visible on screen.

**Solution:**
Check z-index of modal:

```css
/* Ensure picker modal appears above other elements */
.organisation-picker-modal {
  z-index: 9999 !important;
}
```

### Layout Breaks in Production

**Problem:**
Styling works in development but breaks in production build.

**Solution:**
Ensure CSS is imported correctly:

```tsx
// ✅ Import design system styles
import '@django-core/design-system/dist/index.css';
import '@django-core/context-switcher/dist/index.css';
```

---

## Performance Issues

### Slow Search/Filtering

**Problem:**
Search input feels laggy with large organisation lists.

**Solution:**
The package uses 300ms debounce by default. For custom implementations, ensure you're using `useDebouncedValue`:

```tsx
import { useDebouncedValue } from '@django-core/context-switcher';

function CustomSearch() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300); // ✅ Debounced

  // ❌ Wrong - filters on every keystroke
  const filtered = organisations.filter((org) =>
    org.name.includes(search)
  );

  // ✅ Correct - filters after debounce
  const filtered = organisations.filter((org) =>
    org.name.includes(debouncedSearch)
  );

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

### List Rendering Slow with 1000+ Items

**Problem:**
Picker is slow to render with large lists.

**Solution:**
The package uses virtualization by default via `react-window`. Ensure you're using the built-in components:

```tsx
// ✅ Built-in components use virtualization
<OrganisationPicker isOpen={isOpen} onClose={onClose} />

// ❌ Custom list without virtualization - slow
<ul>
  {organisations.map((org) => (
    <li key={org.id}>{org.name}</li>
  ))}
</ul>

// ✅ Custom list with virtualization
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={organisations.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{organisations[index].name}</div>
  )}
</FixedSizeList>
```

### Too Many API Requests

**Problem:**
Context switcher makes redundant API requests.

**Solution:**
Implement caching with React Query or SWR:

```tsx
import { useQuery } from '@tanstack/react-query';

function useOrganisations() {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: fetchOrganisations,
    staleTime: 5 * 60 * 1000, // ✅ Cache for 5 minutes
  });
}
```

---

## TypeScript Errors

### Type 'X' is not assignable to type 'RouterAdapter'

**Problem:**
```
Type '{ getCurrentPath: () => string; ... }' is not assignable to type 'RouterAdapter'
```

**Solution:**
Explicitly type your adapter:

```tsx
import type { RouterAdapter } from '@django-core/context-switcher';

// ✅ Explicit typing
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

### Property 'organisation' does not exist on type 'UserContext'

**Problem:**
```
Property 'organisation' does not exist on type 'UserContext'
```

**Solution:**
Access properties through the `context` object:

```tsx
// ❌ Wrong
const { organisation } = useContextSwitcher();

// ✅ Correct
const { context } = useContextSwitcher();
console.log(context.organisation);
```

### Cannot find module '@django-core/context-switcher' or its corresponding type declarations

**Problem:**
TypeScript can't find the package even though it's installed.

**Solution:**
1. Ensure `@django-core/context-switcher` is in your `dependencies` (not `devDependencies`)
2. Delete `node_modules` and reinstall:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

3. Restart your TypeScript server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")

---

## Getting Help

If your issue isn't listed here:

1. **Check the Examples** - See [examples/](../examples/) for working implementations
2. **Review Integration Guide** - See [integration-guide.md](./integration-guide.md) for framework-specific setup
3. **Search GitHub Issues** - [GitHub Issues](https://github.com/TeamReel/django-core/issues)
4. **Ask in Discussions** - [GitHub Discussions](https://github.com/TeamReel/django-core/discussions)
5. **Contact Support** - support@teamreel.app

When reporting an issue, include:
- Package version (`pnpm list @django-core/context-switcher`)
- Framework and version (React Router 6.20, Next.js 14.1, etc.)
- Minimal reproduction code
- Browser and OS
- Console errors (if any)
