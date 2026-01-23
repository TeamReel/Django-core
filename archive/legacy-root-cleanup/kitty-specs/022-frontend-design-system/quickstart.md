# Quickstart: Frontend Design System Foundation
*Path: [kitty-specs/022-frontend-design-system/quickstart.md](kitty-specs/022-frontend-design-system/quickstart.md)*

**Feature Branch**: `022-frontend-design-system`
**Date**: 2025-12-05

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (for workspace support)
- Git

## Getting Started

### 1. Clone and Setup

```bash
# From Django-core root
cd packages/design-system

# Install dependencies
pnpm install
```

### 2. Development

```bash
# Start Storybook (component development)
pnpm storybook

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### 3. Build

```bash
# Build the library
pnpm build

# Build Storybook for deployment
pnpm build-storybook
```

---

## Using the Design System

### Installation (Downstream Apps)

```bash
# From a downstream app in the monorepo
pnpm add @django-core/design-system
```

### Basic Usage

```tsx
import { Button, Input, Card, ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/styles.css';

function App() {
  return (
    <ThemeProvider theme="light">
      <Card>
        <Input placeholder="Enter your name" />
        <Button variant="primary" size="md">
          Submit
        </Button>
      </Card>
    </ThemeProvider>
  );
}
```

### Using Tokens Directly

```tsx
import { tokens } from '@django-core/design-system/tokens';

// Type-safe token access
const styles = {
  padding: tokens.spacing.space4,
  color: tokens.colors.textPrimary,
  fontFamily: tokens.typography.fontFamilyBase,
};
```

### Custom Theming

```tsx
import { ThemeProvider, createBrandTheme } from '@django-core/design-system';

const acmeTheme = createBrandTheme({
  colors: {
    primary: '#FF5722',
    primaryHover: '#E64A19',
  },
});

function App() {
  return (
    <ThemeProvider theme={acmeTheme}>
      {/* Components use Acme brand colors */}
    </ThemeProvider>
  );
}
```

---

## B14 Integration (Django Templates)

### Include Token Stylesheet

```html
<!-- In Django base template -->
<link rel="stylesheet" href="{% static 'design-system/tokens.css' %}">
```

### Use CSS Variables

```css
/* In B14 stylesheets */
.my-component {
  padding: var(--space-4);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
  border-radius: var(--radius-md);
}

.my-button {
  background-color: var(--color-primary);
  transition: background-color var(--duration-fast) var(--easing-default);
}

.my-button:hover {
  background-color: var(--color-primary-hover);
}
```

### Theme Switching (B14)

```html
<!-- Light theme (default) -->
<html data-theme="light">

<!-- Dark theme -->
<html data-theme="dark">
```

---

## Project Structure

```
packages/design-system/
├── src/
│   ├── tokens/
│   │   ├── colors.css.ts      # Color token definitions
│   │   ├── typography.css.ts  # Typography tokens
│   │   ├── spacing.css.ts     # Spacing scale
│   │   ├── motion.css.ts      # Animation tokens
│   │   ├── theme.css.ts       # Theme contract + variants
│   │   └── index.ts           # Token exports
│   │
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.css.ts
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Alert/
│   │   ├── Modal/
│   │   ├── ... (other components)
│   │   └── index.ts
│   │
│   ├── theme/
│   │   ├── ThemeProvider.tsx
│   │   ├── useTheme.ts
│   │   └── index.ts
│   │
│   └── index.ts               # Main entry point
│
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── theme.ts
│
├── tests/
│   └── setup.ts
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Vite dev server (for testing) |
| `pnpm build` | Build library for production |
| `pnpm storybook` | Start Storybook dev server |
| `pnpm build-storybook` | Build Storybook for deployment |
| `pnpm test` | Run Jest tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Run Prettier |
| `pnpm chromatic` | Run visual regression tests |

---

## Common Tasks

### Adding a New Component

1. Create component folder: `src/components/MyComponent/`
2. Create files:
   - `MyComponent.tsx` — React component
   - `MyComponent.css.ts` — vanilla-extract styles
   - `MyComponent.test.tsx` — Jest tests
   - `MyComponent.stories.tsx` — Storybook stories
   - `index.ts` — re-exports
3. Export from `src/components/index.ts`
4. Add to main `src/index.ts` exports

### Adding a New Token

1. Add to appropriate token file in `src/tokens/`
2. Update theme contract in `src/tokens/theme.css.ts`
3. Regenerate types: `pnpm build`
4. Update light/dark theme variants

### Testing Accessibility

```bash
# Run axe-core checks in Storybook
pnpm storybook
# Open a11y panel in Storybook sidebar

# Run accessibility tests in CI
pnpm test:a11y
```

---

## Troubleshooting

### Styles Not Applying

1. Ensure `@django-core/design-system/styles.css` is imported
2. Check that `ThemeProvider` wraps your app
3. Verify vanilla-extract build completed successfully

### Type Errors

1. Run `pnpm typecheck` to see all errors
2. Ensure `@types/react` version matches React version
3. Check token imports use correct paths

### Storybook Issues

1. Clear cache: `rm -rf node_modules/.cache/storybook`
2. Reinstall: `pnpm install`
3. Check for conflicting Vite plugins
