---
work_package_id: "WP06"
subtasks: ["T029", "T030", "T031", "T032", "T033", "T034", "T035", "T036", "T037", "T038"]
title: "Toast Components & Queue Management"
phase: "Phase 2 - UI Components – Toast Notifications"
lane: "for_review"
assignee: "GitHub Copilot (Claude)"
agent: "claude"
shell_pid: "21096"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-11T19:10:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "21096"
    action: "Started implementation of toast components and queue management"
  - timestamp: "2025-12-11T19:30:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "21096"
    action: "Completed implementation with 49/49 tests passing - ready for review"
---

# Work Package Prompt: WP06 – Toast Components & Queue Management

## Objectives & Success Criteria

Implement toast notification display system with configurable positioning, auto-dismiss, action buttons, and accessibility features.

**Success Criteria**:
- Toasts display with correct F01 styling (variants)
- Stack correctly (max 3, newest on top)
- Auto-dismiss: INFO/SUCCESS (4-6s), WARNING (8-10s), ERROR (manual)
- Action buttons work (navigate/API)
- Configurable positioning (4 desktop, 2 mobile)
- ARIA live region announces toasts
- Keyboard navigation (Tab, Escape)

## Key Components

### T029 – Toast.tsx
Individual toast component using F01 Toast/Snackbar. Props: notification, onDismiss, onAction.

### T030 – ToastContainer.tsx
Positioning wrapper. Props: position (top-right/top-center/etc), children.

### T031 – ToastHost.tsx
Queue manager. Maintains toast array, auto-dismiss timers, max 3 visible.

### T032 – Configurable Positioning
Support desktop: top-right, top-left, top-center, bottom-*. Mobile: top-center, bottom-center.

### T033 – Action Handlers
Navigate: use router adapter. API: call endpoint, show success/error feedback.

### T034 – Accessibility
ARIA live="polite" (INFO/SUCCESS), live="assertive" (ERROR). role="status", keyboard dismissal.

### T035-T038 – Tests
Unit tests for each component. Integration test for full flow (notification arrives → toast → action → mark read).

## Files
- `src/components/ToastHost/ToastHost.tsx`
- `src/components/ToastHost/ToastContainer.tsx`
- `src/components/ToastHost/Toast.tsx`
- `src/components/ToastHost/*.test.tsx`

## References
- [spec.md](../spec.md) - User Story 1, toast positioning clarifications
- F01 Toast component documentation

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
