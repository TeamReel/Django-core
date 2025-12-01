---
work_package_id: "WP03"
subtasks:
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
  - "T036"
title: "Email Channel Implementation (MVP)"
phase: "Phase 1 - Core Delivery (P1)"
lane: "doing"
assignee: ""
agent: "system"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – Email Channel Implementation (MVP) 🎯

## Objectives & Success Criteria

**Goal**: Implement email notification delivery via SMTP with async Celery tasks, retry logic, and delivery tracking (User Story 1).

**Success Criteria**:
- [ ] Can create email notification via API → Celery task queued → SMTP delivery attempted → status updated → delivery attempts recorded
- [ ] Email templates render with variable substitution
- [ ] Retry logic respects RetryPolicy from NotificationType
- [ ] SMTP errors distinguished (permanent vs transient)
- [ ] All email delivery tests pass (unit + integration)
- [ ] SMTP configuration in environment variables (no secrets in code)
- [ ] User Story 1 acceptance scenarios fully satisfied

## Context & Constraints

**User Story 1** (from spec.md):
> A developer triggers an email notification (e.g., password reset, account verification) using a simple API. The system stores the notification with its delivery status, attempts delivery asynchronously via B15 task scheduling, and retries on failure according to the notification type's retry policy. Operators can inspect the notification status to diagnose delivery issues.

**Acceptance Scenarios**:
1. ✅ Developer calls API → notification "pending" + B15 task queued
2. ✅ Task executes successfully → status "sent" + delivery timestamp
3. ✅ Task fails (transient error) → retries per policy + attempt count updated
4. ✅ Max retries exhausted → status "failed" + error details stored
5. ✅ Operator queries status → sees failure reason, attempt history, timestamps

**Related Decisions** (from research.md):
- **Retry Strategy**: Use Celery built-in (`autoretry_for`, `retry_backoff`) driven by RetryPolicy model
- **Templates**: Django template system for consistency, product overrides via template loaders
- **Channel Pattern**: NotificationChannel ABC with explicit send(), validate_recipient() methods

## Subtasks & Detailed Guidance

### T022 – Create NotificationChannel ABC
**Purpose**: Define plugin contract for all notification channels (email, in-app, webhook).

**File**: `src/notifications/channels/base.py`

**Implementation**:
```python
from abc import ABC, abstractmethod
from typing import Dict, Any
from notifications.models import Notification

class NotificationChannel(ABC):
    """Base class for notification delivery channels."""

    @abstractmethod
    def send(self, notification: Notification) -> Dict[str, Any]:
        """
        Send notification via this channel.

        Args:
            notification: Notification instance to send

        Returns:
            Dict with delivery metadata (status_code, response, duration_ms, etc.)

        Raises:
            ChannelError: On delivery failure (transient or permanent)
        """
        pass

    @abstractmethod
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate recipient format for this channel.

        Args:
            recipient: Recipient identifier (email, URL, user ID)

        Returns:
            True if valid format, False otherwise
        """
        pass

    def validate_config(self) -> None:
        """
        Validate channel-specific configuration.

        Raises:
            ConfigurationError: If required config missing
        """
        pass  # Optional override
```

**Also create**: `src/notifications/channels/exceptions.py` with:
- `ChannelError(Exception)`: Base exception
- `TransientChannelError(ChannelError)`: Retryable errors
- `PermanentChannelError(ChannelError)`: Non-retryable errors

---

### T023 – Implement EmailChannel
**Purpose**: Concrete implementation for SMTP email delivery.

**File**: `src/notifications/channels/email.py`

**Implementation**:
```python
from typing import Dict, Any
from django.core.mail import send_mail
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
from .base import NotificationChannel
from .exceptions import TransientChannelError, PermanentChannelError
import time

class EmailChannel(NotificationChannel):
    def __init__(self):
        self.email_validator = EmailValidator()

    def validate_recipient(self, recipient: str) -> bool:
        try:
            self.email_validator(recipient)
            return True
        except ValidationError:
            return False

    def send(self, notification: Notification) -> Dict[str, Any]:
        start_time = time.time()

        # Extract email payload
        subject = notification.payload.get('subject', '')
        body_html = notification.payload.get('body_html', '')
        body_text = notification.payload.get('body_text', body_html)  # Fallback to HTML

        try:
            send_mail(
                subject=subject,
                message=body_text,
                from_email=None,  # Uses DEFAULT_FROM_EMAIL setting
                recipient_list=[notification.recipient],
                html_message=body_html if body_html else None,
                fail_silently=False,
            )

            duration_ms = int((time.time() - start_time) * 1000)
            return {
                'outcome': 'success',
                'duration_ms': duration_ms,
            }

        except SMTPException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            # Check SMTP response code
            if hasattr(e, 'smtp_code'):
                if 500 <= e.smtp_code < 600:
                    # Permanent failure (5xx)
                    raise PermanentChannelError(f"SMTP error {e.smtp_code}: {str(e)}")
                else:
                    # Transient failure (4xx)
                    raise TransientChannelError(f"SMTP error {e.smtp_code}: {str(e)}")
            else:
                # Unknown error, treat as transient
                raise TransientChannelError(f"SMTP error: {str(e)}")
```

**Notes**:
- Use Django's send_mail() for SMTP integration
- SMTP settings from Django settings (configured in T036)
- Distinguish permanent (5xx) vs transient (4xx) errors
- Return duration_ms for metrics

---

### T024 – Create Django email templates
**Purpose**: Template files for email rendering.

**Files**:
- `src/notifications/templates/notifications/email/default_subject.txt`
- `src/notifications/templates/notifications/email/default_body.html`
- `src/notifications/templates/notifications/email/default_body.txt`

**default_subject.txt**:
```django
{{ subject }}
```

**default_body.html**:
```django
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ subject }}</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        {{ body|safe }}
    </div>
</body>
</html>
```

**default_body.txt**:
```django
{{ body }}
```

**Notes**:
- Simple templates for "default" notification type
- Products override via template loaders (TEMPLATES DIRS)
- Context: `subject`, `body`, `data` (custom payload), `metadata`

---

### T025 – Implement TemplateService
**Purpose**: Render email templates with variable substitution.

**File**: `src/notifications/services/template_service.py`

**Implementation**:
```python
from django.template.loader import render_to_string
from typing import Dict, Any

class TemplateService:
    def render_email(self, notification_type_code: str, context: Dict[str, Any]) -> Dict[str, str]:
        """
        Render email templates for given notification type.

        Args:
            notification_type_code: NotificationType.code (e.g., 'default')
            context: Template context dict

        Returns:
            Dict with 'subject', 'body_html', 'body_text'
        """
        template_base = f'notifications/email/{notification_type_code}'

        subject = render_to_string(f'{template_base}_subject.txt', context).strip()
        body_html = render_to_string(f'{template_base}_body.html', context)
        body_text = render_to_string(f'{template_base}_body.txt', context)

        return {
            'subject': subject,
            'body_html': body_html,
            'body_text': body_text,
        }
```

**Usage**:
```python
service = TemplateService()
rendered = service.render_email('default', {
    'subject': 'Welcome!',
    'body': 'Thank you for signing up.',
})
# Use rendered['subject'], rendered['body_html'] in notification.payload
```

---

### T026 – Create Celery delivery task
**Purpose**: Async task for email delivery with retry integration.

**File**: `src/notifications/tasks/delivery_tasks.py`

**Implementation**:
```python
from celery import shared_task
from django.utils import timezone
from notifications.models import Notification, DeliveryAttempt
from notifications.channels.email import EmailChannel
from notifications.channels.exceptions import TransientChannelError, PermanentChannelError

@shared_task(bind=True, autoretry_for=(TransientChannelError,))
def deliver_email_notification(self, notification_id: str):
    """
    Deliver email notification with retry logic.

    Args:
        notification_id: UUID of Notification to deliver
    """
    from django.db import transaction

    # Load notification with related data (avoid N+1)
    notification = Notification.objects.select_related(
        'type', 'type__retry_policy'
    ).get(pk=notification_id)

    # Get retry policy
    policy = notification.type.retry_policy

    # Create DeliveryAttempt record
    attempt = DeliveryAttempt.objects.create(
        notification=notification,
        attempt_number=self.request.retries + 1,
        attempted_at=timezone.now(),
    )

    try:
        # Attempt delivery
        channel = EmailChannel()
        result = channel.send(notification)

        # Update attempt with success
        attempt.outcome = 'success'
        attempt.duration_ms = result.get('duration_ms')
        attempt.save()

        # Update notification status atomically
        with transaction.atomic():
            notification.status = 'sent'
            notification.updated_at = timezone.now()
            notification.save()

    except PermanentChannelError as e:
        # Permanent failure - don't retry
        attempt.outcome = 'permanent_failure'
        attempt.error_message = str(e)
        attempt.save()

        notification.status = 'failed'
        notification.save()

    except TransientChannelError as e:
        # Transient failure - retry if within policy
        attempt.outcome = 'transient_failure'
        attempt.error_message = str(e)
        attempt.save()

        # Check retry window
        elapsed = (timezone.now() - notification.created_at).total_seconds()
        if elapsed > policy.retry_window_seconds:
            # Outside retry window - mark as failed
            notification.status = 'failed'
            notification.save()
        elif self.request.retries >= policy.max_attempts - 1:
            # Max attempts reached - mark as failed
            notification.status = 'failed'
            notification.save()
        else:
            # Retry (see T027 for countdown calculation)
            delay = self._calculate_retry_delay(policy, self.request.retries + 1)
            raise self.retry(countdown=delay, max_retries=policy.max_attempts)

    def _calculate_retry_delay(self, policy, attempt_number):
        # Implemented in T027 (RetryService)
        pass
```

---

### T027 – Integrate Celery retry with RetryPolicy
**Purpose**: Map RetryPolicy parameters to Celery task retry behavior.

**Implementation** (add to delivery_tasks.py):
```python
def _calculate_retry_delay(self, policy, attempt_number):
    """
    Calculate delay for next retry based on policy.

    Args:
        policy: RetryPolicy instance
        attempt_number: Current attempt (1-indexed)

    Returns:
        Delay in seconds
    """
    if policy.backoff_strategy == 'exponential':
        delay = policy.initial_delay_seconds * (policy.backoff_multiplier ** (attempt_number - 1))
    else:  # linear
        delay = policy.initial_delay_seconds * attempt_number

    # Cap delay to fit within retry window
    max_delay = policy.retry_window_seconds / policy.max_attempts
    return min(delay, max_delay)
```

**Notes**:
- Exponential: delay = initial * (multiplier ^ attempt)
- Linear: delay = initial * attempt
- Cap at retry_window / max_attempts to ensure all retries fit

---

### T028 – Create DeliveryAttempt before each retry
**Already implemented in T026** - DeliveryAttempt.objects.create() before send()

---

### T029 – Email recipient validation
**Already implemented in T023** - EmailChannel.validate_recipient() using EmailValidator

---

### T030 – SMTP error handling
**Already implemented in T023** - Distinguish 5xx (permanent) vs 4xx (transient)

---

### T031 – Atomic status updates
**Already implemented in T026** - Use transaction.atomic() with select_for_update()

**Enhanced implementation** (if needed):
```python
with transaction.atomic():
    notification = Notification.objects.select_for_update().get(pk=notification_id)
    if notification.status != 'pending':
        return  # Already processed
    notification.status = 'sent'
    notification.save()
```

---

### T032-T034 – Tests
**Files**:
- `tests/notifications/channels/test_email.py`
- `tests/notifications/services/test_template_service.py`
- `tests/notifications/integration/test_email_delivery.py`

**test_email.py** (unit tests):
```python
import pytest
from unittest.mock import patch, Mock
from notifications.channels.email import EmailChannel
from notifications.channels.exceptions import TransientChannelError, PermanentChannelError

@pytest.mark.django_db
class TestEmailChannel:
    def test_validate_recipient_valid_email(self):
        channel = EmailChannel()
        assert channel.validate_recipient('user@example.com') is True

    def test_validate_recipient_invalid_email(self):
        channel = EmailChannel()
        assert channel.validate_recipient('not-an-email') is False

    @patch('django.core.mail.send_mail')
    def test_send_success(self, mock_send_mail, notification_factory):
        notification = notification_factory(
            channel='email',
            recipient='user@example.com',
            payload={'subject': 'Test', 'body_text': 'Message'},
        )

        channel = EmailChannel()
        result = channel.send(notification)

        assert result['outcome'] == 'success'
        assert 'duration_ms' in result
        mock_send_mail.assert_called_once()

    @patch('django.core.mail.send_mail')
    def test_send_permanent_failure(self, mock_send_mail, notification_factory):
        mock_send_mail.side_effect = SMTPException()
        mock_send_mail.side_effect.smtp_code = 550  # 5xx permanent

        notification = notification_factory(channel='email')
        channel = EmailChannel()

        with pytest.raises(PermanentChannelError):
            channel.send(notification)
```

**test_email_delivery.py** (integration):
```python
import pytest
from notifications.models import Notification, DeliveryAttempt
from notifications.tasks.delivery_tasks import deliver_email_notification

@pytest.mark.django_db
class TestEmailDeliveryIntegration:
    @patch('notifications.channels.email.send_mail')
    def test_full_email_delivery_flow(self, mock_send_mail, notification_type_factory):
        # Create notification
        notification_type = notification_type_factory()
        notification = Notification.objects.create(
            type=notification_type,
            channel='email',
            recipient='user@example.com',
            payload={'subject': 'Test', 'body_text': 'Message'},
            status='pending',
        )

        # Execute delivery task
        deliver_email_notification(str(notification.id))

        # Verify notification status updated
        notification.refresh_from_db()
        assert notification.status == 'sent'

        # Verify delivery attempt recorded
        assert DeliveryAttempt.objects.filter(notification=notification).count() == 1
        attempt = DeliveryAttempt.objects.get(notification=notification)
        assert attempt.outcome == 'success'
```

---

### T035 – Structured logging
**Add to delivery task** (T026):
```python
import logging

logger = logging.getLogger(__name__)

# In deliver_email_notification():
logger.info(
    "Email notification delivery started",
    extra={
        'notification_id': str(notification.id),
        'notification_type': notification.type.code,
        'recipient_hash': hashlib.sha256(notification.recipient.encode()).hexdigest(),
        'attempt_number': attempt.attempt_number,
    }
)

# On success:
logger.info(
    "Email notification delivered successfully",
    extra={'notification_id': str(notification.id), 'duration_ms': result['duration_ms']}
)

# On failure:
logger.error(
    "Email notification delivery failed",
    extra={'notification_id': str(notification.id), 'error': str(e), 'outcome': attempt.outcome}
)
```

**Notes**:
- Hash recipients (no PII in logs)
- Include notification_id for tracing
- Log success, failure, retry events

---

### T036 – SMTP configuration
**File**: `src/config/settings/base.py` or `local.py`

**Add**:
```python
# Email configuration (SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('SMTP_HOST', 'smtp.example.com')
EMAIL_PORT = int(os.getenv('SMTP_PORT', '587'))
EMAIL_USE_TLS = os.getenv('SMTP_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('SMTP_USER', 'notifications@example.com')
EMAIL_HOST_PASSWORD = os.getenv('SMTP_PASSWORD')  # Required, no default
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@example.com')

# Fail if SMTP_PASSWORD not set (production safety)
if not EMAIL_HOST_PASSWORD and not DEBUG:
    raise ImproperlyConfigured("SMTP_PASSWORD environment variable required")
```

**Environment variables** (.env):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=True
SMTP_USER=notifications@example.com
SMTP_PASSWORD=your_smtp_password_here
DEFAULT_FROM_EMAIL=noreply@example.com
```

## Definition of Done

- [ ] NotificationChannel ABC created with typed interface (T022)
- [ ] EmailChannel implemented with SMTP delivery (T023)
- [ ] Email templates created for "default" type (T024)
- [ ] TemplateService renders templates (T025)
- [ ] Celery delivery task queues email (T026)
- [ ] Retry logic integrated with RetryPolicy (T027)
- [ ] DeliveryAttempt created before each send (T028)
- [ ] Email validation via EmailValidator (T029)
- [ ] SMTP errors classified correctly (T030)
- [ ] Status updates atomic with row locking (T031)
- [ ] All unit tests pass (T032-T033)
- [ ] Integration test validates end-to-end flow (T034)
- [ ] Structured logging implemented (T035)
- [ ] SMTP settings in environment (T036)
- [ ] User Story 1 acceptance scenarios satisfied

## Activity Log

- 2025-12-01T00:00:00Z – system – lane=planned – Prompt created
- 2025-12-01T20:07:59Z – system – shell_pid= – lane=doing – Starting email channel implementation
