---
work_package_id: "WP10"
subtasks:
  - "T116"
  - "T117"
  - "T118"
  - "T119"
  - "T120"
  - "T121"
  - "T122"
  - "T123"
  - "T124"
  - "T125"
title: "Documentation & B14 Integration"
phase: "Phase 2 - Polish"
lane: "for_review"
assignee: ""
agent: "github-copilot"
shell_pid: "17604"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP10-documentation-b14-integration.md](kitty-specs/022-frontend-design-system/tasks/planned/WP10-documentation-b14-integration.md)*

# Work Package Prompt: WP10 – Documentation & B14 Integration

## ⚠️ IMPORTANT: Review Feedback Status

- **Has review feedback?**: Check the `review_status` field above.

---

## Review Feedback

*[This section is empty initially.]*

---

## Objectives & Success Criteria

### Objectives
1. Complete package documentation (README, JSDoc)
2. Create usage examples in Storybook MDX
3. Configure standalone CSS export for B14 integration
4. Document B14 Django template integration pattern
5. Verify tree-shaking effectiveness
6. Final accessibility audit

### Success Criteria
- [ ] README.md comprehensive with installation, usage, API
- [ ] All components have JSDoc comments
- [ ] Storybook includes MDX usage examples
- [ ] `tokens.css` standalone file exported
- [ ] B14 integration guide created
- [ ] Tree-shaking reduces bundle by 60%+ when importing 3 components
- [ ] Final axe-core audit passes with zero critical violations

---

## Context & Constraints

### Reference Documents
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-023-FR-027)
- Quickstart: `kitty-specs/022-frontend-design-system/quickstart.md`

### Technical Constraints
- CSS export must be a static file (no runtime)
- B14 uses CSS custom properties, no React
- Tree-shaking requires ESM exports

### Dependencies
- Requires all component work packages (WP04-WP08)

---

## Subtasks & Detailed Guidance

### Subtask T116 – Create comprehensive README.md
- **Purpose**: Entry point documentation for the package
- **Steps**:
  1. Update `packages/design-system/README.md`
  2. Include sections: Installation, Quick Start, Components, Theming, B14 Integration, Contributing
  3. Add badges (npm version, CI status, coverage)
  4. Include code examples
- **Files**:
  - `packages/design-system/README.md`

```markdown
# @django-core/design-system

Product-agnostic design system for Django Core-App frontend applications.

[![CI](https://github.com/org/repo/actions/workflows/design-system.yml/badge.svg)](...)
[![npm version](https://badge.fury.io/js/@django-core%2Fdesign-system.svg)](...)

## Installation

```bash
pnpm add @django-core/design-system
```

## Quick Start

```tsx
import { ThemeProvider, Button, Stack } from '@django-core/design-system';

function App() {
  return (
    <ThemeProvider>
      <Stack gap="4">
        <Button variant="primary">Click me</Button>
      </Stack>
    </ThemeProvider>
  );
}
```

## Components

- **Form**: Button, Input, Textarea, Checkbox, Radio
- **Feedback**: Card, Alert, Badge, Spinner
- **Typography**: Heading, Text
- **Layout**: Stack, Grid, Container
- **Interaction**: Modal, Select, Tabs, Tooltip

## Theming

See [Theming Guide](./docs/theming.md) for custom brand themes.

## B14 Integration

For Django templates, import the CSS tokens:

```html
<link rel="stylesheet" href="node_modules/@django-core/design-system/dist/tokens.css">
```

Then use CSS variables:

```css
.my-element {
  color: var(--color-text-primary);
  padding: var(--spacing-4);
}
```

## Contributing

See [Contributing Guide](./CONTRIBUTING.md).
```

### Subtask T117 – Add JSDoc to all components [P]
- **Purpose**: Inline documentation for IDE support
- **Steps**:
  1. Add JSDoc comments to all component props interfaces
  2. Add JSDoc comments to component functions
  3. Document params, returns, and examples
- **Files**:
  - All component `*.tsx` files

```typescript
/**
 * Button component for user actions.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * ```
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading spinner and disables interaction */
  loading?: boolean;
  /** Makes button full width of container */
  fullWidth?: boolean;
}
```

### Subtask T118 – Create Storybook MDX docs [P]
- **Purpose**: Rich documentation with examples
- **Steps**:
  1. Create MDX files for component categories
  2. Include usage examples, props tables, do's and don'ts
  3. Link to related components
- **Files**:
  - `packages/design-system/src/docs/GettingStarted.mdx`
  - `packages/design-system/src/docs/Theming.mdx`
  - `packages/design-system/src/docs/Tokens.mdx`

```mdx
{/* GettingStarted.mdx */}
import { Meta } from '@storybook/blocks';

<Meta title="Getting Started" />

# Getting Started

## Installation

```bash
pnpm add @django-core/design-system
```

## Setup

Wrap your app in ThemeProvider:

```tsx
import { ThemeProvider } from '@django-core/design-system';

function App() {
  return (
    <ThemeProvider>
      {/* Your app */}
    </ThemeProvider>
  );
}
```

## Next Steps

- Browse [Components](/docs/components)
- Learn about [Theming](/docs/theming)
- See [Tokens](/docs/tokens)
```

### Subtask T119 – Configure tokens.css export
- **Purpose**: Standalone CSS for B14 integration
- **Steps**:
  1. Update Vite config to output `tokens.css`
  2. Ensure all CSS custom properties are included
  3. Add to package.json exports
- **Files**:
  - `packages/design-system/vite.config.ts`
  - `packages/design-system/package.json`

```typescript
// vite.config.ts addition
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'tokens.css';
          }
          return assetInfo.name;
        },
      },
    },
  },
});
```

```json
// package.json exports
{
  "exports": {
    ".": { ... },
    "./tokens.css": "./dist/tokens.css"
  }
}
```

### Subtask T120 – Document B14 integration pattern
- **Purpose**: Help B14 users consume design tokens
- **Steps**:
  1. Create detailed integration guide
  2. Show CSS variable usage in Django templates
  3. Provide example Jinja2/Django template code
  4. Explain relationship between F01 and B14
- **Files**:
  - `packages/design-system/docs/b14-integration.md`

```markdown
# B14 Web UI Baseline Integration

This guide explains how to use F01 design tokens in B14 Django templates.

## Overview

B14 templates can use F01's design tokens via CSS custom properties without requiring React.

## Setup

1. Add the tokens CSS to your Django base template:

```html
{% load static %}
<link rel="stylesheet" href="{% static 'design-system/tokens.css' %}">
```

2. Copy `tokens.css` to your static files during build.

## Using Tokens

### Colors

```css
.my-heading {
  color: var(--color-text-primary);
}

.my-card {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border-primary);
}
```

### Spacing

```css
.my-section {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}
```

### Typography

```css
.my-text {
  font-family: var(--typography-fontFamily-sans);
  font-size: var(--typography-fontSize-md);
}
```

## Theme Support

B14 templates can support dark mode by applying the dark theme class:

```html
<html class="{{ dark_theme_class }}">
```

All CSS variables will automatically update.

## What NOT to Use

- Don't import React components into Django templates
- Don't use F01's JavaScript in B14
- Only use CSS custom properties for styling consistency
```

### Subtask T121 – Create docs/design-system-b14-integration.md
- **Purpose**: Repository-level integration guide
- **Steps**:
  1. Create guide in main docs/ folder
  2. Reference from both F01 and B14 documentation
  3. Include decision tree for when to use each
- **Files**:
  - `docs/design-system-b14-integration.md`

### Subtask T122 – Update quickstart.md
- **Purpose**: Ensure quickstart reflects final implementation
- **Steps**:
  1. Update `kitty-specs/022-frontend-design-system/quickstart.md`
  2. Verify all paths are correct
  3. Test the quickstart scenario end-to-end
- **Files**:
  - `kitty-specs/022-frontend-design-system/quickstart.md`

### Subtask T123 – Create component barrel exports
- **Purpose**: Clean public API
- **Steps**:
  1. Create `packages/design-system/src/index.ts`
  2. Export all components, theme utilities, and tokens
  3. Ensure exports support tree-shaking
- **Files**:
  - `packages/design-system/src/index.ts`

```typescript
// Components
export { Button, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Textarea, type TextareaProps } from './components/Textarea';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Radio, RadioGroup, type RadioProps } from './components/Radio';
export { Card, type CardProps } from './components/Card';
export { Alert, type AlertProps } from './components/Alert';
export { Badge, type BadgeProps } from './components/Badge';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Heading, type HeadingProps } from './components/Heading';
export { Text, type TextProps } from './components/Text';
export { Stack, type StackProps } from './components/Stack';
export { Grid, type GridProps } from './components/Grid';
export { Container, type ContainerProps } from './components/Container';
export { Modal, type ModalProps } from './components/Modal';
export { Select, type SelectProps } from './components/Select';
export { Tabs, TabList, Tab, TabPanel } from './components/Tabs';
export { Tooltip, type TooltipProps } from './components/Tooltip';

// Theme
export { ThemeProvider, useTheme, type ThemeMode } from './theme';
export { lightTheme, darkTheme } from './theme';

// Tokens
export { themeVars, breakpoints } from './tokens';
export type { ThemeVars, Breakpoint } from './tokens';
```

### Subtask T124 – Verify tree-shaking
- **Purpose**: Ensure unused code is eliminated
- **Steps**:
  1. Create test app that imports only Button
  2. Build the test app
  3. Analyze bundle size
  4. Compare to full library import
  5. Document results (should be 60%+ reduction)
- **Files**:
  - None (verification task)

```bash
# Create simple test
echo 'import { Button } from "@django-core/design-system"' > test-treeshake.ts

# Build and analyze
# Compare bundle sizes
```

### Subtask T125 – Final accessibility audit
- **Purpose**: Ensure all components are accessible
- **Steps**:
  1. Run axe-core against all Storybook stories
  2. Fix any critical violations
  3. Document known limitations (if any)
  4. Generate accessibility report
- **Files**:
  - `packages/design-system/ACCESSIBILITY.md`

```bash
# Run accessibility tests
pnpm --filter design-system test -- --testPathPattern=".test.tsx" --collectCoverage

# Check Storybook a11y addon for all stories
```

---

## Test Strategy

### Verification Commands
```bash
# Build and verify outputs
pnpm --filter design-system build
ls packages/design-system/dist/

# Check tokens.css exists
cat packages/design-system/dist/tokens.css | head -20

# Run full test suite
pnpm --filter design-system test --coverage
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CSS variable naming too long | Use abbreviated prefixes |
| B14 stylesheet conflicts | Document specificity considerations |
| Tree-shaking not working | Ensure ESM exports, sideEffects config |

---

## Definition of Done Checklist

- [ ] README.md comprehensive and accurate
- [ ] JSDoc on all exported components
- [ ] Storybook MDX docs created
- [ ] tokens.css exported and documented
- [ ] B14 integration guide complete
- [ ] Component barrel exports configured
- [ ] Tree-shaking verified (60%+ reduction)
- [ ] Accessibility audit passed
- [ ] quickstart.md updated
- [ ] `tasks.md` updated with WP10 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-07T14:25:31Z – github-copilot – shell_pid=17604 – lane=doing – Starting documentation and B14 integration
- 2025-12-07T14:34:30Z – github-copilot – shell_pid=17604 – lane=for_review – Documentation complete - all 10 subtasks finished
