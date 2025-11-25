---
lane: "for_review"
agent: "copilot"
shell_pid: "11524"
---
# WP01: Django App Structure & Setup

**Work Package ID**: WP01
**Status**: Planned
**Priority**: Critical (blocking all other work)
**Assigned**: Unassigned
**Estimated Effort**: 2-3 hours

## History

| Date | Author | Change | Lane |
|------|--------|--------|------|
| 2025-11-25 | spec-kitty | Initial creation | planned |

---

## Objective

Create Django `projects` app with proper structure, configure in settings, verify basic setup, and create comprehensive app documentation.

**Goal**: Establish the Django app foundation with all necessary directories, configuration, and documentation so that subsequent work packages can build the models, APIs, and tests.

---

## Context

This is the first work package for Feature 007 (Projects & Workspaces Management). The `projects` app will provide workspace/project containers within organisations for scoping resources.

**Dependencies**:
- ✅ Feature 005 (Core Accounts & Authentication) - User model exists
- ✅ Feature 006 (Organisation Management) - Organisation model exists
- ✅ Project structure from Feature 001 (skeleton)

**No new dependencies required** - this feature uses only existing project tools.

---

## Subtasks

### T001: Create Django app directory structure

**Description**: Create the base `projects` app directory with all required Django files.

**Steps**:
1. Navigate to `src/` directory
2. Create `projects/` directory
3. Create core files:
   - `__init__.py` (empty, marks as Python package)
   - `apps.py` with `ProjectsConfig` class
   - `models.py` (empty for now, will be populated in WP02)
   - `admin.py` (empty for now, will be populated in WP07)
   - `signals.py` (empty for now, will be populated in WP07)

**Expected Output**:
```
src/projects/
├── __init__.py
├── apps.py
├── models.py
├── admin.py
└── signals.py
```

**apps.py content**:
```python
from django.apps import AppConfig

class ProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'projects'
    verbose_name = 'Projects & Workspaces'

    def ready(self):
        """Import signal handlers when app is ready."""
        import projects.signals  # noqa: F401
```

**Acceptance**: Directory exists with all files, `apps.py` has correct configuration.

---

### T002: Create API sub-package structure

**Description**: Create the `projects/api/` subdirectory with files for REST API implementation.

**Steps**:
1. Create `projects/api/` directory
2. Create API files:
   - `__init__.py` (empty)
   - `serializers.py` (empty, will be populated in WP03)
   - `views.py` (empty, will be populated in WP03)
   - `urls.py` (empty, will be populated in WP03)
   - `permissions.py` (empty, will be populated in WP03)

**Expected Output**:
```
src/projects/api/
├── __init__.py
├── serializers.py
├── views.py
├── urls.py
└── permissions.py
```

**Acceptance**: API subdirectory exists with all files.

---

### T003: Add projects app to INSTALLED_APPS

**Description**: Register the `projects` app in Django settings so it can be discovered and migrations can be generated.

**Steps**:
1. Open `src/config/settings/base.py`
2. Locate the `INSTALLED_APPS` list
3. Add `'projects.apps.ProjectsConfig',` to the local apps section (after `organisations`)

**Expected Change**:
```python
INSTALLED_APPS = [
    # ... Django built-in apps ...

    # Local apps
    'common',
    'organisations.apps.OrganisationsConfig',
    'projects.apps.ProjectsConfig',  # NEW
]
```

**Acceptance**: `python manage.py check` passes without errors mentioning projects app.

---

### T004: Configure URL routing (nested + top-level)

**Description**: Include projects API URLs in the main URL configuration with dual routing (nested under organisations and top-level).

**Steps**:
1. Open `src/config/urls.py`
2. Add import: `from projects.api import urls as projects_urls` (at top with other imports)
3. Add URL patterns for both nested and top-level routing (after organisations URLs)

**Expected Changes**:
```python
# src/config/urls.py
from django.urls import path, include
from projects.api import urls as projects_urls

urlpatterns = [
    # ... existing patterns ...

    # Projects API (dual routing)
    path('api/organisations/<int:organisation_id>/projects/',
         include(projects_urls.nested_router.urls)),  # Nested
    path('api/projects/',
         include(projects_urls.toplevel_router.urls)),  # Top-level
]
```

**Note**: The actual router setup in `projects/api/urls.py` will be implemented in WP03. For now, this prepares the URL configuration.

**Acceptance**: URL configuration includes projects paths (URLs will return 404 until WP03, but no import errors).

---

### T005: Create app README with extension guide

**Description**: Write comprehensive documentation for the projects app explaining its purpose, architecture, and how product features can extend it via foreign keys.

**Steps**:
1. Create `src/projects/README.md`
2. Document:
   - App purpose and scope
   - Architecture overview (models, API, permissions)
   - Extension patterns for product features
   - Code examples for adding foreign keys
   - Testing recommendations

**Expected Content Structure**:
```markdown
# Projects App

## Purpose
Provides workspace/project containers within organisations for scoping resources.

## Architecture
- **Models**: Project (with Organisation and User FKs)
- **API**: REST endpoints (nested + top-level)
- **Permissions**: Organisation-level access control

## Extending Projects for Product Features

### Pattern 1: Associate Resources via Foreign Key
...code example...

### Pattern 2: Query Resources by Project
...code example...

### Pattern 3: Cascade Behavior
...explanation...
```

**Full Content**:
```markdown
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
- Constraints: Unique (organisation, slug), case-insensitive unique (name, organisation)
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
```

**Acceptance**: README exists with comprehensive documentation and code examples.

---

## Implementation Sketch

**High-Level Sequence**:
1. Create base app directory structure (T001)
2. Create API subdirectory structure (T002)
3. Update settings to register app (T003)
4. Update URL configuration (T004)
5. Write comprehensive README (T005)
6. Run `python manage.py check` to verify setup

**Parallel Opportunities**:
- T001-T002 [P]: Directory structures can be created in parallel
- T003-T004 [P]: Settings and URL configuration can be done in parallel
- T005 [P]: Documentation can be written in parallel with config changes

---

## Success Criteria

- [ ] `src/projects/` directory exists with all required files
- [ ] `src/projects/api/` directory exists with all required files
- [ ] `projects.apps.ProjectsConfig` registered in `INSTALLED_APPS`
- [ ] URL patterns include projects routes (nested + top-level)
- [ ] `src/projects/README.md` exists with extension guide
- [ ] `python manage.py check` passes without errors
- [ ] Django admin site is accessible (no app registration errors)

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Import errors in urls.py | Low | Low | Add empty routers in urls.py initially |
| App registration fails | Low | Medium | Verify AppConfig name matches directory |

---

## Definition of Done

- All subtasks marked complete
- All success criteria checked
- `python manage.py check` passes
- Django server starts without errors: `python manage.py runserver`
- README reviewed for completeness and code examples tested

---

## Reviewer Guidance

**What to Check**:
1. Directory structure matches specification
2. `apps.py` has correct `AppConfig` with signal import in `ready()`
3. `INSTALLED_APPS` includes `projects.apps.ProjectsConfig`
4. URL configuration is prepared for dual routing
5. README is comprehensive with working code examples
6. No import errors or warnings from Django

**Testing**:
```bash
cd src
python manage.py check
python manage.py showmigrations projects  # Should show "No migrations"
```

**Common Issues**:
- Forgetting `__init__.py` files (makes directories non-importable)
- Typo in AppConfig name (causes registration failure)
- Missing signal import in `ready()` method

## Activity Log

- 2025-11-25T12:50:06Z – copilot – shell_pid=11524 – lane=doing – Started implementation
- 2025-11-25T12:54:45Z – copilot – shell_pid=11524 – lane=for_review – Completed WP01 implementation
