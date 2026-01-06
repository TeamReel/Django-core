# Notifications Module

Multi-channel notification delivery for Django Core-App.

## Overview

The `notifications` module provides a flexible notification system with multiple delivery channels (email, in-app, webhook), template-based content, and reliable delivery with retries.

**App location**: `src/notifications/`
**Feature spec**: `kitty-specs/016-notifications-baseline/`
**ADR**: [ADR-016: Notification Retry Policies](../architecture/adr/index.md#notifications)

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'notifications.apps.NotificationsConfig',
    ...
]

# Email channel
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
DEFAULT_FROM_EMAIL = 'noreply@example.com'

# Notification settings
NOTIFICATIONS = {
    'DEFAULT_CHANNEL': 'email',
    'MAX_RETRIES': 5,
    'RETRY_BACKOFF': True,
    'RETRY_BACKOFF_MAX': 3600,  # 1 hour
}
```

## Models

### Notification

Notification record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `notification_type` | CharField | Type identifier |
| `recipient` | ForeignKey | Target user |
| `organization` | ForeignKey | Org context |
| `channel` | CharField | Delivery channel |
| `payload` | JSONField | Notification data |
| `status` | CharField | pending/sent/failed |
| `created_at` | DateTimeField | Creation time |

### NotificationDelivery

Delivery attempt tracking.

| Field | Type | Description |
|-------|------|-------------|
| `notification` | ForeignKey | Parent notification |
| `attempt` | IntegerField | Attempt number |
| `status` | CharField | success/failed |
| `error_message` | TextField | Error details |
| `sent_at` | DateTimeField | Attempt time |

## API Endpoints

### User Notifications

```http
# List notifications
GET /api/v1/notifications/
Authorization: Bearer <token>

# Mark as read
POST /api/v1/notifications/{id}/read/

# Mark all as read
POST /api/v1/notifications/read-all/
```

### Admin Endpoints

```http
# Send notification (admin)
POST /api/v1/admin/notifications/
{
  "notification_type": "welcome",
  "recipient_id": "uuid",
  "channel": "email",
  "payload": {"name": "John"}
}

# Get delivery status
GET /api/v1/admin/notifications/{id}/deliveries/
```

## Usage Examples

### Sending Notifications

```python
from notifications.api import notify

# Send single notification
notify(
    notification_type='password_reset',
    recipient=user,
    channel='email',
    payload={
        'reset_link': 'https://...',
        'expires_in': '1 hour',
    }
)

# Send to organization
from notifications.api import notify_organization

notify_organization(
    notification_type='announcement',
    organization=org,
    channel='in_app',
    payload={
        'title': 'System Maintenance',
        'message': 'Scheduled for Sunday.',
    }
)
```

### Template-Based Notifications

```python
# notifications/templates/email/welcome.html
"""
<h1>Welcome {{ name }}!</h1>
<p>Thank you for joining {{ organization }}.</p>
"""

# Send with template
notify(
    notification_type='welcome',
    recipient=user,
    template='email/welcome.html',
    context={
        'name': user.first_name,
        'organization': org.name,
    }
)
```

### Channel Configuration

```python
# Per-type channel config
NOTIFICATION_CHANNELS = {
    'password_reset': ['email'],
    'welcome': ['email', 'in_app'],
    'mention': ['in_app', 'email'],
    'webhook_event': ['webhook'],
}

# User preferences override
user_prefs = UserNotificationPreference.objects.get(user=user)
if 'email' not in user_prefs.enabled_channels:
    # Skip email, use in_app only
```

## Delivery Channels

### Email

```python
from notifications.channels import EmailChannel

class EmailChannel:
    def send(self, notification):
        send_mail(
            subject=notification.payload.get('subject'),
            message=notification.payload.get('body'),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.recipient.email],
        )
```

### In-App

```python
class InAppChannel:
    def send(self, notification):
        notification.status = 'delivered'
        notification.save()
        # In-app notifications are stored, not "sent"
```

### Webhook

```python
class WebhookChannel:
    def send(self, notification):
        response = requests.post(
            notification.payload['webhook_url'],
            json=notification.payload['data'],
            headers={'X-Signature': sign(notification.payload)},
            timeout=30,
        )
        response.raise_for_status()
```

## Retry Policy

Following ADR-016, failed deliveries are retried:

```python
@shared_task(
    bind=True,
    autoretry_for=(TransientError,),
    retry_backoff=True,
    retry_backoff_max=3600,
    max_retries=5,
)
def deliver_notification(self, notification_id):
    notification = Notification.objects.get(id=notification_id)
    channel = get_channel(notification.channel)

    try:
        channel.send(notification)
        notification.mark_delivered()
    except TransientError:
        raise  # Will retry
    except PermanentError as e:
        notification.mark_failed(str(e))
```

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 4 minutes |
| 4 | 16 minutes |
| 5 | 1 hour |

## User Preferences

```python
class UserNotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)

    # Per-type overrides
    type_preferences = models.JSONField(default=dict)
    # {"mentions": {"email": false, "in_app": true}}
```

## Related Features

- [Accounts](./accounts.md) - User recipients
- [Tasks](./tasks.md) - Async delivery via Celery
- [Async Patterns](../architecture/async-patterns.md)
