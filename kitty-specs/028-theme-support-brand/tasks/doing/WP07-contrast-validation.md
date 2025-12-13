---
work_package_id: "WP07"
subtasks:
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
title: "Contrast Validation & Accessibility"
phase: "Phase 2 - Advanced Features"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "33848"
review_status: "acknowledged"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – Contrast Validation & Accessibility

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

**Reviewed by**: claude-reviewer
**Date**: 2025-12-13
**Status**: Changes Required ⚠️

### Critical Issue: Border Contrast Validation Logic

**Problem**: The theme validator validates borders using the **4.5:1 text threshold** instead of the **3:1 UI component threshold** per WCAG 2.1.

**Evidence**:
- Test failures: 2/8 tests in `themeValidator.test.ts` fail
  * "should pass for valid theme"
  * "should handle nested color structure"
- Border `#666666` on `#ffffff` = **4.54:1 ratio**
- Should **pass** (4.54 > 3.0 required for UI components)
- Actually **fails** (4.54 < 4.5 required for normal text)

**Root Cause**:
`src/validation/themeValidator.ts` line 51:
```typescript
const { result } = validateColorPair(name, fgColor, bgColor);
// Uses default parameters: AA level, 'normal' text size → 4.5:1
```

**Required Fix**:
Borders must be validated with `textSize: 'large'` (which uses 3:1 for AA):

```typescript
criticalPairs.forEach(({ name, fg, bg }) => {
  const fgColor = getNestedValue(theme, fg);
  const bgColor = getNestedValue(theme, bg);

  if (!fgColor || !bgColor) {
    warnings.push({ ... });
    return;
  }

  // Use 'large' text size for borders (3:1 ratio for UI components)
  const isBorder = name.includes('Border');
  const textSize = isBorder ? 'large' : 'normal';
  const result = checkContrast(fgColor, bgColor, 'AA', textSize);

  if (!result.passes) {
    errors.push({
      pair: name,
      foreground: fgColor,
      background: bgColor,
      ratio: result.ratio,
      required: result.required
    });
  }
});
```

**Validation Steps**:
1. Update `validateTheme()` to pass `textSize: 'large'` for border pairs
2. Run tests: `pnpm vitest run themeValidator.test.ts`
3. Expected: 8/8 tests passing
4. Verify border validation with CLI: `pnpm validate-theme <theme-with-border-3.1-ratio.json>`

### Quality Gates Results

**Lint**: ✅ Clean (0 errors, 0 warnings)
**TypeCheck**: ⚠️ 6 errors in `design-system` package (pre-existing, not WP07's issue)
**Tests**: ⚠️ 202/204 passing (98.5%) - **2 failures require fix**

### What's Excellent (No Changes Needed)

- ✅ Contrast checker implementation solid (14/14 tests passing)
- ✅ CLI tool well-designed with colored output and clear error messages
- ✅ Documentation comprehensive and actionable (`contrast-fixing-guide.md`)
- ✅ TypeScript types properly defined (no `any`, good use of `Record<string, unknown>`)
- ✅ Error handling robust (validateColorPair catches parsing errors)
- ✅ T060 deferral reasonable (build integration needs actual theme data)
- ✅ Code structure clean with separation of concerns

### Next Steps

1. **Fix the border validation logic** as specified above
2. **Run full test suite**: `pnpm vitest run` → expect 204/204 passing
3. **Update review_status**: Set `review_status: "acknowledged"` in frontmatter
4. **Move to doing**: Use `tasks-move-to-lane.ps1 -TaskId WP07 -TargetLane doing`
5. **Re-submit for review**: After fix, move to `for_review` lane

---

## Objectives & Success Criteria

**Goal**: Implement build-time WCAG 2.1 AA contrast validation with actionable error reporting.

**Success Criteria**:
- ✅ APCA/WCAG 2.1 contrast checker validates all color pairs
- ✅ Build-time validation fails CI if contrast ratios <4.5:1 (text) or <3:1 (UI)
- ✅ CLI script validates custom brand tokens
- ✅ Detailed error reports with color pairs and ratios
- ✅ Tests validate checker accuracy against known pass/fail pairs
- ✅ Documentation includes contrast fixing guide

---

## Context & Constraints

**Prerequisites**:
- WP02 complete (theme contracts)

**References**:
- `research.md` Q4 - Contrast validation strategy
- `spec.md` NFR-4 - WCAG 2.1 AA compliance
- WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum)
- APCA (Accessible Perceptual Contrast Algorithm) for future-proofing

**Constraints**:
- Build must fail on contrast violations (no warnings only)
- Validation time <5 seconds for full theme
- Must work with vanilla-extract compiled tokens

---

## Subtasks & Detailed Guidance

### Subtask T056 – Install contrast checking libraries

**Purpose**: Add dependencies for WCAG validation

**Steps**:
1. Add to `package.json` devDependencies:
   ```json
   {
     "devDependencies": {
       "wcag-contrast": "^3.0.0",
       "colorjs.io": "^0.5.0",
       "chalk": "^5.3.0"
     }
   }
   ```
2. Run `pnpm install`

**Files**: `package.json`

**Parallel?**: No (prerequisite for T057-T061)

---

### Subtask T057 – Implement contrast checker utility

**Purpose**: WCAG 2.1 AA validation logic

**Steps**:
1. Create `src/validation/contrastChecker.ts`:
   ```typescript
   import Color from 'colorjs.io';

   export interface ContrastResult {
     ratio: number;
     passes: boolean;
     level: 'AA' | 'AAA';
     required: number;
   }

   export function checkContrast(
     foreground: string,
     background: string,
     level: 'AA' | 'AAA' = 'AA',
     textSize: 'normal' | 'large' = 'normal'
   ): ContrastResult {
     const fg = new Color(foreground);
     const bg = new Color(background);

     const ratio = Math.abs(fg.contrast(bg, 'WCAG21'));

     const required =
       level === 'AAA'
         ? textSize === 'large'
           ? 4.5
           : 7
         : textSize === 'large'
         ? 3
         : 4.5;

     return {
       ratio,
       passes: ratio >= required,
       level,
       required
     };
   }

   export function validateColorPair(
     name: string,
     foreground: string,
     background: string
   ): { name: string; result: ContrastResult; error?: string } {
     try {
       const result = checkContrast(foreground, background);
       return { name, result };
     } catch (error) {
       return {
         name,
         result: { ratio: 0, passes: false, level: 'AA', required: 4.5 },
         error: error instanceof Error ? error.message : 'Unknown error'
       };
     }
   }
   ```

**Files**: `src/validation/contrastChecker.ts`

**Parallel?**: After T056

---

### Subtask T058 – Implement theme validator

**Purpose**: Validate all color pairs in theme

**Steps**:
1. Create `src/validation/themeValidator.ts`:
   ```typescript
   import { validateColorPair } from './contrastChecker';
   import type { ThemeTokenMap } from '../types';

   export interface ValidationError {
     pair: string;
     foreground: string;
     background: string;
     ratio: number;
     required: number;
   }

   export interface ValidationReport {
     passed: boolean;
     errors: ValidationError[];
     warnings: ValidationError[];
     totalChecks: number;
   }

   export function validateTheme(theme: Record<string, string>): ValidationReport {
     const errors: ValidationError[] = [];
     const warnings: ValidationError[] = [];

     // Critical pairs (must pass AA)
     const criticalPairs = [
       { name: 'Primary text on primary bg', fg: 'color.text.primary', bg: 'color.bg.primary' },
       { name: 'Secondary text on primary bg', fg: 'color.text.secondary', bg: 'color.bg.primary' },
       { name: 'Link on primary bg', fg: 'color.text.link', bg: 'color.bg.primary' },
       { name: 'Primary action button', fg: 'color.bg.primary', bg: 'color.action.primary' }
     ];

     criticalPairs.forEach(({ name, fg, bg }) => {
       const fgColor = getNestedValue(theme, fg);
       const bgColor = getNestedValue(theme, bg);

       if (!fgColor || !bgColor) {
         warnings.push({
           pair: name,
           foreground: fgColor || 'undefined',
           background: bgColor || 'undefined',
           ratio: 0,
           required: 4.5
         });
         return;
       }

       const { result } = validateColorPair(name, fgColor, bgColor);

       if (!result.passes) {
         errors.push({
           pair: name,
           foreground: fgColor,
           background: bgColor,
           ratio: result.ratio,
           required: result.required
         });
       }
     });

     return {
       passed: errors.length === 0,
       errors,
       warnings,
       totalChecks: criticalPairs.length
     };
   }

   function getNestedValue(obj: any, path: string): string | undefined {
     return path.split('.').reduce((acc, key) => acc?.[key], obj);
   }
   ```

**Files**: `src/validation/themeValidator.ts`

**Parallel?**: After T057

---

### Subtask T059 – Create CLI validation script

**Purpose**: Standalone validator for custom themes

**Steps**:
1. Create `scripts/validate-theme.ts`:
   ```typescript
   #!/usr/bin/env node
   import { readFileSync } from 'fs';
   import { resolve } from 'path';
   import chalk from 'chalk';
   import { validateTheme } from '../src/validation/themeValidator';

   const args = process.argv.slice(2);
   if (args.length === 0) {
     console.error(chalk.red('Usage: validate-theme <theme-file.json>'));
     process.exit(1);
   }

   const themePath = resolve(args[0]);
   const theme = JSON.parse(readFileSync(themePath, 'utf-8'));

   console.log(chalk.blue('🔍 Validating theme contrast ratios...\n'));

   const report = validateTheme(theme);

   if (report.errors.length > 0) {
     console.error(chalk.red.bold(`❌ ${report.errors.length} contrast violations found:\n`));

     report.errors.forEach((error) => {
       console.error(chalk.red(`  • ${error.pair}`));
       console.error(chalk.gray(`    FG: ${error.foreground} / BG: ${error.background}`));
       console.error(chalk.gray(`    Ratio: ${error.ratio.toFixed(2)} (required: ${error.required})\n`));
     });

     process.exit(1);
   }

   if (report.warnings.length > 0) {
     console.warn(chalk.yellow(`⚠️  ${report.warnings.length} warnings:\n`));
     report.warnings.forEach((w) => console.warn(chalk.yellow(`  • ${w.pair}`)));
     console.log();
   }

   console.log(chalk.green(`✅ All ${report.totalChecks} contrast checks passed!`));
   process.exit(0);
   ```
2. Add script to `package.json`:
   ```json
   {
     "scripts": {
       "validate-theme": "tsx scripts/validate-theme.ts"
     }
   }
   ```

**Files**: `scripts/validate-theme.ts`, update `package.json`

**Parallel?**: After T058

---

### Subtask T060 – Integrate validation into build

**Purpose**: Fail build on contrast violations

**Steps**:
1. Create Vite plugin `scripts/vite-plugin-theme-validation.ts`:
   ```typescript
   import type { Plugin } from 'vite';
   import { validateTheme } from '../src/validation/themeValidator';
   import chalk from 'chalk';

   export function themeValidationPlugin(): Plugin {
     return {
       name: 'theme-validation',
       buildStart() {
         // Extract theme tokens from compiled output
         // This is a simplified example; actual implementation
         // would parse vanilla-extract compiled CSS variables

         const theme = {
           'color.text.primary': '#000000',
           'color.bg.primary': '#ffffff',
           // ... extract from build artifacts
         };

         const report = validateTheme(theme);

         if (!report.passed) {
           const errorMsg = report.errors
             .map(
               (e) =>
                 `${e.pair}: ${e.ratio.toFixed(2)} (required: ${e.required})`
             )
             .join('\n');

           throw new Error(
             chalk.red(`❌ Theme contrast validation failed:\n${errorMsg}`)
           );
         }
       }
     };
   }
   ```
2. Update `vite.config.ts`:
   ```typescript
   import { themeValidationPlugin } from './scripts/vite-plugin-theme-validation';

   export default defineConfig({
     plugins: [
       react(),
       vanillaExtractPlugin(),
       themeValidationPlugin() // Add validation
     ],
     // ... rest of config
   });
   ```

**Files**: `scripts/vite-plugin-theme-validation.ts`, update `vite.config.ts`

**Parallel?**: After T058

**Notes**: May need adjustment based on vanilla-extract output format

---

### Subtask T061 – Export validation API

**Purpose**: Public API for validation utilities

**Steps**:
1. Create `src/validation/index.ts`:
   ```typescript
   export { checkContrast, validateColorPair } from './contrastChecker';
   export type { ContrastResult } from './contrastChecker';
   export { validateTheme } from './themeValidator';
   export type { ValidationError, ValidationReport } from './themeValidator';
   ```

**Files**: `src/validation/index.ts`

**Parallel?**: After T057-T058

---

### Subtask T062 [P] – Write contrast checker tests

**Purpose**: Validate checker accuracy

**Steps**:
1. Create `tests/unit/validation/contrastChecker.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { checkContrast } from '../../../src/validation/contrastChecker';

   describe('checkContrast', () => {
     it('should pass for black text on white bg (21:1)', () => {
       const result = checkContrast('#000000', '#ffffff');
       expect(result.passes).toBe(true);
       expect(result.ratio).toBeGreaterThan(20);
     });

     it('should fail for light gray text on white bg (<4.5:1)', () => {
       const result = checkContrast('#cccccc', '#ffffff');
       expect(result.passes).toBe(false);
     });

     it('should pass for large text at 3:1', () => {
       const result = checkContrast('#767676', '#ffffff', 'AA', 'large');
       expect(result.passes).toBe(true);
       expect(result.ratio).toBeGreaterThan(3);
     });

     it('should validate known WCAG pairs', () => {
       // Blue link on white (#0000EE on #FFFFFF) = 8.59:1
       const result = checkContrast('#0000EE', '#FFFFFF');
       expect(result.passes).toBe(true);
       expect(result.ratio).toBeCloseTo(8.59, 1);
     });
   });
   ```

**Files**: `tests/unit/validation/contrastChecker.test.ts`

**Parallel?**: Yes (after T057)

---

### Subtask T063 [P] – Write theme validator tests

**Purpose**: Validate full theme checking

**Steps**:
1. Create `tests/unit/validation/themeValidator.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { validateTheme } from '../../../src/validation/themeValidator';

   describe('validateTheme', () => {
     it('should pass for valid theme', () => {
       const theme = {
         color: {
           text: { primary: '#000000', secondary: '#555555', link: '#0000EE' },
           bg: { primary: '#ffffff' },
           action: { primary: '#0066cc' }
         }
       };

       const report = validateTheme(theme);
       expect(report.passed).toBe(true);
       expect(report.errors).toHaveLength(0);
     });

     it('should fail for low contrast text', () => {
       const theme = {
         color: {
           text: { primary: '#cccccc' }, // Low contrast
           bg: { primary: '#ffffff' }
         }
       };

       const report = validateTheme(theme);
       expect(report.passed).toBe(false);
       expect(report.errors.length).toBeGreaterThan(0);
     });

     it('should report missing color tokens as warnings', () => {
       const theme = {
         color: {
           text: { primary: '#000000' }
           // Missing bg.primary
         }
       };

       const report = validateTheme(theme);
       expect(report.warnings.length).toBeGreaterThan(0);
     });
   });
   ```

**Files**: `tests/unit/validation/themeValidator.test.ts`

**Parallel?**: Yes (after T058)

---

### Subtask T064 – Document contrast fixing guide

**Purpose**: Help developers fix violations

**Steps**:
1. Create `docs/contrast-fixing-guide.md`:
   ```markdown
   # Contrast Fixing Guide

   ## WCAG 2.1 AA Requirements

   - **Normal text (<18pt)**: Minimum 4.5:1 contrast ratio
   - **Large text (≥18pt or ≥14pt bold)**: Minimum 3:1 contrast ratio
   - **UI components**: Minimum 3:1 contrast ratio

   ## Common Violations & Fixes

   ### 1. Low Contrast Text

   **Problem**: Light gray text on white background
   ```typescript
   color: {
     text: { secondary: '#cccccc' }, // ❌ 1.6:1 on white
     bg: { primary: '#ffffff' }
   }
   ```

   **Fix**: Use darker shade
   ```typescript
   color: {
     text: { secondary: '#767676' }, // ✅ 4.5:1 on white
     bg: { primary: '#ffffff' }
   }
   ```

   ### 2. Blue Links on Dark Backgrounds

   **Problem**: Standard blue too dark for black background
   ```typescript
   color: {
     text: { link: '#0000EE' }, // ❌ 2.4:1 on black
     bg: { primary: '#000000' }
   }
   ```

   **Fix**: Use lighter blue
   ```typescript
   color: {
     text: { link: '#6699ff' }, // ✅ 8.2:1 on black
     bg: { primary: '#000000' }
   }
   ```

   ## Tools

   - **Online checker**: https://webaim.org/resources/contrastchecker/
   - **CLI validator**: `pnpm validate-theme theme.json`
   - **Browser extension**: WAVE or axe DevTools

   ## Testing

   Run validation before committing:
   ```bash
   pnpm validate-theme packages/theme-system/src/themes/light.json
   pnpm validate-theme packages/theme-system/src/themes/dark.json
   ```
   ```

**Files**: `docs/contrast-fixing-guide.md`

**Parallel?**: Yes (independent of code tasks)

---

## Test Strategy

**Unit Tests**:
- Contrast checker with known pass/fail pairs (T062)
- Theme validator with invalid themes (T063)

**CI Integration**:
- Build fails on contrast violations
- Manual validation via CLI script

**Manual Testing**:
- Run validator on F01 primitives
- Test brand variant overrides

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| vanilla-extract token extraction fails | High | Fallback to manual JSON export, validate pre-build |
| False positives from color parsing | Medium | Test with known WCAG pairs, adjust tolerance |
| Build time increases significantly | Low | Cache validation results, optimize color checks |

---

## Definition of Done Checklist

- [ ] All T056-T064 subtasks completed
- [ ] Contrast checker validates WCAG 2.1 AA ratios
- [ ] Build fails on violations (Vite plugin integrated)
- [ ] CLI script validates custom themes
- [ ] Tests pass with known pass/fail color pairs
- [ ] Contrast fixing guide documented
- [ ] CI enforces validation
- [ ] `tasks.md` updated: WP07 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Test contrast checker with WebAIM reference pairs
2. Verify build fails when introducing low-contrast token
3. Run CLI validator on light.json and dark.json
4. Check validation time (<5 seconds for full theme)
5. Review error messages for actionability

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T15:13:49Z – claude – shell_pid=33848 – lane=doing – Started implementation
- 2025-12-13T17:20:41Z – claude – shell_pid=33848 – lane=for_review – Ready for review. T060 deferred, 2 test fixes needed for border contrast.
- 2025-12-13T17:26:49Z – claude – shell_pid=33848 – lane=planned – Review: Border validation uses 4.5:1 text threshold instead of 3:1 UI component threshold. 2 test failures indicate production bug (not fixture issue). Fix: Pass textSize='large' for border pairs in validateTheme(). All other aspects excellent.
- 2025-12-13T17:30:15Z – claude – shell_pid=33848 – lane=doing – Addressing review feedback: Fix border validation to use 3:1 UI component threshold
