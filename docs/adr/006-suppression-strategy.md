# ADR 006: Suppression Strategy

**Status**: Accepted  
**Date**: 2025-12-03  
**Deciders**: Architecture Team  
**Context**: B17 Contextual Notification Service

## Context and Problem Statement

Users can receive many notifications in short timeframes (e.g., 10 project updates in 5 minutes). We need a strategy to prevent notification fatigue while ensuring important updates aren't missed.

The system must decide:
1. When to suppress duplicate notifications?
2. What defines a "duplicate"?
3. How long should suppression windows last?
4. Should suppressed notifications be lost or queued?

## Decision Drivers

- **User experience**: Prevent notification spam
- **Information loss**: Don't miss critical updates
- **Performance**: Fast suppression checks (Redis-based)
- **Flexibility**: Different suppression rules per event type
- **Auditability**: Track suppressed notifications for debugging

## Considered Options

### Option 1: Time-Based Windows (Selected)
- Suppress notifications for same `(user, event_type, resource_id)` within a time window
- Default window: 5 minutes
- First notification goes through immediately
- Subsequent notifications for same resource are suppressed
- Window resets after expiry

**Example**:
```
10:00:00 - project.updated (project_123) → ✅ Delivered
10:02:00 - project.updated (project_123) → ⊗ Suppressed (within 5min window)
10:06:00 - project.updated (project_123) → ✅ Delivered (window expired)
```

### Option 2: Batch and Delay
- Queue notifications within a time window
- Deliver summary notification after window expires
- E.g., "Project Alpha was updated 5 times in the last 10 minutes"

**Pros**: No information loss, summary is useful  
**Cons**: Delayed delivery, complex batching logic, harder to implement

### Option 3: Rate Limiting Only
- Limit notifications per user per time period (e.g., 10/minute)
- No resource-specific suppression
- Just prevent user from receiving too many notifications total

**Pros**: Simple, protects user from spam  
**Cons**: Loses context (which resource?), can miss important updates

## Decision Outcome

**Chosen option: Time-Based Windows (Option 1)**

### Implementation Details

**Suppression Key Format**:
```
suppression:{user_id}:{event_type}:{resource_id}
```

**Example**:
```
suppression:42:project.updated:project_123
```

**Redis Operations**:
```python
# Check if suppressed
key = f"suppression:{user_id}:{event_type}:{resource_id}"
if redis.get(key):
    # Suppressed - don't send notification
    return False
else:
    # Not suppressed - send notification and set suppression
    redis.setex(key, 300, "1")  # 5 minutes = 300 seconds
    return True
```

### Suppression Windows by Event Type

| Event Type | Window (seconds) | Rationale |
|-----------|------------------|-----------|
| project.updated | 300 (5 min) | Frequent, low urgency |
| project.created | 0 (none) | Rare, always notify |
| project.deleted | 0 (none) | Rare, always notify |
| project.member_added | 60 (1 min) | Multiple adds can happen |
| task.assigned | 0 (none) | Always important |
| task.completed | 120 (2 min) | Moderate frequency |
| task.overdue | 0 (none) | Urgent, always notify |
| org.member_invited | 60 (1 min) | Batch invites common |

**Configuration**: Suppression windows are configurable per event type in `settings.py`:

```python
NOTIFICATION_SUPPRESSION_WINDOWS = {
    "project.updated": 300,
    "project.member_added": 60,
    "task.completed": 120,
    # Default for unspecified events
    "default": 300,
}
```

### Resource ID Strategy

**Resource ID** uniquely identifies the entity triggering the event:

| Event Type | Resource ID Format |
|-----------|-------------------|
| project.updated | `project_{project_id}` |
| project.member_added | `project_{project_id}_user_{new_user_id}` |
| task.assigned | `task_{task_id}` |
| task.completed | `task_{task_id}` |
| org.member_invited | `org_{org_id}_invite_{invite_id}` |

**Why include entity type?**
- Prevents collisions (task ID 42 vs project ID 42)
- Makes debugging easier (clear what resource was involved)

**Why include secondary IDs (e.g., new_user_id)?**
- Adding user A to project X is different from adding user B to project X
- Both should notify, even if within suppression window

## Consequences

### Positive

- **Simple**: Easy to understand and implement
- **Fast**: Redis SET/GET operations are O(1)
- **Effective**: Prevents notification storms
- **Transparent**: Audit log shows suppressed notifications
- **Configurable**: Windows can be tuned per event type

### Negative

- **Information loss**: Subsequent updates within window are lost (not queued)
- **Redis dependency**: System must handle Redis failures gracefully
- **Resource ID required**: Developers must provide `resource_id` in events

### Mitigation

**Redis Failure Handling**:
```python
try:
    if redis.get(suppression_key):
        return False  # Suppressed
except redis.ConnectionError:
    # Redis down - fail open (allow notification)
    logger.warning("Redis unavailable, suppression disabled")
    return True
```

**Resource ID Best Practices**:
- Always include `resource_id` in event context
- Use consistent format: `{entity_type}_{id}`
- Document resource ID formats in event type registry

**Audit Logging**:
- Log suppressed notifications with reason: `"suppressed_within_window"`
- Include time since last notification in metadata
- Allows debugging: "Why didn't user X see update Y?"

## Alternative Considered: Quiet Hours Integration

We also considered integrating suppression with **Quiet Hours** (ADR from PolicyService):
- During quiet hours (22:00-08:00), rate limit to N notifications/minute
- Combines time-based suppression with organization policies

**Decision**: Keep separate
- Suppression prevents duplicates (same resource)
- Quiet hours prevent spam (too many notifications total)
- Both operate independently: suppression → quiet hours → handoff

## Related Decisions

- **ADR 005**: Routing Evaluation Order (deduplication at different layer)
- **PolicyService**: Quiet hours and rate limiting (organization-level)

## Performance Considerations

**Redis Memory Usage**:
- Each suppression key: ~100 bytes
- 10,000 active suppressions: ~1 MB
- Keys expire automatically (TTL), no manual cleanup needed

**Scalability**:
- Redis handles millions of keys easily
- SET/GET operations are O(1)
- No clustering required for MVP (single Redis instance sufficient)

**Monitoring**:
- Track suppression hit rate: `suppressed_count / total_events`
- Alert if suppression rate > 80% (indicates configuration issue)
- Expose `/metrics` endpoint with suppression stats

## Testing Strategy

**Unit Tests**:
```python
def test_suppression_within_window():
    """First notification delivered, second suppressed."""
    event = create_event(user=42, resource_id="project_123")
    
    # First notification
    assert not is_suppressed(event)  # Not suppressed
    
    # Second notification within window
    assert is_suppressed(event)  # Suppressed

def test_suppression_window_expires():
    """After window, notification delivered again."""
    event = create_event(user=42, resource_id="project_123")
    
    # First notification
    assert not is_suppressed(event)
    
    # Fast-forward 6 minutes
    time.sleep(360)
    
    # Window expired, notification delivered
    assert not is_suppressed(event)
```

**Integration Tests**:
- Test with real Redis instance
- Verify TTL expiry
- Test Redis connection failures (fail-open behavior)

## References

- [SuppressionService Implementation](../../src/contextual_notifications/services/suppression_service.py)
- [PolicyService](../../src/contextual_notifications/services/policy_service.py)
- [Redis Documentation](https://redis.io/commands/setex)
