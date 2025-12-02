# Quickstart Guide: Contextual Notification Service
*Path: [quickstart.md](quickstart.md)*

**Feature**: B17 Contextual Notification Service
**Version**: 1.0.0
**Estimated Setup Time**: 15 minutes

## What is B17?

B17 is a routing layer that sits between your domain code and B16 (notification delivery). It determines **who** gets notified **when** something happens in your system, via **which channels**, based on configurable rules.

**Key Benefits**:
- 📋 Configure notification routing without code changes
- 👥 Respect user preferences automatically
- 🔕 Suppress duplicate notifications
- 🏢 Support organisation-level policies (quiet hours)
- 🔍 Full audit trail for debugging

## Architecture Overview

```
Domain Code (projects, tasks, etc.)
    ↓
EventService.emit_event()  ← You call this
    ↓
RoutingService evaluates rules
    ↓
B16 NotificationService delivers
    ↓
Users receive notifications
```

## Quick Start

### Step 1: Emit Events from Domain Code

When something happens in your domain (project updated, task assigned, etc.), emit an event:

```python
from contextual_notifications.services import EventService

# Example: In your project save logic
EventService.emit_event(
    event_type="project.updated",
    context={
        "org_id": project.organisation_id,
        "project_id": project.id,
        "user_id": request.user.id,  # Actor
        "resource_id": f"project_{project.id}",  # For suppression
    },
    payload={
        "title": f"Project '{project.name}' updated",
        "body": f"{request.user.get_full_name()} updated project {project.name}",
        "url": f"/projects/{project.id}",
    }
)
```

**That's it!** B17 handles the rest asynchronously.

### Step 2: Configure Routing Rules

Create routing rules to determine who gets notified. Start with global rules:

**Via Django Admin** (`/admin/contextual_notifications/routingrule/`):

1. Click "Add Routing Rule"
2. Fill form:
   - **Event Type**: `project.updated`
   - **Scope**: `global`
   - **Target Role**: `project_member`
   - **Priority**: `normal`
   - **Channel**: `in_app`
   - **Enabled**: ✓
3. Save

Now all project members receive in-app notifications when projects are updated.

### Step 3: Let Users Manage Preferences (Optional)

Users can opt out of specific event types:

```python
# In your user preferences view
from contextual_notifications.models import NotificationPreference

# User disables email for project updates
NotificationPreference.objects.update_or_create(
    user=request.user,
    event_type="project.updated",
    channel="email",
    defaults={"enabled": False}
)
```

Or provide a UI using the REST API (see contracts/routing-configuration-api.md).

### Step 4: Debug Routing Decisions

Check the audit log to see why a user did or didn't receive a notification:

**Via Django Admin** (`/admin/audit/auditevent/`):

1. Filter by category: `notification_routing`
2. Find the event by timestamp
3. Check `metadata` field:
   - `matched_rules`: Which rules triggered
   - `target_users`: Who was targeted
   - `selected_channels`: Which channels per user
   - `suppressed_users`: Who was suppressed
   - `preference_filtered_users`: Who opted out

## Common Event Types

### Projects

```python
# Project created
EventService.emit_event(
    event_type="project.created",
    context={"org_id": org.id, "project_id": project.id, "user_id": creator.id},
    payload={"title": "New project created", "body": f"{creator.name} created {project.name}", "url": f"/projects/{project.id}"}
)

# Project updated
EventService.emit_event(
    event_type="project.updated",
    context={"org_id": org.id, "project_id": project.id, "user_id": updater.id, "resource_id": f"project_{project.id}"},
    payload={"title": "Project updated", "body": f"{updater.name} updated {project.name}", "url": f"/projects/{project.id}"}
)

# Project deleted
EventService.emit_event(
    event_type="project.deleted",
    context={"org_id": org.id, "project_id": project.id, "user_id": deleter.id},
    payload={"title": "Project deleted", "body": f"{deleter.name} deleted {project.name}", "url": f"/organisations/{org.id}/projects"}
)
```

### Tasks

```python
# Task assigned
EventService.emit_event(
    event_type="task.assigned",
    context={"org_id": org.id, "project_id": project.id, "user_id": assigner.id, "resource_id": f"task_{task.id}"},
    payload={"title": "Task assigned to you", "body": f"{assigner.name} assigned '{task.title}'", "url": f"/tasks/{task.id}", "assignee_id": assignee.id}
)

# Task completed
EventService.emit_event(
    event_type="task.completed",
    context={"org_id": org.id, "project_id": project.id, "user_id": completer.id, "resource_id": f"task_{task.id}"},
    payload={"title": "Task completed", "body": f"{completer.name} completed '{task.title}'", "url": f"/tasks/{task.id}"}
)
```

### Organisation

```python
# Member invited
EventService.emit_event(
    event_type="organisation.member_invited",
    context={"org_id": org.id, "user_id": inviter.id},
    payload={"title": "New member invited", "body": f"{inviter.name} invited {invitee_email}", "url": f"/organisations/{org.id}/members"}
)

# Member role changed
EventService.emit_event(
    event_type="organisation.member_role_changed",
    context={"org_id": org.id, "user_id": changer.id},
    payload={"title": "Member role updated", "body": f"{changer.name} changed {member.name}'s role to {new_role}", "url": f"/organisations/{org.id}/members"}
)
```

## Routing Rule Examples

### Global Rule (All Organisations)

```python
RoutingRule.objects.create(
    event_type="task.assigned",
    scope="global",
    target_role="assignee",  # Special role: the assignee from payload
    priority=2,  # High priority
    channel="email",
    is_enabled=True
)
```

### Organisation Override

```python
# Acme Corp wants in-app only (no email)
RoutingRule.objects.create(
    event_type="task.assigned",
    scope="org",
    organisation=acme_corp,
    target_role="assignee",
    priority=2,
    channel="in_app",
    is_enabled=True
)
```

### Project-Specific Rule

```python
# Alpha project: notify all project members via email for task completions
RoutingRule.objects.create(
    event_type="task.completed",
    scope="project",
    organisation=acme_corp,
    project=alpha_project,
    target_role="project_member",
    priority=1,
    channel="email",
    is_enabled=True
)
```

## Organisation Policies

### Quiet Hours (Rate Limiting)

```python
from contextual_notifications.models import OrganisationNotificationPolicy
from datetime import time

# Acme Corp: Rate limit to 10 notifications/minute during 22:00-08:00 CET
OrganisationNotificationPolicy.objects.create(
    organisation=acme_corp,
    quiet_hours_enabled=True,
    quiet_hours_start=time(22, 0),
    quiet_hours_end=time(8, 0),
    quiet_hours_timezone="Europe/Amsterdam",
    quiet_hours_rate_limit=10
)
```

During quiet hours, notifications are queued and delivered at 10/minute (not batched at 8am).

## Suppression Windows

Suppress duplicate notifications for the same resource within 5 minutes (default):

```python
# First event: User 7 receives notification
EventService.emit_event(
    event_type="project.updated",
    context={"org_id": 42, "project_id": 123, "user_id": 5, "resource_id": "project_123"},
    payload={...}
)

# Second event within 5 minutes: User 7 does NOT receive notification (suppressed)
EventService.emit_event(
    event_type="project.updated",
    context={"org_id": 42, "project_id": 123, "user_id": 5, "resource_id": "project_123"},
    payload={...}
)
```

Suppression is per (user, event_type, resource_id) combination.

## Integration Patterns

### Django Signal Handler

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from contextual_notifications.services import EventService
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Project)
def notify_project_saved(sender, instance, created, **kwargs):
    """Emit notification event when project is created or updated."""
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

### DRF View Handler

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

## Debugging

### Why didn't user X receive a notification?

1. **Check routing rules**: Are there any rules matching the event type?
   ```python
   RoutingRule.objects.filter(event_type="project.updated", is_enabled=True)
   ```

2. **Check user preferences**: Did the user opt out?
   ```python
   NotificationPreference.objects.filter(user=user, event_type="project.updated", enabled=False)
   ```

3. **Check suppression**: Was the notification suppressed?
   - Check Redis key: `suppression:{user_id}:{event_type}:{resource_id}`
   - Look for recent routing decision in audit log with user in `suppressed_users`

4. **Check audit log**: What did B17 decide?
   - Django admin → Audit Events → Filter by `notification_routing`
   - Check `metadata.target_users` (was user included?)
   - Check `metadata.preference_filtered_users` (did user opt out?)
   - Check `metadata.suppressed_users` (was notification suppressed?)

### Why did user X receive too many notifications?

1. **Check suppression**: Is `resource_id` set correctly in events?
   - Without `resource_id`, suppression doesn't work
   - Must be consistent: always use `project_{id}` format

2. **Check routing rules**: Are there duplicate rules?
   ```python
   # Find duplicate rules (same event + scope + channel)
   from django.db.models import Count
   RoutingRule.objects.values('event_type', 'scope', 'channel').annotate(
       count=Count('id')
   ).filter(count__gt=1)
   ```

3. **Check quiet hours**: Is rate limiting configured?
   ```python
   OrganisationNotificationPolicy.objects.filter(organisation=org, quiet_hours_enabled=True)
   ```

## Performance Tips

### Event Emission

- Emit events **after** domain operation succeeds (in signal handler or after save)
- Always wrap in try/except (don't block domain operations)
- Use `resource_id` for suppression to prevent notification storms

### Routing Rules

- Keep rules simple (AND-only conditions in MVP)
- Use org-scoped rules sparingly (prefer global rules)
- Disable unused rules instead of deleting (maintains audit trail)

### Testing

```python
from unittest.mock import patch
from contextual_notifications.services import EventService

@patch('contextual_notifications.tasks.route_event_task.delay')
def test_project_update_emits_event(mock_delay):
    """Test that project update emits notification event."""
    project = Project.objects.create(name="Test Project", organisation=org)
    project.name = "Updated Project"
    project.save()

    # Check event was emitted
    assert mock_delay.called
    event = mock_delay.call_args[0][0]
    assert event['type'] == 'project.updated'
    assert event['context']['project_id'] == project.id
```

## Next Steps

1. **Define your event types**: What domain events should trigger notifications?
2. **Create global routing rules**: Start with broad rules (all orgs)
3. **Test in staging**: Emit events and verify notifications work
4. **Add user preference UI**: Let users opt out of noisy events
5. **Monitor audit logs**: Track routing decisions for first few weeks
6. **Refine rules**: Add org-specific overrides as needed

## FAQ

**Q: Do I need to configure routing rules for every event type?**
A: Yes. Events without matching routing rules won't trigger notifications. Start with global rules.

**Q: Can I emit events synchronously (wait for routing to complete)?**
A: No. Routing happens asynchronously in Celery workers. This prevents blocking domain operations.

**Q: How do I know if an event was successfully routed?**
A: Check the audit log (`AuditEvent` with `category="notification_routing"`). Every routing decision is logged.

**Q: Can I disable all notifications for an organisation?**
A: Yes. Create an `OrganisationNotificationPolicy` with `quiet_hours_enabled=True` covering 24 hours and `quiet_hours_rate_limit=0`.

**Q: What happens if B16 is down?**
A: B17 logs an error and retries (Celery task retry logic). Notifications are not lost but may be delayed.

**Q: Can I change routing rules without redeploying?**
A: Yes! That's the point of B17. Change rules in Django admin, effective immediately.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No notifications sent | Check routing rules exist and `is_enabled=True` |
| Duplicate notifications | Add `resource_id` to event context for suppression |
| Wrong users notified | Check `target_role` in routing rules |
| User opted out but still receiving | Check `NotificationPreference.enabled` field |
| Quiet hours not working | Check timezone and time range in `OrganisationNotificationPolicy` |
| Routing too slow | Check Celery worker count and queue depth |

## Support

- **Documentation**: `docs/howto/configuring-notification-routing.md`
- **API Reference**: `contracts/routing-configuration-api.md`
- **Data Model**: `data-model.md`
- **Audit Logs**: Django admin → Audit Events → Filter by `notification_routing`
