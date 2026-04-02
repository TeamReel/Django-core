# B46: Soft Delete & Trash

**Priority:** 🔥 Bouwen
**Phase:** 13
**Status:** ✅ DONE
**Module ID:** 313
**Category:** Backend

## Description

## 286. B46 – Soft Delete & Trash

**Doel**: Recycle bin pattern met restore functionaliteit en permanente delete na retentieperiode.

**Waarom agnostisch**: Data recovery is universeel - accidental deletes, compliance, user confidence.

**Wat moet er gebeuren**:
- **SoftDeleteMixin** (abstract model mixin):
  - Fields: deleted_at, deleted_by (user FK)
  - Manager: excludes soft-deleted by default
  - Method: soft_delete(), restore(), permanent_delete()
- **TrashItem model** (optional wrapper):
  - Fields: content_type, object_id, deleted_at, deleted_by
  - Metadata: original_data (JSON snapshot), restore_path
  - Expiration: expires_at (auto-calculated from retention)
- **Trash management**:
  - List trashed items per user/org/project
  - Restore to original location
  - Permanent delete (immediate)
  - Empty trash (bulk permanent delete)
- **Retention policy**:
  - Configurable per model type (default: 30 days)
  - Scheduled cleanup via Celery beat
  - Grace period warnings before permanent delete
- **Cascade handling**:
  - Soft-delete related objects (configurable)
  - Restore cascades back
- **Permissions**:
  - View trash: owner or admin
  - Restore: owner or admin
  - Permanent delete: admin only (configurable)
- **Integration**: B09 (audit), B15 (cleanup task), B17 (notifications)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/trash/` - List trashed items
- `POST /api/v1/trash/{id}/restore/` - Restore item
- `DELETE /api/v1/trash/{id}/` - Permanent delete
- `DELETE /api/v1/trash/` - Empty trash (bulk)
- `GET /api/v1/trash/stats/` - Trash statistics

**Status**: ✅ DONE

## Huidige staat

### Wat werkt ✅
- **ContentItem** heeft al `deleted_at` field + `ContentItemManager.active()` die soft-deleted items filtert
- **ProjectMembership** heeft `deleted_at` field
- **WorkflowTemplate** soft-delete via `is_active` flag
- Backend instructions schrijven `deleted_at` pattern al voor als conventie
- `backend-module` skill template bevat `test_soft_delete` test

### Wat ontbreekt ❌
- Geen gedeelde mixin: elke model implementeert soft-delete apart (inconsistent, duplication)
- Geen `deleted_by` tracking: onbekend wie iets verwijderd heeft
- Geen TrashItem model: geen unified view op alle verwijderde items
- Geen restore functionaliteit: eenmaal soft-deleted = handmatig DB fix nodig
- Geen retention policy: soft-deleted items blijven eeuwig in de DB
- Geen Celery cleanup task: geen automatische permanente delete na retentieperiode
- Geen cascade soft-delete: verwijder een Activity → Participations blijven hangen
- Geen API endpoints: geen trash overview of restore actions
- Geen audit logging: delete/restore events niet gelogd in B09

## Design beslissingen

| Vraag | Besluit | Reden |
|-------|---------|-------|
| Mixin of aparte app? | **Mixin in `src/common/`** + TrashItem model in nieuwe `src/trash/` app | Mixin herbruikbaar door alle apps, TrashItem heeft eigen admin/API |
| Bestaande `deleted_at` fields migreren? | **Ja, incrementeel** (H1) | ContentItem en ProjectMembership overzetten naar mixin, backward compatible |
| TrashItem als GenericFK wrapper? | **Ja** | Unified trash view over alle models, `content_type` + `object_id` |
| JSON snapshot bij delete? | **Ja, optioneel** (configurable per model) | Maakt restore mogelijk zelfs als gerelateerde data verwijderd is |
| Retention default? | **30 dagen** | Balans tussen storage en recovery window, configurable per model |
| Cascade soft-delete? | **Opt-in per model** via `soft_delete_cascade_fields` class attribute | Niet elke relatie moet mee-verwijderd worden |
| Permanent delete permissie? | **Admin only** | Voorkomt dat gewone gebruikers data definitief kwijtraken |

## Fasering

| Fase | Titel | Effort | Status |
|------|-------|--------|--------|
| H0 | SoftDeleteMixin | ~3 uur | ✅ Done |
| H1 | Migratie bestaande models | ~3 uur | ✅ Done |
| H2 | TrashItem Model & API | ~4 uur | ✅ Done |
| H3 | Retention Policy & Cleanup | ~2 uur | ✅ Done |
| H4 | Audit Integration & Hardening | ~2 uur | ✅ Done |
| H5 | Backend Soft-Delete Uitbreiding | ~2 uur | ✅ Done |
| H6 | Frontend Trash Integratie | ~4 uur | ✅ Done |

> Fase-specs: `phases/todo/` → verplaats naar `phases/done/` bij voltooiing.

## Acceptatiecriteria (geheel)

### Backend ✅
- [x] `SoftDeleteMixin` is beschikbaar en gedocumenteerd in `src/common/`
- [x] ContentItem en ProjectMembership gebruiken de mixin
- [x] Trash API endpoints werken met org-scoping en permission checks
- [x] Retention policy ruimt expired items automatisch op via Celery beat
- [x] Soft delete/restore events worden gelogd in audit trail (B09)
- [x] Geen regressie op bestaande functionaliteit (API's, admin, frontend)
- [x] Build passes (`python manage.py check` + `pytest`)
- [x] Migration is backward compatible (geen data loss)
- [x] README in `src/trash/README.md` met usage examples

### Backend Uitbreiding ✅
- [x] Period model heeft SoftDeleteMixin (dekt Season + Competition)
- [x] Activity model heeft SoftDeleteMixin (dekt Match + andere event types)
- [x] Participation model heeft SoftDeleteMixin
- [x] Audit signals werken correct met soft-delete

### Frontend ✅
- [x] Settings pagina heeft "Prullenbak" sectie (sheet/dialog in Voorkeuren)
- [x] Sectie toont trashed items van huidige organisatie
- [x] Restore functie werkt via UI (herstel-knop per item)
- [ ] Permanent delete werkt (admin only)
- [ ] Empty trash werkt (admin only)
- [ ] Filter op content type
- [ ] Pagination
- [ ] Delete acties tonen toast met "Ongedaan maken" knop
- [ ] Undo restored item succesvol

## Notes
<!-- Add progress notes here -->

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
