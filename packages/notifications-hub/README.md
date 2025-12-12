# @django-core/notifications-hub

> In-app notification display and management UI for Django Core applications

Real-time notification inbox with toast alerts, unread badges, and full keyboard/screen reader support.

## Features

- 🔔 **Toast Notifications**: Temporary alerts for new notifications with auto-dismiss
- 📬 **Inbox Panel**: Slide-out drawer with paginated notification list
- 🔢 **Unread Badge**: Counter displayed in navigation/header
- 🌐 **Multi-tenancy Aware**: Automatically filters by current org/project
- ⚡ **Real-time Polling**: Configurable intervals for fresh notifications
- ♿ **Accessible**: WCAG 2.1 AA compliant with keyboard navigation
- 🎨 **Styled with F01**: Uses `@django-core/design-system` tokens
- 📱 **Responsive**: Mobile-friendly with swipe gestures
- 🧪 **Fully Tested**: 100% test coverage with Jest + RTL

## Installation

```bash
# Using pnpm (recommended)
pnpm add @django-core/notifications-hub

# Using npm
npm install @django-core/notifications-hub

# Using yarn
yarn add @django-core/notifications-hub
```

### Peer Dependencies

This package requires the following peer dependencies:

```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@django-core/design-system": "^1.0.0",
  "@django-core/auth": "^1.0.0",
  "@django-core/context-switcher": "^1.0.0",
  "@django-core/api-client": "^1.0.0"
}
```

Install missing dependencies:

```bash
pnpm add @django-core/design-system @django-core/auth @django-core/context-switcher @django-core/api-client
```

## Quick Start

### 1. Wrap Your App with NotificationsProvider

```tsx
import React from 'react';
import { AuthProvider } from '@django-core/auth';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import { NotificationsProvider } from '@django-core/notifications-hub';

function App() {
  return (
    <AuthProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
      <ContextSwitcherProvider>
        <NotificationsProvider
          config={{
            apiBaseUrl: 'https://api.example.com/api/v1',
            pollingInterval: 30000, // Poll every 30 seconds
            maxToasts: 3,
          }}
        >
          {/* Your app content */}
          <YourAppContent />
        </NotificationsProvider>
      </ContextSwitcherProvider>
    </AuthProvider>
  );
}
```

### 2. Add Unread Badge to Your Header

```tsx
import { UnreadBadge } from '@django-core/notifications-hub';

function AppHeader() {
  const [panelOpen, setPanelOpen] = React.useState(false);

  return (
    <header>
      <button onClick={() => setPanelOpen(true)} aria-label="Open notifications">
        <Icon name="Bell" />
        <UnreadBadge />
      </button>
    </header>
  );
}
```

### 3. Add Notification Panel

```tsx
import { NotificationPanel } from '@django-core/notifications-hub';

function AppLayout() {
  const [panelOpen, setPanelOpen] = React.useState(false);

  return (
    <div>
      <AppHeader onNotificationsClick={() => setPanelOpen(true)} />
      <main>{/* Your content */}</main>

      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        position="right" // or "left"
      />
    </div>
  );
}
```

### 4. Toast Notifications (Automatic)

Toasts appear automatically for new notifications. No additional setup required!

---

## 📚 Full Documentation

For comprehensive documentation including:
- Complete API Reference
- Advanced Configuration
- Accessibility Guidelines
- Testing Utilities
- Troubleshooting Guide
- Integration Examples

See: **[Full README Documentation](./DOCUMENTATION.md)**

## Quick Links

- 📖 [Quickstart Guide](../../kitty-specs/025-notifications-hub-ui/quickstart.md)
- 🎨 [Design System Integration](../design-system)
- 🔐 [Authentication Setup](../auth)
- 🌐 [Multi-tenancy Context](../context-switcher)
- 📝 [Examples](./examples/)

## Development

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# Test with coverage
pnpm test:coverage
```

## License

Copyright © 2025 Django Core Team
