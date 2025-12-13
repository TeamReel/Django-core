# Next.js App Router Integration

Complete guide for zero-flash theming in Next.js 13+ with App Router.

## Installation

```bash
pnpm add @django-core/theme-system @django-core/design-system
```

## Setup

### 1. Create root layout with ThemeScript

```tsx
// app/layout.tsx
import { ThemeProvider } from '@django-core/theme-system';
import { ThemeScript } from '@django-core/theme-system/ssr';
import { CookieStorage } from '@django-core/theme-system/storage';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider storage={new CookieStorage()}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Import theme CSS

```css
/* app/globals.css */
@import '@django-core/theme-system/themes';
```

### 3. Add theme toggle

```tsx
// components/Header.tsx
import { ThemeToggle } from '@django-core/theme-system';

export function Header() {
  return (
    <header>
      <nav>
        <ThemeToggle variant="dropdown" />
      </nav>
    </header>
  );
}
```

## Server-Side Theme Detection

Optionally pre-render with user's theme:

```tsx
// app/layout.tsx
import { cookies } from 'next/headers';
import { resolveServerTheme } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const theme = resolveServerTheme(cookieStore.get('django_theme_pref')?.value ?? null);

  return (
    <html
      data-theme={theme?.mode === 'system' ? 'light' : theme?.mode ?? 'light'}
      data-brand={theme?.brand ?? 'default'}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider storage={new CookieStorage()}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Note:** Server can't detect OS preference, so `'system'` defaults to `'light'`. ThemeScript corrects this client-side before paint.

## Pages Router (Next.js 12+)

For older Pages Router:

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';
import { ThemeScript } from '@django-core/theme-system/ssr';

export default function Document() {
  return (
    <Html suppressHydrationWarning>
      <Head>
        <ThemeScript />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage } from '@django-core/theme-system/storage';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider storage={new CookieStorage()}>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
```

## Using Theme Tokens

```typescript
// components/Card.css.ts
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
// components/Card.tsx
import { card } from './Card.css';

export function Card({ children }: { children: React.ReactNode }) {
  return <div className={card}>{children}</div>;
}
```

## Brand Switching

```tsx
// components/BrandSelector.tsx
'use client';

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

## Troubleshooting

### Hydration warnings

Ensure `suppressHydrationWarning` on `<html>`:

```tsx
<html suppressHydrationWarning>
```

### Flash of wrong theme

Verify `<ThemeScript />` in `<head>`:

```tsx
<head>
  <ThemeScript />
</head>
```

### Cookies not persisting

Check SameSite/Secure settings:

```tsx
const storage = new CookieStorage({
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
});
```

### TypeScript errors

Ensure `@vanilla-extract/css` installed:

```bash
pnpm add @vanilla-extract/css
```

## Complete Example

See [examples/theme-nextjs/](../../../examples/theme-nextjs/) for a full working application.

## Next Steps

- [API Documentation](../api/)
- [Brand Customization](./brand-variants.md)
- [Troubleshooting Guide](../troubleshooting.md)
