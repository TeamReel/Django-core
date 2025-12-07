# Theming Guide

The design system provides a flexible theming infrastructure built on **vanilla-extract** that supports light/dark modes, system preference detection, and brand customization.

## Overview

The theming system consists of three layers:

1. **Token Contracts** (`src/tokens/tokens.css.ts`): Type-safe contracts defining the structure of design tokens
2. **Theme Implementations** (`src/theme/themes/*.css.ts`): Actual values for light/dark themes
3. **Theme Provider** (`src/theme/ThemeProvider.tsx`): React component managing theme state and system preferences

## Using Themes in Your App

### Basic Setup

Wrap your application with `ThemeProvider`:

```tsx
import { ThemeProvider } from '@repo/design-system/theme';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

### Accessing Theme State

Use the `useTheme` hook to access and control the current theme:

```tsx
import { useTheme } from '@repo/design-system/theme';

function ThemeToggle() {
  const { theme, themeMode, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme} (mode: {themeMode})
    </button>
  );
}
```

### Using Theme Tokens in Components

Reference theme tokens using CSS variables in your vanilla-extract stylesheets:

```typescript
import { style } from '@vanilla-extract/css';
import { themeVars } from '@repo/design-system/tokens';

export const card = style({
  backgroundColor: themeVars.color.background.primary,
  color: themeVars.color.text.primary,
  borderRadius: themeVars.radius.md,
  padding: themeVars.spacing.md,
  boxShadow: themeVars.shadow.sm,
});
```

## Creating Brand Themes

To create custom brand themes for your organization, extend the existing themes using `createTheme`:

### 1. Define Your Brand Theme

Create a new theme file in your app (e.g., `src/themes/acme-brand.css.ts`):

```typescript
import { createTheme } from '@vanilla-extract/css';
import { themeVars } from '@repo/design-system/tokens';

// Acme Corp brand theme based on light theme
export const acmeLightTheme = createTheme(themeVars, {
  color: {
    // Brand colors
    text: {
      primary: '#1a1a2e',      // Deep navy
      secondary: '#16213e',
      tertiary: '#0f3460',
      inverse: '#ffffff',
      disabled: '#a0a0b2',
      accent: '#e94560',       // Brand accent
    },
    background: {
      primary: '#ffffff',
      secondary: '#f5f6fa',
      tertiary: '#eaeef3',
      inverse: '#1a1a2e',
      hover: '#e8ecf1',
      disabled: '#d1d5db',
    },
    interactive: {
      primary: '#e94560',      // Brand primary (coral red)
      primaryHover: '#d93954',
      primaryActive: '#c22d48',
      primaryDisabled: '#f4a3b3',
      secondary: '#0f3460',    // Brand secondary (navy)
      secondaryHover: '#16213e',
      secondaryActive: '#1a1a2e',
      secondaryDisabled: '#87a0b8',
    },
    border: {
      default: '#dce1e7',
      hover: '#c3cbd6',
      focus: '#e94560',        // Brand accent for focus
      disabled: '#e5e7eb',
    },
    // Semantic colors
    success: {
      default: '#10b981',
      hover: '#059669',
      text: '#047857',
      background: '#d1fae5',
      border: '#6ee7b7',
    },
    warning: {
      default: '#f59e0b',
      hover: '#d97706',
      text: '#b45309',
      background: '#fef3c7',
      border: '#fcd34d',
    },
    error: {
      default: '#ef4444',
      hover: '#dc2626',
      text: '#b91c1c',
      background: '#fee2e2',
      border: '#fca5a5',
    },
    info: {
      default: '#3b82f6',
      hover: '#2563eb',
      text: '#1d4ed8',
      background: '#dbeafe',
      border: '#93c5fd',
    },
    // Keep existing palette scales or customize
    neutral: { /* ... */ },
    primary: { /* ... */ },
    // ... other color scales
  },
  // Typography, spacing, etc. can be customized or inherited
  typography: {
    fontFamily: {
      sans: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    // ... other typography tokens
  },
  spacing: { /* ... */ },
  radius: { /* ... */ },
  shadow: { /* ... */ },
  zIndex: { /* ... */ },
  motion: { /* ... */ },
});

// Acme Corp dark theme
export const acmeDarkTheme = createTheme(themeVars, {
  color: {
    text: {
      primary: '#f5f6fa',
      secondary: '#d4d7dd',
      tertiary: '#a0a3b2',
      inverse: '#1a1a2e',
      disabled: '#6b6d7d',
      accent: '#ff6b88',       // Lighter coral for dark mode
    },
    background: {
      primary: '#16213e',      // Navy background
      secondary: '#0f3460',
      tertiary: '#1a1a2e',
      inverse: '#ffffff',
      hover: '#1f2b4a',
      disabled: '#2a3654',
    },
    interactive: {
      primary: '#ff6b88',      // Lighter coral for dark mode
      primaryHover: '#ff8fa5',
      primaryActive: '#ff4d70',
      primaryDisabled: '#8b3d51',
      secondary: '#4a90e2',    // Brighter blue for dark mode
      secondaryHover: '#5fa3f5',
      secondaryActive: '#357abd',
      secondaryDisabled: '#3d5875',
    },
    // ... rest of dark theme colors
  },
  // ... other token categories
});
```

### 2. Apply Your Brand Theme

Update your app's ThemeProvider to use brand themes:

```tsx
import { ThemeProvider } from '@repo/design-system/theme';
import { acmeLightTheme, acmeDarkTheme } from './themes/acme-brand.css';

function App() {
  return (
    <ThemeProvider
      defaultTheme="system"
      // Override the default theme classes with your brand themes
      themes={{
        light: acmeLightTheme,
        dark: acmeDarkTheme,
      }}
    >
      {/* Your app */}
    </ThemeProvider>
  );
}
```

**Note**: The current implementation uses the built-in `lightTheme` and `darkTheme` classes. To support custom themes, you would need to modify `ThemeProvider.tsx` to accept a `themes` prop and apply the appropriate class based on the selected theme.

### 3. Partial Customization

If you only need to override specific tokens, you can extend the base themes:

```typescript
import { createTheme } from '@vanilla-extract/css';
import { themeVars } from '@repo/design-system/tokens';
import { lightTheme } from '@repo/design-system/theme';

// Only override brand colors, keep everything else
export const brandTheme = createTheme(themeVars, {
  ...lightTheme, // Spread existing theme values
  color: {
    ...lightTheme.color, // Keep existing color structure
    interactive: {
      ...lightTheme.color.interactive,
      primary: '#e94560',      // Override primary color
      primaryHover: '#d93954',
      // ... only override what you need
    },
  },
});
```

## System Preferences

The ThemeProvider automatically detects and responds to system preferences:

### Dark Mode Detection

```tsx
// Automatically respects system preference
<ThemeProvider defaultTheme="system" />

// Or force a specific theme
<ThemeProvider defaultTheme="dark" />
```

The provider listens for changes to `prefers-color-scheme` and updates the theme automatically when the system setting changes.

### Reduced Motion

The provider detects `prefers-reduced-motion` and applies a `.reduce-motion` class to the document root, which disables all animations:

```typescript
// Automatically applied when system preference is set
const { reducedMotion } = useTheme();

// Use in your components
const animationClass = reducedMotion ? staticClass : animatedClass;
```

## Theme Persistence

User theme preferences are automatically persisted to `localStorage`:

```tsx
// Default storage key: 'theme'
<ThemeProvider defaultTheme="system" />

// Custom storage key
<ThemeProvider
  defaultTheme="system"
  storageKey="acme-theme-preference"
/>
```

## TypeScript Support

All theme tokens are fully typed through the token contracts:

```typescript
import { themeVars } from '@repo/design-system/tokens';

// TypeScript will autocomplete and type-check token paths
const styles = style({
  color: themeVars.color.text.primary, // ✅ Valid
  backgroundColor: themeVars.color.background.invalid, // ❌ Type error
});
```

## Best Practices

1. **Always use theme tokens**: Reference `themeVars` instead of hardcoding colors
2. **Test both themes**: Ensure components look good in light and dark modes
3. **Respect reduced motion**: Don't force animations when `reducedMotion` is true
4. **Maintain semantic meaning**: Use semantic colors (success, warning, error) for their intended purposes
5. **Consider contrast**: Ensure text meets WCAG contrast requirements in both themes
6. **Document custom themes**: If creating brand themes, document color choices and accessibility considerations

## Storybook Integration

The design system's Storybook includes a theme decorator for testing components in both themes:

```tsx
// Stories automatically support theme switching via toolbar
export default {
  title: 'Components/Button',
  component: Button,
  // Theme decorator is automatically applied
} satisfies Meta<typeof Button>;
```

Use the theme toggle in the Storybook toolbar to switch between light and dark modes.

## Troubleshooting

### Theme not applying

Ensure `ThemeProvider` wraps your entire app and is placed above any components using theme tokens.

### TypeScript errors with theme tokens

Check that you're importing from the correct path:

```typescript
// ✅ Correct
import { themeVars } from '@repo/design-system/tokens';

// ❌ Wrong
import { themeVars } from '@repo/design-system/theme';
```

### Custom theme not working

Verify your theme implementation provides values for all required token contracts. Use TypeScript to catch missing values:

```typescript
const myTheme = createTheme(themeVars, {
  // TypeScript will error if any required tokens are missing
  color: { /* ... */ },
  typography: { /* ... */ },
  // ... all other token categories
});
```
