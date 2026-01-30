---
work_package_id: WP04
title: User Story 3 - Template Management
lane: doing
subtasks:
  - T022
  - T023
  - T024
  - T025
  - T026
  - T027
priority: P2
estimated_effort: 1-2 days
dependencies: [WP01]
assignee: github-copilot
agent: github-copilot
shell_pid: "$PID"
history:
  - date: 2026-01-29
    action: created
    author: spec-kitty
  - date: 2026-01-30T06:58:00Z
    action: moved_to_doing
    author: github-copilot
    shell_pid: "$PID"
    note: "Started WP04: User Story 3 - Template Management implementation"
---

# WP04: User Story 3 - Template Management

## Objective

Implement template CRUD: list/filter by sport, create/update templates, toggle active status, delete protection, seed initial templates via data migration.

## Subtasks

### T022: ContentTemplateSerializer

```python
class ContentTemplateSerializer(serializers.ModelSerializer):
    organisation_detail = serializers.SerializerMethodField()
    project_detail = serializers.SerializerMethodField()
    created_by_detail = serializers.SerializerMethodField()

    class Meta:
        model = ContentTemplate
        fields = ['id', 'name', 'description', 'template_type', 'sport_type', 'ai_workflow_id',
                  'template_settings', 'timeout_minutes', 'is_active', 'organisation',
                  'organisation_detail', 'project', 'project_detail', 'created_by',
                  'created_by_detail', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate_timeout_minutes(self, value):
        if value is not None and (value < 1 or value > 1440):
            raise serializers.ValidationError("Timeout must be between 1 and 1440 minutes (24 hours)")
        return value

    def validate_template_settings(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("template_settings must be a valid JSON object")
        return value
```

---

### T023: ContentTemplateViewSet

```python
from django_filters import rest_framework as filters

class ContentTemplateFilter(filters.FilterSet):
    sport_type = filters.CharFilter(field_name='sport_type')
    is_active = filters.BooleanFilter(field_name='is_active')
    project = filters.NumberFilter(field_name='project')

    class Meta:
        model = ContentTemplate
        fields = ['sport_type', 'is_active', 'project']


class ContentTemplateViewSet(viewsets.ModelViewSet):
    queryset = ContentTemplate.objects.select_related('organisation', 'project', 'created_by')
    serializer_class = ContentTemplateSerializer
    filterset_class = ContentTemplateFilter

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Override delete to check for existing ContentItems"""
        template = self.get_object()

        # Check if any ContentItems exist
        if template.contentitem_set.exists():
            return Response({
                'error': 'Cannot delete template with existing content items',
                'content_items_count': template.contentitem_set.count()
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)
```

---

### T024: Query Filters

Already implemented in T023 via `ContentTemplateFilter`.

Filters:
- `?sport_type=football`
- `?is_active=true`
- `?project=5`

---

### T025: Soft-Delete Protection

Already implemented in T023 `destroy()` method.

Logic: Check `template.contentitem_set.exists()` → return 400 if true.

---

### T026: Seed Initial Templates (Data Migration)

Create data migration:

```bash
python manage.py makemigrations content_generation --empty --name seed_initial_templates
```

Edit migration file:

```python
from django.db import migrations

def seed_templates(apps, schema_editor):
    ContentTemplate = apps.get_model('content_generation', 'ContentTemplate')
    User = apps.get_model('auth', 'User')
    Organisation = apps.get_model('organisations', 'Organisation')

    # Get first user and org for seeding
    user = User.objects.first()
    org = Organisation.objects.first()

    if not user or not org:
        return  # Skip if no users/orgs exist

    templates = [
        {
            'name': 'Line-up Video',
            'description': 'Generate video showing starting line-up with player names and formation',
            'template_type': 'pre_match',
            'sport_type': 'football',
            'ai_workflow_id': 'workflow_lineup_v2',
            'template_settings': {
                'duration_seconds': 30,
                'background_music': True,
                'show_formation': True
            },
            'timeout_minutes': 15,
            'is_active': True,
            'organisation': org,
            'created_by': user
        },
        {
            'name': 'Match Highlights',
            'description': 'Generate 90-second highlight reel with goals and key moments',
            'template_type': 'post_match',
            'sport_type': 'football',
            'ai_workflow_id': 'workflow_highlights_v3',
            'template_settings': {
                'duration_seconds': 90,
                'include_goals': True,
                'include_cards': True
            },
            'timeout_minutes': 30,
            'is_active': True,
            'organisation': org,
            'created_by': user
        }
    ]

    for template_data in templates:
        ContentTemplate.objects.get_or_create(
            name=template_data['name'],
            organisation=org,
            defaults=template_data
        )

def reverse_seed(apps, schema_editor):
    ContentTemplate = apps.get_model('content_generation', 'ContentTemplate')
    ContentTemplate.objects.filter(name__in=['Line-up Video', 'Match Highlights']).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('content_generation', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_templates, reverse_seed),
    ]
```

---

### T027: B32 Sport Config Integration

Optional enhancement (B32 may not exist yet):

```python
def validate_sport_type(self, value):
    """Validate sport_type against B32 Sport Config"""
    if value:
        try:
            from src.sport_config.models import SportType
            if not SportType.objects.filter(code=value).exists():
                raise serializers.ValidationError(f"Invalid sport_type: {value}")
        except ImportError:
            # B32 not installed, skip validation
            pass
    return value
```

---

## Definition of Done

- [ ] All 6 subtasks (T022-T027) completed
- [ ] `GET /templates/?sport_type=football` filters correctly
- [ ] `PATCH /templates/{id}/` with `is_active: false` works
- [ ] `DELETE /templates/{id}/` fails with 400 if items exist
- [ ] Data migration seeds 2+ templates
- [ ] Templates visible in Django Admin

---

## Testing

```bash
# List templates
curl http://localhost:8000/api/v1/content-generation/templates/?sport_type=football

# Toggle active
curl -X PATCH http://localhost:8000/api/v1/content-generation/templates/1/ \
  -d '{"is_active": false}'

# Try delete (should fail if items exist)
curl -X DELETE http://localhost:8000/api/v1/content-generation/templates/1/
```
