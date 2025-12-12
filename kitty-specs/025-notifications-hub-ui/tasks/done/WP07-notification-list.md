---
work_package_id: "WP07"
subtasks: ["T039", "T040", "T041", "T042", "T043", "T049", "T050"]
title: "Notification List & Skeleton Loading"
phase: "Phase 3 - UI Components – Inbox Panel"
lane: "done"
assignee: "claude"
agent: "claude-reviewer"
shell_pid: "21096"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-11T19:30:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "21096"
    action: "Review approved: All 71 tests passing (100%). All 5 components meet success criteria: skeleton 3-5 rows, NotificationItem full data + styling, virtual scrolling 1000+, empty state helpful message, error state retry button. Clean TypeScript, proper ARIA, good event handling."
---

# Work Package Prompt: WP07 – Notification List & Skeleton Loading

## Objectives & Success Criteria

Implement notification list with virtualization, skeleton loading, empty/error states, and individual notification items.

**Success Criteria**:
- Skeleton shows 3-5 rows while loading
- NotificationItem displays all data with read/unread styling
- Virtual scrolling works with 1000+ notifications
- Empty state shows helpful message
- Error state shows retry button

## Key Components

### T039 – NotificationSkeleton.tsx
3-5 skeleton rows using F01 Skeleton component. Matches notification structure (icon, title, message, timestamp).

### T040 – NotificationItem.tsx
Single notification row. Props: notification, onClick, onMarkRead. Visual distinction for read/unread.

### T041 – NotificationActions.tsx
Action buttons: Mark as read/unread, Delete (future). Dropdown menu or icon buttons.

### T042 – VirtualizedList.tsx
react-window FixedSizeList with 70px row height. Renders only visible items.

### T043 – NotificationList.tsx
Main list component. Handles loading, empty, error states. Integrates virtualization.

### T049-T050 – Tests
Unit tests for all components. Test rendering, actions, states.

## Files
- `src/components/NotificationList/NotificationSkeleton.tsx`
- `src/components/NotificationList/NotificationItem.tsx`
- `src/components/NotificationList/NotificationActions.tsx`
- `src/components/NotificationList/VirtualizedList.tsx`
- `src/components/NotificationList/NotificationList.tsx`
- `src/components/NotificationList/*.test.tsx`

## References
- [spec.md](../spec.md) - User Story 2, skeleton loading clarification
- [data-model.md](../data-model.md) - Notification entity structure

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
- 2025-12-11T18:13:02Z – claude – shell_pid=21096 – lane=doing – Started implementation - notification list components
- 2025-12-11T18:19:43Z – claude – shell_pid=21096 – lane=for_review – Implementation complete - all 71 tests passing, 5 components + 5 test files created
- 2025-12-11T19:30:00Z – claude-reviewer – shell_pid=21096 – lane=done – Review approved: All 71 tests passing (100%), virtualization working with 1000+ items
