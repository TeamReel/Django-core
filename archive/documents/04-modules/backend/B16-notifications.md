# B16: Notifications

## 1. Purpose & Responsibility
The **Notifications** module is a multi-channel delivery system. It decouples the "intent" to notify from the "mechanism" of delivery.

**Responsibilities:**
*   **Multi-Channel:** Supports Email, In-App, and Webhooks.
*   **Templating:** Manages content formatting (e.g., HTML emails).
*   **Reliability:** Handles retries and failure tracking.

## 2. Domain-Agnostic Rationale
Modern apps need to reach users where they are. Hardcoding `send_mail()` calls throughout the codebase makes it hard to add new channels (like SMS or Push) or manage preferences later.

## 3. Key Concepts & Data Model

### 3.1 Notification (`src/notifications/models/notification.py`)
A single delivery attempt.
*   **`type`**: The category (e.g., `password_reset`).
*   **`channel`**: `email`, `in_app`, or `webhook`.
*   **`recipient`**: Email address, User ID, or URL.
*   **`payload`**: The content (Subject, Body).
*   **`status`**: `pending`, `sent`, `failed`.

### 3.2 NotificationType (`src/notifications/models/notification_type.py`)
Configuration for a category of notifications.
*   **`code`**: Unique slug.
*   **`default_channel`**: Fallback if not specified.
*   **`retry_policy`**: Link to retry logic.

## 4. Public Interfaces (API)
*   **Internal Service:** `create_notification(...)` used by other modules.
*   **Public API:** Endpoints for users to list their `in_app` notifications (often handled by `contextual_notifications` module).

## 5. Integrations & Dependencies
*   **Celery (`tasks`)**: Actual delivery happens asynchronously.
*   **Accounts (`accounts`)**: Links to Users for In-App delivery.

## 6. Status & Phase History
*   **Phase:** 4 (Interfaces)
*   **Status:** ✅ Complete
*   **Source Code:** `src/notifications/`
