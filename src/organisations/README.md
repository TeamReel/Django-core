# Organisation Management (B06)

**Status**: ✅ Complete
**Location**: `src/organisations/`

## Purpose

The Organisations module provides the root of multi-tenancy, defining tenant boundaries for data isolation, user membership, and resource ownership.

## Scope

**✅ Included**:
- Organisation entity as tenant container
- User membership with role-based access (admin/member)
- Soft-delete with name/slug conflict resolution
- Feature flag storage per organisation
- Rate limiting for creation operations
- Metrics and audit integration

**❌ Excluded** (Product-Agnostic Constraint):
- Billing and subscription management (downstream responsibility)
- Organisation-specific business logic (e.g., "League rules")
- Custom fields beyond feature flags (use extension patterns)
- Inter-organisation relationships (handled at product level)

## Key Components

### Models
- **`Organisation`**: Core tenant entity with UUID primary key, unique name/slug, soft-delete support, and creator tracking
- **`Membership`**: Many-to-many relationship linking Users to Organisations with role (admin/member) and active status

### APIs/Views
- **`GET /api/organisations/`**: List organisations user is member of (excludes soft-deleted)
- **`POST /api/organisations/`**: Create new organisation (creator becomes first admin)
- **`GET /api/organisations/{slug}/`**: Retrieve organisation details with member/project counts
- **`PATCH /api/organisations/{slug}/`**: Update organisation settings (admin only)
- **`DELETE /api/organisations/{slug}/`**: Soft-delete organisation (admin only, cascades to memberships)

### Services/Managers
- **`OrganisationManager`**: Custom queryset manager with `active()` and `deleted()` filters
- **`services.py`**: Business logic for organisation lifecycle operations

### Utilities
- **`metrics.py`**: Prometheus metrics for rate limiting and operations
- **`ratelimit.py`**: Redis-based rate limiting for organisation creation
- **`signals.py`**: Post-save/delete signals for audit logging

## Public Interface

**Safe to Import** (Stable API):
```python
from organisations.models import Organisation, Membership
from organisations.api.serializers import (
    OrganisationSerializer,
    OrganisationListSerializer,
)
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from organisations.ratelimit import check_rate_limit
from organisations.metrics import *
```

## Integration Example

**Minimal Working Example**:
```python
from accounts.models import User
from organisations.models import Organisation, Membership

# Create organisation
user = User.objects.get(email="admin@example.com")
org = Organisation.objects.create(
    name="Acme Corporation",
    creator=user,
    description="A multi-tenant workspace"
)
# Slug auto-generated: "acme-corporation"

# Add member
Membership.objects.create(
    organisation=org,
    user=another_user,
    role="member",
    is_active=True
)

# Check membership
if org.memberships.filter(user=user, is_active=True).exists():
    print("User is member")

# Soft-delete (preserves audit trail)
org.delete()  # Sets is_active=False, appends timestamp to name/slug
```

## Related Modules

**Dependencies** (This module requires):
- [B05 Accounts] - User model for membership
- [B09 Audit] - Event logging for creation/deletion
- Redis - Rate limiting backend

**Used By** (Modules that depend on this):
- [B07 Projects] - Projects belong to organisations
- [B08 Permissions] - Organisation-scoped role assignments
- [B22 Files] - Files scoped to organisation
- [B11 Transactions] - Credits and billing per organisation

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Organisation Fields**:
   ```python
   # your_product/models.py
   from django.db import models
   from organisations.models import Organisation

   class OrganisationSettings(models.Model):
       organisation = models.OneToOneField(
           Organisation,
           on_delete=models.CASCADE,
           related_name="custom_settings"
       )
       subscription_tier = models.CharField(max_length=50)
       billing_email = models.EmailField()
       custom_domain = models.CharField(max_length=255, blank=True)
   ```

2. **Additional Membership Roles**:
   ```python
   # your_product/constants.py
   ROLE_CHOICES = [
       ("admin", "Administrator"),
       ("member", "Member"),
       ("billing_admin", "Billing Administrator"),  # Custom role
       ("readonly", "Read-only Access"),  # Custom role
   ]

   # Extend Membership model with custom roles
   from organisations.models import Membership
   Membership._meta.get_field('role').choices = ROLE_CHOICES
   ```

3. **Organisation Lifecycle Hooks**:
   ```python
   # your_product/signals.py
   from django.db.models.signals import post_save
   from django.dispatch import receiver
   from organisations.models import Organisation

   @receiver(post_save, sender=Organisation)
   def setup_organisation_resources(sender, instance, created, **kwargs):
       if created:
           # Initialize billing account
           # Create default projects
           # Send welcome email
           pass
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    ...
    'organisations',
]

# Redis for rate limiting
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
    }
}
```

**Environment Variables**:
```bash
REDIS_URL=redis://localhost:6379/1  # Required for rate limiting
ORG_CREATE_RATE_LIMIT=10  # Max orgs per hour per user (default: 10)
```

**Optional Settings**:
```python
# settings.py (optional)
ORGANISATION_SLUG_MAX_LENGTH = 100  # Default: 100
ORGANISATION_NAME_MIN_LENGTH = 3  # Default: 3
ORGANISATION_SOFT_DELETE_RETENTION_DAYS = 30  # Hard delete after X days
```

## Testing

**Run Module Tests**:
```bash
pytest tests/organisations/ -v
```

**Key Test Coverage**:
- ✅ Organisation CRUD operations
- ✅ Slug auto-generation and conflict resolution
- ✅ Soft-delete with name/slug reuse
- ✅ Membership role enforcement
- ✅ Rate limiting for creation
- ✅ Queryset filtering (active/deleted)
- ✅ Permission checks (admin vs member)
- ✅ Audit event emission

## References

- **Spec**: [documents/02-roadmap/modules/done/006-B06-organisation-management-multi.md](../../documents/02-roadmap/modules/done/006-B06-organisation-management-multi.md)
- **Module Doc**: [documents/04-modules/backend/B06-organizations.md](../../documents/04-modules/backend/B06-organizations.md)
- **API Docs**: Auto-generated via drf-spectacular at `/api/schema/`
- **Constitution**: [Article II - Multi-Tenancy](../../.kittify/memory/constitution.md#ii-multi-tenancy)

## Troubleshooting

**Common Issues**:

1. **Issue**: Cannot create organisation (rate limit exceeded)
   - **Cause**: User exceeded `ORG_CREATE_RATE_LIMIT` (default: 10/hour)
   - **Solution**: Wait for rate limit window to reset or increase limit in settings

2. **Issue**: Slug conflict on creation
   - **Cause**: Another organisation has same slug (e.g., "acme-corp")
   - **Solution**: System auto-appends counter ("acme-corp-2"), no action needed

3. **Issue**: Soft-deleted org not appearing in list
   - **Cause**: Queryset excludes `name__contains="_del_"` by default
   - **Solution**: Query `Organisation.objects.all()` directly (requires superuser)

4. **Issue**: User cannot update organisation
   - **Cause**: User has "member" role (only "admin" can update)
   - **Solution**: Promote user to admin via Membership: `membership.role = "admin"; membership.save()`

## Migration Notes

**Breaking Changes**:
- **v1.1.0**: Changed soft-delete naming pattern from `_deleted_{id}` to `_del_{timestamp}` for better collision handling

**Deprecations**:
- None (initial stable release)
