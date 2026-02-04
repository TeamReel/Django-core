# B42: Comments & Discussions

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 282
**Category:** Backend

## Description

## 282. B42 – Comments & Discussions

**Doel**: Threaded comments systeem dat aan elk object gekoppeld kan worden via GenericForeignKey.

**Waarom agnostisch**: Comments/discussions zijn universeel - feedback op content, project updates, team communication.

**Wat moet er gebeuren**:
- **Comment model** met GenericForeignKey:
  - Fields: content_type, object_id, author, body, parent (self-FK for threading)
  - Timestamps: created_at, updated_at, deleted_at (soft delete)
  - Metadata: is_edited, edit_history (JSON)
- **Threading support**:
  - Nested replies (max depth configurable)
  - Flat vs threaded view modes
- **Mentions system**:
  - @username parsing in comment body
  - Notification trigger on mention (B17)
- **Reactions**:
  - Emoji reactions (like, love, celebrate, etc.)
  - Reaction counts per comment
- **Moderation**:
  - Flag for review
  - Hide/show functionality
  - Admin override
- **Permissions**:
  - Object-level: can user comment on this resource?
  - Comment-level: can user edit/delete this comment?
- **Integration**: B09 (audit), B17 (notifications), B08 (permissions)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/comments/?content_type=X&object_id=Y` - List comments for object
- `POST /api/v1/comments/` - Create comment
- `PATCH /api/v1/comments/{id}/` - Edit comment
- `DELETE /api/v1/comments/{id}/` - Soft delete comment
- `POST /api/v1/comments/{id}/reactions/` - Add reaction
- `DELETE /api/v1/comments/{id}/reactions/{type}/` - Remove reaction

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B42-comments-and-discussions

[feature summary]
Threaded comments system attachable to any object via GenericForeignKey, with mentions, reactions, and moderation.

[goals]
- Comment model with GenericForeignKey for polymorphic attachment
- Threading support with configurable max depth
- @mention parsing with notification trigger (B17)
- Emoji reactions with counts
- Soft delete with moderation flags
- Object-level and comment-level permissions

[non-goals]
- Real-time collaborative editing
- Rich text editor (plain text/markdown only)
- File attachments in comments (use B42 separately)

[dependencies]
- B09 (audit logging)
- B17 (notifications for mentions)
- B08 (permissions)

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
