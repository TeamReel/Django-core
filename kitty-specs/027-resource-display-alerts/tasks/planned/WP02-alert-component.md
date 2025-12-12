# WP02: Alert Component & localStorage Integration

---
**work_package_id**: WP02
**status**: planned
**priority**: P1 (Core functionality)
**user_story**: US2 - Dismiss and Hide Alerts
**subtasks**: [T009, T010, T011, T012, T013, T014]
**dependencies**: WP01 (package scaffold must exist)
**parallel**: Can run in parallel with WP03, WP04 after WP01
**history**:
  - 2025-12-12: Created task prompt from Phase 3 breakdown

---

## Objective

Implement dismissible Alert component by wrapping F01's Alert with localStorage-backed persistence. Create `useAlertDismissal` hook to manage alert visibility preferences, including "never show again" functionality. Ensure graceful degradation when localStorage is unavailable.

## Context

**Feature**: 027-resource-display-alerts (F05 Resource Display & Alerts)
**User Story**: US2 - Dismiss and Hide Alerts
**Related Documents**:
- [spec.md](../../spec.md) - See US2 acceptance scenarios
- [plan.md](../../plan.md) - See Component Architecture section
- [research.md](../../research.md) - See localStorage persistence research

**Key Requirements** (from spec.md):
- FR-005: Users can dismiss alerts temporarily or permanently
- FR-006a: localStorage key format: `django_core_alert_${alertId}`
- FR-007: Alert state persists across browser sessions (unless session-only mode)
- Edge Case: Handle localStorage unavailable (private browsing mode)

**Technical Context**:
- F01 Alert component already handles visual presentation and ARIA attributes
- This work package adds persistence layer on top
- localStorage quota is sufficient (<1KB per alert preference)

**Success Criteria**:
- User dismisses alert → it disappears and localStorage is updated
- User dismisses with "never show again" → alert stays hidden after page reload
- If localStorage throws error → alert still dismissible (no persistence, but no crash)

## Detailed Guidance

### T009: Re-export F01 Alert Component

**Task**: Create Alert component module that re-exports F01's Alert for F05 consumers.

**Steps**:
1. Create `src/components/Alert/index.ts`:
```typescript
// Re-export F01 Alert component
export { Alert } from '@django-core/design-system';
export type { AlertProps } from '@django-core/design-system';
```

2. Update `src/index.ts`:
```typescript
export { Alert } from './components/Alert';
export type { AlertProps } from './components/Alert';
```

**Rationale**: F01 already implements Alert with correct ARIA attributes and styling. F05 just needs to add dismissal logic via hooks, not rebuild the component.

**Validation**: Import Alert in test file, verify it renders correctly

---

### T010: Create localStorage Utility Module

**Task**: Implement type-safe localStorage wrapper with error handling.

**File**: `src/utils/localStorage.ts`

**Implementation**:
```typescript
/**
 * Type-safe localStorage utilities with error handling
 */

export class LocalStorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

/**
 * Check if localStorage is available (may be disabled in private browsing)
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get item from localStorage with type safety
 */
export const getItem = <T = string>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    console.warn('[F05] localStorage unavailable, returning null');
    return null;
  }

  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;

    // Try parsing as JSON, fall back to string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    console.error(`[F05] Failed to get localStorage key "${key}":`, error);
    return null;
  }
};

/**
 * Set item in localStorage with type safety
 */
export const setItem = <T>(key: string, value: T): boolean => {
  if (!isLocalStorageAvailable()) {
    console.warn('[F05] localStorage unavailable, skipping write');
    return false;
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('[F05] localStorage quota exceeded');
    } else {
      console.error(`[F05] Failed to set localStorage key "${key}":`, error);
    }
    return false;
  }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[F05] Failed to remove localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Generate storage key for alert dismissal
 */
export const getAlertStorageKey = (alertId: string): string => {
  return `django_core_alert_${alertId}`;
};
```

**Design Decisions**:
- Return null/false on errors (don't throw) → prevents crashes
- Log warnings to console for debugging
- Support both string and JSON values (auto-serialize objects)
- QuotaExceededError handling (though unlikely with <1KB data)

**Validation**: Write unit tests for all functions (see T012)

---

### T011: Implement useAlertDismissal Hook

**Task**: Create React hook to manage alert visibility with localStorage persistence.

**File**: `src/hooks/useAlertDismissal.ts`

**Implementation**:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { getItem, setItem, removeItem, getAlertStorageKey } from '../utils/localStorage';

export interface AlertDismissalState {
  isDismissed: boolean;
  isPermanentlyDismissed: boolean;
}

export interface UseAlertDismissalOptions {
  /**
   * Unique identifier for this alert (used as localStorage key suffix)
   */
  alertId: string;

  /**
   * Default visibility state (if no localStorage data found)
   * @default false
   */
  defaultDismissed?: boolean;
}

export interface UseAlertDismissalResult {
  /**
   * Current dismissal state
   */
  state: AlertDismissalState;

  /**
   * Dismiss alert temporarily (until page reload)
   */
  dismiss: () => void;

  /**
   * Dismiss alert permanently (persisted to localStorage)
   */
  dismissForever: () => void;

  /**
   * Reset dismissal state (show alert again)
   */
  reset: () => void;

  /**
   * Whether alert should be visible
   */
  isVisible: boolean;
}

/**
 * Hook to manage alert dismissal with localStorage persistence
 *
 * @example
 * const { isVisible, dismiss, dismissForever } = useAlertDismissal({ alertId: 'low-credits-warning' });
 *
 * if (!isVisible) return null;
 *
 * return (
 *   <Alert
 *     title="Low Credits"
 *     onClose={dismiss}
 *     actions={<Button onClick={dismissForever}>Never show again</Button>}
 *   />
 * );
 */
export const useAlertDismissal = ({
  alertId,
  defaultDismissed = false,
}: UseAlertDismissalOptions): UseAlertDismissalResult => {
  const storageKey = getAlertStorageKey(alertId);

  // Initialize from localStorage
  const [state, setState] = useState<AlertDismissalState>(() => {
    const stored = getItem<{ permanent: boolean }>(storageKey);

    if (stored && stored.permanent) {
      return { isDismissed: true, isPermanentlyDismissed: true };
    }

    return {
      isDismissed: defaultDismissed,
      isPermanentlyDismissed: false,
    };
  });

  // Temporary dismiss (session only)
  const dismiss = useCallback(() => {
    setState({ isDismissed: true, isPermanentlyDismissed: false });
  }, []);

  // Permanent dismiss (persisted to localStorage)
  const dismissForever = useCallback(() => {
    setState({ isDismissed: true, isPermanentlyDismissed: true });
    setItem(storageKey, { permanent: true });
  }, [storageKey]);

  // Reset (show alert again)
  const reset = useCallback(() => {
    setState({ isDismissed: false, isPermanentlyDismissed: false });
    removeItem(storageKey);
  }, [storageKey]);

  const isVisible = !state.isDismissed;

  return {
    state,
    dismiss,
    dismissForever,
    reset,
    isVisible,
  };
};
```

**Design Decisions**:
- Separate `dismiss()` (temporary) vs `dismissForever()` (persistent) actions
- `isVisible` convenience property (common use case: early return if hidden)
- Store minimal data: `{ permanent: true }` (vs storing full alert state)
- Reset function for testing/admin use cases

**Validation**: Write unit tests with mocked localStorage (see T012)

---

### T012: Write Unit Tests for localStorage Utilities

**Task**: Comprehensive unit tests for localStorage.ts and useAlertDismissal.ts.

**File**: `tests/utils/localStorage.test.ts`

**Test Cases**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isLocalStorageAvailable,
  getItem,
  setItem,
  removeItem,
  getAlertStorageKey,
} from '../../src/utils/localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isLocalStorageAvailable', () => {
    it('returns true when localStorage works', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('returns false when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('getItem', () => {
    it('returns null for non-existent key', () => {
      expect(getItem('nonexistent')).toBeNull();
    });

    it('retrieves string value', () => {
      localStorage.setItem('test', 'value');
      expect(getItem('test')).toBe('value');
    });

    it('parses JSON value', () => {
      localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
      expect(getItem<{ foo: string }>('test')).toEqual({ foo: 'bar' });
    });

    it('returns null when localStorage unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      expect(getItem('test')).toBeNull();
    });
  });

  describe('setItem', () => {
    it('stores string value', () => {
      expect(setItem('test', 'value')).toBe(true);
      expect(localStorage.getItem('test')).toBe('value');
    });

    it('serializes object value', () => {
      expect(setItem('test', { foo: 'bar' })).toBe(true);
      expect(localStorage.getItem('test')).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('returns false on quota exceeded', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      expect(setItem('test', 'value')).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('removes existing key', () => {
      localStorage.setItem('test', 'value');
      expect(removeItem('test')).toBe(true);
      expect(localStorage.getItem('test')).toBeNull();
    });

    it('returns false when localStorage unavailable', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      expect(removeItem('test')).toBe(false);
    });
  });

  describe('getAlertStorageKey', () => {
    it('generates correct key format', () => {
      expect(getAlertStorageKey('low-credits')).toBe('django_core_alert_low-credits');
    });
  });
});
```

**File**: `tests/hooks/useAlertDismissal.test.tsx`

**Test Cases**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertDismissal } from '../../src/hooks/useAlertDismissal';

describe('useAlertDismissal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with visible alert by default', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    expect(result.current.isVisible).toBe(true);
    expect(result.current.state.isDismissed).toBe(false);
  });

  it('temporary dismiss hides alert', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(false);
  });

  it('permanent dismiss persists to localStorage', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(true);
    expect(localStorage.getItem('django_core_alert_test-alert')).toBeTruthy();
  });

  it('loads permanent dismissal from localStorage', () => {
    localStorage.setItem(
      'django_core_alert_test-alert',
      JSON.stringify({ permanent: true })
    );

    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(true);
  });

  it('reset makes alert visible again', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.isVisible).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isVisible).toBe(true);
    expect(localStorage.getItem('django_core_alert_test-alert')).toBeNull();
  });

  it('handles localStorage unavailable gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage disabled');
    });

    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    // Should still work, just no persistence
    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
  });
});
```

**Coverage Target**: >90% for both files

**Validation**: Run `pnpm test:coverage`, verify thresholds met

---

### T013: Write Integration Test for Alert Dismissal Flow

**Task**: End-to-end test of alert dismissal with localStorage persistence.

**File**: `tests/integration/AlertDismissal.test.tsx`

**Test Scenario**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Alert } from '../../src/components/Alert';
import { useAlertDismissal } from '../../src/hooks/useAlertDismissal';

// Test component that combines Alert + useAlertDismissal
const DismissibleAlert = ({ alertId }: { alertId: string }) => {
  const { isVisible, dismiss, dismissForever } = useAlertDismissal({ alertId });

  if (!isVisible) return null;

  return (
    <Alert
      title="Test Alert"
      severity="warning"
      onClose={dismiss}
      actions={
        <button onClick={dismissForever}>Never show again</button>
      }
    />
  );
};

describe('Alert Dismissal Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('temporary dismiss hides alert until reload', async () => {
    const { rerender } = render(<DismissibleAlert alertId="test" />);

    // Alert is visible
    expect(screen.getByText('Test Alert')).toBeInTheDocument();

    // Click close button
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    // Alert disappears
    await waitFor(() => {
      expect(screen.queryByText('Test Alert')).not.toBeInTheDocument();
    });

    // Reload component (simulates page refresh)
    rerender(<DismissibleAlert alertId="test" />);

    // Alert reappears (no localStorage)
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
  });

  it('permanent dismiss persists across reload', async () => {
    const { rerender, unmount } = render(<DismissibleAlert alertId="test" />);

    // Click "Never show again"
    fireEvent.click(screen.getByText('Never show again'));

    // Alert disappears
    await waitFor(() => {
      expect(screen.queryByText('Test Alert')).not.toBeInTheDocument();
    });

    // Unmount and remount (simulates page navigation)
    unmount();
    render(<DismissibleAlert alertId="test" />);

    // Alert still hidden (localStorage persists)
    expect(screen.queryByText('Test Alert')).not.toBeInTheDocument();
  });
});
```

**Validation**: Integration test passes, demonstrating correct localStorage behavior

---

### T014: Create Storybook Stories

**Task**: Create comprehensive Storybook stories for Alert component with dismissal.

**File**: `stories/Alert.stories.tsx`

**Stories**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../src/components/Alert';
import { useAlertDismissal } from '../src/hooks/useAlertDismissal';
import { useState } from 'react';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component: 'Alert component with localStorage-backed dismissal (wraps F01 Alert)',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

// Basic alert (F01 component)
export const Basic: Story = {
  args: {
    title: 'Low Credits',
    severity: 'warning',
    children: 'You have 150 credits remaining. Upgrade to add more.',
  },
};

// With dismissal hook (temporary)
export const Dismissible = () => {
  const { isVisible, dismiss } = useAlertDismissal({ alertId: 'dismissible-demo' });

  if (!isVisible) {
    return <p>Alert dismissed (reload page to see it again)</p>;
  }

  return (
    <Alert
      title="Temporary Dismissal"
      severity="info"
      onClose={dismiss}
    >
      Click the close button to hide this alert temporarily.
    </Alert>
  );
};

// With "never show again"
export const PermanentlyDismissible = () => {
  const { isVisible, dismiss, dismissForever, reset } = useAlertDismissal({
    alertId: 'permanent-demo',
  });

  if (!isVisible) {
    return (
      <div>
        <p>Alert permanently dismissed</p>
        <button onClick={reset}>Reset (show alert again)</button>
      </div>
    );
  }

  return (
    <Alert
      title="Permanent Dismissal"
      severity="warning"
      onClose={dismiss}
      actions={
        <button onClick={dismissForever}>Never show again</button>
      }
    >
      Click "Never show again" to permanently hide this alert (stored in localStorage).
    </Alert>
  );
};

// localStorage unavailable simulation
export const GracefulDegradation = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return <p>Alert dismissed (no persistence due to localStorage unavailable)</p>;
  }

  return (
    <Alert
      title="localStorage Unavailable"
      severity="error"
      onClose={() => setDismissed(true)}
    >
      This alert still works even if localStorage is unavailable (graceful degradation).
    </Alert>
  );
};
```

**Validation**: Run `pnpm storybook`, verify all stories render correctly

---

## Test Strategy

### Unit Tests (T012)
- **localStorage.ts**: 15+ test cases covering all functions
- **useAlertDismissal.ts**: 10+ test cases covering hook lifecycle
- **Coverage target**: >90% for both files
- **Edge cases**: localStorage disabled, QuotaExceededError, JSON parse errors

### Integration Tests (T013)
- **AlertDismissal.test.tsx**: Full flow from render → dismiss → persist → reload
- **Test scenarios**: Temporary dismiss, permanent dismiss, localStorage persistence

### Visual Tests (T014)
- **Storybook stories**: 4+ stories showing different dismissal patterns
- **Chromatic**: Visual regression snapshots for all stories
- **Manual testing**: Verify dismiss buttons work in Storybook

## Definition of Done

**Must Complete**:
- [ ] Alert component re-exported from F01 (T009)
- [ ] localStorage utilities implemented with error handling (T010)
- [ ] useAlertDismissal hook implemented (T011)
- [ ] Unit tests for localStorage utilities (>90% coverage) (T012)
- [ ] Unit tests for useAlertDismissal hook (>90% coverage) (T012)
- [ ] Integration test for alert dismissal flow (T013)
- [ ] Storybook stories created (4+ stories) (T014)
- [ ] All tests passing (`pnpm test`)
- [ ] Storybook launches without errors (`pnpm storybook`)

**Quality Gates**:
- [ ] localStorage unavailable handled gracefully (no crashes)
- [ ] QuotaExceededError handled (logged, not thrown)
- [ ] TypeScript compiles with zero errors
- [ ] ESLint/Prettier checks pass

**Documentation**:
- [ ] useAlertDismissal hook JSDoc comments complete
- [ ] localStorage utilities JSDoc comments complete
- [ ] Storybook stories have descriptions

## Risks & Mitigation

**Risk 1**: localStorage unavailable in private browsing
- **Likelihood**: Medium (Safari private mode blocks localStorage)
- **Impact**: Medium (alerts still dismissible, just no persistence)
- **Mitigation**: isLocalStorageAvailable() check + console warnings + tests

**Risk 2**: Cross-browser localStorage differences
- **Likelihood**: Low
- **Impact**: Low (standard API)
- **Mitigation**: Standard API usage, no browser-specific code

**Risk 3**: localStorage quota exceeded
- **Likelihood**: Very low (<1KB per alert)
- **Impact**: Low (dismissal still works, just no persistence)
- **Mitigation**: QuotaExceededError catch, console error

## Reviewer Guidance

**Pre-Review Checklist**:
1. Verify all 6 subtasks marked complete
2. Run `pnpm test:coverage`, check coverage report
3. Run `pnpm storybook`, test all 4 stories interactively

**Critical Review Points**:
- [ ] localStorage.ts: Error handling doesn't throw exceptions
- [ ] useAlertDismissal: Hook returns stable references (useCallback)
- [ ] Unit tests: localStorage is properly mocked in tests/setup.ts
- [ ] Integration test: Simulates component unmount/remount correctly
- [ ] Storybook stories: "Never show again" persists across page reload

**Acceptance Test**:
1. Open Storybook
2. Navigate to PermanentlyDismissible story
3. Click "Never show again"
4. Reload page
5. Verify alert stays hidden

**Estimated Review Time**: 45 minutes

---

**Next Work Package**: WP03 (Resource Usage Bar) can proceed in parallel.
