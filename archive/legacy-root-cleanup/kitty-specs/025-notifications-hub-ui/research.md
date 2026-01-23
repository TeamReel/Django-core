# Research: Notifications Hub UI (F04)
*Path: [kitty-specs/025-notifications-hub-ui/research.md](kitty-specs/025-notifications-hub-ui/research.md)*

**Date**: 2025-12-11 | **Feature**: F04 Notifications Hub UI | **Phase**: 0

## Research Questions & Findings

### 1. Real-Time Delivery Strategy

**Decision**: Polling-first with RealtimeAdapter extension point

**Rationale**:
- Backend real-time capabilities (WebSocket vs SSE) not yet finalized with B16/B17 teams
- Polling is simpler to implement, test, and debug
- Configurable 30-60s interval provides acceptable latency for most notification scenarios
- Real-time can be added cleanly via adapter interface without breaking changes
- Reduces initial implementation risk and coordination dependencies

**Alternatives Considered**:
- **WebSocket-first**: Rejected due to backend protocol uncertainty and added complexity
- **SSE-first**: Rejected for same reasons as WebSocket
- **Both WebSocket + SSE**: Over-engineering for V1, deferred to future iteration

**Implementation Notes**:
- Define `RealtimeAdapter` interface but leave unimplemented/stubbed
- Provider checks for adapter presence, falls back to polling if absent
- Polling respects F02 auth state and F03 context switches
- Manual refresh action available for users needing immediate updates

---

### 2. Presentation Mode (Panel vs Full-Page)

**Decision**: Slide-out panel only for V1

**Rationale**:
- Covers most common use cases (quick access from any page)
- Integrates cleanly with F06 shell/header without routing complexity
- Responsive behavior (full-screen sheet on mobile) handles small screens
- State management designed to support full-page route addition later
- Reduces V1 scope while maintaining extensibility

**Alternatives Considered**:
- **Full-page route only**: Rejected as less convenient for quick checks, requires navigation
- **Both panel + full-page**: Over-scope for V1, can add route later reusing same hooks/context
- **Headless only**: Too abstract for V1, panel provides complete out-of-box experience

**Implementation Notes**:
- Panel component uses F01 Drawer/Modal primitives
- Badge click in F06 header toggles panel open/closed
- Panel maintains own open/close state, syncs with URL hash if desired
- State hooks (`useNotifications`, etc.) designed for reuse in future full-page view

---

### 3. Notification Type Mapping Configuration

**Decision**: Hybrid - defaults in F04, overridable via provider

**Rationale**:
- Provides sensible defaults for common notification types (job.completed, access.revoked, system.error)
- Allows downstream products to customize without modifying F04 internals
- Configuration lives in frontend TypeScript, version-controlled with code
- No backend config endpoint needed in V1, reduces backend coordination
- Extension pattern matches F03's approach (defaults + customization)

**Alternatives Considered**:
- **Static config only**: Rejected as insufficiently flexible for product-specific needs
- **Runtime config only**: Rejected as requires duplication across consuming apps
- **Backend-driven config**: Deferred to future iteration, adds API complexity

**Implementation Notes**:
```typescript
// Default mappings in F04
export const defaultNotificationMappings: NotificationTypeMapping = {
  'job.completed': { severity: 'SUCCESS', toastDuration: 5000, showInInbox: true },
  'access.revoked': { severity: 'WARNING', toastDuration: 10000, showInInbox: true },
  'system.error': { severity: 'ERROR', toastDuration: null, showInInbox: true },
  // ... more defaults
};

// Provider accepts overrides
<NotificationsProvider
  notificationMappings={{
    ...customProductMappings, // Product-specific overrides
  }}
>
```

---

### 4. State Management Approach

**Decision**: React Context + custom hooks (no external state library)

**Rationale**:
- Consistent with F02 (auth) and F03 (context switcher) patterns
- Keeps bundle size small (no Redux/Zustand/TanStack Query)
- Simple mental model for contributors
- Manual caching sufficient for polling-based refresh
- Cross-tab sync via lightweight localStorage/BroadcastChannel events

**Alternatives Considered**:
- **TanStack Query**: Rejected as over-engineered for simple polling + manual cache invalidation
- **Zustand**: Rejected to maintain consistency with existing frontend packages
- **Redux Toolkit**: Rejected as too heavyweight for this feature's state needs

**Implementation Notes**:
- `NotificationsProvider` wraps React Context + useReducer
- Internal state: `{ notifications: [], unreadCount: 0, loading: boolean, error: Error | null }`
- Hooks: `useNotifications()`, `useUnreadCount()`, `useNotificationsActions()`
- Actions trigger reducer updates + API calls via `@django-core/api-client`
- Poll interval managed by `usePolling` hook with cleanup on unmount
- Context switches from F03 trigger cache invalidation + refetch

---

### 5. Testing Strategy

**Decision**: Unit + integration tests, no E2E in V1

**Rationale**:
- 85%+ coverage achievable with Jest + React Testing Library + MSW
- Integration tests provide high confidence for key workflows without E2E overhead
- Real-time scenarios deferred, so E2E value limited in V1
- MSW provides deterministic API mocking for reliable tests
- Matches testing patterns from F02/F03

**Alternatives Considered**:
- **Unit tests only**: Insufficient for validating cross-component workflows
- **E2E with Playwright**: Over-investment for V1, deferred until real-time support added
- **Integration-focused only**: Need unit tests for utility functions and hooks in isolation

**Test Coverage Plan**:

**Unit Tests** (broad coverage):
- Components: ToastHost, Toast, NotificationPanel, NotificationList, NotificationItem, UnreadBadge, Skeleton
- Hooks: useNotifications, useUnreadCount, useNotificationsActions, usePolling
- Utilities: notificationMapper, toastPositioning, severity timing logic
- Reducer: notificationsReducer state transitions

**Integration Tests** (behavior-focused):
- Toast flow: API notification → toast appears → auto-dismiss by severity → click navigates + marks read
- Inbox interactions: skeleton → loaded list → empty state, mark read/unread with optimistic update + rollback
- Polling refresh: new notification appears after poll cycle
- Context switching: F03 org/project change updates notification list + unread count
- Filters: unread-only, type filtering

**MSW Handlers**:
- `GET /api/notifications` - paginated list with org/project scoping
- `PATCH /api/notifications/:id/read` - mark single notification read
- `POST /api/notifications/mark-all-read` - bulk mark as read
- Error scenarios: 401, 403, 404, 500 responses

---

## Best Practices Research

### React Context + Hooks Patterns

**Source**: F02 (auth) and F03 (context switcher) implementations

**Key Patterns**:
- Provider wraps Context.Provider with internal useReducer for state
- Separate hooks for read (`useNotifications`, `useUnreadCount`) vs write (`useNotificationsActions`)
- Actions return promises for async feedback
- Error boundaries at provider level catch render errors

**Applied to F04**:
```typescript
// Provider structure
export function NotificationsProvider({ children, config }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const { user } = useAuth(); // F02
  const { orgId, projectId } = useContext(); // F03

  // Polling effect
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications(orgId, projectId).then(data => {
        dispatch({ type: 'NOTIFICATIONS_LOADED', payload: data });
      });
    }, config.pollInterval || 30000);
    return () => clearInterval(interval);
  }, [user, orgId, projectId]);

  return (
    <NotificationsContext.Provider value={{ state, dispatch }}>
      {children}
    </NotificationsContext.Provider>
  );
}
```

---

### Optimistic UI Updates

**Source**: Industry best practices (Tanstack Query patterns, React docs)

**Pattern**:
```typescript
async function markAsRead(notificationId: string) {
  // 1. Optimistically update UI
  const previousState = state.notifications;
  dispatch({ type: 'MARK_READ_OPTIMISTIC', payload: notificationId });

  try {
    // 2. API call in background
    await apiClient.patch(`/notifications/${notificationId}/read`);
    // 3. Success - keep optimistic state
  } catch (error) {
    // 4. Failure - revert + show error toast
    dispatch({ type: 'MARK_READ_FAILED', payload: previousState });
    showErrorToast('Could not mark notification as read');
    logError(error);
  }
}
```

**Applied to F04**: All mark-as-read operations (single, bulk, click-toast) use this pattern per clarification Q3.

---

### Virtual Scrolling for Large Lists

**Source**: react-window and @tanstack/react-virtual documentation

**Decision**: Start with @tanstack/react-virtual

**Rationale**:
- More flexible than react-window
- Better TypeScript support
- Handles variable row heights (notifications may vary in size)
- Active maintenance

**Implementation Approach**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function NotificationList({ notifications }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // estimated notification item height
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <NotificationItem
            key={virtualItem.key}
            notification={notifications[virtualItem.index]}
            style={{ transform: `translateY(${virtualItem.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Cross-Tab State Synchronization

**Source**: Modern browser APIs (BroadcastChannel, localStorage events)

**Decision**: BroadcastChannel API with localStorage fallback

**Rationale**:
- BroadcastChannel more efficient than localStorage polling
- Falls back to localStorage events for older browsers
- Lightweight implementation, optional feature

**Implementation Approach**:
```typescript
// In provider
useEffect(() => {
  const channel = new BroadcastChannel('notifications-sync');

  channel.onmessage = (event) => {
    if (event.data.type === 'NOTIFICATION_READ') {
      dispatch({ type: 'SYNC_READ_STATE', payload: event.data.notificationId });
    }
  };

  return () => channel.close();
}, []);

// When marking as read
function markAsRead(id: string) {
  // ... optimistic update + API call ...
  channel.postMessage({ type: 'NOTIFICATION_READ', notificationId: id });
}
```

---

## Integration Points Research

### F01 (Design System) Components Needed

**Required Components**:
- **Toast/Snackbar**: For notification toasts with severity variants
- **Badge**: For unread counter display
- **Drawer/Modal**: For slide-out panel
- **List**: For inbox notification list
- **Skeleton**: For loading state (3-5 skeleton rows)
- **Button**: For actions (mark read, close, etc.)
- **Icon**: For notification types, close buttons
- **Typography**: For notification titles, messages, timestamps
- **Spinner**: For inline loading states (optional)

**Verification Needed**: Confirm F01 includes all these components. If Skeleton missing, can implement simple grey blocks using F01 spacing/color tokens.

---

### F02 (Authentication) Integration

**Required Context**:
- `useAuth()` hook provides current user
- User object includes: id, email, display name (for personalization if needed)
- Authentication state changes trigger notification clear/refetch

**Integration Pattern**:
```typescript
function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear notifications when user logs out
      dispatch({ type: 'CLEAR_ALL' });
    }
  }, [isAuthenticated]);

  // Only poll when authenticated
  const shouldPoll = isAuthenticated && user;
}
```

---

### F03 (Multi-Tenancy Context) Integration

**Required Context**:
- `useContext()` hook provides: { orgId, projectId, organisationName, projectName }
- Context switches trigger notification list refetch with new scope

**Integration Pattern**:
```typescript
function NotificationsProvider({ children }) {
  const { orgId, projectId } = useContext();

  useEffect(() => {
    // Refetch when context changes
    fetchNotifications(orgId, projectId);
  }, [orgId, projectId]);
}
```

**API Request Pattern**:
```
GET /api/notifications?org={orgId}&project={projectId}&status=unread&page=1&page_size=20
```

---

### F06 (Layouts) Integration

**Mount Points Needed**:
- Header: Icon + UnreadBadge component
- Shell: Slot for NotificationPanel (drawer overlay)

**Integration Pattern**:
```typescript
// In F06 header component
import { UnreadBadge } from '@django-core/notifications-hub';

function AppHeader() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <header>
      <button onClick={() => setIsPanelOpen(!isPanelOpen)}>
        <NotificationIcon />
        <UnreadBadge />
      </button>

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </header>
  );
}
```

---

### B13/B16/B17 API Integration

**Expected Endpoints** (via B13 API foundation):

```
GET /api/notifications
  Query params: org, project, status (unread/read/all), type, page, page_size
  Response: { results: Notification[], count: number, next: string | null }

PATCH /api/notifications/:id/read
  Body: { read: boolean }
  Response: { id, read, updated_at }

POST /api/notifications/mark-all-read
  Body: { org, project, filters?: { type, status } }
  Response: { updated_count: number }
```

**Notification Payload Structure**:
```typescript
interface Notification {
  id: string;
  type: string; // e.g., "job.completed", "access.revoked"
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string; // ISO 8601 UTC
  read: boolean;
  org_id: string;
  project_id?: string;
  metadata?: Record<string, any>; // Action targets, related resource IDs
  action?: {
    label: string;
    type: 'navigate' | 'api';
    target: string; // URL or API endpoint
  };
}
```

---

## Technical Decisions Summary

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| **Real-Time Strategy** | Polling-first, RealtimeAdapter stubbed | Backend protocol uncertain, polling simpler, real-time deferred |
| **Presentation** | Slide-out panel only | Covers common cases, less routing complexity, extensible to full-page later |
| **Type Mapping** | Hybrid: defaults + overrides via provider | Balance of convenience and customization without backend config |
| **State Management** | React Context + hooks, manual caching | Consistent with F02/F03, lightweight, sufficient for polling |
| **Testing** | Unit + integration (Jest + RTL + MSW) | 85%+ coverage achievable, no E2E overhead in V1 |
| **Virtualization** | @tanstack/react-virtual | Better TypeScript support, handles variable heights |
| **Cross-Tab Sync** | BroadcastChannel + localStorage fallback | Efficient, lightweight, optional feature |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| F01 missing Skeleton component | Medium | Implement simple grey blocks using F01 tokens if needed |
| B16/B17 API schema mismatch | High | Validate payload structure early with backend team, provide fallback mapping |
| Polling performance at scale | Medium | Configurable interval, pagination, consider real-time in future |
| Cross-browser compatibility | Low | F01 handles polyfills, target modern browsers only |
| F06 integration complexity | Medium | Work with F06 maintainers on mount point API, provide example integration |

---

## Next Steps (Phase 1)

1. Create `data-model.md` documenting notification entity structure and state machine
2. Generate API contracts in `contracts/` directory (OpenAPI specs for expected B13 endpoints)
3. Create `quickstart.md` with setup instructions for consuming apps
4. Update `.github/copilot-instructions.md` with F04 technical details
