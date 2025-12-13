# Data Model: F07 Theme Support & Brand Variants
*Path: [kitty-specs/028-theme-support-brand/data-model.md](kitty-specs/028-theme-support-brand/data-model.md)*

**Feature**: F07 Theme Support & Brand Variants
**Branch**: `028-theme-support-brand`
**Date**: 2025-12-13

## Overview

F07 is a frontend-only feature with no database persistence. This document defines the TypeScript data structures, interfaces, and type contracts that govern theme configuration, token mappings, and storage.

---

## Entity: ThemeConfiguration

**Purpose**: Represents the active theme state (mode + brand combination)

**TypeScript Definition**:
```typescript
export interface ThemeConfiguration {
  /** Base color mode: light or dark */
  mode: ThemeMode;

  /** Brand variant identifier */
  brand: string;
}

export type ThemeMode = 'light' | 'dark';
```

**Validation Rules**:
- `mode` MUST be either 'light' or 'dark'
- `brand` MUST be a non-empty string matching a registered brand identifier
- Default brand is 'default'

**State Transitions**:
```
Initial: { mode: 'light', brand: 'default' }
  ↓ User toggles mode
Updated: { mode: 'dark', brand: 'default' }
  ↓ Product applies brand
Updated: { mode: 'dark', brand: 'brandX' }
```

**Persistence**:
- Serialized as JSON in cookie: `{"mode":"dark","brand":"default"}`
- Stored in localStorage under key `django_core_theme`
- Optionally synced to B12 API as `{theme_mode, theme_brand}`

**Usage**:
```typescript
const theme: ThemeConfiguration = { mode: 'dark', brand: 'default' };
// Applied via data-theme and data-brand attributes on <html>
```

---

## Entity: ThemeTokenMap

**Purpose**: Defines the complete set of semantic tokens for a specific theme (mode × brand)

**TypeScript Definition**:
```typescript
export interface ThemeTokenMap {
  background: BackgroundTokens;
  text: TextTokens;
  border: BorderTokens;
  state: StateTokens;
  accent: AccentTokens;
}

export interface BackgroundTokens {
  /** Primary page background (e.g., body) */
  canvas: string; // CSS color value

  /** Secondary surfaces (e.g., cards, panels) */
  surface: string;

  /** Overlays (e.g., modals, popovers) */
  overlay: string;
}

export interface TextTokens {
  /** Primary body text */
  primary: string;

  /** Secondary/supporting text */
  secondary: string;

  /** De-emphasized text (e.g., captions) */
  muted: string;

  /** Disabled text */
  disabled: string;
}

export interface BorderTokens {
  /** Subtle borders (e.g., dividers) */
  subtle: string;

  /** Default borders (e.g., inputs) */
  default: string;

  /** Strong borders (e.g., focus rings) */
  strong: string;
}

export interface StateTokens {
  success: StateColorSet;
  warning: StateColorSet;
  error: StateColorSet;
  info: StateColorSet;
}

export interface StateColorSet {
  /** Foreground/text color for state */
  fg: string;

  /** Background color for state */
  bg: string;

  /** Border color for state */
  border: string;
}

export interface AccentTokens {
  /** Primary accent color (e.g., brand primary) */
  primary: string;

  /** Primary accent hover state */
  primaryHover: string;

  /** Primary accent active/pressed state */
  primaryActive: string;

  /** Secondary accent color */
  secondary: string;

  /** Secondary accent hover state */
  secondaryHover: string;
}
```

**Validation Rules**:
- All token values MUST be valid CSS color strings (hex, rgb, hsl, or CSS custom property reference)
- Token maps MUST be complete (no undefined values)
- Color values SHOULD reference F01 primitive tokens (e.g., `primitives.color.gray[900]`)

**Mapping to CSS Custom Properties**:
```typescript
// Token map is compiled to CSS custom properties via vanilla-extract
const lightTheme = createTheme(themeContract, {
  background: {
    canvas: '#ffffff',    // → --theme-background-canvas
    surface: '#f9fafb',   // → --theme-background-surface
    overlay: '#111827'    // → --theme-background-overlay
  },
  text: {
    primary: '#111827',   // → --theme-text-primary
    secondary: '#374151', // → --theme-text-secondary
    muted: '#6b7280',     // → --theme-text-muted
    disabled: '#9ca3af'   // → --theme-text-disabled
  },
  // ... rest of tokens
});

// Emitted CSS:
// html[data-theme="light"] {
//   --theme-background-canvas: #ffffff;
//   --theme-background-surface: #f9fafb;
//   --theme-text-primary: #111827;
//   /* ... */
// }
```

**Usage in Components**:
```typescript
// vanilla-extract style
import { themeVars } from '@django-core/theme-system';

export const cardStyle = style({
  backgroundColor: themeVars.background.surface,
  color: themeVars.text.primary,
  border: `1px solid ${themeVars.border.default}`
});

// Or via CSS custom properties
<div style={{ background: 'var(--theme-background-surface)' }} />
```

---

## Entity: BrandVariantDefinition

**Purpose**: Configuration for a custom brand theme that overrides base theme tokens

**TypeScript Definition**:
```typescript
export interface BrandVariantDefinition {
  /** Unique brand identifier (e.g., 'brandX', 'acme') */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Token overrides (partial or complete) */
  tokens: Partial<ThemeTokenMap> | ThemeTokenMap;

  /** Inheritance mode */
  inheritance: 'merge' | 'replace';

  /** Base theme to inherit from (if inheritance='merge') */
  baseTheme?: ThemeMode;
}
```

**Validation Rules**:
- `name` MUST be URL-safe (lowercase alphanumeric + hyphens)
- `name` MUST be unique across all registered brands
- If `inheritance='merge'`, `baseTheme` MUST be specified
- If `inheritance='replace'`, `tokens` MUST be a complete `ThemeTokenMap`
- Token overrides MUST use valid CSS color values

**State Transitions**:
```
Define Brand → Register with ThemeProvider → Available for selection
```

**Hierarchical Inheritance** (default):
```typescript
// Brand variant with partial override (inheritance='merge')
const brandXDefinition: BrandVariantDefinition = {
  name: 'brandX',
  displayName: 'Brand X Theme',
  baseTheme: 'light',
  inheritance: 'merge',
  tokens: {
    accent: {
      primary: '#FF6B35',
      primaryHover: '#E55A2B',
      primaryActive: '#CC4F24',
      secondary: '#004E89',
      secondaryHover: '#003D6B'
    }
    // All other tokens inherited from lightTheme
  }
};

// Runtime resolution:
// 1. Start with base theme (light)
// 2. Deep merge brand overrides
// 3. Result: lightTheme with custom accent colors
```

**Full Override** (escape hatch):
```typescript
// Brand variant with complete replacement (inheritance='replace')
const brandYDefinition: BrandVariantDefinition = {
  name: 'brandY',
  displayName: 'Brand Y Custom Theme',
  inheritance: 'replace',
  tokens: {
    // Complete ThemeTokenMap implementation
    background: { canvas: '...', surface: '...', overlay: '...' },
    text: { primary: '...', secondary: '...', muted: '...', disabled: '...' },
    border: { subtle: '...', default: '...', strong: '...' },
    state: { success: {...}, warning: {...}, error: {...}, info: {...} },
    accent: { primary: '...', primaryHover: '...', primaryActive: '...', secondary: '...', secondaryHover: '...' }
  }
};
```

**Storage**:
- Brand definitions stored as TypeScript/JSON config files in product repos
- Registered with ThemeProvider via `brands` prop
- Active brand stored in ThemeConfiguration

---

## Entity: ThemePreference (B12 Integration)

**Purpose**: Server-side persistence of user/org theme preference via B12 API

**API Contract** (if B12 implemented):

**GET /api/preferences/theme**
```json
{
  "theme_mode": "light" | "dark",
  "theme_brand": "default" | "brandX" | string
}
```

**POST /api/preferences/theme**
```json
{
  "theme_mode": "light" | "dark",
  "theme_brand": "default" | "brandX" | string
}
```

**Validation Rules** (backend):
- `theme_mode` MUST be 'light' or 'dark'
- `theme_brand` SHOULD validate against allowed brands (optional)
- Preference SHOULD be scoped to authenticated user or organization

**Synchronization Flow**:
```
User changes theme in UI
  ↓
Frontend: Update cookie + localStorage immediately
  ↓
Frontend: Async POST to /api/preferences/theme (non-blocking)
  ↓
Backend: Persist to user/org preferences
  ↓
Next session: GET /api/preferences/theme returns saved preference
  ↓
Frontend: Sync to cookie if different
```

**Failure Handling**:
- B12 API unavailable → Use cookie + localStorage (graceful degradation)
- B12 POST fails → Log warning, continue with local storage
- B12 GET fails → Fall back to cookie, then localStorage, then system, then default

---

## Interface: ThemeStorage

**Purpose**: Abstraction for theme persistence backends

**TypeScript Definition**:
```typescript
export interface ThemeStorage {
  /**
   * Load theme preference from storage.
   * Returns null if no preference stored or storage unavailable.
   */
  loadTheme(): Promise<ThemeConfiguration | null>;

  /**
   * Persist theme preference to storage.
   * Should fail gracefully if storage unavailable.
   */
  saveTheme(theme: ThemeConfiguration): Promise<void>;
}
```

**Implementations**:

1. **CookieThemeStorage**:
   - Reads/writes `django_core_theme` cookie
   - Format: URL-encoded JSON
   - Attributes: `path=/`, `SameSite=Lax`, `max-age=31536000` (1 year)

2. **LocalStorageThemeStorage**:
   - Reads/writes `django_core_theme` localStorage key
   - Format: JSON string
   - Handles QuotaExceededError gracefully

3. **B12ThemeStorage**:
   - Reads from `GET /api/preferences/theme`
   - Writes to `POST /api/preferences/theme`
   - Uses `@django-core/api-client` for CSRF-protected requests
   - Handles 404, 401, 500 errors gracefully

4. **ComposedThemeStorage**:
   - Composes multiple storage implementations
   - Load priority: Cookie → B12 → localStorage
   - Save strategy: Parallel write to all storages

**Usage**:
```typescript
<ThemeProvider storage={customStorage}>
  {children}
</ThemeProvider>
```

---

## Type: ValidationResult

**Purpose**: Output from contrast validation utility

**TypeScript Definition**:
```typescript
export interface ValidationResult {
  /** Overall pass/fail status */
  pass: boolean;

  /** List of contrast failures */
  failures: ContrastFailure[];

  /** Optional validation metadata */
  metadata?: {
    themeName: string;
    checkedPairs: number;
    timestamp: string;
  };
}

export interface ContrastFailure {
  /** Token pair that failed (e.g., ['text.primary', 'background.canvas']) */
  tokenPair: [string, string];

  /** Actual contrast ratio achieved */
  ratio: number;

  /** Required contrast ratio (4.5:1 or 3:1) */
  required: number;

  /** Severity level */
  severity: 'error' | 'warning';

  /** Optional fix suggestions */
  suggestion?: string;
}
```

**Usage**:
```typescript
import { validateThemeContrast } from '@django-core/theme-system';

const result = validateThemeContrast(myTheme, { strict: true });

if (!result.pass) {
  result.failures.forEach(failure => {
    console.error(
      `${failure.tokenPair.join(' on ')}: ` +
      `${failure.ratio.toFixed(2)}:1 (needs ${failure.required}:1)`
    );
  });
}
```

---

## Relationships

```
┌─────────────────────┐
│ ThemeConfiguration  │ (Active state)
│ - mode: ThemeMode   │
│ - brand: string     │
└──────────┬──────────┘
           │ references
           ↓
┌─────────────────────────────┐
│ BrandVariantDefinition      │ (Brand registry)
│ - name: string              │
│ - tokens: ThemeTokenMap     │
│ - inheritance: merge/replace│
└──────────┬──────────────────┘
           │ provides
           ↓
┌─────────────────────────────┐
│ ThemeTokenMap               │ (Semantic tokens)
│ - background: {...}         │
│ - text: {...}               │
│ - state: {...}              │
│ - accent: {...}             │
└──────────┬──────────────────┘
           │ maps to
           ↓
┌─────────────────────────────┐
│ F01 Primitive Tokens        │ (Foundation)
│ color.gray.900, etc.        │
└─────────────────────────────┘

┌─────────────────────┐
│ ThemeStorage        │ (Interface)
│ - loadTheme()       │
│ - saveTheme()       │
└──────────┬──────────┘
           │ implemented by
           ↓
┌──────────────────────────────┐
│ CookieThemeStorage           │
│ LocalStorageThemeStorage     │
│ B12ThemeStorage              │
│ ComposedThemeStorage         │
└──────────────────────────────┘
```

---

## Schema Evolution

**Versioning Strategy**:
- ThemeConfiguration schema is versioned implicitly via package version
- Breaking changes to ThemeConfiguration require major version bump
- Cookie/localStorage handle unknown fields gracefully (ignore extras)
- B12 API should version endpoint (`/api/v1/preferences/theme`) if schema evolves

**Migration Path** (if schema changes):
```typescript
function migrateThemeConfig(stored: unknown): ThemeConfiguration {
  // Handle legacy formats
  if (isLegacyFormat(stored)) {
    return {
      mode: stored.theme === 'dark' ? 'dark' : 'light',
      brand: 'default'
    };
  }
  return stored as ThemeConfiguration;
}
```

---

## Constants

```typescript
// Default theme
export const DEFAULT_THEME: ThemeConfiguration = {
  mode: 'light',
  brand: 'default'
};

// Cookie configuration
export const THEME_COOKIE_NAME = 'django_core_theme';
export const THEME_COOKIE_MAX_AGE = 31536000; // 1 year

// LocalStorage key
export const THEME_STORAGE_KEY = 'django_core_theme';

// WCAG 2.1 AA requirements
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3.0;
export const WCAG_AA_UI_COMPONENTS = 3.0;
```

---

## Summary

F07 data model centers on four key entities:

1. **ThemeConfiguration**: Active theme state (mode + brand)
2. **ThemeTokenMap**: Semantic token mappings to F01 primitives
3. **BrandVariantDefinition**: Brand customization configurations
4. **ThemeStorage**: Persistence abstraction (cookie/localStorage/B12)

All entities are TypeScript-only; no database persistence required. Theme state flows from storage → React context → HTML attributes → CSS variables → components.
