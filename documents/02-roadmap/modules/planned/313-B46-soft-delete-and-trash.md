# B46: Soft Delete & Trash

**Priority:** 🔥 Bouwen
**Phase:** 13
**Status:** 📋 ROADMAP
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

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B46-soft-delete-and-trash

[feature summary]
Recycle bin pattern with restore functionality and permanent delete after configurable retention period.

[goals]
- SoftDeleteMixin with deleted_at, deleted_by fields
- Custom manager excluding soft-deleted by default
- TrashItem wrapper model for unified trash view
- Restore to original location
- Configurable retention policy per model type
- Scheduled cleanup via Celery beat
- Cascade handling for related objects

[non-goals]
- Version history (use B09 audit trail)
- Undo/redo beyond restore
- Cross-organisation trash visibility

[dependencies]
- B09 (audit logging for delete/restore events)
- B15 (Celery for scheduled cleanup)
- B17 (notifications for expiration warnings)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```

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
