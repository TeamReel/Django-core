---
work_package_id: "WP08"
subtasks:
  - "T092"
  - "T093"
  - "T094"
  - "T095"
  - "T096"
  - "T097"
  - "T098"
  - "T099"
  - "T100"
  - "T101"
  - "T102"
  - "T103"
  - "T104"
  - "T105"
  - "T106"
  - "T107"
title: "Interaction Components"
phase: "Phase 2 - Advanced"
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
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP08-interaction-components.md](kitty-specs/022-frontend-design-system/tasks/planned/WP08-interaction-components.md)*

# Work Package Prompt: WP08 – Interaction Components

## ⚠️ IMPORTANT: Review Feedback Status

- **Has review feedback?**: Check the `review_status` field above.

---

## Review Feedback

*[This section is empty initially.]*

---

## Objectives & Success Criteria

### Objectives
1. Implement Modal/Dialog with focus trapping and portal rendering
2. Implement Select/Dropdown with keyboard navigation
3. Implement Tabs with arrow key navigation
4. Implement Tooltip with positioning
5. Ensure WAI-ARIA compliance for all components

### Success Criteria
- [ ] Modal traps focus and supports Escape to close
- [ ] Select implements WAI-ARIA Listbox pattern
- [ ] Tabs implement WAI-ARIA Tabs pattern with arrow keys
- [ ] Tooltip positions correctly and handles edge cases
- [ ] All components pass accessibility tests
- [ ] Keyboard navigation works for all components

---

## Context & Constraints

### Reference Documents
- Contracts: `kitty-specs/022-frontend-design-system/contracts/components.md`
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-013)

### Technical Constraints
- Modal requires focus-trap-react or similar
- Tooltip positioning may need floating-ui
- All components must follow WAI-ARIA patterns
- Escape key must close overlays

### External Dependencies (optional)
- `focus-trap-react` for Modal focus trapping
- `@floating-ui/react` for Tooltip/Select positioning

---

## Subtasks & Detailed Guidance

### Subtask T092 – Create Modal.tsx
- **Purpose**: Dialog overlay component
- **Steps**:
  1. Create `packages/design-system/src/components/Modal/Modal.tsx`
  2. Use React Portal for overlay rendering
  3. Implement focus trapping using focus-trap-react
  4. Support controlled open/close via `isOpen` prop
  5. Call `onClose` on Escape key or overlay click
  6. Support `closeOnOverlayClick` prop
  7. Include header, body, footer sections
- **Files**:
  - `packages/design-system/src/components/Modal/Modal.tsx`
  - `packages/design-system/src/components/Modal/index.ts`

```typescript
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { modalOverlay, modalContent, modalHeader, modalBody, modalFooter } from './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <FocusTrap>
      <div
        className={modalOverlay}
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      >
        <div
          className={modalContent}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <header className={modalHeader}>
              <h2 id="modal-title">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>
          )}
          <div className={modalBody}>{children}</div>
          {footer && <footer className={modalFooter}>{footer}</footer>}
        </div>
      </div>
    </FocusTrap>,
    document.body
  );
}
```

### Subtask T093 – Create Modal.css.ts [P]
### Subtask T094 – Create Modal.test.tsx [P]
### Subtask T095 – Create Modal.stories.tsx [P]

---

### Subtask T096 – Create Select.tsx
- **Purpose**: Custom select/dropdown component
- **Steps**:
  1. Create `packages/design-system/src/components/Select/Select.tsx`
  2. Implement WAI-ARIA Listbox pattern
  3. Support keyboard navigation (arrows, Enter, Escape)
  4. Support search/filter functionality (optional)
  5. Position dropdown with floating-ui
- **Files**:
  - `packages/design-system/src/components/Select/Select.tsx`
  - `packages/design-system/src/components/Select/SelectOption.tsx`
  - `packages/design-system/src/components/Select/index.ts`

Key implementation notes:
- Use `role="listbox"` on the dropdown
- Use `role="option"` on each option
- `aria-selected` for selected option
- `aria-activedescendant` for keyboard focus
- Arrow Up/Down to navigate
- Enter to select
- Escape to close

### Subtask T097 – Create Select.css.ts [P]
### Subtask T098 – Create Select.test.tsx [P]
### Subtask T099 – Create Select.stories.tsx [P]

---

### Subtask T100 – Create Tabs.tsx
- **Purpose**: Tabbed content component
- **Steps**:
  1. Create `packages/design-system/src/components/Tabs/Tabs.tsx`
  2. Create `TabList`, `Tab`, `TabPanel` subcomponents
  3. Implement WAI-ARIA Tabs pattern
  4. Support arrow key navigation between tabs
  5. Support automatic (focus-follows-selection) and manual activation
- **Files**:
  - `packages/design-system/src/components/Tabs/Tabs.tsx`
  - `packages/design-system/src/components/Tabs/TabList.tsx`
  - `packages/design-system/src/components/Tabs/Tab.tsx`
  - `packages/design-system/src/components/Tabs/TabPanel.tsx`
  - `packages/design-system/src/components/Tabs/index.ts`

Key implementation notes:
- `role="tablist"` on TabList
- `role="tab"` on each Tab
- `role="tabpanel"` on each TabPanel
- `aria-selected="true"` on active tab
- `aria-controls` links tab to panel
- `aria-labelledby` links panel to tab
- Left/Right arrow keys move focus
- Home/End jump to first/last tab

```typescript
// Example usage
<Tabs defaultValue="tab1">
  <TabList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2</Tab>
  </TabList>
  <TabPanel value="tab1">Content 1</TabPanel>
  <TabPanel value="tab2">Content 2</TabPanel>
</Tabs>
```

### Subtask T101 – Create Tabs.css.ts [P]
### Subtask T102 – Create Tabs.test.tsx [P]
### Subtask T103 – Create Tabs.stories.tsx [P]

---

### Subtask T104 – Create Tooltip.tsx
- **Purpose**: Hover/focus tooltip component
- **Steps**:
  1. Create `packages/design-system/src/components/Tooltip/Tooltip.tsx`
  2. Use floating-ui for positioning
  3. Support placement (top, right, bottom, left)
  4. Show on hover and focus
  5. Delay show/hide for usability
  6. Use `role="tooltip"` with `aria-describedby`
- **Files**:
  - `packages/design-system/src/components/Tooltip/Tooltip.tsx`
  - `packages/design-system/src/components/Tooltip/index.ts`

```typescript
import React, { useState, useId } from 'react';
import { useFloating, offset, flip, shift, useHover, useFocus, useInteractions } from '@floating-ui/react';
import { tooltip } from './Tooltip.css';

export interface TooltipProps {
  content: React.ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactElement;
  delay?: number;
}

export function Tooltip({ content, placement = 'top', children, delay = 200 }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(8), flip(), shift()],
  });

  const hover = useHover(context, { delay: { open: delay, close: 0 } });
  const focus = useFocus(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus]);

  return (
    <>
      {React.cloneElement(children, {
        ref: refs.setReference,
        'aria-describedby': isOpen ? tooltipId : undefined,
        ...getReferenceProps(),
      })}
      {isOpen && (
        <div
          ref={refs.setFloating}
          id={tooltipId}
          role="tooltip"
          className={tooltip}
          style={floatingStyles}
          {...getFloatingProps()}
        >
          {content}
        </div>
      )}
    </>
  );
}
```

### Subtask T105 – Create Tooltip.css.ts [P]
### Subtask T106 – Create Tooltip.test.tsx [P]
### Subtask T107 – Create Tooltip.stories.tsx [P]

---

## Test Strategy

```bash
pnpm --filter design-system test -- --testPathPattern="Modal|Select|Tabs|Tooltip"
pnpm --filter design-system storybook
```

### Accessibility Testing
- Modal: Focus trap, Escape key, aria-modal
- Select: Keyboard navigation, aria-selected
- Tabs: Arrow key navigation, ARIA roles
- Tooltip: aria-describedby, role="tooltip"

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Focus trap complexity | Use focus-trap-react library |
| Tooltip positioning edge cases | Use floating-ui for robust positioning |
| Keyboard navigation bugs | Test with screen readers and keyboard-only |

---

## Definition of Done Checklist

- [ ] Modal with focus trap and portal
- [ ] Select with WAI-ARIA Listbox pattern
- [ ] Tabs with WAI-ARIA Tabs pattern
- [ ] Tooltip with floating-ui positioning
- [ ] All components keyboard accessible
- [ ] All WAI-ARIA patterns implemented
- [ ] Storybook stories
- [ ] Unit tests pass
- [ ] `tasks.md` updated with WP08 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-07T13:29:40Z – github-copilot – shell_pid=17604 – lane=doing – Started implementation: Interaction components (Modal, Select, Tabs, Tooltip)
- 2025-12-07T13:57:01Z – github-copilot – shell_pid=17604 – lane=for_review – Complete: Modal, Select, Tabs, Tooltip - 58 tests, 0 a11y violations
