---
work_package_id: "WP02"
subtasks:
  - "T007"
  - "T008"
  - "T009"
  - "T010"
title: "Core Utilities & Test Helpers"
phase: "Phase 0 - Setup & Foundation"
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

# Work Package Prompt: WP02 – Core Utilities & Test Helpers

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

Create reusable utility functions, MSW mock handlers, and test provider wrappers to support all subsequent component and hook development.

**Success Criteria**:
- Validation utilities correctly validate Notification payloads per `data-model.md`
- Timestamp formatting matches user locale and timezone
- Notification mapper applies type mappings correctly (severity override, toast config)
- MSW handlers respond to all B13/B16/B17 endpoints with realistic data
- Test providers wrap F01/F02/F03 contexts correctly
- All utilities have 100% unit test coverage

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package structure, dependencies, type definitions)

**Related Documents**:
- [data-model.md](../data-model.md) - Validation rules and state transitions
- [contracts/notifications-api.yaml](../contracts/notifications-api.yaml) - API endpoint specifications
- [plan.md](../plan.md) - Technical context

**Key Constraints**:
- Use `date-fns` for date formatting (lightweight, tree-shakeable)
- MSW v2.x uses `http` API (not `rest` from v1.x)
- Validation must be defensive (malformed data → fallback to generic display)
- Test providers must allow context value overrides for edge case testing

---

## Subtasks & Detailed Guidance

### Subtask T007 – [P] Create validation and formatting utilities

**Purpose**: Provide validation for notification payloads and consistent timestamp formatting.

**Steps**:

1. Create `src/utils/validateNotification.ts`:
```typescript
import { Notification, NotificationSeverity } from '@/types';

const SEVERITY_VALUES: NotificationSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'];

export function validateNotification(data: any): Notification | null {
  try {
    // Required fields check
    if (!data.id || typeof data.id !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid id', data);
      return null;
    }

    if (!data.type || typeof data.type !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid type', data);
      return null;
    }

    if (!data.title || typeof data.title !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid title', data);
      return null;
    }

    if (!data.message || typeof data.message !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid message', data);
      return null;
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid timestamp', data);
      return null;
    }

    // Severity validation with fallback
    if (!SEVERITY_VALUES.includes(data.severity)) {
      console.warn('[F04] Invalid severity, defaulting to INFO', data);
      data.severity = 'INFO';
    }

    // Timestamp validation
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.warn('[F04] Invalid timestamp format', data);
      return null;
    }

    // Truncate title/message if too long
    if (data.title.length > 200) {
      data.title = data.title.substring(0, 197) + '...';
    }
    if (data.message.length > 1000) {
      data.message = data.message.substring(0, 997) + '...';
    }

    return data as Notification;
  } catch (error) {
    console.error('[F04] Notification validation error', error, data);
    return null;
  }
}
```

2. Create `src/utils/formatTimestamp.ts`:
```typescript
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function formatTimestamp(timestamp: string, mode: 'relative' | 'absolute' = 'relative'): string {
  try {
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    if (mode === 'relative') {
      // "5 minutes ago", "2 hours ago"
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Absolute format
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  } catch (error) {
    console.error('[F04] Timestamp formatting error', error);
    return timestamp;
  }
}
```

3. Create `src/utils/index.ts` barrel export:
```typescript
export { validateNotification } from './validateNotification';
export { formatTimestamp } from './formatTimestamp';
export { applyNotificationMapping } from './notificationMapper'; // Forward reference to T008
```

4. Write unit tests `src/utils/validateNotification.test.ts`:
```typescript
import { validateNotification } from './validateNotification';

describe('validateNotification', () => {
  const validNotification = {
    id: '123',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Job completed',
    message: 'Your job finished successfully',
    timestamp: '2025-12-11T14:30:00Z',
    read: false,
    org_id: 'org-123',
  };

  it('should validate a valid notification', () => {
    const result = validateNotification(validNotification);
    expect(result).toEqual(validNotification);
  });

  it('should return null for missing id', () => {
    const { id, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should default severity to INFO if invalid', () => {
    const result = validateNotification({ ...validNotification, severity: 'INVALID' });
    expect(result?.severity).toBe('INFO');
  });

  it('should truncate long titles', () => {
    const longTitle = 'a'.repeat(250);
    const result = validateNotification({ ...validNotification, title: longTitle });
    expect(result?.title).toHaveLength(200);
    expect(result?.title).toEndWith('...');
  });

  it('should return null for invalid timestamp', () => {
    const result = validateNotification({ ...validNotification, timestamp: 'invalid' });
    expect(result).toBeNull();
  });
});
```

5. Write unit tests `src/utils/formatTimestamp.test.ts`:
```typescript
import { formatTimestamp } from './formatTimestamp';
import { subHours, subDays } from 'date-fns';

describe('formatTimestamp', () => {
  it('should format recent timestamp as relative', () => {
    const fiveMinutesAgo = subHours(new Date(), 0.083).toISOString();
    const result = formatTimestamp(fiveMinutesAgo, 'relative');
    expect(result).toMatch(/minutes? ago/);
  });

  it('should format today timestamp as absolute', () => {
    const twoHoursAgo = subHours(new Date(), 2).toISOString();
    const result = formatTimestamp(twoHoursAgo, 'absolute');
    expect(result).toMatch(/^Today at \d{1,2}:\d{2} [AP]M$/);
  });

  it('should format yesterday timestamp', () => {
    const yesterday = subDays(new Date(), 1).toISOString();
    const result = formatTimestamp(yesterday, 'absolute');
    expect(result).toMatch(/^Yesterday at \d{1,2}:\d{2} [AP]M$/);
  });

  it('should handle invalid timestamp', () => {
    const result = formatTimestamp('invalid');
    expect(result).toBe('Invalid date');
  });
});
```

**Files**:
- `src/utils/validateNotification.ts`
- `src/utils/validateNotification.test.ts`
- `src/utils/formatTimestamp.ts`
- `src/utils/formatTimestamp.test.ts`
- `src/utils/index.ts`

**Parallel?**: Yes (independent of T008)

**Notes**:
- Use `console.warn` for validation failures (helps debugging)
- Prefix all console messages with `[F04]` for filtering
- date-fns tree-shakeable (only imports used functions)

---

### Subtask T008 – [P] Create notification mapper utility

**Purpose**: Apply type mappings to notification payloads, overriding defaults with custom configs.

**Steps**:

1. Create `src/utils/notificationMapper.ts`:
```typescript
import { Notification, NotificationTypeMapping, NotificationDisplayConfig } from '@/types';

export function applyNotificationMapping(
  notification: Notification,
  typeMappings: NotificationTypeMapping
): Notification & { displayConfig: NotificationDisplayConfig } {
  const defaultConfig: NotificationDisplayConfig = {
    toastVariant: 'info',
    toastDuration: 5000,
    showInToast: true,
    showInInbox: true,
  };

  const typeConfig = typeMappings[notification.type] || {};

  // Merge configs: custom type mapping overrides defaults
  const displayConfig: NotificationDisplayConfig = {
    ...defaultConfig,
    ...typeConfig,
  };

  // Override severity if specified in mapping
  if (displayConfig.severity && displayConfig.severity !== notification.severity) {
    notification.severity = displayConfig.severity;
  }

  return {
    ...notification,
    displayConfig,
  };
}

export function getToastVariant(severity: string): 'info' | 'success' | 'warning' | 'error' {
  const map: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'error',
  };
  return map[severity] || 'info';
}
```

2. Write unit tests `src/utils/notificationMapper.test.ts`:
```typescript
import { applyNotificationMapping, getToastVariant } from './notificationMapper';
import { Notification, NotificationTypeMapping } from '@/types';

describe('applyNotificationMapping', () => {
  const notification: Notification = {
    id: '123',
    type: 'job.completed',
    severity: 'INFO',
    title: 'Test',
    message: 'Test message',
    timestamp: '2025-12-11T14:30:00Z',
    read: false,
    org_id: 'org-123',
  };

  it('should apply default config when no mapping exists', () => {
    const result = applyNotificationMapping(notification, {});
    expect(result.displayConfig).toMatchObject({
      toastVariant: 'info',
      toastDuration: 5000,
      showInToast: true,
      showInInbox: true,
    });
  });

  it('should apply custom type mapping', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': {
        severity: 'SUCCESS',
        toastVariant: 'success',
        toastDuration: 3000,
        icon: 'CheckCircle',
      },
    };

    const result = applyNotificationMapping(notification, mappings);
    expect(result.severity).toBe('SUCCESS');
    expect(result.displayConfig.toastVariant).toBe('success');
    expect(result.displayConfig.toastDuration).toBe(3000);
    expect(result.displayConfig.icon).toBe('CheckCircle');
  });

  it('should override severity if specified in mapping', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': { severity: 'SUCCESS' },
    };
    const result = applyNotificationMapping(notification, mappings);
    expect(result.severity).toBe('SUCCESS');
  });
});

describe('getToastVariant', () => {
  it('should map severity to toast variant', () => {
    expect(getToastVariant('INFO')).toBe('info');
    expect(getToastVariant('SUCCESS')).toBe('success');
    expect(getToastVariant('WARNING')).toBe('warning');
    expect(getToastVariant('ERROR')).toBe('error');
    expect(getToastVariant('CRITICAL')).toBe('error');
  });

  it('should default to info for unknown severity', () => {
    expect(getToastVariant('UNKNOWN')).toBe('info');
  });
});
```

**Files**:
- `src/utils/notificationMapper.ts`
- `src/utils/notificationMapper.test.ts`

**Parallel?**: Yes (independent of T007)

---

### Subtask T009 – Create MSW mock handlers

**Purpose**: Provide realistic API mocks for all B13/B16/B17 endpoints used in tests.

**Steps**:

1. Update `__tests__/setup/msw-handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw';

// Mock data
const mockNotifications = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Data export completed',
    message: 'Your export of 1,234 records is ready for download.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    read: false,
    org_id: 'org-123',
    project_id: 'proj-456',
    metadata: { job_id: 'export-789', record_count: 1234 },
    action: {
      label: 'Download',
      type: 'navigate',
      target: '/exports/export-789',
    },
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'access.revoked',
    severity: 'WARNING',
    title: 'Access revoked',
    message: 'Your access to Project X has been revoked.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    org_id: 'org-123',
    project_id: 'proj-456',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    type: 'system.info',
    severity: 'INFO',
    title: 'System maintenance scheduled',
    message: 'System will be down for maintenance on Dec 15.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
    org_id: 'org-123',
  },
];

export const handlers = [
  // GET /api/notifications - List notifications
  http.get('/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const org = url.searchParams.get('org');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);

    let filtered = mockNotifications.filter(n => n.org_id === org);
    if (status === 'unread') filtered = filtered.filter(n => !n.read);
    if (status === 'read') filtered = filtered.filter(n => n.read);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = filtered.slice(start, end);

    return HttpResponse.json({
      results,
      count: filtered.length,
      next: end < filtered.length ? `/api/notifications?page=${page + 1}` : null,
      previous: page > 1 ? `/api/notifications?page=${page - 1}` : null,
    });
  }),

  // GET /api/notifications/:id - Get single notification
  http.get('/api/v1/notifications/:id', ({ params }) => {
    const notification = mockNotifications.find(n => n.id === params.id);
    if (!notification) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(notification);
  }),

  // PATCH /api/notifications/:id/read - Mark as read/unread
  http.patch('/api/v1/notifications/:id/read', async ({ request, params }) => {
    const body = await request.json() as { read: boolean };
    return HttpResponse.json({
      id: params.id,
      read: body.read,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /api/notifications/mark-all-read - Bulk mark as read
  http.post('/api/v1/notifications/mark-all-read', async ({ request }) => {
    const body = await request.json() as { org_id: string; project_id?: string };
    const unreadCount = mockNotifications.filter(
      n => n.org_id === body.org_id && !n.read
    ).length;

    return HttpResponse.json({
      updated_count: unreadCount,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/notifications/unread-count - Get unread count
  http.get('/api/v1/notifications/unread-count', ({ request }) => {
    const url = new URL(request.url);
    const org = url.searchParams.get('org');
    const count = mockNotifications.filter(n => n.org_id === org && !n.read).length;

    return HttpResponse.json({
      count,
      org_id: org,
      project_id: null,
      last_updated: new Date().toISOString(),
    });
  }),
];
```

**Files**:
- `__tests__/setup/msw-handlers.ts` (update existing file)

**Parallel?**: No (depends on T007 for validation)

**Notes**:
- MSW v2.x uses `http` not `rest`
- Handlers support query params (org, status, page, page_size)
- Mock data includes all edge cases (read/unread, with/without actions, different severities)

---

### Subtask T010 – Create test providers wrapper

**Purpose**: Wrap F01/F02/F03 contexts for consistent test setup.

**Steps**:

1. Create `__tests__/setup/test-providers.tsx`:
```typescript
import React from 'react';
import { AuthProvider } from '@django-core/auth';
import { ContextProvider } from '@django-core/context-switcher';

interface TestProvidersProps {
  children: React.ReactNode;
  authValue?: {
    user: { id: string; email: string; displayName: string };
    isAuthenticated: boolean;
  };
  contextValue?: {
    orgId: string;
    projectId?: string;
    organisationName: string;
    projectName?: string;
  };
}

export function TestProviders({
  children,
  authValue,
  contextValue
}: TestProvidersProps) {
  const defaultAuth = {
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
    isAuthenticated: true,
  };

  const defaultContext = {
    orgId: 'org-123',
    organisationName: 'Test Organisation',
  };

  return (
    <AuthProvider value={authValue || defaultAuth}>
      <ContextProvider value={contextValue || defaultContext}>
        {children}
      </ContextProvider>
    </AuthProvider>
  );
}
```

2. Create `__tests__/setup/test-utils.tsx`:
```typescript
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TestProviders } from './test-providers';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any;
  contextValue?: any;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { authValue, contextValue, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders authValue={authValue} contextValue={contextValue}>
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { renderWithProviders as render };
```

**Files**:
- `__tests__/setup/test-providers.tsx`
- `__tests__/setup/test-utils.tsx`

**Parallel?**: No (depends on WP01 for provider imports)

**Notes**:
- Test providers allow overriding auth/context values per test
- `renderWithProviders` wraps components automatically
- Re-export RTL utilities for convenience

---

## Test Strategy

**Unit Tests**:
- T007: `validateNotification.test.ts`, `formatTimestamp.test.ts` (100% coverage)
- T008: `notificationMapper.test.ts` (100% coverage)

**Validation**:
- Run `pnpm test` - all utility tests should pass
- Run `pnpm test -- --coverage` - verify 100% coverage for utils/

---

## Risks & Mitigations

**Risk**: Date/time formatting edge cases (DST, timezone boundaries)
**Mitigation**: Use date-fns which handles edge cases. Add specific tests for DST transitions if issues arise.

**Risk**: MSW handler complexity if API contract changes
**Mitigation**: Keep handlers in sync with `contracts/notifications-api.yaml`. Use TypeScript types from API contract if available.

**Risk**: Test providers not matching real provider APIs
**Mitigation**: Verify provider props match actual F01/F02/F03 APIs. Update when dependencies change.

---

## Definition of Done Checklist

- [ ] All utility functions created with TypeScript types
- [ ] All utility functions have unit tests with 100% coverage
- [ ] MSW handlers created for all API endpoints
- [ ] Test providers wrapper created
- [ ] Test utils created for convenient rendering
- [ ] All tests pass (`pnpm test`)
- [ ] Code linted without warnings (`pnpm run lint`)
- [ ] TypeScript compiles without errors (`pnpm run typecheck`)
- [ ] Files committed to feature branch
- [ ] `tasks.md` updated with WP02 completion status

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Validation utilities handle all edge cases from data-model.md
2. Timestamp formatting works for all time ranges
3. Notification mapper correctly applies type mappings
4. MSW handlers respond to all query params
5. Test providers allow value overrides
6. 100% test coverage for all utilities

**Reviewer should verify**:
- Run `pnpm test` - all tests pass
- Run `pnpm test -- --coverage` - check coverage report
- Check validation logic matches data-model.md spec
- Verify MSW handlers match contracts/notifications-api.yaml

---

## Activity Log

- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created via /spec-kitty.tasks
