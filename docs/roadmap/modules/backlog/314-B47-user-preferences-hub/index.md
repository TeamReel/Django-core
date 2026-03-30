# B47: User Preferences Hub

**Priority:** 🔥 Bouwen
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 314
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

**Specify Prompt**:
```
/spec-kitty.specify feature=B47-user-preferences-hub

[feature summary]
Centralized user preferences beyond i18n - notification settings, UI preferences, privacy controls.

[goals]
- UserPreference model with category/key/value (JSON)
- Categories: notifications, privacy, display, defaults
- Preference schema registry with validation
- Default inheritance: system → org → user
- Bulk get/update operations
- GDPR: data export, account deletion request

[non-goals]
- Complex preference dependencies
- A/B test variant storage (use B52)
- Application settings (use B10 feature flags)

[dependencies]
- B12 (i18n preferences integration)
- B17 (notification settings)
- B05 (user model)

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
