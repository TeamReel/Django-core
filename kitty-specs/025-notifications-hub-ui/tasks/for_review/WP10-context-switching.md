---
work_package_id: "WP10"
subtasks: ["T057", "T058", "T059", "T060", "T061", "T062", "T063", "T064"]
title: "Context Switching & Optimistic Updates"
phase: "Phase 4 - UI Components – Badge & Context Integration"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. **TestProviders uses incorrect provider APIs** - The `test-providers.tsx` helper tries to use `AuthProvider` with a `value` prop (doesn't exist) and imports `ContextProvider` (should be `ContextSwitcherProvider`). This causes all integration tests to fail with "TypeError: Cannot read properties of undefined (reading 'security')".

2. **Missing mock implementations** - The real `AuthProvider` requires a `config` prop with `apiBaseUrl`, `endpoints`, `routes`, and `security` objects. The real `ContextSwitcherProvider` needs `config` with API endpoints and initial context. Integration tests need proper mocks to isolate the notifications functionality.

3. **Tests cannot run** - Due to provider configuration errors, none of the 9 integration test scenarios can execute. The test structure and MSW handlers are well-designed, but they're blocked by the provider setup.

**What Was Done Well**:
- ✅ Excellent test structure with clear documentation and success criteria
- ✅ Comprehensive test coverage (3 scenarios for context switching, 6 for optimistic updates)
- ✅ Proper MSW 1.x mock handlers for org/project switching and API failure scenarios
- ✅ Good use of test component pattern to verify hook behavior
- ✅ Correct MSW version downgrade (2.12.4 → 1.3.2) to match project standard
- ✅ Jest configuration properly updated with workspace package mappings

**Action Items** (must complete before re-review):
- [ ] Fix `TestProviders` to use correct provider APIs:
  * Import `AuthProvider` from `@django-core/auth-ui` with proper `config` prop
  * Import `ContextSwitcherProvider` from `@django-core/context-switcher` with proper `config` prop
  * OR create simpler mock providers that just provide minimal context values via `AuthContext.Provider` and `ContextSwitcherContext.Provider` directly
- [ ] Provide mock config objects for both providers with all required fields
- [ ] Run `npm test -- __tests__/integration/context-switching.test.tsx` and verify all 3 tests pass
- [ ] Run `npm test -- __tests__/integration/optimistic-updates.test.tsx` and verify all 6 tests pass
- [ ] Update activity log with "Fixed provider configuration, tests passing"

**Recommended Fix** (choose one approach):

**Option A: Use real providers with mock configs**
```tsx
const mockAuthConfig = {
  apiBaseUrl: '/api/v1',
  endpoints: { /* minimal mock endpoints */ },
  routes: { login: '/login', defaultAfterLogin: '/', afterLogout: '/' },
  security: { csrfCookieName: 'csrftoken', csrfHeaderName: 'X-CSRFToken' },
};

const mockContextConfig = {
  apiBaseUrl: '/api/v1',
  endpoints: { organisations: '/orgs', projects: '/projects' },
};

<AuthProvider config={mockAuthConfig} skipInitialLoad>
  <ContextSwitcherProvider config={mockContextConfig} initialContext={contextValue}>
    {children}
  </ContextSwitcherProvider>
</AuthProvider>
```

**Option B: Use context providers directly (simpler for integration tests)**
```tsx
import { AuthContext } from '@django-core/auth-ui';
import { ContextSwitcherContext } from '@django-core/context-switcher';

<AuthContext.Provider value={mockAuthValue}>
  <ContextSwitcherContext.Provider value={mockContextValue}>
    {children}
  </ContextSwitcherContext.Provider>
</AuthContext.Provider>
```

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
- 2025-12-11T19:05:17Z – claude – shell_pid=26596 – lane=doing – Started implementation of integration tests
- 2025-12-11T19:13:41Z – claude – shell_pid=26596 – lane=for_review – Completed integration tests implementation - provider config issue noted for review
- 2025-12-11T19:20:15Z – claude-reviewer – shell_pid=26596 – lane=planned – Code review complete: TestProviders uses incorrect provider APIs, tests cannot run
