# Settings Module

Feature flags and dynamic configuration for Django Core-App.

## Overview

The `settings` module provides a flexible configuration system with feature flags, tenant-specific settings, and hierarchical overrides. Settings can be modified at runtime without deployment.

**App location**: `src/settings/`  
**Feature spec**: `kitty-specs/010-settings-feature-flags/`

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'settings.apps.SettingsConfig',
    ...
]

# Cache for settings lookups
CACHES = {
    'settings': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/4',
        'TIMEOUT': 60,  # 1 minute
    }
}
```

## Models

### Setting

Dynamic configuration entry.

| Field | Type | Description |
|-------|------|-------------|
| `key` | CharField | Unique setting identifier |
| `value` | JSONField | Setting value (any JSON type) |
| `value_type` | CharField | Type hint (string/number/boolean/json) |
| `description` | TextField | Human-readable description |
| `is_public` | BooleanField | Visible to non-admins |
| `organization` | ForeignKey | Org override (optional) |

### FeatureFlag

Toggle for feature availability.

| Field | Type | Description |
|-------|------|-------------|
| `key` | CharField | Flag identifier |
| `is_enabled` | BooleanField | Global enabled state |
| `rollout_percentage` | IntegerField | Gradual rollout (0-100) |
| `organization` | ForeignKey | Org-specific override |

## API Endpoints

### Settings

```http
# List settings
GET /api/v1/settings/

# Get setting value
GET /api/v1/settings/{key}/

# Update setting (admin only)
PATCH /api/v1/settings/{key}/
{"value": "new_value"}
```

### Feature Flags

```http
# List flags
GET /api/v1/feature-flags/

# Check flag status
GET /api/v1/feature-flags/{key}/

# Toggle flag (admin only)
PATCH /api/v1/feature-flags/{key}/
{"is_enabled": true}
```

## Usage Examples

### Getting Settings

```python
from settings.api import get_setting

# Get with default
max_uploads = get_setting('max_file_uploads', default=10)

# Get organization-specific
org_limit = get_setting('api_rate_limit', organization=org)
```

### Feature Flags

```python
from settings.api import is_feature_enabled

# Check if feature is enabled
if is_feature_enabled('new_dashboard', user=request.user):
    return render_new_dashboard()
else:
    return render_legacy_dashboard()

# With organization context
if is_feature_enabled('beta_feature', organization=org):
    enable_beta_feature()
```

### Template Usage

```django
{% load feature_flags %}

{% feature_flag 'new_ui' %}
    <div class="new-interface">...</div>
{% else %}
    <div class="legacy-interface">...</div>
{% endfeature_flag %}
```

### Gradual Rollout

```python
# Enable for 25% of users
flag = FeatureFlag.objects.get(key='new_feature')
flag.rollout_percentage = 25
flag.save()

# User gets consistent experience based on user ID
is_enabled = is_feature_enabled('new_feature', user=user)
```

## Hierarchy

Settings follow a hierarchy (highest priority first):

1. User-specific override
2. Organization override
3. Global setting
4. Default value

```python
def get_setting(key, user=None, organization=None, default=None):
    # 1. Check user override
    if user:
        user_setting = Setting.objects.filter(
            key=key, user=user
        ).first()
        if user_setting:
            return user_setting.value
    
    # 2. Check org override
    if organization:
        org_setting = Setting.objects.filter(
            key=key, organization=organization
        ).first()
        if org_setting:
            return org_setting.value
    
    # 3. Check global setting
    global_setting = Setting.objects.filter(
        key=key, organization__isnull=True
    ).first()
    if global_setting:
        return global_setting.value
    
    # 4. Return default
    return default
```

## Cache Invalidation

Settings are cached for performance:

```python
from settings.cache import invalidate_setting

# Invalidate on change
@receiver(post_save, sender=Setting)
def invalidate_cache(sender, instance, **kwargs):
    invalidate_setting(instance.key, instance.organization_id)
```

## Related Features

- [Organisations](./organisations.md) - Org-specific settings
- [Permissions](./permissions.md) - Settings access control
