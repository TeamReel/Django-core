# Troubleshooting

Common issues and solutions for @django-core/theme-system.

## Flash of Unstyled Content (FOUC)

**Symptom**: Page loads with wrong theme, then flickers to correct theme.

**Cause**: Theme script not executed before React hydration.

**Solution**:

- Ensure `<ThemeScript />` in `<head>` (Next.js)
- Verify inline script before `</head>` (Django)
- Add `suppressHydrationWarning` to `<html>`

```tsx
<html suppressHydrationWarning>
  <head>
    <ThemeScript /> {/* Must be here */}
  </head>
</html>
```

## Hydration Mismatch Warnings

**Symptom**: React console warnings about server/client mismatch.

**Cause**: SSR renders different theme than client expects.

**Solution**:

- Use `resolveServerTheme()` to read cookie server-side
- Pre-render with correct `data-theme` attribute

```tsx
const theme = resolveServerTheme(cookies().get('django_theme_pref')?.value);
return <html data-theme={theme?.mode ?? 'light'} suppressHydrationWarning>;
```

## Storage Not Persisting

**Symptom**: Theme resets on page reload.

**Cause**: Storage adapter not configured or failing silently.

**Solution**:

- Pass `storage` prop to `<ThemeProvider>`
- Check browser console for storage errors
- Verify cookie/localStorage available

```tsx
<ThemeProvider storage={new CookieStorage()}>
```

## TypeScript Errors with themeVars

**Symptom**: `Property 'color' does not exist on type...`

**Cause**: vanilla-extract types not properly exported.

**Solution**:

- Ensure `@vanilla-extract/css` installed
- Import from correct path: `import { themeVars } from '@django-core/theme-system'`

```bash
pnpm add @vanilla-extract/css
```

## Build Fails with Contrast Violations

**Symptom**: `❌ Theme contrast validation failed`

**Cause**: Custom tokens don't meet WCAG 2.1 AA ratios.

**Solution**:

- Run `pnpm validate-theme <file.json>` to identify pairs
- Use darker shades for text, lighter for backgrounds
- See contrast suggestions in validation output

```bash
pnpm validate-theme src/themes/brands/acme.json
```

Example fix:

```typescript
// Before (failed validation)
export const brand = {
  overrides: {
    color: {
      text: {
        secondary: '#9ca3af', // ❌ 3.2:1 ratio
      },
    },
  },
};

// After (passes validation)
export const brand = {
  overrides: {
    color: {
      text: {
        secondary: '#6c757d', // ✅ 4.7:1 ratio
      },
    },
  },
};
```

## System Mode Not Updating

**Symptom**: Theme doesn't change when OS dark mode toggled.

**Cause**: Media query listener not subscribed.

**Solution**:

- Set `mode="system"` (not `"light"` or `"dark"`)
- Verify `prefers-color-scheme` media query supported (check browser compatibility)

```tsx
<ThemeProvider defaultMode="system"> {/* Not "light" or "dark" */}
```

## Cookie Not Readable Server-Side

**Symptom**: Server always renders default theme.

**Cause**: Cookie settings prevent server access.

**Solution**:

- Ensure `httpOnly: false` (must be readable by JavaScript)
- Check `sameSite` and `secure` settings

```tsx
const storage = new CookieStorage({
  httpOnly: false,  // ✅ Required for client read
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
});
```

## Theme CSS Not Loading

**Symptom**: No styling, or styles missing.

**Cause**: Theme CSS not imported.

**Solution**:

Import theme CSS in your entry file:

```css
/* globals.css or index.css */
@import '@django-core/theme-system/themes';
```

Or in Next.js App Router:

```tsx
// app/layout.tsx
import '@django-core/theme-system/themes';
```

## Contrast Validation Errors on Build

**Symptom**: Build fails with contrast ratio errors.

**Cause**: Theme tokens violate WCAG 2.1 AA standards.

**Solution**:

1. Identify failing pairs:

```bash
pnpm validate-theme src/themes/my-theme.json
```

2. Review output:

```
✗ text.secondary on bg.surface: 3.2:1 (expected 4.5:1 for normal text)
  Suggestion: Use #6c757d instead of #9ca3af
```

3. Update token values:

```typescript
overrides: {
  color: {
    text: {
      secondary: '#6c757d', // ✅ Fixed
    },
  },
}
```

4. Re-run validation:

```bash
pnpm validate-theme src/themes/my-theme.json
# ✅ Theme contrast validation passed
```

## Vite Build Errors

**Symptom**: Build fails with vanilla-extract errors.

**Cause**: Plugin not configured.

**Solution**:

Add vanilla-extract plugin to Vite config:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
});
```

Install dependencies:

```bash
pnpm add -D @vanilla-extract/vite-plugin
```

## CSP Violations

**Symptom**: Browser blocks inline theme script.

**Cause**: Content Security Policy restricts inline scripts.

**Solution**:

Add nonce to ThemeScript:

```tsx
<ThemeScript nonce={nonce} />
```

Set CSP header:

```
Content-Security-Policy: script-src 'nonce-{nonce}'
```

Or for Django templates:

```django
<script nonce="{{ request.csp_nonce }}">
(function() {
  // ... theme script
})();
</script>
```

## Theme Toggle Not Working

**Symptom**: Clicking theme toggle has no effect.

**Cause**: ThemeToggle not inside ThemeProvider.

**Solution**:

Ensure ThemeToggle is a descendant of ThemeProvider:

```tsx
<ThemeProvider>
  <Header>
    <ThemeToggle /> {/* ✅ Works */}
  </Header>
</ThemeProvider>

// ❌ Won't work
<ThemeToggle /> {/* Outside ThemeProvider */}
<ThemeProvider>
  <App />
</ThemeProvider>
```

## Private Browsing Issues

**Symptom**: Theme doesn't persist in Safari Private Browsing.

**Cause**: localStorage unavailable in private mode.

**Solution**:

LocalStorageAdapter gracefully degrades. Use CookieStorage instead:

```tsx
const storage = new CookieStorage(); // ✅ Works in private browsing

<ThemeProvider storage={storage}>
```

## B12Adapter Authentication Errors

**Symptom**: `401 Unauthorized` when using B12Adapter.

**Cause**: User not authenticated or CSRF token missing.

**Solution**:

Ensure user is authenticated:

```tsx
import { apiClient } from '@django-core/api-client';

// apiClient automatically handles auth and CSRF
const storage = new B12Adapter({ apiClient });
```

Verify backend endpoints require authentication:

```python
# backend/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated]) # ✅ Required
def user_preferences(request):
    # ...
```

## Need More Help?

- Check [API documentation](./api/)
- Review [examples](../../examples/)
- Search [GitHub issues](https://github.com/django-core/django-core/issues)
- Open new issue: https://github.com/django-core/django-core/issues/new
