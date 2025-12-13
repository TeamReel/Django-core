# ThemeProvider

React Context provider for theme management.

## Usage

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage } from '@django-core/theme-system/storage';

<ThemeProvider
  storage={new CookieStorage()}
  defaultMode="system"
  defaultBrand="default"
>
  <App />
</ThemeProvider>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | App content |
| `storage` | `ThemeStorage` | `undefined` | Persistence adapter |
| `defaultMode` | `ThemeMode` | `'system'` | Initial theme mode |
| `defaultBrand` | `BrandVariant` | `'default'` | Initial brand variant |

### ThemeMode

Type: `'light' | 'dark' | 'system'`

- `'light'`: Force light theme
- `'dark'`: Force dark theme
- `'system'`: Follows OS preference (default)

### BrandVariant

Type: `'default' | string`

Matches brand IDs defined in your brand configuration. See [Brand Customization Guide](../guides/brand-variants.md).

## Behavior

- Applies `data-theme` and `data-brand` attributes to `<html>` element
- Subscribes to system preference changes when `mode="system"`
- Loads persisted preference from storage on mount
- Persists changes via storage adapter (if provided)
- Provides `useTheme()` hook to descendant components

### Example: data-theme attributes

When mode is `'dark'` and brand is `'acme'`:

```html
<html data-theme="dark" data-brand="acme">
```

CSS can target these attributes:

```css
[data-theme="dark"] {
  /* Dark theme styles */
}

[data-brand="acme"] {
  /* ACME brand overrides */
}
```

## SSR Considerations

For server-side rendering without flash of unstyled content:

1. Use `<ThemeScript />` in document `<head>`
2. Optional: Pre-render with user's preference using `resolveServerTheme()`

See [SSR Guide](../guides/ssr.md) for zero-flash setup.

## Storage Adapters

The `storage` prop accepts any object implementing the `ThemeStorage` interface:

```typescript
interface ThemeStorage {
  load(): ThemePreference | null;
  save(preference: ThemePreference): void;
}
```

Built-in adapters:

- `CookieStorage` - Browser cookies (works with SSR)
- `LocalStorageAdapter` - Browser localStorage (client-only)
- `B12Adapter` - Sync to Django backend via B12 API
- `ComposedStorage` - Combine multiple adapters

See [Storage Adapters](./storage.md) for details.

## Examples

### Basic Usage

```tsx
import { ThemeProvider } from '@django-core/theme-system';

function App() {
  return (
    <ThemeProvider>
      <Content />
    </ThemeProvider>
  );
}
```

### With Cookie Persistence

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage } from '@django-core/theme-system/storage';

function App() {
  return (
    <ThemeProvider storage={new CookieStorage()}>
      <Content />
    </ThemeProvider>
  );
}
```

### Custom Default Brand

```tsx
import { ThemeProvider } from '@django-core/theme-system';

function App() {
  return (
    <ThemeProvider defaultBrand="acme">
      <Content />
    </ThemeProvider>
  );
}
```

### With Backend Sync (B12)

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage, B12Adapter, ComposedStorage } from '@django-core/theme-system/storage';
import { apiClient } from '@django-core/api-client';

const storage = new ComposedStorage([
  new CookieStorage(),
  new B12Adapter({ apiClient })
]);

function App() {
  return (
    <ThemeProvider storage={storage}>
      <Content />
    </ThemeProvider>
  );
}
```

## See Also

- [useTheme Hook](./useTheme.md)
- [Storage Adapters](./storage.md)
- [SSR Utilities](./ssr.md)
- [Integration Guides](../guides/)
