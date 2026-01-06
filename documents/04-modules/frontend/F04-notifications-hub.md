# F04: Notifications Hub

## 1. Purpose & Responsibility
The **Notifications Hub** displays in-app notifications (the "bell icon" UI pattern).

**Responsibilities:**
*   **Notification Bell:** Shows unread count badge.
*   **Notification List:** Dropdown panel with recent notifications.
*   **Mark as Read:** Updates notification status.

## 2. Domain-Agnostic Rationale
In-app notifications are a core UX pattern. This package standardizes it and connects to the Backend B16 Notifications system.

## 3. Key Concepts

### 3.1 Bell Component
Icon with badge showing unread count.

### 3.2 Notification List
Virtualized list (using `react-window`) for performance with large notification counts.

### 3.3 Real-time (Future)
Will eventually connect to WebSockets for live updates.

## 4. Public Interfaces (Exports)

**Package:** `@django-core/notifications-hub`

```typescript
import { NotificationBell, NotificationList } from '@django-core/notifications-hub';
```

## 5. Integrations & Dependencies
*   **Backend API:** Calls B16 Notifications endpoints.
*   **Design System (F01):** Uses badge, dropdown components.

## 6. Status & Phase History
*   **Phase:** 6 (Frontend Foundations)
*   **Status:** ✅ Complete
*   **Source Code:** `packages/notifications-hub/`
