# Data Model: Notifications Hub UI (F04)
*Path: [kitty-specs/025-notifications-hub-ui/data-model.md](kitty-specs/025-notifications-hub-ui/data-model.md)*

**Date**: 2025-12-11 | **Feature**: F04 Notifications Hub UI | **Phase**: 1

## Overview

F04 is a frontend-only package that consumes notification data from B13/B16/B17 APIs. It does not persist data directly but maintains client-side state for UI rendering and optimistic updates. This document describes the TypeScript interfaces and state structures used within F04.

---

## Core Entities

### Notification

Represents a single notification event received from the backend API.

```typescript
interface Notification {
  // Identity
  id: string; // UUID from backend

  // Classification
  type: string; // e.g., "job.completed", "access.revoked", "system.error"
  severity: NotificationSeverity;
  category?: string; // Optional grouping (e.g., "system", "user", "project")

  // Content
  title: string; // Short summary (e.g., "Job completed successfully")
  message: string; // Detailed message body
  timestamp: string; // ISO 8601 UTC (e.g., "2025-12-11T14:30:00Z")

  // State
  read: boolean; // Has user acknowledged this notification?

  // Context
  org_id: string; // Organisation scope
  project_id?: string | null; // Project scope (null for org-level notifications)

  // Metadata
  metadata?: Record<string, any>; // Arbitrary data (resource IDs, user refs, etc.)

  // Actions
  action?: NotificationAction; // Optional CTA button
}

type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface NotificationAction {
  label: string; // Button text (e.g., "View Details", "Open Project")
  type: 'navigate' | 'api'; // Action handler type
  target: string; // URL path (for navigate) or API endpoint (for api)
  method?: 'GET' | 'POST' | 'PATCH'; // HTTP method for api actions
  body?: Record<string, any>; // Request body for api actions
}
```

**Validation Rules**:
- `id`: Non-empty string, UUID format
- `type`: Non-empty string, conventionally dot-separated (e.g., "domain.action")
- `severity`: Must be one of the enum values
- `title`: Non-empty string, max 200 characters (frontend truncates if longer)
- `message`: Non-empty string, max 1000 characters (frontend truncates with "..." if longer)
- `timestamp`: Valid ISO 8601 UTC string, parsed to user's local timezone for display
- `org_id`: Non-empty string, must match current F03 context for display
- `project_id`: If present, must match current F03 context for project-scoped notifications

**State Transitions**:
```
unread (read: false) --(user marks as read)--> read (read: true)
read (read: true) --(user marks as unread)--> unread (read: false)
```

---

### NotificationTypeMapping

Configuration that maps backend notification types to frontend display patterns.

```typescript
interface NotificationTypeMapping {
  [notificationType: string]: NotificationDisplayConfig;
}

interface NotificationDisplayConfig {
  // Visual presentation
  severity?: NotificationSeverity; // Override backend severity if specified
  toastVariant?: 'info' | 'success' | 'warning' | 'error'; // F01 Toast component variant

  // Behavior
  toastDuration?: number | null; // Auto-dismiss timeout in ms (null = manual dismiss only)
  showInToast?: boolean; // Display as toast notification (default: true)
  showInInbox?: boolean; // Include in inbox list (default: true)

  // Actions
  action?: NotificationAction; // Default action for this type

  // Display
  icon?: string; // F01 icon name (e.g., "CheckCircle", "AlertTriangle")
}
```

**Example**:
```typescript
const defaultMappings: NotificationTypeMapping = {
  'job.completed': {
    severity: 'SUCCESS',
    toastVariant: 'success',
    toastDuration: 5000,
    showInToast: true,
    showInInbox: true,
    icon: 'CheckCircle',
    action: {
      label: 'View Details',
      type: 'navigate',
      target: '/jobs/{jobId}', // {jobId} replaced from metadata
    },
  },
  'access.revoked': {
    severity: 'WARNING',
    toastVariant: 'warning',
    toastDuration: 10000,
    showInToast: true,
    showInInbox: true,
    icon: 'AlertTriangle',
  },
  'system.error': {
    severity: 'ERROR',
    toastVariant: 'error',
    toastDuration: null, // Manual dismiss only
    showInToast: true,
    showInInbox: true,
    icon: 'XCircle',
  },
};
```

---

### UnreadCount

Aggregated count of unread notifications for the current user and context.

```typescript
interface UnreadCount {
  count: number; // Total unread notifications
  org_id: string; // Organisation context
  project_id?: string | null; // Project context (null for org-level count)
  last_updated: string; // ISO 8601 UTC timestamp of last update
}
```

**Calculation**:
- Frontend calculates from `notifications.filter(n => !n.read).length`
- Backend API may provide `/api/notifications/unread-count` endpoint for efficiency
- Count updates immediately on optimistic mark-as-read, reverts on failure

---

## Client-Side State

### NotificationsState

The internal state managed by `NotificationsProvider`.

```typescript
interface NotificationsState {
  // Notification list
  notifications: Notification[]; // Current page of notifications
  pagination: {
    page: number; // Current page (1-indexed)
    pageSize: number; // Items per page
    totalCount: number; // Total notifications across all pages
    hasMore: boolean; // Are there more pages to load?
  };

  // Filters
  filters: {
    status: 'all' | 'unread' | 'read'; // Filter by read status
    type?: string; // Filter by notification type
  };

  // Metadata
  unreadCount: number; // Cached unread count for current context
  lastFetch: string | null; // ISO 8601 timestamp of last API fetch

  // Loading states
  loading: boolean; // Initial load or refresh in progress
  loadingMore: boolean; // Pagination (load next page) in progress

  // Error state
  error: Error | null; // Most recent error, null if no error

  // UI state
  panelOpen: boolean; // Is the notification panel open?
  toasts: Toast[]; // Active toast notifications
}

interface Toast {
  id: string; // Unique toast ID
  notification: Notification; // The notification being toasted
  visible: boolean; // Is toast currently visible?
  dismissedAt?: number; // Timestamp when dismissed (for fade-out animation)
}
```

**State Transitions**:
```
Initial: { notifications: [], loading: false, error: null, ... }

FETCH_START: loading = true, error = null
FETCH_SUCCESS: notifications = payload, loading = false, lastFetch = now
FETCH_ERROR: error = payload, loading = false

MARK_READ_OPTIMISTIC: Update notification.read in local state
MARK_READ_SUCCESS: Keep optimistic state
MARK_READ_FAILED: Revert to previous state, set error

FILTER_CHANGE: filters = payload, trigger refetch
CONTEXT_CHANGE: Clear notifications, trigger refetch with new org/project

TOAST_ADD: toasts.push(newToast)
TOAST_DISMISS: Remove toast from toasts array
TOAST_AUTO_DISMISS: Mark toast as dismissed after timeout

PANEL_OPEN: panelOpen = true
PANEL_CLOSE: panelOpen = false
```

---

## State Machine Diagrams

### Notification Read/Unread State Machine

```
┌─────────────┐
│   Unread    │
│ (read:false)│
└──────┬──────┘
       │
       │ User clicks "Mark as Read"
       │ or clicks notification
       ▼
┌──────────────┐
│  Optimistic  │  <-- UI updates immediately
│   Read State │
└──────┬───────┘
       │
       ├──► API Success ──► ┌─────────┐
       │                    │  Read   │
       │                    │(read:true)
       │                    └────┬────┘
       │                         │
       │                         │ User clicks "Mark as Unread"
       │                         ▼
       │                    ┌──────────────┐
       │                    │  Optimistic  │
       │                    │Unread State  │
       │                    └──────┬───────┘
       │                           │
       │                           ├──► API Success ──► Back to Unread
       │                           │
       │                           └──► API Failure ──► Stay Read + Error Toast
       │
       └──► API Failure ──► Revert to Unread + Error Toast
```

### Toast Lifecycle State Machine

```
┌──────────────┐
│ Notification │
│   Received   │
└──────┬───────┘
       │
       │ showInToast: true
       ▼
┌──────────────┐
│ Toast Queue  │
└──────┬───────┘
       │
       │ Space available (< 3 toasts)
       ▼
┌──────────────┐
│Toast Visible │
│  (animated)  │
└──────┬───────┘
       │
       ├──► Auto-dismiss timer (if duration set)
       │    │
       │    └──► ┌──────────────┐
       │         │Toast Dismissed│
       │         │  (fade out)   │
       │         └───────────────┘
       │
       ├──► User clicks close button
       │    │
       │    └──► ┌──────────────┐
       │         │Toast Dismissed│
       │         └───────────────┘
       │
       └──► User clicks toast body
            │
            ├──► Mark notification as read (optimistic)
            ├──► Navigate to target (if action.type === 'navigate')
            └──► ┌──────────────┐
                 │Toast Dismissed│
                 └───────────────┘
```

### Inbox Loading State Machine

```
┌──────────────┐
│  Initial     │
│  (empty)     │
└──────┬───────┘
       │
       │ Component mounts / User opens panel
       ▼
┌──────────────┐
│   Skeleton   │ <-- 3-5 skeleton rows
│   Loading    │
└──────┬───────┘
       │
       ├──► API returns data
       │    │
       │    ├──► Has notifications ──► ┌──────────────┐
       │    │                          │Notification  │
       │    │                          │List Loaded   │
       │    │                          └───────────────┘
       │    │
       │    └──► No notifications ──► ┌──────────────┐
       │                               │ Empty State  │
       │                               │ "No notific..│
       │                               └───────────────┘
       │
       └──► API error ──► ┌──────────────┐
                          │ Error State  │
                          │ "Failed to..." │
                          │ [Retry Button]│
                          └───────────────┘
```

---

## API Request/Response Contracts

### GET /api/notifications

**Request**:
```
GET /api/notifications?org={orgId}&project={projectId}&status=unread&page=1&page_size=20
Headers:
  Authorization: Bearer {token}
  X-CSRFToken: {csrf}
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "job.completed",
      "severity": "SUCCESS",
      "title": "Data export completed",
      "message": "Your export of 1,234 records is ready for download.",
      "timestamp": "2025-12-11T14:30:00Z",
      "read": false,
      "org_id": "org-123",
      "project_id": "proj-456",
      "metadata": {
        "job_id": "export-789",
        "record_count": 1234
      },
      "action": {
        "label": "Download",
        "type": "navigate",
        "target": "/exports/export-789"
      }
    }
  ],
  "count": 42,
  "next": "/api/notifications?org=org-123&page=2&page_size=20",
  "previous": null
}
```

**Error Responses**:
- 401 Unauthorized: User not authenticated (trigger F02 re-authentication)
- 403 Forbidden: User lacks access to org/project (show error, clear notifications)
- 500 Internal Server Error: Backend failure (retry with exponential backoff)

---

### PATCH /api/notifications/:id/read

**Request**:
```
PATCH /api/notifications/550e8400-e29b-41d4-a716-446655440000/read
Headers:
  Authorization: Bearer {token}
  X-CSRFToken: {csrf}
Content-Type: application/json

{
  "read": true
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "read": true,
  "updated_at": "2025-12-11T14:35:00Z"
}
```

**Error Responses**:
- 404 Not Found: Notification doesn't exist or user lacks access (revert optimistic update)
- 409 Conflict: Notification already in requested state (accept as success)
- 500 Internal Server Error: Backend failure (revert + show error toast)

---

### POST /api/notifications/mark-all-read

**Request**:
```
POST /api/notifications/mark-all-read
Headers:
  Authorization: Bearer {token}
  X-CSRFToken: {csrf}
Content-Type: application/json

{
  "org_id": "org-123",
  "project_id": "proj-456",
  "filters": {
    "status": "unread"
  }
}
```

**Response** (200 OK):
```json
{
  "updated_count": 17,
  "timestamp": "2025-12-11T14:40:00Z"
}
```

---

## Validation & Error Handling

### Frontend Validation

**Notification Payload Validation**:
```typescript
function validateNotification(data: any): Notification | null {
  try {
    // Required fields
    if (!data.id || !data.type || !data.title || !data.message || !data.timestamp) {
      console.warn('Invalid notification: missing required fields', data);
      return null;
    }

    // Severity validation
    if (!['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'].includes(data.severity)) {
      console.warn('Invalid severity, defaulting to INFO', data);
      data.severity = 'INFO';
    }

    // Timestamp validation
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.warn('Invalid timestamp format', data);
      return null;
    }

    return data as Notification;
  } catch (error) {
    console.error('Notification validation error', error, data);
    return null;
  }
}
```

### Error Handling Strategy

**API Errors**:
```typescript
async function fetchNotifications(orgId: string, projectId?: string) {
  try {
    const response = await apiClient.get('/api/notifications', {
      params: { org: orgId, project: projectId },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Authentication expired - trigger F02 re-auth flow
      triggerReauthentication();
    } else if (error.response?.status === 403) {
      // Authorization failed - show error, clear notifications
      showError('You do not have access to these notifications');
      return { results: [], count: 0 };
    } else if (error.response?.status >= 500) {
      // Server error - retry with backoff
      logError('Notification fetch failed', error);
      throw error; // Caught by retry logic
    } else {
      // Other errors - log and show generic error
      logError('Unexpected error fetching notifications', error);
      showError('Failed to load notifications');
      return { results: [], count: 0 };
    }
  }
}
```

**Malformed Data**:
- Invalid notifications filtered out silently (logged to console/observability)
- Fallback display: Generic INFO toast with "Notification received" if type unmapped
- Truncation: Titles > 200 chars and messages > 1000 chars truncated with "..."

---

## Performance Considerations

### Pagination Strategy

- Default page size: 20 notifications
- Lazy loading: Fetch next page when user scrolls to bottom of list
- Cache: Keep loaded pages in memory, invalidate on context change or manual refresh
- Virtual scrolling: Only render visible items (20-30 at a time) even with 1000+ loaded

### Caching Strategy

```typescript
interface NotificationCache {
  [contextKey: string]: {
    notifications: Notification[];
    lastFetch: number; // Timestamp
    expiresAt: number; // Timestamp
  };
}

// Context key format: "org-123:proj-456" or "org-123" for org-level
function getCacheKey(orgId: string, projectId?: string): string {
  return projectId ? `${orgId}:${projectId}` : orgId;
}

// Cache TTL: 60 seconds (polls refresh after this)
const CACHE_TTL = 60 * 1000;
```

### Polling Optimization

- Default interval: 30 seconds (configurable)
- Pause polling when document hidden (Page Visibility API)
- Resume polling when document visible
- Cancel polling on unmount or user logout
- Skip poll if API request already in flight

---

## Dependencies on Other Packages

### F01 (Design System)
- Toast/Snackbar component for notifications
- Badge component for unread counter
- Drawer/Modal component for panel
- List component for inbox
- Skeleton component (or fallback to grey blocks with F01 tokens)
- Button, Icon, Typography components

### F02 (Authentication)
- `useAuth()` hook: `{ user, isAuthenticated, triggerReauthentication }`
- User object: `{ id, email, displayName }`

### F03 (Multi-Tenancy Context)
- `useContext()` hook: `{ orgId, projectId, organisationName, projectName }`
- Context switches trigger notification refetch

### @django-core/api-client
- `apiClient.get()`, `apiClient.patch()`, `apiClient.post()`
- Automatic CSRF token handling
- Error response normalization

---

## Summary

F04 manages notification UI state entirely on the frontend, consuming REST APIs from B13/B16/B17. The data model focuses on:

1. **Notification entity**: Core data structure from backend
2. **Type mappings**: Configuration for display customization
3. **Client state**: Managed via React Context + reducer
4. **State machines**: Read/unread transitions, toast lifecycle, loading states
5. **API contracts**: Well-defined request/response formats
6. **Validation**: Defensive handling of malformed data
7. **Performance**: Pagination, caching, polling optimization

No persistent storage required; all data lives in memory and refreshes from backend on demand.
