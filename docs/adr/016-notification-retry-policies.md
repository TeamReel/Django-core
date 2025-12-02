# ADR-016: Notification Retry Policies

**Status:** Accepted
**Date:** 2025-01-15
**Authors:** Engineering Team
**Supersedes:** None

## Context

The Notifications Baseline (B16) requires a mechanism to handle delivery failures gracefully. When notifications fail to deliver (e.g., SMTP timeout, webhook endpoint down), the system needs to decide:

1. Should we retry the delivery?
2. How many times should we retry?
3. How long should we wait between retries?
4. When should we give up and mark as permanently failed?

Different notification types have different importance levels and urgency requirements:
- Password resets are critical and must reach the user
- Marketing emails are best-effort
- Security alerts must be reliably delivered
- In-app notifications have no external delivery to fail

## Decision

We will implement **configurable per-type retry policies with exponential backoff**.

### Design Choices

1. **Per-Type Policies**: Each `NotificationType` can have its own retry policy, allowing fine-grained control over delivery guarantees.

2. **Exponential Backoff**: Retry delays increase exponentially to avoid overwhelming failing services and to handle transient failures efficiently.

3. **Retry Window**: A maximum time window limits how long we attempt retries, preventing indefinite retry loops.

4. **Reusable Policies**: Retry policies are separate entities that can be shared across notification types.

### Data Model

```
RetryPolicy
├── code (unique identifier)
├── max_attempts (integer)
├── initial_delay_seconds (integer)
├── backoff_multiplier (float)
└── retry_window_hours (integer)

NotificationType
├── ... other fields ...
└── retry_policy (FK → RetryPolicy)
```

### Built-in Policies

| Policy | Max Attempts | Initial Delay | Backoff | Window |
|--------|--------------|---------------|---------|--------|
| `best-effort` | 3 | 60s | 5x | 1 hour |
| `critical` | 10 | 30s | 2x | 24 hours |

### Backoff Calculation

```python
def calculate_delay(attempt: int, policy: RetryPolicy) -> int:
    """Calculate delay before next retry.

    delay = initial_delay * (backoff_multiplier ^ attempt_number)
    """
    delay = policy.initial_delay_seconds * (policy.backoff_multiplier ** attempt)
    return min(delay, 3600)  # Cap at 1 hour
```

**Example (best-effort, initial=60s, multiplier=5x):**
- Attempt 1 fails → Wait 60s (1 minute)
- Attempt 2 fails → Wait 300s (5 minutes)
- Attempt 3 fails → Wait 1500s (25 minutes) → Max attempts, mark failed

**Example (critical, initial=30s, multiplier=2x):**
- Attempt 1 fails → Wait 30s
- Attempt 2 fails → Wait 60s
- Attempt 3 fails → Wait 120s (2 minutes)
- ...
- Attempt 10 fails → Mark failed

## Alternatives Considered

### 1. Fixed Delays

**Description:** Wait a constant time between retries (e.g., always 5 minutes).

**Pros:**
- Simple to implement
- Predictable timing

**Cons:**
- Doesn't adapt to transient vs. persistent failures
- May retry too quickly for temporary outages
- May wait too long for quick recoveries

**Decision:** Rejected. Exponential backoff is more adaptive.

### 2. No Retries

**Description:** Fail immediately on first delivery failure.

**Pros:**
- Simplest implementation
- No retry queue management
- Immediate feedback

**Cons:**
- Unacceptable for critical notifications
- Transient network issues cause permanent failures
- Poor user experience

**Decision:** Rejected. Reliability is a core requirement.

### 3. Circuit Breaker Pattern

**Description:** After N consecutive failures to a destination, stop attempting delivery for a cooldown period.

**Pros:**
- Protects failing services from overload
- Reduces wasted resources on known-bad destinations

**Cons:**
- Complex state management
- May delay recovery detection
- Harder to reason about delivery guarantees

**Decision:** Deferred. Could be added later for high-volume scenarios.

### 4. Infinite Retries Until Success

**Description:** Keep retrying forever until delivery succeeds.

**Pros:**
- Guarantees eventual delivery (if possible)
- Simple policy

**Cons:**
- Queue bloat with permanently failing notifications
- No visibility into stuck notifications
- Resource waste

**Decision:** Rejected. Retry window provides bounded failure handling.

### 5. Global Retry Policy

**Description:** Single retry policy for all notification types.

**Pros:**
- Simpler configuration
- Consistent behavior

**Cons:**
- Can't differentiate critical vs. non-critical
- One-size-fits-all doesn't match business requirements

**Decision:** Rejected. Per-type policies provide necessary flexibility.

## Consequences

### Positive

- **Flexibility**: Different notification types can have appropriate retry behavior
- **Reliability**: Critical notifications get more delivery attempts
- **Resource Efficiency**: Best-effort notifications don't waste resources on excessive retries
- **Observability**: Clear status tracking (pending → retrying → sent/failed)
- **Celery Native**: Leverages Celery's countdown feature for scheduled retries

### Negative

- **Complexity**: More configuration options to manage
- **Testing**: Need to test various retry scenarios
- **Monitoring**: Need to track retry metrics and alert on failures

### Neutral

- **Migration**: Existing notifications without retry policies use `best-effort` default
- **Admin UI**: Django admin supports policy management

## Implementation Details

### Celery Task Integration

```python
@shared_task(bind=True, max_retries=None)
def deliver_notification(self, notification_id: str):
    """Deliver notification with retry support."""
    notification = Notification.objects.get(id=notification_id)
    policy = notification.notification_type.retry_policy

    try:
        channel = get_channel(notification.channel)
        channel.deliver(notification, {})
        notification.status = "sent"
        notification.save()

    except Exception as e:
        attempt = notification.delivery_attempts.count()

        if should_retry(notification, policy, attempt):
            delay = calculate_delay(attempt, policy)
            notification.status = "retrying"
            notification.save()
            raise self.retry(countdown=delay)
        else:
            notification.status = "failed"
            notification.save()
```

### Retry Decision Logic

```python
def should_retry(notification, policy, attempt_count):
    """Determine if notification should be retried."""
    # Check max attempts
    if attempt_count >= policy.max_attempts:
        return False

    # Check retry window
    window_end = notification.created_at + timedelta(hours=policy.retry_window_hours)
    if timezone.now() > window_end:
        return False

    return True
```

## Metrics

Track these Prometheus metrics for retry observability:

| Metric | Type | Labels |
|--------|------|--------|
| `notification_retries_total` | Counter | type, attempt_number |
| `notification_retry_exhausted_total` | Counter | type |
| `notification_retry_delay_seconds` | Histogram | type |

## Related Decisions

- ADR-015: Celery Task Scheduling (B15 integration)
- ADR-009: Audit Logging (delivery attempt tracking)

## References

- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Celery Retry Documentation](https://docs.celeryq.dev/en/stable/userguide/tasks.html#retrying)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
