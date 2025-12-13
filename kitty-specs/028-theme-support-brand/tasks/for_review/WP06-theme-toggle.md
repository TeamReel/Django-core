---
work_package_id: "WP06"
subtasks:
  - "T047"
  - "T048"
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
  - "T055"
title: "ThemeToggle Component & Storybook"
phase: "Phase 2 - Advanced Features"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "19776"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP06 – ThemeToggle Component & Storybook

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

**Goal**: Build production-ready ThemeToggle component with full F01 integration and comprehensive Storybook documentation.

**Success Criteria**:
- ✅ ThemeToggle component cycles through `light → dark → system`
- ✅ Icon variants: sun/moon, switch, dropdown
- ✅ 100% F01 design tokens (zero custom CSS)
- ✅ WCAG 2.1 AA accessible (ARIA labels, keyboard nav)
- ✅ Storybook stories cover all variants and states
- ✅ Chromatic visual regression tests passing
- ✅ Unit and integration tests validate behavior

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package scaffold)
- WP02 complete (theme contracts)
- WP03 complete (ThemeProvider, useTheme hook)
- F01 design-system available (Button, Icon, Dropdown components)

**References**:
- `spec.md` US-2 - Theme toggle UI requirement
- F01 component library (Button, Icon, DropdownMenu)
- WCAG 2.1 guidelines for interactive controls

**Constraints**:
- Must use F01 components exclusively (no custom Button/Icon)
- Keyboard accessible (Tab, Enter, Space)
- Mobile-friendly (minimum 44×44px touch target)

---

## Subtasks & Detailed Guidance

### Subtask T047 – Define ThemeToggle component interface

**Purpose**: Type-safe props API

**Steps**:
1. Create `src/components/ThemeToggle.tsx`:
   ```typescript
   import React from 'react';
   import type { ThemeMode } from '../types';

   export type ThemeToggleVariant = 'icon' | 'switch' | 'dropdown';

   export interface ThemeToggleProps {
     variant?: ThemeToggleVariant;
     showLabel?: boolean;
     className?: string;
     'aria-label'?: string;
   }

   export function ThemeToggle({
     variant = 'icon',
     showLabel = false,
     className,
     'aria-label': ariaLabel
   }: ThemeToggleProps) {
     // Implementation in T048-T050
     return null;
   }
   ```

**Files**: `src/components/ThemeToggle.tsx`

**Parallel?**: No (foundation for T048-T050)

---

### Subtask T048 – Implement icon variant

**Purpose**: Sun/moon toggle button

**Steps**:
1. Update `src/components/ThemeToggle.tsx`:
   ```typescript
   import { Button } from '@django-core/design-system';
   import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
   import { useTheme } from '../hooks/useTheme';

   function IconVariant({ showLabel, ariaLabel }: Pick<ThemeToggleProps, 'showLabel' | 'aria-label'>) {
     const { mode, toggleMode } = useTheme();

     const icons = {
       light: SunIcon,
       dark: MoonIcon,
       system: ComputerDesktopIcon
     };

     const Icon = icons[mode];

     return (
       <Button
         variant="ghost"
         size="icon"
         onClick={toggleMode}
         aria-label={ariaLabel ?? `Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
       >
         <Icon className="h-5 w-5" />
         {showLabel && <span className="ml-2">{mode}</span>}
       </Button>
     );
   }
   ```

**Files**: Update `src/components/ThemeToggle.tsx`

**Parallel?**: Can proceed with T049-T050 after T047

---

### Subtask T049 – Implement switch variant

**Purpose**: Inline toggle switch (light/dark only)

**Steps**:
1. Update `src/components/ThemeToggle.tsx`:
   ```typescript
   import { Switch } from '@django-core/design-system';

   function SwitchVariant({ showLabel }: Pick<ThemeToggleProps, 'showLabel'>) {
     const { resolvedMode, setTheme } = useTheme();
     const isDark = resolvedMode === 'dark';

     return (
       <div className="flex items-center gap-2">
         {showLabel && <span className="text-sm">Dark mode</span>}
         <Switch
           checked={isDark}
           onCheckedChange={(checked) => {
             setTheme({ mode: checked ? 'dark' : 'light' });
           }}
           aria-label="Toggle dark mode"
         />
       </div>
     );
   }
   ```

**Files**: Update `src/components/ThemeToggle.tsx`

**Parallel?**: Can proceed with T050 after T047

---

### Subtask T050 – Implement dropdown variant

**Purpose**: Full mode selection (light/dark/system)

**Steps**:
1. Update `src/components/ThemeToggle.tsx`:
   ```typescript
   import {
     DropdownMenu,
     DropdownMenuTrigger,
     DropdownMenuContent,
     DropdownMenuItem
   } from '@django-core/design-system';

   function DropdownVariant({ ariaLabel }: Pick<ThemeToggleProps, 'aria-label'>) {
     const { mode, setTheme } = useTheme();

     const modes: { value: ThemeMode; label: string; icon: any }[] = [
       { value: 'light', label: 'Light', icon: SunIcon },
       { value: 'dark', label: 'Dark', icon: MoonIcon },
       { value: 'system', label: 'System', icon: ComputerDesktopIcon }
     ];

     return (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" aria-label={ariaLabel ?? 'Theme menu'}>
             {mode === 'dark' ? (
               <MoonIcon className="h-5 w-5" />
             ) : (
               <SunIcon className="h-5 w-5" />
             )}
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           {modes.map(({ value, label, icon: Icon }) => (
             <DropdownMenuItem
               key={value}
               onClick={() => setTheme({ mode: value })}
               className="flex items-center gap-2"
             >
               <Icon className="h-4 w-4" />
               <span>{label}</span>
               {mode === value && <span className="ml-auto">✓</span>}
             </DropdownMenuItem>
           ))}
         </DropdownMenuContent>
       </DropdownMenu>
     );
   }
   ```
2. Wire up variant prop in main component:
   ```typescript
   export function ThemeToggle(props: ThemeToggleProps) {
     const { variant = 'icon' } = props;

     if (variant === 'switch') return <SwitchVariant {...props} />;
     if (variant === 'dropdown') return <DropdownVariant {...props} />;
     return <IconVariant {...props} />;
   }
   ```

**Files**: Update `src/components/ThemeToggle.tsx`

**Parallel?**: After T047-T049

---

### Subtask T051 – Create Storybook stories

**Purpose**: Visual documentation for all variants

**Steps**:
1. Create `src/components/ThemeToggle.stories.tsx`:
   ```typescript
   import type { Meta, StoryObj } from '@storybook/react';
   import { ThemeProvider } from './ThemeProvider';
   import { ThemeToggle } from './ThemeToggle';

   const meta: Meta<typeof ThemeToggle> = {
     title: 'Components/ThemeToggle',
     component: ThemeToggle,
     decorators: [
       (Story) => (
         <ThemeProvider>
           <Story />
         </ThemeProvider>
       )
     ],
     parameters: {
       layout: 'centered'
     }
   };

   export default meta;
   type Story = StoryObj<typeof ThemeToggle>;

   export const IconDefault: Story = {
     args: {
       variant: 'icon'
     }
   };

   export const IconWithLabel: Story = {
     args: {
       variant: 'icon',
       showLabel: true
     }
   };

   export const SwitchDefault: Story = {
     args: {
       variant: 'switch'
     }
   };

   export const SwitchWithLabel: Story = {
     args: {
       variant: 'switch',
       showLabel: true
     }
   };

   export const DropdownMenu: Story = {
     args: {
       variant: 'dropdown'
     }
   };

   export const DarkMode: Story = {
     args: {
       variant: 'icon'
     },
     parameters: {
       theme: 'dark'
     }
   };
   ```

**Files**: `src/components/ThemeToggle.stories.tsx`

**Parallel?**: After T048-T050

---

### Subtask T052 – Configure Chromatic visual tests

**Purpose**: Automated visual regression

**Steps**:
1. Update `.storybook/main.ts` (if needed):
   ```typescript
   const config: StorybookConfig = {
     stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
     addons: [
       '@storybook/addon-essentials',
       '@storybook/addon-a11y' // Accessibility testing
     ],
     framework: '@storybook/react-vite'
   };
   ```
2. Create Chromatic config (if not done in WP01):
   ```json
   // chromatic.config.json
   {
     "projectToken": "CHROMATIC_PROJECT_TOKEN",
     "buildScriptName": "build-storybook"
   }
   ```
3. Add CI job (extend `.github/workflows/theme-system.yml`):
   ```yaml
   chromatic:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
         with:
           fetch-depth: 0
       - uses: pnpm/action-setup@v2
       - uses: actions/setup-node@v4
         with:
           node-version: '18'
           cache: 'pnpm'

       - run: pnpm install
       - run: pnpm --filter @django-core/theme-system build-storybook
       - uses: chromaui/action@v1
         with:
           projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
           storybookBuildDir: packages/theme-system/storybook-static
   ```

**Files**: `.storybook/main.ts`, `chromatic.config.json`, `.github/workflows/theme-system.yml`

**Parallel?**: After T051

---

### Subtask T053 [P] – Write ThemeToggle unit tests

**Purpose**: Validate component behavior

**Steps**:
1. Create `tests/unit/components/ThemeToggle.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { ThemeProvider } from '../../../src/components/ThemeProvider';
   import { ThemeToggle } from '../../../src/components/ThemeToggle';

   describe('ThemeToggle', () => {
     it('should render icon variant by default', () => {
       render(
         <ThemeProvider>
           <ThemeToggle />
         </ThemeProvider>
       );

       expect(screen.getByRole('button')).toBeInTheDocument();
     });

     it('should toggle theme on click', async () => {
       const user = userEvent.setup();
       render(
         <ThemeProvider defaultMode="light">
           <ThemeToggle variant="icon" />
         </ThemeProvider>
       );

       await user.click(screen.getByRole('button'));
       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
     });

     it('should render switch variant', () => {
       render(
         <ThemeProvider>
           <ThemeToggle variant="switch" showLabel />
         </ThemeProvider>
       );

       expect(screen.getByText('Dark mode')).toBeInTheDocument();
     });

     it('should render dropdown with all modes', async () => {
       const user = userEvent.setup();
       render(
         <ThemeProvider>
           <ThemeToggle variant="dropdown" />
         </ThemeProvider>
       );

       await user.click(screen.getByRole('button'));
       expect(screen.getByText('Light')).toBeInTheDocument();
       expect(screen.getByText('Dark')).toBeInTheDocument();
       expect(screen.getByText('System')).toBeInTheDocument();
     });
   });
   ```

**Files**: `tests/unit/components/ThemeToggle.test.tsx`

**Parallel?**: Yes (after T048-T050)

---

### Subtask T054 [P] – Write accessibility tests

**Purpose**: Validate WCAG 2.1 AA compliance

**Steps**:
1. Create `tests/integration/accessibility.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render } from '@testing-library/react';
   import { axe, toHaveNoViolations } from 'jest-axe';
   import { ThemeProvider } from '../../src/components/ThemeProvider';
   import { ThemeToggle } from '../../src/components/ThemeToggle';

   expect.extend(toHaveNoViolations);

   describe('Accessibility', () => {
     it('should have no a11y violations (icon variant)', async () => {
       const { container } = render(
         <ThemeProvider>
           <ThemeToggle variant="icon" />
         </ThemeProvider>
       );

       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it('should have no a11y violations (switch variant)', async () => {
       const { container } = render(
         <ThemeProvider>
           <ThemeToggle variant="switch" showLabel />
         </ThemeProvider>
       );

       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it('should have no a11y violations (dropdown variant)', async () => {
       const { container } = render(
         <ThemeProvider>
           <ThemeToggle variant="dropdown" />
         </ThemeProvider>
       );

       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });
   });
   ```
2. Install jest-axe:
   ```json
   // package.json devDependencies
   "jest-axe": "^8.0.0"
   ```

**Files**: `tests/integration/accessibility.test.tsx`, update `package.json`

**Parallel?**: Yes (after T048-T050)

---

### Subtask T055 [P] – Add keyboard navigation tests

**Purpose**: Validate keyboard accessibility

**Steps**:
1. Create `tests/integration/keyboard-nav.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { ThemeProvider } from '../../src/components/ThemeProvider';
   import { ThemeToggle } from '../../src/components/ThemeToggle';

   describe('Keyboard Navigation', () => {
     it('should toggle theme with Enter key', async () => {
       const user = userEvent.setup();
       render(
         <ThemeProvider defaultMode="light">
           <ThemeToggle variant="icon" />
         </ThemeProvider>
       );

       const button = screen.getByRole('button');
       button.focus();
       await user.keyboard('{Enter}');

       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
     });

     it('should toggle theme with Space key', async () => {
       const user = userEvent.setup();
       render(
         <ThemeProvider defaultMode="dark">
           <ThemeToggle variant="icon" />
         </ThemeProvider>
       );

       const button = screen.getByRole('button');
       button.focus();
       await user.keyboard(' ');

       expect(document.documentElement.getAttribute('data-theme')).toBe('light');
     });

     it('should navigate dropdown with arrow keys', async () => {
       const user = userEvent.setup();
       render(
         <ThemeProvider>
           <ThemeToggle variant="dropdown" />
         </ThemeProvider>
       );

       const trigger = screen.getByRole('button');
       await user.click(trigger);
       await user.keyboard('{ArrowDown}');
       await user.keyboard('{Enter}');

       // First item (Light) should be selected
       expect(document.documentElement.getAttribute('data-theme')).toBe('light');
     });
   });
   ```

**Files**: `tests/integration/keyboard-nav.test.tsx`

**Parallel?**: Yes (after T050)

---

## Test Strategy

**Unit Tests**:
- Component rendering (T053)
- Click handlers and mode cycling
- Variant prop behavior

**Integration Tests**:
- Accessibility (axe-core) (T054)
- Keyboard navigation (T055)

**Visual Tests**:
- Chromatic snapshots for all variants (T052)
- Light/dark mode states
- Mobile viewport

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| F01 component API changes | High | Pin F01 version, monitor breaking changes |
| Icon library not available | Medium | Use @heroicons/react as peer dependency |
| Touch target too small on mobile | Medium | Enforce F01 Button size="icon" (44×44px minimum) |
| Dropdown menu z-index conflicts | Low | Use F01 Portal component |

---

## Definition of Done Checklist

- [ ] All T047-T055 subtasks completed
- [ ] ThemeToggle supports 3 variants (icon, switch, dropdown)
- [ ] 100% F01 components (zero custom CSS)
- [ ] Storybook stories published
- [ ] Chromatic visual tests passing
- [ ] Accessibility tests pass (axe-core zero violations)
- [ ] Keyboard navigation tests pass
- [ ] Tests pass (`pnpm test`)
- [ ] `tasks.md` updated: WP06 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Verify all variants render correctly in Storybook
2. Test keyboard navigation (Tab, Enter, Space, Arrow keys)
3. Run axe DevTools extension (zero violations)
4. Check mobile touch targets (minimum 44×44px)
5. Validate icon transitions are smooth
6. Confirm Chromatic visual diff approval

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T13:59:03Z – claude – shell_pid=19776 – lane=doing – Started WP06 implementation: ThemeToggle Component & Storybook
- 2025-12-13T14:10:04Z – claude – shell_pid=19776 – lane=for_review – Ready for review: ThemeToggle component complete with all variants, comprehensive tests, and keyboard accessibility
