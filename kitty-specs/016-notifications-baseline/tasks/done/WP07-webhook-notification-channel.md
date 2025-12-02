---
work_package_id: "WP07"
subtasks: ["T071", "T072", "T073", "T074", "T075", "T076", "T077", "T078", "T079", "T080", "T081", "T082", "T083"]
title: "Webhook Notification Channel"
phase: "Phase 3 - Extended Channels (P3)"
lane: "done"
review_status: "approved without changes"
reviewed_by: "claude-sonnet-4"
agent: "claude-sonnet-4"
shell_pid: "11372"
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-02T12:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11372"
    action: "Started implementation"
  - timestamp: "2025-12-02T14:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11372"
    action: "Implementation complete: 39/39 tests passing (100%)"
    commit: "03941c7"
  - timestamp: "2025-12-02T15:00:00Z"
    lane: "done"
    agent: "claude-sonnet-4"
    shell_pid: "11372"
    action: "Code review: Approved without changes - Excellent implementation with 39/39 tests passing, comprehensive documentation, and proper security practices"
    reviewed_by: "claude-sonnet-4"
    commits: ["03941c7", "0019efb"]
---

# WP07 – Webhook Notification Channel

## Objectives
Implement webhook delivery via HTTP POST with signature verification, redirect handling, and timeout enforcement (User Story 5).

## Success Criteria
- HTTP POST sent to webhook URL with JSON payload
- HMAC-SHA256 signature in X-Notification-Signature header
- HTTP status recorded (2xx success, 4xx permanent, 5xx transient)
- Redirects followed (max 3)
- Timeout enforced (30s default)
- Response body truncated (1KB max)

## Key Subtasks

**T071 - WebhookChannel**: `src/notifications/channels/webhook.py`
```python
import requests
from .exceptions import TransientChannelError, PermanentChannelError

class WebhookChannel(NotificationChannel):
    def send(self, notification: Notification) -> Dict[str, Any]:
        payload = {
            'notification_id': str(notification.id),
            'type': notification.type.code,
            'timestamp': timezone.now().isoformat(),
            'data': notification.payload,
        }

        # Generate signature (T072)
        signature = self._generate_signature(payload)

        try:
            response = requests.post(
                url=notification.recipient,
                json=payload,
                headers={'X-Notification-Signature': signature},
                timeout=30,
                allow_redirects=True,
                max_redirects=3,
            )

            # Record response
            return {
                'outcome': 'success' if response.ok else 'transient_failure',
                'http_status_code': response.status_code,
                'response_body_snippet': response.text[:1024],
                'duration_ms': int(response.elapsed.total_seconds() * 1000),
            }
        except requests.Timeout:
            raise TransientChannelError("Webhook timeout")
        except requests.RequestException as e:
            raise TransientChannelError(f"Webhook error: {str(e)}")
```

**T072 - Signature service**: `src/notifications/services/webhook_signature_service.py`
```python
import hmac
import hashlib
import json
from django.conf import settings

class WebhookSignatureService:
    @staticmethod
    def generate_signature(payload: dict, timestamp: int) -> str:
        secret = settings.WEBHOOK_SECRET_KEY.encode()
        message = f"{timestamp}.{json.dumps(payload, sort_keys=True)}".encode()
        signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
        return f"t={timestamp},v1={signature}"
```

**T073 - HTTP timeout**: Already in requests.post(timeout=30)
**T074 - Redirect handling**: requests.post(allow_redirects=True, max_redirects=3)
**T075 - Response recording**: http_status_code, response_body_snippet in DeliveryAttempt
**T076 - 4xx vs 5xx**: Check response.status_code (400-499 permanent, 500-599 transient)
**T077 - Signing key config**: WEBHOOK_SECRET_KEY in environment
**T078 - WebhookEndpoint model**: Optional (for opt-out per endpoint)
**T079 - URL validation**: Use URLValidator from django.core.validators
**T080-T082 - Tests**: Unit tests for WebhookChannel, signature service, integration with mock HTTP server
**T083 - Documentation**: Signature verification examples (Python, Node.js, PHP)

## References
- [research.md](../research.md): Task 4 - Webhook Signature Security
- [spec.md](../spec.md): User Story 5

## Definition of Done
- [ ] WebhookChannel sends HTTP POST
- [ ] HMAC-SHA256 signature generated
- [ ] Redirects followed (max 3)
- [ ] Timeout enforced (30s)
- [ ] HTTP status determines retry (4xx permanent, 5xx transient)
- [ ] Verification examples documented
- [ ] All tests pass
