# Django Templates Integration

Integrate theme system with Django server-rendered templates.

## Installation

```bash
pnpm add @django-core/theme-system @django-core/design-system
```

## Setup

### 1. Add theme script to base template

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

  <!-- React app bundle -->
  <script src="{% static 'app.js' %}"></script>
</body>
</html>
```

### 2. Wrap React root with ThemeProvider

```tsx
// frontend/src/index.tsx
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@django-core/theme-system';
import { CookieStorage } from '@django-core/theme-system/storage';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider storage={new CookieStorage()}>
    <App />
  </ThemeProvider>
);
```

### 3. Add theme toggle in React components

```tsx
// frontend/src/components/Header.tsx
import { ThemeToggle } from '@django-core/theme-system';

export function Header() {
  return (
    <header>
      <ThemeToggle variant="icon" />
    </header>
  );
}
```

## Backend Integration (B12)

Optional: Sync theme preference to Django backend.

```tsx
// frontend/src/index.tsx
import { B12Adapter } from '@django-core/theme-system/storage';
import { ComposedStorage } from '@django-core/theme-system/storage';
import { apiClient } from '@django-core/api-client';

const storage = new ComposedStorage([
  new CookieStorage(),
  new B12Adapter({ apiClient })
]);

<ThemeProvider storage={storage}>
  <App />
</ThemeProvider>
```

### Django Backend Setup (B12)

If using B12Adapter, implement preference endpoints:

```python
# backend/apps/users/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET', 'PUT'])
def user_preferences(request):
    """User preference API (B12 compatible)."""
    if request.method == 'GET':
        # Load preferences from user model
        prefs = request.user.preferences or {}
        return Response({
            'theme': prefs.get('theme', {'mode': 'system', 'brand': 'default'})
        })

    if request.method == 'PUT':
        # Save preferences to user model
        theme = request.data.get('theme', {})
        request.user.preferences = {
            **(request.user.preferences or {}),
            'theme': theme
        }
        request.user.save()
        return Response({'theme': theme})
```

```python
# backend/urls.py
urlpatterns = [
    path('api/v1/user-preferences/', user_preferences),
]
```

## Using Theme Tokens

```typescript
// frontend/src/components/Card.css.ts
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
// frontend/src/components/Card.tsx
import { card } from './Card.css';

export function Card({ children }: { children: React.ReactNode }) {
  return <div className={card}>{children}</div>;
}
```

## Static Files Configuration

### Vite Build

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
});
```

### Django Static Files

```python
# backend/settings.py
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

Build and collect:

```bash
cd frontend
pnpm build

cd ../backend
python manage.py collectstatic --noinput
```

## Content Security Policy (CSP)

If using CSP, add nonce to inline script:

```django
{# templates/base.html #}
<head>
  <script nonce="{{ request.csp_nonce }}">
  (function() {
    // ... theme script
  })();
  </script>
</head>
```

```python
# backend/middleware.py
import secrets

class CSPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        nonce = secrets.token_urlsafe(16)
        request.csp_nonce = nonce
        response = self.get_response(request)
        response['Content-Security-Policy'] = f"script-src 'nonce-{nonce}'"
        return response
```

## Troubleshooting

### Theme not applied

Check cookie name matches (`django_theme_pref`):

```tsx
const storage = new CookieStorage({
  cookieName: 'django_theme_pref', // Must match script
});
```

### CSP violations

Add nonce to inline script (see above).

### Static files missing

Run `collectstatic` after build:

```bash
pnpm build
python manage.py collectstatic --noinput
```

### Theme resets on page navigation

Ensure cookies persist:

```tsx
const storage = new CookieStorage({
  maxAge: 365 * 24 * 60 * 60, // 1 year
  sameSite: 'lax',
});
```

## Complete Example

See [examples/theme-django/](../../../examples/theme-django/) for a full working application.

## Next Steps

- [API Documentation](../api/)
- [Brand Customization](./brand-variants.md)
- [B12 Backend Integration](./b12-backend.md)
- [Troubleshooting Guide](../troubleshooting.md)
