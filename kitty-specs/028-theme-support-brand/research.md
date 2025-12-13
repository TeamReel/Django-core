# Research: F07 Theme Support & Brand Variants
*Path: [kitty-specs/028-theme-support-brand/research.md](kitty-specs/028-theme-support-brand/research.md)*

**Feature**: F07 Theme Support & Brand Variants
**Branch**: `028-theme-support-brand`
**Date**: 2025-12-13
**Status**: Phase 0 Complete

## Overview

This document captures research findings from the planning discovery phase for F07. All critical architecture decisions were validated through 5 planning questions covering token storage, theme switching mechanism, brand variant structure, contrast validation workflow, and B12 integration strategy.

## Research Questions & Answers

### Q1: Token Storage Format

**Question**: How should F07 store and define theme token mappings?

**Decision**: vanilla-extract `.css.ts` files with theme contracts

**Rationale**:
- **Consistency**: Matches F01/F05/F06 pattern, maintains monorepo tooling consistency
- **Type Safety**: Full TypeScript inference, zero `any` types, autocomplete for token names
- **Zero Runtime**: CSS custom properties generated at build time, no runtime overhead
- **Performance**: Eliminates JavaScript execution cost, theme switching is pure CSS
- **Developer Experience**: Same tooling as existing packages, familiar to frontend team

**Alternatives Considered**:
1. **JSON/YAML config files**: Simpler for non-TS users but loses type safety, requires build-time transform
2. **TypeScript objects with runtime generation**: More flexible but adds runtime cost, conflicts with bundle size target (<10KB)

**Implementation Details**:
- Define semantic token contract using `createThemeContract` from vanilla-extract
- Implement base mode themes (light/dark) as full contract implementations mapping to F01 primitives
- Brand variants use typed helpers that merge base theme + overrides before `createTheme`
- All themes emit CSS custom properties with `[data-theme][data-brand]` selectors
- Optional future enhancement: thin JSON/YAML → `.css.ts` transform for easier brand authoring

**References**:
- vanilla-extract docs: https://vanilla-extract.style/documentation/api/create-theme/
- F01 design system structure (existing pattern)

---

### Q2: Theme Switching Mechanism

**Question**: How should theme changes propagate to UI components?

**Decision**: `data-theme` and `data-brand` attributes on `<html>` element

**Rationale**:
- **SSR Friendly**: Inline boot script can set attributes before React hydration, preventing flash
- **Zero Re-renders**: CSS custom properties update via attribute selectors, no React component re-renders
- **Performance**: Theme switch is single DOM attribute change, browser handles CSS cascade
- **Simple Mental Model**: HTML attribute drives theming, React context is read-only state tracker
- **Standard Pattern**: Widely used in modern theme systems (Radix Themes, Mantine, NextUI)

**Alternatives Considered**:
1. **React Context with inline styles**: Forces re-renders, poor performance, complicates SSR
2. **Dynamic `<style>` tag injection**: Can cause FOUC, complicates SSR, less predictable

**Implementation Details**:
- ThemeProvider manages logical theme state (mode + brand) in React Context
- When theme changes, provider updates both `data-theme` and `data-brand` attributes on `<html>`
- vanilla-extract emits selectors like `html[data-theme="dark"][data-brand="default"] { --theme-bg: ... }`
- Components reference CSS custom properties (`var(--theme-background-surface)`) in styles
- useTheme() hook provides read-only access to current theme state for conditional logic
- SSR boot script sets attributes from cookie before React loads

**Example**:
```typescript
// Inline boot script (SSR)
const theme = getThemeFromCookie() || getSystemTheme() || 'light';
document.documentElement.setAttribute('data-theme', theme);

// React usage
const { mode, setMode } = useTheme();
// Setting mode updates data-theme attribute automatically
```

**References**:
- Pattern used by: Radix Themes, Mantine, shadcn/ui
- CSS custom properties support: https://caniuse.com/css-variables

---

### Q3: Brand Variant Token Structure

**Question**: How should brand themes override base theme tokens?

**Decision**: vanilla-extract theme contracts with typed inheritance helpers

**Rationale**:
- **Type Safety**: Contract ensures all tokens present, TypeScript validates overrides
- **Explicit Inheritance**: Base mode theme provides foundation, brand merges specific overrides
- **Compile-Time Validation**: Missing tokens caught before build, not at runtime
- **Flexible Override**: Support both partial inheritance (accent colors) and full replacement (escape hatch)
- **Maintainability**: Clear separation between base semantic tokens and brand customizations

**Alternatives Considered**:
1. **Separate brand files with manual spreading**: Less type-safe, easy to miss tokens, no contract enforcement
2. **Runtime token merging**: Adds runtime cost, delays error detection to runtime

**Implementation Details**:

**Theme Contract** (all semantic tokens):
```typescript
// themes/contract.css.ts
export const themeContract = createThemeContract({
  background: { canvas: null, surface: null, overlay: null },
  text: { primary: null, secondary: null, muted: null, disabled: null },
  border: { subtle: null, default: null, strong: null },
  state: {
    success: { fg: null, bg: null, border: null },
    warning: { fg: null, bg: null, border: null },
    error: { fg: null, bg: null, border: null },
    info: { fg: null, bg: null, border: null }
  },
  accent: { primary: null, primaryHover: null, secondary: null }
});
```

**Base Theme** (light mode using F01 primitives):
```typescript
// themes/light.css.ts
import { primitives } from '@django-core/design-system';

export const lightTheme = createTheme(themeContract, {
  background: {
    canvas: primitives.color.gray[50],
    surface: primitives.color.white,
    overlay: primitives.color.gray[900]
  },
  text: {
    primary: primitives.color.gray[900],
    secondary: primitives.color.gray[700],
    muted: primitives.color.gray[500],
    disabled: primitives.color.gray[400]
  },
  // ... rest of tokens
});
```

**Brand Variant** (inherits base, overrides accent):
```typescript
// brands/brandX.css.ts
import { createBrandVariant } from '../brand-helpers';
import { lightTheme } from '../themes/light.css.ts';

export const brandXLight = createBrandVariant(lightTheme, {
  accent: {
    primary: '#FF6B35',
    primaryHover: '#E55A2B',
    secondary: '#004E89'
  }
  // All other tokens inherited from lightTheme
});

// Helper ensures type safety
function createBrandVariant<T extends ThemeContract>(
  base: T,
  overrides: DeepPartial<T>
): T {
  return { ...base, ...deepMerge(base, overrides) };
}
```

**CSS Output**:
```css
html[data-theme="light"][data-brand="default"] {
  --theme-accent-primary: #RGB_FROM_F01;
}

html[data-theme="light"][data-brand="brandX"] {
  --theme-accent-primary: #FF6B35;
}
```

**Escape Hatch** (full override):
```typescript
// For advanced customization, provide complete token map
export const brandYDark = createTheme(themeContract, {
  // Full token implementation, no inheritance
  background: { ... },
  text: { ... },
  // ...
});
```

**References**:
- vanilla-extract contracts: https://vanilla-extract.style/documentation/api/create-theme-contract/
- Hierarchical theming pattern: https://www.joshwcomeau.com/css/css-variables-for-react-devs/

---

### Q4: Contrast Validation Workflow

**Question**: When and how should WCAG 2.1 AA contrast validation run?

**Decision**: Pre-compilation TypeScript validation module with CI integration

**Rationale**:
- **Early Detection**: Catches contrast issues before CSS compilation, fail-fast feedback
- **Accurate Analysis**: Validates actual token objects used in themes, not post-processed CSS
- **Semantic Awareness**: Knows which token pairs matter (text-on-background) vs irrelevant combinations
- **Reusable**: Exported utility enables product teams to validate custom brands locally
- **Fast**: Runs in <5 seconds as TypeScript function, suitable for pre-commit hooks

**Alternatives Considered**:
1. **Simple CSS parsing script**: Post-build only, doesn't know semantic relationships, hard to map errors back to source
2. **Axe-core integration with Storybook**: Valuable for visual regression but too slow for every commit, misses programmatic theme definitions

**Implementation Details**:

**Validation Function**:
```typescript
// validation/validateContrast.ts
import { wcag21AA } from './wcag-utils';

interface ValidationResult {
  pass: boolean;
  failures: ContrastFailure[];
}

interface ContrastFailure {
  tokenPair: [string, string];
  ratio: number;
  required: number;
  severity: 'error' | 'warning';
}

export function validateThemeContrast(
  theme: ThemeTokens,
  options: ValidationOptions = {}
): ValidationResult {
  const pairs = getSemanticPairs(theme); // Knows which pairs to check
  const failures: ContrastFailure[] = [];

  for (const [fg, bg] of pairs) {
    const ratio = calculateContrastRatio(fg, bg);
    const required = getRequiredRatio(fg, bg, options); // 4.5:1 or 3:1

    if (ratio < required) {
      failures.push({
        tokenPair: [fgName, bgName],
        ratio,
        required,
        severity: options.strict ? 'error' : 'warning'
      });
    }
  }

  return { pass: failures.length === 0, failures };
}

// Semantic pair definitions
function getSemanticPairs(theme: ThemeTokens): Array<[color, color]> {
  return [
    [theme.text.primary, theme.background.canvas],
    [theme.text.primary, theme.background.surface],
    [theme.text.secondary, theme.background.canvas],
    [theme.state.error.fg, theme.background.surface],
    // ... other critical pairs
  ];
}

// WCAG 2.1 formula
function calculateContrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRequiredRatio(fg, bg, options): number {
  // Large text (18pt+) or UI components: 3:1
  // Normal text: 4.5:1
  // Configurable per options
  return options.largeText ? 3.0 : 4.5;
}
```

**CI Script**:
```typescript
// scripts/validate-themes.ts
import { validateThemeContrast } from '../src/validation';
import { lightTheme, darkTheme } from '../src/themes';

const coreThemes = [
  { name: 'light/default', theme: lightTheme },
  { name: 'dark/default', theme: darkTheme }
];

let hasFailures = false;

for (const { name, theme } of coreThemes) {
  console.log(`Validating ${name}...`);
  const result = validateThemeContrast(theme, { strict: true });

  if (!result.pass) {
    hasFailures = true;
    console.error(`❌ ${name} FAILED:`);
    result.failures.forEach(f => {
      console.error(`  ${f.tokenPair.join(' on ')}: ${f.ratio.toFixed(2)}:1 (needs ${f.required}:1)`);
    });
  } else {
    console.log(`✅ ${name} passed`);
  }
}

if (hasFailures) {
  process.exit(1);
}
```

**Package.json Integration**:
```json
{
  "scripts": {
    "validate-themes": "tsx scripts/validate-themes.ts",
    "test": "vitest && pnpm validate-themes"
  }
}
```

**Product Usage**:
```typescript
// downstream-product/tests/theme.test.ts
import { validateThemeContrast } from '@django-core/theme-system';
import { myBrandTheme } from '../themes/brand';

test('custom brand meets WCAG AA', () => {
  const result = validateThemeContrast(myBrandTheme);
  expect(result.pass).toBe(true);
});
```

**Development Mode Warnings**:
```typescript
// components/ThemeProvider.tsx
if (process.env.NODE_ENV === 'development') {
  const result = validateThemeContrast(currentTheme, { strict: false });
  if (!result.pass) {
    console.warn('[F07] Theme contrast warnings:', result.failures);
  }
}
```

**Multi-Layer Validation Strategy**:
1. **Pre-commit**: Optional hook runs validation on modified themes
2. **Build-time**: CI script validates all core themes (blocks merge)
3. **Development**: Runtime warnings in dev mode for active theme
4. **Visual Regression**: Chromatic stories provide visual verification
5. **Product CI**: Exported utility enables downstream validation

**References**:
- WCAG 2.1 contrast formula: https://www.w3.org/TR/WCAG21/#contrast-minimum
- Contrast calculation library: https://github.com/tmcw/wcag-contrast
- Prior art: Radix Colors contrast validation

---

### Q5: B12 Preferences Integration

**Question**: How should F07 integrate with B12 for server-side theme persistence?

**Decision**: `ThemeStorage` interface abstraction with B12 as optional adapter

**Rationale**:
- **Decoupling**: F07 doesn't depend directly on B12; products control integration
- **Testability**: Easy to mock storage in tests, no B12 backend required for development
- **Flexibility**: Products can substitute alternative backends (Firebase, Supabase, custom API)
- **Graceful Degradation**: F07 works without B12; cookie+localStorage provide full functionality
- **Clear Contracts**: Interface documents expected behavior for any storage implementation

**Alternatives Considered**:
1. **Direct B12 API calls**: Tight coupling, hard to test, breaks when B12 unavailable
2. **No abstraction, hardcode B12**: Prevents alternative backends, makes F07 B12-dependent

**Implementation Details**:

**Storage Interface**:
```typescript
// storage/ThemeStorage.ts
export interface ThemeStorage {
  /**
   * Load theme preference from storage.
   * Returns null if no preference stored or storage unavailable.
   */
  loadTheme(): Promise<ResolvedTheme | null>;

  /**
   * Persist theme preference to storage.
   * Should fail gracefully if storage unavailable.
   */
  saveTheme(theme: ResolvedTheme): Promise<void>;
}

export interface ResolvedTheme {
  mode: 'light' | 'dark';
  brand: string; // e.g., 'default', 'brandX'
}
```

**Cookie Storage** (SSR-friendly):
```typescript
// storage/CookieStorage.ts
export class CookieThemeStorage implements ThemeStorage {
  private readonly cookieName = 'django_core_theme';

  async loadTheme(): Promise<ResolvedTheme | null> {
    if (typeof document === 'undefined') return null; // SSR guard

    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith(`${this.cookieName}=`));

    if (!cookie) return null;

    try {
      const value = decodeURIComponent(cookie.split('=')[1]);
      return JSON.parse(value) as ResolvedTheme;
    } catch {
      return null;
    }
  }

  async saveTheme(theme: ResolvedTheme): Promise<void> {
    if (typeof document === 'undefined') return; // SSR guard

    const value = encodeURIComponent(JSON.stringify(theme));
    document.cookie = `${this.cookieName}=${value}; path=/; SameSite=Lax; max-age=31536000`;
  }
}
```

**LocalStorage Storage** (fallback):
```typescript
// storage/LocalStorage.ts
export class LocalStorageThemeStorage implements ThemeStorage {
  private readonly key = 'django_core_theme';

  async loadTheme(): Promise<ResolvedTheme | null> {
    if (typeof localStorage === 'undefined') return null;

    try {
      const value = localStorage.getItem(this.key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async saveTheme(theme: ResolvedTheme): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(this.key, JSON.stringify(theme));
    } catch {
      // Quota exceeded or disabled, fail silently
    }
  }
}
```

**B12 Storage** (optional):
```typescript
// storage/B12Storage.ts
import { apiClient } from '@django-core/api-client';

export class B12ThemeStorage implements ThemeStorage {
  async loadTheme(): Promise<ResolvedTheme | null> {
    try {
      const response = await apiClient.get('/api/preferences/theme');
      return {
        mode: response.data.theme_mode || 'light',
        brand: response.data.theme_brand || 'default'
      };
    } catch (error) {
      // B12 unavailable or user not authenticated
      console.warn('[F07] B12 theme load failed:', error);
      return null;
    }
  }

  async saveTheme(theme: ResolvedTheme): Promise<void> {
    try {
      await apiClient.post('/api/preferences/theme', {
        theme_mode: theme.mode,
        theme_brand: theme.brand
      });
    } catch (error) {
      // Non-blocking: cookie+localStorage still work
      console.warn('[F07] B12 theme save failed:', error);
    }
  }
}
```

**Composed Storage** (default):
```typescript
// storage/ComposedStorage.ts
export class ComposedThemeStorage implements ThemeStorage {
  constructor(
    private cookie: CookieThemeStorage,
    private localStorage: LocalStorageThemeStorage,
    private b12?: B12ThemeStorage
  ) {}

  async loadTheme(): Promise<ResolvedTheme | null> {
    // Priority: cookie → B12 → localStorage

    const fromCookie = await this.cookie.loadTheme();
    if (fromCookie) return fromCookie;

    if (this.b12) {
      const fromB12 = await this.b12.loadTheme();
      if (fromB12) {
        // Sync B12 preference to cookie for next load
        await this.cookie.saveTheme(fromB12);
        return fromB12;
      }
    }

    const fromLocal = await this.localStorage.loadTheme();
    if (fromLocal) {
      // Promote localStorage to cookie
      await this.cookie.saveTheme(fromLocal);
      return fromLocal;
    }

    return null;
  }

  async saveTheme(theme: ResolvedTheme): Promise<void> {
    // Write to all available storages
    await Promise.all([
      this.cookie.saveTheme(theme),
      this.localStorage.saveTheme(theme),
      this.b12?.saveTheme(theme)
    ]);
  }
}
```

**ThemeProvider Integration**:
```typescript
// components/ThemeProvider.tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  storage?: ThemeStorage; // Inject custom storage
}

export function ThemeProvider({ children, storage }: ThemeProviderProps) {
  const defaultStorage = useMemo(
    () => new ComposedThemeStorage(
      new CookieThemeStorage(),
      new LocalStorageThemeStorage(),
      // B12 optional: only if api-client available
      hasB12Support() ? new B12ThemeStorage() : undefined
    ),
    []
  );

  const storageAdapter = storage ?? defaultStorage;

  // Load theme on mount
  useEffect(() => {
    storageAdapter.loadTheme().then(theme => {
      if (theme) setTheme(theme);
    });
  }, []);

  // Save theme on change
  const setTheme = useCallback((theme: ResolvedTheme) => {
    setThemeState(theme);
    storageAdapter.saveTheme(theme); // Non-blocking
  }, [storageAdapter]);

  // ...
}
```

**B12 API Contract Documentation**:
```markdown
## B12 Integration (Optional)

If your backend implements B12 user/org preferences, F07 can sync theme preferences server-side.

### Required Endpoint

**GET /api/preferences/theme**
- Auth: Required (user session)
- Response:
  ```json
  {
    "theme_mode": "light" | "dark",
    "theme_brand": "default" | "brandX"
  }
  ```
- Errors: 404 if no preference set → F07 falls back to cookie/localStorage

**POST /api/preferences/theme**
- Auth: Required
- Body:
  ```json
  {
    "theme_mode": "light" | "dark",
    "theme_brand": "default" | "brandX"
  }
  ```
- Response: 200 OK or 201 Created
- Errors: Non-blocking, F07 continues with local storage

### Backend Implementation Example

```python
# Django view example
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET', 'POST'])
def theme_preference(request):
    if request.method == 'GET':
        pref = request.user.preferences.get('theme', {})
        return Response({
            'theme_mode': pref.get('mode', 'light'),
            'theme_brand': pref.get('brand', 'default')
        })

    elif request.method == 'POST':
        request.user.preferences['theme'] = {
            'mode': request.data['theme_mode'],
            'brand': request.data['theme_brand']
        }
        request.user.save()
        return Response(status=200)
```
```

**Testing Strategy**:
```typescript
// Mock storage for tests
class MockThemeStorage implements ThemeStorage {
  private store: ResolvedTheme | null = null;

  async loadTheme() { return this.store; }
  async saveTheme(theme: ResolvedTheme) { this.store = theme; }
}

test('theme persists across sessions', async () => {
  const storage = new MockThemeStorage();
  const { result } = renderHook(() => useTheme(), {
    wrapper: ({ children }) => (
      <ThemeProvider storage={storage}>{children}</ThemeProvider>
    )
  });

  act(() => result.current.setMode('dark'));

  // Verify saved
  const saved = await storage.loadTheme();
  expect(saved?.mode).toBe('dark');
});
```

**References**:
- Strategy pattern for storage adapters
- F02/F03 api-client package (if exists) for B12 calls
- Similar pattern: next-themes library

---

## Technology Stack Summary

Based on research and planning decisions:

### Core Dependencies
- **vanilla-extract**: Theme contract system, zero-runtime CSS-in-JS
- **React 18.x**: ThemeProvider context, hooks
- **TypeScript 5.x**: Strict mode, full type coverage
- **@django-core/design-system (F01)**: Primitive tokens foundation

### Optional Dependencies
- **@django-core/api-client**: B12 integration (if available)

### Dev Dependencies
- **Vitest**: Unit/integration testing
- **React Testing Library**: Component testing
- **@testing-library/user-event**: Interaction testing
- **Chromatic**: Visual regression testing
- **Storybook 8.x**: Component documentation
- **axe-core**: Accessibility testing
- **tsx**: TypeScript execution for validation script
- **ESLint + Prettier**: Code quality

### Build Tools
- **Vite**: Package bundling, dev server
- **TypeScript Compiler**: Type checking
- **vanilla-extract Vite plugin**: Theme compilation

---

## Architecture Patterns

### 1. Theme Resolution Flow
```
User Action (toggle theme)
  ↓
useTheme().setMode('dark')
  ↓
Update React State
  ↓
Set data-theme="dark" on <html>
  ↓
CSS cascade applies [data-theme="dark"] rules
  ↓
Persist to storage (cookie + localStorage + B12)
```

### 2. SSR Boot Sequence
```
Server renders HTML with theme cookie detection
  ↓
Inline script reads cookie (or system preference)
  ↓
Set data-theme attribute BEFORE any CSS loads
  ↓
React hydrates
  ↓
ThemeProvider reads data-theme attribute
  ↓
No flash: theme was correct from first paint
```

### 3. Brand Inheritance Chain
```
F01 Primitive Tokens (color.gray.900, etc.)
  ↓
Base Mode Theme (light.css.ts: semantic tokens → primitives)
  ↓
Brand Variant (brandX.css.ts: overrides accent tokens)
  ↓
Final CSS Custom Properties (--theme-accent-primary)
  ↓
Component Styles (background: var(--theme-accent-primary))
```

### 4. Storage Priority Chain
```
Load: Cookie → B12 API → localStorage → system preference → default
Save: Cookie + B12 API + localStorage (all in parallel)
```

---

## Open Questions Resolved

All planning questions answered during discovery phase. No remaining unknowns.

---

## Next Steps

**Phase 1 Tasks**:
1. Create `data-model.md` documenting theme entities and token schema
2. Generate API contracts for ThemeStorage interface and B12 integration
3. Create `quickstart.md` with <10 minute integration guide
4. Update `.github/copilot-instructions.md` with F07 technologies
5. Proceed to Phase 2: Work package decomposition (`/spec-kitty.tasks`)
