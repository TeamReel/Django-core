# B50: Scheduled Publishing

**Priority:** 🔥 Bouwen
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 311
**Category:** Backend

## Description

## 290. B50 – Scheduled Publishing

**Doel**: Content scheduling - publish at future date/time met timezone support.

**Waarom agnostisch**: Scheduled publishing is universeel - content, posts, announcements.

**Wat moet er gebeuren**:
- **ScheduledItem model** (or mixin):
  - Fields: publish_at (datetime), timezone, status
  - Status: draft, scheduled, published, cancelled
  - Polymorphic: works with any publishable model (GFK or mixin)
- **PublishableMixin** (for content models):
  - Fields: published_at, publish_status, scheduled_publish_at
  - Methods: schedule(), publish(), unpublish()
  - Signals: pre_publish, post_publish
- **Scheduler service**:
  - Celery beat task: check scheduled items every minute
  - Publish items where publish_at <= now
  - Handle timezone conversions
- **Recurring schedules** (optional):
  - Cron-like expression support
  - Repeat daily/weekly/monthly
  - End date or occurrence count
- **Draft management**:
  - Preview before publish
  - Last-minute edits before scheduled time
  - Cancel scheduled publish
- **Notifications**:
  - Reminder before scheduled publish (configurable)
  - Confirmation after publish
  - Failure alerts
- **Audit trail**:
  - Who scheduled, when
  - Publish/cancel history
- **Integration**: B15 (Celery beat), B17 (notifications), B09 (audit)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `POST /api/v1/content/{id}/schedule/` - Schedule content for publishing
- `DELETE /api/v1/content/{id}/schedule/` - Cancel scheduled publish
- `GET /api/v1/scheduled/` - List all scheduled items
- `GET /api/v1/scheduled/calendar/` - Calendar view of scheduled items

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B50-scheduled-publishing

[feature summary]
Content scheduling - publish at future date/time with timezone support.

[goals]
- PublishableMixin for content models with schedule fields
- ScheduledItem model for polymorphic scheduling
- Celery beat task checking scheduled items every minute
- Timezone handling for global users
- Draft management: preview, last-minute edits, cancel
- Notifications: reminders before, confirmation after

[non-goals]
- Recurring content generation (use B34 with cron)
- A/B testing of publish times (use B52)
- Social media optimal time suggestions

[dependencies]
- B15 (Celery beat for scheduler)
- B17 (notifications)
- B09 (audit trail)

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
