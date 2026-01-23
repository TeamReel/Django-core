# Projects App

## Purpose

The `projects` app provides workspace/project containers within organisations for scoping resources. Projects are generic context containers that product-specific features can reference to group related data.

## Key Principles

- **Product-Agnostic**: Contains NO product-specific logic, pricing, workflows, or UI flows
- **Extension-Friendly**: Product features extend via foreign keys to Project model
- **Organisation-Scoped**: All projects belong to an organisation, access controlled at org level
- **Soft Deletion**: Projects are archived (is_active=False) rather than hard-deleted

## Architecture

### Models (`projects/models.py`)

**Project Model**:
- Fields: id, organisation (FK), creator (FK), name, slug, description, is_active, timestamps
- Constraints: Slug unique (root per organisation; child per parent project), case-insensitive unique (name scoped similarly)
- Indexes: organisation_id, slug, is_active
- Managers: `objects` (active only), `all_objects` (all projects including archived)

### API (`projects/api/`)

**Dual Endpoint Structure**:
- Nested: `/api/organisations/{org_id}/projects/` - Organisation-scoped operations
- Top-level: `/api/projects/` - Cross-organisation queries for user dashboards

**Permissions**:
- Create/Update/Archive: Organisation admin required (via Feature 006 `IsOrganisationAdmin`)
- View/List: Organisation membership required

### Soft Deletion

Projects use soft deletion pattern:
- Archive: Sets `is_active=False`, `archived_at=now()`
- Restore: Sets `is_active=True`, `archived_at=None`
- Default queries filter to `is_active=True`

## Extending Projects for Product Features

### Pattern 1: Associate Resources via Foreign Key

Add a foreign key to the Project model in your product feature:

```python
# your_app/models.py
from django.db import models

class YourResource(models.Model):
    """Your product-specific resource."""
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='your_resources',
        null=True,  # Optional association
        blank=True,
        help_text="Project this resource belongs to"
    )
    name = models.CharField(max_length=200)
    # ... other product-specific fields

    class Meta:
        db_table = 'your_app_resource'
        indexes = [
            models.Index(fields=['project']),  # Query optimization
        ]
```

**API Example**:
```python
# your_app/api/serializers.py
class YourResourceSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = YourResource
        fields = ['id', 'project', 'name', ...]
```

### Pattern 2: Query Resources by Project

Filter your resources by project in API views:

```python
# your_app/api/views.py
from rest_framework import viewsets
from projects.models import Project

class YourResourceViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = YourResource.objects.all()

        # Filter by project if provided
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Optimize queries
        queryset = queryset.select_related('project')

        return queryset
```

**Usage**: `GET /api/your-resources/?project=123`

### Pattern 3: Cascade Behavior

**Project Deleted (Hard Delete - Rare)**:
```python
project = models.ForeignKey(
    'projects.Project',
    on_delete=models.CASCADE  # Your resources are deleted
)
```

**Project Archived (Soft Delete - Common)**:
Soft deletion does NOT cascade. Handle archived projects in your queries:

```python
# Option 1: Exclude resources from archived projects
YourResource.objects.filter(project__is_active=True)

# Option 2: Allow resources from archived projects
YourResource.objects.all()  # Includes resources from archived projects
```

### Pattern 4: Validation (Ensure Project Belongs to User's Organisation)

Validate project ownership in serializers:

```python
class YourResourceSerializer(serializers.ModelSerializer):
    def validate_project(self, project):
        """Ensure project belongs to user's organisation."""
        user = self.context['request'].user
        user_org_ids = user.memberships.values_list('organisation_id', flat=True)

        if project and project.organisation_id not in user_org_ids:
            raise serializers.ValidationError(
                "Project does not belong to your organisation"
            )

        return project
```

## Testing Recommendations

### Unit Tests

Test your resource model with project associations:

```python
@pytest.mark.django_db
def test_resource_with_project(project):
    resource = YourResource.objects.create(
        project=project,
        name="Test Resource"
    )
    assert resource.project == project
    assert resource in project.your_resources.all()
```

### API Tests

Test filtering by project:

```python
@pytest.mark.django_db
def test_filter_resources_by_project(api_client, user, project):
    # Create resources
    resource1 = YourResource.objects.create(project=project, name="R1")
    resource2 = YourResource.objects.create(project=None, name="R2")

    api_client.force_authenticate(user=user)
    response = api_client.get(f'/api/your-resources/?project={project.id}')

    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == resource1.id
```

## Performance Tips

1. **Use select_related** when querying resources with projects:
   ```python
   YourResource.objects.select_related('project', 'project__organisation')
   ```

2. **Index project foreign keys** for fast filtering:
   ```python
   class Meta:
       indexes = [
           models.Index(fields=['project']),
       ]
   ```

3. **Cache project details** (projects change infrequently):
   ```python
   from django.core.cache import cache

   project = cache.get(f'project:{project_id}')
   if not project:
       project = Project.objects.get(id=project_id)
       cache.set(f'project:{project_id}', project, 300)  # 5 minutes
   ```

## Dependencies

- **Upstream**: Feature 005 (Accounts), Feature 006 (Organisations)
- **Downstream**: Product features that reference projects via foreign keys

## Future Integration

**Feature 009 (Audit Logging)**: Signal handlers in `projects/signals.py` are stubbed for audit logging. When Feature 009 is implemented, replace stub logging with audit service calls.

---

**Last Updated**: 2025-11-25
**Maintainer**: Django Core Team
