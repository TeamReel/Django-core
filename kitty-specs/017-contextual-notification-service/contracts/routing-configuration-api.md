# Routing Configuration API Contract
*Path: [contracts/routing-configuration-api.md](contracts/routing-configuration-api.md)*

**Feature**: B17 Contextual Notification Service
**Component**: Routing Rule Configuration
**Version**: 1.0.0

## Overview

Administrators configure routing rules to determine which events trigger notifications for which users via which channels.

## Django Admin Interface

### RoutingRule Admin

**URL**: `/admin/contextual_notifications/routingrule/`

**List View Columns**:
- Event Type
- Scope (global/org/project)
- Organisation
- Target Role
- Priority (low/normal/high/urgent)
- Channel (in_app/email/push)
- Enabled (✓/✗)
- Created At

**Filters**:
- Scope
- Channel
- Is Enabled
- Priority
- Organisation

**Search Fields**:
- Event Type
- Target Role

**Actions**:
- Enable selected rules
- Disable selected rules
- Bulk delete

### Form Validation

```python
# Scope validation
if scope == 'global':
    assert organisation is None and project is None
elif scope == 'org':
    assert organisation is not None and project is None
elif scope == 'project':
    assert organisation is not None and project is not None
```

## REST API (Optional - Admin Only)

### List Routing Rules

```http
GET /api/v1/contextual-notifications/routing-rules/
Authorization: Bearer <admin_token>
```

**Query Parameters**:
- `event_type`: Filter by event type (exact match)
- `scope`: Filter by scope (global/org/project)
- `organisation_id`: Filter by organisation
- `is_enabled`: Filter by enabled status (true/false)
- `channel`: Filter by channel (in_app/email/push)
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20)

**Response** (200 OK):
```json
{
    "count": 42,
    "next": "/api/v1/contextual-notifications/routing-rules/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "event_type": "project.updated",
            "scope": "global",
            "organisation": null,
            "project": null,
            "target_role": "project_member",
            "priority": 1,
            "channel": "in_app",
            "is_enabled": true,
            "created_at": "2025-12-01T10:00:00Z",
            "updated_at": "2025-12-01T10:00:00Z"
        }
    ]
}
```

### Create Routing Rule

```http
POST /api/v1/contextual-notifications/routing-rules/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body**:
```json
{
    "event_type": "task.assigned",
    "scope": "org",
    "organisation_id": 42,
    "target_role": "project_member",
    "priority": 2,
    "channel": "email",
    "is_enabled": true
}
```

**Response** (201 Created):
```json
{
    "id": 43,
    "event_type": "task.assigned",
    "scope": "org",
    "organisation": {
        "id": 42,
        "name": "Acme Corp"
    },
    "project": null,
    "target_role": "project_member",
    "priority": 2,
    "channel": "email",
    "is_enabled": true,
    "created_at": "2025-12-02T15:30:00Z",
    "updated_at": "2025-12-02T15:30:00Z"
}
```

**Error Response** (400 Bad Request):
```json
{
    "error": "validation_error",
    "details": {
        "scope": ["Organisation is required for org-scoped rules"],
        "event_type": ["Event type must match pattern ^[a-z0-9._]+$"]
    }
}
```

### Update Routing Rule

```http
PATCH /api/v1/contextual-notifications/routing-rules/{id}/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body**:
```json
{
    "is_enabled": false,
    "priority": 3
}
```

**Response** (200 OK):
```json
{
    "id": 43,
    "event_type": "task.assigned",
    "is_enabled": false,
    "priority": 3,
    ...
}
```

### Delete Routing Rule

```http
DELETE /api/v1/contextual-notifications/routing-rules/{id}/
Authorization: Bearer <admin_token>
```

**Response** (204 No Content)

## User Preference API

### List User Preferences

```http
GET /api/v1/contextual-notifications/preferences/
Authorization: Bearer <user_token>
```

**Response** (200 OK):
```json
{
    "preferences": [
        {
            "id": 1,
            "event_type": "project.updated",
            "channel": "email",
            "enabled": false
        },
        {
            "id": 2,
            "event_type": "task.assigned",
            "channel": "in_app",
            "enabled": true
        }
    ]
}
```

### Update User Preference

```http
PUT /api/v1/contextual-notifications/preferences/
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body**:
```json
{
    "event_type": "project.updated",
    "channel": "email",
    "enabled": false
}
```

**Response** (200 OK):
```json
{
    "id": 1,
    "event_type": "project.updated",
    "channel": "email",
    "enabled": false,
    "updated_at": "2025-12-02T15:45:00Z"
}
```

### Bulk Update Preferences

```http
POST /api/v1/contextual-notifications/preferences/bulk-update/
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body**:
```json
{
    "preferences": [
        {"event_type": "project.updated", "channel": "email", "enabled": false},
        {"event_type": "project.created", "channel": "email", "enabled": false},
        {"event_type": "task.assigned", "channel": "push", "enabled": true}
    ]
}
```

**Response** (200 OK):
```json
{
    "updated": 3,
    "preferences": [...]
}
```

## Organisation Policy API (Admin Only)

### Get Organisation Policy

```http
GET /api/v1/contextual-notifications/organisations/{org_id}/policy/
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
    "id": 1,
    "organisation_id": 42,
    "policy_type": "default",
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00:00",
    "quiet_hours_end": "08:00:00",
    "quiet_hours_timezone": "Europe/Amsterdam",
    "quiet_hours_rate_limit": 10,
    "updated_at": "2025-12-02T10:00:00Z"
}
```

### Update Organisation Policy

```http
PATCH /api/v1/contextual-notifications/organisations/{org_id}/policy/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body**:
```json
{
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00:00",
    "quiet_hours_end": "08:00:00",
    "quiet_hours_timezone": "America/New_York",
    "quiet_hours_rate_limit": 5
}
```

**Response** (200 OK):
```json
{
    "id": 1,
    "organisation_id": 42,
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00:00",
    "quiet_hours_end": "08:00:00",
    "quiet_hours_timezone": "America/New_York",
    "quiet_hours_rate_limit": 5,
    "updated_at": "2025-12-02T16:00:00Z"
}
```

## Routing Decision Log API (Read-Only)

### Query Routing Decisions

```http
GET /api/v1/contextual-notifications/routing-decisions/
Authorization: Bearer <admin_token>
```

**Query Parameters**:
- `event_type`: Filter by domain event type
- `org_id`: Filter by organisation
- `user_id`: Filter by target user
- `start_date`: Filter by timestamp (ISO 8601)
- `end_date`: Filter by timestamp (ISO 8601)
- `page`: Page number
- `page_size`: Items per page (default: 50)

**Response** (200 OK):
```json
{
    "count": 1234,
    "next": "/api/v1/contextual-notifications/routing-decisions/?page=2",
    "previous": null,
    "results": [
        {
            "id": "b09-audit-event-id",
            "timestamp": "2025-12-02T15:30:45Z",
            "domain_event_type": "project.updated",
            "organisation_id": 42,
            "matched_rules": [1, 5, 12],
            "target_users": [7, 8, 9],
            "selected_channels": {
                "7": ["in_app", "email"],
                "8": ["in_app"],
                "9": ["in_app"]
            },
            "suppressed_users": [10],
            "preference_filtered_users": [11],
            "routing_time_ms": 45
        }
    ]
}
```

### Get Single Routing Decision

```http
GET /api/v1/contextual-notifications/routing-decisions/{id}/
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
    "id": "b09-audit-event-id",
    "timestamp": "2025-12-02T15:30:45Z",
    "domain_event_type": "project.updated",
    "domain_event_context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,
        "resource_id": "project_123"
    },
    "matched_rules": [
        {
            "id": 1,
            "event_type": "project.updated",
            "scope": "global",
            "target_role": "project_member",
            "channel": "in_app"
        }
    ],
    "target_users": [7, 8, 9],
    "selected_channels": {
        "7": ["in_app", "email"],
        "8": ["in_app"],
        "9": ["in_app"]
    },
    "suppressed_users": [10],
    "preference_filtered_users": [11],
    "routing_time_ms": 45
}
```

## Permissions

### Routing Rule Configuration

- **Global rules**: Superadmin only (`is_superuser=True`)
- **Organisation rules**: Organisation admin (`B08.has_org_permission(user, org, 'manage_notification_routing')`)
- **Project rules**: Organisation admin (project-scoped rules inherit org permissions)

### User Preferences

- **Read/Update own preferences**: Any authenticated user
- **Cannot modify other users' preferences**: Forbidden

### Organisation Policies

- **Read/Update org policy**: Organisation admin
- **Superadmin**: Can manage all org policies

### Routing Decision Logs

- **Read own org's decisions**: Organisation admin
- **Read all decisions**: Superadmin

## Validation Rules

### RoutingRule Validation

```python
# Scope consistency
if scope == 'global':
    if organisation is not None or project is not None:
        raise ValidationError("Global rules cannot have organisation or project")

if scope == 'org':
    if organisation is None:
        raise ValidationError("Organisation is required for org-scoped rules")
    if project is not None:
        raise ValidationError("Org-scoped rules cannot have project")

if scope == 'project':
    if organisation is None or project is None:
        raise ValidationError("Both organisation and project required for project-scoped rules")

# Event type format
if not re.match(r'^[a-z0-9._]+$', event_type):
    raise ValidationError("Event type must match pattern ^[a-z0-9._]+$")

# Priority range
if priority not in [0, 1, 2, 3]:
    raise ValidationError("Priority must be 0 (low), 1 (normal), 2 (high), or 3 (urgent)")

# Channel validity
if channel not in ['in_app', 'email', 'push']:
    raise ValidationError("Channel must be one of: in_app, email, push")
```

### NotificationPreference Validation

```python
# Event type format
if not re.match(r'^[a-z0-9._]+$', event_type):
    raise ValidationError("Event type must match pattern ^[a-z0-9._]+$")

# Channel validity
if channel not in ['in_app', 'email', 'push']:
    raise ValidationError("Channel must be one of: in_app, email, push")
```

### OrganisationNotificationPolicy Validation

```python
# Quiet hours consistency
if quiet_hours_enabled:
    if quiet_hours_start is None or quiet_hours_end is None:
        raise ValidationError("Quiet hours start and end are required when enabled")
    if quiet_hours_rate_limit <= 0:
        raise ValidationError("Rate limit must be positive")

# Timezone validity
import pytz
if quiet_hours_timezone not in pytz.all_timezones:
    raise ValidationError(f"Invalid timezone: {quiet_hours_timezone}")
```

## Example Workflows

### Configure Global Rule (Superadmin)

1. Login to Django admin
2. Navigate to Routing Rules
3. Click "Add Routing Rule"
4. Fill form:
   - Event Type: `project.created`
   - Scope: `global`
   - Target Role: `project_member`
   - Priority: `normal`
   - Channel: `in_app`
   - Enabled: ✓
5. Save
6. Rule applies to all organisations immediately

### Override with Org Rule (Org Admin)

1. Login to Django admin (or use API)
2. Navigate to Routing Rules
3. Click "Add Routing Rule"
4. Fill form:
   - Event Type: `project.created`
   - Scope: `org`
   - Organisation: `Acme Corp`
   - Target Role: `project_member`
   - Priority: `high`
   - Channel: `email`
   - Enabled: ✓
5. Save
6. Org 42 members now get email (overrides global in_app rule)

### User Opts Out (End User)

1. User navigates to notification preferences page
2. Finds "Project Created" event
3. Toggles "Email" channel to OFF
4. Saves preferences
5. User no longer receives emails for project.created events (still gets in-app)

## Testing

### API Test Example

```python
from rest_framework.test import APITestCase
from contextual_notifications.models import RoutingRule

class RoutingRuleAPITest(APITestCase):
    def test_create_global_rule_requires_superadmin(self):
        """Test that only superadmins can create global rules."""
        self.client.force_authenticate(user=self.org_admin_user)

        response = self.client.post('/api/v1/contextual-notifications/routing-rules/', {
            'event_type': 'test.event',
            'scope': 'global',
            'target_role': 'member',
            'priority': 1,
            'channel': 'in_app',
            'is_enabled': True
        })

        assert response.status_code == 403  # Forbidden

        self.client.force_authenticate(user=self.superadmin_user)
        response = self.client.post('/api/v1/contextual-notifications/routing-rules/', {...})
        assert response.status_code == 201  # Created
```

## Rate Limiting

All API endpoints are rate-limited:
- **Anonymous**: N/A (authentication required)
- **Authenticated users**: 100 requests/minute (preferences API)
- **Admin users**: 1000 requests/minute (configuration APIs)

Exceeding rate limit returns:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
    "error": "rate_limit_exceeded",
    "message": "Too many requests. Try again in 60 seconds."
}
```
