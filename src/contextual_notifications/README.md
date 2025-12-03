# Contextual Notification Service (B17)

Intelligent notification routing system that determines WHO should be notified, via WHICH channel, based on context (organization, project, user preferences, quiet hours, and rate limits).

## Features

- **Event-Driven Routing**: Route notifications based on event type and context
- **Multi-Scope Rules**: Global, organization, and project-level routing rules
- **User Preferences**: Per-user opt-out preferences for event types and channels
- **Organization Policies**: Quiet hours and rate limiting per organization
- **Suppression Service**: Redis-based deduplication and rate limiting
- **Audit Logging**: Complete routing decision logs via B09 AuditEvent
- **DRF Admin APIs**: Query routing logs and manage preferences
- **Celery Integration**: Async task execution for notification routing

## Architecture

### Services

1. **EventService** (`services/event_service.py`): Event validation and normalization
2. **RoutingService** (`services/routing_service.py`): Rule evaluation and recipient resolution
3. **PreferenceService** (`services/preference_service.py`): User preference filtering
4. **SuppressionService** (`services/suppression_service.py`): Deduplication and rate limiting
5. **PolicyService** (`services/policy_service.py`): Quiet hours and organization policies
6. **HandoffService** (`services/handoff_service.py`): Integration with B16 notification system

### Models

- **RoutingRule**: Define routing behavior per event type and scope
- **NotificationPreference**: User opt-out preferences
- **OrganisationNotificationPolicy**: Quiet hours and rate limits per organization

## Quick Start

### 1. Configure Default Routing Rules

Run the management command to seed default routing rules:

```bash
# Preview what would be created (dry-run mode)
python manage.py configure_routing --dry-run

# Create default routing rules
python manage.py configure_routing

# Force overwrite existing rules
python manage.py configure_routing --force
```

**Default Rules Created**:

| Event Type | Scope | Channel | Priority | Target Role |
|-----------|-------|---------|----------|-------------|
| project.created | global | in_app | normal | member |
| project.updated | global | in_app | normal | member |
| project.deleted | global | in_app | normal | member |
| project.member_added | global | in_app | normal | member |
| org.member_invited | global | in_app | normal | member |
| task.assigned | global | in_app | high | assignee |
| task.completed | global | in_app | normal | creator |
| task.overdue | global | in_app | urgent | assignee |

### 2. Route a Notification

```python
from contextual_notifications.tasks import route_notification

# Route synchronously (for testing)
from contextual_notifications.services import (
    EventService,
    RoutingService,
    PreferenceService,
    SuppressionService,
    PolicyService,
    HandoffService,
)

# Full routing pipeline
event = EventService.validate_and_normalize({
    "event_type": "project.created",
    "user_id": 123,
    "organisation_id": 1,
    "project_id": 456,
    "metadata": {"project_name": "New Project"}
})

routing_decisions = RoutingService.evaluate_rules(event)
filtered_decisions = PreferenceService.filter_by_preferences(routing_decisions)
non_suppressed = SuppressionService.check_suppression(filtered_decisions)
policy_checked = PolicyService.apply_policies(non_suppressed)
HandoffService.send_to_notification_system(policy_checked)

# OR use Celery task (async)
route_notification.delay({
    "event_type": "project.created",
    "user_id": 123,
    "organisation_id": 1,
    "project_id": 456,
    "metadata": {"project_name": "New Project"}
})
```

### 3. Query Routing Logs (Admin API)

```bash
# Get routing decisions for an organization
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/contextual-notifications/routing-logs/?org_id=1"

# Filter by event type and date range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/contextual-notifications/routing-logs/?event_type=project.created&start_date=2025-12-01"

# Query with pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/contextual-notifications/routing-logs/?page=2&page_size=20"
```

### 4. Manage User Preferences

```bash
# Get current user's preferences
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/contextual-notifications/preferences/"

# Create opt-out preference
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "task.completed", "channel": "in_app", "enabled": false}' \
  "http://localhost:8000/api/v1/contextual-notifications/preferences/"

# Update preference
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  "http://localhost:8000/api/v1/contextual-notifications/preferences/123/"
```

## Management Commands

### `configure_routing`

Seed default routing rules for common event types.

**Arguments**:
- `--dry-run`: Preview changes without creating rules
- `--force`: Overwrite existing rules

**Examples**:

```bash
# Dry-run mode (preview only)
python manage.py configure_routing --dry-run

# Create default rules
python manage.py configure_routing

# Force overwrite existing rules
python manage.py configure_routing --force
```

**Output**:
```
✓ Created: project.created (global)
✓ Created: project.updated (global)
⊗ Skipped: task.assigned (global) - already exists (use --force to overwrite)

==================================================
CONFIGURATION COMPLETE:
  Created: 7 rules
  Updated: 0 rules
  Skipped: 1 rules
```

## Configuration

### Environment Variables

```bash
# Redis configuration (for suppression service)
REDIS_URL=redis://localhost:6379/0

# Celery configuration (for async routing)
CELERY_BROKER_URL=redis://localhost:6379/0
```

### Django Settings

```python
# In settings/base.py
INSTALLED_APPS = [
    # ...
    "contextual_notifications.apps.ContextualNotificationsConfig",
]

# Celery task routing
CELERY_TASK_ROUTES = {
    "contextual_notifications.tasks.*": {"queue": "notifications"},
}
```

## API Reference

### Routing Log Endpoints

**`GET /api/v1/contextual-notifications/routing-logs/`**

Query routing decision audit logs.

**Query Parameters**:
- `event_type` (string): Filter by event type (case-insensitive contains)
- `org_id` (integer): Filter by organization ID
- `user_id` (integer): Filter by user ID
- `start_date` (datetime): Filter by created_at >= date
- `end_date` (datetime): Filter by created_at <= date
- `page` (integer): Page number (default: 1)
- `page_size` (integer): Items per page (default: 50, max: 100)
- `ordering` (string): Sort field (default: -created_at)

**Permissions**: Authenticated users. Org admins see their org's logs, superusers see all.

### Preference Endpoints

**`GET /api/v1/contextual-notifications/preferences/`**

List user's notification preferences.

**`POST /api/v1/contextual-notifications/preferences/`**

Create a new preference (opt-out).

**`PATCH /api/v1/contextual-notifications/preferences/{id}/`**

Update a preference.

**`DELETE /api/v1/contextual-notifications/preferences/{id}/`**

Delete a preference.

**Permissions**: Authenticated users can manage their own preferences. Org admins can view org users' preferences.

## Migrations

### Initial Migration

```bash
# Create initial schema
python manage.py makemigrations contextual_notifications
python manage.py migrate contextual_notifications 0001
```

### Seed Data Migration

```bash
# Apply seed data migration (creates default routing rules)
python manage.py migrate contextual_notifications 0002
```

**Note**: The seed data migration (`0002_seed_default_routing_rules`) runs automatically when you run `migrate`. It uses `get_or_create()` to avoid duplicates, so it's safe to run multiple times.

## Testing

```bash
# Run all tests
pytest tests/contextual_notifications/

# Run specific test modules
pytest tests/contextual_notifications/test_routing_service.py
pytest tests/contextual_notifications/test_policy_service.py

# Run with coverage
pytest --cov=contextual_notifications tests/contextual_notifications/
```

## Dependencies

- **B09**: Audit logging system (AuditEvent model)
- **B15**: Celery task infrastructure
- **B16**: Notifications baseline (handoff target)
- **Redis**: Suppression service and rate limiting
- **Django REST Framework**: Admin APIs
- **django-filter**: API filtering

## Related Documentation

- [Architecture Decision Records](../../docs/adr/)
- [API Documentation](http://localhost:8000/api/docs/)
- [Notification System (B16)](../notifications/README.md)
- [Audit System (B09)](../audit/README.md)
