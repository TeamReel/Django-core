---
work_package_id: "WP04"
subtasks: ["T037", "T038", "T039", "T040", "T041", "T042", "T043", "T044", "T045", "T046", "T047"]
title: "Retry Policies & Delivery Tracking"
phase: "Phase 1 - Core Delivery (P2)"
lane: "doing"
agent: "claude"
shell_pid: "11372"
assignee: "claude-agent"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-01T22:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11372"
    action: "Started implementation"
---

# WP04 – Retry Policies & Delivery Tracking

## Objectives
Implement configurable retry policies with exponential backoff, respect retry windows, track all delivery attempts (User Story 2).

## Success Criteria
- Custom RetryPolicy configurations respected (max_attempts, retry_window)
- Exponential backoff calculated correctly: `delay = initial * (multiplier ^ attempt)`
- Retry window enforced (skip retries outside window)
- DeliveryAttempt history queryable
- Metrics track retry behavior
- All tests pass

## Key Subtasks

**T037 - RetryService**: `src/notifications/services/retry_service.py`
```python
class RetryService:
    @staticmethod
    def calculate_delay(policy: RetryPolicy, attempt_number: int) -> int:
        if policy.backoff_strategy == 'exponential':
            delay = policy.initial_delay_seconds * (policy.backoff_multiplier ** (attempt_number - 1))
        else:
            delay = policy.initial_delay_seconds * attempt_number
        max_delay = policy.retry_window_seconds / policy.max_attempts
        return min(int(delay), int(max_delay))

    @staticmethod
    def is_within_window(notification: Notification, policy: RetryPolicy) -> bool:
        elapsed = (timezone.now() - notification.created_at).total_seconds()
        return elapsed < policy.retry_window_seconds
```

**T038 - Retry window enforcement**: Add to delivery task before retry
**T039 - Policy loader**: Already in WP03 (select_related in task)
**T040 - Countdown calculation**: Use RetryService.calculate_delay()
**T041 - DeliveryAttempt creation**: Already in WP03
**T042 - Max attempts check**: In delivery task (if retries >= max_attempts)
**T043 - Prometheus metrics**: `src/notifications/metrics.py`
```python
from prometheus_client import Counter

notification_retries_total = Counter(
    'notification_retries_total',
    'Total retry attempts',
    ['notification_type', 'channel', 'outcome']
)
```

**T044-T045 - Tests**: Unit tests for RetryService, integration tests with mock failures
**T046 - Example policy**: Data migration for "critical" (10 attempts/24 hours)
**T047 - Django admin**: RetryPolicy admin with list_display, search_fields

## References
- [research.md](../research.md): Task 1 - Celery Retry Integration
- [data-model.md](../data-model.md): Section 3 - RetryPolicy

## Definition of Done
- [ ] RetryService calculates delays correctly
- [ ] Retry window enforced (tests verify)
- [ ] Metrics track retries
- [ ] Django admin for RetryPolicy management
- [ ] Example "critical" policy in migration
- [ ] All tests pass
