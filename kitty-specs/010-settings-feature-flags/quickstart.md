# Quickstart: Settings & Feature Flags System
*Phase 1 Output - Developer Guide*

**Feature**: B10 Settings & Feature Flags
**Date**: 2025-01-27
**Status**: In Progress

## Overview

The Settings & Feature Flags system provides a centralized configuration management solution supporting three scopes: **global**, **organisation**, and **project**. Use feature flags for boolean toggles (on/off features) and settings for typed configuration values (strings, integers, booleans, JSON objects).

---

## Installation

### 1. Add to Django Settings

```python
# src/config/settings/base.py

INSTALLED_APPS = [
    # ... existing apps
    'src.settings',  # B10 Settings & Feature Flags
]

# Optional: Redis cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Settings app configuration
SETTINGS_CACHE_ENABLED = True  # Set to False to disable caching
SETTINGS_CACHE_TTL = 300  # 5 minutes
SETTINGS_CACHE_PREFIX = 'settings:'
```

### 2. Run Migrations

```powershell
cd src
python manage.py migrate settings
```

### 3. Seed Initial Settings (Optional)

```powershell
python manage.py seed_settings
```

---

## Python Query API

### Feature Flags

#### Basic Usage

```python
from src.settings.api import get_flag

# Global flag (no scope)
maintenance_mode = get_flag('maintenance_mode')
# Returns: False (default if not set)

# Organisation-scoped flag
beta_features = get_flag('beta_features', organisation_id=org.id)
# Returns: True or False based on org-specific override

# Project-scoped flag (with hierarchy fallback)
dark_mode = get_flag('dark_mode', project_id=project.id)
# Resolution order: project → organisation → global → False
```

#### Advanced Usage

```python
from src.settings.api import get_flag, set_flag

# Set global flag (requires superuser permission)
set_flag('maintenance_mode', True, scope='global', user=request.user)

# Set organisation flag (requires org admin permission)
set_flag('beta_features', True, scope='organisation', organisation_id=org.id, user=request.user)

# Set project flag (requires project admin permission)
set_flag('dark_mode', True, scope='project', project_id=project.id, user=request.user)

# Check if flag exists at specific scope
from src.settings.models import FeatureFlag, ScopeType

flag_exists = FeatureFlag.objects.filter(
    key='maintenance_mode',
    scope_type=ScopeType.GLOBAL
).exists()
```

---

### Settings

#### Basic Usage

```python
from src.settings.api import get_setting

# Global setting
max_upload_size = get_setting('max_upload_size')
# Returns: 10485760 (10MB in bytes, or default value if not set)

# Organisation-scoped setting
api_timeout = get_setting('api_timeout', organisation_id=org.id)
# Returns: 30 (seconds, integer type)

# Project-scoped setting with type coercion
allowed_origins = get_setting('allowed_origins', project_id=project.id)
# Returns: ["https://example.com", "https://app.example.com"] (JSON list)
```

#### Setting with Explicit Type

```python
from src.settings.api import get_setting

# String setting
site_name = get_setting('site_name', default='My Site')
# Returns: str

# Integer setting
max_retries = get_setting('max_retries', default=3)
# Returns: int

# Boolean setting
debug_mode = get_setting('debug_mode', default=False)
# Returns: bool

# JSON setting
feature_config = get_setting('feature_config', default={'enabled': True, 'max': 100})
# Returns: dict
```

#### Setting Values

```python
from src.settings.api import set_setting

# Set global setting (requires superuser permission)
set_setting('max_upload_size', 20971520, scope='global', user=request.user)
# Value type inferred from type of value (int)

# Set organisation setting (requires org admin permission)
set_setting('api_timeout', 60, scope='organisation', organisation_id=org.id, user=request.user)

# Set project setting with JSON value (requires project admin permission)
set_setting(
    'feature_config',
    {'enabled': True, 'max': 200},
    scope='project',
    project_id=project.id,
    user=request.user
)
```

---

## REST API

### Authentication

All API endpoints require authentication via DRF's default authentication classes (session or token).

### Base URL

```
/api/v1/settings/
```

---

### Feature Flags API

#### List All Flags

```http
GET /api/v1/settings/flags/
```

**Query Parameters**:
- `scope_type`: Filter by scope (global, organisation, project)
- `organisation_id`: Filter by organisation
- `project_id`: Filter by project
- `enabled`: Filter by enabled status (true, false)

**Response** (200 OK):
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key": "maintenance_mode",
      "enabled": false,
      "description": "Enable maintenance mode to block user access",
      "scope_type": "global",
      "organisation_id": null,
      "project_id": null,
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "key": "beta_features",
      "enabled": true,
      "description": "Enable beta features for this organisation",
      "scope_type": "organisation",
      "organisation_id": "660e8400-e29b-41d4-a716-446655440000",
      "project_id": null,
      "created_at": "2025-01-27T11:00:00Z",
      "updated_at": "2025-01-27T11:30:00Z"
    }
  ]
}
```

#### Get Single Flag

```http
GET /api/v1/settings/flags/{key}/
```

**Path Parameters**:
- `key`: Flag key (e.g., "maintenance_mode")

**Query Parameters** (for scope resolution):
- `organisation_id`: Organisation context (optional)
- `project_id`: Project context (optional)

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "maintenance_mode",
  "enabled": false,
  "description": "Enable maintenance mode to block user access",
  "scope_type": "global",
  "organisation_id": null,
  "project_id": null,
  "created_at": "2025-01-27T10:00:00Z",
  "updated_at": "2025-01-27T10:00:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "detail": "Flag 'maintenance_mode' not found for the specified scope"
}
```

#### Create Flag

```http
POST /api/v1/settings/flags/
```

**Request Body**:
```json
{
  "key": "dark_mode",
  "enabled": true,
  "description": "Enable dark mode UI",
  "scope_type": "project",
  "project_id": "770e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "key": "dark_mode",
  "enabled": true,
  "description": "Enable dark mode UI",
  "scope_type": "project",
  "organisation_id": "660e8400-e29b-41d4-a716-446655440000",
  "project_id": "770e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-27T12:00:00Z",
  "updated_at": "2025-01-27T12:00:00Z"
}
```

**Response** (400 Bad Request):
```json
{
  "key": ["Flag with this key already exists for the specified scope"],
  "project_id": ["Project does not exist"]
}
```

**Response** (403 Forbidden):
```json
{
  "detail": "You do not have permission to create flags at this scope"
}
```

#### Update Flag

```http
PATCH /api/v1/settings/flags/{id}/
```

**Request Body**:
```json
{
  "enabled": false,
  "description": "Updated description"
}
```

**Response** (200 OK): Same as Create response

**Response** (403 Forbidden): Permission error

#### Delete Flag

```http
DELETE /api/v1/settings/flags/{id}/
```

**Response** (204 No Content): Flag deleted successfully

**Response** (403 Forbidden): Permission error

---

### Settings API

#### List All Settings

```http
GET /api/v1/settings/config/
```

**Query Parameters**:
- `scope_type`: Filter by scope (global, organisation, project)
- `organisation_id`: Filter by organisation
- `project_id`: Filter by project
- `value_type`: Filter by value type (string, integer, boolean, json)

**Response** (200 OK):
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "key": "max_upload_size",
      "value": 10485760,
      "value_type": "integer",
      "default_value": 5242880,
      "description": "Maximum file upload size in bytes",
      "scope_type": "global",
      "organisation_id": null,
      "project_id": null,
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "key": "allowed_origins",
      "value": ["https://example.com", "https://app.example.com"],
      "value_type": "json",
      "default_value": [],
      "description": "Allowed CORS origins",
      "scope_type": "organisation",
      "organisation_id": "660e8400-e29b-41d4-a716-446655440000",
      "project_id": null,
      "created_at": "2025-01-27T11:00:00Z",
      "updated_at": "2025-01-27T11:30:00Z"
    }
  ]
}
```

#### Get Single Setting

```http
GET /api/v1/settings/config/{key}/
```

**Path Parameters**:
- `key`: Setting key (e.g., "max_upload_size")

**Query Parameters** (for scope resolution):
- `organisation_id`: Organisation context (optional)
- `project_id`: Project context (optional)

**Response** (200 OK): Same structure as list item

**Response** (404 Not Found):
```json
{
  "detail": "Setting 'max_upload_size' not found for the specified scope"
}
```

#### Create Setting

```http
POST /api/v1/settings/config/
```

**Request Body**:
```json
{
  "key": "api_timeout",
  "value": 30,
  "value_type": "integer",
  "default_value": 10,
  "description": "API request timeout in seconds",
  "scope_type": "organisation",
  "organisation_id": "660e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (201 Created): Same as List response item

**Response** (400 Bad Request):
```json
{
  "value": ["Value type mismatch: expected integer, got string"],
  "default_value": ["This field is required"]
}
```

#### Update Setting

```http
PATCH /api/v1/settings/config/{id}/
```

**Request Body**:
```json
{
  "value": 60,
  "description": "Updated timeout value"
}
```

**Response** (200 OK): Same as Create response

**Response** (400 Bad Request): Validation error

#### Delete Setting

```http
DELETE /api/v1/settings/config/{id}/
```

**Response** (204 No Content): Setting deleted successfully

---

## Django Admin

### Access Admin Panel

Navigate to `/admin/settings/` to manage flags and settings via Django Admin.

### Features

- **Inline Editing**: Edit flags/settings directly in list view
- **Scope Filtering**: Filter by scope type, organisation, or project
- **Search**: Search by key or description
- **Audit Trail**: View created_by, updated_by, created_at, updated_at for each entry
- **Bulk Actions**: Bulk enable/disable flags, bulk delete

### Admin Permissions

- **Superuser**: Full access to all scopes
- **Organisation Admin**: Access to organisation-scoped and project-scoped configs within their org
- **Project Admin**: Access to project-scoped configs within their project

---

## Caching Behavior

### Cache Hit Flow

1. Query checks cache: `settings:flag:PROJECT:uuid-123:dark_mode`
2. If cache hit, return cached value (no database query)
3. If cache miss, query database and populate cache (5min TTL)

### Cache Invalidation

1. On save/delete, publish invalidation message to Redis pub/sub channel
2. All instances receive message and evict cache entry
3. Next query repopulates cache with updated value

### Graceful Degradation

If Redis is unavailable:
- Queries fall back to database (no caching)
- No errors thrown (system remains operational)
- Multi-instance deployments rely on TTL expiry (5min max stale data)

---

## Permissions

### Scope-Based Access Control

| Action | Global Scope | Organisation Scope | Project Scope |
|--------|-------------|-------------------|---------------|
| **View** | Any authenticated user | Organisation member | Project member |
| **Create** | Superuser only | Organisation admin | Project admin |
| **Update** | Superuser only | Organisation admin | Project admin |
| **Delete** | Superuser only | Organisation admin | Project admin |

### Permission Checks

Permissions are enforced via B08 RBAC integration. Example permission strings:
- `settings.view_featureflag`
- `settings.add_featureflag`
- `settings.change_featureflag`
- `settings.delete_featureflag`

Object-level permissions check scope ownership (e.g., user must be org admin for organisation-scoped flags).

---

## Common Patterns

### Feature Toggle in View

```python
from django.shortcuts import render
from src.settings.api import get_flag

def my_view(request):
    if get_flag('beta_features', organisation_id=request.user.organisation_id):
        return render(request, 'beta_template.html')
    else:
        return render(request, 'standard_template.html')
```

### Configuration Value in Service

```python
from src.settings.api import get_setting

class FileUploadService:
    def validate_file_size(self, file, project_id):
        max_size = get_setting('max_upload_size', project_id=project_id)
        if file.size > max_size:
            raise ValueError(f"File size exceeds limit of {max_size} bytes")
```

### Conditional Middleware

```python
from src.settings.api import get_flag

class MaintenanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if get_flag('maintenance_mode') and not request.user.is_superuser:
            return HttpResponse('Site under maintenance', status=503)
        return self.get_response(request)
```

---

## Troubleshooting

### Flag/Setting Not Found

**Symptom**: `get_flag()` returns default `False` or `get_setting()` returns default value

**Solution**: Check scope hierarchy. Flag may not exist at requested scope. Try:
```python
from src.settings.models import FeatureFlag, ScopeType

# Check all scopes
FeatureFlag.objects.filter(key='my_flag').values('scope_type', 'enabled')
```

### Cache Not Invalidating

**Symptom**: Updated flag/setting not reflected immediately

**Solution**:
1. Check Redis connectivity: `redis-cli ping`
2. Verify pub/sub listener is running (check logs for "Subscribed to channel")
3. Manually flush cache: `python manage.py cache_clear`

### Permission Denied

**Symptom**: 403 Forbidden when creating/updating flags/settings

**Solution**:
1. Check user has required role (org admin or project admin)
2. Verify B08 RBAC integration is configured
3. Check object-level permissions: `user.has_perm('settings.change_featureflag', obj=flag)`

---

## Next Steps

- Review [data-model.md](data-model.md) for database schema details
- Review [spec.md](spec.md) for functional requirements
- Check [plan.md](plan.md) for implementation timeline
- Run test suite: `cd src; pytest tests/settings/ -v`

---

## Support

For issues or questions, refer to:
- Django documentation: https://docs.djangoproject.com/en/5.1/
- DRF documentation: https://www.django-rest-framework.org/
- Project README: [../../README.md](../../README.md)
