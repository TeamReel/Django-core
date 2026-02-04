# B51: Content Moderation

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 291
**Category:** Backend

## Description

## 291. B51 – Content Moderation

**Doel**: UGC moderation queue met flagging, review workflow, en optional AI-assisted detection.

**Waarom agnostisch**: Content moderation is universeel voor platforms met user-generated content.

**Wat moet er gebeuren**:
- **ModerationQueue model**:
  - Fields: content_type, object_id, status, priority
  - Status: pending, approved, rejected, escalated
  - Reason: flag_reason, rejection_reason
- **Flag model**:
  - Fields: content_type, object_id, reporter (user), reason, details
  - Reason types: spam, inappropriate, harassment, copyright, other
  - Status: pending, reviewed, dismissed
- **Moderation workflow**:
  - Auto-queue on flag threshold (e.g., 3 flags)
  - Manual review by moderators
  - Approve, reject, or escalate
  - Bulk actions support
- **Actions on rejection**:
  - Hide content (soft)
  - Delete content
  - Warn user
  - Suspend user (temporary)
  - Ban user (permanent)
- **AI-assisted detection** (optional):
  - Integration point for content scanning
  - Auto-flag based on ML signals
  - Confidence score tracking
- **Appeal system**:
  - User can appeal rejection
  - Appeal queue for senior moderators
  - Decision history
- **Moderator tools**:
  - Queue dashboard
  - Bulk review
  - User history view
- **Integration**: B09 (audit), B17 (notifications), B05 (user status)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `POST /api/v1/moderation/flag/` - Flag content
- `GET /api/v1/moderation/queue/` - Get moderation queue (moderators)
- `POST /api/v1/moderation/{id}/approve/` - Approve content
- `POST /api/v1/moderation/{id}/reject/` - Reject content
- `POST /api/v1/moderation/{id}/appeal/` - Appeal rejection

**Status**: 📋 ROADMAP

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
