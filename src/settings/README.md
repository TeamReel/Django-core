# Settings & Feature Flags (B10)

## Overview

Centralised configuration management system supporting feature flags (boolean toggles) and typed settings (string, integer, boolean, JSON) at three scopes: global, organisation, and project.

## Key Features

- **Scope Hierarchy**: project > organisation > global precedence
- **Cache Layer**: Redis with pub/sub invalidation (optional dependency)
- **Python Query API**: `get_flag()`, `get_setting()` for application code
- **REST API**: DRF endpoints for management UIs
- **Audit Integration**: All CRUD operations logged via B09
- **Scope-Aware Permissions**: B08 RBAC integration

## Dependencies

- Django 5.1+
- Django REST Framework 3.14+
- Redis (optional) + django-redis
- PostgreSQL (nullable FKs, JSONB, GIN indexes)

## Architecture

```
src/settings/
├── models.py          # FeatureFlag and Setting models
├── api.py             # Python query API (get_flag, get_setting)
├── cache.py           # Redis cache layer with pub/sub
├── serializers.py     # DRF serializers
├── views.py           # DRF ViewSets
├── permissions.py     # Scope-aware permission classes
├── admin.py           # Django admin customizations
└── signals.py         # B09 audit integration
```

## Usage

See `kitty-specs/010-settings-feature-flags/quickstart.md` for detailed usage examples.

**Quick Example**:
```python
from settings.api import get_flag, get_setting

# Check feature flag
if get_flag('beta_features', project_id=project.id):
    # Show beta UI
    pass

# Get configuration value
max_size = get_setting('max_upload_size', organisation_id=org.id)
```

## Recommended Keys

- `transactions_payer_routing_default` (STRING)
    - Scope: GLOBAL or ORGANISATION
    - Values: `explicit`, `user_project_org`, `project_user_org`
    - Used by the transactions engine to decide fallback payer routing for debits.

## Related Apps

- **B06 (organisations)**: Scope entities
- **B07 (projects)**: Scope entities
- **B08 (permissions)**: Permission enforcement
- **B09 (audit)**: Change tracking
