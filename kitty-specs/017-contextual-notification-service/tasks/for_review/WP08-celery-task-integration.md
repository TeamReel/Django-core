---
work_package_id: "WP08"
subtasks: ["T056", "T057", "T058", "T059", "T060", "T061", "T062"]
title: "Celery Task Integration & Async Processing"
phase: "Phase 1 - Core Routing"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "13508"
implementation_commit: "c9015fe"
review_status: "acknowledged"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
  - timestamp: "2025-12-03T15:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation - Celery Task Integration & Async Processing"
  - timestamp: "2025-12-03T15:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    commit: "a7c9bc4"
    action: "Completed implementation - Complete async routing pipeline with Celery task orchestrating all services (Routing→Preferences→Suppression→Handoff)"
  - timestamp: "2025-12-03T16:00:00Z"
    lane: "planned"
    agent: "claude-reviewer"
    shell_pid: "13508"
    action: "Code review complete - Critical bug: RoutingService.route_event() signature mismatch"
  - timestamp: "2025-12-03T16:15:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Addressing review feedback - fixing RoutingService.route_event() signature mismatch"
  - timestamp: "2025-12-03T16:20:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    commit: "c9015fe"
    action: "Addressed feedback: Fixed RoutingService.route_event() signature mismatch (commit c9015fe). Changed from unpacked arguments to passing event_dict parameter."
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Critical Issues**:

1. **RoutingService.route_event() Signature Mismatch** - Lines 94-98 of routing_tasks.py call `RoutingService.route_event()` with individual keyword arguments (`event_type=`, `org_id=`, `project_id=`, `actor_user_id=`), but the actual service method signature in [routing_service.py](../../../src/contextual_notifications/services/routing_service.py#L51) expects a **single `event_dict: dict[str, Any]` parameter**. This will cause an immediate `TypeError` at runtime.

   **Why it's a problem**: The task will crash on the first execution with "route_event() got unexpected keyword arguments". This breaks the entire event→notification pipeline.

   **Fix**: Change line 94-98 from:
   ```python
   target_users = RoutingService.route_event(
       event_type=event_type,
       org_id=context.get("org_id"),
       project_id=context.get("project_id"),
       actor_user_id=context.get("actor_user_id"),
   )
   ```
   
   To:
   ```python
   target_users = RoutingService.route_event(event_dict)
   ```

**What Was Done Well**:
- ✅ Excellent Celery configuration (retry logic, exponential backoff, max 10min)
- ✅ Comprehensive helper functions (`_apply_preference_filtering`, `_apply_suppression`) with proper batching
- ✅ Structured logging at every pipeline stage with appropriate log levels
- ✅ Prometheus metrics for task duration and status tracking
- ✅ Detailed result dict with counts at each filtering step (target/filtered/unsuppressed/created)
- ✅ Proper error handling with Celery retry on exceptions
- ✅ Resource ID extraction logic for suppression (project:X, task:X patterns)
- ✅ Channel-grouped preference filtering for efficiency

**Action Items** (must complete before re-review):
- [X] Fix RoutingService.route_event() call to pass `event_dict` instead of individual arguments (line 94-98) - **FIXED in commit c9015fe**
- [X] Verify the fix by checking that RoutingService.route_event() signature in routing_service.py matches the task call - **VERIFIED: signatures match**
- [ ] Consider adding a simple smoke test to validate the end-to-end flow (optional but recommended)

# WP08 – Celery Task Integration & Async Processing

## Objectives

Wire all services into Celery task for async event processing. Complete event→notification flow.

**Success**: Emit event via EventService → Celery task routes → preferences → suppression → B16 → audit.

## Key Subtasks

- T056: Complete `route_event_task` implementation
- T057: Wire service calls: EventService → RoutingService → PreferenceService → SuppressionService → HandoffService → AuditService
- T058: Error handling + retries (max 3, exponential backoff)
- T059: Task execution time metrics
- T060: Configure Celery routing (default queue)
- T061: Structured logging (start, success, failure, retry)
- T062: Test idempotency

## Implementation

- Task: `@shared_task(autoretry_for=(Exception,), retry_backoff=True) route_event_task(event_dict)`
- Flow: validate → route → filter prefs → check suppression → dispatch B16 → log audit
- Idempotency: suppression ensures no duplicates

## Definition of Done

- [ ] End-to-end flow works (event → notification)
- [ ] Retry logic functional
- [ ] Idempotent task execution

## Dependencies

- WP02-WP07 (all services)
- B15 (Celery configured)
