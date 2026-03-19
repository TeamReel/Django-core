# H1 — Migratie bestaande models

> **Effort:** ~3 uur | **Impact:** Bestaande models gebruiken de mixin

## To do

- [ ] `ContentItem`: vervang losse `deleted_at` field door `SoftDeleteMixin` inheritance
  - Migration: `deleted_by` kolom toevoegen, data behouden
  - `ContentItemManager` refactoren naar `SoftDeleteManager`
- [ ] `ProjectMembership`: migreer naar `SoftDeleteMixin`
- [ ] `WorkflowTemplate`: evalueer of `is_active` → `SoftDeleteMixin` logisch is (waarschijnlijk niet — is_active ≠ deleted)
- [ ] Update alle queries die `deleted_at__isnull=True` handmatig filteren → gebruik manager
- [ ] Check serializers: geen `deleted_at` lekken naar non-admin API responses
- [ ] Migration safety check (backward compatible, geen data loss)

## Done criteria

- [ ] ContentItem en ProjectMembership erven van SoftDeleteMixin
- [ ] Bestaande `deleted_at` data behouden na migration
- [ ] Alle API endpoints werken identiek (geen regressie)
- [ ] `python manage.py check` geen warnings
