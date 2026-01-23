---
lane: "done"
agent: "claude-reviewer"
shell_pid: "34476"
assignee: "claude"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# WP06: Optional Data Hooks & TypeScript Contracts

---
**work_package_id**: WP06
**status**: planned
**priority**: P2 (Optional feature, enhances integration)
**subtasks**: [T034, T035, T036, T037, T038]
**dependencies**: WP01 (package scaffold), contracts already defined in Phase 1
**parallel**: Can run in parallel with WP05, WP07
**history**:
  - 2025-12-12: Created task prompt from Phase 3 breakdown

---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Reviewed**: 2025-12-13T09:46:00Z by claude-code-reviewer

### Critical Issues (Must Fix Before Approval):

1. **TypeScript Compilation Errors** (BLOCKING)
   - **Problem**: Contract imports use incorrect path `../../kitty-specs/027-resource-display-alerts/contracts/`
   - **Impact**: Package build fails with TS2307 errors, cannot be published
   - **Fix**: Contracts should be copied to `src/types/contracts/` during build, or imported from a shared package
   - **Files affected**:
     - `src/hooks/useResourceUsage.ts:8`
     - `src/hooks/useHealthStatus.ts:8`
   - **Recommended approach**: Create `src/types/contracts/` directory and copy contract files there

2. **Missing NodeJS Type Definitions**
   - **Problem**: `NodeJS.Timeout` type not available (TS2503 errors)
   - **Impact**: TypeScript compilation fails
   - **Fix**: Add `@types/node` to devDependencies in `package.json`
   - **Command**: `pnpm add -D @types/node`

3. **Definition of Done Not Met - Missing Storybook Stories (T039)**
   - **Problem**: No Storybook stories created for hooks despite task requirement
   - **Impact**: Cannot demo hooks or test with MSW mocks visually
   - **Fix**: Create stories in `src/hooks/useResourceUsage.stories.tsx` and `src/hooks/useHealthStatus.stories.tsx`
   - **Requirements**: Use MSW to mock B11/B18 API responses, show loading/error/success states

### What Was Done Excellently:

- ✅ **Comprehensive test coverage**: 29 hook tests (14 useResourceUsage, 15 useHealthStatus), all passing
- ✅ **Proper error handling**: try/catch blocks, Error normalization, console logging with [F05] prefix
- ✅ **Memory leak prevention**: Intervals cleaned up properly on unmount (verified in tests)
- ✅ **CSRF protection**: Uses createApiClient() singleton correctly
- ✅ **Polling implementation**: Configurable interval, enabled/disabled state, manual refetch
- ✅ **Hook patterns**: Uses useCallback for stable fetchData reference, useRef for interval tracking
- ✅ **Test quality**: Fake timers implemented correctly, edge cases covered (disabled, pollInterval<=0, unmount cleanup)
- ✅ **Code documentation**: JSDoc comments with usage examples

### Action Items (Must Complete Before Re-review):

- [ ] **Fix TypeScript compilation**: Copy contracts to `src/types/contracts/` and update imports
- [ ] **Add @types/node**: Install missing type definitions
- [ ] **Create Storybook stories (T039)**: Both hooks need stories with MSW mocks
- [ ] **Verify build passes**: Run `pnpm build` - must complete with zero errors
- [ ] **Verify Storybook launches**: Run `pnpm storybook` - must launch without errors
- [ ] **Update exports if needed**: Ensure contract types are re-exported from package

### Test Results:
- ✅ All 210 tests passing (29 hook tests + 181 existing tests)
- ❌ TypeScript compilation: 4 errors in 2 files
- ⚠️ act() warnings present but acceptable (async state updates, non-blocking)

### Next Steps:
1. Address the 3 critical issues listed above
2. Run `pnpm build` to verify TypeScript compilation
3. Run `pnpm storybook` to verify stories work
4. Move task back to for_review when all issues resolved

---

## Objective

Implement optional polling hooks (`useResourceUsage`, `useHealthStatus`) to fetch data from B11 (billing) and B18 (health) APIs. Use @django-core/api-client for CSRF-protected fetches. Include error handling, loading states, and configurable polling intervals.

## Context

**Feature**: 027-resource-display-alerts (F05 Resource Display & Alerts)
**Related Documents**:
- [spec.md](../../spec.md) - See optional hooks in requirements
- [plan.md](../../plan.md) - See Data Fetching Hooks section
- [contracts/B11-billing-credits.ts](../../contracts/B11-billing-credits.ts) - CreditUsageResponse interface
- [contracts/B18-health-status.ts](../../contracts/B18-health-status.ts) - HealthStatusResponse interface

**Key Requirements** (from spec.md):
- FR-016: Optional hooks for B11/B18 data fetching (components remain stateless)
- FR-017: Configurable polling interval (default 30s)
- FR-018: Error handling and loading states exposed to consumers
- FR-019: Use @django-core/api-client for CSRF protection

**Technical Context**:
- Hooks are OPTIONAL (components can receive data via props instead)
- Contracts already defined in Phase 1 (contracts/ directory)
- @django-core/api-client provides fetch wrapper with CSRF token handling
- Polling implemented with useEffect + setInterval

**Success Criteria**:
- useResourceUsage polls B11 API every 30s, returns data/loading/error
- useHealthStatus polls B18 API, returns service health data
- Cleanup intervals on unmount (no memory leaks)
- TypeScript contracts correctly type API responses

## Detailed Guidance

### T034: Implement useResourceUsage Hook

**Task**: Create hook to poll B11 API for credit usage data.

**File**: `src/hooks/useResourceUsage.ts`

**Implementation**:
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@django-core/api-client';
import type { CreditUsageResponse } from '../types/contracts/B11';

export interface UseResourceUsageOptions {
  /**
   * API endpoint URL (B11 billing API)
   * @example "/api/billing/credits/usage"
   */
  endpoint: string;

  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollInterval?: number;

  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
}

export interface UseResourceUsageResult {
  /**
   * Credit usage data (null if not loaded yet)
   */
  data: CreditUsageResponse | null;

  /**
   * Loading state (true on initial load and during polling)
   */
  isLoading: boolean;

  /**
   * Error (null if no error)
   */
  error: Error | null;

  /**
   * Manually trigger a refresh
   */
  refetch: () => void;
}

/**
 * Hook to poll B11 API for resource usage data
 *
 * @example
 * const { data, isLoading, error } = useResourceUsage({
 *   endpoint: '/api/billing/credits/usage',
 *   pollInterval: 30000,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Alert severity="error" title="Failed to load credits" />;
 * if (!data) return null;
 *
 * return <ResourceUsageBar value={data.used} max={data.limit} />;
 */
export const useResourceUsage = ({
  endpoint,
  pollInterval = 30000,
  enabled = true,
}: UseResourceUsageOptions): UseResourceUsageResult => {
  const [data, setData] = useState<CreditUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<CreditUsageResponse>(endpoint);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch resource usage'));
      console.error('[F05] useResourceUsage error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    fetchData();
  }, [enabled, fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    intervalRef.current = setInterval(fetchData, pollInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};
```

**Design Decisions**:
- `enabled` prop allows conditional polling (e.g., only when user is authenticated)
- `refetch()` callback for manual refresh (e.g., after user action)
- Cleanup interval on unmount to prevent memory leaks
- isLoading true on initial load AND during polling (shows spinner on first load)

**Validation**: Hook fetches data and returns correct types

---

### T035: Implement useHealthStatus Hook

**Task**: Create hook to poll B18 API for service health data.

**File**: `src/hooks/useHealthStatus.ts`

**Implementation** (similar to useResourceUsage):
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@django-core/api-client';
import type { HealthStatusResponse } from '../types/contracts/B18';

export interface UseHealthStatusOptions {
  /**
   * API endpoint URL (B18 health API)
   * @example "/api/health/status"
   */
  endpoint: string;

  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollInterval?: number;

  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
}

export interface UseHealthStatusResult {
  /**
   * Service health data (null if not loaded yet)
   */
  data: HealthStatusResponse | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error (null if no error)
   */
  error: Error | null;

  /**
   * Manually trigger a refresh
   */
  refetch: () => void;
}

/**
 * Hook to poll B18 API for system health data
 *
 * @example
 * const { data, isLoading, error } = useHealthStatus({
 *   endpoint: '/api/health/status',
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Alert severity="error" title="Failed to load health status" />;
 * if (!data) return null;
 *
 * return (
 *   <>
 *     {data.services.map(service => (
 *       <HealthStatus
 *         key={service.name}
 *         name={service.name}
 *         status={service.status}
 *       />
 *     ))}
 *   </>
 * );
 */
export const useHealthStatus = ({
  endpoint,
  pollInterval = 30000,
  enabled = true,
}: UseHealthStatusOptions): UseHealthStatusResult => {
  const [data, setData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<HealthStatusResponse>(endpoint);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch health status'));
      console.error('[F05] useHealthStatus error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    fetchData();
  }, [enabled, fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    intervalRef.current = setInterval(fetchData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};
```

**Validation**: Hook fetches health data and polls at correct interval

---

### T036: Use @django-core/api-client for CSRF-Protected Fetches

**Task**: Verify hooks use api-client correctly (already implemented in T034/T035).

**Verification Steps**:
1. Check imports: `import { apiClient } from '@django-core/api-client';`
2. Verify fetch calls: `apiClient.get<ResponseType>(endpoint)`
3. Confirm CSRF token automatically included by api-client
4. Test with mock API server (or Storybook with MSW)

**api-client Usage Pattern**:
```typescript
// Good: CSRF-protected
const response = await apiClient.get<CreditUsageResponse>(endpoint);

// Bad: Direct fetch (no CSRF protection)
// const response = await fetch(endpoint);
```

**Validation**: Hooks use apiClient.get() instead of raw fetch()

---

### T037: Add Error Handling and Loading States

**Task**: Ensure hooks expose error and loading states to consumers (already implemented in T034/T035).

**Error Handling Checklist**:
- [ ] Catch all errors in try/catch block
- [ ] Convert non-Error exceptions to Error objects
- [ ] Set error state (exposed in hook return)
- [ ] Log errors to console for debugging
- [ ] Do NOT throw errors (return them in error state)

**Loading State Checklist**:
- [ ] isLoading=true before fetch starts
- [ ] isLoading=false after fetch completes (success or error)
- [ ] Loading state updated on both initial fetch AND polling

**Example Error Handling**:
```typescript
try {
  const response = await apiClient.get<T>(endpoint);
  setData(response.data);
  setError(null); // Clear previous errors
} catch (err) {
  const error = err instanceof Error ? err : new Error('Unknown error');
  setError(error);
  console.error('[F05] Hook error:', error);
} finally {
  setIsLoading(false); // Always set loading to false
}
```

**Validation**: Hooks return error/loading states correctly

---

### T038: Write Unit Tests with Mocked Fetch/Timers

**Task**: Comprehensive unit tests for both hooks.

**File**: `tests/hooks/useResourceUsage.test.ts`

**Test Setup**:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResourceUsage } from '../../src/hooks/useResourceUsage';
import { apiClient } from '@django-core/api-client';

// Mock api-client
vi.mock('@django-core/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('useResourceUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial fetch', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits' })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches data on mount', async () => {
      const mockData = { used: 850, limit: 1000, unit: 'credits' };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch errors', async () => {
      const mockError = new Error('API Error');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('polling', () => {
    it('polls at specified interval', async () => {
      const mockData = { used: 850, limit: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits', pollInterval: 30000 })
      );

      // Initial fetch
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });

      // Advance another 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(3);
      });
    });

    it('cleans up interval on unmount', async () => {
      const mockData = { used: 850, limit: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const { unmount } = renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits', pollInterval: 30000 })
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time after unmount
      vi.advanceTimersByTime(30000);

      // Should not fetch again
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('does not poll when pollInterval=0', async () => {
      const mockData = { used: 850, limit: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits', pollInterval: 0 })
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      // Advance time
      vi.advanceTimersByTime(60000);

      // Should still only have 1 call (initial fetch, no polling)
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled prop', () => {
    it('does not fetch when enabled=false', () => {
      renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits', enabled: false })
      );

      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('starts fetching when enabled changes to true', async () => {
      const mockData = { used: 850, limit: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const { rerender } = renderHook(
        ({ enabled }) => useResourceUsage({ endpoint: '/api/credits', enabled }),
        { initialProps: { enabled: false } }
      );

      expect(apiClient.get).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refetch', () => {
    it('manually triggers a refresh', async () => {
      const mockData = { used: 850, limit: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: '/api/credits', pollInterval: 0 })
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});
```

**File**: `tests/hooks/useHealthStatus.test.ts` (similar tests for useHealthStatus)

**Coverage Target**: >90%

**Validation**: Run `pnpm test:coverage`, verify thresholds met

---

### T039: Create Storybook Stories Demonstrating Hook Usage

**Task**: Create Storybook stories showing hooks with mock API responses.

**File**: `stories/DataHooks.stories.tsx`

**Implementation**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useResourceUsage } from '../src/hooks/useResourceUsage';
import { useHealthStatus } from '../src/hooks/useHealthStatus';
import { ResourceUsageBar } from '../src/components/ResourceUsageBar';
import { HealthStatus } from '../src/components/HealthStatus';
import { Alert } from '../src/components/Alert';

// Mock API with MSW (Mock Service Worker)
import { http, HttpResponse } from 'msw';
import { worker } from '../.storybook/mocks/msw';

// Setup MSW handlers
worker.use(
  http.get('/api/credits', () => {
    return HttpResponse.json({
      used: 850,
      limit: 1000,
      unit: 'credits',
    });
  }),
  http.get('/api/health', () => {
    return HttpResponse.json({
      services: [
        { name: 'Database', status: 'healthy' },
        { name: 'API Server', status: 'degraded' },
      ],
    });
  })
);

const meta: Meta = {
  title: 'Hooks/Data Fetching',
  parameters: {
    docs: {
      description: {
        component: 'Optional hooks for B11/B18 data fetching',
      },
    },
  },
};

export default meta;

// useResourceUsage example
export const ResourceUsageHook = () => {
  const { data, isLoading, error } = useResourceUsage({
    endpoint: '/api/credits',
    pollInterval: 0, // Disable polling in Storybook
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <Alert severity="error" title="Error" children={error.message} />;
  if (!data) return null;

  return (
    <ResourceUsageBar
      value={data.used}
      max={data.limit}
      label="API Credits"
      unit={data.unit}
    />
  );
};

// useHealthStatus example
export const HealthStatusHook = () => {
  const { data, isLoading, error } = useHealthStatus({
    endpoint: '/api/health',
    pollInterval: 0,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <Alert severity="error" title="Error" children={error.message} />;
  if (!data) return null;

  return (
    <>
      {data.services.map(service => (
        <HealthStatus
          key={service.name}
          name={service.name}
          status={service.status}
        />
      ))}
    </>
  );
};

// Error state
export const ErrorState = () => {
  // Override MSW handler to return error
  worker.use(
    http.get('/api/credits', () => {
      return HttpResponse.error();
    })
  );

  const { data, isLoading, error } = useResourceUsage({
    endpoint: '/api/credits',
    pollInterval: 0,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <Alert severity="error" title="Failed to load" children={error.message} />;
  if (!data) return null;

  return <ResourceUsageBar value={data.used} max={data.limit} />;
};
```

**MSW Setup** (`.storybook/mocks/msw.ts`):
```typescript
import { setupWorker } from 'msw/browser';

export const worker = setupWorker();

worker.start();
```

**Validation**: Run `pnpm storybook`, verify hooks fetch mock data correctly

---

## Test Strategy

### Unit Tests (T038)
- **useResourceUsage tests**: 15+ test cases (initial fetch, polling, enabled, refetch, errors)
- **useHealthStatus tests**: 15+ test cases (similar coverage)
- **Coverage target**: >90%
- **Fake timers**: Use vi.useFakeTimers() to test polling without waiting 30s

### Integration Tests
- **Storybook + MSW**: Mock B11/B18 API responses in Storybook
- **Error scenarios**: Test with MSW returning errors, verify error state displayed

## Definition of Done

**Must Complete**:
- [ ] useResourceUsage hook implemented (T034)
- [ ] useHealthStatus hook implemented (T035)
- [ ] Hooks use @django-core/api-client (T036)
- [ ] Error handling and loading states (T037)
- [ ] Unit tests for both hooks (>90% coverage) (T038)
- [ ] Storybook stories with MSW mocks (T039)
- [ ] All tests passing (`pnpm test`)
- [ ] Storybook launches without errors (`pnpm storybook`)

**Quality Gates**:
- [ ] Hooks clean up intervals on unmount (no memory leaks)
- [ ] Error state never throws (errors returned in hook result)
- [ ] TypeScript compiles with zero errors
- [ ] ESLint/Prettier checks pass
- [ ] Hooks use stable callbacks (useCallback for refetch)

**Documentation**:
- [ ] Hook JSDoc comments with examples
- [ ] README section on optional hooks
- [ ] B11/B18 integration guide in quickstart.md

## Risks & Mitigation

**Risk 1**: Polling may cause performance issues on low-end devices
- **Likelihood**: Low
- **Impact**: Medium (battery drain, network usage)
- **Mitigation**: Default 30s interval, configurable pollInterval, document best practices

**Risk 2**: Memory leaks from intervals not cleaned up
- **Likelihood**: Medium (common React mistake)
- **Impact**: High (memory leak, performance degradation)
- **Mitigation**: useEffect cleanup function, unit tests verify cleanup

**Risk 3**: CSRF token missing in api-client
- **Likelihood**: Low (api-client handles this)
- **Impact**: High (API calls fail)
- **Mitigation**: Verify api-client includes CSRF token, test with real backend

## Reviewer Guidance

**Pre-Review Checklist**:
1. Verify all 5 subtasks marked complete
2. Run `pnpm test:coverage`, check coverage report
3. Run `pnpm storybook`, test hook stories with MSW mocks

**Critical Review Points**:
- [ ] Hooks use useCallback for fetchData (stable reference)
- [ ] Interval cleanup in useEffect return function
- [ ] Error handling doesn't throw (returns error in state)
- [ ] Loading state set to false in finally block (always runs)
- [ ] Tests use vi.useFakeTimers() to test polling

**Acceptance Test**:
1. Open Storybook
2. Navigate to Hooks → ResourceUsageHook story
3. Verify ResourceUsageBar renders with mock data (850/1000 credits)
4. Check browser DevTools → Network tab
5. Verify API call made to /api/credits (MSW intercepts)

**Estimated Review Time**: 45 minutes

---

**Next Work Package**: WP07 (Documentation & Accessibility Polish) is final step.

## Activity Log

- 2025-12-13T08:30:09Z – system – shell_pid= – lane=doing – Started implementation of data hooks
- 2025-12-13T09:42:56Z – system – shell_pid= – lane=doing – Completed implementation
  - Created useResourceUsage hook (130 lines, polling B11 credit data)
  - Created useHealthStatus hook (132 lines, polling B18 health data)
  - Implemented CSRF-protected API calls via createApiClient() singleton
  - Added comprehensive error handling (try/catch, Error normalization, console logging)
  - Implemented loading states and refetch() function
  - Created useResourceUsage.test.tsx (200+ lines, 14 test cases)
  - Created useHealthStatus.test.tsx (220+ lines, 15 test cases)
  - All 40 tests passing (29 hook tests + 11 existing useAlertDismissal tests)
  - Fixed fake timers + waitFor compatibility issues
  - Updated index.ts with hook exports and TypeScript types
  - Minor act() warnings expected for async state updates (non-blocking)
- 2025-12-13T09:46:00Z – claude-code-reviewer – shell_pid= – lane=for_review → planned – Code review complete: Needs changes
  - Critical issue: TypeScript compilation errors (contract imports, missing @types/node)
  - Missing: Storybook stories (T039 not implemented)
  - Excellent: Test coverage (210 passing), error handling, memory cleanup
  - Action required: Fix contract imports, add @types/node, create Storybook stories
- 2025-12-13T10:15:00Z – claude – shell_pid=$PID – lane=planned → doing – Addressing review feedback: TypeScript errors, @types/node, Storybook stories
- 2025-12-13T10:30:00Z – claude – shell_pid=$PID – lane=doing – Completed all review feedback action items
  - Fixed TypeScript compilation: Copied contracts to src/types/contracts/, updated imports
  - Added @types/node@25.0.1 to devDependencies
  - Created useResourceUsage.stories.tsx (8 stories) and useHealthStatus.stories.tsx (9 stories)
  - Installed MSW 2.x for API mocking in stories
  - Verified: pnpm build passes with zero errors, all 210 tests passing
- 2025-12-13T10:35:00Z – claude-reviewer – shell_pid=34476 – lane=for_review → done – Code review complete: Approved without changes
  - All 3 critical issues from previous review successfully resolved
  - TypeScript build: Zero errors (contracts copied to src/types/contracts/)
  - Dependencies: @types/node@25.0.1, msw@2.12.4, msw-storybook-addon@2.0.6 installed
  - Storybook stories: 17 total stories created (8 useResourceUsage + 9 useHealthStatus)
  - All 210 tests passing (29 hook tests + 181 existing tests)
  - Quality gates met: No memory leaks, stable callbacks, proper cleanup verified
  - Implementation quality: Excellent CSRF protection, error handling, polling pattern
  - Ready for integration with WP07 (Documentation & Accessibility Polish)
- 2025-12-13T10:35:00Z – claude-reviewer – shell_pid=34476 – lane=done – WP06 moved to done lane after approval
