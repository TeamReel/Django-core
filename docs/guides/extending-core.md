# Extending Core

This guide explains how to extend Core modules for product-specific functionality while maintaining Constitution compliance.

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
