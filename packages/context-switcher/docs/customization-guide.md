# Customization Guide

Learn how to customize the appearance, behavior, and functionality of `@django-core/context-switcher`.

## Table of Contents

- [Styling Components](#styling-components)
- [Custom Layouts](#custom-layouts)
- [Router Adapters](#router-adapters)
- [Search Behavior](#search-behavior)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Internationalization](#internationalization)
- [Custom Components](#custom-components)

---

## Styling Components

All components accept a `className` prop for custom styling.

### Using CSS Modules

```tsx
// styles.module.css
.customSwitcher {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 8px;
}

.customSwitcher:hover {
  background-color: #eeeeee;
}

// Component
import styles from './styles.module.css';

<ContextSwitcher variant="horizontal" className={styles.customSwitcher} />
```

### Using Tailwind CSS

```tsx
<ContextSwitcher
  variant="horizontal"
  className="bg-gray-100 rounded-lg px-4 py-2 hover:bg-gray-200"
/>
```

### Using vanilla-extract (Design System)

The context switcher is built with `@django-core/design-system`, which uses vanilla-extract:

```tsx
// styles.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '@django-core/design-system/theme';

export const customSwitcher = style({
  backgroundColor: vars.color.background.secondary,
  borderRadius: vars.borderRadius.md,
  padding: vars.spacing.sm,
  ':hover': {
    backgroundColor: vars.color.background.tertiary,
  },
});

// Component
import * as styles from './styles.css';

<ContextSwitcher variant="horizontal" className={styles.customSwitcher} />
```

### Styling Individual Components

```tsx
<div>
  <ContextIndicator
    className="custom-indicator"
    onClick={() => setPickerOpen(true)}
  />

  <OrganisationPicker
    isOpen={orgPickerOpen}
    onClose={() => setOrgPickerOpen(false)}
    className="custom-org-picker"
  />

  <ProjectPicker
    isOpen={projectPickerOpen}
    onClose={() => setProjectPickerOpen(false)}
    className="custom-project-picker"
  />
</div>
```

---

## Custom Layouts

### Horizontal Layout (Default)

Displays organisation and project side-by-side, ideal for headers:

```tsx
<ContextSwitcher variant="horizontal" />
```

### Vertical Layout

Stacks organisation and project vertically, ideal for sidebars:

```tsx
<ContextSwitcher variant="vertical" />
```

### Custom Layout with Individual Components

For complete layout control, compose individual components:

```tsx
import {
  ContextIndicator,
  OrganisationPicker,
  ProjectPicker,
  useContextSwitcher,
} from '@django-core/context-switcher';

function CustomContextSwitcher() {
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const { context } = useContextSwitcher();

  return (
    <div className="custom-layout">
      {/* Custom indicator */}
      <button
        onClick={() => setOrgPickerOpen(true)}
        className="org-button"
      >
        <Avatar src={context.organisation?.logo} />
        <span>{context.organisation?.name || 'Select organisation'}</span>
      </button>

      {/* Separator */}
      <span className="separator">/</span>

      {/* Project button */}
      <button
        onClick={() => setProjectPickerOpen(true)}
        disabled={!context.organisation}
        className="project-button"
      >
        {context.project?.name || 'Select project'}
      </button>

      {/* Pickers */}
      <OrganisationPicker
        isOpen={orgPickerOpen}
        onClose={() => setOrgPickerOpen(false)}
      />

      <ProjectPicker
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
      />
    </div>
  );
}
```

### Dropdown Menu Layout

```tsx
import { Menu } from '@headlessui/react';
import { useContextSwitcher } from '@django-core/context-switcher';

function DropdownContextSwitcher() {
  const { context, organisations, switchContext } = useContextSwitcher();

  return (
    <Menu as="div" className="relative">
      <Menu.Button>
        {context.organisation?.name || 'Select organisation'}
      </Menu.Button>

      <Menu.Items className="dropdown-menu">
        {organisations.map((org) => (
          <Menu.Item key={org.id}>
            {({ active }) => (
              <button
                onClick={() => switchContext(org)}
                className={active ? 'active' : ''}
              >
                {org.name}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
```

---

## Router Adapters

### Basic Adapter

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
```

### Preserving Deep Paths

Keep the user on the same sub-page after switching context:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context, options) => {
    const basePath = context.projectSlug
      ? `/${context.orgSlug}/${context.projectSlug}`
      : `/${context.orgSlug}`;

    // Extract current sub-path (e.g., /settings/members)
    const currentPath = location.pathname;
    const segments = currentPath.split('/').filter(Boolean);
    const subPath = segments.slice(2).join('/'); // Skip org and project

    if (subPath && !options?.replace) {
      return `${basePath}/${subPath}`;
    }

    return basePath;
  },
};
```

### Query Parameter Preservation

Preserve query parameters across context switches:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname + location.search,
  navigateTo: (path) => {
    const [pathname, search] = path.split('?');
    navigate(pathname, { search });
  },
  buildPathForContext: (context, options) => {
    const basePath = context.projectSlug
      ? `/${context.orgSlug}/${context.projectSlug}`
      : `/${context.orgSlug}`;

    // Preserve query params
    const queryParams = new URLSearchParams(location.search);
    const queryString = queryParams.toString();

    return queryString ? `${basePath}?${queryString}` : basePath;
  },
};
```

### Hash Routing

For applications using hash-based routing:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.hash.slice(1), // Remove '#'
  navigateTo: (path) => {
    location.hash = path;
  },
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  },
};
```

### Custom Domain Routing

Route organisations to subdomains:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => {
    window.location.href = path; // Full page reload for domain change
  },
  buildPathForContext: (context) => {
    const protocol = location.protocol;
    const baseDomain = 'example.com';

    if (context.projectSlug) {
      return `${protocol}//${context.orgSlug}.${baseDomain}/projects/${context.projectSlug}`;
    }

    return `${protocol}//${context.orgSlug}.${baseDomain}`;
  },
};
```

---

## Search Behavior

### Custom Debounce Delay

The default debounce delay is 300ms. You can customize this by creating your own search component:

```tsx
import { useState, useMemo } from 'react';
import { useDebouncedValue, useContextSwitcher } from '@django-core/context-switcher';

function CustomOrganisationPicker() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 500); // 500ms delay
  const { organisations } = useContextSwitcher();

  const filteredOrgs = useMemo(() => {
    if (!debouncedSearch) return organisations;

    return organisations.filter((org) =>
      org.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [organisations, debouncedSearch]);

  return (
    <div>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search organisations..."
      />

      <ul>
        {filteredOrgs.map((org) => (
          <li key={org.id}>{org.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Custom Search Algorithm

Implement fuzzy search or advanced filtering:

```tsx
import Fuse from 'fuse.js';

function FuzzyOrganisationPicker() {
  const [searchTerm, setSearchTerm] = useState('');
  const { organisations } = useContextSwitcher();

  const fuse = useMemo(
    () =>
      new Fuse(organisations, {
        keys: ['name', 'slug'],
        threshold: 0.3,
      }),
    [organisations]
  );

  const filteredOrgs = useMemo(() => {
    if (!searchTerm) return organisations;
    return fuse.search(searchTerm).map((result) => result.item);
  }, [searchTerm, fuse, organisations]);

  return (
    <div>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search organisations..."
      />

      <ul>
        {filteredOrgs.map((org) => (
          <li key={org.id}>{org.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Keyboard Shortcuts

### Custom Shortcut

Change the default `Cmd/Ctrl+K` shortcut:

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    keyboardShortcut: 'Control+Shift+O', // Ctrl+Shift+O
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Disable Keyboard Shortcuts

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    disableKeyboardShortcut: true,
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Multiple Shortcuts

Use the `useKeyboardShortcut` hook to add custom shortcuts:

```tsx
import { useKeyboardShortcut } from '@django-core/context-switcher';

function MyComponent() {
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  // Cmd/Ctrl+O for organisations
  useKeyboardShortcut(['Meta', 'o'], () => {
    setOrgPickerOpen(true);
  });

  // Cmd/Ctrl+P for projects
  useKeyboardShortcut(['Meta', 'p'], () => {
    setProjectPickerOpen(true);
  });

  return (
    <>
      <OrganisationPicker
        isOpen={orgPickerOpen}
        onClose={() => setOrgPickerOpen(false)}
      />
      <ProjectPicker
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
      />
    </>
  );
}
```

---

## Internationalization

### Custom Labels

Provide translated labels:

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    labels: {
      selectOrganisation: 'Seleccionar organización',
      selectProject: 'Seleccionar proyecto',
      searchPlaceholder: 'Buscar...',
      noResults: 'No se encontraron resultados',
      loading: 'Cargando...',
      error: 'Error al cargar',
      switchToOrganisation: 'Cambiar a organización',
      switchToProject: 'Cambiar a proyecto',
    },
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Using i18next

```tsx
import { useTranslation } from 'react-i18next';

function LocalizedContextSwitcher() {
  const { t } = useTranslation();

  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: '/api',
        labels: {
          selectOrganisation: t('context.selectOrganisation'),
          selectProject: t('context.selectProject'),
          searchPlaceholder: t('context.search'),
          noResults: t('context.noResults'),
          loading: t('context.loading'),
          error: t('context.error'),
        },
      }}
    >
      {children}
    </ContextSwitcherProvider>
  );
}
```

### Using react-intl

```tsx
import { useIntl } from 'react-intl';

function LocalizedContextSwitcher() {
  const intl = useIntl();

  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: '/api',
        labels: {
          selectOrganisation: intl.formatMessage({ id: 'context.selectOrganisation' }),
          selectProject: intl.formatMessage({ id: 'context.selectProject' }),
          searchPlaceholder: intl.formatMessage({ id: 'context.search' }),
          noResults: intl.formatMessage({ id: 'context.noResults' }),
          loading: intl.formatMessage({ id: 'context.loading' }),
          error: intl.formatMessage({ id: 'context.error' }),
        },
      }}
    >
      {children}
    </ContextSwitcherProvider>
  );
}
```

---

## Custom Components

### Custom Context Indicator

Replace the default indicator with your own:

```tsx
import { useContextSwitcher } from '@django-core/context-switcher';

function CustomIndicator({ onClick }: { onClick: () => void }) {
  const { context } = useContextSwitcher();

  if (context.isLoading) {
    return <Skeleton width={200} height={40} />;
  }

  return (
    <button onClick={onClick} className="custom-indicator">
      <Avatar src={context.organisation?.logo} size="sm" />
      <div className="context-info">
        <span className="org-name">{context.organisation?.name}</span>
        {context.project && (
          <>
            <span className="separator">›</span>
            <span className="project-name">{context.project.name}</span>
          </>
        )}
      </div>
      <ChevronDownIcon />
    </button>
  );
}

// Usage
function App() {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <ContextSwitcherProvider config={{ routerAdapter, apiBaseUrl: '/api' }}>
      <header>
        <CustomIndicator onClick={() => setPickerOpen(true)} />
        <OrganisationPicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      </header>
    </ContextSwitcherProvider>
  );
}
```

### Custom Organisation List Item

```tsx
import { Organisation, useContextSwitcher } from '@django-core/context-switcher';

function OrganisationListItem({
  organisation,
  onSelect,
}: {
  organisation: Organisation;
  onSelect: () => void;
}) {
  const { context } = useContextSwitcher();
  const isActive = context.organisation?.id === organisation.id;

  return (
    <button
      onClick={onSelect}
      className={`org-item ${isActive ? 'active' : ''}`}
    >
      <Avatar src={organisation.logo} size="md" />
      <div className="org-info">
        <span className="org-name">{organisation.name}</span>
        <span className="org-slug">@{organisation.slug}</span>
      </div>
      {isActive && <CheckIcon />}
    </button>
  );
}
```

### Custom Picker Modal

Replace the entire picker with your own modal:

```tsx
import { Dialog } from '@headlessui/react';
import { useContextSwitcher } from '@django-core/context-switcher';

function CustomOrganisationPicker({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { organisations, switchContext } = useContextSwitcher();
  const [search, setSearch] = useState('');

  const filteredOrgs = organisations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <Dialog.Overlay className="modal-overlay" />

      <Dialog.Panel className="modal-panel">
        <Dialog.Title>Select Organisation</Dialog.Title>

        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="org-grid">
          {filteredOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                switchContext(org);
                onClose();
              }}
              className="org-card"
            >
              <Avatar src={org.logo} size="lg" />
              <span>{org.name}</span>
            </button>
          ))}
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
```

---

## Next Steps

- **[Integration Guide](./integration-guide.md)** - Framework-specific integration
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions
- **[Architecture Decision Records](./adr/)** - Key design decisions
