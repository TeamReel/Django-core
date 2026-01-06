# B17: Contextual Notifications

## 1. Purpose & Responsibility
The **Contextual Notifications** module extends B16 Notifications with real-time, in-app alert delivery.

**Responsibilities:**
*   **In-App Alerts:** Toast messages, banners, modals.
*   **Context-Aware:** Show notifications relevant to current Org/Project.
*   **Real-time:** Push updates via WebSockets (future).

## 2. Domain-Agnostic Rationale
Email is slow. Users need immediate feedback:
*   "File uploaded successfully" → Green toast.
*   "Payment failed" → Red banner.
*   "New comment on your project" → Notification bell badge.

## 3. Key Concepts

### 3.1 Notification Types
*   **Toast:** Temporary popup (3-5 seconds).
*   **Banner:** Persistent top-of-page alert.
*   **Badge:** Unread count on notification bell.

### 3.2 Context Filtering
Notifications are scoped to:
*   Current Organisation.
*   Current Project.
*   Current User.

## 4. Public Interfaces (API)

### Internal Service
```python
from contextual_notifications import show_notification
show_notification(user, 'File uploaded', level='success')
```

### Frontend Integration
Consumes B16 Notifications API and displays in F04 Notifications Hub.

## 5. Integrations & Dependencies
*   **Notifications (B16)**: Base notification system.
*   **WebSockets (B23)**: Future real-time delivery.
*   **Frontend (F04)**: Notification Hub UI.

## 6. Status & Phase History
*   **Phase:** 4 (Interfaces & Communication)
*   **Status:** ✅ Complete
*   **Source Code:** `src/contextual_notifications/`
