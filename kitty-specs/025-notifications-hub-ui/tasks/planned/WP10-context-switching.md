---
work_package_id: "WP10"
subtasks: ["T057", "T058", "T059", "T060", "T061", "T062", "T063", "T064"]
title: "Context Switching & Optimistic Updates"
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

# Work Package Prompt: WP10 – Context Switching & Optimistic Updates

## Objectives & Success Criteria

Implement seamless context switching and optimistic UI updates with rollback on failure.

**Success Criteria**:
- Switching org clears, shows skeleton, fetches new data
- Switching project fetches project-scoped notifications
- Badge updates immediately on context switch
- Mark-as-read updates UI immediately, reverts on failure
- Error toast on rollback

## Key Implementation Points

### T057-T059 – Context Switching
Already implemented in WP03 (T015). This WP adds integration tests to verify behavior.

### T060 – Context Switching Integration Test
Test: switch org → inbox clears → skeleton shows → new data loads. Switch project → project data loads.

### T061-T063 – Optimistic Updates
Already implemented in WP04 (T018). This WP adds comprehensive testing.

### T064 – Optimistic Update Integration Test
Test: mark as read → UI updates immediately → API fails → state reverted → error toast shown.

## Files
- `__tests__/integration/context-switching.test.tsx`
- `__tests__/integration/optimistic-updates.test.tsx`

## References
- [spec.md](../spec.md) - User Story 4, optimistic updates clarification
- [data-model.md](../data-model.md) - State machine diagrams

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
