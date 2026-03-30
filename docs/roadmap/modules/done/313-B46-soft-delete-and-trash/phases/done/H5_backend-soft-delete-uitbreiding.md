# H5 — Backend Soft-Delete Uitbreiding

> **Effort:** ~2 uur | **Impact:** Season, Competition, Match, Activity krijgen soft-delete

## Doel

Soft-delete toevoegen aan de 4 core models die nu nog permanent deleten. Dit zorgt ervoor dat alle belangrijke data recoverable is via de bestaande Trash API.

## To do

### Models uitbreiden
- [ ] `Season` model (periods app) → `SoftDeleteMixin` toevoegen
- [ ] `Competition` model → `SoftDeleteMixin` toevoegen
- [ ] `Match` model (activities app) → `SoftDeleteMixin` toevoegen
- [ ] `Activity` model (activities app) → `SoftDeleteMixin` toevoegen

### Migrations
- [ ] Migration voor Season: `deleted_at`, `deleted_by` fields
- [ ] Migration voor Competition: `deleted_at`, `deleted_by` fields
- [ ] Migration voor Match: `deleted_at`, `deleted_by` fields
- [ ] Migration voor Activity: `deleted_at`, `deleted_by` fields

### Managers
- [ ] Managers updaten naar `SoftDeleteManager` (excludes soft-deleted by default)
- [ ] Check dat querysets in views/serializers correct filteren

### Tests
- [ ] Test soft-delete gedrag per model
- [ ] Test restore gedrag per model
- [ ] Test dat soft-deleted items niet verschijnen in normale querysets
- [ ] Test cascade gedrag (Activity → Participation)

## Pattern

```python
# In model file
from common.mixins import SoftDeleteMixin, SoftDeleteManager

class Season(SoftDeleteMixin, models.Model):
    # ... existing fields ...

    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Includes soft-deleted
```

## Done criteria

- [ ] Alle 4 models hebben `deleted_at` en `deleted_by` fields
- [ ] Soft-delete werkt via `.delete()` method (mixin override)
- [ ] Normale querysets excluden soft-deleted items
- [ ] Items verschijnen in Trash API na soft-delete
- [ ] Restore via Trash API werkt
- [ ] Migrations zijn backward compatible
- [ ] Tests passen
