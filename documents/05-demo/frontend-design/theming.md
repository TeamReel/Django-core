# Theming & Brand Identity

> Last updated: 2026-03-12

## Overview

TeamReel supports light and dark themes via **semantic tokens** that map to primitive color tokens. The theme is controlled by a `data-theme` attribute on the root element.

## Theme Architecture

```
tokens.css          →  Primitive palette (140 color tokens, 9 scales)
    ↓
theme.css           →  Semantic mapping per theme (99 semantic tokens)
    ↓
CSS Modules/Utils   →  Reference semantic tokens only
```

Components never reference primitive tokens directly for theme-sensitive properties. Instead, they use semantic tokens like `var(--app-bg)` which resolve differently per theme.

## Semantic Token Map

### Core surface & text

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--app-bg` | Neutral 50 (Ice White) | Neutral 900 (Midnight) | Page background |
| `--app-text` | Neutral 800 (Deep Navy) | Neutral 50 (Ice White) | Primary text |
| `--app-muted-text` | Neutral 400 | Neutral 300 | Secondary/helper text |
| `--app-surface` | `#ffffff` | Neutral 800 | Card/panel background |
| `--app-surface-2` | `#F0F4F8` | `#243f6e` | Nested surface (tabs, wells) |
| `--app-border` | `#e5e5e5` | `#2e4a6d` | Dividers, outlines |

### Interactive

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--app-link` | Primary 400 (Ocean Teal) | Blue 400 (Sky Blue) | Links, clickable text |
| `--app-focus-ring` | `#4CA1FF` | `#FF8C42` (Amber) | Focus indicators |
| `--app-primary` | Primary 400 | Primary 400 | Primary action buttons |
| `--app-danger` | Red 400 | Red 400 | Destructive actions |

### Status

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--app-success` | Green 500 | Green 500 | Success states |
| `--app-warning` | Amber 300 | Amber 300 | Warnings |
| `--app-error` | Red 400 | Red 400 | Error states |

### Sidebar tokens

The sidebar uses dedicated token sets for its two panels:

- **Panel A** (nav strip): `--sidebar-a-bg`, `--sidebar-a-text`, `--sidebar-a-hover`
- **Panel B** (context strip): `--sidebar-b-bg`, `--sidebar-b-text`, `--sidebar-b-border`

## Theme Switching

```tsx
// Toggle theme
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
```

The theme preference is persisted in `localStorage` and respects `prefers-color-scheme` as the initial default.

## Brand Color Palette

TeamReel's brand identity is built on these anchor colors:

| Color | Name | Hex | Role |
|-------|------|-----|------|
| 🟢 | Ocean Teal | `#3B8EA5` | Primary brand, CTAs, active states |
| 🔵 | Deep Navy | `#1C355E` | Dark backgrounds, sidebar, headers |
| ⬛ | Midnight Navy | `#0A192F` | Darkest background (dark mode) |
| 🔴 | Coral Red | `#E63946` | Errors, destructive actions |
| 🟡 | Amber Momentum | `#FFD166` | Warnings, highlights |
| 🟢 | Emerald Green | `#06D6A0` | Success, completion |
| 🔵 | Sky Blue | `#3b82f6` | Info, links (especially dark mode) |
| ⬜ | Ice White | `#EDF6FF` | Light backgrounds, neutral 50 |

## Using Theme Tokens in Components

### In CSS Modules

```css
/* ✅ Correct — uses semantic tokens */
.card {
  background: var(--app-surface);
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

/* ❌ Wrong — primitive tokens break in theme switch */
.card {
  background: #ffffff;
  color: var(--color-neutral-800);
}
```

### In Utility Classes

```html
<span class="text-muted">Secondary info</span>     <!-- Uses --app-muted-text -->
<div class="bg-surface">Card</div>                  <!-- Uses --app-surface -->
<span class="text-primary">Highlighted</span>       <!-- Uses --app-primary -->
```

### For Status Colors

```html
<span class="text-success">Approved</span>
<span class="text-warning">Pending review</span>
<span class="text-error">Failed</span>
```

## Dark Mode Shadows

Shadows use separate dark-mode values defined in `tokens.css`:

```css
[data-theme="dark"] {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);    /* Darker, more diffuse */
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
}
```

## Club Brand Colors

Individual clubs have their own brand colors stored in `BrandProfile`. These are applied as **dynamic inline styles** (legitimate use case):

```tsx
<div style={{ backgroundColor: club.brandProfile.primaryColor }}>
  {/* Club-branded header */}
</div>
```

This is one of the ~220 allowed inline style patterns — data-driven colors from the API cannot be expressed as static CSS.

## Adding Theme Support to New Components

1. Use semantic tokens (`--app-*`) for all color, background, and border properties
2. Test in both themes: toggle `data-theme` attribute
3. Check contrast ratios: all text must meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
4. If a component needs unique theme behavior, add semantic tokens in `theme.css` under both `:root` and `[data-theme="dark"]`
