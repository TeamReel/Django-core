# @django-core/theme-system

Token-driven theming infrastructure for Django Core-App frontend with light/dark mode, brand variants, and SSR support.

## Features

- 🎨 **Semantic tokens** mapped to F01 design primitives
- 🌓 **Light/dark/system modes** with instant switching
- 🏢 **Brand variants** with hierarchical inheritance
- ⚡ **Zero-flash SSR** with Next.js and Django
- ♿ **WCAG 2.1 AA** contrast validation
- 📦 **Zero runtime overhead** (vanilla-extract CSS variables)

## Installation

```bash
pnpm add @django-core/theme-system @django-core/design-system
```

## Quick Start

### 1. Wrap your app with ThemeProvider

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage } from '@django-core/theme-system/storage';

function App() {
  return (
    <ThemeProvider storage={new CookieStorage()}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Add theme toggle

```tsx
import { ThemeToggle } from '@django-core/theme-system';

function Header() {
  return (
    <nav>
      <ThemeToggle variant="icon" />
    </nav>
  );
}
```

### 3. Use theme tokens in components

```tsx
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const card = style({
  backgroundColor: themeVars.color.bg.surface,
  color: themeVars.color.text.primary,
  borderRadius: themeVars.radius.md,
});
```

## API Reference

- [ThemeProvider](./docs/api/ThemeProvider.md)
- [useTheme Hook](./docs/api/useTheme.md)
- [Storage Adapters](./docs/api/storage.md)
- [SSR Utilities](./docs/api/ssr.md)
- [Theme Tokens](./docs/api/tokens.md)

## Integration Guides

- [Next.js App Router](./docs/guides/nextjs.md)
- [Django Templates](./docs/guides/django.md)
- [React SPA](./docs/guides/react-spa.md)
- [Brand Customization](./docs/guides/brand-variants.md)

## Examples

- [Basic Setup](../../examples/theme-basic/)
- [SSR with Next.js](../../examples/theme-nextjs/)
- [Custom Brand Variant](../../examples/theme-brand/)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
