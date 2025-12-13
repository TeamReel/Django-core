# Migration Guide

Migrate from manual theme implementations to @django-core/theme-system.

## Overview

This guide helps teams transition from:
- Custom CSS variables
- Context-based theme providers
- Manual localStorage/cookie management
- Ad-hoc theme switching implementations

To the standardized @django-core/theme-system.

## Benefits of Migrating

- ✅ **WCAG 2.1 AA compliance** - Automated contrast validation
- ✅ **Zero-flash SSR** - No flickering on page load
- ✅ **Type-safe tokens** - Catch errors at build time
- ✅ **Brand variants** - Multi-tenant support built-in
- ✅ **Reduced maintenance** - Centralized theme logic

## Migration Paths

### From CSS Variables

**Before:**

```css
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
}

[data-theme="dark"] {
  --color-bg: #000000;
  --color-text: #ffffff;
}
```

```css
.card {
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

**After:**

```typescript
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const card = style({
  backgroundColor: themeVars.color.bg.primary,
  color: themeVars.color.text.primary,
});
```

**Migration Steps:**

1. Install dependencies:
   ```bash
   pnpm add @django-core/theme-system @django-core/design-system @vanilla-extract/css
   ```

2. Map CSS variables to theme tokens:
   ```
   --color-bg       → themeVars.color.bg.primary
   --color-text     → themeVars.color.text.primary
   --color-border   → themeVars.color.border.primary
   --spacing-md     → themeVars.spacing.md
   ```

3. Convert CSS files to vanilla-extract `.css.ts` files

4. Replace manual theme switching with `<ThemeProvider>`

### From Context-Based Theme

**Before:**

```tsx
const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme === 'dark' ? 'dark' : 'light'}>
        <Content />
      </div>
    </ThemeContext.Provider>
  );
}

function useTheme() {
  return useContext(ThemeContext);
}
```

**After:**

```tsx
import { ThemeProvider } from '@django-core/theme-system';

function App() {
  return (
    <ThemeProvider>
      <Content />
    </ThemeProvider>
  );
}

// Use built-in hook
import { useTheme } from '@django-core/theme-system';
```

**Migration Steps:**

1. Remove custom ThemeContext and provider
2. Import `ThemeProvider` from @django-core/theme-system
3. Replace `useContext(ThemeContext)` with `useTheme()` hook
4. Remove manual `data-theme` attribute management

### From localStorage Direct Access

**Before:**

```tsx
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('theme') || 'light';
});

useEffect(() => {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);
```

**After:**

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import { LocalStorageAdapter } from '@django-core/theme-system/storage';

<ThemeProvider storage={new LocalStorageAdapter()}>
  {/* Persistence handled automatically */}
</ThemeProvider>
```

**Migration Steps:**

1. Remove manual localStorage logic
2. Pass storage adapter to ThemeProvider
3. Remove manual attribute updates (handled by provider)

### From Styled Components ThemeProvider

**Before:**

```tsx
import { ThemeProvider } from 'styled-components';

const lightTheme = {
  colors: {
    bg: '#ffffff',
    text: '#000000',
  },
};

const darkTheme = {
  colors: {
    bg: '#000000',
    text: '#ffffff',
  },
};

function App() {
  const [theme, setTheme] = useState(lightTheme);
  return <ThemeProvider theme={theme}><Content /></ThemeProvider>;
}

const Card = styled.div`
  background-color: ${props => props.theme.colors.bg};
  color: ${props => props.theme.colors.text};
`;
```

**After:**

```tsx
import { ThemeProvider } from '@django-core/theme-system';

function App() {
  return <ThemeProvider><Content /></ThemeProvider>;
}
```

```typescript
// Card.css.ts
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const card = style({
  backgroundColor: themeVars.color.bg.primary,
  color: themeVars.color.text.primary,
});
```

```tsx
// Card.tsx
import { card } from './Card.css';

export const Card = ({ children }) => <div className={card}>{children}</div>;
```

**Migration Steps:**

1. Replace styled-components with vanilla-extract
2. Convert theme objects to token usage
3. Replace `styled.div` with vanilla-extract `style()` functions
4. Import className instead of using styled components

## Breaking Changes from Manual Implementations

### CSS Classes → Data Attributes

**Before:**
```css
.dark { background: #000; }
```

**After:**
```css
[data-theme="dark"] { background: #000; }
```

### Theme Tokens Namespaced

**Before:**
```javascript
theme.primaryColor
```

**After:**
```typescript
themeVars.color.action.primary
```

### System Mode Built-in

**Before:**
```tsx
const [theme, setTheme] = useState('light');

useEffect(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

**After:**
```tsx
<ThemeProvider defaultMode="system"> {/* Handles automatically */}
```

## Step-by-Step Migration Checklist

### Phase 1: Install and Setup (1-2 hours)

- [ ] Install dependencies
  ```bash
  pnpm add @django-core/theme-system @django-core/design-system
  pnpm add -D @vanilla-extract/css @vanilla-extract/vite-plugin
  ```

- [ ] Configure build tool (Vite/Webpack)
  ```typescript
  // vite.config.ts
  import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

  export default defineConfig({
    plugins: [vanillaExtractPlugin()],
  });
  ```

- [ ] Wrap app with ThemeProvider
  ```tsx
  import { ThemeProvider } from '@django-core/theme-system';

  <ThemeProvider storage={new LocalStorageAdapter()}>
    <App />
  </ThemeProvider>
  ```

### Phase 2: Convert Styles (2-4 hours)

- [ ] Create token mapping document (old variables → themeVars)
- [ ] Convert one component as proof of concept
- [ ] Verify styling matches in light and dark modes
- [ ] Convert remaining components incrementally

### Phase 3: Replace Theme Logic (1-2 hours)

- [ ] Remove custom theme context/provider
- [ ] Replace `useTheme()` calls with @django-core/theme-system hook
- [ ] Remove manual localStorage/cookie logic
- [ ] Remove manual `data-theme` attribute updates

### Phase 4: Add SSR Support (1 hour)

For Next.js:
- [ ] Add `<ThemeScript />` to layout
- [ ] Add `suppressHydrationWarning` to `<html>`

For Django:
- [ ] Add inline theme script to base template
- [ ] Ensure script executes before React hydration

### Phase 5: Validate and Test (1-2 hours)

- [ ] Run contrast validation
  ```bash
  pnpm validate-theme
  ```

- [ ] Test theme switching in all modes (light/dark/system)
- [ ] Test persistence (reload page, theme should persist)
- [ ] Test SSR (no flash of wrong theme)
- [ ] Test keyboard accessibility (tab to theme toggle, Enter to switch)

### Phase 6: Clean Up (30 minutes)

- [ ] Remove old theme code
- [ ] Remove unused CSS variables
- [ ] Remove unused dependencies (styled-components, etc.)
- [ ] Update documentation

## Common Pitfalls

### Forgetting suppressHydrationWarning

**Symptom:** Hydration warnings in console

**Fix:**
```tsx
<html suppressHydrationWarning>
```

### Importing CSS in Wrong Order

**Symptom:** Styles not applied

**Fix:** Import theme CSS before component CSS
```css
/* globals.css */
@import '@django-core/theme-system/themes'; /* First */
@import './components/button.css';          /* After */
```

### Using Inline Styles Instead of Tokens

**Symptom:** Styles don't update with theme

**Fix:** Use theme tokens
```tsx
// ❌ Don't do this
<div style={{ color: '#000' }}>

// ✅ Do this
import { text } from './styles.css';
<div className={text}>
```

```typescript
// styles.css.ts
export const text = style({
  color: themeVars.color.text.primary,
});
```

## Gradual Migration Strategy

You can migrate incrementally:

1. **Start:** Add ThemeProvider alongside existing theme logic
2. **Convert:** Migrate components one-by-one to use themeVars
3. **Test:** Keep both systems running during migration
4. **Complete:** Remove old theme code when all components migrated

**Example:**

```tsx
// Both systems running during migration
<OldThemeProvider>
  <NewThemeProvider>
    <OldComponent /> {/* Uses old system */}
    <NewComponent /> {/* Uses new system */}
  </NewThemeProvider>
</OldThemeProvider>
```

## Rollback Plan

If issues arise, you can rollback:

1. Keep old theme code in git history
2. Tag commit before migration starts
3. If needed, revert: `git revert <migration-commit>`

## Need Help?

- Review [examples](../../examples/) for working implementations
- Check [troubleshooting guide](./troubleshooting.md) for common issues
- Open migration issue: https://github.com/django-core/django-core/issues

## Success Stories

**Example Timeline:**

- **Day 1:** Setup and convert 2 components (proof of concept)
- **Day 2-3:** Convert remaining components (batch by module)
- **Day 4:** Add SSR support and validate contrast
- **Day 5:** Test and clean up old code

**Total:** ~1 week for medium-sized application (20-30 components)

---

## Next Steps

- [Integration Guides](./guides/)
- [API Documentation](./api/)
- [Brand Customization](./guides/brand-variants.md)
