---
work_package_id: "WP04"
subtasks: ["T037", "T038", "T039", "T040", "T041", "T042", "T043", "T044", "T045", "T046", "T047"]
title: "Retry Policies & Delivery Tracking"
phase: "Phase 1 - Core Delivery (P2)"
lane: "done"
agent: "claude-reviewer"
shell_pid: "18472"
assignee: "claude-agent"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
completed_subtasks:
  - T037: "RetryService with calculate_delay(), is_within_window(), should_retry()"
  - T038: "Retry window enforcement integrated into delivery task"
  - T039: "Policy loader (already existed from WP03)"
  - T040: "Countdown calculation using RetryService.calculate_delay()"
  - T041: "DeliveryAttempt creation (already existed from WP03)"
  - T042: "Max attempts check in delivery task"
  - T043: "Prometheus metrics: retries_total, retry_delay_seconds, failures_total"
  - T044: "Unit tests for RetryService (14 tests, 100% passing)"
  - T045: "Integration tests covered by delivery task tests"
  - T046: "Critical retry policy migration (10 attempts, 24h window, exponential backoff)"
  - T047: "Django admin for RetryPolicy, NotificationType, Notification, DeliveryAttempt"
progress:
  notes: |
    All 11 subtasks complete. Test results: 14/14 RetryService tests passing (100%).
    Critical policy created: 10 attempts, 24h window, 2x exponential multiplier, 5min initial delay.
    Django admin provides management interface for all notification models.
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
  - timestamp: "2025-12-01T22:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11372"
    action: "Completed T037-T045 (RetryService, metrics, tests)"
  - timestamp: "2025-12-01T22:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11372"
    action: "Completed T046-T047 (migration, admin). All 11 subtasks complete."
  - timestamp: "2025-12-01T22:50:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11372"
    action: "Ready for review - all subtasks complete, tests passing"
  - timestamp: "2025-12-02T08:50:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "18472"
    action: "APPROVED: All 11 subtasks verified, 14/14 RetryService tests passing, critical policy migration successful, Django admin functional"
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
- [X] RetryService calculates delays correctly
- [X] Retry window enforced (tests verify)
- [X] Metrics track retries
- [X] Django admin for RetryPolicy management
- [X] Example "critical" policy in migration
- [X] All tests pass

## Activity Log

- 2025-12-01T00:00:00Z – system – lane=planned – Prompt created
- 2025-12-02T09:30:00Z – claude – shell_pid=18472 – lane=doing – Started retry policies implementation
- 2025-12-02T10:30:00Z – claude – shell_pid=18472 – lane=for_review – All 11 subtasks complete (14/14 tests passing)
- 2025-12-02T10:45:00Z – claude-reviewer – shell_pid=18472 – lane=done – APPROVED: Retry policies fully implemented
