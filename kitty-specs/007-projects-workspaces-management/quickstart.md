# Quickstart Guide: Projects & Workspaces Management

**Feature**: 007-projects-workspaces-management
**Audience**: Backend developers integrating with Projects API
**Last Updated**: 2025-11-25

## Overview

The Projects feature provides workspace/project containers within organisations for scoping resources. This guide shows how to integrate with the Projects API in ~15 minutes.

## Prerequisites

- ✅ Feature 005 (Core Accounts & Authentication) implemented
- ✅ Feature 006 (Organisation Management) implemented
- ✅ Authenticated user with organisation membership
- ✅ Organisation admin role (for write operations)

## Quick Start (5 minutes)

### 1. Create a Project

**Endpoint**: `POST /api/organisations/{org_id}/projects/`

**Request**:
```http
POST /api/organisations/42/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mobile App Redesign",
  "description": "Q1 2026 mobile app redesign project"
}
```

**Response** (201 Created):
```json
{
  "id": 123,
  "organisation": {
    "id": 42,
    "name": "Acme Corp",
    "slug": "acme-corp"
  },
  "creator": {
    "id": 5,
    "email": "alice@example.com",
    "first_name": "Alice",
    "last_name": "Johnson"
  },
  "name": "Mobile App Redesign",
  "slug": "mobile-app-redesign",
  "description": "Q1 2026 mobile app redesign project",
  "is_active": true,
  "created_at": "2025-11-25T10:30:00Z",
  "updated_at": "2025-11-25T10:30:00Z",
  "archived_at": null
}
```

**Note**: The `slug` is auto-generated from `name`. You can optionally provide a custom slug.

### 2. List Projects in an Organisation

**Endpoint**: `GET /api/organisations/{org_id}/projects/`

**Request**:
```http
GET /api/organisations/42/projects/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "next": "http://api.example.org/api/organisations/42/projects/?cursor=cD0y...",
  "previous": null,
  "results": [
    {
      "id": 123,
      "name": "Mobile App Redesign",
      "slug": "mobile-app-redesign",
      "description": "Q1 2026 mobile app redesign project",
      "is_active": true,
      "created_at": "2025-11-25T10:30:00Z",
      "updated_at": "2025-11-25T10:30:00Z"
    },
    {
      "id": 122,
      "name": "Backend API v2",
      "slug": "backend-api-v2",
      "description": "",
      "is_active": true,
      "created_at": "2025-11-24T15:20:00Z",
      "updated_at": "2025-11-24T15:20:00Z"
    }
  ]
}
```

### 3. Get Project Details

**Endpoint**: `GET /api/organisations/{org_id}/projects/{project_id}/`

**Request**:
```http
GET /api/organisations/42/projects/123/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": 123,
  "organisation": {
    "id": 42,
    "name": "Acme Corp",
    "slug": "acme-corp"
  },
  "creator": {
    "id": 5,
    "email": "alice@example.com",
    "first_name": "Alice",
    "last_name": "Johnson"
  },
  "name": "Mobile App Redesign",
  "slug": "mobile-app-redesign",
  "description": "Q1 2026 mobile app redesign project",
  "is_active": true,
  "created_at": "2025-11-25T10:30:00Z",
  "updated_at": "2025-11-25T10:30:00Z",
  "archived_at": null
}
```

## Common Use Cases

### Use Case 1: User Dashboard (All Projects Across Organisations)

**Endpoint**: `GET /api/projects/` (top-level, not nested)

**Scenario**: Show all projects the authenticated user can access across all their organisations.

**Request**:
```http
GET /api/projects/
Authorization: Bearer <token>
```

**Response**: Returns projects from all organisations where the user is a member.

```json
{
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 123,
      "organisation": {"id": 42, "name": "Acme Corp", "slug": "acme-corp"},
      "name": "Mobile App Redesign",
      "slug": "mobile-app-redesign",
      "is_active": true,
      "created_at": "2025-11-25T10:30:00Z"
    },
    {
      "id": 87,
      "organisation": {"id": 18, "name": "Beta Inc", "slug": "beta-inc"},
      "name": "Marketing Campaign",
      "slug": "marketing-campaign",
      "is_active": true,
      "created_at": "2025-11-20T09:15:00Z"
    }
  ]
}
```

### Use Case 2: Update Project Details

**Endpoint**: `PATCH /api/organisations/{org_id}/projects/{project_id}/`

**Scenario**: Update project name and description.

**Request**:
```http
PATCH /api/organisations/42/projects/123/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mobile App Redesign - Phase 1",
  "description": "Q1 2026 mobile app redesign - focus on UX improvements"
}
```

**Response** (200 OK):
```json
{
  "id": 123,
  "name": "Mobile App Redesign - Phase 1",
  "slug": "mobile-app-redesign",
  "description": "Q1 2026 mobile app redesign - focus on UX improvements",
  "updated_at": "2025-11-25T11:45:00Z"
}
```

**Note**: The `slug` is NOT updated when name changes (prevents broken links).

### Use Case 3: Archive Project (Soft Deletion)

**Endpoint**: `POST /api/organisations/{org_id}/projects/{project_id}/archive/`

**Scenario**: Archive a completed project without deleting data.

**Request**:
```http
POST /api/organisations/42/projects/123/archive/
Authorization: Bearer <token>
```

**Response** (204 No Content)

**Verification**:
```http
GET /api/organisations/42/projects/123/
```

Returns:
```json
{
  "id": 123,
  "name": "Mobile App Redesign - Phase 1",
  "is_active": false,
  "archived_at": "2025-11-25T12:00:00Z"
}
```

### Use Case 4: Restore Archived Project

**Endpoint**: `POST /api/organisations/{org_id}/projects/{project_id}/restore/`

**Scenario**: Restore an archived project.

**Request**:
```http
POST /api/organisations/42/projects/123/restore/
Authorization: Bearer <token>
```

**Response** (204 No Content)

**Verification**: `is_active=true`, `archived_at=null`

### Use Case 5: Custom Slug

**Endpoint**: `POST /api/organisations/{org_id}/projects/`

**Scenario**: Specify a custom URL-friendly slug instead of auto-generation.

**Request**:
```http
POST /api/organisations/42/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Phoenix",
  "slug": "phoenix-v2",
  "description": "Phoenix rewrite project"
}
```

**Response** (201 Created):
```json
{
  "id": 124,
  "name": "Project Phoenix",
  "slug": "phoenix-v2",
  "description": "Phoenix rewrite project"
}
```

**Error Handling**: If slug already exists in the organisation, returns `400 Bad Request`.

## API Reference Summary

### Nested Endpoints (Organisation-Scoped)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/api/organisations/{org_id}/projects/` | List projects in org | Org Member |
| `POST` | `/api/organisations/{org_id}/projects/` | Create project | Org Admin |
| `GET` | `/api/organisations/{org_id}/projects/{id}/` | Get project details | Org Member |
| `PATCH` | `/api/organisations/{org_id}/projects/{id}/` | Update project | Org Admin |
| `DELETE` | `/api/organisations/{org_id}/projects/{id}/` | Delete project (rare) | Org Admin |
| `POST` | `/api/organisations/{org_id}/projects/{id}/archive/` | Archive project | Org Admin |
| `POST` | `/api/organisations/{org_id}/projects/{id}/restore/` | Restore project | Org Admin |

### Top-Level Endpoints (User-Scoped)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/api/projects/` | List all user's projects | Authenticated |
| `GET` | `/api/projects/{id}/` | Get project details | Org Member |
| `PATCH` | `/api/projects/{id}/` | Update project | Org Admin |
| `POST` | `/api/projects/{id}/archive/` | Archive project | Org Admin |
| `POST` | `/api/projects/{id}/restore/` | Restore project | Org Admin |

**Note**: Cannot `POST` (create) via top-level endpoint - must use nested endpoint to specify organisation.

## Pagination

Projects use cursor-based pagination (default 50 items/page).

**Navigate pages**:
```http
GET /api/projects/?cursor=cD0yMDI1LTExLTI1
```

**Custom page size** (max 200):
```http
GET /api/projects/?page_size=100
```

## Filtering & Search

**Filter by active status** (include archived):
```http
GET /api/projects/?include_archived=true
```

**Search by name**:
```http
GET /api/projects/?search=mobile
```

**Filter by organisation** (top-level endpoint):
```http
GET /api/projects/?organisation=42
```

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "name": ["This field is required."],
  "slug": ["A project with this slug already exists in this organisation."]
}
```

### 401 Unauthorized - Missing Authentication
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found - Project Does Not Exist
```json
{
  "detail": "Not found."
}
```

## Integration Patterns

### Pattern 1: Associating Resources with Projects

**Scenario**: Your feature needs to scope resources to projects.

**Implementation**:
```python
# your_app/models.py
from django.db import models

class YourResource(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='your_resources',
        null=True,  # Optional association
        blank=True
    )
    name = models.CharField(max_length=200)
    # ... other fields
```

**API Example**:
```http
POST /api/your-resources/
{
  "project": 123,
  "name": "Resource A"
}
```

### Pattern 2: Querying Resources by Project

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

        return queryset
```

**API Example**:
```http
GET /api/your-resources/?project=123
```

### Pattern 3: Project Context in Frontend

**Scenario**: Frontend needs to show current project context in navigation.

**Implementation**:
```javascript
// Fetch project details
const response = await fetch('/api/projects/123/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const project = await response.json();

// Display in UI
console.log(`Current Project: ${project.organisation.name}/${project.name}`);
```

## Testing Your Integration

### Minimal Test Suite

```python
# your_app/tests/test_project_integration.py
import pytest
from rest_framework.test import APIClient
from projects.models import Project

@pytest.mark.django_db
def test_create_resource_with_project(api_client, user, organisation, project):
    """Test associating your resource with a project."""
    api_client.force_authenticate(user=user)

    response = api_client.post('/api/your-resources/', {
        'project': project.id,
        'name': 'Test Resource'
    })

    assert response.status_code == 201
    assert response.data['project'] == project.id

@pytest.mark.django_db
def test_filter_resources_by_project(api_client, user, project):
    """Test filtering your resources by project."""
    # Create resources
    YourResource.objects.create(project=project, name='Resource 1')
    YourResource.objects.create(project=None, name='Resource 2')

    api_client.force_authenticate(user=user)
    response = api_client.get(f'/api/your-resources/?project={project.id}')

    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['name'] == 'Resource 1'
```

## Performance Tips

1. **Use select_related for nested objects**:
   ```python
   projects = Project.objects.select_related('organisation', 'creator')
   ```

2. **Paginate large lists**:
   ```http
   GET /api/projects/?page_size=50
   ```

3. **Filter before fetching**:
   ```http
   GET /api/projects/?organisation=42&is_active=true
   ```

4. **Cache project details** (projects change infrequently):
   ```python
   from django.core.cache import cache

   project = cache.get(f'project:{project_id}')
   if not project:
       project = Project.objects.get(id=project_id)
       cache.set(f'project:{project_id}', project, 300)  # 5 minutes
   ```

## Next Steps

- ✅ **Read the full spec**: `spec.md` for complete requirements
- ✅ **Review API contracts**: `contracts/projects-api.yaml` for OpenAPI specification
- ✅ **Check data model**: `data-model.md` for database schema details
- ✅ **Run tests**: `pytest tests/projects/` to verify implementation

## Support & Questions

- **Documentation**: Full implementation plan in `plan.md`
- **Research**: Technical decisions documented in `research.md`
- **Codebase**: Projects app at `src/projects/`

---

**Quickstart Guide Status**: ✅ Complete - Ready for developer onboarding
