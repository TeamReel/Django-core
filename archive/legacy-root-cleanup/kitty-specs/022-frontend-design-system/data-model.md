# Data Model: Frontend Design System Foundation
*Path: [kitty-specs/022-frontend-design-system/data-model.md](kitty-specs/022-frontend-design-system/data-model.md)*

**Feature Branch**: `022-frontend-design-system`
**Date**: 2025-12-05

## Overview

F01 is a frontend-only feature with no database persistence. This document defines the TypeScript type system and token structure that serves as the "data model" for the design system.

---

## Token Schema

### Color Tokens

```typescript
interface ColorTokens {
  // Semantic colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;

  // Feedback colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Neutral palette
  background: string;
  backgroundSubtle: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  textLinkHover: string;

  // Focus
  focusRing: string;
}
```

### Typography Tokens

```typescript
interface TypographyTokens {
  // Font families
  fontFamilyBase: string;
  fontFamilyHeading: string;
  fontFamilyMono: string;

  // Font sizes (rem)
  fontSizeXs: string;   // 0.75rem
  fontSizeSm: string;   // 0.875rem
  fontSizeMd: string;   // 1rem
  fontSizeLg: string;   // 1.125rem
  fontSizeXl: string;   // 1.25rem
  fontSize2xl: string;  // 1.5rem
  fontSize3xl: string;  // 1.875rem
  fontSize4xl: string;  // 2.25rem

  // Font weights
  fontWeightNormal: string;  // 400
  fontWeightMedium: string;  // 500
  fontWeightSemibold: string; // 600
  fontWeightBold: string;    // 700

  // Line heights
  lineHeightTight: string;   // 1.25
  lineHeightNormal: string;  // 1.5
  lineHeightRelaxed: string; // 1.75

  // Letter spacing
  letterSpacingTight: string;
  letterSpacingNormal: string;
  letterSpacingWide: string;
}
```

### Spacing Tokens

```typescript
interface SpacingTokens {
  space0: string;   // 0
  space1: string;   // 0.25rem (4px)
  space2: string;   // 0.5rem (8px)
  space3: string;   // 0.75rem (12px)
  space4: string;   // 1rem (16px)
  space5: string;   // 1.25rem (20px)
  space6: string;   // 1.5rem (24px)
  space8: string;   // 2rem (32px)
  space10: string;  // 2.5rem (40px)
  space12: string;  // 3rem (48px)
  space16: string;  // 4rem (64px)
  space20: string;  // 5rem (80px)
  space24: string;  // 6rem (96px)
}
```

### Radius Tokens

```typescript
interface RadiusTokens {
  radiusNone: string;   // 0
  radiusSm: string;     // 0.125rem (2px)
  radiusMd: string;     // 0.25rem (4px)
  radiusLg: string;     // 0.5rem (8px)
  radiusXl: string;     // 0.75rem (12px)
  radius2xl: string;    // 1rem (16px)
  radiusFull: string;   // 9999px
}
```

### Shadow Tokens

```typescript
interface ShadowTokens {
  shadowNone: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  shadow2xl: string;
  shadowInner: string;
}
```

### Z-Index Tokens

```typescript
interface ZIndexTokens {
  zIndexBase: string;      // 0
  zIndexDropdown: string;  // 1000
  zIndexSticky: string;    // 1020
  zIndexFixed: string;     // 1030
  zIndexModalBackdrop: string; // 1040
  zIndexModal: string;     // 1050
  zIndexTooltip: string;   // 1060
  zIndexToast: string;     // 1070
}
```

### Breakpoint Tokens

```typescript
interface BreakpointTokens {
  breakpointSm: string;   // 640px
  breakpointMd: string;   // 768px
  breakpointLg: string;   // 1024px
  breakpointXl: string;   // 1280px
  breakpoint2xl: string;  // 1536px
}
```

### Motion Tokens

```typescript
interface MotionTokens {
  // Durations
  durationFast: string;    // 150ms
  durationNormal: string;  // 250ms
  durationSlow: string;    // 400ms

  // Easing curves
  easingDefault: string;   // cubic-bezier(0.4, 0, 0.2, 1)
  easingIn: string;        // cubic-bezier(0.4, 0, 1, 1)
  easingOut: string;       // cubic-bezier(0, 0, 0.2, 1)
  easingInOut: string;     // cubic-bezier(0.4, 0, 0.2, 1)
}
```

---

## Theme Contract

```typescript
// Combined theme contract for vanilla-extract
interface ThemeContract {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  zIndex: ZIndexTokens;
  breakpoints: BreakpointTokens;
  motion: MotionTokens;
}
```

---

## Theme Variants

### Light Theme (Default)

- Background: White/light grays
- Text: Dark grays/black
- Primary: Brand color (e.g., blue)
- Focus: High-contrast ring

### Dark Theme

- Background: Dark grays/near-black
- Text: Light grays/white
- Primary: Adjusted brand color for dark backgrounds
- Focus: Light-colored ring

### Brand Theme Extension

```typescript
// Downstream products extend base theme
type BrandTheme = Partial<ThemeContract>;

// Usage:
const acmeBrandTheme: BrandTheme = {
  colors: {
    primary: '#FF5722',
    primaryHover: '#E64A19',
    primaryActive: '#BF360C',
    // ... other overrides
  },
};
```

---

## Component Props Interfaces

### Common Props

```typescript
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

interface InteractiveProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
```

### Button

**Note**: Full interface defined in [contracts/components.md](contracts/components.md)

```typescript
interface ButtonProps extends InteractiveProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

### Input

**Note**: Full interface defined in [contracts/components.md](contracts/components.md)

```typescript
interface InputProps extends InteractiveProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  size: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}
```

### Alert

```typescript
interface AlertProps extends BaseComponentProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}
```

### Modal

**Note**: Full interface defined in [contracts/components.md](contracts/components.md)

```typescript
interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}
```

---

## State Transitions

### Interactive Component States

```
┌─────────┐
│ Default │
└────┬────┘
     │
     ├──► Hover ──► Active ──► Default
     │
     ├──► Focus ──► (any action) ──► Blur ──► Default
     │
     └──► Disabled (terminal until prop change)

Loading State:
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Default │ ──────► │ Loading │ ──────► │ Default │
└─────────┘  start  └─────────┘  finish └─────────┘
```

### Modal Lifecycle

```
┌────────┐         ┌────────┐         ┌────────┐
│ Closed │ ──────► │ Opening │ ──────► │  Open  │
└────────┘  open   └────────┘ animate └────────┘
                                           │
                                    close  │
                                           ▼
                               ┌─────────────────┐
                               │     Closing     │
                               └────────┬────────┘
                                        │ animate
                                        ▼
                               ┌────────────────┐
                               │     Closed     │
                               └────────────────┘
```

---

## Validation Rules

### Token Values

- All color values MUST be valid CSS color strings (hex, rgb, hsl, oklch)
- All spacing values MUST be valid CSS length units (rem preferred)
- All duration values MUST be valid CSS time units (ms or s)
- Font sizes MUST use rem for accessibility (user font scaling)

### Component Props

- `variant` props MUST be one of the defined literal types
- `size` props MUST be one of: 'sm', 'md', 'lg' (some components add 'xl')
- Refs MUST be forwarded to the root DOM element
- Event handlers MUST match React's synthetic event types

### Accessibility

- All interactive components MUST have keyboard support
- Focus indicators MUST meet WCAG 2.1 AA contrast (3:1 minimum)
- Color alone MUST NOT convey information (icons/text required)
- Touch targets MUST be at least 44x44px
