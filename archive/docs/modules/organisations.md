# Organisations Module

Multi-tenant organization management for Django Core-App.

## Overview

The `organisations` module provides multi-tenancy support through organization-scoped data isolation. It manages organizations and user memberships with role-based access within each tenant.

**App location**: `src/organisations/`
**Feature spec**: `kitty-specs/006-organisation-management-multi/`

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'organisations.apps.OrganisationsConfig',
    ...
]
```

### Cache Configuration

```python
CACHES = {
    'organisations': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/2',
        'TIMEOUT': 300,  # 5 minutes
    }
}
```

## Models

### Organisation

Core tenant entity.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `name` | CharField | Unique display name (3-100 chars) |
| `slug` | SlugField | Auto-generated URL slug |
| `description` | TextField | Optional description |
| `creator` | ForeignKey | User who created the org |
| `is_active` | BooleanField | Soft-delete flag |
| `deleted_at` | DateTimeField | Deletion timestamp |
| `created_at` | DateTimeField | Creation timestamp |
| `updated_at` | DateTimeField | Last update timestamp |

**Business Rules**:
- Names must be globally unique
- Slug auto-generated from name
- Soft-delete with 30-day retention

### Membership

User-to-organization relationship.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `user` | ForeignKey | Member user |
| `organisation` | ForeignKey | Parent organization |
| `role` | CharField | 'admin' or 'member' |
| `joined_at` | DateTimeField | Membership start |
| `invited_by` | ForeignKey | Inviting user (nullable) |
| `is_active` | BooleanField | Active membership flag |

**Constraints**:
- Unique (user, organisation) pair
- At least one admin per organization

## API Endpoints

### List Organizations

```http
GET /api/v1/organisations/
Authorization: Bearer <token>
```

**Response**:
```json
{
  "count": 2,
  "results": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "admin"
    }
  ]
}
```

### Create Organization

```http
POST /api/v1/organisations/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Organization",
  "description": "Optional description"
}
```

### Get Organization Details

```http
GET /api/v1/organisations/{slug}/
Authorization: Bearer <token>
```

### Update Organization

```http
PATCH /api/v1/organisations/{slug}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Organization (Soft Delete)

```http
DELETE /api/v1/organisations/{slug}/
Authorization: Bearer <token>
```

### Membership Management

```http
# List members
GET /api/v1/organisations/{slug}/members/

# Add member
POST /api/v1/organisations/{slug}/members/
{"email": "user@example.com", "role": "member"}

# Update member role
PATCH /api/v1/organisations/{slug}/members/{user_id}/
{"role": "admin"}

# Remove member
DELETE /api/v1/organisations/{slug}/members/{user_id}/
```

## Usage Examples

### Creating an Organization

```python
from organisations.models import Organisation, Membership

# Create organization
org = Organisation.objects.create(
    name="Acme Corp",
    creator=request.user,
)

# Creator is automatically an admin
Membership.objects.create(
    user=request.user,
    organisation=org,
    role='admin',
)
```

### Querying User's Organizations

```python
# Get active organizations for user
user_orgs = Organisation.objects.filter(
    memberships__user=request.user,
    memberships__is_active=True,
    is_active=True,
)

# Get organizations where user is admin
admin_orgs = Organisation.objects.filter(
    memberships__user=request.user,
    memberships__role='admin',
    memberships__is_active=True,
)
```

### Custom Manager Methods

```python
# Active organizations only
Organisation.objects.active()

# Organizations for a specific user
Organisation.objects.for_user(user)

# Include soft-deleted (for admin views)
Organisation.objects.all_with_deleted()
```

### Soft Delete and Restore

```python
# Soft delete (cascades to memberships)
org.delete()

# Check if deleted
if org.deleted_at:
    print(f"Deleted on {org.deleted_at}")

# Hard delete (permanent, admin only)
org.hard_delete()
```

## Multi-Tenancy Pattern

### Scoping Queries

All tenant-scoped models should filter by organization:

```python
class TenantScopedMixin:
    """Mixin for organization-scoped models."""

    def get_queryset(self):
        org = self.request.user.current_organisation
        return super().get_queryset().filter(organisation=org)
```

### Request Context

The current organization is determined from:
1. URL parameter: `/organisations/{slug}/...`
2. Session: `request.session['current_org']`
3. Header: `X-Organisation-ID`

### Middleware

```python
class OrganisationMiddleware:
    """Set current organisation on request."""

    def __call__(self, request):
        org_id = (
            request.headers.get('X-Organisation-ID') or
            request.session.get('current_org')
        )
        if org_id:
            request.organisation = Organisation.objects.get(id=org_id)
        return self.get_response(request)
```

## Data Isolation

### Enforced at Model Level

```python
class TenantModel(models.Model):
    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.CASCADE,
    )

    class Meta:
        abstract = True
```

### Query Scoping

```python
class TenantManager(models.Manager):
    def for_organisation(self, org):
        return self.filter(organisation=org)

    def for_request(self, request):
        return self.for_organisation(request.organisation)
```

## Related Features

- [Accounts](./accounts.md) - User authentication
- [Projects](./projects.md) - Project workspaces within organizations
- [Permissions](./permissions.md) - Organization-level roles
- [Architecture: Data Model](../architecture/data-model.md)
