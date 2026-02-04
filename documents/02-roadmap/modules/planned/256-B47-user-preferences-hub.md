# B47: User Preferences Hub

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 287
**Category:** Backend

## Description

## 287. B47 – User Preferences Hub

**Doel**: Gecentraliseerde user preferences beyond i18n - notification settings, UI preferences, privacy.

**Waarom agnostisch**: User personalization is universeel - settings, defaults, privacy controls.

**Wat moet er gebeuren**:
- **UserPreference model** (key-value per user):
  - Fields: user FK, category, key, value (JSON), updated_at
  - Categories: notifications, privacy, display, defaults
  - Validation: JSON schema per key (optional)
- **Preference categories**:
  - **Notifications**: email_digest_frequency, push_enabled, mention_alerts
  - **Privacy**: profile_visibility, activity_visibility, search_indexable
  - **Display**: theme (light/dark/system), compact_mode, sidebar_collapsed
  - **Defaults**: default_project, default_view, items_per_page
- **Preference schema registry**:
  - Define valid keys, types, defaults per category
  - Validation on save
  - Auto-migration of deprecated keys
- **Bulk operations**:
  - Get all preferences (merged with defaults)
  - Update multiple preferences at once
  - Reset to defaults (per category or all)
- **Default inheritance**:
  - System defaults → Org defaults → User preferences
  - Override chain with source tracking
- **Privacy controls**:
  - Data export (GDPR)
  - Account deletion request
  - Activity history clear
- **Integration**: B12 (i18n preferences), B17 (notification settings), B05 (user)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/preferences/` - Get all user preferences
- `GET /api/v1/preferences/{category}/` - Get category preferences
- `PATCH /api/v1/preferences/` - Update preferences (bulk)
- `DELETE /api/v1/preferences/{category}/` - Reset category to defaults
- `GET /api/v1/preferences/schema/` - Get preference schema

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
