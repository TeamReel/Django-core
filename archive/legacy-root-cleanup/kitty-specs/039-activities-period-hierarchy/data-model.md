# Data Model: Activities & Period Hierarchy

**Feature**: 039-activities-period-hierarchy
**Date**: 2026-01-05

## Entity Relationship Diagram

```
┌─────────────────┐
│  Organisation   │
│   (B06)         │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐         ┌─────────────────┐
│     Period      │◄────┐   │     Project     │
│                 │     │   │      (B07)      │
└────┬────────────┘     │   └────────┬────────┘
     │                  │            │
     │ 1:N (self-ref)   │            │ 1:N
     │                  │            │
     └──────────────────┘            │
                                     │
     ┌───────────────────────────────┘
     │
     │ 1:N
     │
┌────▼────────────┐
│    Activity     │
│                 │
└────┬────────────┘
     │
     │ 1:N
     │
┌────▼────────────┐         ┌─────────────────┐
│  Participation  │────────►│   Membership    │
│                 │   N:1   │     (B06)       │
└─────────────────┘         └─────────────────┘
         │
         │ (exclusive OR)
         │
         └──────►[Either activity_id OR period_id must be set]
```

## Core Entities

### Period

**Purpose**: Time-bound cycle for organizing activities and resources. Can form unlimited-depth hierarchies (e.g., Year → Quarter → Month → Week).

**Scope**: Organisation-wide (available to all projects in org) OR project-specific (visible only within that project).

**Table Name**: `activities_period`

| Field | Type | Null | Default | Description |
|-------|------|------|---------|-------------|
| id | UUID | No | uuid4() | Primary key |
| organisation | FK(Organisation) | No | - | Owner organisation (required) |
| project | FK(Project) | Yes | NULL | Optional project scope |
| parent_period | FK(Period, self) | Yes | NULL | Parent in hierarchy (NULL = root) |
| name | CharField(200) | No | - | Display name (e.g., "Seizoen 2023/2024", "Q1 2024") |
| description | TextField | Yes | '' | Optional detailed description |
| start_date | DateField | No | - | Period start (date only, no timezone) |
| end_date | DateField | No | - | Period end (date only, no timezone) |
| data | JSONField | No | {} | Flexible storage for domain-specific attributes |
| created_at | DateTimeField | No | now() | Creation timestamp |
| updated_at | DateTimeField | No | now() | Last modification timestamp |
| created_by | FK(User) | Yes | NULL | User who created (from B05) |

**Constraints**:
- `end_date > start_date` (database CHECK constraint)
- Child period's organisation must match parent's organisation (application-level validation)
- Unique together: (organisation, name, start_date) to prevent duplicates

**Indexes**:
- `(organisation_id, project_id)` - Filter periods by org/project
- `(parent_period_id)` - Tree traversal JOIN performance
- `(start_date, end_date)` - Date range queries

**Relationships**:
- Belongs to: Organisation (required), Project (optional)
- Has many: Children (Period via parent_period), Activities
- Belongs to: Parent (Period via parent_period, self-referential)

**Methods**:
```python
def get_ancestors(self):
    """Return queryset of all ancestor periods (parent → grandparent → ...root)"""

def get_descendants(self):
    """Return queryset of all descendant periods using recursive CTE"""

def get_siblings(self):
    """Return queryset of sibling periods (same parent_period)"""

def get_depth(self):
    """Return depth in hierarchy (root = 0, child of root = 1, etc.)"""

def is_root(self):
    """Return True if this is a root period (parent_period is NULL)"""
```

**Deletion Behavior**:
- Prevent deletion if `self.children.exists()` or `self.activity_set.exists()`
- Raise `ValidationError` with count of children/activities
- Products can override for cascade delete if needed

---

### Activity

**Purpose**: Scheduled event within a project and period (e.g., match, meeting, training session, lecture).

**Scope**: Always belongs to a project. Linked to one period (most specific in hierarchy).

**Table Name**: `activities_activity`

| Field | Type | Null | Default | Description |
|-------|------|------|---------|-------------|
| id | UUID | No | uuid4() | Primary key |
| project | FK(Project) | No | - | Owner project (required) |
| period | FK(Period) | No | - | Time-bound context (required) |
| title | CharField(200) | No | - | Activity name (e.g., "Ajax vs Feyenoord", "Sprint Review") |
| activity_type | CharField(50) | No | - | Configurable type (match, meeting, training, lecture, etc.) |
| start_time | DateTimeField | No | - | Activity start (timezone-aware, stored in UTC) |
| end_time | DateTimeField | Yes | NULL | Activity end (timezone-aware, optional) |
| location | CharField(200) | Yes | '' | Physical/virtual location |
| description | TextField | Yes | '' | Optional detailed description |
| data | JSONField | No | {} | Flexible storage for outcomes (scores, goals, decisions, attachments) |
| created_at | DateTimeField | No | now() | Creation timestamp |
| updated_at | DateTimeField | No | now() | Last modification timestamp |
| created_by | FK(User) | Yes | NULL | User who created (from B05) |

**Constraints**:
- Period must belong to same organisation as activity's project (application-level validation)
- `end_time > start_time` if both set (application-level validation)

**Indexes**:
- `(project_id, period_id, start_time)` - Calendar queries (primary access pattern)
- `(activity_type)` - Filter by type
- `(start_time)` - Date range queries

**Relationships**:
- Belongs to: Project (required), Period (required)
- Has many: Participations

**Methods**:
```python
def get_participants(self):
    """Return queryset of members via Participation"""

def get_participant_count(self):
    """Return count of confirmed participants"""

def is_past(self):
    """Return True if activity start_time is in the past"""

def get_duration(self):
    """Return timedelta if both start_time and end_time set, else None"""
```

**Validation**:
```python
def clean(self):
    # Warn if activity start_time not within period date range (soft warning, not error)
    if self.start_time.date() < self.period.start_date or self.start_time.date() > self.period.end_date:
        warnings.warn("Activity scheduled outside period date range")
```

---

### Participation

**Purpose**: Links members to periods (squad/team membership) OR activities (lineup/attendees). Enables dual-level tracking: period-level roles (e.g., squad_member) separate from activity-level roles (e.g., starter).

**Scope**: Exclusive OR - belongs to EITHER a period OR an activity, never both.

**Table Name**: `activities_participation`

| Field | Type | Null | Default | Description |
|-------|------|------|---------|-------------|
| id | UUID | No | uuid4() | Primary key |
| activity | FK(Activity) | Yes | NULL | Activity participation (mutually exclusive with period) |
| period | FK(Period) | Yes | NULL | Period participation (mutually exclusive with activity) |
| member | FK(Membership) | No | - | Organisation member (from B06) |
| role | CharField(50) | No | - | Configurable role (squad_member, captain, starter, substitute, attendee, etc.) |
| status | CharField(20) | No | 'confirmed' | Participation status (confirmed, tentative, declined, no_response) |
| notes | TextField | Yes | '' | Optional notes |
| data | JSONField | No | {} | Role-specific metadata (jersey_number, position, responsibilities, etc.) |
| created_at | DateTimeField | No | now() | Creation timestamp |
| updated_at | DateTimeField | No | now() | Last modification timestamp |
| created_by | FK(User) | Yes | NULL | User who created (from B05) |

**Constraints**:
- **Database CHECK constraint**: `(activity_id IS NOT NULL AND period_id IS NULL) OR (activity_id IS NULL AND period_id IS NOT NULL)`
- Unique together: (activity, member) if activity set, (period, member) if period set (prevent duplicate participations)

**Indexes**:
- `(member_id, period_id)` - Find member's period participations
- `(member_id, activity_id)` - Find member's activity participations
- `(activity_id)` - Activity participant lists
- `(period_id)` - Period member lists

**Relationships**:
- Belongs to: Activity (optional), Period (optional), Member (Membership from B06, required)

**Methods**:
```python
def is_activity_participation(self):
    """Return True if this is an activity participation"""
    return self.activity_id is not None

def is_period_participation(self):
    """Return True if this is a period participation"""
    return self.period_id is not None

def get_context(self):
    """Return the activity or period this participation belongs to"""
    return self.activity if self.activity else self.period
```

**Validation**:
```python
def clean(self):
    if self.activity_id and self.period_id:
        raise ValidationError("Participation cannot belong to both activity and period")
    if not self.activity_id and not self.period_id:
        raise ValidationError("Participation must belong to either activity or period")

    # Verify member belongs to same organisation as activity/period
    context_org = self.activity.project.organisation if self.activity else self.period.organisation
    if self.member.organisation != context_org:
        raise ValidationError("Member must belong to same organisation as activity/period")
```

---

## State Transitions

### Participation Status

```
              ┌─────────────┐
              │ no_response │ (initial state for invitations)
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │confirmed │ │tentative │ │ declined │
   └──────────┘ └──────────┘ └──────────┘
         │           │
         └───────────┴───────────┐
                                 ▼
                          [Any → Any allowed]
```

**Rules**:
- Any status can transition to any other status (no restrictions)
- Initial status defaults to `confirmed` for manual additions
- `no_response` used when invitation sent, awaiting reply

---

## Query Patterns

### Common Queries (Optimized)

**1. Get all activities in period and descendants (calendar view)**:
```python
period = Period.objects.get(id=period_id)
descendant_ids = period.get_descendants().values_list('id', flat=True)
all_period_ids = [period.id] + list(descendant_ids)
activities = Activity.objects.filter(
    period_id__in=all_period_ids,
    start_time__gte=date_start,
    start_time__lt=date_end
).select_related('period', 'project').prefetch_related('participations__member')
```

**2. Get period hierarchy breadcrumbs**:
```python
def get_breadcrumbs(period):
    breadcrumbs = [period]
    current = period
    while current.parent_period:
        current = current.parent_period
        breadcrumbs.insert(0, current)
    return breadcrumbs
```

**3. Get activity participants with roles**:
```python
activity = Activity.objects.get(id=activity_id)
participants = activity.participations.filter(
    status='confirmed'
).select_related('member__user').order_by('role', 'member__user__last_name')
```

**4. Get period squad members (not inherited)**:
```python
period = Period.objects.get(id=period_id)
members = period.participations.select_related('member__user').order_by('role', 'data__jersey_number')
```

**5. Check if user can manage period**:
```python
from permissions.utils import has_permission  # B08

def can_manage_period(user, period):
    if period.project:
        return has_permission(user, 'project.manage_periods', period.project)
    else:
        return has_permission(user, 'organisation.manage_periods', period.organisation)
```

---

## Data Migration Notes

### Initial Migration

```python
# activities/migrations/0001_initial.py

operations = [
    migrations.CreateModel(
        name='Period',
        fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4)),
            ('organisation', models.ForeignKey('organisations.Organisation', on_delete=models.CASCADE)),
            ('project', models.ForeignKey('projects.Project', on_delete=models.CASCADE, null=True, blank=True)),
            ('parent_period', models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children')),
            ('name', models.CharField(max_length=200)),
            ('description', models.TextField(blank=True)),
            ('start_date', models.DateField()),
            ('end_date', models.DateField()),
            ('data', models.JSONField(default=dict)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('updated_at', models.DateTimeField(auto_now=True)),
            ('created_by', models.ForeignKey('accounts.User', null=True, on_delete=models.SET_NULL)),
        ],
        options={'ordering': ['start_date', 'name']},
    ),
    migrations.CreateModel(
        name='Activity',
        fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4)),
            ('project', models.ForeignKey('projects.Project', on_delete=models.CASCADE)),
            ('period', models.ForeignKey('activities.Period', on_delete=models.PROTECT)),
            ('title', models.CharField(max_length=200)),
            ('activity_type', models.CharField(max_length=50)),
            ('start_time', models.DateTimeField()),
            ('end_time', models.DateTimeField(null=True, blank=True)),
            ('location', models.CharField(max_length=200, blank=True)),
            ('description', models.TextField(blank=True)),
            ('data', models.JSONField(default=dict)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('updated_at', models.DateTimeField(auto_now=True)),
            ('created_by', models.ForeignKey('accounts.User', null=True, on_delete=models.SET_NULL)),
        ],
        options={'ordering': ['start_time', 'title']},
    ),
    migrations.CreateModel(
        name='Participation',
        fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4)),
            ('activity', models.ForeignKey('activities.Activity', null=True, blank=True, on_delete=models.CASCADE, related_name='participations')),
            ('period', models.ForeignKey('activities.Period', null=True, blank=True, on_delete=models.CASCADE, related_name='participations')),
            ('member', models.ForeignKey('organisations.Membership', on_delete=models.CASCADE)),
            ('role', models.CharField(max_length=50)),
            ('status', models.CharField(max_length=20, default='confirmed')),
            ('notes', models.TextField(blank=True)),
            ('data', models.JSONField(default=dict)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('updated_at', models.DateTimeField(auto_now=True)),
            ('created_by', models.ForeignKey('accounts.User', null=True, on_delete=models.SET_NULL)),
        ],
    ),
    migrations.AddConstraint(
        model_name='period',
        constraint=models.CheckConstraint(
            check=models.Q(end_date__gt=models.F('start_date')),
            name='period_end_after_start'
        ),
    ),
    migrations.AddConstraint(
        model_name='participation',
        constraint=models.CheckConstraint(
            check=(
                models.Q(activity__isnull=False, period__isnull=True) |
                models.Q(activity__isnull=True, period__isnull=False)
            ),
            name='participation_exclusive_context'
        ),
    ),
    migrations.AddIndex(
        model_name='period',
        index=models.Index(fields=['organisation', 'project'], name='period_org_proj_idx'),
    ),
    migrations.AddIndex(
        model_name='period',
        index=models.Index(fields=['parent_period'], name='period_parent_idx'),
    ),
    migrations.AddIndex(
        model_name='activity',
        index=models.Index(fields=['project', 'period', 'start_time'], name='activity_calendar_idx'),
    ),
]
```

---

## Extension Points

### JSON Data Field Usage Examples

**Period.data examples**:
```json
{
  "color": "#FF5733",
  "budget": 50000,
  "goals": ["Win championship", "Develop youth players"],
  "custom_field_123": "value"
}
```

**Activity.data examples** (outcomes):
```json
{
  "score_home": 3,
  "score_away": 1,
  "goals": [
    {"player": "Speler 1", "minute": 23, "type": "penalty"},
    {"player": "Speler 5", "minute": 67, "type": "header"}
  ],
  "cards": [
    {"player": "Speler 3", "type": "yellow", "minute": 45}
  ],
  "attendance": 45000,
  "weather": "sunny"
}
```

**Participation.data examples**:
```json
{
  "jersey_number": 10,
  "position": "striker",
  "captain": true,
  "performance_rating": 8.5,
  "responsibilities": ["Lead team", "Take penalties"]
}
```

### Products Can Extend By:

1. **Custom activity types**: Add product-specific validation in serializers (e.g., enforce "match" activities have `score_home` in data field)
2. **Custom roles**: Define product-specific role enums, validate in serializers
3. **Outcome data schemas**: Define JSON schemas for different activity types, validate at serializer level
4. **Cascade delete**: Override `Period.delete()` in product models for cascade behavior
5. **Materialized path**: Add `path` field to Period for very deep hierarchies (15+ levels) if CTE performance insufficient

---

## Type Hints Example

```python
from typing import Optional, List
from django.db.models import QuerySet

class Period(models.Model):
    def get_descendants(self) -> QuerySet['Period']:
        """Return all descendant periods using recursive CTE"""
        ...

    def get_ancestors(self) -> List['Period']:
        """Return ordered list of ancestor periods (immediate parent to root)"""
        ...

    def get_depth(self) -> int:
        """Return depth in hierarchy (0 = root)"""
        ...

class Activity(models.Model):
    def get_participants(self, status: Optional[str] = None) -> QuerySet['Participation']:
        """Return activity participants, optionally filtered by status"""
        ...
```
