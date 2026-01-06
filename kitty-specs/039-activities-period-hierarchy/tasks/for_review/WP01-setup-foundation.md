---
lane: "for_review"
agent: "claude"
shell_pid: "36572"
---
# Work Package 01: Setup & Foundation

---
**work_package_id**: WP01
**lane**: planned
**priority**: P0 (Blocking)
**estimated_effort**: 4 hours
**dependencies**: None
**blocks**: WP02, WP03, WP04, WP05
**subtasks**: T001, T002, T003, T004, T005, T006, T020
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Objective

Create the Django app structure with 3 core models (Period, Activity, Participation) and database migrations. Implement custom QuerySet manager for Period with PostgreSQL recursive CTE support for tree queries. This work package establishes the data layer foundation required by all subsequent API work.

## Context

From spec User Story 1 (Priority P1): Organisation admins and project managers structure time-bound cycles for planning. Requires unlimited-depth period hierarchy (e.g., Organisation → Season → Month → Week) with efficient tree navigation.

From data-model.md:
- **Period**: Self-referential FK (parent_period), CHECK constraint (end_date > start_date), indexes on (organisation_id, project_id, parent_period_id)
- **Activity**: FK to project + period, timezone-aware start_time/end_time, JSONField for outcome data
- **Participation**: FK to activity OR period (exclusive), CHECK constraint enforcing XOR, status enum

From research.md Decision 1: Raw PostgreSQL recursive CTE via custom QuerySet (no django-treebeard/django-mptt). Rationale: Zero dependencies, optimal performance, spec-aligned.

## Detailed Guidance

### T001: Create Django App Structure

```bash
python manage.py startapp activities src/activities/
```

Expected structure:
```
src/activities/
├── __init__.py
├── apps.py
├── models.py
├── managers.py  (create this manually)
├── admin.py
├── migrations/
│   └── __init__.py
├── api/
│   └── __init__.py
└── tests/
    └── __init__.py
```

Update `src/activities/apps.py`:
```python
from django.apps import AppConfig

class ActivitiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'activities'
    verbose_name = 'Activities & Period Hierarchy'
```

### T002: Define Period Model

Location: `src/activities/models.py`

```python
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()

class Period(models.Model):
    """
    Time-bound cycle for organizing activities and resources.
    Supports unlimited-depth hierarchies via self-referential parent_period.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        related_name='periods'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='periods',
        null=True,
        blank=True,
        help_text='Optional project scope. If null, period is organisation-wide.'
    )
    parent_period = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,  # Prevent deletion if children exist
        related_name='children',
        null=True,
        blank=True,
        help_text='Parent in hierarchy. NULL = root period.'
    )
    name = models.CharField(max_length=200, help_text='Display name (e.g., "Seizoen 2023/2024")')
    description = models.TextField(blank=True, default='')
    start_date = models.DateField(help_text='Period start (date only, no timezone)')
    end_date = models.DateField(help_text='Period end (date only, no timezone)')
    data = models.JSONField(default=dict, blank=True, help_text='Flexible storage for domain-specific attributes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_periods'
    )

    objects = PeriodQuerySet.as_manager()  # Custom manager (T005)

    class Meta:
        db_table = 'activities_period'
        ordering = ['start_date', 'name']
        indexes = [
            models.Index(fields=['organisation', 'project']),
            models.Index(fields=['parent_period']),
            models.Index(fields=['start_date', 'end_date']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gt=models.F('start_date')),
                name='period_end_after_start'
            ),
            models.UniqueConstraint(
                fields=['organisation', 'name', 'start_date'],
                name='unique_period_per_org'
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

    def clean(self):
        """Application-level validation"""
        if self.end_date <= self.start_date:
            raise ValidationError('end_date must be after start_date')

        # Child organisation must match parent organisation
        if self.parent_period and self.organisation_id != self.parent_period.organisation_id:
            raise ValidationError('Child period must belong to same organisation as parent')

    def is_root(self) -> bool:
        """Check if period is root (no parent)"""
        return self.parent_period_id is None

    def get_depth(self) -> int:
        """Return depth in hierarchy (root = 0)"""
        depth = 0
        current = self
        while current.parent_period:
            depth += 1
            current = current.parent_period
        return depth
```

### T003: Define Activity Model

Location: `src/activities/models.py` (same file as Period)

```python
class Activity(models.Model):
    """
    Scheduled event within a project and period.
    Supports flexible activity_type and JSON outcome data storage.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='activities'
    )
    period = models.ForeignKey(
        Period,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    title = models.CharField(max_length=200, help_text='Activity title (e.g., "Ajax vs Feyenoord")')
    activity_type = models.CharField(
        max_length=50,
        help_text='Flexible type field (match, meeting, training, lecture, etc.)'
    )
    start_time = models.DateTimeField(help_text='Activity start (timezone-aware)')
    end_time = models.DateTimeField(help_text='Activity end (timezone-aware)')
    location = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Outcome data (score, goals, meeting notes, etc.)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_activities'
    )

    class Meta:
        db_table = 'activities_activity'
        ordering = ['start_time']
        verbose_name_plural = 'Activities'
        indexes = [
            models.Index(fields=['project', 'period', 'start_time']),
            models.Index(fields=['activity_type']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')),
                name='activity_end_after_start'
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_time.date()})"

    def clean(self):
        """Application-level validation"""
        if self.end_time <= self.start_time:
            raise ValidationError('end_time must be after start_time')

        # Period must belong to same organisation as project
        if self.period.organisation_id != self.project.organisation_id:
            raise ValidationError('Period must belong to same organisation as activity project')
```

### T004: Define Participation Model

Location: `src/activities/models.py` (same file)

```python
class Participation(models.Model):
    """
    Links members to periods or activities with roles.
    Enforces exclusive OR: exactly one of (activity_id, period_id) must be set.
    """
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('tentative', 'Tentative'),
        ('declined', 'Declined'),
        ('no_response', 'No Response'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='participations',
        null=True,
        blank=True,
        help_text='Activity participation (mutually exclusive with period)'
    )
    period = models.ForeignKey(
        Period,
        on_delete=models.CASCADE,
        related_name='participations',
        null=True,
        blank=True,
        help_text='Period participation (mutually exclusive with activity)'
    )
    member = models.ForeignKey(
        'organisations.Membership',
        on_delete=models.CASCADE,
        related_name='participations',
        help_text='Organisation membership (not User)'
    )
    role = models.CharField(
        max_length=50,
        help_text='Flexible role field (squad_member, captain, starter, substitute, attendee, etc.)'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    notes = models.TextField(blank=True, default='')
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Role-specific metadata (jersey_number, position, etc.)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_participations'
    )

    class Meta:
        db_table = 'activities_participation'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['member', 'period']),
            models.Index(fields=['member', 'activity']),
            models.Index(fields=['role', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(activity__isnull=False, period__isnull=True) |
                    models.Q(activity__isnull=True, period__isnull=False)
                ),
                name='participation_activity_xor_period'
            ),
        ]
        unique_together = [
            ('member', 'activity'),  # Prevent duplicate activity participation
            ('member', 'period'),    # Prevent duplicate period participation
        ]

    def __str__(self):
        if self.activity:
            return f"{self.member} - {self.activity.title} ({self.role})"
        elif self.period:
            return f"{self.member} - {self.period.name} ({self.role})"
        return f"{self.member} - Unknown"

    def clean(self):
        """Application-level validation"""
        # Enforce XOR at application layer (backup for database constraint)
        if (self.activity and self.period) or (not self.activity and not self.period):
            raise ValidationError('Participation must link to exactly one of (activity, period)')

        # Member organisation must match activity/period organisation
        if self.activity and self.member.organisation_id != self.activity.project.organisation_id:
            raise ValidationError('Member must belong to same organisation as activity')
        if self.period and self.member.organisation_id != self.period.organisation_id:
            raise ValidationError('Member must belong to same organisation as period')

    def is_activity_participation(self) -> bool:
        return self.activity_id is not None

    def is_period_participation(self) -> bool:
        return self.period_id is not None
```

### T005: Create PeriodQuerySet with CTE Methods

Location: `src/activities/managers.py`

```python
from django.db import models
from django.db.models import Q

class PeriodQuerySet(models.QuerySet):
    """
    Custom QuerySet for Period model with tree navigation methods.
    Uses PostgreSQL recursive CTE for efficient descendant queries.
    """

    def get_descendants(self, period_id):
        """
        Return all descendants of a period using recursive CTE.

        Example usage:
            season = Period.objects.get(name="Seizoen 2023/2024")
            descendants = Period.objects.get_descendants(season.id)
        """
        # PostgreSQL recursive CTE query
        query = """
            WITH RECURSIVE period_tree AS (
                -- Base case: direct children
                SELECT id, parent_period_id, name, start_date, end_date, organisation_id, project_id
                FROM activities_period
                WHERE parent_period_id = %s

                UNION ALL

                -- Recursive case: children of children
                SELECT p.id, p.parent_period_id, p.name, p.start_date, p.end_date, p.organisation_id, p.project_id
                FROM activities_period p
                INNER JOIN period_tree pt ON p.parent_period_id = pt.id
            )
            SELECT id FROM period_tree
        """

        # Execute raw query and return queryset
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(query, [period_id])
            descendant_ids = [row[0] for row in cursor.fetchall()]

        return self.filter(id__in=descendant_ids)

    def get_ancestors(self, period):
        """
        Return all ancestors of a period (iterative climb).

        Example usage:
            november = Period.objects.get(name="November 2023")
            ancestors = Period.objects.get_ancestors(november)
            # Returns [fall_2023, season_2023]
        """
        ancestors = []
        current = period

        while current.parent_period:
            current = current.parent_period
            ancestors.append(current)

        return ancestors

    def roots(self):
        """Return all root periods (parent_period is NULL)"""
        return self.filter(parent_period__isnull=True)

    def children_of(self, period):
        """Return direct children of a period"""
        return self.filter(parent_period=period)
```

Import this manager in `models.py`:
```python
from .managers import PeriodQuerySet
```

### T006: Generate Initial Migration

```bash
python manage.py makemigrations activities
```

Expected output: `src/activities/migrations/0001_initial.py`

Verify migration includes:
- [x] Period table with all fields, indexes, CHECK constraint, PROTECT on parent_period FK
- [x] Activity table with all fields, indexes, CHECK constraint
- [x] Participation table with all fields, indexes, CHECK constraint (XOR), unique_together

**Manual verification**: Open migration file and check for:
```python
migrations.AddConstraint(
    model_name='period',
    constraint=models.CheckConstraint(
        check=models.Q(end_date__gt=models.F('start_date')),
        name='period_end_after_start'
    ),
),
```

### T020: Add to INSTALLED_APPS

Location: `src/config/settings/base.py`

Add to INSTALLED_APPS list:
```python
INSTALLED_APPS = [
    ...
    'activities',  # B30 Generic Activities & Period Hierarchy
    ...
]
```

**Important**: Add AFTER 'organisations', 'projects', 'accounts' (dependencies)

## Test Strategy

### Unit Tests

Create `src/activities/tests/test_models.py`:

```python
import pytest
from django.core.exceptions import ValidationError
from activities.models import Period, Activity, Participation
from datetime import date, datetime, timezone

@pytest.mark.django_db
def test_period_check_constraint_end_after_start(organisation):
    """Test database enforces end_date > start_date"""
    period = Period(
        organisation=organisation,
        name="Invalid Period",
        start_date=date(2024, 12, 31),
        end_date=date(2024, 1, 1)  # Before start_date
    )

    with pytest.raises(ValidationError):
        period.full_clean()  # Application-level validation

    # Database-level would raise IntegrityError on save()

@pytest.mark.django_db
def test_period_hierarchy_depth(organisation):
    """Test 3-level hierarchy creation"""
    season = Period.objects.create(
        organisation=organisation,
        name="Season 2023",
        start_date=date(2023, 9, 1),
        end_date=date(2024, 6, 30)
    )

    fall = Period.objects.create(
        organisation=organisation,
        parent_period=season,
        name="Fall 2023",
        start_date=date(2023, 9, 1),
        end_date=date(2023, 12, 31)
    )

    november = Period.objects.create(
        organisation=organisation,
        parent_period=fall,
        name="November 2023",
        start_date=date(2023, 11, 1),
        end_date=date(2023, 11, 30)
    )

    assert season.is_root()
    assert not fall.is_root()
    assert fall.get_depth() == 1
    assert november.get_depth() == 2

@pytest.mark.django_db
def test_period_get_descendants_cte(organisation):
    """Test recursive CTE query returns all descendants"""
    season = Period.objects.create(
        organisation=organisation,
        name="Season",
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31)
    )

    q1 = Period.objects.create(
        organisation=organisation,
        parent_period=season,
        name="Q1",
        start_date=date(2023, 1, 1),
        end_date=date(2023, 3, 31)
    )

    january = Period.objects.create(
        organisation=organisation,
        parent_period=q1,
        name="January",
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 31)
    )

    descendants = Period.objects.get_descendants(season.id)
    assert descendants.count() == 2
    assert q1 in descendants
    assert january in descendants

@pytest.mark.django_db
def test_participation_xor_constraint(organisation, member, project):
    """Test CHECK constraint enforces activity XOR period"""
    period = Period.objects.create(
        organisation=organisation,
        name="Test Period",
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31)
    )

    activity = Activity.objects.create(
        project=project,
        period=period,
        title="Test Activity",
        activity_type="match",
        start_time=datetime(2024, 1, 15, 14, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 1, 15, 16, 0, tzinfo=timezone.utc)
    )

    # Valid: activity only
    p1 = Participation(
        activity=activity,
        period=None,
        member=member,
        role="starter",
        status="confirmed"
    )
    p1.full_clean()  # Should pass
    p1.save()

    # Valid: period only
    p2 = Participation(
        activity=None,
        period=period,
        member=member,
        role="squad_member",
        status="confirmed"
    )
    p2.full_clean()  # Should pass (unique_together will fail on save, but that's OK for this test)

    # Invalid: both set
    p3 = Participation(
        activity=activity,
        period=period,
        member=member,
        role="starter",
        status="confirmed"
    )
    with pytest.raises(ValidationError):
        p3.full_clean()

    # Invalid: neither set
    p4 = Participation(
        activity=None,
        period=None,
        member=member,
        role="starter",
        status="confirmed"
    )
    with pytest.raises(ValidationError):
        p4.full_clean()
```

### Integration Test

Run migration in test database:
```bash
python manage.py migrate activities --database=test
```

Verify all 3 tables created:
```bash
python manage.py dbshell --database=test
\dt activities_*
```

Expected output:
```
activities_period
activities_activity
activities_participation
```

## Definition of Done

- [x] Django app structure created at src/activities/
- [x] Period model defined with self-referential FK, CHECK constraint, indexes
- [x] Activity model defined with timezone-aware datetimes, CHECK constraint
- [x] Participation model defined with CHECK constraint (XOR), unique_together
- [x] PeriodQuerySet with get_descendants() CTE method implemented
- [x] Initial migration generated (0001_initial.py)
- [x] App added to INSTALLED_APPS
- [x] Migration runs successfully: `python manage.py migrate activities`
- [x] Unit tests pass for model validation and CTE queries
- [x] Integration test: 3-level hierarchy can be created and queried via get_descendants()

## Risks & Reviewer Guidance

**Risk 1**: PostgreSQL recursive CTE may fail on non-PostgreSQL databases
**Check**: Verify migration includes PostgreSQL-specific raw SQL or uses Django 4.2+ CTE support

**Risk 2**: CHECK constraints may not be enforced on all PostgreSQL versions
**Check**: Test on PostgreSQL 9.4, 12, 14 to ensure constraint works

**Risk 3**: Performance of CTE query at depth >10 levels unknown
**Check**: Create test with 12-level hierarchy and measure query time (should be <500ms per spec SC-007)

**Reviewer Checklist**:
- [ ] All models have UUID primary keys
- [ ] All FKs use on_delete (CASCADE or PROTECT as appropriate)
- [ ] CHECK constraints match spec requirements
- [ ] Indexes cover all foreign keys and common query patterns
- [ ] PeriodQuerySet.get_descendants() uses raw SQL CTE
- [ ] Migration file is idempotent (can run multiple times safely)
- [ ] No circular imports between models and managers

## Activity Log

- 2026-01-06T07:37:26Z – claude – shell_pid=36572 – lane=doing – Started implementation
- 2026-01-06T07:43:00Z – claude – shell_pid=36572 – lane=doing – Completed implementation. All tasks: T001 (app structure), T002 (Period model), T003 (Activity model), T004 (Participation model), T005 (PeriodQuerySet with CTE), T006 (migration generated), T020 (INSTALLED_APPS). Migration applied successfully.
