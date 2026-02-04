# B53: Changelog & Release Notes

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 293
**Category:** Backend

## Description

## 293. B53 – Changelog & Release Notes

**Doel**: In-app "What's New" announcements en release notes management.

**Waarom agnostisch**: Product updates communication is universeel voor SaaS.

**Wat moet er gebeuren**:
- **Release model**:
  - Fields: version, title, content (rich text), published_at
  - Status: draft, published, archived
  - Type: major, minor, patch, hotfix
- **ReleaseItem model**:
  - Fields: release FK, title, description, category
  - Categories: feature, improvement, bugfix, security, deprecation
  - Links: documentation_url, related_feature
- **Announcement model**:
  - Fields: title, content, type, target_audience
  - Types: info, warning, maintenance, celebration
  - Targeting: all users, specific roles, specific orgs
  - Display: banner, modal, notification
- **User tracking**:
  - UserReleaseView: which releases user has seen
  - Mark as read/dismissed
  - "New" badge calculation
- **Display rules**:
  - Show on first login after release
  - Dismissable
  - Optional "remind me later"
- **Scheduling**:
  - Schedule release notes publication
  - Coordinate with actual deploy
- **API for frontends**:
  - Get unread releases
  - Get latest announcements
  - Mark as seen
- **Integration**: B17 (notifications), B10 (feature flags)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/releases/` - List releases
- `GET /api/v1/releases/latest/` - Get latest release
- `GET /api/v1/releases/unread/` - Get unread releases for user
- `POST /api/v1/releases/{id}/seen/` - Mark release as seen
- `GET /api/v1/announcements/active/` - Get active announcements
- `POST /api/v1/announcements/{id}/dismiss/` - Dismiss announcement

**Status**: 📋 ROADMAP

## Notes
<!-- Add progress notes here -->
