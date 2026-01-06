# Notifications Baseline (B16)

*Path: [docs/notifications-baseline.md](docs/notifications-baseline.md)*

## Overview

The Notifications Baseline provides a unified, multi-channel notification system for the Django Core application. It supports email, in-app, and webhook delivery channels with configurable retry policies, comprehensive audit logging, and integration with the Celery task scheduling system (B15).

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Notifications System                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐   │
│  │   API Layer     │     │   Service Layer     │     │   Channel Layer     │   │
│  │                 │     │                     │     │                     │   │
│  │ • Create        │────▶│ • NotificationSvc   │────▶│ • EmailChannel     │   │
│  │ • Query         │     │ • RetryService      │     │ • InAppChannel     │   │
│  │ • Mark Read     │     │ • TemplateService   │     │ • WebhookChannel   │   │
│  │                 │     │                     │     │                     │   │
│  └─────────────────┘     └─────────────────────┘     └─────────────────────┘   │
│           │                        │                          │                 │
│           ▼                        ▼                          ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      Data Layer (PostgreSQL)                             │   │
│  │                                                                          │   │
│  │   ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────┐       │   │
│  │   │ Notification │  │ NotificationType │  │   DeliveryAttempt   │       │   │
│  │   └──────────────┘  └──────────────────┘  └─────────────────────┘       │   │
│  │                                                                          │   │
│  │   ┌──────────────┐                                                       │   │
│  │   │ RetryPolicy  │                                                       │   │
│  │   └──────────────┘                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │    Celery (B15)       │       │     Audit (B09)       │
        │                       │       │                       │
        │ • Async delivery      │       │ • Event logging       │
        │ • Retry scheduling    │       │ • Status tracking     │
        │ • Beat scheduling     │       │                       │
        └───────────────────────┘       └───────────────────────┘
```

### Data Model

```
┌─────────────────┐
│   RetryPolicy   │
│  (Reusable)     │
│                 │
│ • max_attempts  │
│ • backoff_mult  │
│ • retry_window  │
└────────┬────────┘
         │
         │ FK
         ▼
┌─────────────────────┐
│  NotificationType   │◄───────┐
│                     │        │
│ • code (unique)     │        │ FK
│ • default_channel   │        │
│ • retry_policy_id   │        │
└─────────────────────┘        │
                               │
┌──────────────────────────────┴─────┐
│         Notification                │
│                                     │
│ • id (UUID)                         │
│ • type_id (FK)                      │
│ • channel (email/in_app/webhook)    │
│ • recipient                         │
│ • payload (JSON)                    │
│ • status (pending/sent/failed)      │
│ • created_at                        │
└──────────────┬──────────────────────┘
               │
               │ 1:N
               ▼
       ┌───────────────────┐
       │  DeliveryAttempt  │
       │                   │
       │ • attempt_number  │
       │ • outcome         │
       │ • error_message   │
       │ • attempted_at    │
       └───────────────────┘
```

### Notification Flow

```
┌─────────┐    ┌─────────────┐    ┌────────────────┐    ┌──────────────┐
│  API    │───▶│  Validate   │───▶│ Create Record  │───▶│ Queue Task   │
│ Request │    │  Payload    │    │ status=pending │    │ (Celery)     │
└─────────┘    └─────────────┘    └────────────────┘    └──────┬───────┘
                                                               │
                                                               ▼
                                         ┌─────────────────────────────┐
                                         │      Celery Worker          │
                                         │                             │
                                         │  ┌─────────────────────┐   │
                                         │  │ 1. Load notification │   │
                                         │  └─────────┬───────────┘   │
                                         │            ▼               │
                                         │  ┌─────────────────────┐   │
                                         │  │ 2. Select channel   │   │
                                         │  │    (email/webhook/  │   │
                                         │  │     in_app)         │   │
                                         │  └─────────┬───────────┘   │
                                         │            ▼               │
                                         │  ┌─────────────────────┐   │
                                         │  │ 3. Deliver          │   │
                                         │  │    (SMTP/HTTP/DB)   │   │
                                         │  └─────────┬───────────┘   │
                                         │            │               │
                                         │     ┌──────┴──────┐       │
                                         │     ▼            ▼        │
                                         │ ┌───────┐  ┌──────────┐   │
                                         │ │Success│  │  Failure │   │
                                         │ └───┬───┘  └─────┬────┘   │
                                         │     │            │        │
                                         │     ▼            ▼        │
                                         │ status=      Should       │
                                         │  "sent"      retry?       │
                                         │              │            │
                                         │        ┌─────┴─────┐      │
                                         │        ▼           ▼      │
                                         │    Schedule     status=   │
                                         │    retry task   "failed"  │
                                         │                           │
                                         └─────────────────────────────┘
```

## Components

### Channels

| Channel | Description | Recipient Format | Use Case |
|---------|-------------|------------------|----------|
| `email` | SMTP delivery | Email address | User notifications, alerts, marketing |
| `in_app` | Database storage | User ID | Real-time UI notifications |
| `webhook` | HTTP POST | URL endpoint | External integrations |

### Retry Policies

Two built-in policies:

| Policy | Max Attempts | Window | Backoff | Use Case |
|--------|--------------|--------|---------|----------|
| `best-effort` | 3 | 1 hour | Exponential (5x) | Default, non-critical |
| `critical` | 10 | 24 hours | Exponential (2x) | Password resets, security |

### Status Flow

```
pending ──────┬─────────────▶ sent
              │
              │ (on failure)
              ▼
          retrying ──────────▶ failed (max attempts exceeded)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications/` | GET | List notifications (filtered) |
| `/api/v1/notifications/` | POST | Create notification |
| `/api/v1/notifications/{id}/` | GET | Get notification details |
| `/api/v1/notifications/{id}/mark_read/` | POST | Mark as read (in-app) |
| `/api/v1/notifications/stats/` | GET | Notification statistics |
| `/api/v1/notifications/health/` | GET | Health check endpoint |

## Integration Points

### B15 Celery Task Scheduling

- **Async delivery**: All notifications queued via `deliver_notification.delay()`
- **Retry scheduling**: `schedule_retry.delay()` with countdown
- **Beat schedule**: Daily cleanup at 2 AM UTC

### B09 Audit Logging

- Notification lifecycle events logged
- Delivery attempts tracked with outcomes
- Integration via `AuditEventService`

## Observability

### Prometheus Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `notifications_created_total` | Counter | type, channel | Total notifications created |
| `notifications_sent_total` | Counter | type, channel | Successful deliveries |
| `notifications_failed_total` | Counter | type, channel, reason | Failed deliveries |
| `notification_delivery_duration_seconds` | Histogram | type, channel | Delivery time |

### Health Check

- **Endpoint**: `GET /api/v1/notifications/health/`
- **Checks**: SMTP connectivity, Celery queue depth
- **Response**: Always HTTP 200, status in body (`ok`/`degraded`/`down`)

## Configuration

### Required Settings

```python
# Email (for email channel)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'user'
EMAIL_HOST_PASSWORD = 'password'

# Webhook (for webhook channel)
WEBHOOK_SECRET_KEY = 'your-32-byte-secret-key'
```

### Optional Settings

```python
# Celery beat schedule (cleanup)
CELERY_BEAT_SCHEDULE = {
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_tasks.cleanup_old_notifications',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM UTC
        'kwargs': {'retention_days': 90},
    },
}
```

## File Structure

```
src/notifications/
├── __init__.py              # App init, metric registration
├── apps.py                  # Django app config
├── models/                  # Data models
│   ├── notification.py      # Core notification model
│   ├── notification_type.py # Type configuration
│   ├── delivery_attempt.py  # Audit trail
│   └── retry_policy.py      # Retry configuration
├── channels/                # Delivery channels
│   ├── base.py              # Abstract channel
│   ├── email.py             # SMTP delivery
│   ├── in_app.py            # Database storage
│   └── webhook.py           # HTTP POST
├── services/                # Business logic
│   ├── notification_service.py
│   ├── retry_service.py
│   └── template_service.py
├── tasks/                   # Celery tasks
│   ├── delivery_tasks.py    # Async delivery
│   └── cleanup_tasks.py     # Retention cleanup
├── views/                   # API views
│   ├── notification_views.py
│   └── health_views.py
├── serializers/             # DRF serializers
├── filters.py               # Query filters
├── metrics.py               # Prometheus metrics
└── urls.py                  # URL routing
```

## See Also

- [Quickstart Guide](../kitty-specs/016-notifications-baseline/quickstart.md)
- [Extension Guide](notifications-extension-guide.md)
- [ADR-016: Retry Policies](adr/016-notification-retry-policies.md)
- [Webhook Signature Verification](webhook-signature-verification.md)
