# Notifications (B16 - Multi-Channel Notifications)

**Status**: ✅ Complete
**Location**: `src/notifications/`

## Purpose

Provides multi-channel notification delivery infrastructure with support for email, in-app, and webhook notifications with retry logic and delivery tracking.

## Scope

**✅ Included**:
- Multi-channel delivery (email, in-app, webhook)
- Notification type registry and categorization
- Delivery attempt tracking and retry logic
- Template-based message rendering
- Notification filtering and pagination
- Audit logging integration
- Metrics and monitoring

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific notification templates
- Business rule triggers (products define when to send)
- User preference management (handled by settings module)
- Push notifications (mobile/browser)
- SMS delivery

## Key Components

### Models
- **`Notification`**: Core notification entity with channel, recipient, status, and payload
- **`NotificationType`**: Categorization and configuration for notification types
- **`DeliveryAttempt`**: Tracking for each delivery attempt with success/failure details
- **`RetryPolicy`**: Configurable retry behavior with exponential backoff

### Channels
- **`EmailChannel`**: Email delivery via SMTP
- **`InAppChannel`**: Database-backed in-app notifications
- **`WebhookChannel`**: HTTP POST to external endpoints

### Services
- **`NotificationService`**: High-level API for creating and sending notifications
- **`TemplateService`**: Template rendering for notification content
- **`RetryService`**: Retry scheduling and execution logic
- **`NotificationAuditService`**: Audit logging integration

### APIs/Views
- **`GET /api/notifications/`**: List user's notifications (in-app)
- **`GET /api/notifications/{id}/`**: Retrieve single notification
- **`POST /api/notifications/{id}/mark-read/`**: Mark notification as read
- **`POST /api/notifications/mark-all-read/`**: Bulk mark as read

### Tasks
- **`process_notification_queue`**: Celery task for async delivery
- **`retry_failed_notifications`**: Periodic retry of failed deliveries

## Public Interface

**Safe to Import** (Stable API):
```python
from notifications.models import Notification, NotificationType
from notifications.services import create_notification
from notifications.channels import EmailChannel, InAppChannel, WebhookChannel
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from notifications.services.retry_service import _calculate_backoff  # Internal retry logic
from notifications.tasks import _process_single_notification  # Internal task helper
```

## Integration Example

**Create and Send Notification**:
```python
from notifications.services import create_notification

# Create notification with automatic delivery
notification = create_notification(
    notification_type_code="project.created",
    channel="email",
    recipient="user@example.com",
    payload={
        "subject": "New Project Created",
        "body": "Your project has been created successfully.",
        "project_name": "My Project",
    },
    metadata={
        "project_id": 123,
        "created_by": "admin",
    },
)

# Notification is automatically queued for delivery
```

**Query User Notifications**:
```python
from notifications.models import Notification

# Get unread in-app notifications for user
unread = Notification.objects.filter(
    recipient_user=user,
    channel="in_app",
    status="sent",
    read_at__isnull=True,
).order_by("-created_at")

# Mark as read
notification.read_at = timezone.now()
notification.save()
```

**API Usage**:
```bash
# List user's in-app notifications
GET /api/notifications/?status=sent&read=false
Authorization: Bearer <token>

# Response
{
    "count": 5,
    "results": [
        {
            "id": "uuid",
            "type": {"code": "project.created", "name": "Project Created"},
            "channel": "in_app",
            "payload": {"message": "New project available"},
            "created_at": "2024-01-15T10:00:00Z",
            "read_at": null
        }
    ]
}

# Mark notification as read
POST /api/notifications/{id}/mark-read/
Authorization: Bearer <token>
```

## Related Modules

**Dependencies** (This module requires):
- [B05 Accounts] - User model for in-app notifications
- [B09 Audit] - Audit logging for notification events
- [B15 Tasks] - Celery tasks for async delivery
- [B18 Observability] - Metrics for delivery monitoring

**Used By** (Modules that depend on this):
- [B17 Contextual Notifications] - Context-aware notification system
- Product applications - Sending notifications to users

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Notification Types**:
   ```python
   # your_product/notifications.py
   from notifications.models import NotificationType

   # Register product-specific types
   NotificationType.objects.get_or_create(
       code="product.feature.activated",
       defaults={
           "name": "Feature Activated",
           "description": "User activated a premium feature",
           "default_channel": "email",
       }
   )
   ```

2. **Custom Delivery Channels**:
   ```python
   # your_product/channels.py
   from notifications.channels import NotificationChannel

   class SMSChannel(NotificationChannel):
       """Custom SMS delivery channel."""

       def send(self, notification):
           # Implement SMS delivery
           send_sms(notification.recipient, notification.payload["message"])
   ```

3. **Custom Templates**:
   ```python
   # your_product/templates.py
   from notifications.services import TemplateService

   class ProductTemplateService(TemplateService):
       """Product-specific template rendering."""

       def render(self, template_name, context):
           # Add product-specific context
           context["product_name"] = "My Product"
           return super().render(template_name, context)
   ```

4. **Notification Filters**:
   ```python
   # your_product/filters.py
   from notifications.models import Notification

   def get_priority_notifications(user):
       """Get high-priority notifications only."""
       return Notification.objects.filter(
           recipient_user=user,
           metadata__priority="high",
           status="sent",
       )
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    # ...
    "notifications",
]

# Email channel configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.example.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "notifications@example.com"
EMAIL_HOST_PASSWORD = "password"
DEFAULT_FROM_EMAIL = "notifications@example.com"
```

**Environment Variables**:
```bash
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=notifications@example.com
EMAIL_HOST_PASSWORD=your-password
NOTIFICATION_RETRY_MAX_ATTEMPTS=3
NOTIFICATION_RETRY_BACKOFF=exponential
```

**Optional Settings**:
```python
# settings.py (optional)
NOTIFICATION_RETRY_MAX_ATTEMPTS = 3  # Max retry attempts
NOTIFICATION_RETRY_BASE_DELAY = 60  # Base delay in seconds
NOTIFICATION_DEFAULT_CHANNEL = "email"  # Default delivery channel
NOTIFICATION_ENABLE_WEBHOOKS = True  # Enable webhook channel
```

## Testing

**Run Module Tests**:
```bash
pytest tests/notifications/ -v
```

**Key Test Coverage**:
- ✅ Notification creation and delivery
- ✅ Multi-channel delivery (email, in-app, webhook)
- ✅ Retry logic with exponential backoff
- ✅ Delivery attempt tracking
- ✅ Template rendering
- ✅ API endpoint authentication and authorization
- ✅ Mark as read functionality
- ✅ Notification filtering and pagination
- ✅ Audit logging integration

## References

- **Spec**: [documents/02-roadmap/modules/done/016-Bxx-notifications-baseline.md](../../documents/02-roadmap/modules/done/016-Bxx-notifications-baseline.md)
- **Module Doc**: [documents/04-modules/backend/B16-notifications.md](../../documents/04-modules/backend/B16-notifications.md)
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Email notifications not sending
   - **Cause**: Email backend not configured or SMTP credentials incorrect
   - **Solution**: Verify `EMAIL_*` settings and test SMTP connection

2. **Issue**: Notifications stuck in "pending" status
   - **Cause**: Celery workers not running or queue not processing
   - **Solution**: Start Celery workers with `celery -A config worker -l info`

3. **Issue**: Webhook delivery failing
   - **Cause**: Target endpoint unreachable or invalid URL
   - **Solution**: Check `DeliveryAttempt` records for error details

4. **Issue**: Notifications not retrying after failure
   - **Cause**: Retry policy not configured or max attempts reached
   - **Solution**: Check `RetryPolicy` settings and verify retry task is scheduled

5. **Issue**: In-app notifications not appearing
   - **Cause**: `recipient_user` not set correctly
   - **Solution**: Ensure `recipient_user` field is populated for in-app channel

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
