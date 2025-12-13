# Storage Adapters

Persistence adapters for theme preferences.

## Overview

Storage adapters implement the `ThemeStorage` interface to persist theme preferences across sessions:

```typescript
interface ThemeStorage {
  load(): ThemePreference | null;
  save(preference: ThemePreference): void;
}

interface ThemePreference {
  mode: ThemeMode;
  brand: BrandVariant;
}
```

## Built-in Adapters

### CookieStorage

Stores theme preference in browser cookies. **Recommended for SSR.**

```tsx
import { CookieStorage } from '@django-core/theme-system/storage';

const storage = new CookieStorage({
  cookieName: 'django_theme_pref', // default
  maxAge: 365 * 24 * 60 * 60,      // 1 year (default)
  sameSite: 'lax',                  // default
  secure: true,                     // production only
});

<ThemeProvider storage={storage}>
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookieName` | `string` | `'django_theme_pref'` | Cookie name |
| `maxAge` | `number` | `31536000` (1 year) | Cookie lifetime (seconds) |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | `'lax'` | SameSite attribute |
| `secure` | `boolean` | `false` | Secure attribute |

**Use Cases:**
- SSR applications (Next.js, Django)
- Need server-side theme detection
- Cross-subdomain sharing with custom `domain` option

### LocalStorageAdapter

Stores theme preference in browser localStorage. **Client-side only.**

```tsx
import { LocalStorageAdapter } from '@django-core/theme-system/storage';

const storage = new LocalStorageAdapter({
  key: 'django_theme_pref', // default
});

<ThemeProvider storage={storage}>
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | `'django_theme_pref'` | localStorage key |

**Use Cases:**
- Client-side only applications (SPAs)
- No SSR requirements
- Private browsing compatibility (gracefully degrades)

### B12Adapter

Syncs theme preference to Django backend via B12 API.

```tsx
import { B12Adapter } from '@django-core/theme-system/storage';
import { apiClient } from '@django-core/api-client';

const storage = new B12Adapter({
  apiClient,
  endpoint: '/api/v1/user-preferences/', // default
});

<ThemeProvider storage={storage}>
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiClient` | `ApiClient` | required | B12 API client instance |
| `endpoint` | `string` | `'/api/v1/user-preferences/'` | API endpoint |

**Use Cases:**
- Multi-device preference sync
- Backend-driven theme selection
- Audit trail for preference changes

**Requirements:**
- User must be authenticated
- Backend must implement B12 preference endpoints

### ComposedStorage

Combines multiple storage adapters for redundancy.

```tsx
import { ComposedStorage, CookieStorage, B12Adapter } from '@django-core/theme-system/storage';
import { apiClient } from '@django-core/api-client';

const storage = new ComposedStorage([
  new CookieStorage(),              // Primary: fast local storage
  new B12Adapter({ apiClient }),    // Secondary: backend sync
]);

<ThemeProvider storage={storage}>
```

**Behavior:**
- **load()**: Returns first non-null result (priority order)
- **save()**: Writes to all adapters (fire-and-forget)

**Use Cases:**
- Hybrid SSR + backend sync
- Progressive enhancement (works offline, syncs when online)
- Redundant persistence

## Custom Storage Adapter

Implement the `ThemeStorage` interface:

```typescript
import type { ThemeStorage, ThemePreference } from '@django-core/theme-system';

class CustomStorage implements ThemeStorage {
  load(): ThemePreference | null {
    // Read from your storage mechanism
    const data = myStorageAPI.get('theme');
    return data ? JSON.parse(data) : null;
  }

  save(preference: ThemePreference): void {
    // Write to your storage mechanism
    myStorageAPI.set('theme', JSON.stringify(preference));
  }
}
```

**Example: SessionStorage**

```typescript
class SessionStorageAdapter implements ThemeStorage {
  constructor(private key: string = 'django_theme_pref') {}

  load(): ThemePreference | null {
    try {
      const data = sessionStorage.getItem(this.key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  save(preference: ThemePreference): void {
    try {
      sessionStorage.setItem(this.key, JSON.stringify(preference));
    } catch {
      // Ignore storage errors
    }
  }
}
```

## Error Handling

All storage adapters gracefully degrade on errors:

- `load()` returns `null` if storage unavailable
- `save()` fails silently to avoid disrupting UX
- Missing cookies/localStorage → falls back to default theme

## Security Considerations

### CookieStorage

- Use `secure: true` in production (HTTPS only)
- Set `sameSite: 'strict'` for high-security applications
- Cookie size limit: ~4KB (theme preference is <100 bytes)

### LocalStorageAdapter

- Limited to same-origin access (no CSRF risk)
- Not available in private browsing (Safari)
- No automatic expiration (persists until cleared)

### B12Adapter

- Requires authenticated user (automatic via apiClient)
- All requests use CSRF tokens from B12
- Backend validates user ownership of preferences

## Testing

Mock storage in tests:

```typescript
import { vi } from 'vitest';
import type { ThemeStorage, ThemePreference } from '@django-core/theme-system';

const mockStorage: ThemeStorage = {
  load: vi.fn(() => null),
  save: vi.fn(),
};

<ThemeProvider storage={mockStorage}>
  <ComponentUnderTest />
</ThemeProvider>
```

## See Also

- [ThemeProvider](./ThemeProvider.md)
- [SSR Utilities](./ssr.md)
- [B12 Integration Guide](../guides/b12-backend.md)
