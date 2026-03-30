# B09: Audit Logging

## 1. Purpose & Responsibility
The **Audit** module provides a centralized, immutable record of all significant actions within the system. It answers "Who did what, when, and where?" for security and compliance.

**Responsibilities:**
*   **Recording:** Captures events with context (User, Org, Project).
*   **Immutability:** Events cannot be modified or deleted (except by retention policy).
*   **Retrieval:** Provides an API for viewing activity history.

## 2. Domain-Agnostic Rationale
Audit logs are critical for:
*   **Security:** Investigating breaches.
*   **Compliance:** SOC2, GDPR requirements.
*   **Support:** Debugging user issues ("Why did my file disappear?").

## 3. Key Concepts & Data Model

### 3.1 AuditEvent (`src/audit/models.py`)
The immutable record.
*   **`event_type`**: String identifier (e.g., `auth.login`, `project.create`).
*   **`user`**: The actor performing the action.
*   **`organization` / `project`**: The context where the action occurred.
*   **`metadata`**: JSON blob for event-specific details (e.g., changed fields).
*   **`created_at`**: Timestamp.

### 3.2 AuditLog API (`src/audit/api.py`)
The internal Python API for recording events.
```python
from audit.api import audit_log
audit_log.record('event.name', user=user, metadata={...})
```
*   **Validation:** Checks if `event_type` is registered.
*   **Safety:** Catches DB errors to prevent audit failures from breaking the app flow (logs error instead).

## 4. Public Interfaces (API)

Implemented in `src/audit/views.py`.

| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit/` | List audit events. | Authenticated |

**Filtering:**
*   Users can only see events for:
    *   Organisations they are members of.
    *   Projects they are members of.
    *   Actions they performed themselves.

## 5. Integrations & Dependencies
*   **All Modules:** Almost every module calls `audit_log.record()`.
*   **Accounts/Orgs/Projects:** Provide the context foreign keys.

## 6. Status & Phase History
*   **Phase:** 3 (Configuration & Audit)
*   **Status:** ✅ Complete
*   **Source Code:** `src/audit/`
