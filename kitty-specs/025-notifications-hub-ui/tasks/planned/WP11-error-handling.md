---
work_package_id: "WP11"
subtasks: ["T065", "T066", "T067", "T068", "T069", "T070"]
title: "Error Handling & Observability"
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

# Work Package Prompt: WP11 – Error Handling & Observability

## Objectives & Success Criteria

Implement comprehensive error handling, retry logic, observability signals, and user-friendly error messages.

**Success Criteria**:
- Error boundary catches component crashes
- 401 triggers F02 re-auth
- 403 shows "Access denied"
- 500 retries with backoff (1s, 2s, 4s, max 3)
- Observability signals for all failures
- Malformed data logged, fallback display

## Key Implementation Points

### T065 – Error Boundary
React error boundary wrapping NotificationsProvider. Shows fallback UI on crash.

### T066 – User-Friendly Messages
Map error codes: 401 → "Session expired", 403 → "Access denied", 500 → "Server error, retrying...".

### T067 – Exponential Backoff
Retry logic: delays 1s, 2s, 4s with jitter. Max 3 retries.

### T068 – Observability Signals
Emit structured logs for fetch failures, mark-as-read failures, connection errors.

### T069 – Malformed Data Logging
Log invalid notifications to console. Show generic fallback display.

### T070 – Error Handling Integration Test
Test: API returns 500 → error message shown → retry succeeds.

## Files
- `src/components/ErrorBoundary.tsx`
- `src/utils/errorHandler.ts`
- `src/utils/retryWithBackoff.ts`
- `__tests__/integration/error-handling.test.tsx`

## References
- [spec.md](../spec.md) - Error handling requirements
- [data-model.md](../data-model.md) - Error handling strategy

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
