# Quickstart: F07 Theme Support & Brand Variants
*Path: [kitty-specs/028-theme-support-brand/quickstart.md](kitty-specs/028-theme-support-brand/quickstart.md)*

**Goal**: Integrate F07 theming into your application in under 10 minutes

**Prerequisites**:
- Existing React 18+ application
- `@django-core/design-system` (F01) installed
- Node.js 18+ and pnpm

---

## Step 1: Install Package (1 minute)

```bash
# From your project root
pnpm add @django-core/theme-system
```

**What this adds**:
- ThemeProvider component
- useTheme hook
- Semantic theme tokens
- Validation utilities
- Storage adapters

---

## Step 2: Wrap Your App (2 minutes)

Add `ThemeProvider` at the root of your React app:

```tsx
// src/App.tsx or src/index.tsx
import { ThemeProvider } from '@django-core/theme-system';

function App() {
  return (
    <ThemeProvider>
      {/* Your app content */}
      <YourAppContent />
    </ThemeProvider>
  );
}

export default App;
```

**What this does**:
- Loads theme preference from cookie/localStorage
- Applies `data-theme` attribute to `<html>` element
- Makes theme state available via `useTheme()` hook
- Persists theme changes automatically

**That's it!** Your app now supports light/dark themes. All F01 components using semantic tokens will adapt automatically.

---

## Step 3: Add Theme Toggle (Optional, 3 minutes)

Add a theme switcher to your UI:

```tsx
// src/components/Header.tsx
import { useTheme } from '@django-core/theme-system';
import { Button } from '@django-core/design-system';

function Header() {
  const { mode, setMode } = useTheme();

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <header>
      <h1>My App</h1>
      <Button onClick={toggleTheme}>
        {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
      </Button>
    </header>
  );
}
```

**Or use the built-in component**:

```tsx
import { ThemeToggle } from '@django-core/theme-system';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle showLabel />
    </header>
  );
}
```

---

## Step 4: Use Semantic Tokens (2 minutes)

Update your components to use semantic theme tokens instead of hardcoded colors:

**Before** (hardcoded colors):
```tsx
import { style } from '@vanilla-extract/css';
import { primitives } from '@django-core/design-system';

const cardStyle = style({
  background: primitives.color.white,
  color: primitives.color.gray[900],
  border: `1px solid ${primitives.color.gray[200]}`
});
```

**After** (semantic tokens):
```tsx
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

const cardStyle = style({
  background: themeVars.background.surface,
  color: themeVars.text.primary,
  border: `1px solid ${themeVars.border.default}`
});
```

**Available Semantic Tokens**:
- `themeVars.background.canvas` - Page background
- `themeVars.background.surface` - Card/panel backgrounds
- `themeVars.text.primary` - Main text
- `themeVars.text.secondary` - Supporting text
- `themeVars.border.default` - Standard borders
- `themeVars.state.error.fg` - Error text color
- `themeVars.accent.primary` - Brand accent color

**See all tokens**: Check `node_modules/@django-core/theme-system/src/themes/contract.css.ts`

---

## Step 5: Add SSR Support (Optional, 2 minutes)

If using server-side rendering (Next.js, Remix, etc.), prevent flash of wrong theme:

```tsx
// app/layout.tsx (Next.js) or root.tsx (Remix)
import { getServerTheme, BootScript } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  const serverTheme = getServerTheme(); // Reads from cookie

  return (
    <html data-theme={serverTheme.mode} data-brand={serverTheme.brand}>
      <head>
        <BootScript /> {/* Inline script, executes before React */}
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**What BootScript does**:
1. Reads theme cookie before any CSS loads
2. Sets `data-theme` attribute on `<html>`
3. Prevents visual flash during React hydration

---

## Complete Example

```tsx
// src/App.tsx
import { ThemeProvider, ThemeToggle } from '@django-core/theme-system';
import { Card, Button, Text } from '@django-core/design-system';

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <header>
          <Text variant="h1">My Application</Text>
          <ThemeToggle showLabel position="top-right" />
        </header>

        <main>
          <Card>
            <Text variant="h2">Welcome</Text>
            <Text>
              This card automatically adapts to light and dark themes
              using semantic tokens from F07.
            </Text>
            <Button variant="primary">Get Started</Button>
          </Card>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
```

**Result**: Application with light/dark theme support, persisted preferences, and zero visual flash.

---

## Next Steps

### Add Custom Brand Theme

Create a brand variant for your product:

```tsx
// src/themes/brand.css.ts
import { createBrandVariant } from '@django-core/theme-system/brand-helpers';
import { lightTheme, darkTheme } from '@django-core/theme-system/themes';

export const myBrandLight = createBrandVariant(lightTheme, {
  accent: {
    primary: '#FF6B35',
    primaryHover: '#E55A2B',
    primaryActive: '#CC4F24',
    secondary: '#004E89',
    secondaryHover: '#003D6B'
  }
});

export const myBrandDark = createBrandVariant(darkTheme, {
  accent: {
    primary: '#FF8C5A',
    primaryHover: '#FFA07A',
    primaryActive: '#FF6B35',
    secondary: '#0066CC',
    secondaryHover: '#0052A3'
  }
});
```

**Register your brand**:

```tsx
<ThemeProvider
  brands={{
    default: { light: lightTheme, dark: darkTheme },
    myBrand: { light: myBrandLight, dark: myBrandDark }
  }}
  defaultBrand="myBrand"
>
  {children}
</ThemeProvider>
```

**Switch brands programmatically**:

```tsx
const { brand, setBrand } = useTheme();
setBrand('myBrand'); // Applies your custom accent colors
```

---

### Validate Accessibility

Run contrast validation on your custom theme:

```bash
# Install dev dependency
pnpm add -D @django-core/theme-system

# Run validation
pnpm tsx scripts/validate-theme.ts
```

```typescript
// scripts/validate-theme.ts
import { validateThemeContrast } from '@django-core/theme-system/validation';
import { myBrandLight, myBrandDark } from '../src/themes/brand';

const themes = [
  { name: 'myBrand/light', theme: myBrandLight },
  { name: 'myBrand/dark', theme: myBrandDark }
];

for (const { name, theme } of themes) {
  console.log(`Validating ${name}...`);
  const result = validateThemeContrast(theme, { strict: true });

  if (!result.pass) {
    console.error(`❌ FAILED:`);
    result.failures.forEach(f => {
      console.error(`  ${f.tokenPair.join(' on ')}: ${f.ratio.toFixed(2)}:1 (needs ${f.required}:1)`);
    });
    process.exit(1);
  }

  console.log(`✅ PASSED`);
}
```

---

### Enable B12 Sync (Optional)

If your backend implements B12 preferences API, enable server-side sync:

```tsx
import { ThemeProvider } from '@django-core/theme-system';
import {
  ComposedThemeStorage,
  CookieThemeStorage,
  LocalStorageThemeStorage,
  B12ThemeStorage
} from '@django-core/theme-system/storage';

const storage = new ComposedThemeStorage(
  new CookieThemeStorage(),
  new LocalStorageThemeStorage(),
  new B12ThemeStorage() // Requires @django-core/api-client
);

function App() {
  return (
    <ThemeProvider storage={storage}>
      {children}
    </ThemeProvider>
  );
}
```

**Backend requirement**: Implement `GET/POST /api/preferences/theme` endpoint (see `contracts/b12-api.yaml`)

---

## Troubleshooting

### Theme doesn't persist across page reloads

**Cause**: Cookie not being set
**Fix**: Check browser console for errors, ensure `document.cookie` API is available

### Visual flash on page load

**Cause**: Missing SSR boot script
**Fix**: Add `<BootScript />` to `<head>` before any CSS loads

### Custom brand colors not applying

**Cause**: Brand not registered or incorrect brand name
**Fix**: Verify `brands` prop in ThemeProvider, check `data-brand` attribute in dev tools

### TypeScript errors with theme tokens

**Cause**: Incorrect import path
**Fix**: Import from `@django-core/theme-system/themes`, not `/src/themes`

### Contrast validation fails

**Cause**: Brand colors don't meet WCAG AA standards
**Fix**: Adjust colors, use online contrast checker (https://webaim.org/resources/contrastchecker/)

---

## Support

- **Documentation**: `packages/theme-system/README.md`
- **Examples**: `packages/theme-system/examples/`
- **Storybook**: Run `pnpm storybook` to see live theme demos
- **Issues**: File in Django-core repo with `[F07]` tag

---

## Summary

**You've successfully integrated F07!** Your app now has:

✅ Light and dark theme support
✅ Persisted user preferences (cookie + localStorage)
✅ Zero visual flash on SSR
✅ Semantic tokens for consistent styling
✅ Optional custom brand themes
✅ WCAG 2.1 AA accessibility compliance

**Total time**: ~10 minutes for basic integration, ~30 minutes with custom branding and validation.
