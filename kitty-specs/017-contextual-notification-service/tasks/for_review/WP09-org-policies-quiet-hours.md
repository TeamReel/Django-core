---
work_package_id: "WP09"
subtasks: ["T063", "T064", "T065", "T066", "T067", "T068", "T069"]
title: "Organisation Notification Policies & Quiet Hours"
phase: "Phase 2 - Configuration & Policies"
lane: "for_review"
review_status: "acknowledged"
reviewed_by: "claude-reviewer"
assignee: "claude"
agent: "claude"
shell_pid: "13508"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
  - timestamp: "2025-12-03T10:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation of organisation policies and quiet hours"
  - timestamp: "2025-12-03T11:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Completed implementation - all subtasks T063-T069 complete"
  - timestamp: "2025-12-03T11:05:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Moved to for_review - ready for code review"
  - timestamp: "2025-12-03T11:15:00Z"
    lane: "planned"
    agent: "claude-reviewer"
    shell_pid: "13508"
    action: "Code review complete: Critical race condition in rate limiting and date arithmetic bug found"
  - timestamp: "2025-12-03T11:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Acknowledged feedback - addressing race condition and date arithmetic bugs"
  - timestamp: "2025-12-03T11:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Addressed feedback: Fixed race condition with atomic cache.incr(), fixed date arithmetic with timedelta, added timedelta import"
  - timestamp: "2025-12-03T12:00:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Moved to for_review - all feedback addressed, ready for re-review"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:

1. **CRITICAL: Race Condition in Rate Limiting** (policy_service.py lines 207-224)
   - Current implementation does non-atomic read-check-read-write sequence
   - Lines 208 and 223 both call `cache.get()` - values can change between reads
   - Multiple concurrent tasks can all read the same count and all increment
   - **Result**: Rate limit can be significantly exceeded under concurrent load
   - **Fix Required**: Use atomic `cache.incr()` method instead
   - **Example Fix**:
     ```python
     # Replace lines 207-224 with:
     current_count = cache.get(redis_key)
     if current_count is None:
         # First time - initialize with 1
         cache.set(redis_key, 1, timeout=60)
         return True
     elif current_count >= policy.quiet_hours_rate_limit:
         # Already at limit
         rate_limited_total.labels(org_id=policy.organisation_id).inc()
         return False
     else:
         # Increment atomically
         try:
             new_count = cache.incr(redis_key)
             if new_count > policy.quiet_hours_rate_limit:
                 # Raced past limit - decrement back but still reject
                 cache.decr(redis_key)
                 rate_limited_total.labels(org_id=policy.organisation_id).inc()
                 return False
             return True
         except ValueError:
             # Key doesn't exist - initialize
             cache.set(redis_key, 1, timeout=60)
             return True
     ```

2. **BUG: Invalid Date Arithmetic** (policy_service.py line 341)
   - `end_datetime.replace(day=end_datetime.day + 1)` will fail at month boundaries
   - Example: December 31st → trying to set day=32 raises ValueError
   - **Fix Required**: Use `timedelta(days=1)` for date arithmetic
   - **Example Fix**:
     ```python
     # Replace line 341 with:
     from datetime import timedelta
     if end_datetime <= local_time:
         end_datetime = end_datetime + timedelta(days=1)
     ```

3. **Missing Import**: `timedelta` not imported but needed for fix #2

**What Was Done Well**:
- ✅ Excellent timezone handling with pytz - correctly handles midnight-spanning quiet hours
- ✅ Comprehensive logging and metrics (4 Prometheus counters/histograms)
- ✅ Graceful degradation pattern (Redis failures don't block routing)
- ✅ Clean service abstraction with `should_deliver_now()` combining all checks
- ✅ Well-documented code with docstrings and examples
- ✅ Type hints throughout
- ✅ Integration into routing flow is clean (Step 2.5 placement is correct)
- ✅ `calculate_delivery_time()` logic is sound (except for the date bug)
- ✅ `is_quiet_hours()` correctly handles midnight spans with start<end check

**Action Items** (must complete before re-review):
- [ ] Fix race condition: Replace get-check-get-set pattern with atomic `cache.incr()`
- [ ] Fix date arithmetic: Use `timedelta(days=1)` instead of `replace(day=...)`
- [ ] Add `from datetime import timedelta` import at top of policy_service.py
- [ ] Test rate limiting under concurrent load (simulate multiple tasks hitting same minute bucket)
- [ ] Verify month boundary handling in `calculate_delivery_time()` (test Dec 31 → Jan 1)

**Testing Notes**:
- Rate limiting needs concurrent testing - single-threaded tests won't catch the race condition
- Consider adding a unit test that spawns multiple threads/tasks hitting the same bucket
- Add edge case test for `calculate_delivery_time()` with dates at month/year boundaries

**Note on TODOs**:
- The TODO for Celery ETA queuing is acceptable - the tracking infrastructure is in place
- Definition of Done item "Notifications queued for post-quiet-hours delivery" is partially met (tracked but not queued)
- Consider this a Phase 2.5 enhancement rather than blocking WP09 approval



# WP09 – Organisation Notification Policies & Quiet Hours

## Objectives

Implement org-level policies including quiet hours rate limiting. User Story 3.

**Success**: Org with quiet hours delivers notifications at configured rate limit during quiet hours.

## Key Subtasks

- T063: Create `services/policy_service.py` with `get_org_policy()`
- T064: Quiet hours detection (check time in org timezone)
- T065: Rate limiting during quiet hours (Redis counter)
- T066: Integrate into routing flow
- T067: Timezone handling (pytz)
- T068-T069: Logging + metrics

## Implementation

- Rate limit: Redis key `rate_limit:{org_id}:{minute_bucket}` TTL 60s
- Check against `quiet_hours_rate_limit` (default 10)
- If exceeded, queue for delivery after quiet hours (Celery ETA)

## Definition of Done

- [ ] Quiet hours detected correctly in org timezone
- [ ] Rate limiting works during quiet hours
- [ ] Notifications queued for post-quiet-hours delivery

## Dependencies

- WP01 (OrganisationNotificationPolicy model)
- WP03-WP05
