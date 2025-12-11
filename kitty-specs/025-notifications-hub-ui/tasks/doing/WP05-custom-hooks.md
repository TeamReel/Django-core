---
work_package_id: "WP05"
subtasks: ["T021", "T022", "T023", "T024", "T025", "T026", "T027", "T028"]
title: "Custom Hooks"
phase: "Phase 1 - State Management & Data Flow"
lane: "doing"
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
  - timestamp: "2025-12-11T18:40:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "21096"
    action: "Started implementation of custom hooks"
---

# Work Package Prompt: WP05 – Custom Hooks

## Objectives & Success Criteria

Implement custom React hooks exposing notification state and actions to consuming components, with full unit test coverage.

**Success Criteria**:
- All hooks correctly consume NotificationsContext
- Hooks throw error if used outside provider
- 100% test coverage for all hooks

## Key Implementation Points

### T021 – useNotifications Hook
Export full state + all actions. Main hook for components needing complete access.

### T022 – useUnreadCount Hook
Lightweight hook returning only { count, loading }. Optimized for badge components.

### T023 – useNotificationsActions Hook
Export only actions (mark-as-read, filters, panel control). For components not needing state.

### T024 – usePolling Hook
Export { pausePolling, resumePolling, isPollingActive }. For debugging/control panels.

### T025-T028 – Unit Tests
Use @testing-library/react-hooks. Test all methods, edge cases, error conditions.

## Files
- `src/hooks/useNotifications.ts`
- `src/hooks/useNotifications.test.ts`
- `src/hooks/useUnreadCount.ts`
- `src/hooks/useUnreadCount.test.ts`
- `src/hooks/useNotificationsActions.ts`
- `src/hooks/useNotificationsActions.test.ts`
- `src/hooks/usePolling.ts`
- `src/hooks/usePolling.test.ts`
- `src/hooks/index.ts` (barrel export)

## Parallel Opportunities
All 4 hooks (T021-T024) and tests (T025-T028) can be developed in parallel.

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
