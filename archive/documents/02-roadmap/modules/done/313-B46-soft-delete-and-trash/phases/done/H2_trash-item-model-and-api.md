# H2 — TrashItem Model & API

> **Effort:** ~4 uur | **Impact:** Unified trash view + restore via API

## To do

- [ ] Nieuwe Django app: `src/trash/`
  - `TrashItem` model: `content_type` (FK), `object_id`, `deleted_at`, `deleted_by`, `expires_at`, `original_data` (JSONField, optional), `restore_path` (CharField)
  - Admin registratie: list view, filters op content_type en deleted_by
- [ ] Signal handler: bij soft_delete → automatisch TrashItem aanmaken
- [ ] Signal handler: bij restore → TrashItem verwijderen
- [ ] API endpoints:
  - `GET /api/v1/trash/` — List trashed items (org-scoped, paginated)
  - `POST /api/v1/trash/{id}/restore/` — Restore item
  - `DELETE /api/v1/trash/{id}/` — Permanent delete (admin only)
  - `POST /api/v1/trash/empty/` — Empty trash (admin only, bulk permanent delete)
  - `GET /api/v1/trash/stats/` — Count per content type + total size
- [ ] Permissions: view trash = owner or admin, restore = owner or admin, permanent delete = admin
- [ ] Serializer: TrashItem with nested content_type label + object repr

## Done criteria

- [ ] TrashItem wordt automatisch aangemaakt bij soft_delete
- [ ] Restore via API zet object + TrashItem terug
- [ ] Permanent delete verwijdert object + TrashItem definitief
- [ ] Trash list is org-scoped (geen cross-org data leakage)
- [ ] Admin panel toont trash items met filters
