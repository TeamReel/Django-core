# @django-core/context-switcher

Multi-tenancy context switcher for Django Core frontend applications.

## Features

- 🏢 **Organisation & Project Switching** - Seamlessly switch between organisations and their projects
- 🔍 **Smart Search** - Debounced search input (300ms) for filtering large lists
- ⚡ **Virtualized Lists** - Efficiently render 1000+ items with automatic virtualization
- ⌨️ **Keyboard Shortcuts** - Quick access with Cmd/Ctrl+K
- ♿ **Fully Accessible** - WCAG 2.1 AA compliant with comprehensive keyboard navigation
- 🎨 **Design System Integration** - Built 100% with @django-core/design-system components
- 🧪 **Well Tested** - 90%+ test coverage with unit, integration, and accessibility tests
- 🔄 **URL Synchronization** - Automatic URL updates and persistence via router adapters

## Installation

```bash
pnpm add @django-core/context-switcher @django-core/api-client @django-core/design-system
```

**Peer dependencies:**
```bash
pnpm add react@^18.0.0 react-dom@^18.0.0
```

## Quick Start

### React Router v6

```tsx
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: '/api',
      }}
    >
      <header>
        <ContextSwitcher variant="horizontal" />
      </header>
      <main>{/* Your app content */}</main>
    </ContextSwitcherProvider>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
```

### Next.js App Router

```tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <html lang="en">
      <body>
        <ContextSwitcherProvider
          config={{
            routerAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <header>
            <ContextSwitcher variant="horizontal" />
          </header>
          <main>{children}</main>
        </ContextSwitcherProvider>
      </body>
    </html>
  );
}

```

## API Reference

### ContextSwitcherProvider

The root provider component that manages context state and provides it to child components.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `ContextSwitcherConfig` | Yes | Configuration object |
| `config.routerAdapter` | `RouterAdapter` | Yes | Router integration adapter |
| `config.apiBaseUrl` | `string` | No | API base URL (default: `/api`) |
| `config.onContextChanged` | `(context) => void` | No | Callback when context changes |
| `config.onBeforeContextChange` | `(context) => boolean` | No | Callback before change (return false to cancel) |
| `children` | `React.ReactNode` | Yes | Child components |

**Example:**

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    onContextChanged: (context) => {
      console.log('Context changed:', context);
    },
  }}
>
  {children}
</ContextSwitcherProvider>
```

### ContextSwitcher

The main UI component that displays both organisation and project pickers.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `'horizontal' \| 'vertical'` | No | Layout direction (default: `'horizontal'`) |
| `className` | `string` | No | Custom CSS class |

**Example:**

```tsx
<ContextSwitcher variant="horizontal" className="my-custom-class" />
```

### ContextIndicator

Displays the current context with a loading skeleton state.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClick` | `() => void` | No | Click handler |
| `className` | `string` | No | Custom CSS class |

**Example:**

```tsx
<ContextIndicator onClick={() => setPickerOpen(true)} />
```

### OrganisationPicker

Modal picker for selecting an organisation.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Close callback |
| `className` | `string` | No | Custom CSS class |

**Example:**

```tsx
<OrganisationPicker
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### ProjectPicker

Modal picker for selecting a project within the current organisation.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Close callback |
| `className` | `string` | No | Custom CSS class |

**Example:**

```tsx
<ProjectPicker
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

## Hooks

### useContextSwitcher

Access context state and switching functions.

**Returns:**

```typescript
{
  context: {
    organisation: Organisation | null;
    project: Project | null;
    isLoading: boolean;
    error: Error | null;
  };
  organisations: Organisation[];
  projects: Project[];
  switchContext: (org: Organisation, project?: Project | null) => Promise<void>;
  isSwitching: boolean;
  refresh: () => Promise<void>;
}
```

**Example:**

```tsx
function MyComponent() {
  const { context, organisations, switchContext } = useContextSwitcher();

  return (
    <div>
      <p>Current org: {context.organisation?.name}</p>
      <button onClick={() => switchContext(organisations[0])}>
        Switch to {organisations[0].name}
      </button>
    </div>
  );
}
```

### useDebouncedValue

Debounce a value with a specified delay (used internally for search).

**Parameters:**
- `value: T` - Value to debounce
- `delay: number` - Delay in milliseconds (default: 300)

**Returns:** Debounced value

**Example:**

```tsx
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    // This only runs 300ms after user stops typing
    console.log('Searching for:', debouncedSearch);
  }, [debouncedSearch]);

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

### useKeyboardShortcut

Register a keyboard shortcut handler (used internally for Cmd/Ctrl+K).

**Parameters:**
- `keys: string[]` - Key combination (e.g., `['Meta', 'k']`)
- `callback: () => void` - Function to call when shortcut is pressed
- `options?: KeyboardShortcutOptions` - Optional configuration

**Example:**

```tsx
function MyComponent() {
  useKeyboardShortcut(['Meta', 'k'], () => {
    console.log('Cmd+K pressed!');
  });

  return <div>Press Cmd+K</div>;
}
```

## Router Adapters

The context switcher requires a router adapter to synchronize state with the URL. Implement the `RouterAdapter` interface:

```typescript
interface RouterAdapter {
  getCurrentPath(): string;
  navigateTo(path: string): void;
  buildPathForContext(context: {
    orgSlug: string;
    projectSlug?: string | null;
  }, options?: { replace?: boolean }): string;
}
```

### React Router v6

```tsx
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

```tsx
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

### Custom / Legacy

For server-rendered Django templates or other frameworks:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => window.location.pathname,
  navigateTo: (path) => {
    window.location.href = path;
  },
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/orgs/${context.orgSlug}/projects/${context.projectSlug}/`;
    }
    return `/orgs/${context.orgSlug}/`;
  },
};
```

## Backend API Requirements

The context switcher expects the following API endpoints:

### GET /api/organisations/

Returns list of organisations the user has access to.

**Response:**
```json
{
  "organisations": [
    {
      "id": "org_123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "logo": "https://example.com/logo.png",
      "metadata": {
        "isPinned": false
      }
    }
  ]
}
```

### GET /api/organisations/:orgId/projects/

Returns list of projects within an organisation.

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_456",
      "name": "Website Redesign",
      "slug": "website-redesign",
      "organisationId": "org_123",
      "metadata": {
        "isArchived": false
      }
    }
  ]
}
```

### GET /api/context/ (Optional)

Returns the current context from the backend session.

**Response:**
```json
{
  "organisation": {
    "id": "org_123",
    "name": "Acme Corp",
    "slug": "acme-corp"
  },
  "project": {
    "id": "proj_456",
    "name": "Website Redesign",
    "slug": "website-redesign",
    "organisationId": "org_123"
  }
}
```

### POST /api/context/ (Optional)

Saves the current context to the backend session.

**Request:**
```json
{
  "organisationId": "org_123",
  "projectId": "proj_456"
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open organisation picker |
| `Escape` | Close picker |
| `↑` / `↓` | Navigate list items |
| `Enter` | Select highlighted item |
| `Tab` | Focus search input (when picker open) |

## Examples

See the [`examples/`](./examples) directory for complete working examples:

- **[React Router](./examples/react-router/)** - Full React Router v6 integration
- **[Next.js](./examples/nextjs/)** - Next.js 14+ App Router integration

## Documentation

- **[Integration Guide](./docs/integration-guide.md)** - Detailed integration instructions for various frameworks
- **[Customization Guide](./docs/customization-guide.md)** - Styling and behavior customization
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Testing Guide](./TESTING.md)** - Running and writing tests
- **[Architecture Decision Records](./docs/adr/)** - Key design decisions

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

- Safari (latest 2 versions)

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Support

- **Issues**: [GitHub Issues](https://github.com/TeamReel/django-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TeamReel/django-core/discussions)
- **Email**: support@teamreel.app
