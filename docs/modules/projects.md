# Projects Module

Project workspace management within organizations.

## Overview

The `projects` module provides workspace containers within organizations. Projects scope resources and permissions, enabling structured organization of work across teams.

**App location**: `src/projects/`
**Feature spec**: `kitty-specs/007-projects-workspaces-management/`

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'projects.apps.ProjectsConfig',
    ...
]
```

## Models

### Project

Workspace container within an organization.

| Field | Type | Description |
|-------|------|-------------|
| `organisation` | ForeignKey | Parent organization |
| `creator` | ForeignKey | User who created project |
| `name` | CharField | Display name (max 200) |
| `slug` | SlugField | URL-safe identifier |
| `description` | TextField | Optional description (max 2000) |
| `is_active` | BooleanField | False when archived |
| `created_at` | DateTimeField | Creation timestamp |
| `updated_at` | DateTimeField | Last update |
| `archived_at` | DateTimeField | Archive timestamp |

**Constraints**:
- Unique slug per organization
- Case-insensitive unique name per organization

## API Endpoints

### List Projects

```http
GET /api/v1/organisations/{org_slug}/projects/
Authorization: Bearer <token>
```

**Response**:
```json
{
  "count": 3,
  "results": [
    {
      "slug": "my-project",
      "name": "My Project",
      "description": "Project description",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Create Project

```http
POST /api/v1/organisations/{org_slug}/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Optional description"
}
```

### Get Project Details

```http
GET /api/v1/organisations/{org_slug}/projects/{slug}/
Authorization: Bearer <token>
```

### Update Project

```http
PATCH /api/v1/organisations/{org_slug}/projects/{slug}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Archive Project

```http
POST /api/v1/organisations/{org_slug}/projects/{slug}/archive/
Authorization: Bearer <token>
```

### Restore Project

```http
POST /api/v1/organisations/{org_slug}/projects/{slug}/restore/
Authorization: Bearer <token>
```

### Delete Project

```http
DELETE /api/v1/organisations/{org_slug}/projects/{slug}/
Authorization: Bearer <token>
```

## Usage Examples

### Creating a Project

```python
from projects.models import Project

project = Project.objects.create(
    organisation=org,
    creator=request.user,
    name="My New Project",
    description="A workspace for my team",
)
# Slug auto-generated: "my-new-project"
```

### Querying Projects

```python
# Active projects only (default manager)
active_projects = Project.objects.filter(organisation=org)

# Include archived projects
all_projects = Project.all_objects.filter(organisation=org)

# Projects created by user
my_projects = Project.objects.filter(creator=request.user)
```

### Archive and Restore

```python
# Archive (soft delete)
project.archive()
# is_active=False, archived_at set

# Restore
project.restore()
# is_active=True, archived_at cleared
```

### Custom Managers

```python
# ActiveProjectManager (default)
Project.objects.all()  # Only active projects

# AllProjectManager
Project.all_objects.all()  # Include archived
Project.all_objects.archived()  # Only archived
```

## Slug Generation

Slugs are auto-generated from project names:

```python
# Name: "My Project"
# Slug: "my-project"

# Collision handling:
# "my-project" exists → "my-project-2"
# "my-project-2" exists → "my-project-3"
```

### Custom Slug

```python
project = Project.objects.create(
    organisation=org,
    creator=user,
    name="Project Name",
    slug="custom-slug",  # Optional custom slug
)
```

## Permission Scoping

Projects inherit permissions from organizations:

```python
from permissions.evaluator import PermissionEvaluator

evaluator = PermissionEvaluator()

# Check project-level permission
has_access = evaluator.check_permission(
    user=request.user,
    permission='project.view',
    resource=project,
)

# Permission hierarchy:
# 1. Check project-specific role assignment
# 2. Fall back to organization role
# 3. Fall back to system role
```

## Data Scoping

Projects scope child resources:

```python
class ProjectScopedModel(models.Model):
    """Base for project-scoped resources."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='%(class)ss',
    )

    class Meta:
        abstract = True
```

### Querying Scoped Data

```python
# Filter by current project
tasks = Task.objects.filter(project=current_project)

# Include project and org in query
tasks = Task.objects.select_related(
    'project',
    'project__organisation',
).filter(project__organisation=org)
```

## Related Features

- [Organisations](./organisations.md) - Parent organization management
- [Permissions](./permissions.md) - Project-level role assignments
- [Architecture: Data Model](../architecture/data-model.md)
