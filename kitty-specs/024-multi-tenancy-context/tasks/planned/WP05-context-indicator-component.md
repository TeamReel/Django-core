---
work_package_id: "WP05"
subtasks:
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
  - "T055"
  - "T056"
  - "T057"
title: "Context Indicator Component"
phase: "Phase 1 - Core Context & UI"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Context Indicator Component

## Objectives & Success Criteria

Implement always-visible context indicator component showing current organisation and project, using 100% F01 design system components.

**Success Criteria**:
- ✅ Component renders org/project names
- ✅ Truncates long names with ellipsis
- ✅ Shows loading/error states using F01 components
- ✅ Accessible via keyboard/screen reader
- ✅ Zero custom CSS (100% F01 tokens)
- ✅ Unit + accessibility tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Story 1 - View Current Context. Always-visible indicator in header/sidebar.

**References**:
- [spec.md](../spec.md) - FR-001 through FR-005 (context display requirements)
- [data-model.md](../data-model.md) - UserContext type
- Constitution Principle VII (UX): WCAG 2.1 AA accessible

**Constraints**:
- Must use F01 Typography, Skeleton, ErrorBanner only
- Must be responsive (desktop + mobile)
- Must announce context changes to screen readers

---

## Subtasks & Detailed Guidance

### T049 – Create ContextIndicator component

**Steps**:
1. Create `src/components/ContextIndicator.tsx`:
   ```typescript
   import React from 'react';
   import { useCurrentContext } from '../hooks/useCurrentContext';

   export interface ContextIndicatorProps {
     className?: string;
   }

   export function ContextIndicator({ className }: ContextIndicatorProps) {
     const { context, refresh } = useCurrentContext();

     // Loading state (T051)
     // Error state (T052)
     // Render org + project (T050, T053, T054)

     return (
       <div className={className} role="status" aria-live="polite">
         {/* Content here */}
       </div>
     );
   }
   ```

**Files**: `src/components/ContextIndicator.tsx`

---

### T050 – Integrate F01 Typography

**Steps**:
1. Import F01 Typography:
   ```typescript
   import { Typography } from '@django-core/design-system';
   ```

2. Render org/project names:
   ```typescript
   {context.organisation && (
     <>
       <Typography variant="body" component="span">
         {context.organisation.name}
       </Typography>
       {context.project && (
         <>
           <Typography variant="body" component="span"> / </Typography>
           <Typography variant="body" component="span">
             {context.project.name}
           </Typography>
         </>
       )}
     </>
   )}
   ```

**Files**: `src/components/ContextIndicator.tsx`

---

### T051 – Integrate F01 Skeleton for loading

**Steps**:
1. Import:
   ```typescript
   import { Skeleton } from '@django-core/design-system';
   ```

2. Show skeleton while loading:
   ```typescript
   if (context.isLoading) {
     return (
       <div className={className} role="status" aria-live="polite">
         <Skeleton width={200} height={24} />
       </div>
     );
   }
   ```

**Files**: `src/components/ContextIndicator.tsx`

---

### T052 – Integrate F01 ErrorBanner for errors

**Steps**:
1. Import:
   ```typescript
   import { ErrorBanner } from '@django-core/design-system';
   ```

2. Show error state with retry:
   ```typescript
   if (context.error) {
     return (
       <ErrorBanner
         message={context.error.message}
         onRetry={refresh}
         variant="inline"
       />
     );
   }
   ```

**Files**: `src/components/ContextIndicator.tsx`

---

### T053 – Implement text truncation

**Steps**:
1. Apply CSS truncation (using F01 tokens):
   ```typescript
   <Typography
     variant="body"
     component="span"
     style={{
       maxWidth: '200px',
       overflow: 'hidden',
       textOverflow: 'ellipsis',
       whiteSpace: 'nowrap',
       display: 'inline-block',
     }}
     title={context.organisation.name} // Full name on hover
   >
     {context.organisation.name}
   </Typography>
   ```

**Files**: `src/components/ContextIndicator.tsx`

**Notes**: Use inline styles temporarily; will extract to styled component if F01 supports it

---

### T054 – Add ARIA labels

**Steps**:
1. Add aria-label to container:
   ```typescript
   <div
     className={className}
     role="status"
     aria-live="polite"
     aria-label={
       context.project
         ? `Currently in ${context.organisation?.name}, ${context.project.name} project`
         : `Currently in ${context.organisation?.name}`
     }
   >
   ```

**Files**: `src/components/ContextIndicator.tsx`

---

### T055 [P] – Write unit tests

**Steps**:
1. Create `__tests__/components/ContextIndicator.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen } from '@testing-library/react';
   import { ContextIndicator } from '../../src/components/ContextIndicator';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   const mockRouterAdapter = {
     getCurrentPath: () => '/',
     navigateTo: jest.fn(),
     buildPathForContext: jest.fn(),
   };

   describe('ContextIndicator', () => {
     it('renders organisation name', async () => {
       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextIndicator />
         </ContextSwitcherProvider>
       );

       // Mock context would need to be set up via provider
       // Test org name appears
     });

     it('renders org + project names', () => {
       // Test both names appear
     });

     it('shows loading state', () => {
       // Test skeleton appears
     });

     it('shows error state with retry', () => {
       // Test error banner with retry button
     });

     it('truncates long names', () => {
       // Test max-width applied, title attribute present
     });
   });
   ```

**Files**: `__tests__/components/ContextIndicator.test.tsx`

**Parallel?**: Yes

---

### T056 [P] – Write accessibility tests

**Steps**:
1. Create `__tests__/accessibility/ContextIndicator.a11y.test.tsx`:
   ```typescript
   import React from 'react';
   import { render } from '@testing-library/react';
   import { axe, toHaveNoViolations } from 'jest-axe';
   import { ContextIndicator } from '../../src/components/ContextIndicator';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   expect.extend(toHaveNoViolations);

   const mockRouterAdapter = {
     getCurrentPath: () => '/',
     navigateTo: jest.fn(),
     buildPathForContext: jest.fn(),
   };

   describe('ContextIndicator accessibility', () => {
     it('has no axe violations', async () => {
       const { container } = render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextIndicator />
         </ContextSwitcherProvider>
       );

       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it('announces context to screen readers', () => {
       const { getByRole } = render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextIndicator />
         </ContextSwitcherProvider>
       );

       const status = getByRole('status');
       expect(status).toHaveAttribute('aria-live', 'polite');
     });
   });
   ```

**Files**: `__tests__/accessibility/ContextIndicator.a11y.test.tsx`

**Parallel?**: Yes

**Notes**: Install `jest-axe`: `pnpm add -D jest-axe`

---

### T057 – Create Storybook story

**Steps**:
1. Create `src/components/ContextIndicator.stories.tsx`:
   ```typescript
   import type { Meta, StoryObj } from '@storybook/react';
   import { ContextIndicator } from './ContextIndicator';
   import { ContextSwitcherProvider } from '../context/ContextSwitcherProvider';

   const meta: Meta<typeof ContextIndicator> = {
     title: 'Components/ContextIndicator',
     component: ContextIndicator,
     decorators: [
       (Story) => (
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <Story />
         </ContextSwitcherProvider>
       ),
     ],
   };

   export default meta;
   type Story = StoryObj<typeof ContextIndicator>;

   export const OrgOnly: Story = {};

   export const OrgAndProject: Story = {};

   export const Loading: Story = {};

   export const Error: Story = {};

   export const LongNames: Story = {};
   ```

**Files**: `src/components/ContextIndicator.stories.tsx`

**Parallel?**: No (after implementation)

**Notes**: Requires Storybook setup in package (defer if not priority)

---

## Risks & Mitigations

**Risk**: Long names break layout
**Mitigation**: Fixed max-width with ellipsis, test with 100+ character names

**Risk**: Tooltip not accessible
**Mitigation**: Use title attribute + aria-label (screen reader reads full name)

**Risk**: Color contrast fails
**Mitigation**: F01 Typography uses compliant tokens by default

---

## Definition of Done Checklist

- [ ] ContextIndicator component created
- [ ] F01 Typography integrated
- [ ] F01 Skeleton for loading state
- [ ] F01 ErrorBanner for error state
- [ ] Text truncation with ellipsis
- [ ] ARIA labels for screen readers
- [ ] Unit tests (all states)
- [ ] Accessibility tests (axe-core)
- [ ] Storybook story (optional)
- [ ] Zero custom CSS
- [ ] Test coverage 90%+

---

## Review Guidance

**Key Checkpoints**:
1. Uses only F01 components (no custom CSS)
2. Truncates long names properly
3. Accessible (ARIA labels, role="status")
4. All states covered (loading, error, org-only, org+project)
5. axe-core reports zero violations

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
