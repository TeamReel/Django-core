---
work_package_id: "WP08"
subtasks: ["T044", "T045", "T046", "T047", "T048", "T051", "T052"]
title: "Notification Panel & Controls"
phase: "Phase 3 - UI Components – Inbox Panel"
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

# Work Package Prompt: WP08 – Notification Panel & Controls

## Objectives & Success Criteria

Implement slide-out notification panel with header, footer, filters, and keyboard navigation.

**Success Criteria**:
- Panel slides in from right (configurable)
- Header with title, close button, filters
- Footer with "Mark all as read"
- 400px width desktop, full-width mobile
- Escape closes panel
- Focus trap works

## Key Components

### T044 – PanelHeader.tsx
Title, close button, filter controls (All/Unread/Read). Uses F01 components.

### T045 – PanelFooter.tsx
"Mark all as read" button with confirmation if count > 10.

### T046 – NotificationPanel.tsx
F01 Drawer component. Integrates header, NotificationList, footer. Props: open, onClose, position.

### T047 – Animations
Slide-in/out using F01 motion tokens. 200-300ms duration.

### T048 – Keyboard Navigation
Arrow keys navigate list, Enter opens item, Escape closes panel. Focus trap implementation.

### T051-T052 – Tests
Unit tests for panel. Integration test for inbox interactions (open → filter → mark read → close).

## Files
- `src/components/NotificationPanel/PanelHeader.tsx`
- `src/components/NotificationPanel/PanelFooter.tsx`
- `src/components/NotificationPanel/NotificationPanel.tsx`
- `src/components/NotificationPanel/*.test.tsx`

## References
- [spec.md](../spec.md) - User Story 2
- F01 Drawer/Modal documentation

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
