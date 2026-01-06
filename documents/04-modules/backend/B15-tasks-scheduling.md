# B15: Tasks & Scheduling

## 1. Purpose & Responsibility
The **Tasks** module provides the infrastructure for asynchronous background processing. It ensures that long-running operations (like sending emails or processing files) do not block the web server.

**Responsibilities:**
*   **Async Execution:** Offload work to background workers.
*   **Scheduling:** Run periodic tasks (CRON jobs).
*   **Reliability:** Retry logic for failed tasks.

## 2. Domain-Agnostic Rationale
Web requests must be fast (<500ms). Anything slower (sending email, resizing image, generating PDF) must be done asynchronously. We use **Celery** (with Redis) as the industry standard for Python.

## 3. Key Concepts & Data Model

### 3.1 Celery App (`src/tasks/celery.py`)
The entry point. It auto-discovers tasks from all installed Django apps.

### 3.2 No Database Models
This module intentionally does **not** use Django models to track task state.
*   **State:** Managed by Redis (Broker/Result Backend).
*   **History:** Persistent history should be logged to **B09 Audit**, not stored in a "Task" table which grows indefinitely.

## 4. Public Interfaces (API)
*   **Defining Tasks:** Decorate functions with `@shared_task`.
*   **Calling Tasks:** Use `.delay()` or `.apply_async()`.

```python
from celery import shared_task

@shared_task
def send_welcome_email(user_id):
    # ...
```

## 5. Integrations & Dependencies
*   **Redis:** Required as the Message Broker.
*   **All Modules:** Any module can define and call tasks.

## 6. Status & Phase History
*   **Phase:** 4 (Interfaces)
*   **Status:** ✅ Complete
*   **Source Code:** `src/tasks/`
