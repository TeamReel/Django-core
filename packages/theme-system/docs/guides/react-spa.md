# React SPA Integration

Integrate theme system with client-side React single-page applications.

## Installation

```bash
pnpm add @django-core/theme-system @django-core/design-system
```

## Setup

### 1. Wrap app with ThemeProvider

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@django-core/theme-system';
import { LocalStorageAdapter } from '@django-core/theme-system/storage';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider storage={new LocalStorageAdapter()}>
    <App />
  </ThemeProvider>
);
```

### 2. Import theme CSS

```css
/* src/index.css */
@import '@django-core/theme-system/themes';
```

### 3. Add theme toggle

```tsx
// src/components/Header.tsx
import { ThemeToggle } from '@django-core/theme-system';

export function Header() {
  return (
    <header>
      <nav>
        <ThemeToggle variant="switch" />
      </nav>
    </header>
  );
}
```

## Using Theme Tokens

```typescript
// src/components/Card.css.ts
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const card = style({
  backgroundColor: themeVars.color.bg.surface,
  color: themeVars.color.text.primary,
  borderRadius: themeVars.radius.lg,
  padding: themeVars.spacing.lg,
  border: `1px solid ${themeVars.color.border.secondary}`,
  boxShadow: themeVars.shadow.md,
});
```

```tsx
// src/components/Card.tsx
import { card } from './Card.css';

export function Card({ children }: { children: React.ReactNode }) {
  return <div className={card}>{children}</div>;
}
```

## Storage Options

### localStorage (Recommended)

Persists theme across sessions:

```tsx
import { LocalStorageAdapter } from '@django-core/theme-system/storage';

<ThemeProvider storage={new LocalStorageAdapter()}>
```

### No Persistence

Theme resets on page reload:

```tsx
<ThemeProvider>
  {/* No storage prop */}
</ThemeProvider>
```

### Custom Storage

Implement your own storage:

```typescript
import type { ThemeStorage, ThemePreference } from '@django-core/theme-system';

class SessionStorageAdapter implements ThemeStorage {
  load(): ThemePreference | null {
    try {
      const data = sessionStorage.getItem('theme');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  save(preference: ThemePreference): void {
    try {
      sessionStorage.setItem('theme', JSON.stringify(preference));
    } catch {
      // Ignore storage errors
    }
  }
}

<ThemeProvider storage={new SessionStorageAdapter()}>
```

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
  ],
});
```

## Create React App Configuration

For CRA projects, you'll need to eject or use CRACO:

```bash
pnpm add @craco/craco @vanilla-extract/webpack-plugin
```

```javascript
// craco.config.js
const { VanillaExtractPlugin } = require('@vanilla-extract/webpack-plugin');

module.exports = {
  webpack: {
    plugins: [new VanillaExtractPlugin()],
  },
};
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  }
}
```

## Brand Switching

```tsx
// src/components/BrandSelector.tsx
import { useTheme } from '@django-core/theme-system';

export function BrandSelector() {
  const { brand, setTheme } = useTheme();

  return (
    <select
      value={brand}
      onChange={(e) => setTheme({ brand: e.target.value })}
    >
      <option value="default">Default</option>
      <option value="acme">ACME</option>
      <option value="globex">Globex</option>
    </select>
  );
}
```

## Theme-Aware Components

### Conditional Rendering

```tsx
import { useTheme } from '@django-core/theme-system';

export function Logo() {
  const { resolvedMode } = useTheme();

  return (
    <img
      src={resolvedMode === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
    />
  );
}
```

### Dynamic Styles

```tsx
import { useTheme } from '@django-core/theme-system';

export function CustomComponent() {
  const { resolvedMode } = useTheme();

  return (
    <div
      style={{
        // Avoid inline styles when possible; prefer theme tokens
        opacity: resolvedMode === 'dark' ? 0.9 : 1,
      }}
    >
      Content
    </div>
  );
}
```

**Note:** Prefer theme tokens over conditional logic for most styling needs.

## Troubleshooting

### Theme not persisting

Check localStorage is available:

```tsx
const storage = typeof window !== 'undefined' && window.localStorage
  ? new LocalStorageAdapter()
  : undefined;

<ThemeProvider storage={storage}>
```

### TypeScript errors

Ensure types are installed:

```bash
pnpm add -D @types/react @types/react-dom
```

### Build errors with vanilla-extract

Verify plugin is configured:

```typescript
// vite.config.ts
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
});
```

### Private browsing issues

localStorage may be disabled. Use fallback:

```tsx
import { LocalStorageAdapter, ComposedStorage } from '@django-core/theme-system/storage';

// Gracefully degrades if localStorage unavailable
const storage = new LocalStorageAdapter();

<ThemeProvider storage={storage}>
```

## Complete Example

See [examples/theme-basic/](../../../examples/theme-basic/) for a full working application.

## Next Steps

- [API Documentation](../api/)
- [Brand Customization](./brand-variants.md)
- [Troubleshooting Guide](../troubleshooting.md)
