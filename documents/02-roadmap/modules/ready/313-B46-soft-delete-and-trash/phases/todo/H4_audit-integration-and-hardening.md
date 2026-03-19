# H4 — Audit Integration & Hardening

> **Effort:** ~2 uur | **Impact:** Compliance & production-ready

## To do

- [ ] B09 (audit) integratie: log `soft_delete`, `restore`, `permanent_delete` events
- [ ] Bulk soft-delete: queryset `.soft_delete(user=user)` method
- [ ] Admin actions: "Soft delete selected" en "Restore selected" in Django Admin
- [ ] Constraint: prevent re-delete of already soft-deleted items
- [ ] Index optimization: composite index op `(content_type, deleted_at)` voor trash queries

## Done criteria

- [ ] Audit trail bevat delete/restore events met actor
- [ ] Bulk operations werken correct
- [ ] Admin panel heeft soft-delete/restore actions
- [ ] Geen duplicate TrashItems voor hetzelfde object
