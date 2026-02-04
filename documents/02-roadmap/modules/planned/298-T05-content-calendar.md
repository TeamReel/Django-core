# T05: Content Calendar

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 298
**Category:** TeamReel (Product-Specific)

## Description

## 298. T05 – Content Calendar

**Doel**: Planning tool voor content creators met visuele kalender en workflow management.

**Waarom TeamReel**: Core feature - plan content around match schedule.

**Wat moet er gebeuren**:
- **ContentPlan model**:
  - Fields: title, content_type, planned_date, status
  - Status: idea, planned, in_progress, review, published
  - Assignment: assigned_to (user), team
  - Links: related_match, generated_content (FK)
- **ContentTemplate suggestions**:
  - Auto-suggest templates based on upcoming matches
  - Pre-match: line-up, announcement (2 days before)
  - Post-match: result, highlights (after match)
  - Weekly: training recap, player spotlight
- **Calendar integration**:
  - Visual calendar with content plans
  - Overlay with match calendar (T03)
  - Drag-drop rescheduling
- **Workflow states**:
  - Customizable workflow per team
  - Approval steps (optional)
  - Due date tracking
- **Reminders & notifications**:
  - Content due reminders
  - Overdue alerts
  - Assignment notifications
- **Batch planning**:
  - Plan content for entire season
  - Template-based bulk creation
  - Match-driven auto-planning
- **Analytics**:
  - Content output per week/month
  - Team productivity
  - Template usage stats
- **Integration**: T03 (matches), B34 (generation), B50 (scheduling), B17 (notifications)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/content-calendar/` - Calendar view
- `POST /api/v1/content-calendar/` - Create content plan
- `PATCH /api/v1/content-calendar/{id}/` - Update plan
- `POST /api/v1/content-calendar/{id}/assign/` - Assign to user
- `GET /api/v1/content-calendar/suggestions/` - Get suggestions
- `POST /api/v1/content-calendar/bulk/` - Bulk create plans

**Status**: 📋 ROADMAP

## Notes
<!-- Add progress notes here -->
