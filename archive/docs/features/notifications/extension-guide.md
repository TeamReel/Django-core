# Notifications Extension Guide

This guide explains how to extend the Notifications system with custom channels, notification types, and retry policies.

## Custom Channels

### Overview

Channels define how notifications are delivered. The system includes three built-in channels:
- `email` - SMTP delivery
- `in_app` - Database storage for UI display
- `webhook` - HTTP POST to external endpoints

### Creating a Custom Channel

To create a custom channel (e.g., SMS, push notifications), subclass `NotificationChannel`:

```python
# src/notifications/channels/sms.py
from notifications.channels.base import NotificationChannel
from notifications.models import Notification, DeliveryAttempt
from typing import Dict, Any

class SMSChannel(NotificationChannel):
    """SMS notification delivery via Twilio."""

    name = "sms"

    def __init__(self, twilio_client=None):
        self.client = twilio_client or self._create_client()

    def _create_client(self):
        from twilio.rest import Client
        from django.conf import settings
        return Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )

    def deliver(
        self,
        notification: Notification,
        context: Dict[str, Any]
    ) -> DeliveryAttempt:
        """Send SMS via Twilio.

        Args:
            notification: The notification to deliver
            context: Template context variables

        Returns:
            DeliveryAttempt record with outcome
        """
        try:
            message = self.client.messages.create(
                body=self._render_message(notification, context),
                from_=self._get_from_number(),
                to=notification.recipient
            )

            return DeliveryAttempt.objects.create(
                notification=notification,
                attempt_number=notification.delivery_attempts.count() + 1,
                outcome="success",
                response_data={"sid": message.sid}
            )

        except Exception as e:
            return DeliveryAttempt.objects.create(
                notification=notification,
                attempt_number=notification.delivery_attempts.count() + 1,
                outcome="failure",
                error_message=str(e)
            )

    def _render_message(
        self,
        notification: Notification,
        context: Dict[str, Any]
    ) -> str:
        """Render SMS message from template or payload."""
        # Use payload subject/body or template
        payload = notification.payload or {}
        return payload.get("body", f"Notification: {notification.notification_type.code}")

    def _get_from_number(self) -> str:
        from django.conf import settings
        return settings.TWILIO_FROM_NUMBER
```

### Registering a Custom Channel

Register channels in `apps.py`:

```python
# src/notifications/apps.py
from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    name = "notifications"

    def ready(self):
        from notifications.channels.registry import register_channel
        from notifications.channels.sms import SMSChannel

        # Register custom channel
        register_channel("sms", SMSChannel)
```

### Channel Registry

The channel registry maps channel names to implementations:

```python
# src/notifications/channels/registry.py
from typing import Dict, Type
from notifications.channels.base import NotificationChannel

_channels: Dict[str, Type[NotificationChannel]] = {}

def register_channel(name: str, channel_class: Type[NotificationChannel]) -> None:
    """Register a notification channel."""
    _channels[name] = channel_class

def get_channel(name: str) -> NotificationChannel:
    """Get channel instance by name."""
    if name not in _channels:
        raise ValueError(f"Unknown channel: {name}")
    return _channels[name]()

def available_channels() -> list[str]:
    """List registered channel names."""
    return list(_channels.keys())
```

## Custom Notification Types

### Via Django Admin

1. Navigate to `/admin/notifications/notificationtype/`
2. Click "Add Notification Type"
3. Fill in:
   - **Code**: Unique identifier (e.g., `order_shipped`)
   - **Name**: Human-readable name
   - **Description**: Purpose of this notification
   - **Default Channel**: Which channel to use by default
   - **Retry Policy**: Select existing or create new

### Via Migration

For version-controlled notification types:

```python
# src/notifications/migrations/0002_create_order_types.py
from django.db import migrations

def create_notification_types(apps, schema_editor):
    NotificationType = apps.get_model("notifications", "NotificationType")
    RetryPolicy = apps.get_model("notifications", "RetryPolicy")

    # Get or create retry policy
    critical_policy, _ = RetryPolicy.objects.get_or_create(
        code="critical",
        defaults={
            "max_attempts": 10,
            "backoff_multiplier": 2,
            "retry_window_hours": 24,
        }
    )

    # Create notification type
    NotificationType.objects.get_or_create(
        code="order_shipped",
        defaults={
            "name": "Order Shipped",
            "description": "Sent when an order ships",
            "default_channel": "email",
            "retry_policy": critical_policy,
            "template_name": "notifications/order_shipped.html",
        }
    )

def reverse(apps, schema_editor):
    NotificationType = apps.get_model("notifications", "NotificationType")
    NotificationType.objects.filter(code="order_shipped").delete()

class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_notification_types, reverse),
    ]
```

### Via Service

For runtime creation:

```python
from notifications.services.notification_service import NotificationService

service = NotificationService()

# Create notification type
ntype = service.create_notification_type(
    code="password_reset",
    name="Password Reset",
    default_channel="email",
    retry_policy_code="critical",
    template_name="notifications/password_reset.html",
)
```

## Custom Email Templates

### Template Structure

Email templates use Django's template system:

```
src/templates/notifications/
├── base_email.html          # Base template with common styling
├── password_reset.html      # Password reset notification
├── order_shipped.html       # Order shipped notification
└── welcome.html             # Welcome email
```

### Example Template

```html
<!-- src/templates/notifications/password_reset.html -->
{% extends "notifications/base_email.html" %}

{% block subject %}Reset Your Password{% endblock %}

{% block content %}
<h1>Password Reset Request</h1>

<p>Hello {{ user.first_name }},</p>

<p>You requested to reset your password. Click the link below:</p>

<a href="{{ reset_url }}" class="button">Reset Password</a>

<p>This link expires in {{ expiry_hours }} hours.</p>

<p>If you didn't request this, please ignore this email.</p>
{% endblock %}
```

### Base Template

```html
<!-- src/templates/notifications/base_email.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        {% block content %}{% endblock %}

        <hr>
        <footer>
            <p>{{ organization_name }}</p>
            <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
        </footer>
    </div>
</body>
</html>
```

### Sending with Context

```python
from notifications.services.notification_service import NotificationService

service = NotificationService()

service.send_notification(
    notification_type="password_reset",
    recipient="user@example.com",
    context={
        "user": user,
        "reset_url": f"https://example.com/reset/{token}",
        "expiry_hours": 24,
        "organization_name": "Your Company",
        "unsubscribe_url": f"https://example.com/unsubscribe/{user.id}",
    }
)
```

## Custom Retry Policies

### Creating via Migration

```python
# src/notifications/migrations/0003_create_high_priority_policy.py
from django.db import migrations

def create_retry_policies(apps, schema_editor):
    RetryPolicy = apps.get_model("notifications", "RetryPolicy")

    RetryPolicy.objects.get_or_create(
        code="high-priority",
        defaults={
            "max_attempts": 5,
            "backoff_multiplier": 1.5,
            "initial_delay_seconds": 30,
            "retry_window_hours": 6,
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_create_order_types"),
    ]

    operations = [
        migrations.RunPython(create_retry_policies, migrations.RunPython.noop),
    ]
```

### Policy Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `code` | Unique identifier | Required |
| `max_attempts` | Maximum delivery attempts | 3 |
| `backoff_multiplier` | Exponential backoff factor | 5 |
| `initial_delay_seconds` | First retry delay | 60 |
| `retry_window_hours` | Time window for retries | 1 |

### Backoff Calculation

```
delay = initial_delay * (backoff_multiplier ^ attempt_number)

Example (best-effort, initial=60, multiplier=5):
  Attempt 1 fail: Wait 60 seconds
  Attempt 2 fail: Wait 300 seconds (5 minutes)
  Attempt 3 fail: Wait 1500 seconds (25 minutes) → Give up
```

## Testing Extensions

### Testing Custom Channels

```python
# tests/notifications/test_custom_channel.py
import pytest
from unittest.mock import Mock, patch
from notifications.channels.sms import SMSChannel
from notifications.models import Notification

@pytest.fixture
def mock_twilio():
    with patch("notifications.channels.sms.SMSChannel._create_client") as mock:
        client = Mock()
        client.messages.create.return_value = Mock(sid="SM123")
        mock.return_value = client
        yield client

@pytest.mark.django_db
def test_sms_channel_delivery(mock_twilio, notification_factory):
    """SMS channel delivers via Twilio."""
    notification = notification_factory(channel="sms", recipient="+15551234567")

    channel = SMSChannel()
    attempt = channel.deliver(notification, {"body": "Test message"})

    assert attempt.outcome == "success"
    mock_twilio.messages.create.assert_called_once()
```

### Testing Custom Types

```python
# tests/notifications/test_custom_types.py
import pytest
from notifications.services.notification_service import NotificationService

@pytest.mark.django_db
def test_create_custom_notification_type():
    """Can create custom notification type via service."""
    service = NotificationService()

    ntype = service.create_notification_type(
        code="test_type",
        name="Test Type",
        default_channel="email",
    )

    assert ntype.code == "test_type"
    assert ntype.default_channel == "email"
```

## See Also

- [Architecture Overview](notifications-baseline.md)
- [ADR-016: Retry Policies](adr/016-notification-retry-policies.md)
- [Webhook Signature Verification](webhook-signature-verification.md)
