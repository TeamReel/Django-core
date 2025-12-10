---
work_package_id: "WP08"
subtasks:
  - "T086"
  - "T087"
  - "T088"
  - "T089"
  - "T090"
  - "T091"
  - "T092"
  - "T093"
  - "T094"
  - "T095"
  - "T096"
title: "Main Context Switcher Component"
phase: "Phase 1 - Core Context & UI"
lane: "done"
assignee: "claude-sonnet-4"
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: "approved"
reviewed_by: "claude-sonnet-4"
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-10T21:12:00Z"
    lane: "doing"
    agent: "claude-sonnet-4"
    shell_pid: "212"
    action: "Started implementation of main context switcher component"
  - timestamp: "2025-12-10T21:25:00Z"
    lane: "for_review"
    agent: "claude-sonnet-4"
    shell_pid: "212"
    action: "Completed implementation - ready for code review"
  - timestamp: "2025-12-10T21:35:00Z"
    lane: "done"
    agent: "claude-sonnet-4"
    shell_pid: "212"
    action: "Code review approved: Excellent composition of pickers with full accessibility"
---

# Work Package Prompt: WP08 – Main Context Switcher Component

## Objectives & Success Criteria

Compose ContextIndicator, OrganisationPicker, and ProjectPicker into main ContextSwitcher component that integrates into app shell.

**Success Criteria**:
- ✅ Renders indicator + pickers
- ✅ Opens pickers on click
- ✅ Manages picker state (open/closed)
- ✅ Exports single component for easy integration
- ✅ Keyboard accessible (Tab, click, shortcuts)
- ✅ Unit + integration tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Stories 1-4 - Complete context switching flow

**References**:
- [spec.md](../spec.md) - FR-037 through FR-051 (main UI requirements)
- [quickstart.md](../quickstart.md) - Integration examples

**Constraints**:
- Must be drop-in component for existing apps
- Must work with React Router, Next.js Router, Django templates

---

## Subtasks & Detailed Guidance

### T086 – Create ContextSwitcher component

**Steps**:
1. Create `src/components/ContextSwitcher.tsx`:
   ```typescript
   import React, { useState } from 'react';
   import { ContextIndicator } from './ContextIndicator';
   import { OrganisationPicker } from './OrganisationPicker';
   import { ProjectPicker } from './ProjectPicker';

   export interface ContextSwitcherProps {
     className?: string;
     variant?: 'horizontal' | 'vertical';
   }

   export function ContextSwitcher({
     className,
     variant = 'horizontal',
   }: ContextSwitcherProps) {
     const [orgPickerOpen, setOrgPickerOpen] = useState(false);
     const [projectPickerOpen, setProjectPickerOpen] = useState(false);

     // Render indicator + pickers (T087, T088)
     // Handle clicks (T089)
     // Keyboard shortcuts (defer to WP10)

     return null;
   }
   ```

**Files**: `src/components/ContextSwitcher.tsx`

---

### T087 – Compose indicator + pickers

**Steps**:
1. Horizontal layout (default):
   ```typescript
   if (variant === 'horizontal') {
     return (
       <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
         <ContextIndicator
           onClick={() => setOrgPickerOpen(true)}
           style={{ cursor: 'pointer' }}
         />
         <OrganisationPicker
           isOpen={orgPickerOpen}
           onClose={() => setOrgPickerOpen(false)}
         />
         <ProjectPicker
           isOpen={projectPickerOpen}
           onClose={() => setProjectPickerOpen(false)}
         />
       </div>
     );
   }
   ```

2. Vertical layout (sidebar):
   ```typescript
   if (variant === 'vertical') {
     return (
       <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
         {/* Same components, vertical stacking */}
       </div>
     );
   }
   ```

**Files**: `src/components/ContextSwitcher.tsx`

**Notes**: Use inline styles temporarily; extract to styled component if needed

---

### T088 – Add trigger buttons

**Steps**:
1. Create clickable indicator:
   ```typescript
   <button
     type="button"
     onClick={() => setOrgPickerOpen(true)}
     aria-label="Change organisation"
     style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
   >
     <ContextIndicator />
   </button>

   <button
     type="button"
     onClick={() => setProjectPickerOpen(true)}
     aria-label="Change project"
     disabled={!context.organisation}
     style={{ /* ... */ }}
   >
     <Typography variant="body">▼</Typography>
   </button>
   ```

**Files**: `src/components/ContextSwitcher.tsx`

**Notes**: Replace with F01 Button if available

---

### T089 – Handle picker open/close

**Steps**:
1. State already managed (T086):
   ```typescript
   const [orgPickerOpen, setOrgPickerOpen] = useState(false);
   const [projectPickerOpen, setProjectPickerOpen] = useState(false);
   ```

2. Pass to pickers:
   ```typescript
   <OrganisationPicker
     isOpen={orgPickerOpen}
     onClose={() => setOrgPickerOpen(false)}
   />
   <ProjectPicker
     isOpen={projectPickerOpen}
     onClose={() => setProjectPickerOpen(false)}
   />
   ```

**Files**: `src/components/ContextSwitcher.tsx`

---

### T090 – Add visual separator

**Steps**:
1. Insert separator between org and project indicators:
   ```typescript
   <ContextIndicator />
   <Typography variant="body" style={{ color: 'var(--color-text-tertiary)' }}>
     /
   </Typography>
   <button onClick={() => setProjectPickerOpen(true)}>
     {context.project?.name || 'Select project'}
   </button>
   ```

**Files**: `src/components/ContextSwitcher.tsx`

---

### T091 – Export public API

**Steps**:
1. Update `src/index.ts`:
   ```typescript
   // Existing exports...
   export { ContextSwitcher } from './components/ContextSwitcher';
   export type { ContextSwitcherProps } from './components/ContextSwitcher';

   // Sub-components (for advanced customization)
   export { ContextIndicator } from './components/ContextIndicator';
   export { OrganisationPicker } from './components/OrganisationPicker';
   export { ProjectPicker } from './components/ProjectPicker';
   ```

**Files**: `src/index.ts`

---

### T092 – Document integration example

**Steps**:
1. Add to README.md:
   ```markdown
   ## Usage

   ```tsx
   import { ContextSwitcherProvider, ContextSwitcher } from '@django-core/context-switcher';
   import { createReactRouterAdapter } from '@django-core/context-switcher/adapters';

   const routerAdapter = createReactRouterAdapter({ navigate, location });

   function AppShell() {
     return (
       <ContextSwitcherProvider routerAdapter={routerAdapter}>
         <header>
           <ContextSwitcher variant="horizontal" />
         </header>
         <main>{children}</main>
       </ContextSwitcherProvider>
     );
   }
   ```
   ```

**Files**: `README.md`

---

### T093 [P] – Write unit tests

**Steps**:
1. Create `__tests__/components/ContextSwitcher.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen, fireEvent } from '@testing-library/react';
   import { ContextSwitcher } from '../../src/components/ContextSwitcher';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   describe('ContextSwitcher', () => {
     it('renders indicator and trigger buttons', () => {
       // Verify ContextIndicator shown
       // Verify org/project buttons present
     });

     it('opens organisation picker on click', async () => {
       // Click org button, verify OrganisationPicker opens
     });

     it('opens project picker on click', async () => {
       // Click project button, verify ProjectPicker opens
     });

     it('closes picker on selection', async () => {
       // Open picker, select item, verify picker closes
     });

     it('disables project picker when no org', () => {
       // context.organisation = null, verify project button disabled
     });

     it('renders horizontal layout', () => {
       // variant="horizontal", verify flex-direction: row
     });

     it('renders vertical layout', () => {
       // variant="vertical", verify flex-direction: column
     });
   });
   ```

**Files**: `__tests__/components/ContextSwitcher.test.tsx`

**Parallel?**: Yes

---

### T094 [P] – Write integration tests

**Steps**:
1. Create `__tests__/integration/ContextSwitcher.integration.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { ContextSwitcherProvider, ContextSwitcher } from '../../src';
   import { server } from '../mocks/server';

   describe('ContextSwitcher integration', () => {
     beforeAll(() => server.listen());
     afterEach(() => server.resetHandlers());
     afterAll(() => server.close());

     it('fetches organisations and projects on mount', async () => {
       // Render, wait for API calls, verify data shown
     });

     it('switches organisation and fetches projects', async () => {
       // Click org picker, select new org, verify projects fetched
     });

     it('switches project and updates URL', async () => {
       // Click project picker, select project, verify URL updated
     });

     it('persists context to localStorage', async () => {
       // Switch context, reload page, verify context restored
     });
   });
   ```

**Files**: `__tests__/integration/ContextSwitcher.integration.test.tsx`

**Parallel?**: Yes

**Notes**: Requires MSW handlers from WP04

---

### T095 [P] – Write accessibility tests

**Steps**:
1. Create `__tests__/accessibility/ContextSwitcher.a11y.test.tsx`:
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';
   // Test entire switcher component for axe violations
   // Test keyboard-only usage (Tab to buttons, Enter to open pickers)
   ```

**Files**: `__tests__/accessibility/ContextSwitcher.a11y.test.tsx`

**Parallel?**: Yes

---

### T096 – Create Storybook story

**Steps**:
1. Create `src/components/ContextSwitcher.stories.tsx`:
   ```typescript
   import type { Meta, StoryObj } from '@storybook/react';
   import { ContextSwitcher } from './ContextSwitcher';
   import { ContextSwitcherProvider } from '../context/ContextSwitcherProvider';

   const meta: Meta<typeof ContextSwitcher> = {
     title: 'Components/ContextSwitcher',
     component: ContextSwitcher,
     decorators: [
       (Story) => (
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <Story />
         </ContextSwitcherProvider>
       ),
     ],
   };

   export default meta;
   type Story = StoryObj<typeof ContextSwitcher>;

   export const Horizontal: Story = {
     args: { variant: 'horizontal' },
   };

   export const Vertical: Story = {
     args: { variant: 'vertical' },
   };

   export const NoOrg: Story = {};

   export const NoProjects: Story = {};
   ```

**Files**: `src/components/ContextSwitcher.stories.tsx`

---

## Risks & Mitigations

**Risk**: Pickers overlap in small viewports
**Mitigation**: Use Modal for mobile (already in WP06/WP07)

**Risk**: Context memory conflicts with backend session
**Mitigation**: localStorage as cache only, backend /context/ is source of truth

**Risk**: Keyboard navigation unclear
**Mitigation**: WP10 adds global shortcuts, visual focus indicators

---

## Definition of Done Checklist

- [ ] ContextSwitcher component created
- [ ] Composes ContextIndicator, OrganisationPicker, ProjectPicker
- [ ] Opens pickers on click
- [ ] Manages picker state
- [ ] Trigger buttons accessible
- [ ] Visual separator between org/project
- [ ] Public API exported
- [ ] Integration example documented
- [ ] Horizontal + vertical variants
- [ ] Unit tests (all interactions)
- [ ] Integration tests (full flow)
- [ ] Accessibility tests
- [ ] Storybook story
- [ ] Test coverage 90%+

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
