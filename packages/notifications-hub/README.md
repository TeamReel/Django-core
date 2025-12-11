# @django-core/notifications-hub

In-app notification display and management UI for Django Core applications.

## Installation

```bash
pnpm add @django-core/notifications-hub
```

## Quick Start

```tsx
import { NotificationsProvider, NotificationPanel, UnreadBadge } from '@django-core/notifications-hub';

function App() {
  return (
    <NotificationsProvider config={{ apiBaseUrl: '/api' }}>
      <Header>
        <UnreadBadge />
      </Header>
      <NotificationPanel />
    </NotificationsProvider>
  );
}
```

## Documentation

Full documentation coming soon. See [quickstart.md](../../kitty-specs/025-notifications-hub-ui/quickstart.md) for integration guide.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

Copyright © 2025 Django Core Team
