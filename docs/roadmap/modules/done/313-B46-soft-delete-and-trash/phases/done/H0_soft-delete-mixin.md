# H0 — SoftDeleteMixin

> **Effort:** ~3 uur | **Impact:** Herbruikbare basis voor alle models

## To do

- [ ] `SoftDeleteMixin` abstract model in `src/common/mixins.py`:
  - Fields: `deleted_at` (DateTimeField, nullable, indexed), `deleted_by` (FK User, nullable)
  - Override `delete()` → sets `deleted_at` + `deleted_by` (niet hard delete)
  - Method: `soft_delete(user=None)`, `restore()`, `permanent_delete()`
  - Class attribute: `soft_delete_cascade_fields = []` (list van related names)
- [ ] `SoftDeleteManager` in `src/common/managers.py`:
  - Default queryset: `filter(deleted_at__isnull=True)`
  - `.with_deleted()`: alle records inclusief soft-deleted
  - `.deleted_only()`: alleen soft-deleted records
- [ ] `AllObjectsManager`: geen filter (voor admin/internal use)
- [ ] Unit tests: soft_delete, restore, permanent_delete, manager filtering, cascade

## Done criteria

- [ ] Mixin is importeerbaar: `from src.common.mixins import SoftDeleteMixin`
- [ ] `Model.objects.all()` excludeert soft-deleted records
- [ ] `Model.all_objects.all()` includeert soft-deleted records
- [ ] `obj.soft_delete(user=request.user)` werkt
- [ ] `obj.restore()` zet `deleted_at` en `deleted_by` terug naar None
- [ ] Cascade soft-delete werkt voor geconfigureerde relaties
