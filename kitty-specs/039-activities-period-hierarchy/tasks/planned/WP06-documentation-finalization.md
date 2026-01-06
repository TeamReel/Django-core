# Work Package 06: Documentation & Finalization

---
**work_package_id**: WP06
**lane**: planned
**priority**: P3
**estimated_effort**: 3 hours
**dependencies**: WP01, WP02, WP03, WP04, WP05
**blocks**: None
**subtasks**: T021, T022, T023
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Objective

Create developer documentation per Constitution Article XI requirements. Write module README, ADR for tree design decision, and update extending-core.md guide with activities module patterns.

## Context

Constitution Article XI requires:
- README.md for each module explaining purpose, scope, interface
- ADR documenting major architectural decisions
- Extension guide updates for product-specific customization patterns

These artifacts enable new developers to understand and extend the activities module without spelunking through code.

## Detailed Guidance

### T021: Create Module README

Location: `src/activities/README.md`

```markdown
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
```

### T022: Create ADR

Location: `documents/03-system/architecture-decisions/012-period-hierarchy-design.md`

```markdown
# ADR 012: Period Hierarchy Design

**Status**: Accepted
**Date**: 2026-01-05
**Authors**: Core Team
**Related**: B30 Activities & Period Hierarchy

## Context

Products require flexible time-based organization of activities. Use cases span:
- Sports: Season → Competition Phase → Month → Week
- Business: Fiscal Year → Quarter → Month → Sprint
- Education: Academic Year → Semester → Module → Week

Requirements:
1. Unlimited depth (no fixed hierarchy levels)
2. Efficient tree navigation (ancestors, descendants)
3. Zero external dependencies
4. Performance <500ms for queries up to 10 levels deep

## Decision

Implement self-referential foreign key with PostgreSQL recursive CTE (Common Table Expression) via custom Django QuerySet manager.

**Model Design**:
```python
class Period(models.Model):
    parent_period = models.ForeignKey('self', null=True, on_delete=PROTECT)
    # ... other fields
```

**Tree Navigation**:
```python
class PeriodQuerySet(models.QuerySet):
    def get_descendants(self, period_id):
        # PostgreSQL recursive CTE
        query = """
            WITH RECURSIVE period_tree AS (
                SELECT id FROM activities_period WHERE parent_period_id = %s
                UNION ALL
                SELECT p.id FROM activities_period p
                INNER JOIN period_tree pt ON p.parent_period_id = pt.id
            )
            SELECT id FROM period_tree
        """
        ...
```

## Alternatives Considered

### Alternative 1: django-treebeard (MPTT - Modified Preorder Tree Traversal)

**Pros**:
- Battle-tested library with ~2k stars
- Optimized for read-heavy workloads (single query for descendants)
- Automatic tree management (left/right values)

**Cons**:
- External dependency (violates Constitution III: "Curated Dependencies")
- Tree rebalancing overhead on writes (inserts shift left/right values)
- More complex to debug (MPTT values non-intuitive)
- Overkill for typical hierarchy depths (<10 levels)

**Rejected because**: Spec prioritizes zero external dependencies and simple implementation over micro-optimization.

### Alternative 2: Fixed-Depth Models (e.g., Season → Phase → Month)

**Pros**:
- Simple schema (3 separate models)
- No recursive queries needed
- Explicit field names (season, phase, month)

**Cons**:
- Inflexible (cannot handle 2-level or 5-level hierarchies)
- Violates product-agnostic principle (assumes sports domain structure)
- Code duplication across hierarchy levels
- Cannot support dynamic depth (e.g., Business: Year → Quarter → Month vs Education: Year → Semester)

**Rejected because**: Spec explicitly requires unlimited-depth flexibility for diverse products.

### Alternative 3: Materialized Path (path = "001.003.007")

**Pros**:
- Fast descendant queries (LIKE 'path%')
- No CTE complexity
- Works on non-PostgreSQL databases (MySQL, SQLite)

**Cons**:
- Path column management overhead (must update all descendants when moving subtree)
- Fixed path segment width limits (e.g., 3 digits = max 999 children per node)
- Harder to debug (path strings less readable than parent_id)
- Not needed until 15+ levels (spec only guarantees 10)

**Rejected because**: CTE simpler for common case (<10 levels). Materialized path can be added later as optimization if needed.

### Alternative 4: Closure Table (separate ancestor-descendant mapping table)

**Pros**:
- Fastest descendant queries (single JOIN)
- Supports multiple parents (DAG structure)

**Cons**:
- Significant storage overhead (O(n²) for deep trees)
- Maintenance complexity (triggers to keep closure table in sync)
- Overkill for tree structure (periods have single parent)

**Rejected because**: Storage and maintenance complexity not justified for single-parent tree.

## Consequences

### Positive

- ✅ **Zero dependencies**: No external libraries required
- ✅ **Simple schema**: Single `parent_period_id` FK, easy to understand
- ✅ **Flexible depth**: Supports 2-level to 20-level hierarchies without schema changes
- ✅ **Performance**: <500ms for 10-level hierarchies (meets spec SC-007)
- ✅ **Product-agnostic**: Works for sports, business, education use cases

### Negative

- ❌ **PostgreSQL-only**: Recursive CTE not supported in MySQL/SQLite (acceptable trade-off, Core targets PostgreSQL)
- ❌ **Write complexity**: Moving subtrees requires updating parent_period_id for all descendants (mitigated: rare operation)
- ❌ **Performance degradation >15 levels**: Not performance-tested beyond 10 levels (mitigated: soft warning at 11+, materialized path recommendation)

### Neutral

- ⚠️ **CTE query complexity**: Recursive SQL harder to understand than simple FK queries (mitigated: encapsulated in QuerySet manager, documented)
- ⚠️ **No cycle detection**: Application must prevent user from setting parent_period to descendant (mitigated: serializer validation)

## Implementation Notes

1. **Soft warning at 11+ levels**: Display UI warning recommending materialized path if hierarchy exceeds 10 levels
2. **Performance monitoring**: Add metrics for `get_descendants()` query times (integrate with B09)
3. **Future optimization**: If query times exceed 500ms, add materialized path column without breaking API
4. **Migration path**: Materialized path can be added as denormalized cache column without removing parent_period FK

## References

- [PostgreSQL Recursive CTE documentation](https://www.postgresql.org/docs/current/queries-with.html)
- Spec: `kitty-specs/039-activities-period-hierarchy/spec.md` (SC-007, FR-003, FR-009)
- Research: `kitty-specs/039-activities-period-hierarchy/research.md` (Decision 1: Tree Implementation)
```

### T023: Update Extending Core Guide

Location: `documents/06-workflow/extending-core.md`

Add new section at end of file:

```markdown
## Extending the Activities Module

The Activities module (B30) provides generic time-based resource planning. Products customize behavior via flexible fields, JSON data, and serializer overrides.

### Custom Activity Types

`Activity.activity_type` is a string field with no database constraints. Products define their own vocabulary.

**Example: Sports product**
```python
# Product-specific serializer
class SportsActivitySerializer(ActivitySerializer):
    ALLOWED_TYPES = ['match', 'training', 'tournament', 'friendly']

    def validate_activity_type(self, value):
        if value not in self.ALLOWED_TYPES:
            raise serializers.ValidationError(f'Activity type must be one of {self.ALLOWED_TYPES}')
        return value
```

**Example: Business product**
```python
BUSINESS_ACTIVITY_TYPES = ['meeting', 'workshop', 'review', 'planning', 'retrospective']
```

### Custom Roles

`Participation.role` is a flexible string field for product-specific role vocabularies.

**Example: Sports roles**
- Period roles: `squad_member`, `captain`, `coach`, `physio`
- Activity roles: `starter`, `substitute`, `reserve`, `injured`

**Example: Business roles**
- Period roles: `team_member`, `team_lead`, `stakeholder`
- Activity roles: `organizer`, `attendee`, `presenter`, `note_taker`

**Validation example**:
```python
class ProductParticipationSerializer(ParticipationSerializer):
    def validate_role(self, value):
        if self.instance and self.instance.period:
            # Period participation
            allowed_roles = ['squad_member', 'captain', 'coach']
        elif self.instance and self.instance.activity:
            # Activity participation
            allowed_roles = ['starter', 'substitute', 'reserve']
        else:
            allowed_roles = []

        if value not in allowed_roles:
            raise serializers.ValidationError(f'Role must be one of {allowed_roles}')

        return value
```

### Outcome Data Patterns

`Activity.data` JSONField stores domain-specific outcome data with no schema constraints at Core level.

**Sports: Match outcome**
```json
{
  "score_home": 3,
  "score_away": 1,
  "goals": [
    {"player_id": "uuid", "player_name": "Speler 1", "minute": 23, "type": "penalty"},
    {"player_id": "uuid", "player_name": "Speler 5", "minute": 67, "type": "header"},
    {"player_id": "uuid", "player_name": "Speler 1", "minute": 89, "type": "free_kick"}
  ],
  "cards": [
    {"player_id": "uuid", "player_name": "Speler 3", "minute": 45, "type": "yellow"},
    {"player_id": "uuid", "player_name": "Speler 7", "minute": 78, "type": "red"}
  ],
  "attendance": 50000,
  "referee": "Referee Name",
  "weather": "sunny"
}
```

**Business: Meeting outcome**
```json
{
  "decisions": [
    "Approved Q2 budget increase",
    "Hire 2 senior developers",
    "Postpone feature X to Q3"
  ],
  "action_items": [
    {"owner_id": "uuid", "task": "Draft hiring plan", "due_date": "2024-02-15"},
    {"owner_id": "uuid", "task": "Update roadmap", "due_date": "2024-02-10"}
  ],
  "attendees": ["user_id_1", "user_id_2", "user_id_3"],
  "absentees": ["user_id_4"],
  "notes": "Discussion about Q2 priorities..."
}
```

**Education: Lecture outcome**
```json
{
  "topics_covered": ["Introduction to Django", "Models and Migrations"],
  "attendance": ["student_id_1", "student_id_2", "student_id_3"],
  "homework_assigned": true,
  "homework_due_date": "2024-02-20",
  "quiz_results": {"average_score": 85, "highest_score": 98},
  "materials": ["slides_url", "recording_url"]
}
```

### Custom Validation

Products add business rules via serializer overrides.

**Example: Require outcome data for completed activities**
```python
class ProductActivitySerializer(ActivitySerializer):
    STATUS_CHOICES = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']

    def validate(self, data):
        data = super().validate(data)

        status = data.get('status')
        outcome_data = data.get('data', {})

        if status == 'completed' and not outcome_data:
            raise serializers.ValidationError({
                'data': 'Outcome data required for completed activities'
            })

        # Sports-specific: Require score for completed matches
        if status == 'completed' and data.get('activity_type') == 'match':
            if 'score_home' not in outcome_data or 'score_away' not in outcome_data:
                raise serializers.ValidationError({
                    'data': 'Score required for completed matches'
                })

        return data
```

**Example: Prevent double-booking participants**
```python
class ProductActivitySerializer(ActivitySerializer):
    def validate(self, data):
        data = super().validate(data)

        # Check if any participants have conflicting activities
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        participant_ids = data.get('participant_ids', [])  # Assuming nested create

        if start_time and end_time and participant_ids:
            conflicting = Activity.objects.filter(
                participations__member_id__in=participant_ids,
                start_time__lt=end_time,
                end_time__gt=start_time
            ).exists()

            if conflicting:
                raise serializers.ValidationError({
                    'participant_ids': 'One or more participants have conflicting activities'
                })

        return data
```

### Participation Metadata

`Participation.data` JSONField stores role-specific metadata.

**Sports: Squad member metadata**
```json
{
  "jersey_number": 10,
  "position": "striker",
  "join_date": "2023-09-01",
  "contract_end": "2025-06-30",
  "preferred_foot": "right"
}
```

**Sports: Activity participant metadata**
```json
{
  "minutes_played": 90,
  "goals_scored": 2,
  "assists": 1,
  "yellow_cards": 0,
  "red_cards": 0,
  "substitution_minute": null
}
```

**Business: Team member metadata**
```json
{
  "role_start_date": "2024-01-01",
  "allocation_percentage": 80,
  "skills": ["python", "django", "postgresql"],
  "certifications": ["AWS Solutions Architect"]
}
```

### Advanced: Custom Period Types

For products needing distinct period types (e.g., "Season" vs "Training Camp"), add `period_type` field via model inheritance or JSON data:

**Option 1: JSON data field** (recommended, no migration)
```python
season = Period.objects.create(
    name="Season 2023/2024",
    data={"period_type": "season", "competition_tier": "professional"}
)
```

**Option 2: Model inheritance** (for complex products with distinct period behaviors)
```python
class Season(Period):
    competition_tier = models.CharField(max_length=50)
    promotion_eligible = models.BooleanField(default=True)

    class Meta:
        proxy = False  # Concrete subclass
```

### Integration: B16 Notifications

Trigger notifications on activity creation or participant changes:

```python
# Product-specific signal
@receiver(post_save, sender=Activity)
def notify_activity_created(sender, instance, created, **kwargs):
    if created:
        from notifications.api import send_notification

        # Notify all period members
        period_members = instance.period.participations.values_list('member_id', flat=True)

        send_notification(
            notification_type='activity.created',
            recipients=period_members,
            context={
                'activity_id': str(instance.id),
                'title': instance.title,
                'start_time': instance.start_time.isoformat()
            }
        )
```

### Integration: B29 Export

Export activities to PDF with outcome data formatting:

```python
from reporting.api import generate_pdf

def export_match_report(activity_id):
    activity = Activity.objects.get(id=activity_id)

    template_data = {
        'title': activity.title,
        'date': activity.start_time.date(),
        'location': activity.location,
        'score': f"{activity.data.get('score_home')} - {activity.data.get('score_away')}",
        'goals': activity.data.get('goals', []),
        'cards': activity.data.get('cards', []),
        'participants': activity.participations.select_related('member').all()
    }

    pdf = generate_pdf(template='match_report.html', context=template_data)
    return pdf
```
```

## Definition of Done

- [x] src/activities/README.md created with all sections complete
- [x] ADR 012 created documenting CTE design vs alternatives
- [x] extending-core.md updated with activities extension patterns
- [x] All documentation accurate (matches implementation)
- [x] Code examples tested and functional
- [x] Cross-references correct (module names, file paths)

## Risks & Reviewer Guidance

**Risk**: Documentation may drift from implementation
**Mitigation**: Include in PR checklist. Review all code examples for accuracy.

**Reviewer Checklist**:
- [ ] README Public Interface examples use correct import paths
- [ ] ADR alternatives section includes rationales (not just pros/cons lists)
- [ ] Extension guide examples follow Constitution (product-agnostic Core)
- [ ] All file paths absolute or relative to project root
- [ ] JSON examples valid (no trailing commas, proper escaping)
