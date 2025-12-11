---
work_package_id: "WP09"
subtasks: ["T053", "T054", "T055", "T056"]
title: "Unread Badge Component"
phase: "Phase 4 - UI Components – Badge & Context Integration"
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

# Work Package Prompt: WP09 – Unread Badge Component

## Objectives & Success Criteria

Implement unread notification badge with count/dot variants and configurable visibility.

**Success Criteria**:
- Badge displays unread count from useUnreadCount
- Count variant shows number
- Dot variant shows indicator
- Max count (default 99, shows "99+")
- Hide-when-zero option works

## Key Components

### T053 – UnreadBadge.tsx
F01 Badge component. Props: variant ('count'|'dot'), max (default 99), showZero (default false).

### T054 – Max Count Display
If count > max, display "{max}+" (e.g., "99+").

### T055 – Hide When Zero
If showZero=false and count===0, return null (hide badge).

### T056 – Unit Tests
Test count display, variants, hide-when-zero, max count.

## Files
- `src/components/UnreadBadge/UnreadBadge.tsx`
- `src/components/UnreadBadge/UnreadBadge.test.tsx`

## References
- [spec.md](../spec.md) - User Story 3
- F01 Badge component documentation

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
