# SSR Utilities

Server-side rendering utilities for zero-flash theme initialization.

## Overview

SSR utilities prevent "flash of unstyled content" (FOUC) by:

1. Applying theme attributes before React hydration
2. Reading user preference from cookies server-side
3. Pre-rendering with correct theme state

## Components

### ThemeScript

Inline script that applies theme attributes before React loads.

```tsx
import { ThemeScript } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**What it does:**
1. Reads `django_theme_pref` cookie
2. Resolves `'system'` mode to actual `'light'` or `'dark'`
3. Applies `data-theme` and `data-brand` attributes to `<html>`
4. Executes **before** React hydration (blocking script)

**Size:** ~800 bytes (minified, inlined)

**Example Output:**

```html
<script>
(function() {
  try {
    var cookie = document.cookie.match(/(^| )django_theme_pref=([^;]+)/);
    if (cookie) {
      var pref = JSON.parse(decodeURIComponent(cookie[2]));
      var mode = pref.mode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : pref.mode;
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.setAttribute('data-brand', pref.brand || 'default');
    }
  } catch (e) {}
})();
</script>
```

**Requirements:**
- Must be in `<head>` (before body renders)
- Must be **before** any theme-dependent CSS

### suppressHydrationWarning

Required on `<html>` tag to suppress React hydration warnings when theme attributes are applied by ThemeScript:

```tsx
<html suppressHydrationWarning>
```

This tells React to ignore mismatches on the `<html>` element's attributes during hydration.

## Functions

### resolveServerTheme(cookieValue)

Parses theme preference cookie and resolves mode.

```typescript
import { resolveServerTheme } from '@django-core/theme-system/ssr';

const preference = resolveServerTheme(cookieValue);
// Returns: { mode: 'light' | 'dark' | 'system', brand: string } | null
```

**Parameters:**
- `cookieValue` - Raw cookie value string or `null`

**Returns:**
- `ThemePreference | null` - Parsed preference or null if invalid

**Example with Next.js:**

```tsx
import { cookies } from 'next/headers';
import { resolveServerTheme } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const theme = resolveServerTheme(
    cookieStore.get('django_theme_pref')?.value ?? null
  );

  return (
    <html
      data-theme={theme?.mode === 'system' ? 'light' : theme?.mode ?? 'light'}
      data-brand={theme?.brand ?? 'default'}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Note:** Server-side can't detect OS preference, so `'system'` defaults to `'light'`. ThemeScript will correct this client-side before paint.

## Integration Examples

### Next.js App Router

```tsx
// app/layout.tsx
import { ThemeProvider } from '@django-core/theme-system';
import { ThemeScript } from '@django-core/theme-system/ssr';
import { CookieStorage } from '@django-core/theme-system/storage';

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

### Next.js Pages Router

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

### Django Templates

```django
{# templates/base.html #}
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Theme initialization (before React) -->
  <script>
  (function() {
    try {
      var cookie = document.cookie.match(/(^| )django_theme_pref=([^;]+)/);
      if (cookie) {
        var pref = JSON.parse(decodeURIComponent(cookie[2]));
        var mode = pref.mode === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : pref.mode;
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.setAttribute('data-brand', pref.brand || 'default');
      }
    } catch (e) {}
  })();
  </script>

  <!-- Theme CSS -->
  <link rel="stylesheet" href="{% static 'theme-system/themes.css' %}">
</head>
<body>
  <div id="root">{% block content %}{% endblock %}</div>
  <script src="{% static 'app.js' %}"></script>
</body>
</html>
```

## Troubleshooting

### Flash of Wrong Theme

**Symptom:** Page briefly shows wrong theme, then switches.

**Causes:**
1. `<ThemeScript />` not in `<head>`
2. Script executes after body renders
3. CSS loaded before script executes

**Solution:**
- Move `<ThemeScript />` to top of `<head>`
- Ensure script is **blocking** (not async/defer)
- Load theme CSS after script

### Hydration Mismatch Warnings

**Symptom:** React console warnings about server/client HTML mismatch.

**Cause:** Server renders default theme, client has different preference.

**Solution:**
- Add `suppressHydrationWarning` to `<html>` tag
- Use `resolveServerTheme()` to pre-render server-side

### System Mode Not Detected Server-Side

**Symptom:** Server always renders light theme when mode is `'system'`.

**Expected behavior:** Server can't detect OS preference. ThemeScript corrects client-side before paint.

**Solution:** This is intentional. No action needed.

## Performance

**ThemeScript Impact:**
- Size: ~800 bytes (minified)
- Execution time: <1ms
- Blocking: Yes (intentional, prevents FOUC)

**Best Practices:**
- Keep ThemeScript first in `<head>` (minimize delay to paint)
- Inline (don't load as external script)
- Minify in production builds

## Security

**CSP Compatibility:**

If using Content Security Policy with `script-src` directive:

```tsx
// Add nonce to ThemeScript
<ThemeScript nonce={nonce} />
```

Then set CSP header:

```
Content-Security-Policy: script-src 'nonce-{nonce}'
```

**Cookie Security:**

ThemeScript reads cookies client-side. Ensure `django_theme_pref` cookie:
- Uses `httpOnly: false` (must be readable by JavaScript)
- Uses `secure: true` in production (HTTPS only)
- Uses `sameSite: 'lax'` or `'strict'` (CSRF protection)

## See Also

- [ThemeProvider](./ThemeProvider.md)
- [Storage Adapters](./storage.md)
- [Next.js Integration Guide](../guides/nextjs.md)
- [Django Integration Guide](../guides/django.md)
