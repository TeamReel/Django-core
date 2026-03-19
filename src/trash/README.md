# Trash — Soft Delete & Recovery System

Unified soft delete system for TeamReel. Objects are marked as deleted instead of removed, allowing recovery within a retention period.

## Quick Start

```python
from common.mixins import SoftDeleteMixin
from common.managers import SoftDeleteManager

class MyModel(SoftDeleteMixin, models.Model):
    name = models.CharField(max_length=100)

    objects = SoftDeleteManager()  # Excludes soft-deleted by default
```

## Usage

### Soft Delete
```python
# Single object
obj.soft_delete(user=request.user)

# Queryset
MyModel.objects.filter(name="test").soft_delete(user=request.user)

# Via .delete() — automatically does soft delete
obj.delete()
```

### Restore
```python
# Single object
obj.restore()

# Queryset
MyModel.all_objects.deleted_only().restore()
```

### Permanent Delete
```python
# Single object
obj.permanent_delete()

# Queryset — bypasses soft delete
MyModel.all_objects.filter(...).hard_delete()
```

### Query Deleted Objects
```python
# Only active (default)
MyModel.objects.all()

# Only deleted
MyModel.objects.deleted_only()

# All including deleted
MyModel.objects.with_deleted()

# Or use all_objects manager
MyModel.all_objects.all()
```

## Cascade Delete

Define `soft_delete_cascade_fields` to cascade soft delete to related objects:

```python
class Project(SoftDeleteMixin, models.Model):
    soft_delete_cascade_fields = ["memberships", "content_items"]
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/trash/` | List soft-deleted items for current org |
| POST | `/api/v1/trash/{id}/restore/` | Restore item (owner or admin) |
| DELETE | `/api/v1/trash/{id}/permanent/` | Permanently delete (admin only) |

## Retention Policy

Items are automatically deleted after 30 days (configurable):

```python
# settings/base.py
SOFT_DELETE_RETENTION_DAYS = 30

# Per-model overrides
SOFT_DELETE_RETENTION_OVERRIDES = {
    "content_generation.ContentItem": 90,  # 90 days for content
}
```

## Cleanup

**Automatic (Celery Beat):** Runs daily at 3:15 AM UTC.

**Manual:**
```bash
# Dry run — show what would be deleted
python manage.py cleanup_trash --dry-run

# Actually delete expired items
python manage.py cleanup_trash
```

## Audit Events

All operations are logged:
- `trash.soft_delete` — Item moved to trash
- `trash.restore` — Item restored from trash
- `trash.permanent_delete` — Item permanently deleted

## Models Using Soft Delete

- `content_generation.ContentItem`
- `projects.ProjectMembership`

## Testing

```bash
pytest tests/trash/ tests/common/test_soft_delete.py -v
```
