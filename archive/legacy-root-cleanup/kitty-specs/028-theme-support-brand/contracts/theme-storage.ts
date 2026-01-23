# ThemeStorage Interface Contract
*Path: [kitty-specs/028-theme-support-brand/contracts/theme-storage.ts](kitty-specs/028-theme-support-brand/contracts/theme-storage.ts)*

**Purpose**: TypeScript interface for theme persistence backends
**Version**: 1.0.0
**Stability**: Stable

---

## Interface

```typescript
/**
 * Abstraction for theme persistence backends.
 *
 * Implementations must handle errors gracefully and fail silently
 * rather than throwing exceptions. F07 should continue functioning
 * even if storage is unavailable.
 */
export interface ThemeStorage {
  /**
   * Load theme preference from storage.
   *
   * @returns Promise resolving to stored theme, or null if:
   *   - No preference is stored
   *   - Storage is unavailable
   *   - Stored value is invalid/corrupted
   *
   * @throws Never - implementations must catch and return null
   *
   * @example
   * const theme = await storage.loadTheme();
   * if (theme) {
   *   applyTheme(theme);
   * } else {
   *   applyDefaultTheme();
   * }
   */
  loadTheme(): Promise<ThemeConfiguration | null>;

  /**
   * Persist theme preference to storage.
   *
   * @param theme - Theme configuration to save
   *
   * @returns Promise resolving when save completes or fails.
   *          Should not throw on failure - log warning instead.
   *
   * @throws Never - implementations must catch and log errors
   *
   * @example
   * await storage.saveTheme({ mode: 'dark', brand: 'default' });
   * // Save happens asynchronously, errors logged but not thrown
   */
  saveTheme(theme: ThemeConfiguration): Promise<void>;
}

/**
 * Theme configuration data structure.
 */
export interface ThemeConfiguration {
  /** Base color mode */
  mode: 'light' | 'dark';

  /** Brand variant identifier */
  brand: string;
}
```

---

## Implementations

### CookieThemeStorage

**Purpose**: SSR-friendly cookie-based persistence

**Configuration**:
- Cookie name: `django_core_theme`
- Path: `/`
- SameSite: `Lax`
- Max-Age: `31536000` (1 year)
- Secure: Not required (non-sensitive data)

**Format**: URL-encoded JSON
```
django_core_theme=%7B%22mode%22%3A%22dark%22%2C%22brand%22%3A%22default%22%7D
```

**Behavior**:
- `loadTheme()`: Parses cookie, returns null if missing/invalid
- `saveTheme()`: Writes cookie with JSON.stringify, fails silently on error
- SSR: Returns null during server-side rendering (no `document`)

**Error Handling**:
- Malformed JSON → return null, log warning
- Cookie API unavailable → return null

---

### LocalStorageThemeStorage

**Purpose**: Client-side fallback storage

**Configuration**:
- Key: `django_core_theme`
- Format: JSON string

**Behavior**:
- `loadTheme()`: Reads localStorage[key], parses JSON, returns null if missing/invalid
- `saveTheme()`: Writes JSON.stringify(theme), fails silently on QuotaExceededError
- SSR: Returns null during server-side rendering (no `localStorage`)

**Error Handling**:
- QuotaExceededError → log warning, continue
- SecurityError (localStorage disabled) → return null
- Malformed JSON → return null, log warning

---

### B12ThemeStorage (Optional)

**Purpose**: Server-side persistence via B12 preferences API

**Dependencies**: `@django-core/api-client`

**API Endpoints**:
- Load: `GET /api/preferences/theme`
- Save: `POST /api/preferences/theme`

**Behavior**:
- `loadTheme()`: Fetches from API, maps response to ThemeConfiguration
- `saveTheme()`: POSTs to API with transformed data
- Authentication: Uses existing session/token from api-client

**Error Handling**:
- 404 (no preference) → return null
- 401 (unauthenticated) → return null, log info
- 500 (server error) → return null, log warning
- Network failure → return null, log warning
- All errors are non-blocking

**Response Mapping**:
```typescript
// API response → ThemeConfiguration
{
  "theme_mode": "dark",
  "theme_brand": "default"
}
↓
{
  mode: "dark",
  brand: "default"
}
```

---

### ComposedThemeStorage

**Purpose**: Multi-layer storage with fallback chain

**Configuration**:
```typescript
new ComposedThemeStorage(
  cookieStorage,
  localStorageStorage,
  b12Storage? // optional
)
```

**Load Priority**:
1. Cookie (fastest, SSR-compatible)
2. B12 API (authoritative for logged-in users)
3. localStorage (fallback)
4. Return null (caller applies default)

**Save Strategy**:
- Write to all storages in parallel (`Promise.all`)
- Failures in individual storages are logged but don't block others

**Behavior**:
```typescript
async loadTheme(): Promise<ThemeConfiguration | null> {
  // 1. Check cookie first (fast)
  const fromCookie = await this.cookie.loadTheme();
  if (fromCookie) return fromCookie;

  // 2. Check B12 if configured
  if (this.b12) {
    const fromB12 = await this.b12.loadTheme();
    if (fromB12) {
      // Sync B12 → cookie for next load
      await this.cookie.saveTheme(fromB12);
      return fromB12;
    }
  }

  // 3. Check localStorage
  const fromLocal = await this.localStorage.loadTheme();
  if (fromLocal) {
    // Promote localStorage → cookie
    await this.cookie.saveTheme(fromLocal);
    return fromLocal;
  }

  // 4. No preference found
  return null;
}

async saveTheme(theme: ThemeConfiguration): Promise<void> {
  // Write to all storages in parallel
  await Promise.allSettled([
    this.cookie.saveTheme(theme),
    this.localStorage.saveTheme(theme),
    this.b12?.saveTheme(theme)
  ]);
  // Individual failures logged internally, don't throw
}
```

---

## Usage in ThemeProvider

```typescript
import { ThemeProvider } from '@django-core/theme-system';
import {
  CookieThemeStorage,
  LocalStorageThemeStorage,
  B12ThemeStorage,
  ComposedThemeStorage
} from '@django-core/theme-system/storage';

// Default: composed storage with all adapters
<ThemeProvider>
  {children}
</ThemeProvider>

// Custom: cookie + localStorage only (no B12)
<ThemeProvider
  storage={new ComposedThemeStorage(
    new CookieThemeStorage(),
    new LocalStorageThemeStorage()
  )}
>
  {children}
</ThemeProvider>

// Custom: mock storage for testing
<ThemeProvider storage={mockStorage}>
  {children}
</ThemeProvider>
```

---

## Testing Contract

Implementations MUST pass these test scenarios:

### 1. Successful Load
```typescript
test('loads stored theme', async () => {
  // Arrange: pre-populate storage
  // Act: const theme = await storage.loadTheme()
  // Assert: theme matches stored value
});
```

### 2. Empty Storage
```typescript
test('returns null when no theme stored', async () => {
  // Arrange: empty storage
  // Act: const theme = await storage.loadTheme()
  // Assert: theme === null
});
```

### 3. Corrupted Data
```typescript
test('returns null for invalid data', async () => {
  // Arrange: store malformed JSON
  // Act: const theme = await storage.loadTheme()
  // Assert: theme === null, warning logged
});
```

### 4. Successful Save
```typescript
test('persists theme', async () => {
  // Arrange: theme = { mode: 'dark', brand: 'default' }
  // Act: await storage.saveTheme(theme)
  // Assert: storage contains theme, loadTheme() returns it
});
```

### 5. Save Failure (Graceful)
```typescript
test('handles save failure gracefully', async () => {
  // Arrange: simulate storage unavailable (quota exceeded, disabled)
  // Act: await storage.saveTheme(theme)
  // Assert: no exception thrown, warning logged
});
```

### 6. SSR Safety
```typescript
test('handles SSR environment', async () => {
  // Arrange: mock server environment (no window, document, localStorage)
  // Act: await storage.loadTheme()
  // Assert: returns null without crashing
});
```

---

## Versioning

**Current Version**: 1.0.0

**Breaking Changes** (require major version bump):
- Changing method signatures (e.g., adding required parameters)
- Changing return types (e.g., ThemeConfiguration structure)
- Removing methods

**Non-Breaking Changes** (minor version):
- Adding optional parameters
- Adding new methods
- Internal implementation improvements

**Contract Guarantee**: All implementations of ThemeStorage v1.x.x are interchangeable and compatible with ThemeProvider v1.x.x.
