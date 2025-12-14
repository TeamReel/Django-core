---
work_package_id: WP06
title: Comprehensive Error States
lane: doing
assignee: github-copilot
agent: copilot
shell_pid: 32760
subtasks:
  - T038
  - T039
  - T040
  - T041
priority: P2
dependencies:
  - WP01
  - WP02
story: "P2 Story 5 - Error Handling & Edge Cases"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: Error boundaries, API error handling, retry logic
  - date: 2025-12-14T14:45:00Z
    action: started
    agent: copilot
    shell_pid: 32760
    notes: Started WP06 implementation - comprehensive error states
---

# WP06: Comprehensive Error States

## Objective

Implement P2 Story 5 (Error Handling & Edge Cases): add API error handling, network retry logic, friendly error messages, and error recovery UI across all pages.

**Success Criterion**: Simulate backend down → shows "Service unavailable" message with retry button. 500 error → shows "Something went wrong, please try again". Network errors caught gracefully.

---

## Context

**User Story**: P2 Story 5
**Priority**: P2 (Production readiness)
**Dependencies**: WP02 (API client)

**Why This Matters**: Robust error handling prevents user frustration, provides clear feedback, enables graceful degradation.

**Design Documents**:
- `spec.md`: AS-5.1 through AS-5.4 (network errors, 404, 500, retry)
- Edge Case 3: Backend unavailable scenario

---

## Detailed Guidance

### T038: Enhance API Client

Update `src/lib/api-client.ts`:
```typescript
export async function apiRequest<T>(...) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('Resource not found');
      }
      if (response.status >= 500) {
        throw new ServerError('Service unavailable');
      }
      throw new ApiError('Request failed');
    }

    return response.json();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new NetworkError('Network error. Check your connection.');
    }
    throw err;
  }
}
```

### T039-T040: Error UI Components

Create `<ErrorMessage>` component with retry button, use in pages.

### T041: E2E test for error scenarios (mock backend down).

---

## DoD

- [ ] API client throws typed errors (NotFoundError, ServerError, NetworkError)
- [ ] Pages display friendly error messages
- [ ] Retry button re-fetches data
- [ ] E2E test simulates backend down → shows error UI

---

**Status**: Ready (blocked by WP02)
**Lane**: `planned` → `doing` after WP02 → `for_review` → `done`
