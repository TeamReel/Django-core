---
work_package_id: "WP02"
subtasks: ["T009", "T010", "T011", "T012", "T013", "T014", "T015", "T016"]
title: "Event Service & Validation"
phase: "Phase 0 - Setup & Foundation"
lane: "done"
assignee: "GitHub Copilot"
agent: "claude-reviewer"
shell_pid: "13508"
review_status: "approved"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-02T19:45:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T10:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation - Event Service & Validation"
  - timestamp: "2025-12-03T10:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Completed implementation - All subtasks (T009-T016) complete. EventService with validation, Celery integration, logging, and metrics implemented."
  - timestamp: "2025-12-03T10:46:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Ready for review - Event emission API with schema validation complete"
  - timestamp: "2025-12-03T11:00:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "13508"
    action: "Code review approved - All subtasks completed correctly. EventService matches contracts/event-emission-api.md exactly. Validation comprehensive, logging structured, metrics instrumented. Excellent implementation quality."
---

# WP02 – Event Service & Validation

## Objectives

Create event emission API (`EventService.emit_event()`) with schema validation, making it easy for domain code to emit events without coupling to notification implementation details.

**Success**: Domain code can call `EventService.emit_event(event_type, context, payload)`, events are validated and queued to Celery asynchronously.

## Context

- **Event Schema**: `{"type": str, "context": dict, "payload": dict}` per contracts/event-emission-api.md
- **Validation**: event_type matches `^[a-z0-9._]+$`, context.org_id required, payload.title/body required
- **Fire-and-forget**: emit_event() returns None, completes in <5ms (validation only, no DB)
- **Async handoff**: Celery task `route_event_task` scheduled for actual routing

## Subtasks

### T009 – Create EventService with emit_event() method
- File: `src/contextual_notifications/services/event_service.py`
- Class: `EventService` with static method `emit_event(event_type: str, context: dict, payload: dict) -> None`
- Validates event structure, calls Celery task, returns None

### T010 – Implement event schema validation
- Validate event_type format: regex `^[a-z0-9._]+$`
- Validate context: org_id required (int), project_id/user_id/resource_id optional
- Validate payload: title/body required (non-empty strings)
- Raise custom ValidationError with detailed field errors

### T011 – Create custom exceptions
- File: `src/contextual_notifications/exceptions.py`
- Classes: `EventServiceError(Exception)`, `ValidationError(Exception)`

### T012 – Add type hints
- All service methods have type hints
- Import typing types: `Dict[str, Any]`, `Optional`, etc.

### T013 – Create Celery task stub
- File: `src/contextual_notifications/tasks/routing_tasks.py`
- Task: `@shared_task route_event_task(event_dict: dict) -> None`
- Placeholder implementation (will be completed in WP08)

### T014 – Integrate Celery task call
- In emit_event(), after validation: `route_event_task.delay(event_dict)`
- Handle Celery errors gracefully (log warning, don't raise to caller)

### T015 [P] – Add structured logging
- Log valid events: `logger.info("Event emitted", extra={"event_type": event_type, "org_id": context['org_id']})`
- Log invalid events: `logger.warning("Event validation failed", extra={"errors": validation_errors})`

### T016 [P] – Add Prometheus metrics
- Counter: `events_emitted_total{event_type}` (total events)
- Counter: `events_validation_failed_total{error_type}` (validation failures)

## Definition of Done

- [ ] EventService.emit_event() accepts valid events and queues to Celery
- [ ] Invalid events raise ValidationError with clear error messages
- [ ] Logging and metrics are instrumented
- [ ] Type hints on all service methods
- [ ] Documentation in docstrings

## Review Guidance

Test: Emit valid event → Celery task queued. Emit invalid event → ValidationError raised with field-specific errors.
