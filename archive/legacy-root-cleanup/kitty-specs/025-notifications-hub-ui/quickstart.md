# Quickstart: Notifications Hub UI (F04)
*Path: [kitty-specs/025-notifications-hub-ui/quickstart.md](kitty-specs/025-notifications-hub-ui/quickstart.md)*

**Date**: 2025-12-11 | **Feature**: F04 Notifications Hub UI

## Overview

F04 provides a React-based notification hub UI for consuming and displaying notifications from the django-core platform. It includes:

- **Inbox panel**: Slide-out drawer with paginated notification list
- **Toast notifications**: Temporary alerts for new notifications
- **Unread badge**: Counter displayed in navigation/header
- **Context-aware**: Automatically filters by current org/project from F03

This guide shows how to integrate F04 into your application in 10 minutes.

---

## Prerequisites

Before integrating F04, ensure you have:

1. **F01 (Design System)**: `@django-core/design-system` installed and configured
2. **F02 (Authentication)**: `@django-core/auth` with `AuthProvider` configured
3. **F03 (Multi-Tenancy)**: `@django-core/context-switcher` with `ContextProvider` configured
4. **F06 (Layouts)**: `@django-core/layouts` (optional, but recommended for consistent UI)
5. **Backend APIs**: B13 (API baseline) + B16 (notifications persistence) + B17 (notifications hub) deployed
6. **React 18+**: Your app uses React 18.x or later
7. **TypeScript**: Recommended for type safety (optional)

---

## Installation

### Step 1: Install Package

```bash
# Using pnpm (recommended)
pnpm add @django-core/notifications-hub

# Using npm
npm install @django-core/notifications-hub

# Using yarn
yarn add @django-core/notifications-hub
```

**Package includes**:
- React components (NotificationsProvider, NotificationPanel, UnreadBadge, Toast)
- Custom hooks (useNotifications, useUnreadCount, useNotificationSubscription)
- TypeScript type definitions

### Step 2: Verify Dependencies

Check that peer dependencies are satisfied:

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@django-core/design-system": "^1.0.0",
    "@django-core/auth": "^1.0.0",
    "@django-core/context-switcher": "^1.0.0",
    "@django-core/api-client": "^1.0.0"
  }
}
```

If missing, install them:

```bash
pnpm add @django-core/design-system @django-core/auth @django-core/context-switcher @django-core/api-client
```

---

## Basic Setup

### Step 1: Wrap App with NotificationsProvider

In your root `App.tsx` or `_app.tsx`:

```tsx
import React from 'react';
import { AuthProvider } from '@django-core/auth';
import { ContextProvider } from '@django-core/context-switcher';
import { NotificationsProvider } from '@django-core/notifications-hub';

function App() {
  return (
    <AuthProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
      <ContextProvider>
        <NotificationsProvider
          config={{
            apiBaseUrl: 'https://api.example.com/api/v1',
            pollingInterval: 30000, // Poll every 30 seconds
          }}
        >
          {/* Your app components */}
          <YourAppContent />
        </NotificationsProvider>
      </ContextProvider>
    </AuthProvider>
  );
}

export default App;
```

**Configuration options**:
- `apiBaseUrl`: Backend API base URL (required)
- `pollingInterval`: How often to check for new notifications in ms (default: 30000)
- `maxToasts`: Max simultaneous toasts (default: 3)
- `pageSize`: Notifications per page in inbox (default: 20)

### Step 2: Add Unread Badge to Navigation

In your header/navigation component:

```tsx
import React from 'react';
import { UnreadBadge } from '@django-core/notifications-hub';
import { Icon } from '@django-core/design-system';

function AppHeader() {
  return (
    <header>
      <nav>
        {/* Other nav items */}
        <button onClick={() => {/* Open panel */}}>
          <Icon name="Bell" />
          <UnreadBadge />
        </button>
      </nav>
    </header>
  );
}
```

**UnreadBadge props**:
- `variant`: `"dot" | "count"` (default: `"count"`)
- `max`: Maximum count to display before showing "+" (default: 99)
- `className`: Custom CSS class

### Step 3: Add Notification Panel

Add the slide-out panel to your layout:

```tsx
import React from 'react';
import { NotificationPanel, useNotifications } from '@django-core/notifications-hub';

function AppLayout({ children }) {
  const { panelOpen, closePanel } = useNotifications();

  return (
    <div>
      {/* Main content */}
      <main>{children}</main>

      {/* Notification panel */}
      <NotificationPanel
        open={panelOpen}
        onClose={closePanel}
        position="right"
      />
    </div>
  );
}
```

**NotificationPanel props**:
- `open`: Boolean controlling panel visibility (required)
- `onClose`: Callback when panel closes (required)
- `position`: `"left" | "right"` (default: `"right"`)
- `width`: Panel width in px or rem (default: `"400px"`)

### Step 4: Open Panel Programmatically

In any component, use the `useNotifications` hook:

```tsx
import React from 'react';
import { useNotifications } from '@django-core/notifications-hub';
import { Button } from '@django-core/design-system';

function NotificationTrigger() {
  const { openPanel } = useNotifications();

  return (
    <Button onClick={openPanel}>
      View Notifications
    </Button>
  );
}
```

---

## Advanced Configuration

### Custom Notification Type Mappings

Override default display settings for specific notification types:

```tsx
import { NotificationsProvider, NotificationTypeMapping } from '@django-core/notifications-hub';

const customMappings: NotificationTypeMapping = {
  'job.completed': {
    severity: 'SUCCESS',
    toastVariant: 'success',
    toastDuration: 5000,
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
    icon: 'AlertTriangle',
  },
  'system.error': {
    severity: 'ERROR',
    toastVariant: 'error',
    toastDuration: null, // Manual dismiss only
    icon: 'XCircle',
  },
};

function App() {
  return (
    <NotificationsProvider
      config={{ apiBaseUrl: 'https://api.example.com' }}
      typeMappings={customMappings}
    >
      {/* App content */}
    </NotificationsProvider>
  );
}
```

### Custom Toast Positioning

Configure toast position via provider:

```tsx
<NotificationsProvider
  config={{
    apiBaseUrl: 'https://api.example.com',
    toastPosition: {
      desktop: 'top-right', // 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
      mobile: 'top-center',  // Simplified for mobile
    },
  }}
>
  {/* App content */}
</NotificationsProvider>
```

### Polling Control

Pause/resume polling programmatically:

```tsx
import { useNotifications } from '@django-core/notifications-hub';

function PollingControls() {
  const { pausePolling, resumePolling, isPollingActive } = useNotifications();

  return (
    <div>
      <p>Polling: {isPollingActive ? 'Active' : 'Paused'}</p>
      <button onClick={pausePolling}>Pause</button>
      <button onClick={resumePolling}>Resume</button>
    </div>
  );
}
```

**Automatic pausing**: Polling automatically pauses when:
- Document is hidden (Page Visibility API)
- User logs out (F02 triggers)
- Component unmounts

### Custom Error Handling

Override default error handlers:

```tsx
<NotificationsProvider
  config={{ apiBaseUrl: 'https://api.example.com' }}
  onError={(error, context) => {
    console.error('Notification error:', error);

    if (context === 'fetch') {
      // Custom logic for fetch failures
      showCustomErrorModal('Failed to load notifications');
    } else if (context === 'mark-read') {
      // Custom logic for mark-as-read failures
      showCustomErrorToast('Failed to mark as read');
    }
  }}
>
  {/* App content */}
</NotificationsProvider>
```

---

## API Reference

### Hooks

#### `useNotifications()`

Main hook for interacting with notification state.

```tsx
const {
  // State
  notifications,        // Notification[] - Current page of notifications
  unreadCount,          // number - Unread count for current context
  loading,              // boolean - Initial load or refresh in progress
  error,                // Error | null - Most recent error

  // Actions
  markAsRead,           // (id: string) => Promise<void>
  markAsUnread,         // (id: string) => Promise<void>
  markAllAsRead,        // () => Promise<void>
  refresh,              // () => Promise<void> - Manual refresh

  // Pagination
  loadMore,             // () => Promise<void> - Load next page
  hasMore,              // boolean - Are there more pages?

  // Panel control
  panelOpen,            // boolean - Is panel open?
  openPanel,            // () => void
  closePanel,           // () => void
  togglePanel,          // () => void

  // Polling control
  pausePolling,         // () => void
  resumePolling,        // () => void
  isPollingActive,      // boolean
} = useNotifications();
```

#### `useUnreadCount()`

Lightweight hook for just the unread count (useful for badge components):

```tsx
const { count, loading } = useUnreadCount();
```

#### `useNotificationSubscription(callback)`

Subscribe to new notification events:

```tsx
useNotificationSubscription((notification: Notification) => {
  console.log('New notification:', notification);
  // Custom logic (e.g., play sound, send analytics)
});
```

### Components

#### `<NotificationPanel />`

Slide-out drawer for notification inbox.

**Props**:
```tsx
interface NotificationPanelProps {
  open: boolean;                  // Required
  onClose: () => void;            // Required
  position?: 'left' | 'right';    // Default: 'right'
  width?: string;                 // Default: '400px'
  className?: string;
}
```

#### `<UnreadBadge />`

Badge displaying unread count.

**Props**:
```tsx
interface UnreadBadgeProps {
  variant?: 'dot' | 'count';      // Default: 'count'
  max?: number;                   // Default: 99 (shows "99+" if count > max)
  className?: string;
  showZero?: boolean;             // Default: false (hide badge when count is 0)
}
```

#### `<NotificationItem />`

Individual notification row (used within panel).

**Props**:
```tsx
interface NotificationItemProps {
  notification: Notification;     // Required
  onClick?: (notification: Notification) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  showActions?: boolean;          // Default: true
  className?: string;
}
```

---

## Integration with Layouts (F06)

If using F06 layouts, integrate F04 into the shell:

```tsx
import React from 'react';
import { AppShell } from '@django-core/layouts';
import { NotificationPanel, UnreadBadge, useNotifications } from '@django-core/notifications-hub';

function AppLayout({ children }) {
  const { panelOpen, openPanel, closePanel } = useNotifications();

  return (
    <AppShell
      header={{
        actions: (
          <button onClick={openPanel}>
            <Icon name="Bell" />
            <UnreadBadge />
          </button>
        ),
      }}
      sidebar={{
        /* sidebar config */
      }}
    >
      {children}
      <NotificationPanel open={panelOpen} onClose={closePanel} />
    </AppShell>
  );
}
```

---

## Router Integration

### React Router Example

```tsx
import { useNavigate } from 'react-router-dom';
import { NotificationsProvider, RouterAdapter } from '@django-core/notifications-hub';

const reactRouterAdapter: RouterAdapter = {
  navigate: (path: string) => {
    const navigate = useNavigate();
    navigate(path);
  },
};

function App() {
  return (
    <NotificationsProvider
      config={{ apiBaseUrl: 'https://api.example.com' }}
      routerAdapter={reactRouterAdapter}
    >
      {/* App content */}
    </NotificationsProvider>
  );
}
```

### Next.js App Router Example

```tsx
import { useRouter } from 'next/navigation';
import { NotificationsProvider, RouterAdapter } from '@django-core/notifications-hub';

const nextRouterAdapter: RouterAdapter = {
  navigate: (path: string) => {
    const router = useRouter();
    router.push(path);
  },
};

function RootLayout({ children }) {
  return (
    <NotificationsProvider
      config={{ apiBaseUrl: process.env.NEXT_PUBLIC_API_URL }}
      routerAdapter={nextRouterAdapter}
    >
      {children}
    </NotificationsProvider>
  );
}
```

---

## Testing

### Unit Testing Example

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsProvider, NotificationPanel } from '@django-core/notifications-hub';
import { server } from './mocks/server'; // MSW server
import { rest } from 'msw';

describe('NotificationPanel', () => {
  it('displays notifications', async () => {
    server.use(
      rest.get('/api/v1/notifications', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              {
                id: '123',
                type: 'job.completed',
                severity: 'SUCCESS',
                title: 'Job completed',
                message: 'Your job is done',
                timestamp: '2025-12-11T14:30:00Z',
                read: false,
                org_id: 'org-123',
              },
            ],
            count: 1,
          })
        );
      })
    );

    render(
      <NotificationsProvider config={{ apiBaseUrl: 'http://localhost' }}>
        <NotificationPanel open={true} onClose={() => {}} />
      </NotificationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Job completed')).toBeInTheDocument();
    });
  });

  it('marks notification as read', async () => {
    const user = userEvent.setup();

    render(
      <NotificationsProvider config={{ apiBaseUrl: 'http://localhost' }}>
        <NotificationPanel open={true} onClose={() => {}} />
      </NotificationsProvider>
    );

    await waitFor(() => screen.getByText('Job completed'));

    await user.click(screen.getByLabelText('Mark as read'));

    await waitFor(() => {
      expect(screen.getByText('Job completed')).toHaveClass('read');
    });
  });
});
```

### MSW Mock Handlers

```tsx
import { rest } from 'msw';

export const notificationHandlers = [
  rest.get('/api/v1/notifications', (req, res, ctx) => {
    const org = req.url.searchParams.get('org');
    const status = req.url.searchParams.get('status');

    return res(
      ctx.json({
        results: [
          /* mock notifications */
        ],
        count: 1,
      })
    );
  }),

  rest.patch('/api/v1/notifications/:id/read', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        read: true,
        updated_at: new Date().toISOString(),
      })
    );
  }),
];
```

---

## Troubleshooting

### Notifications Not Loading

**Symptom**: Panel opens but shows empty state or loading forever.

**Causes**:
1. Backend API not reachable
2. Authentication token expired (F02 issue)
3. User lacks org/project access (F03 context issue)
4. CORS configuration blocking requests

**Solutions**:
```tsx
// Check console for errors
// Enable debug mode:
<NotificationsProvider
  config={{ apiBaseUrl: '...', debug: true }}
>
  {/* This will log all API requests/responses */}
</NotificationsProvider>

// Check F02 auth state:
const { isAuthenticated } = useAuth();
console.log('Authenticated:', isAuthenticated);

// Check F03 context:
const { orgId, projectId } = useContext();
console.log('Context:', { orgId, projectId });
```

### Toasts Not Appearing

**Symptom**: New notifications arrive but no toasts display.

**Causes**:
1. Type mapping has `showInToast: false`
2. Max toasts limit reached
3. Toast container not rendered
4. Polling disabled

**Solutions**:
```tsx
// Ensure polling is active:
const { isPollingActive, resumePolling } = useNotifications();
if (!isPollingActive) resumePolling();

// Check type mappings:
<NotificationsProvider
  typeMappings={{
    'your.type': {
      showInToast: true, // Ensure this is true
    },
  }}
/>
```

### Unread Count Not Updating

**Symptom**: Badge shows stale count after marking as read.

**Causes**:
1. Optimistic update failed (network error)
2. Context changed but state not cleared
3. Polling paused

**Solutions**:
```tsx
// Force refresh:
const { refresh } = useNotifications();
refresh();

// Check for errors:
const { error } = useNotifications();
if (error) {
  console.error('Notification error:', error);
}
```

### Performance Issues with Large Lists

**Symptom**: Sluggish scrolling with 100+ notifications.

**Cause**: Not using virtual scrolling (F04 includes react-window by default).

**Solution**: Ensure `NotificationPanel` has virtualization enabled (on by default):
```tsx
<NotificationPanel
  open={true}
  onClose={closePanel}
  virtualizeThreshold={50} // Enable virtualization when count > 50
/>
```

---

## Migration Guide

### From Custom Notification Implementation

If you have an existing notification system:

1. **Audit current API**: Ensure backend matches F04's expected contract (see `contracts/notifications-api.yaml`)
2. **Replace provider**: Swap custom provider with `NotificationsProvider`
3. **Update components**: Replace custom notification components with F04 components
4. **Test thoroughly**: Especially mark-as-read flows and optimistic updates

**Example before**:
```tsx
// Old custom implementation
<CustomNotificationProvider>
  <CustomNotificationBell />
  <CustomNotificationPanel />
</CustomNotificationProvider>
```

**Example after**:
```tsx
// New F04 implementation
<NotificationsProvider config={{ apiBaseUrl: '...' }}>
  <UnreadBadge />
  <NotificationPanel open={open} onClose={close} />
</NotificationsProvider>
```

---

## Next Steps

1. **Customize type mappings**: Define display rules for your notification types
2. **Add router integration**: Connect notification actions to your routing system
3. **Configure observability**: Integrate error logging with your monitoring stack (see `docs/features/observability/overview.md`)
4. **Test thoroughly**: Write integration tests for key user flows
5. **Deploy backend**: Ensure B13/B16/B17 are deployed and API accessible

**Resources**:
- [API Documentation](./contracts/notifications-api.yaml)
- [Data Model](./data-model.md)
- [Research & Best Practices](./research.md)
- [F01 Design System Docs](../../022-frontend-design-system/README.md)

---

**Questions?** See [docs/troubleshooting/notifications.md](../../docs/troubleshooting/notifications.md) or file an issue.
