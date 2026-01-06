# Quickstart: Activities & Period Hierarchy

**Feature**: 039-activities-period-hierarchy
**Target Audience**: Product developers integrating activities module
**Prerequisites**: Django Core-App installed, B05 (accounts), B06 (organisations), B07 (projects), B08 (permissions) configured

## Overview

The activities module provides generic event and resource planning with:
- **Periods**: Unlimited-depth time-bound cycles (e.g., Year → Quarter → Month)
- **Activities**: Scheduled events within periods (matches, meetings, training)
- **Participation**: Dual-level tracking (period squads + activity lineups)

## Installation

### 1. Add to INSTALLED_APPS

```python
# src/config/settings/base.py

INSTALLED_APPS = [
    ...
    'activities',  # Add this line
    ...
]
```

### 2. Run Migrations

```bash
python manage.py migrate activities
```

### 3. Configure Permissions (B08)

Ensure these permissions exist in your B08 setup:

```python
# Managed by B08 permission seeding
ACTIVITIES_PERMISSIONS = [
    ('organisation.manage_periods', 'Can manage organisation-wide periods'),
    ('project.manage_periods', 'Can manage project-specific periods'),
    ('project.manage_activities', 'Can manage activities and participation'),
]
```

## Basic Usage

### Creating a Period Hierarchy

```python
from activities.models import Period
from organisations.models import Organisation

# Create organisation (if not exists)
org = Organisation.objects.get(id='org-uuid')

# Create root period (season)
season = Period.objects.create(
    organisation=org,
    name="Seizoen 2023/2024",
    description="Voetbal seizoen",
    start_date="2023-09-01",
    end_date="2024-06-30"
)

# Create child period (competition phase)
fall_competition = Period.objects.create(
    organisation=org,
    parent_period=season,
    name="Najaarscompetitie",
    start_date="2023-09-01",
    end_date="2023-12-31"
)

# Create grandchild period (month)
december = Period.objects.create(
    organisation=org,
    parent_period=fall_competition,
    name="December 2023",
    start_date="2023-12-01",
    end_date="2023-12-31"
)
```

### Tree Navigation

```python
# Get all descendants (uses PostgreSQL recursive CTE)
descendants = season.get_descendants()  # Returns [fall_competition, december]

# Get ancestors
ancestors = december.get_ancestors()  # Returns [fall_competition, season]

# Get direct children
children = season.children.all()  # Returns [fall_competition]

# Get siblings
siblings = fall_competition.get_siblings()  # Returns other children of season

# Check depth
depth = december.get_depth()  # Returns 2 (grandchild)

# Check if root
is_root = season.is_root()  # Returns True
```

### Scheduling Activities

```python
from activities.models import Activity
from projects.models import Project
from django.utils import timezone

# Get project
project = Project.objects.get(id='project-uuid')

# Schedule a match
match = Activity.objects.create(
    project=project,
    period=december,
    title="Ajax - Feyenoord",
    activity_type="match",
    start_time=timezone.datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
    end_time=timezone.datetime(2023, 12, 15, 16, 15, tzinfo=timezone.utc),
    location="Johan Cruijff Arena"
)

# Add outcome data (after match completes)
match.data = {
    "score_home": 3,
    "score_away": 1,
    "goals": [
        {"player": "Speler 1", "minute": 23, "type": "penalty"},
        {"player": "Speler 5", "minute": 67, "type": "header"}
    ]
}
match.save()
```

### Managing Participation

```python
from activities.models import Participation
from organisations.models import Membership

# Get member (organisation membership from B06)
member = Membership.objects.get(id='member-uuid')

# Add to period squad
squad_participation = Participation.objects.create(
    period=season,
    member=member,
    role="squad_member",
    status="confirmed",
    data={
        "jersey_number": 10,
        "position": "striker"
    }
)

# Add to activity lineup
lineup_participation = Participation.objects.create(
    activity=match,
    member=member,
    role="starter",
    status="confirmed",
    data={}
)

# Update participation status
lineup_participation.status = "declined"
lineup_participation.notes = "Illness"
lineup_participation.save()
```

### Calendar Queries

```python
from django.utils import timezone

# Get all activities in period (including descendants)
period = Period.objects.get(id='period-uuid')
descendant_ids = period.get_descendants().values_list('id', flat=True)
all_period_ids = [period.id] + list(descendant_ids)

activities = Activity.objects.filter(
    period_id__in=all_period_ids,
    start_time__gte=timezone.datetime(2023, 12, 1, tzinfo=timezone.utc),
    start_time__lt=timezone.datetime(2024, 1, 1, tzinfo=timezone.utc)
).select_related('period', 'project').prefetch_related('participations__member')

# Filter by activity type
matches = activities.filter(activity_type='match')
```

## API Usage

### Authentication

All API requests require JWT authentication (via B05):

```bash
# Get token
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'

# Response: {"access": "jwt-token", "refresh": "refresh-token"}

# Use token in subsequent requests
curl -H "Authorization: Bearer jwt-token" \
  http://localhost:8000/api/v1/periods/
```

### Creating Periods via API

```bash
# Create root period
curl -X POST http://localhost:8000/api/v1/periods/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "organisation_id": "org-uuid",
    "name": "Seizoen 2023/2024",
    "description": "Voetbal seizoen",
    "start_date": "2023-09-01",
    "end_date": "2024-06-30",
    "data": {}
  }'

# Create child period
curl -X POST http://localhost:8000/api/v1/periods/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "organisation_id": "org-uuid",
    "parent_period_id": "parent-uuid",
    "name": "Najaarscompetitie",
    "start_date": "2023-09-01",
    "end_date": "2023-12-31",
    "data": {}
  }'
```

### Querying Periods

```bash
# List all periods in organisation
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/periods/?organisation_id=org-uuid"

# List root periods only
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/periods/?organisation_id=org-uuid&parent_id=null"

# Get period with children count
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/periods/period-uuid/"

# Get all descendants of period
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/periods/period-uuid/descendants/"
```

### Scheduling Activities via API

```bash
# Create activity
curl -X POST http://localhost:8000/api/v1/activities/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project-uuid",
    "period_id": "period-uuid",
    "title": "Ajax - PSV",
    "activity_type": "match",
    "start_time": "2023-12-22T20:00:00Z",
    "end_time": "2023-12-22T21:45:00Z",
    "location": "Johan Cruijff Arena",
    "description": "Top wedstrijd",
    "data": {}
  }'

# Update activity outcome
curl -X PATCH http://localhost:8000/api/v1/activities/activity-uuid/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "score_home": 2,
      "score_away": 2,
      "goals": [...]
    }
  }'

# List activities in period (with descendants)
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/activities/?period_id=period-uuid&include_descendants=true"

# Filter activities by type and date range
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/activities/?project_id=project-uuid&activity_type=match&start_time__gte=2023-12-01T00:00:00Z&start_time__lte=2023-12-31T23:59:59Z"
```

### Managing Participation via API

```bash
# Add member to period squad
curl -X POST http://localhost:8000/api/v1/participations/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "period_id": "period-uuid",
    "member_id": "member-uuid",
    "role": "squad_member",
    "status": "confirmed",
    "data": {"jersey_number": 10, "position": "striker"}
  }'

# Add member to activity lineup
curl -X POST http://localhost:8000/api/v1/participations/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": "activity-uuid",
    "member_id": "member-uuid",
    "role": "starter",
    "status": "confirmed",
    "data": {}
  }'

# Update participation status
curl -X PATCH http://localhost:8000/api/v1/participations/participation-uuid/ \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "declined", "notes": "Illness"}'

# Get activity participants
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/activities/activity-uuid/participants/"

# Filter participants by role
curl -H "Authorization: Bearer jwt-token" \
  "http://localhost:8000/api/v1/activities/activity-uuid/participants/?role=starter&status=confirmed"
```

## Common Patterns

### Building Period Tree UI

```python
def get_period_tree(root_period):
    """Build nested tree structure for frontend rendering"""
    tree = {
        'id': root_period.id,
        'name': root_period.name,
        'start_date': root_period.start_date,
        'end_date': root_period.end_date,
        'children': []
    }

    for child in root_period.children.all():
        tree['children'].append(get_period_tree(child))  # Recursive

    return tree
```

### Calendar View (Month)

```python
from django.utils import timezone
from datetime import datetime, timedelta

def get_calendar_activities(period, year, month):
    """Get all activities for a month calendar view"""
    # Include activities from descendant periods
    descendant_ids = period.get_descendants().values_list('id', flat=True)
    all_period_ids = [period.id] + list(descendant_ids)

    # Month date range
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    # Query activities
    activities = Activity.objects.filter(
        period_id__in=all_period_ids,
        start_time__gte=start_date,
        start_time__lt=end_date
    ).select_related('period', 'project').order_by('start_time')

    return activities
```

### Permission Checks

```python
from permissions.utils import has_permission  # B08

def can_user_manage_period(user, period):
    """Check if user can create/edit/delete period"""
    if period.project:
        return has_permission(user, 'project.manage_periods', period.project)
    else:
        return has_permission(user, 'organisation.manage_periods', period.organisation)

def can_user_manage_activity(user, activity):
    """Check if user can create/edit/delete activity"""
    return has_permission(user, 'project.manage_activities', activity.project)
```

### Bulk Participant Addition

```python
def add_squad_to_period(period, member_ids, default_role='squad_member'):
    """Bulk add members to period squad"""
    from organisations.models import Membership

    members = Membership.objects.filter(
        id__in=member_ids,
        organisation=period.organisation
    )

    participations = [
        Participation(
            period=period,
            member=member,
            role=default_role,
            status='confirmed'
        )
        for member in members
    ]

    Participation.objects.bulk_create(participations, ignore_conflicts=True)
```

## Testing

### Example Test

```python
import pytest
from django.utils import timezone
from activities.models import Period, Activity, Participation

@pytest.mark.django_db
def test_period_hierarchy():
    """Test period tree navigation"""
    # Setup
    org = Organisation.objects.create(name="Test Org")
    season = Period.objects.create(
        organisation=org,
        name="Season",
        start_date="2023-01-01",
        end_date="2023-12-31"
    )
    q1 = Period.objects.create(
        organisation=org,
        parent_period=season,
        name="Q1",
        start_date="2023-01-01",
        end_date="2023-03-31"
    )

    # Test
    assert season.is_root()
    assert not q1.is_root()
    assert q1.get_depth() == 1
    assert list(season.get_descendants()) == [q1]
    assert list(q1.get_ancestors()) == [season]

@pytest.mark.django_db
def test_activity_participants():
    """Test activity participation"""
    # Setup
    project = Project.objects.create(...)
    period = Period.objects.create(...)
    activity = Activity.objects.create(
        project=project,
        period=period,
        title="Match",
        activity_type="match",
        start_time=timezone.now()
    )
    member = Membership.objects.create(...)

    # Test
    participation = Participation.objects.create(
        activity=activity,
        member=member,
        role="starter",
        status="confirmed"
    )

    assert activity.participations.count() == 1
    assert participation.is_activity_participation()
    assert not participation.is_period_participation()
```

## Troubleshooting

### Common Errors

**Error**: `Cannot delete period with N child periods`
- **Cause**: Trying to delete parent period before children
- **Solution**: Delete child periods first (bottom-up), or override `Period.delete()` for cascade behavior

**Error**: `Participation cannot belong to both activity and period`
- **Cause**: Both `activity_id` and `period_id` set in Participation
- **Solution**: Set only one (exclusive OR constraint)

**Error**: `Member must belong to same organisation as activity/period`
- **Cause**: Cross-organisation participation not allowed
- **Solution**: Ensure member's organisation matches activity's project organisation or period's organisation

**Error**: `Period hierarchy depth exceeds performance-tested threshold`
- **Cause**: Creating period at 11+ depth levels
- **Solution**: Soft warning only (doesn't block creation). Consider flattening structure if experiencing performance issues.

### Performance Optimization

If experiencing slow queries at depth >10 levels:

1. **Check indexes**: Ensure `parent_period_id` index exists
2. **Use select_related**: Always use `.select_related('parent_period')` when traversing up
3. **Cache descendant IDs**: For frequently-accessed hierarchies, cache result of `get_descendants()`
4. **Consider materialized path**: For very deep trees (15+ levels), add `path` column with format `001.003.007`

## Next Steps

- Read [API Contract](contracts/api-contract.md) for full endpoint documentation
- Read [Data Model](data-model.md) for detailed schema reference
- Explore demo-shell integration for UI examples (coming soon)
- Review [Extension Guide](../../../documents/06-workflow/extending-core.md) for customization patterns

## Support

- Internal docs: `src/activities/README.md`
- Architecture decision: `documents/03-system/architecture-decisions/012-period-hierarchy-design.md`
- Issues: GitHub repository issues
