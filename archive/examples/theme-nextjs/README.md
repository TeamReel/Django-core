# Theme System Next.js Example

Complete Next.js App Router example with SSR and zero-flash theme initialization.

## Status

⚠️ **Placeholder** - Full working example deferred to post-release.

## Planned Features

- Next.js 14+ App Router
- Zero-flash SSR with ThemeScript
- Cookie-based persistence
- Theme toggle in header
- Brand switching demonstration
- Server-side theme detection

## Quick Reference

For now, refer to integration guide:

- [Next.js Integration Guide](../../packages/theme-system/docs/guides/nextjs.md)
- [SSR Utilities](../../packages/theme-system/docs/api/ssr.md)

## Expected Structure

```
theme-nextjs/
├── package.json
├── next.config.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── components/
│       ├── Header.tsx
│       └── Card.tsx
└── README.md
```

## Setup (Future)

```bash
cd examples/theme-nextjs
pnpm install
pnpm dev
```

## Key Integration Points

### app/layout.tsx

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { ThemeScript } from '@django-core/theme-system/ssr';
import { CookieStorage } from '@django-core/theme-system/storage';

export default function RootLayout({ children }) {
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

## Related

- [Basic Example](../theme-basic/)
- [Brand Customization Example](../theme-brand/)
