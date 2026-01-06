# Activities Module

**Purpose**: Generic time-based resource planning with hierarchical periods, scheduled activities, and dual-level participation tracking.

**Status**: Production-ready (B30)
**Dependencies**: B05 (accounts), B06 (organisations), B07 (projects), B08 (permissions), B09 (audit), B14 (search)

## Scope

### In Scope
- Unlimited-depth period hierarchies (self-referential tree)
- Activity scheduling within periods (timezone-aware)
- Participation tracking at period level (squads/teams) and activity level (lineups/attendees)
- REST API for CRUD operations
- PostgreSQL recursive CTE for tree navigation
- Flexible JSON fields for domain-specific data

### Out of Scope
- Product-specific workflows (e.g., sports-specific rules)
- UI components (handled by demo-shell)
- Calendar rendering (API only)
- Notification sending (triggered via B16)
- Export generation (handled by B29)

## Key Components

### Models

**Period** (`activities.models.Period`)
- Represents time-bound cycle for organizing activities
- Self-referential FK (`parent_period`) for tree structure
- Constraints: `end_date > start_date`, child org matches parent org
- Custom manager with CTE methods: `get_descendants()`, `get_ancestors()`

**Activity** (`activities.models.Activity`)
- Represents scheduled event within project and period
- Timezone-aware `start_time`/`end_time` (stored UTC)
- Flexible `activity_type` (string field, no enum constraint)
- JSONField `data` for outcome storage (score, goals, notes, etc.)

**Participation** (`activities.models.Participation`)
- Links members to periods OR activities (exclusive OR constraint)
- CHECK constraint enforces `activity_id XOR period_id`
- Status enum: confirmed, tentative, declined, no_response
- JSONField `data` for role-specific metadata (jersey_number, position)

### API Endpoints

**Periods**
- `GET /api/v1/periods/` - List periods (filter by org, project, parent)
- `POST /api/v1/periods/` - Create period
- `GET /api/v1/periods/{id}/` - Retrieve period
- `PUT /api/v1/periods/{id}/` - Update period
- `DELETE /api/v1/periods/{id}/` - Delete period (prevents if children exist)
- `GET /api/v1/periods/{id}/children/` - Get direct children
- `GET /api/v1/periods/{id}/descendants/` - Get all descendants (CTE)

**Activities**
- `GET /api/v1/activities/` - List activities (filter by period, type, date)
- `POST /api/v1/activities/` - Create activity
- `GET /api/v1/activities/{id}/` - Retrieve activity
- `PUT /api/v1/activities/{id}/` - Update activity
- `DELETE /api/v1/activities/{id}/` - Delete activity
- `GET /api/v1/activities/{id}/participants/` - List participants

**Participations**
- `GET /api/v1/participations/` - List participations (filter by member, activity, period)
- `POST /api/v1/participations/` - Create participation
- `GET /api/v1/participations/{id}/` - Retrieve participation
- `PUT /api/v1/participations/{id}/` - Update participation
- `DELETE /api/v1/participations/{id}/` - Delete participation

### Permissions (B08 Integration)

- `organisation.manage_periods` - Create/edit/delete org-wide periods
- `project.manage_periods` - Create/edit/delete project-scoped periods
- `project.manage_activities` - Create/edit/delete activities and participations
- Read access: Any organisation member can view periods/activities

### Audit Events (B09 Integration)

Emitted events:
- `period.created`, `period.updated`, `period.deleted`
- `activity.created`, `activity.updated`, `activity.deleted`
- `participation.created`, `participation.updated`, `participation.deleted`

## Public Interface

### Creating Period Hierarchy

```python
from activities.models import Period
from organisations.models import Organisation

org = Organisation.objects.get(name="Ajax Amsterdam")

# Create root period
season = Period.objects.create(
    organisation=org,
    name="Seizoen 2023/2024",
    start_date="2023-09-01",
    end_date="2024-06-30"
)

# Create child period
fall = Period.objects.create(
    organisation=org,
    parent_period=season,
    name="Najaarscompetitie",
    start_date="2023-09-01",
    end_date="2023-12-31"
)

# Navigate tree
descendants = season.get_descendants()  # Returns [fall]
ancestors = fall.get_ancestors()  # Returns [season]
```

### Scheduling Activity

```python
from activities.models import Activity
from projects.models import Project
from django.utils import timezone

project = Project.objects.get(name="Ajax A1")
period = Period.objects.get(name="Najaarscompetitie")

match = Activity.objects.create(
    project=project,
    period=period,
    title="Ajax - Feyenoord",
    activity_type="match",
    start_time=timezone.datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
    end_time=timezone.datetime(2023, 12, 15, 16, 15, tzinfo=timezone.utc),
    location="Johan Cruijff Arena"
)

# Add outcome data
match.data = {
    "score_home": 3,
    "score_away": 1,
    "goals": [{"player": "Speler 1", "minute": 23}]
}
match.save()
```

### Adding Participants

```python
from activities.models import Participation
from organisations.models import Membership

member = Membership.objects.get(user__username="speler1")

# Add to period squad
Participation.objects.create(
    period=season,
    member=member,
    role="squad_member",
    status="confirmed",
    data={"jersey_number": 10, "position": "striker"}
)

# Add to activity lineup
Participation.objects.create(
    activity=match,
    member=member,
    role="starter",
    status="confirmed"
)
```

## Related Modules

- **B05 (accounts)**: User authentication and authorization
- **B06 (organisations)**: Organisation and membership management
- **B07 (projects)**: Project scoping for periods and activities
- **B08 (permissions)**: Hierarchical access control for mutations
- **B09 (audit)**: Audit trail for all create/update/delete operations
- **B14 (search)**: Full-text search for periods and activities
- **B16 (notifications)**: Triggers for activity creation, participant changes (optional)
- **B29 (reporting)**: Export periods/activities to PDF/Excel (optional)

## Extension Points

### Custom Activity Types

Products can use any string for `activity_type`. No database enum constraint.

Example product-specific types:
- Sports: "match", "training", "tournament"
- Business: "meeting", "workshop", "review"
- Education: "lecture", "exam", "lab"

Validation via serializer if strict types needed:
```python
class ProductActivitySerializer(ActivitySerializer):
    def validate_activity_type(self, value):
        allowed_types = ['match', 'training', 'tournament']
        if value not in allowed_types:
            raise serializers.ValidationError(f"Activity type must be one of {allowed_types}")
        return value
```

### Custom Roles

Period and activity roles are flexible string fields.

Example roles:
- Sports period: "squad_member", "captain", "coach", "physio"
- Sports activity: "starter", "substitute", "reserve"
- Business: "organizer", "attendee", "presenter"

### Outcome Data Patterns

`Activity.data` JSONField stores domain-specific outcome data.

**Sports outcome example**:
```json
{
  "score_home": 3,
  "score_away": 1,
  "goals": [
    {"player": "Speler 1", "minute": 23, "type": "penalty"},
    {"player": "Speler 5", "minute": 67, "type": "header"}
  ],
  "cards": [
    {"player": "Speler 3", "minute": 45, "type": "yellow"}
  ]
}
```

**Business meeting example**:
```json
{
  "decisions": ["Approved budget for Q2", "Hire 2 developers"],
  "action_items": [
    {"owner": "user_id_1", "task": "Draft proposal", "due": "2024-02-15"}
  ],
  "attendees": ["user_id_1", "user_id_2", "user_id_3"]
}
```

### Custom Validation

Override serializer `validate()` for business rules:
```python
class ProductActivitySerializer(ActivitySerializer):
    def validate(self, data):
        data = super().validate(data)

        # Example: Require outcome data for completed activities
        if data.get('status') == 'completed' and not data.get('data'):
            raise serializers.ValidationError('Outcome data required for completed activities')

        return data
```

## Performance Considerations

### CTE Query Performance

`Period.objects.get_descendants()` uses PostgreSQL recursive CTE. Performance guaranteed <500ms for hierarchies up to 10 levels deep (spec SC-007).

For hierarchies exceeding 15 levels with performance issues, consider:
1. Materialized path column (e.g., `path = "001.003.007"`)
2. Denormalized ancestor cache table
3. Product-specific depth limits via validation

### N+1 Query Prevention

Always use `select_related` and `prefetch_related`:
```python
activities = Activity.objects.select_related(
    'project', 'period'
).prefetch_related(
    'participations__member'
)
```

## Testing

### Running Tests
```bash
pytest src/activities/tests/
```

### Coverage Requirements
- Models: ≥90%
- API: ≥90%
- Permissions: ≥85%

## Change Log

- **2026-01-05**: Initial implementation (B30 Activities & Period Hierarchy)
