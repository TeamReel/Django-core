# Notifications Troubleshooting Guide

This guide helps diagnose and resolve common issues with the Notifications system.

## Common Issues

### Notifications Stuck in "Pending" Status

**Symptoms:**
- Notifications created but never delivered
- Status remains `pending` indefinitely
- No `DeliveryAttempt` records created

**Causes & Solutions:**

1. **Celery worker not running**
   ```powershell
   # Check if Celery is running
   celery -A config inspect active

   # Start worker if needed
   celery -A config worker -l info
   ```

2. **Redis broker unavailable**
   ```powershell
   # Check Redis connection
   redis-cli ping
   # Should return: PONG

   # Check Celery broker connection
   celery -A config inspect ping
   ```

3. **Task queue backlog**
   ```powershell
   # Check queue depth
   redis-cli llen celery

   # Monitor queue in real-time
   celery -A config inspect reserved
   ```

**Resolution:**
```python
# Force re-queue pending notifications
from notifications.tasks.delivery_tasks import deliver_notification
from notifications.models import Notification

pending = Notification.objects.filter(status="pending")
for n in pending:
    deliver_notification.delay(str(n.id))
```

---

### Email Delivery Failures

**Symptoms:**
- Notifications fail with SMTP errors
- `DeliveryAttempt.error_message` contains connection errors

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | SMTP server unreachable | Check `EMAIL_HOST` and `EMAIL_PORT` |
| `Authentication failed` | Bad credentials | Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` |
| `TLS handshake failed` | TLS config mismatch | Check `EMAIL_USE_TLS` vs `EMAIL_USE_SSL` |
| `Relay access denied` | Not authorized to send | Configure SPF/DKIM or use authorized sender |

**Debugging:**
```python
# Test email configuration
from django.core.mail import send_mail

try:
    send_mail(
        subject="Test Email",
        message="Testing SMTP configuration",
        from_email=None,  # Uses DEFAULT_FROM_EMAIL
        recipient_list=["test@example.com"],
        fail_silently=False,
    )
    print("Email sent successfully!")
except Exception as e:
    print(f"Email failed: {e}")
```

**Configuration Checklist:**
```python
# settings.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587              # TLS: 587, SSL: 465
EMAIL_USE_TLS = True          # For port 587
EMAIL_USE_SSL = False         # For port 465
EMAIL_HOST_USER = 'user@example.com'
EMAIL_HOST_PASSWORD = 'app-password'  # Use app password for Gmail
DEFAULT_FROM_EMAIL = 'noreply@example.com'
```

---

### Webhook Delivery Failures

**Symptoms:**
- Webhook notifications fail
- HTTP errors in delivery attempts

**Common Errors:**

| Status | Cause | Solution |
|--------|-------|----------|
| `400` | Invalid payload format | Check recipient's expected format |
| `401` | Authentication failed | Verify API key/token |
| `403` | Signature verification failed | Check `WEBHOOK_SECRET_KEY` |
| `404` | Endpoint not found | Verify recipient URL |
| `500` | Recipient server error | Check recipient's logs |
| `Timeout` | Slow endpoint | Increase timeout or optimize endpoint |

**Testing Webhook Delivery:**
```python
# Test webhook endpoint manually
import requests
import hmac
import hashlib
import json
import time

payload = {"type": "test", "data": {"message": "ping"}}
timestamp = int(time.time())
secret = "your-webhook-secret"

message = f"{timestamp}.{json.dumps(payload, sort_keys=True)}"
signature = hmac.new(
    secret.encode(),
    message.encode(),
    hashlib.sha256
).hexdigest()

response = requests.post(
    "https://example.com/webhook",
    json=payload,
    headers={
        "X-Notification-Signature": f"t={timestamp},v1={signature}",
        "Content-Type": "application/json",
    },
    timeout=30,
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
```

---

### Webhook Signature Verification Failures

**Symptoms:**
- Recipient rejects webhooks with 401/403
- Signature mismatch errors

**Common Causes:**

1. **Wrong secret key**
   ```python
   # Verify both sides use same secret
   from django.conf import settings
   print(settings.WEBHOOK_SECRET_KEY)
   ```

2. **Payload serialization mismatch**
   ```python
   # Signature uses sorted JSON
   import json
   payload = {"b": 2, "a": 1}
   sorted_payload = json.dumps(payload, sort_keys=True)
   # Result: '{"a": 1, "b": 2}'
   ```

3. **Timestamp drift**
   ```python
   # Check server time
   import time
   print(f"Server time: {int(time.time())}")
   # Compare with recipient's time (within 5 minutes)
   ```

4. **Character encoding**
   ```python
   # Ensure UTF-8 encoding
   message = f"{timestamp}.{payload_json}".encode("utf-8")
   ```

**See:** [Webhook Signature Verification](webhook-signature-verification.md) for complete examples.

---

### In-App Notifications Not Appearing

**Symptoms:**
- In-app notifications created but not visible
- API returns empty results

**Checklist:**

1. **Check notification exists:**
   ```python
   from notifications.models import Notification
   Notification.objects.filter(
       channel="in_app",
       recipient="user-uuid"
   ).values("id", "status", "is_read")
   ```

2. **Verify user ID format:**
   ```python
   # In-app uses user UUID, not email
   str(user.id)  # Correct: "550e8400-e29b-41d4-a716-446655440000"
   user.email    # Wrong: "user@example.com"
   ```

3. **Check read filter:**
   ```python
   # API may filter read notifications by default
   # GET /api/v1/notifications/?is_read=false
   ```

4. **Check channel:**
   ```python
   # Ensure using in_app channel
   notification = Notification.objects.get(id="...")
   print(notification.channel)  # Should be "in_app"
   ```

---

### Query Performance Issues

**Symptoms:**
- Slow notification list queries
- Database timeouts
- High CPU on database

**Diagnosis:**
```python
from django.db import connection

# Check if indexes exist
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'notifications_notification'
    """)
    for row in cursor.fetchall():
        print(row)
```

**Required Indexes:**
```sql
-- Check these indexes exist
CREATE INDEX idx_notification_status ON notifications_notification(status);
CREATE INDEX idx_notification_recipient ON notifications_notification(recipient);
CREATE INDEX idx_notification_created ON notifications_notification(created_at);
CREATE INDEX idx_notification_type ON notifications_notification(notification_type_id);

-- For in-app unread queries
CREATE INDEX idx_notification_in_app_unread
ON notifications_notification(recipient, is_read)
WHERE channel = 'in_app';
```

**Add Missing Indexes:**
```python
# Create migration
# src/notifications/migrations/0004_add_performance_indexes.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0003_create_high_priority_policy"),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_notification_in_app_unread
            ON notifications_notification(recipient, is_read)
            WHERE channel = 'in_app';
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_notification_in_app_unread;",
        ),
    ]
```

---

### Retry Policy Not Working

**Symptoms:**
- Failed notifications not retrying
- Immediate failure without attempts

**Diagnosis:**
```python
from notifications.models import Notification, NotificationType

# Check notification type has retry policy
ntype = NotificationType.objects.get(code="password_reset")
print(f"Retry policy: {ntype.retry_policy}")
print(f"Max attempts: {ntype.retry_policy.max_attempts}")

# Check attempt count
notification = Notification.objects.get(id="...")
attempts = notification.delivery_attempts.count()
print(f"Attempts: {attempts}/{ntype.retry_policy.max_attempts}")
```

**Common Issues:**

1. **No retry policy assigned:**
   ```python
   # Assign default policy
   from notifications.models import RetryPolicy
   policy = RetryPolicy.objects.get(code="best-effort")
   ntype.retry_policy = policy
   ntype.save()
   ```

2. **Retry window expired:**
   ```python
   from django.utils import timezone
   from datetime import timedelta

   window = ntype.retry_policy.retry_window_hours
   cutoff = timezone.now() - timedelta(hours=window)

   if notification.created_at < cutoff:
       print("Retry window expired - no more retries")
   ```

3. **Max attempts reached:**
   ```python
   if attempts >= ntype.retry_policy.max_attempts:
       print("Max attempts reached - status should be 'failed'")
   ```

---

### Celery Beat Not Scheduling

**Symptoms:**
- Cleanup task never runs
- Scheduled notifications not sent

**Diagnosis:**
```powershell
# Check beat is running
celery -A config beat --loglevel=info

# Check schedule in database/redis
celery -A config inspect scheduled
```

**Configuration Check:**
```python
# settings.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_tasks.cleanup_old_notifications',
        'schedule': crontab(hour=2, minute=0),
    },
}
```

**Manual Trigger:**
```python
from notifications.tasks.cleanup_tasks import cleanup_old_notifications
cleanup_old_notifications.delay(retention_days=90)
```

---

## Health Check Interpretation

### Endpoint
```
GET /api/v1/notifications/health/
```

### Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| `ok` | All systems operational | None required |
| `degraded` | Partial functionality | Investigate warnings |
| `down` | Critical failure | Immediate attention |

### Response Fields

```json
{
  "status": "degraded",
  "checks": {
    "smtp": {"status": "ok", "latency_ms": 45},
    "celery": {"status": "warning", "queue_depth": 1500},
    "database": {"status": "ok", "latency_ms": 2}
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Thresholds

| Check | Warning | Critical |
|-------|---------|----------|
| Queue depth | > 1000 | > 5000 |
| SMTP latency | > 1000ms | Connection fail |
| DB latency | > 100ms | > 500ms |

---

## Log Analysis

### Enable Debug Logging
```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'notifications': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

### Key Log Patterns

```
# Successful delivery
INFO notifications.tasks.delivery: Delivered notification_id=... channel=email

# Retry scheduled
INFO notifications.services.retry: Scheduling retry notification_id=... attempt=2 delay=300

# Max attempts reached
WARNING notifications.services.retry: Max attempts reached notification_id=... marking failed

# Channel error
ERROR notifications.channels.email: SMTP error notification_id=... error="Connection refused"
```

---

## Contact Support

If issues persist after following this guide:

1. Collect logs from the time period
2. Note the notification IDs affected
3. Check Prometheus metrics for patterns
4. Review recent configuration changes
5. Check for related issues in the project tracker

## See Also

- [Architecture Overview](notifications-baseline.md)
- [Configuration Reference](notifications-baseline.md#configuration)
- [Extension Guide](notifications-extension-guide.md)
