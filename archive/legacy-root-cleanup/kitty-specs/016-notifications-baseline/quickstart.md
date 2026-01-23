# Quickstart: Notifications Baseline
*Path: [kitty-specs/016-notifications-baseline/quickstart.md](kitty-specs/016-notifications-baseline/quickstart.md)*

**Feature**: B16 Notifications Baseline
**Audience**: Developers integrating notifications into products
**Time**: 15 minutes

## Prerequisites

- Django 5.1+ installed
- PostgreSQL database configured
- Celery workers running (B15 task scheduling)
- SMTP server credentials (for email notifications)

---

## Setup

### 1. Install & Migrate

```bash
# Run migrations
cd src
python manage.py migrate notifications

# Verify baseline data seeded
python manage.py shell
>>> from notifications.models import NotificationType, RetryPolicy
>>> NotificationType.objects.filter(code='default').exists()
True
>>> RetryPolicy.objects.filter(name='best-effort').exists()
True
```

### 2. Configure SMTP (Email Channel)

Add to your environment or `config/settings/local.py`:

```python
# Email configuration (required for email notifications)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'notifications@example.com'
EMAIL_HOST_PASSWORD = os.getenv('SMTP_PASSWORD')  # Store in environment
DEFAULT_FROM_EMAIL = 'noreply@example.com'
```

### 3. Configure Webhook Signing (Optional, for Webhook Channel)

```bash
# Generate signing key
export WEBHOOK_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

Add to `.env` or environment:
```
WEBHOOK_SECRET_KEY=your_generated_key_here
```

---

## Your First Notification

### Send an Email Notification

```python
from notifications.api import NotificationService

# Initialize service
service = NotificationService()

# Send email notification
notification = service.create_notification(
    notification_type='default',  # Use baseline type
    channel='email',
    recipient='user@example.com',
    payload={
        'subject': 'Welcome to Our Platform',
        'body': 'Thank you for signing up!',
    }
)

print(f"Notification created: {notification.id}")
print(f"Status: {notification.status}")  # "pending"
```

**What happens next**:
1. Notification saved to database with `status="pending"`
2. Celery task queued for async delivery
3. Task sends via SMTP, updates status to "sent" or "failed"
4. Retry logic kicks in on transient failures (up to 3 attempts over 1 hour)

---

## Check Notification Status

### Via API (Recommended)

```bash
# Query notification status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/notifications/{notification_id}/
```

Response:
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "default",
    "channel": "email",
    "recipient": "user@example.com",
    "status": "sent",
    "created_at": "2025-12-01T10:00:00Z",
    "updated_at": "2025-12-01T10:01:30Z"
  },
  "meta": {}
}
```

### Via Django Shell

```python
from notifications.models import Notification, DeliveryAttempt

# Get notification
notification = Notification.objects.get(id='123e4567-...')
print(f"Status: {notification.status}")

# View delivery attempts
attempts = notification.deliveryattempt_set.all()
for attempt in attempts:
    print(f"Attempt {attempt.attempt_number}: {attempt.outcome} at {attempt.attempted_at}")
    if attempt.error_message:
        print(f"  Error: {attempt.error_message}")
```

---

## Common Use Cases

### 1. Send In-App Notification to User

```python
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='user@example.com')

notification = service.create_notification(
    notification_type='default',
    channel='in_app',
    recipient_user=user,  # Link to user
    payload={
        'title': 'New Feature Available',
        'message': 'Check out our latest update!',
        'action_url': '/features/new',
    }
)
```

**Query unread in-app notifications**:
```python
from notifications.models import Notification

unread = Notification.objects.filter(
    recipient_user=user,
    channel='in_app',
    read_at__isnull=True
).order_by('-created_at')
```

**Mark as read**:
```python
notification.mark_as_read()  # Sets read_at = now()
```

---

### 2. Send Webhook Notification

```python
notification = service.create_notification(
    notification_type='default',
    channel='webhook',
    recipient='https://example.com/webhooks/notifications',
    payload={
        'event': 'user.signup',
        'user_id': '12345',
        'timestamp': '2025-12-01T10:00:00Z',
    }
)
```

**Webhook payload sent**:
```http
POST https://example.com/webhooks/notifications
Content-Type: application/json
X-Notification-Signature: t=1733054400,v1=abc123def456...

{
  "notification_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "default",
  "timestamp": "2025-12-01T10:00:00Z",
  "data": {
    "event": "user.signup",
    "user_id": "12345",
    "timestamp": "2025-12-01T10:00:00Z"
  }
}
```

**Verify webhook signature (recipient side)**:
```python
import hmac
import hashlib
import os

def verify_webhook_signature(timestamp, signature, payload_json):
    secret = os.getenv('WEBHOOK_SECRET_KEY').encode()
    message = f"{timestamp}{payload_json}".encode()
    expected_sig = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected_sig)

# In webhook handler
sig_header = request.headers.get('X-Notification-Signature')
timestamp, signature = sig_header.split(',')
timestamp = timestamp.split('=')[1]
signature = signature.split('=')[1]

if verify_webhook_signature(timestamp, signature, request.body.decode()):
    # Process webhook
    pass
else:
    return HttpResponse(status=401)  # Invalid signature
```

---

### 3. Create Custom Notification Type

```python
from notifications.models import NotificationType, RetryPolicy

# Create critical retry policy (more aggressive)
critical_policy = RetryPolicy.objects.create(
    name='critical',
    max_attempts=10,
    retry_window_seconds=86400,  # 24 hours
    backoff_strategy='exponential',
    backoff_multiplier=2.0,
    initial_delay_seconds=300,  # 5 minutes
)

# Create password reset notification type
password_reset_type = NotificationType.objects.create(
    code='password_reset',
    name='Password Reset',
    description='Password reset email notifications',
    default_channel='email',
    retry_policy=critical_policy,
)

# Use custom type
notification = service.create_notification(
    notification_type='password_reset',  # Your custom type
    channel='email',
    recipient='user@example.com',
    payload={
        'subject': 'Reset Your Password',
        'body': 'Click the link to reset your password: ...',
        'reset_token': 'abc123',
    }
)
```

---

### 4. Query Notification History

```python
from notifications.models import Notification
from django.utils import timezone
from datetime import timedelta

# Get all failed notifications in last 24 hours
failed_recent = Notification.objects.filter(
    status='failed',
    created_at__gte=timezone.now() - timedelta(hours=24)
).select_related('type')

for notification in failed_recent:
    print(f"{notification.type.code}: {notification.recipient} - Failed")

    # Get failure reason from last attempt
    last_attempt = notification.deliveryattempt_set.order_by('-attempt_number').first()
    if last_attempt:
        print(f"  Reason: {last_attempt.error_message}")
```

---

## Testing

### Unit Test Example

```python
from django.test import TestCase
from notifications.models import Notification, NotificationType
from notifications.api import NotificationService

class NotificationTests(TestCase):
    def setUp(self):
        self.service = NotificationService()
        self.default_type = NotificationType.objects.get(code='default')

    def test_create_email_notification(self):
        """Test creating an email notification."""
        notification = self.service.create_notification(
            notification_type='default',
            channel='email',
            recipient='test@example.com',
            payload={'subject': 'Test', 'body': 'Test body'},
        )

        self.assertEqual(notification.status, 'pending')
        self.assertEqual(notification.channel, 'email')
        self.assertEqual(notification.type, self.default_type)

    def test_invalid_email_recipient(self):
        """Test validation rejects invalid email addresses."""
        with self.assertRaises(ValidationError):
            self.service.create_notification(
                notification_type='default',
                channel='email',
                recipient='not-an-email',
                payload={'subject': 'Test', 'body': 'Test'},
            )
```

### Integration Test Example (with Celery)

```python
from django.test import TestCase
from unittest.mock import patch
from notifications.tasks import deliver_email
from notifications.models import Notification

class EmailDeliveryTests(TestCase):
    @patch('notifications.tasks.send_mail')
    def test_email_delivery_success(self, mock_send_mail):
        """Test successful email delivery updates status."""
        notification = Notification.objects.create(
            type=NotificationType.objects.get(code='default'),
            channel='email',
            recipient='test@example.com',
            payload={'subject': 'Test', 'body': 'Test body'},
            status='pending',
        )

        # Mock successful SMTP send
        mock_send_mail.return_value = 1

        # Execute task synchronously
        deliver_email(notification.id)

        # Verify status updated
        notification.refresh_from_db()
        self.assertEqual(notification.status, 'sent')

        # Verify delivery attempt recorded
        attempt = notification.deliveryattempt_set.first()
        self.assertEqual(attempt.outcome, 'success')
```

---

## Django Admin

Access notification management at `/admin/notifications/`:

- **Notifications**: View all notifications, filter by status/type/channel
- **Notification Types**: Create/edit custom types, assign retry policies
- **Retry Policies**: Configure retry behavior (max attempts, backoff)
- **Delivery Attempts**: Audit trail for debugging failed deliveries

---

## Troubleshooting

### Notifications stuck in "pending" status

**Symptom**: Notifications created but not delivered

**Causes**:
1. Celery workers not running
2. SMTP configuration incorrect
3. Webhook endpoint unreachable

**Debug**:
```bash
# Check Celery workers
celery -A config inspect active

# Check delivery attempts
python manage.py shell
>>> from notifications.models import Notification, DeliveryAttempt
>>> n = Notification.objects.get(id='...')
>>> n.deliveryattempt_set.all()  # Check for errors
```

---

### Email delivery fails with "Connection refused"

**Symptom**: DeliveryAttempt shows SMTP connection error

**Fix**:
```python
# Verify SMTP settings in settings.py
from django.core.mail import send_mail
send_mail('Test', 'Test', 'from@example.com', ['to@example.com'])
```

If this fails, check:
- `EMAIL_HOST` and `EMAIL_PORT` correct
- Firewall allows outbound SMTP
- `EMAIL_USE_TLS` matches server requirements

---

### Webhook signature verification fails

**Symptom**: Webhook receiver rejects signatures

**Debug**:
```python
# Check secret matches on both sides
import os
print(os.getenv('WEBHOOK_SECRET_KEY'))

# Verify signature calculation matches
# (See webhook verification example above)
```

---

## Next Steps

1. **Extend with custom channels**: See [Extension Guide](../docs/notifications-extension-guide.md) for implementing SMS, push notifications
2. **Create product-specific types**: Add password_reset, invoice_due, etc. via Django admin
3. **Customize email templates**: Override templates in your product's template directory
4. **Monitor metrics**: Integrate Prometheus metrics (exposed via `/metrics` endpoint)
5. **Review audit logs**: Check B09 audit system for critical notification events

---

## API Reference

Full API documentation available at `/api/docs/` (drf-spectacular OpenAPI schema).

**Key endpoints**:
- `POST /api/notifications/` - Create notification
- `GET /api/notifications/{id}/` - Get notification status
- `GET /api/notifications/` - List notifications (paginated, filterable)
- `PATCH /api/notifications/{id}/read/` - Mark in-app notification as read (in-app only)
- `GET /api/notifications/types/` - List notification types

---

**Questions?** See full documentation in `docs/notifications-baseline.md` or extension guide in `docs/notifications-extension-guide.md`.
