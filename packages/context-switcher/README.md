# @django-core/context-switcher

Multi-tenancy context switching for Django-based applications. Provides React Context, hooks, and state management for managing organisation and project selection with URL synchronization.

## Installation

```bash
pnpm add @django-core/context-switcher
```

## Quick Start

### 1. Wrap your app with ContextSwitcherProvider

```tsx
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

// Create router adapter (example for React Router)
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (ctx, options) => {
    const basePath = ctx.projectSlug
      ? `/${ctx.orgSlug}/${ctx.projectSlug}`
      : `/${ctx.orgSlug}`;

    if (options?.preservePath) {
      const currentPath = location.pathname;
      const pathSegments = currentPath.split('/').slice(3);
      return pathSegments.length > 0
        ? `${basePath}/${pathSegments.join('/')}`
        : basePath;
    }

    return options?.fallbackPath || `${basePath}/dashboard`;
  }
};

function App() {
  return (
    <ContextSwitcherProvider config={{ routerAdapter, apiBaseUrl: '/api/v1' }}>
      <YourApp />
    </ContextSwitcherProvider>
  );
}
```

### 2. Use the hook in your components

```tsx
import { useContextSwitcher } from '@django-core/context-switcher';

function MyComponent() {
  const { context, organisations, switchContext } = useContextSwitcher();

  if (context.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Current Organisation: {context.organisation?.name}</h1>
      <h2>Current Project: {context.project?.name || 'None'}</h2>

      <select
        value={context.organisation?.id || ''}
        onChange={(e) => {
          const org = organisations.find((o) => o.id === e.target.value);
          if (org) switchContext(org);
        }}
      >
        {organisations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 3. Add the ContextSwitcher component to your shell

```tsx
import { ContextSwitcher } from '@django-core/context-switcher';

function AppShell() {
  return (
    <div>
      {/* Header with horizontal layout */}
      <header>
        <Logo />
        <ContextSwitcher variant="horizontal" />
        <UserMenu />
      </header>

      {/* Or sidebar with vertical layout */}
      <aside>
        <ContextSwitcher variant="vertical" />
        <Navigation />
      </aside>

      <main>{children}</main>
    </div>
  );
}
```

The `ContextSwitcher` component provides a complete, ready-to-use UI that:
- Displays the current context (organisation and project)
- Opens pickers to switch organisation or project on click
- Handles loading and error states automatically
- Fully keyboard accessible with ARIA attributes
- Works in horizontal (header) or vertical (sidebar) layouts

## Features

- **URL-based context**: Organisation and project context synchronized with URL paths
- **Framework-agnostic routing**: Works with React Router, Next.js, or any routing library via adapter pattern
- **TypeScript**: Fully typed with comprehensive interfaces
- **Automatic context loading**: Fetches organisation/project data from backend on mount
- **Context switching**: Seamlessly switch between organisations and projects
- **Error handling**: Built-in error states and callbacks
- **Lifecycle hooks**: `onBeforeContextChange`, `onContextChanged`, `onContextError`

## API Reference

### ContextSwitcherProvider

Main provider component that wraps your application.

**Props:**
- `config`: ContextSwitcherConfig - Configuration object (required)
  - `routerAdapter`: RouterAdapter - Routing integration (required)
  - `apiBaseUrl`: string - API base URL (default: '/api/v1')
  - `keyboardShortcut`: string - Keyboard shortcut (default: 'Ctrl+K')
  - `disableKeyboardShortcut`: boolean - Disable keyboard shortcut
  - `labels`: ContextLabels - Custom UI labels for i18n
  - `onBeforeContextChange`: (from, to) => boolean | Promise<boolean> - Pre-switch hook
  - `onContextChanged`: (context) => void - Post-switch hook
  - `onContextError`: (error) => void - Error handler

### ContextSwitcher

Main UI component that composes the context indicator and pickers into a unified interface.

**Props:**
- `className`: string (optional) - Custom CSS class
- `variant`: 'horizontal' | 'vertical' (default: 'horizontal') - Layout direction
  - `horizontal`: Side-by-side layout for headers
  - `vertical`: Stacked layout for sidebars

**Example:**
```tsx
// In app header
<ContextSwitcher variant="horizontal" />

// In sidebar
<ContextSwitcher variant="vertical" />
```

The component automatically:
- Renders the current context indicator
- Opens OrganisationPicker when org name is clicked
- Opens ProjectPicker when project name is clicked
- Disables project picker when no organisation is selected
- Handles all loading and error states

### useContextSwitcher()

Hook to access context switcher state and actions.

**Returns:**
- `context`: UserContext - Current context state
  - `organisation`: Organisation | null
  - `project`: Project | null
  - `isLoading`: boolean
  - `error`: ContextError | null
- `organisations`: Organisation[] - All available organisations
- `projects`: Project[] - All projects in current organisation
- `switchContext(org, project?)`: Promise<void> - Switch organisation/project
- `switchProject(project)`: Promise<void> - Switch project (same org)
- `refresh()`: Promise<void> - Refresh context from backend
- `isSwitching`: boolean - True while context switch in progress

## Types

### Organisation

```typescript
interface Organisation {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata?: OrganisationMetadata;
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;
  slug: string;
  organisationId: string;
  metadata?: ProjectMetadata;
}
```

### RouterAdapter

```typescript
interface RouterAdapter {
  getCurrentPath(): string;
  navigateTo(path: string): void;
  buildPathForContext(
    ctx: ContextPathInfo,
    options?: PathBuildOptions
  ): string;
}
```

## Backend API Requirements

The package expects the following API endpoints to be available:

- `GET /api/v1/organisations` - List all organisations for current user
- `GET /api/v1/organisations/:orgSlug` - Get organisation details
- `GET /api/v1/organisations/:orgSlug/projects` - List projects in organisation
- `GET /api/v1/organisations/:orgSlug/projects/:projectSlug` - Get project details

All endpoints should return JSON and support cookie-based authentication (credentials: 'include').

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.
