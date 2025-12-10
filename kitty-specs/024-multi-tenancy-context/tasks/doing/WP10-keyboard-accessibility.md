---
work_package_id: "WP10"
subtasks:
  - "T106"
  - "T107"
  - "T108"
  - "T109"
  - "T110"
  - "T111"
  - "T112"
  - "T113"
  - "T114"
  - "T115"
  - "T116"
  - "T117"
title: "Keyboard Shortcuts & Accessibility"
phase: "Phase 2 - Performance & Search"
lane: "doing"
assignee: "claude-sonnet-4"
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-10T22:20:00Z"
    lane: "doing"
    agent: "claude-sonnet-4"
    shell_pid: "212"
    note: "Started implementation of keyboard shortcuts and accessibility features"
---

# Work Package Prompt: WP10 – Keyboard Shortcuts & Accessibility

## Objectives & Success Criteria

Implement global keyboard shortcuts (Cmd/Ctrl+K) and comprehensive WCAG 2.1 AA accessibility.

**Success Criteria**:
- ✅ Cmd/Ctrl+K opens context switcher
- ✅ Escape closes pickers
- ✅ Tab navigation works throughout
- ✅ Focus indicators visible (F01 defaults)
- ✅ Screen reader announcements for context changes
- ✅ axe-core reports zero violations
- ✅ Keyboard-only testing confirms full usability
- ✅ Unit + accessibility tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Story 5 - Search and Quick Access (keyboard shortcuts)

**References**:
- [spec.md](../spec.md) - FR-071 through FR-078 (keyboard requirements), NFR-001 (WCAG 2.1 AA)
- Constitution Principle VII (UX): Keyboard-first navigation

**Constraints**:
- Global shortcuts must not conflict with browser defaults
- Must work across React Router, Next.js, Django templates

---

## Subtasks & Detailed Guidance

### T106 – Create useKeyboardShortcut hook

**Steps**:
1. Create `src/hooks/useKeyboardShortcut.ts`:
   ```typescript
   import { useEffect } from 'react';

   export interface KeyboardShortcutOptions {
     key: string;
     ctrlKey?: boolean;
     shiftKey?: boolean;
     altKey?: boolean;
     metaKey?: boolean;
     preventDefault?: boolean;
   }

   export function useKeyboardShortcut(
     options: KeyboardShortcutOptions,
     callback: (event: KeyboardEvent) => void
   ) {
     useEffect(() => {
       const handler = (event: KeyboardEvent) => {
         if (event.key !== options.key) return;
         if (options.ctrlKey && !event.ctrlKey) return;
         if (options.shiftKey && !event.shiftKey) return;
         if (options.altKey && !event.altKey) return;
         if (options.metaKey && !event.metaKey) return;

         if (options.preventDefault !== false) {
           event.preventDefault();
         }

         callback(event);
       };

       window.addEventListener('keydown', handler);

       return () => {
         window.removeEventListener('keydown', handler);
       };
     }, [options, callback]);
   }
   ```

**Files**: `src/hooks/useKeyboardShortcut.ts`

---

### T107 – Export useKeyboardShortcut from index

**Steps**:
1. Update `src/index.ts`:
   ```typescript
   export { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
   export type { KeyboardShortcutOptions } from './hooks/useKeyboardShortcut';
   ```

**Files**: `src/index.ts`

---

### T108 – Integrate Cmd/Ctrl+K into ContextSwitcher

**Steps**:
1. Update `src/components/ContextSwitcher.tsx`:
   ```typescript
   import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

   export function ContextSwitcher({ ... }) {
     const [orgPickerOpen, setOrgPickerOpen] = useState(false);

     useKeyboardShortcut(
       {
         key: 'k',
         ctrlKey: true,  // Windows/Linux
         metaKey: true,  // macOS
       },
       () => {
         setOrgPickerOpen(true);
       }
     );

     // Alternative: detect platform
     const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
     useKeyboardShortcut(
       {
         key: 'k',
         [isMac ? 'metaKey' : 'ctrlKey']: true,
       },
       () => {
         setOrgPickerOpen(true);
       }
     );

     // ...
   }
   ```

**Files**: `src/components/ContextSwitcher.tsx`

**Notes**: Test both Cmd (Mac) and Ctrl (Windows/Linux)

---

### T109 – Integrate Escape to close pickers

**Steps**:
1. Update `src/components/OrganisationPicker.tsx`:
   ```typescript
   import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

   export function OrganisationPicker({ isOpen, onClose, ... }) {
     useKeyboardShortcut(
       { key: 'Escape' },
       () => {
         if (isOpen) {
           onClose();
         }
       }
     );

     // ...
   }
   ```

2. Same for `src/components/ProjectPicker.tsx`

**Files**: `src/components/OrganisationPicker.tsx`, `src/components/ProjectPicker.tsx`

**Notes**: Only trigger if picker is open

---

### T110 – Add focus trap to pickers

**Steps**:
1. Install focus-trap-react:
   ```bash
   pnpm add focus-trap-react
   ```

2. Wrap picker content:
   ```typescript
   import FocusTrap from 'focus-trap-react';

   return (
     <Modal isOpen={isOpen} onClose={onClose}>
       <FocusTrap active={isOpen}>
         <div>
           <SearchField ... />
           <List ... />
         </div>
       </FocusTrap>
     </Modal>
   );
   ```

**Files**: `src/components/OrganisationPicker.tsx`, `src/components/ProjectPicker.tsx`

**Notes**: May be redundant if F01 Modal handles focus trap

---

### T111 – Add visual focus indicators

**Steps**:
1. Verify F01 components have focus indicators (outline, ring)
2. If needed, add custom CSS using F01 tokens:
   ```typescript
   <button
     style={{
       outline: 'none',
       ':focus-visible': {
         boxShadow: '0 0 0 3px var(--color-focus-ring)',
       },
     }}
   >
   ```

**Files**: All components

**Notes**: F01 should handle this; verify in Storybook

---

### T112 – Add ARIA live regions for context changes

**Steps**:
1. Update `src/context/ContextSwitcherProvider.tsx`:
   ```typescript
   export function ContextSwitcherProvider({ children, ... }) {
     const [context, setContext] = useState<UserContext>(...);
     const [announcement, setAnnouncement] = useState('');

     const switchContext = async (org, project) => {
       // ... switch logic
       setContext(newContext);

       // Announce to screen readers
       const message = project
         ? `Switched to ${org.name}, ${project.name} project`
         : `Switched to ${org.name}`;
       setAnnouncement(message);

       // Clear announcement after delay
       setTimeout(() => setAnnouncement(''), 3000);
     };

     return (
       <ContextSwitcherContext.Provider value={{ context, switchContext, ... }}>
         <div
           role="status"
           aria-live="polite"
           aria-atomic="true"
           style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
         >
           {announcement}
         </div>
         {children}
       </ContextSwitcherContext.Provider>
     );
   }
   ```

**Files**: `src/context/ContextSwitcherProvider.tsx`

---

### T113 – Add skip link for keyboard users

**Steps**:
1. Update `src/components/ContextSwitcher.tsx`:
   ```typescript
   return (
     <div>
       <a
         href="#main-content"
         style={{
           position: 'absolute',
           left: '-10000px',
           top: 'auto',
           width: '1px',
           height: '1px',
           overflow: 'hidden',
           ':focus': {
             position: 'static',
             width: 'auto',
             height: 'auto',
           },
         }}
       >
         Skip to main content
       </a>
       <ContextIndicator ... />
       {/* ... */}
     </div>
   );
   ```

**Files**: `src/components/ContextSwitcher.tsx`

**Notes**: Optional; host app typically provides skip link

---

### T114 [P] – Write unit tests for useKeyboardShortcut

**Steps**:
1. Create `__tests__/hooks/useKeyboardShortcut.test.ts`:
   ```typescript
   import { renderHook } from '@testing-library/react';
   import { useKeyboardShortcut } from '../../src/hooks/useKeyboardShortcut';

   describe('useKeyboardShortcut', () => {
     it('calls callback on matching key', () => {
       const callback = jest.fn();

       renderHook(() =>
         useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
       );

       const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
       window.dispatchEvent(event);

       expect(callback).toHaveBeenCalledTimes(1);
     });

     it('does not call callback on non-matching key', () => {
       const callback = jest.fn();

       renderHook(() =>
         useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
       );

       const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true });
       window.dispatchEvent(event);

       expect(callback).not.toHaveBeenCalled();
     });

     it('requires all modifiers to match', () => {
       const callback = jest.fn();

       renderHook(() =>
         useKeyboardShortcut({ key: 'k', ctrlKey: true, shiftKey: true }, callback)
       );

       const event1 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
       window.dispatchEvent(event1);
       expect(callback).not.toHaveBeenCalled();

       const event2 = new KeyboardEvent('keydown', {
         key: 'k',
         ctrlKey: true,
         shiftKey: true,
       });
       window.dispatchEvent(event2);
       expect(callback).toHaveBeenCalledTimes(1);
     });

     it('prevents default if option set', () => {
       const callback = jest.fn();

       renderHook(() =>
         useKeyboardShortcut({ key: 'k', ctrlKey: true, preventDefault: true }, callback)
       );

       const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
       const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

       window.dispatchEvent(event);

       expect(preventDefaultSpy).toHaveBeenCalled();
     });

     it('cleans up event listener on unmount', () => {
       const callback = jest.fn();
       const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

       const { unmount } = renderHook(() =>
         useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
       );

       unmount();

       expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
     });
   });
   ```

**Files**: `__tests__/hooks/useKeyboardShortcut.test.ts`

**Parallel?**: Yes

---

### T115 [P] – Run axe-core on all components

**Steps**:
1. Verify all WP05-WP08 accessibility tests pass:
   ```bash
   pnpm test -- --testPathPattern="a11y.test"
   ```

2. Generate accessibility report:
   ```bash
   pnpm test -- --testPathPattern="a11y.test" --coverage --coverageReporters=html
   ```

**Files**: N/A (test run)

**Parallel?**: Yes

**Notes**: Should be zero violations

---

### T116 [P] – Perform keyboard-only testing

**Steps**:
1. Create manual test checklist in `__tests__/manual/keyboard-testing.md`:
   ```markdown
   # Keyboard-Only Testing Checklist

   ## Context Switcher
   - [ ] Tab to context switcher button
   - [ ] Enter opens organisation picker
   - [ ] ArrowDown/Up navigate organisations
   - [ ] Enter selects organisation
   - [ ] Tab to project picker button
   - [ ] Enter opens project picker
   - [ ] ArrowDown/Up navigate projects
   - [ ] Enter selects project
   - [ ] Escape closes pickers
   - [ ] Cmd/Ctrl+K opens org picker globally

   ## Search
   - [ ] Focus moves to search field when picker opens
   - [ ] Type to filter results
   - [ ] ArrowDown moves to first result
   - [ ] Tab cycles through results

   ## ARIA
   - [ ] Screen reader announces context changes
   - [ ] Screen reader announces search results count
   - [ ] Screen reader identifies current selection
   ```

2. Run manual test session with screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)

**Files**: `__tests__/manual/keyboard-testing.md`

**Parallel?**: Yes

**Notes**: Requires human tester

---

### T117 [P] – Write keyboard interaction tests

**Steps**:
1. Create `__tests__/interactions/keyboard.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { ContextSwitcher } from '../../src/components/ContextSwitcher';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   describe('Keyboard interactions', () => {
     it('opens picker with Cmd+K on Mac', async () => {
       const user = userEvent.setup();

       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextSwitcher />
         </ContextSwitcherProvider>
       );

       await user.keyboard('{Meta>}k{/Meta}');

       expect(screen.getByRole('listbox')).toBeInTheDocument();
     });

     it('opens picker with Ctrl+K on Windows', async () => {
       const user = userEvent.setup();

       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextSwitcher />
         </ContextSwitcherProvider>
       );

       await user.keyboard('{Control>}k{/Control}');

       expect(screen.getByRole('listbox')).toBeInTheDocument();
     });

     it('closes picker with Escape', async () => {
       const user = userEvent.setup();

       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextSwitcher />
         </ContextSwitcherProvider>
       );

       await user.keyboard('{Meta>}k{/Meta}'); // Open
       await user.keyboard('{Escape}'); // Close

       expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
     });

     it('navigates list with arrow keys', async () => {
       const user = userEvent.setup();

       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextSwitcher />
         </ContextSwitcherProvider>
       );

       await user.keyboard('{Meta>}k{/Meta}');

       const listbox = screen.getByRole('listbox');
       const options = screen.getAllByRole('option');

       await user.keyboard('{ArrowDown}');
       expect(options[0]).toHaveAttribute('aria-selected', 'true');

       await user.keyboard('{ArrowDown}');
       expect(options[1]).toHaveAttribute('aria-selected', 'true');

       await user.keyboard('{Enter}');
       // Verify selection occurred
     });
   });
   ```

**Files**: `__tests__/interactions/keyboard.test.tsx`

**Parallel?**: Yes

---

## Risks & Mitigations

**Risk**: Cmd+K conflicts with browser search
**Mitigation**: preventDefault handles this; test in all browsers

**Risk**: Focus trap breaks tab navigation
**Mitigation**: focus-trap-react handles this correctly; test with screen reader

**Risk**: Screen reader announcements too verbose
**Mitigation**: Brief messages (e.g., "Switched to Acme Corp"), 3s timeout

---

## Definition of Done Checklist

- [ ] useKeyboardShortcut hook created
- [ ] Hook exported from public API
- [ ] Cmd/Ctrl+K opens organisation picker
- [ ] Escape closes pickers
- [ ] Focus trap in pickers
- [ ] Visual focus indicators (F01 defaults)
- [ ] ARIA live regions for context changes
- [ ] Skip link (optional)
- [ ] Unit tests for useKeyboardShortcut
- [ ] axe-core tests pass (zero violations)
- [ ] Keyboard-only manual testing completed
- [ ] Automated keyboard interaction tests
- [ ] Test coverage 90%+

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
