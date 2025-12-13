# useTheme Hook

React hook for accessing and manipulating theme state.

## Usage

```tsx
import { useTheme } from '@django-core/theme-system';

function MyComponent() {
  const { mode, brand, setTheme } = useTheme();

  return (
    <div>
      <p>Current mode: {mode}</p>
      <p>Current brand: {brand}</p>
      <button onClick={() => setTheme({ mode: 'dark' })}>
        Switch to Dark
      </button>
    </div>
  );
}
```

## Return Value

```typescript
interface ThemeContextValue {
  mode: ThemeMode;
  brand: BrandVariant;
  resolvedMode: 'light' | 'dark';
  setTheme: (updates: Partial<ThemePreference>) => void;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'light' \| 'dark' \| 'system'` | Current theme mode setting |
| `brand` | `string` | Current brand variant ID |
| `resolvedMode` | `'light' \| 'dark'` | Actual theme applied (resolves 'system' to 'light' or 'dark') |
| `setTheme` | `function` | Updates theme preference |

### setTheme(updates)

Updates theme preference and persists via storage adapter.

**Parameters:**
- `updates` - Partial theme preference object

**Example:**

```tsx
const { setTheme } = useTheme();

// Change mode only
setTheme({ mode: 'dark' });

// Change brand only
setTheme({ brand: 'acme' });

// Change both
setTheme({ mode: 'dark', brand: 'acme' });
```

## Examples

### Theme Toggle Button

```tsx
import { useTheme } from '@django-core/theme-system';

function ThemeToggleButton() {
  const { mode, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme({ mode: mode === 'dark' ? 'light' : 'dark' });
  };

  return (
    <button onClick={toggleTheme}>
      {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### Brand Selector

```tsx
import { useTheme } from '@django-core/theme-system';

function BrandSelector() {
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

### Display Resolved Mode

```tsx
import { useTheme } from '@django-core/theme-system';

function ThemeStatus() {
  const { mode, resolvedMode } = useTheme();

  return (
    <div>
      <p>Mode setting: {mode}</p>
      <p>Resolved to: {resolvedMode}</p>
      {mode === 'system' && (
        <p>Following OS preference</p>
      )}
    </div>
  );
}
```

### Conditional Rendering Based on Theme

```tsx
import { useTheme } from '@django-core/theme-system';

function Logo() {
  const { resolvedMode } = useTheme();

  return (
    <img
      src={resolvedMode === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
    />
  );
}
```

## Requirements

Must be used inside a `<ThemeProvider>`:

```tsx
import { ThemeProvider, useTheme } from '@django-core/theme-system';

function MyComponent() {
  const theme = useTheme(); // ✅ Works
  return <div>...</div>;
}

function App() {
  return (
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );
}
```

Using outside ThemeProvider will throw an error:

```tsx
function MyComponent() {
  const theme = useTheme(); // ❌ Error: useTheme must be used within ThemeProvider
}
```

## TypeScript

Full type definitions included:

```typescript
import type { ThemeMode, BrandVariant, ThemePreference } from '@django-core/theme-system';
```

## See Also

- [ThemeProvider](./ThemeProvider.md)
- [ThemeToggle Component](./ThemeToggle.md)
- [Storage Adapters](./storage.md)
