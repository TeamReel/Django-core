---
work_package_id: "WP02"
subtasks:
  - "T012"
  - "T013"
  - "T014"
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
title: "Theme Contracts & Token Definition"
phase: "Phase 1 - Core Theme System"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "29516"
review_status: "pending"
reviewed_by: ""
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-13T20:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "29516"
    action: "Started WP02 implementation: Theme contracts & token definition"
---

# Work Package Prompt: WP02 – Theme Contracts & Token Definition

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Implement vanilla-extract theme contracts mapping F01 design tokens to semantic theme variables.

**Success Criteria**:
- ✅ `themeVars` contract defined with light/dark color modes
- ✅ F01 primitive tokens mapped to semantic names (e.g., `bg.primary`, `text.body`)
- ✅ Brand variant contracts (default, customer-specific) with hierarchical inheritance
- ✅ TypeScript types exported for `ThemeConfiguration`, `ThemeMode`, `BrandVariant`
- ✅ CSS custom properties generated via vanilla-extract (zero runtime overhead)
- ✅ Tests validate token structure and contract completeness

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package scaffold)
- F01 design-system available with primitive tokens

**References**:
- `research.md` Q1 - vanilla-extract decision rationale
- `data-model.md` - ThemeConfiguration, ThemeTokenMap entities
- `contracts/theme-storage.ts` - ThemePreference type definitions
- F01 token structure (import from `@django-core/design-system/tokens`)

**Constraints**:
- Zero runtime JavaScript overhead (compile-time CSS variable generation)
- Type-safe token access (no string literals for color keys)
- WCAG 2.1 AA contrast ratios enforced at build time (preliminary checks)

---

## Subtasks & Detailed Guidance

### Subtask T012 – Define themeVars contract

**Purpose**: Create vanilla-extract contract for core theme tokens

**Steps**:
1. Create `src/themes/contract.css.ts`:
   ```typescript
   import { createThemeContract } from '@vanilla-extract/css';

   export const themeVars = createThemeContract({
     color: {
       bg: {
         primary: null,
         secondary: null,
         tertiary: null,
         inverse: null,
         surface: null,
         overlay: null
       },
       text: {
         primary: null,
         secondary: null,
         tertiary: null,
         inverse: null,
         link: null,
         linkHover: null
       },
       border: {
         default: null,
         subtle: null,
         strong: null,
         focus: null
       },
       action: {
         primary: null,
         primaryHover: null,
         secondary: null,
         secondaryHover: null,
         danger: null,
         dangerHover: null
       },
       state: {
         success: null,
         warning: null,
         error: null,
         info: null
       }
     },
     spacing: {
       xs: null,
       sm: null,
       md: null,
       lg: null,
       xl: null
     },
     radius: {
       sm: null,
       md: null,
       lg: null,
       full: null
     },
     shadow: {
       sm: null,
       md: null,
       lg: null
     }
   });
   ```

**Files**: `src/themes/contract.css.ts`

**Parallel?**: No (foundation for T013-T015)

---

### Subtask T013 – Implement light theme

**Purpose**: Define light mode token values using F01 primitives

**Steps**:
1. Create `src/themes/light.css.ts`:
   ```typescript
   import { createTheme } from '@vanilla-extract/css';
   import { themeVars } from './contract.css';
   import { tokens } from '@django-core/design-system/tokens';

   export const lightTheme = createTheme(themeVars, {
     color: {
       bg: {
         primary: tokens.color.neutral[0], // white
         secondary: tokens.color.neutral[50],
         tertiary: tokens.color.neutral[100],
         inverse: tokens.color.neutral[900], // dark
         surface: tokens.color.neutral[0],
         overlay: 'rgba(0, 0, 0, 0.5)'
       },
       text: {
         primary: tokens.color.neutral[900],
         secondary: tokens.color.neutral[700],
         tertiary: tokens.color.neutral[500],
         inverse: tokens.color.neutral[0],
         link: tokens.color.blue[600],
         linkHover: tokens.color.blue[700]
       },
       border: {
         default: tokens.color.neutral[300],
         subtle: tokens.color.neutral[200],
         strong: tokens.color.neutral[400],
         focus: tokens.color.blue[500]
       },
       action: {
         primary: tokens.color.blue[600],
         primaryHover: tokens.color.blue[700],
         secondary: tokens.color.neutral[200],
         secondaryHover: tokens.color.neutral[300],
         danger: tokens.color.red[600],
         dangerHover: tokens.color.red[700]
       },
       state: {
         success: tokens.color.green[600],
         warning: tokens.color.yellow[600],
         error: tokens.color.red[600],
         info: tokens.color.blue[600]
       }
     },
     spacing: {
       xs: tokens.spacing[1], // 4px
       sm: tokens.spacing[2], // 8px
       md: tokens.spacing[4], // 16px
       lg: tokens.spacing[6], // 24px
       xl: tokens.spacing[8]  // 32px
     },
     radius: {
       sm: tokens.radius[1],
       md: tokens.radius[2],
       lg: tokens.radius[3],
       full: tokens.radius.full
     },
     shadow: {
       sm: tokens.shadow[1],
       md: tokens.shadow[2],
       lg: tokens.shadow[3]
     }
   });
   ```

**Files**: `src/themes/light.css.ts`

**Parallel?**: Can proceed in parallel with T014 if T012 done

---

### Subtask T014 – Implement dark theme

**Purpose**: Define dark mode token values with inverted semantics

**Steps**:
1. Create `src/themes/dark.css.ts`:
   ```typescript
   import { createTheme } from '@vanilla-extract/css';
   import { themeVars } from './contract.css';
   import { tokens } from '@django-core/design-system/tokens';

   export const darkTheme = createTheme(themeVars, {
     color: {
       bg: {
         primary: tokens.color.neutral[900], // dark
         secondary: tokens.color.neutral[800],
         tertiary: tokens.color.neutral[700],
         inverse: tokens.color.neutral[0], // white
         surface: tokens.color.neutral[850],
         overlay: 'rgba(0, 0, 0, 0.7)'
       },
       text: {
         primary: tokens.color.neutral[0],
         secondary: tokens.color.neutral[300],
         tertiary: tokens.color.neutral[500],
         inverse: tokens.color.neutral[900],
         link: tokens.color.blue[400],
         linkHover: tokens.color.blue[300]
       },
       border: {
         default: tokens.color.neutral[600],
         subtle: tokens.color.neutral[700],
         strong: tokens.color.neutral[500],
         focus: tokens.color.blue[400]
       },
       action: {
         primary: tokens.color.blue[500],
         primaryHover: tokens.color.blue[400],
         secondary: tokens.color.neutral[700],
         secondaryHover: tokens.color.neutral[600],
         danger: tokens.color.red[500],
         dangerHover: tokens.color.red[400]
       },
       state: {
         success: tokens.color.green[500],
         warning: tokens.color.yellow[500],
         error: tokens.color.red[500],
         info: tokens.color.blue[500]
       }
     },
     spacing: {
       xs: tokens.spacing[1],
       sm: tokens.spacing[2],
       md: tokens.spacing[4],
       lg: tokens.spacing[6],
       xl: tokens.spacing[8]
     },
     radius: {
       sm: tokens.radius[1],
       md: tokens.radius[2],
       lg: tokens.radius[3],
       full: tokens.radius.full
     },
     shadow: {
       sm: tokens.shadow[1],
       md: tokens.shadow[2],
       lg: tokens.shadow[3]
     }
   });
   ```

**Files**: `src/themes/dark.css.ts`

**Parallel?**: Can proceed in parallel with T013

---

### Subtask T015 – Define brand variant types

**Purpose**: TypeScript types for hierarchical brand customization

**Steps**:
1. Create `src/types/brand.ts`:
   ```typescript
   import type { ThemeTokenMap } from './theme';

   export type BrandVariant = 'default' | 'acme' | 'globex';

   export interface BrandVariantDefinition {
     id: BrandVariant;
     name: string;
     overrides: Partial<ThemeTokenMap>;
   }

   export interface BrandConfig {
     variants: Record<BrandVariant, BrandVariantDefinition>;
     default: BrandVariant;
   }
   ```

**Files**: `src/types/brand.ts`

**Parallel?**: After T012

---

### Subtask T016 – Implement default brand variant

**Purpose**: Reference brand configuration (no overrides)

**Steps**:
1. Create `src/themes/brands/default.ts`:
   ```typescript
   import type { BrandVariantDefinition } from '../../types/brand';

   export const defaultBrand: BrandVariantDefinition = {
     id: 'default',
     name: 'Django Core Default',
     overrides: {}
   };
   ```
2. Create `src/themes/brands/index.ts`:
   ```typescript
   import { defaultBrand } from './default';
   import type { BrandConfig } from '../../types/brand';

   export const brandConfig: BrandConfig = {
     variants: {
       default: defaultBrand
     },
     default: 'default'
   };
   ```

**Files**: `src/themes/brands/default.ts`, `src/themes/brands/index.ts`

**Parallel?**: After T015

---

### Subtask T017 [P] – Define core TypeScript types

**Purpose**: Export theme configuration types

**Steps**:
1. Create `src/types/theme.ts`:
   ```typescript
   import type { themeVars } from '../themes/contract.css';

   export type ThemeMode = 'light' | 'dark' | 'system';

   export type ThemeTokenMap = typeof themeVars;

   export interface ThemeConfiguration {
     mode: ThemeMode;
     brand: string;
     customTokens?: Partial<ThemeTokenMap>;
   }

   export interface ThemePreference {
     mode: ThemeMode;
     brand: string;
     lastUpdated: Date;
   }
   ```

**Files**: `src/types/theme.ts`

**Parallel?**: Yes (after T012)

---

### Subtask T018 – Export theme index

**Purpose**: Public API for theme imports

**Steps**:
1. Update `src/themes/index.ts`:
   ```typescript
   export { themeVars } from './contract.css';
   export { lightTheme } from './light.css';
   export { darkTheme } from './dark.css';
   export { brandConfig } from './brands';
   export type { ThemeMode, ThemeConfiguration, ThemeTokenMap } from '../types/theme';
   export type { BrandVariant, BrandVariantDefinition, BrandConfig } from '../types/brand';
   ```

**Files**: `src/themes/index.ts`

**Parallel?**: After T012-T017

---

### Subtask T019 – Write contract tests

**Purpose**: Validate theme structure and completeness

**Steps**:
1. Create `tests/unit/themes/contract.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { themeVars, lightTheme, darkTheme } from '../../../src/themes';

   describe('Theme Contract', () => {
     it('should define all required color tokens', () => {
       expect(themeVars.color.bg.primary).toBeDefined();
       expect(themeVars.color.text.primary).toBeDefined();
       expect(themeVars.color.action.primary).toBeDefined();
     });

     it('should have matching structure in light and dark themes', () => {
       const lightKeys = Object.keys(lightTheme.color);
       const darkKeys = Object.keys(darkTheme.color);
       expect(lightKeys).toEqual(darkKeys);
     });

     it('should generate CSS custom properties', () => {
       // vanilla-extract generates class names at build time
       expect(lightTheme).toMatch(/^[a-z0-9_]+$/);
       expect(darkTheme).toMatch(/^[a-z0-9_]+$/);
     });
   });
   ```

**Files**: `tests/unit/themes/contract.test.ts`

**Parallel?**: After T012-T018

---

## Test Strategy

**Unit Tests**:
- Contract structure validation (T019)
- Token completeness checks
- TypeScript type exports

**Integration Tests** (WP03):
- ThemeProvider applies correct class names
- CSS custom properties resolved in DOM

**Visual Tests** (WP06):
- Storybook stories for light/dark themes
- Chromatic snapshots

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| F01 token structure mismatch | High | Import and inspect F01 tokens early, adjust mapping |
| Incomplete semantic coverage | Medium | Review with designers, add missing tokens incrementally |
| vanilla-extract build errors | Medium | Test theme generation in isolation, check plugin config |

---

## Definition of Done Checklist

- [ ] All T012-T019 subtasks completed
- [ ] `themeVars` contract exports all semantic tokens
- [ ] Light and dark themes compiled without errors
- [ ] Brand variant types defined
- [ ] TypeScript types exported (`ThemeConfiguration`, `ThemeMode`, `BrandVariant`)
- [ ] Tests pass (`pnpm test`)
- [ ] `tasks.md` updated: WP02 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Verify CSS custom properties generated in `dist/` (e.g., `--color-bg-primary`)
2. Confirm light/dark themes have matching structure
3. Check TypeScript autocomplete for `themeVars.color.bg.primary`
4. Validate no hardcoded color values (all mapped to F01)

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T20:00:00Z – claude – lane=doing – Started WP02 implementation
- 2025-12-13T22:00:00Z – claude – lane=doing – Completed T012-T019: theme contracts, light/dark themes, brand types, exports, tests. Quality gates: typecheck ✅, lint ✅, test ✅ (11/11), build ✅. Moving to for_review
