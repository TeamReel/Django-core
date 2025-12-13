# Theme Tokens

Semantic design tokens for theme-aware styling.

## Overview

Theme tokens are CSS variables that automatically update when theme mode or brand changes. They map to F01 design primitives.

## Usage

Import `themeVars` in vanilla-extract styles:

```typescript
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const card = style({
  backgroundColor: themeVars.color.bg.surface,
  color: themeVars.color.text.primary,
  borderRadius: themeVars.radius.md,
  padding: themeVars.spacing.md,
  boxShadow: themeVars.shadow.sm,
});
```

## Token Structure

### Colors

#### Background

```typescript
themeVars.color.bg.primary      // Main background
themeVars.color.bg.secondary    // Subtle background
themeVars.color.bg.surface      // Elevated surfaces (cards)
themeVars.color.bg.overlay      // Modals, popovers
```

#### Text

```typescript
themeVars.color.text.primary    // Primary text
themeVars.color.text.secondary  // Muted text
themeVars.color.text.tertiary   // Disabled text
themeVars.color.text.inverse    // Text on dark backgrounds
themeVars.color.text.link       // Hyperlinks
themeVars.color.text.linkHover  // Hovered hyperlinks
```

#### Actions

```typescript
themeVars.color.action.primary        // Primary buttons
themeVars.color.action.primaryHover   // Hovered primary buttons
themeVars.color.action.secondary      // Secondary buttons
themeVars.color.action.secondaryHover // Hovered secondary buttons
```

#### Borders

```typescript
themeVars.color.border.primary        // Default borders
themeVars.color.border.secondary      // Subtle borders
themeVars.color.border.focus          // Focus rings
```

#### States

```typescript
themeVars.color.state.error.bg        // Error background
themeVars.color.state.error.text      // Error text
themeVars.color.state.error.border    // Error border

themeVars.color.state.warning.bg      // Warning background
themeVars.color.state.warning.text    // Warning text
themeVars.color.state.warning.border  // Warning border

themeVars.color.state.success.bg      // Success background
themeVars.color.state.success.text    // Success text
themeVars.color.state.success.border  // Success border

themeVars.color.state.info.bg         // Info background
themeVars.color.state.info.text       // Info text
themeVars.color.state.info.border     // Info border
```

### Spacing

```typescript
themeVars.spacing.xs    // 4px
themeVars.spacing.sm    // 8px
themeVars.spacing.md    // 16px
themeVars.spacing.lg    // 24px
themeVars.spacing.xl    // 32px
themeVars.spacing.xxl   // 48px
```

### Border Radius

```typescript
themeVars.radius.none   // 0px
themeVars.radius.sm     // 4px
themeVars.radius.md     // 8px
themeVars.radius.lg     // 12px
themeVars.radius.xl     // 16px
themeVars.radius.full   // 9999px (circular)
```

### Shadows

```typescript
themeVars.shadow.none   // No shadow
themeVars.shadow.xs     // Subtle elevation
themeVars.shadow.sm     // Small elevation
themeVars.shadow.md     // Medium elevation
themeVars.shadow.lg     // Large elevation
themeVars.shadow.xl     // Extra large elevation
```

### Typography

```typescript
themeVars.font.family.sans      // System sans-serif
themeVars.font.family.serif     // System serif
themeVars.font.family.mono      // System monospace

themeVars.font.size.xs          // 12px
themeVars.font.size.sm          // 14px
themeVars.font.size.base        // 16px
themeVars.font.size.lg          // 18px
themeVars.font.size.xl          // 20px
themeVars.font.size.xxl         // 24px

themeVars.font.weight.normal    // 400
themeVars.font.weight.medium    // 500
themeVars.font.weight.semibold  // 600
themeVars.font.weight.bold      // 700

themeVars.font.lineHeight.tight // 1.25
themeVars.font.lineHeight.normal // 1.5
themeVars.font.lineHeight.relaxed // 1.75
```

## Examples

### Button Component

```typescript
import { style } from '@vanilla-extract/css';
import { themeVars } from '@django-core/theme-system';

export const button = style({
  backgroundColor: themeVars.color.action.primary,
  color: themeVars.color.text.inverse,
  borderRadius: themeVars.radius.md,
  padding: `${themeVars.spacing.sm} ${themeVars.spacing.md}`,
  fontSize: themeVars.font.size.base,
  fontWeight: themeVars.font.weight.medium,
  boxShadow: themeVars.shadow.sm,

  ':hover': {
    backgroundColor: themeVars.color.action.primaryHover,
  },
});
```

### Card Component

```typescript
export const card = style({
  backgroundColor: themeVars.color.bg.surface,
  color: themeVars.color.text.primary,
  borderRadius: themeVars.radius.lg,
  padding: themeVars.spacing.lg,
  border: `1px solid ${themeVars.color.border.secondary}`,
  boxShadow: themeVars.shadow.md,
});
```

### Alert Component

```typescript
export const alert = style({
  padding: themeVars.spacing.md,
  borderRadius: themeVars.radius.md,
  fontSize: themeVars.font.size.sm,
});

export const alertError = style([alert, {
  backgroundColor: themeVars.color.state.error.bg,
  color: themeVars.color.state.error.text,
  borderLeft: `4px solid ${themeVars.color.state.error.border}`,
}]);

export const alertSuccess = style([alert, {
  backgroundColor: themeVars.color.state.success.bg,
  color: themeVars.color.state.success.text,
  borderLeft: `4px solid ${themeVars.color.state.success.border}`,
}]);
```

### Input Component

```typescript
export const input = style({
  backgroundColor: themeVars.color.bg.primary,
  color: themeVars.color.text.primary,
  border: `1px solid ${themeVars.color.border.primary}`,
  borderRadius: themeVars.radius.md,
  padding: `${themeVars.spacing.sm} ${themeVars.spacing.md}`,
  fontSize: themeVars.font.size.base,

  ':focus': {
    outline: 'none',
    borderColor: themeVars.color.border.focus,
    boxShadow: `0 0 0 3px ${themeVars.color.border.focus}33`, // 20% opacity
  },
});
```

## Brand Variants

Brand variants can override token values:

```typescript
// Brand "acme" overrides primary action color
{
  color: {
    action: {
      primary: '#e74c3c',        // ACME red
      primaryHover: '#c0392b'
    }
  }
}
```

Components using `themeVars.color.action.primary` will automatically use ACME red when `brand="acme"`.

## Contrast Validation

All token color pairs are validated for WCAG 2.1 AA compliance:

- **Text (normal)**: 4.5:1 contrast ratio minimum
- **Text (large)**: 3:1 contrast ratio minimum
- **UI components**: 3:1 contrast ratio minimum (borders, icons)

See [Contrast Validation](../guides/contrast-validation.md) for details.

## TypeScript

Full type definitions included:

```typescript
import type { ThemeVars } from '@django-core/theme-system';

// ThemeVars is the inferred type of themeVars
const myCustomToken: ThemeVars['color']['text']['primary'] = themeVars.color.text.primary;
```

## Design System Integration

Theme tokens are derived from F01 design system primitives:

- `@django-core/design-system/tokens` → base design tokens
- `@django-core/theme-system` → theme-aware mappings

To customize base tokens, see [Design System Documentation](../../../design-system/README.md).

## See Also

- [Brand Customization Guide](../guides/brand-variants.md)
- [Design System Tokens](../../../design-system/docs/tokens.md)
- [vanilla-extract Documentation](https://vanilla-extract.style/)
