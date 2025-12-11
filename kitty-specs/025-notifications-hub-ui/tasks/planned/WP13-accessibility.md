---
work_package_id: "WP13"
subtasks: ["T076", "T077", "T078", "T079", "T080"]
title: "Accessibility & Keyboard Navigation"
phase: "Phase 5 - Error Handling, Performance & Accessibility"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP13 – Accessibility & Keyboard Navigation

## Objectives & Success Criteria

Ensure full keyboard navigation, screen reader support, and WCAG 2.1 AA compliance.

**Success Criteria**:
- All buttons/links have ARIA labels
- Keyboard: Tab, Enter, Escape work correctly
- Screen reader announces new notifications
- Focus trap in panel works
- Focus restored when panel closes
- Passes axe-core automated tests

## Key Implementation Points

### T076 – ARIA Labels
Add aria-label, aria-labelledby, aria-describedby to all interactive elements.

### T077 – Keyboard Shortcuts
useEffect with keydown listener. Tab (focus), Enter (activate), Escape (close).

### T078 – Screen Reader Announcements
ARIA live region: role="status", aria-live="polite" (INFO/SUCCESS), "assertive" (ERROR).

### T079 – Focus Management
Focus trap: use focus-trap-react. Restore focus to trigger button on close.

### T080 – Testing
Test with NVDA/JAWS (Windows), VoiceOver (macOS). Keyboard-only navigation. Run axe-core.

## Files
- Update all components with ARIA attributes
- Create `src/utils/focusTrap.ts` for focus management
- Add `__tests__/accessibility.test.tsx`

## References
- [spec.md](../spec.md) - Accessibility requirements
- WCAG 2.1 AA guidelines

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
