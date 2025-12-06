---
work_package_id: "WP02"
subtasks:
  - "T014"
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
title: "Design Token System"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "github-copilot-claude"
shell_pid: "46272"
review_status: "pending"
reviewed_by: ""
history:
  - timestamp: "2025-12-06T00:49:00Z"
    lane: "for_review"
    agent: "github-copilot-claude"
    shell_pid: "46272"
    action: "Implementation complete: 8 token categories created, all quality checks passing, tests passing (11/11)"
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP02-design-token-system.md](kitty-specs/022-frontend-design-system/tasks/planned/WP02-design-token-system.md)*

# Work Package Prompt: WP02 – Design Token System

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged` in the frontmatter.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

### Objectives
1. Create a comprehensive design token system with 8 categories
2. Use vanilla-extract theme contracts for type-safe token access
3. Generate CSS custom properties from tokens
4. Ensure tokens are consumable as both CSS variables and TypeScript values

### Success Criteria
- [ ] All 8 token categories implemented: colors, typography, spacing, radius, shadows, zIndex, breakpoints, motion
- [ ] `pnpm --filter design-system build` generates CSS with all custom properties
- [ ] TypeScript imports for tokens resolve with correct types
- [ ] Theme contract can be extended for custom themes
- [ ] Unit tests verify token exports

---

## Context & Constraints

### Reference Documents
- Constitution: `.kittify/memory/constitution.md` (Principles I, III, VII)
- Data Model: `kitty-specs/022-frontend-design-system/data-model.md`
- Contracts: `kitty-specs/022-frontend-design-system/contracts/components.md`
- Research: `kitty-specs/022-frontend-design-system/research.md`

### Technical Constraints
- **vanilla-extract**: Use `createThemeContract` and `createTheme`
- **Naming**: Semantic names (e.g., `color.text.primary`) not raw values
- **CSS Variables**: Must be usable by B14 Django templates
- **Type Safety**: All tokens must be typed

### Token Categories (from data-model.md)
1. **Colors**: semantic (text, background, border, interactive) + palette (neutral, primary, success, warning, error)
2. **Typography**: fontFamily, fontSize (7 sizes), fontWeight, lineHeight
3. **Spacing**: 13-point scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
4. **Radius**: none, sm, md, lg, xl, full
5. **Shadows**: none, sm, md, lg, xl
6. **Z-Index**: base, dropdown, sticky, modal, popover, tooltip
7. **Breakpoints**: sm, md, lg, xl, 2xl
8. **Motion**: duration (fast, normal, slow), easing (default, in, out, inOut)

---

## Subtasks & Detailed Guidance

### Subtask T014 – Create colors.css.ts
- **Purpose**: Define semantic and palette color tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/colors.css.ts`
  2. Define color contract with semantic colors (text, background, border, interactive)
  3. Include palette colors (neutral scale, primary, success, warning, error)
  4. Export types for color tokens
- **Files**:
  - `packages/design-system/src/tokens/colors.css.ts`
- **Parallel?**: No (establishes pattern for other token files)

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const colorVars = createThemeContract({
  text: {
    primary: '',
    secondary: '',
    tertiary: '',
    disabled: '',
    inverse: '',
    link: '',
    error: '',
    success: '',
    warning: '',
  },
  background: {
    primary: '',
    secondary: '',
    tertiary: '',
    inverse: '',
    overlay: '',
    success: '',
    warning: '',
    error: '',
    info: '',
  },
  border: {
    primary: '',
    secondary: '',
    focus: '',
    error: '',
  },
  interactive: {
    primary: '',
    primaryHover: '',
    primaryActive: '',
    secondary: '',
    secondaryHover: '',
    secondaryActive: '',
    destructive: '',
    destructiveHover: '',
    destructiveActive: '',
    disabled: '',
  },
});
```

### Subtask T015 – Create typography.css.ts [P]
- **Purpose**: Define typography tokens (fonts, sizes, weights, line heights)
- **Steps**:
  1. Create `packages/design-system/src/tokens/typography.css.ts`
  2. Define font family contract (sans, mono)
  3. Define font size scale (xs through 4xl)
  4. Define font weights and line heights
- **Files**:
  - `packages/design-system/src/tokens/typography.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const typographyVars = createThemeContract({
  fontFamily: {
    sans: '',
    mono: '',
  },
  fontSize: {
    xs: '',    // 12px
    sm: '',    // 14px
    md: '',    // 16px
    lg: '',    // 18px
    xl: '',    // 20px
    '2xl': '', // 24px
    '3xl': '', // 30px
    '4xl': '', // 36px
  },
  fontWeight: {
    normal: '',
    medium: '',
    semibold: '',
    bold: '',
  },
  lineHeight: {
    tight: '',
    normal: '',
    relaxed: '',
  },
});
```

### Subtask T016 – Create spacing.css.ts [P]
- **Purpose**: Define spacing scale for margins, paddings, gaps
- **Steps**:
  1. Create `packages/design-system/src/tokens/spacing.css.ts`
  2. Define 13-point spacing scale based on 4px unit
- **Files**:
  - `packages/design-system/src/tokens/spacing.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const spacingVars = createThemeContract({
  '0': '',   // 0px
  '1': '',   // 4px
  '2': '',   // 8px
  '3': '',   // 12px
  '4': '',   // 16px
  '5': '',   // 20px
  '6': '',   // 24px
  '8': '',   // 32px
  '10': '',  // 40px
  '12': '',  // 48px
  '16': '',  // 64px
  '20': '',  // 80px
  '24': '',  // 96px
});
```

### Subtask T017 – Create radius.css.ts [P]
- **Purpose**: Define border radius tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/radius.css.ts`
  2. Define radius scale (none, sm, md, lg, xl, full)
- **Files**:
  - `packages/design-system/src/tokens/radius.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const radiusVars = createThemeContract({
  none: '',   // 0px
  sm: '',     // 2px
  md: '',     // 4px
  lg: '',     // 8px
  xl: '',     // 12px
  full: '',   // 9999px
});
```

### Subtask T018 – Create shadows.css.ts [P]
- **Purpose**: Define box shadow tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/shadows.css.ts`
  2. Define shadow scale (none, sm, md, lg, xl)
- **Files**:
  - `packages/design-system/src/tokens/shadows.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const shadowVars = createThemeContract({
  none: '',
  sm: '',
  md: '',
  lg: '',
  xl: '',
});
```

### Subtask T019 – Create zIndex.css.ts [P]
- **Purpose**: Define z-index layer tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/zIndex.css.ts`
  2. Define layer hierarchy (base, dropdown, sticky, modal, popover, tooltip)
- **Files**:
  - `packages/design-system/src/tokens/zIndex.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const zIndexVars = createThemeContract({
  base: '',      // 0
  dropdown: '',  // 100
  sticky: '',    // 200
  modal: '',     // 300
  popover: '',   // 400
  tooltip: '',   // 500
});
```

### Subtask T020 – Create breakpoints.css.ts [P]
- **Purpose**: Define responsive breakpoint tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/breakpoints.css.ts`
  2. Define breakpoint values (sm, md, lg, xl, 2xl)
  3. Note: Breakpoints are raw values, not CSS custom properties
- **Files**:
  - `packages/design-system/src/tokens/breakpoints.css.ts`
- **Parallel?**: Yes

```typescript
// Breakpoints are raw values for media queries, not CSS variables
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof breakpoints;
```

### Subtask T021 – Create motion.css.ts [P]
- **Purpose**: Define animation duration and easing tokens
- **Steps**:
  1. Create `packages/design-system/src/tokens/motion.css.ts`
  2. Define duration scale (fast, normal, slow)
  3. Define easing curves (default, in, out, inOut)
- **Files**:
  - `packages/design-system/src/tokens/motion.css.ts`
- **Parallel?**: Yes

```typescript
import { createThemeContract } from '@vanilla-extract/css';

export const motionVars = createThemeContract({
  duration: {
    fast: '',    // 100ms
    normal: '',  // 200ms
    slow: '',    // 300ms
  },
  easing: {
    default: '',  // ease
    in: '',       // ease-in
    out: '',      // ease-out
    inOut: '',    // ease-in-out
  },
});
```

### Subtask T022 – Create theme.css.ts
- **Purpose**: Unify all token contracts into a single theme contract
- **Steps**:
  1. Create `packages/design-system/src/tokens/theme.css.ts`
  2. Combine all individual contracts into unified `themeVars`
  3. Export the combined contract
- **Files**:
  - `packages/design-system/src/tokens/theme.css.ts`
- **Parallel?**: No (depends on T014-T021)

```typescript
import { colorVars } from './colors.css';
import { typographyVars } from './typography.css';
import { spacingVars } from './spacing.css';
import { radiusVars } from './radius.css';
import { shadowVars } from './shadows.css';
import { zIndexVars } from './zIndex.css';
import { motionVars } from './motion.css';

export const themeVars = {
  color: colorVars,
  typography: typographyVars,
  spacing: spacingVars,
  radius: radiusVars,
  shadow: shadowVars,
  zIndex: zIndexVars,
  motion: motionVars,
} as const;

export type ThemeVars = typeof themeVars;
```

### Subtask T023 – Create tokens index.ts
- **Purpose**: Barrel export all tokens for clean imports
- **Steps**:
  1. Create `packages/design-system/src/tokens/index.ts`
  2. Re-export all token contracts and breakpoints
- **Files**:
  - `packages/design-system/src/tokens/index.ts`
- **Parallel?**: No (depends on T014-T022)

```typescript
export { colorVars } from './colors.css';
export { typographyVars } from './typography.css';
export { spacingVars } from './spacing.css';
export { radiusVars } from './radius.css';
export { shadowVars } from './shadows.css';
export { zIndexVars } from './zIndex.css';
export { motionVars } from './motion.css';
export { breakpoints, type Breakpoint } from './breakpoints.css';
export { themeVars, type ThemeVars } from './theme.css';
```

### Subtask T024 – Verify CSS output
- **Purpose**: Ensure build produces correct CSS custom properties
- **Steps**:
  1. Run `pnpm --filter design-system build`
  2. Inspect `dist/` for CSS output
  3. Verify all token variables are present as `--[prefix]-[path]`
  4. Document the CSS variable naming pattern
- **Files**:
  - None (verification task)
- **Parallel?**: No (depends on all previous tasks)

### Subtask T025 – Write token tests
- **Purpose**: Unit tests for token type exports
- **Steps**:
  1. Create `packages/design-system/src/tokens/tokens.test.ts`
  2. Test that all token contracts are defined
  3. Test type inference for token values
- **Files**:
  - `packages/design-system/src/tokens/tokens.test.ts`
- **Parallel?**: No (depends on T023)

```typescript
import { themeVars, breakpoints } from './index';

describe('Design Tokens', () => {
  it('should export theme variables', () => {
    expect(themeVars).toBeDefined();
    expect(themeVars.color).toBeDefined();
    expect(themeVars.typography).toBeDefined();
    expect(themeVars.spacing).toBeDefined();
    expect(themeVars.radius).toBeDefined();
    expect(themeVars.shadow).toBeDefined();
    expect(themeVars.zIndex).toBeDefined();
    expect(themeVars.motion).toBeDefined();
  });

  it('should export breakpoints', () => {
    expect(breakpoints.sm).toBe('640px');
    expect(breakpoints.md).toBe('768px');
    expect(breakpoints.lg).toBe('1024px');
    expect(breakpoints.xl).toBe('1280px');
    expect(breakpoints['2xl']).toBe('1536px');
  });
});
```

---

## Test Strategy

### Verification Commands
```bash
pnpm --filter design-system build
pnpm --filter design-system test -- --testPathPattern=tokens
```

### Expected Outcomes
- Build produces CSS with custom properties like `--color-text-primary`
- TypeScript compilation succeeds with all token imports
- Token tests pass

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Token naming conflicts | Follow semantic naming from data-model.md |
| CSS variable naming too long | Use abbreviated prefixes where clear |
| Theme contract complexity | Keep contracts flat, document structure |

---

## Definition of Done Checklist

- [ ] All 8 token category files created
- [ ] `theme.css.ts` unifies all contracts
- [ ] `index.ts` exports all tokens
- [ ] Build generates CSS with custom properties
- [ ] TypeScript types resolve correctly
- [ ] Token tests pass
- [ ] `tasks.md` updated with WP02 status

---

## Review Guidance

Reviewers should verify:
1. Token naming matches data-model.md specification
2. All contracts use `createThemeContract` correctly
3. Breakpoints are raw values (not CSS variables)
4. CSS output has correct custom property format
5. Types are correctly inferred

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-06T11:25:47Z – system – shell_pid= – lane=doing – Started implementation of design token system
