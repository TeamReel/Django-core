# Event Emission API Contract
*Path: [contracts/event-emission-api.md](contracts/event-emission-api.md)*

**Feature**: B17 Contextual Notification Service
**Component**: Event Emission Interface
**Version**: 1.0.0

## Overview

Domain code emits events to the contextual notification service for routing evaluation. Events are simple dicts that describe what happened in the system.

## Event Structure

### Event Schema

```python
{
    "type": str,              # Required: Event type identifier
    "context": {              # Required: Routing context
        "org_id": int,        # Required: Organisation ID
        "project_id": int,    # Optional: Project ID
        "user_id": int,       # Optional: Actor user ID
        "resource_id": str,   # Optional: Generic resource identifier
    },
    "payload": {              # Required: Notification content
        "title": str,         # Required: Notification title
        "body": str,          # Required: Notification body
        "url": str,           # Optional: Action URL
        # Additional payload fields allowed
    }
}
```

### Event Type Naming

- Format: `{domain}.{action}` (e.g., `project.updated`, `task.assigned`)
- Must match pattern: `^[a-z0-9._]+$`
- Use lowercase, alphanumeric, dots, and underscores only
- Be consistent: use past tense (`.created`, `.updated`, `.deleted`)

## Service Interface

### Python API

```python
from contextual_notifications.services import EventService

# Emit an event (synchronous call, schedules async routing)
EventService.emit_event(
    event_type="project.updated",
    context={
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,  # Actor who updated project
    },
    payload={
        "title": "Project 'Alpha' updated",
        "body": "John Doe updated project Alpha",
        "url": "/projects/123",
    }
)
```

**Returns**: `None` (fire-and-forget, routing happens asynchronously)

**Raises**:
- `ValidationError`: Invalid event structure or missing required fields
- `EventServiceError`: Service unavailable or configuration error

### Async Task API (Internal)

```python
from contextual_notifications.tasks import route_event_task

# Called by EventService.emit_event() - not for direct use
route_event_task.delay(event_dict)
```

## Event Examples

### Project Events

```python
# Project created
{
    "type": "project.created",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,
    },
    "payload": {
        "title": "New project 'Alpha' created",
        "body": "John Doe created project Alpha",
        "url": "/projects/123",
    }
}

# Project updated
{
    "type": "project.updated",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,
        "resource_id": "project_123",  # For suppression
    },
    "payload": {
        "title": "Project 'Alpha' updated",
        "body": "John Doe updated project Alpha",
        "url": "/projects/123",
    }
}

# Project deleted
{
    "type": "project.deleted",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,
    },
    "payload": {
        "title": "Project 'Alpha' deleted",
        "body": "John Doe deleted project Alpha",
        "url": "/organisations/42/projects",
    }
}
```

### Task Events

```python
# Task assigned
{
    "type": "task.assigned",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,  # Assigner
        "resource_id": "task_456",
    },
    "payload": {
        "title": "Task assigned to you",
        "body": "John Doe assigned task 'Implement feature X' to you",
        "url": "/tasks/456",
        "assignee_id": 8,  # Custom payload field
    }
}

# Task completed
{
    "type": "task.completed",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 8,  # Completer
        "resource_id": "task_456",
    },
    "payload": {
        "title": "Task completed",
        "body": "Jane Smith completed task 'Implement feature X'",
        "url": "/tasks/456",
    }
}
```

### Organisation Events

```python
# Member invited
{
    "type": "organisation.member_invited",
    "context": {
        "org_id": 42,
        "user_id": 7,  # Inviter
    },
    "payload": {
        "title": "New member invited",
        "body": "John Doe invited alice@example.com to join the organisation",
        "url": "/organisations/42/members",
        "invitee_email": "alice@example.com",
    }
}

# Member role changed
{
    "type": "organisation.member_role_changed",
    "context": {
        "org_id": 42,
        "user_id": 7,  # Who changed role
    },
    "payload": {
        "title": "Member role updated",
        "body": "John Doe promoted Jane Smith to Admin",
        "url": "/organisations/42/members",
        "affected_user_id": 8,
        "new_role": "admin",
    }
}
```

## Validation Rules

### Event Type Validation

- Must be non-empty string
- Must match pattern `^[a-z0-9._]+$`
- Should follow naming convention `{domain}.{action}`

### Context Validation

- `org_id` is required (must be valid organisation ID)
- `project_id` is optional (if provided, must be valid project ID in that org)
- `user_id` is optional (if provided, must be valid user ID)
- `resource_id` is optional (used for suppression deduplication)

### Payload Validation

- `title` is required (non-empty string, max 255 chars)
- `body` is required (non-empty string, max 1000 chars)
- `url` is optional (if provided, must be valid URL path)
- Additional custom fields allowed (will be passed to B16 for rendering)

## Error Handling

### Validation Errors

```python
from django.core.exceptions import ValidationError

try:
    EventService.emit_event(event_type="", context={}, payload={})
except ValidationError as e:
    # e.message_dict contains field-specific errors
    print(e.message_dict)
    # Example: {'event_type': ['This field cannot be blank'], 'context.org_id': ['This field is required']}
```

### Service Errors

```python
from contextual_notifications.exceptions import EventServiceError

try:
    EventService.emit_event(...)
except EventServiceError as e:
    # Log error and continue (don't block domain operation)
    logger.error(f"Failed to emit notification event: {e}")
```

## Integration Pattern

### Domain Model Signal Handler

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from contextual_notifications.services import EventService
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Project)
def notify_project_updated(sender, instance, created, **kwargs):
    """Emit notification event when project is updated."""
    event_type = "project.created" if created else "project.updated"

    try:
        EventService.emit_event(
            event_type=event_type,
            context={
                "org_id": instance.organisation_id,
                "project_id": instance.id,
                "user_id": instance.updated_by_id,
                "resource_id": f"project_{instance.id}",
            },
            payload={
                "title": f"Project '{instance.name}' {'created' if created else 'updated'}",
                "body": f"{instance.updated_by.get_full_name()} {'created' if created else 'updated'} project {instance.name}",
                "url": f"/projects/{instance.id}",
            }
        )
    except Exception as e:
        # Log but don't raise (notifications shouldn't block domain operations)
        logger.error(f"Failed to emit {event_type} event: {e}", exc_info=True)
```

### View/API Handler

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from contextual_notifications.services import EventService
import logging

logger = logging.getLogger(__name__)

class TaskAssignView(APIView):
    def post(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)
        assignee_id = request.data.get('assignee_id')

        # Perform domain operation
        task.assignee_id = assignee_id
        task.save()

        # Emit notification event (non-blocking)
        try:
            EventService.emit_event(
                event_type="task.assigned",
                context={
                    "org_id": task.project.organisation_id,
                    "project_id": task.project_id,
                    "user_id": request.user.id,
                    "resource_id": f"task_{task.id}",
                },
                payload={
                    "title": "Task assigned to you",
                    "body": f"{request.user.get_full_name()} assigned task '{task.title}' to you",
                    "url": f"/tasks/{task.id}",
                    "assignee_id": assignee_id,
                }
            )
        except Exception as e:
            logger.error(f"Failed to emit task.assigned event: {e}", exc_info=True)

        return Response({"status": "ok"})
```

## Performance Considerations

### Synchronous Call Overhead

- `EventService.emit_event()` validates and queues event in <5ms
- Actual routing happens asynchronously in Celery worker
- Does not block domain operations

### Event Volume

- Designed for 1000 events/minute sustained
- Tested to 5000 events/minute burst
- Celery workers scale horizontally if needed

### Error Handling

- Always wrap `emit_event()` in try/except
- Log errors but don't raise (notifications shouldn't break domain logic)
- Failed events are logged for debugging

## Testing

### Unit Test Example

```python
from unittest.mock import patch
from contextual_notifications.services import EventService

def test_emit_event_validates_structure():
    """Test that invalid events raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        EventService.emit_event(
            event_type="",  # Invalid: empty
            context={},  # Invalid: missing org_id
            payload={}  # Invalid: missing title/body
        )

    assert 'event_type' in exc_info.value.message_dict
    assert 'context.org_id' in exc_info.value.message_dict

@patch('contextual_notifications.tasks.route_event_task.delay')
def test_emit_event_schedules_routing_task(mock_delay):
    """Test that valid events are queued for routing."""
    EventService.emit_event(
        event_type="project.updated",
        context={"org_id": 42, "project_id": 123},
        payload={"title": "Test", "body": "Test body"}
    )

    mock_delay.assert_called_once()
    event_dict = mock_delay.call_args[0][0]
    assert event_dict['type'] == "project.updated"
    assert event_dict['context']['org_id'] == 42
```

## Backwards Compatibility

- Event schema is forward-compatible (can add fields to payload)
- Unknown event types are logged but don't error (graceful degradation)
- Service interface is stable (v1.0.0)

## Migration Path

For existing systems using B16 directly:
1. Keep existing B16 direct calls (continue to work)
2. Add B17 event emission for new features
3. Gradually migrate old notification logic to B17 routing rules
4. B16 remains as delivery layer, B17 adds routing layer on top
