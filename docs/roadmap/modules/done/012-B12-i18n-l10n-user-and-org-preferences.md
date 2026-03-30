# B12: i18n/l10n User & Org Preferences

**Phase:** 3
**Status:** ✅ Done
**Module ID:** 012
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 12. B12 – i18n/l10n User & Org Preferences

**Doel**: Language, locale en timezone settings per user/organisation.

**Status**: ✅ Complete

**Key Features**:
- User preference model (language, timezone, locale)
- Organization-level preference inheritance
- Preference resolution hierarchy
- Integration with B04 i18n foundation
- REST API for preference management

---

**Fase 3 Compleet**: 4 modules (B09-B12)
**Outcome**: Configurable and auditable foundation with usage/credits tracking
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: User & Organisation i18n Preferences

**Feature Branch**: `012-user-organisation-i18n`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Extend the base i18n layer to support user and organisation-specific language, locale and time zone preferences integrated with the settings system."

## Terminology

- **Language**: ISO 639-1 code (e.g., `en`, `nl`) for content translation. Activated via `translation.activate()`.
- **Locale**: BCP-47 code (e.g., `en-US`, `nl-BE`) for number/date formatting conventions. Configured via Django's `LANGUAGE_CODE` and `FORMAT_LOCALIZATION` settings.
- **Timezone**: IANA timezone identifier (e.g., `Europe/Amsterdam`, `UTC`). Activated via `timezone.activate()`.

**Note**: Django's `LocaleMiddleware` is misleadingly named - it activates **language** (translation), not formatting locale. This feature extends that middleware to use user/org preferences for language activation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personal Language & Time Zone Preferences (Priority: P1)

As an end user, I want to set my preferred language and time zone so that the application displays content and timestamps in my preferred format, regardless of my organisation's defaults.

**Why this priority**: Core user experience - users expect personalised locale settings in modern applications. Directly impacts user satisfaction and reduces confusion from mismatched time zones or languages.

**Independent Test**: User can log in, navigate to profile settings, change language and time zone, and immediately see the application switch to those preferences. All timestamps and date formats reflect the new settings without requiring logout.

**Acceptance Scenarios**:

1. **Given** a logged-in user with default organisation settings (en-US, UTC), **When** they change their language to Dutch (nl) and time zone to Europe/Amsterdam, **Then** the UI immediately switches to Dutch text and displays timestamps in CET/CEST
2. **Given** a user with custom preferences set, **When** they log out and log back in, **Then** their preferences are preserved and automatically applied
3. **Given** a user with only language preference set (no time zone), **When** viewing timestamps, **Then** the system falls back to organisation time zone, then global default

---

### User Story 2 - Organisation-Wide Default Preferences (Priority: P2)

As an organisation administrator, I want to set default language, locale, and time zone for all members in my organisation so that new users start with appropriate regional settings and teams have consistent date/time displays.

**Why this priority**: Reduces onboarding friction and ensures team-wide consistency. Particularly important for distributed teams or region-specific organisations.

**Independent Test**: Admin can configure organisation defaults via admin interface or API. New users joining the organisation automatically inherit these defaults. Existing users without custom preferences immediately see the new defaults applied.

**Acceptance Scenarios**:

1. **Given** an organisation admin, **When** they set organisation defaults (de, de-DE locale, Europe/Berlin time zone), **Then** all new users in that organisation inherit these settings
2. **Given** existing users without custom preferences, **When** org admin updates defaults, **Then** those users immediately see the new defaults applied
3. **Given** users with custom preferences, **When** org admin updates defaults, **Then** user preferences take precedence (no override)

---

### User Story 3 - API Request Locale Resolution (Priority: P2)

As a developer, I want to programmatically determine the effective locale (language, region format, time zone) for each API request so that I can format responses appropriately and handle time zone conversions correctly.

**Why this priority**: Essential for API clients and background jobs. Without explicit activation, API responses may use incorrect locales. Enables consistent behaviour across web UI, API, and async tasks.

**Independent Test**: API client can inspect effective locale via dedicated endpoint. Background tasks can explicitly activate user/org locale before processing. All datetime serialization respects active time zone.

**Acceptance Scenarios**:

1. **Given** an authenticated API request, **When** the client calls `/api/v1/preferences/effective/`, **Then** the response contains resolved language, locale, and time zone based on precedence rules
2. **Given** a background task processing user data, **When** the task explicitly activates user locale context, **Then** all datetime operations use that user's time zone
3. **Given** an API request with `Accept-Language` header, **When** user has no preference set, **Then** the system respects header value as fallback before org/global defaults

---

### User Story 4 - Admin Inspection & Override (Priority: P3)

As a system administrator, I want to inspect and temporarily override user/org preferences for debugging or support purposes so that I can troubleshoot locale-related issues without permanently modifying user data.

**Why this priority**: Support tool - not critical for MVP but valuable for operations. Helps diagnose "why is this user seeing the wrong time zone?" issues.

**Independent Test**: Admin can view effective preferences for any user via admin panel. Admin can simulate user's locale context without changing stored preferences.

**Acceptance Scenarios**:

1. **Given** a support admin, **When** they view a user's profile in Django admin, **Then** they see both stored preferences and computed effective preferences with precedence chain
2. **Given** a locale-related bug report, **When** admin uses debug toolbar/admin action to simulate user's locale, **Then** they can reproduce the issue in that user's context

---

### Edge Cases

- **Partial preferences**: User sets language but not time zone → language applies, time zone falls back to org > global
- **Invalid preferences at submission**: User or org admin submits non-existent language/time zone via API → system returns HTTP 400 with validation errors (standard DRF behavior, no silent correction)
- **Invalid preferences in storage**: Previously valid preference becomes invalid (e.g., time zone removed from `pytz.all_timezones` after Django upgrade) → system logs warning during resolution and falls back to next level in precedence
- **Deleted organisation**: User's org is soft-deleted or archived → preferences resolve as if org has no defaults (fall back to global)
- **Middleware ordering**: Locale middleware must run after authentication but before view processing → documented requirement
- **API vs Web UI**: API requests without session may not have user context → preferences resolve from token/auth headers or default to global
- **Background jobs**: Celery tasks or management commands have no request context → must explicitly activate locale using helper utility
- **Time zone-naive datetimes**: Legacy code using naive datetimes → system should log warnings but not crash; conversion rules documented

## Requirements *(mandatory)*

### Functional Requirements

**Preference Storage**

- **FR-001**: System MUST store language preference (ISO 639-1 code, e.g., "en", "nl", "de") per user and per organisation
- **FR-002**: System MUST store locale preference (BCP 47 locale code, e.g., "en-US", "nl-NL", "de-DE") per user and per organisation for regional formatting (dates, numbers, currency)
- **FR-003**: System MUST store time zone preference (IANA time zone database name, e.g., "Europe/Amsterdam", "UTC") per user and per organisation
- **FR-004**: System MUST allow partial preferences (e.g., user sets language only, not time zone)
- **FR-005**: System MUST validate language codes against `settings.LANGUAGES`, locale codes against available Django locales, and time zone names against `pytz.all_timezones`, returning HTTP 400 with DRF serializer validation errors for invalid values (no silent correction)

**Preference Resolution**

- **FR-006**: System MUST resolve effective preferences using precedence: **user preference > organisation default > global default** (from Django settings)
- **FR-007**: System MUST apply independent fallback per preference type (e.g., user language + org time zone is valid)
- **FR-008**: System MUST expose effective preferences via API endpoint (`/api/v1/preferences/effective/`) returning `{language, locale, timezone, precedence_source}`
- **FR-009**: System MUST provide Python utility function `get_effective_preferences(user, organisation)` returning resolved preferences with source attribution
- **FR-010**: System MUST handle missing user/org gracefully (e.g., anonymous users, deleted orgs) by falling back to global defaults

**Runtime Activation**

- **FR-011**: System MUST provide custom middleware classes that extend Django's `LocaleMiddleware` and `TimezoneMiddleware` to automatically activate resolved language for authenticated web requests (preference resolution first, then Django's standard fallback chain)
- **FR-012**: System MUST ensure custom middleware maintains full compatibility with Django's built-in locale resolution (cookies, session, Accept-Language headers) as fallback when no user/org preferences are set
- **FR-013**: System MUST provide explicit activation helper for API requests and background jobs: `activate_user_locale(user_id)` and `activate_org_locale(org_id)`
- **FR-014**: System MUST document that API clients and background tasks require explicit activation (no implicit magic)
- **FR-015**: System MUST log locale activation events at DEBUG level for troubleshooting

**Management & Inspection**

- **FR-016**: Users MUST be able to view and update their own preferences via profile page/API endpoint
- **FR-017**: Organisation admins MUST be able to view and update organisation defaults via admin interface and API
- **FR-018**: Django admin MUST display both stored preferences and computed effective preferences for users and organisations
- **FR-019**: System MUST expose admin action/debug view to simulate user's locale context (for support)
- **FR-020**: System MUST provide management command to audit and report invalid preferences (non-existent language/time zone codes)

**Integration with Settings System (B10)**

- **FR-021**: System MUST store user preferences in the unified settings system (B10) with scope `user` and category `i18n`
- **FR-022**: System MUST store organisation defaults in the unified settings system (B10) with scope `organisation` and category `i18n`
- **FR-023**: System MUST leverage B10's caching layer for preference lookups (avoid DB hit per request) and MUST subscribe to B10's existing cache invalidation signals (not implement custom invalidation logic)
- **FR-024**: System MUST use B10's validation framework for preference values (reuse existing validators)

**Data Migration & Compatibility**

- **FR-025**: System MUST provide management command to migrate from custom User model fields (e.g., `user.language`, `user.timezone`) to B10 settings storage, with documentation for adapting the pattern to UserProfile-like tables in downstream projects
- **FR-026**: System MUST maintain backward compatibility with Django's built-in `settings.LANGUAGE_CODE` and `settings.TIME_ZONE` as global defaults
- **FR-027**: System MUST document how to extend preference types (e.g., adding "date format preference" in downstream products)

### Key Entities

- **UserPreferences**: Represents a user's personal i18n preferences
  - Stored via B10 settings system with scope=`user`, category=`i18n`
  - Attributes: `language` (optional), `locale` (optional), `timezone` (optional)
  - Foreign key relationship: User (from B05-accounts)

- **OrganisationPreferences**: Represents an organisation's default i18n settings
  - Stored via B10 settings system with scope=`organisation`, category=`i18n`
  - Attributes: `language` (optional), `locale` (optional), `timezone` (optional)
  - Foreign key relationship: Organisation (from B06-organisation-management)

- **EffectivePreferences** (computed, not stored): Result of precedence resolution
  - Attributes: `language`, `locale`, `timezone`, `language_source`, `locale_source`, `timezone_source`
  - Sources: `"user"`, `"organisation"`, `"global"` (for attribution/debugging)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: This feature provides generic i18n preference storage and resolution. Any product can use it without modification. Extension points include: adding custom preference types via B10 settings framework, custom fallback logic via subclassing middleware.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Approach**: Extends `settings` app (B10) for storage, provides middleware for activation, exposes API via DRF. No new app needed - this is a cross-cutting concern that enhances existing B04, B10.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Test plan**:
- Unit tests: Precedence resolution logic (15 test cases covering all fallback scenarios)
- Middleware tests: Locale activation in web requests (10 test cases)
- API tests: Preference CRUD operations and effective preference endpoint (12 test cases)
- Integration tests: Full user journey (set preference → logout → login → verify applied) (5 test cases)
- Edge case tests: Invalid preferences, missing orgs, background jobs (8 test cases)
- **Target coverage**: 95% for preference resolution module, 90% overall

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Security considerations**:
- Preference data is non-sensitive (language/time zone are not PII)
- User preference API requires authentication (DRF permissions)
- Org defaults API requires admin role (via B08 hierarchical access control)
- No privilege escalation risk (users cannot set other users' preferences)
- Debug logging excludes user IDs in production (configure via `settings.DEBUG`)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Performance strategy**:
- Preferences cached via B10's Redis cache layer (cache key: `i18n:user:{id}`, `i18n:org:{id}`)
- Single DB query per request (middleware fetches cached preferences)
- Cache invalidation on preference update (via B10 signals)
- Performance targets: < 10ms (95th percentile) with warm cache, < 50ms with cold cache or Redis unavailable
- Graceful degradation: if Redis unavailable, query DB directly, log warning as health signal, continue normal operation (no HTTP 503)
- Metrics: `i18n_preference_cache_hit_rate`, `i18n_preference_resolution_duration_ms`, `i18n_cache_degradation_events`

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**API endpoints**:
- `GET /api/v1/preferences/me/` - Get current user's preferences
- `PATCH /api/v1/preferences/me/` - Update current user's preferences
- `GET /api/v1/preferences/effective/` - Get resolved effective preferences with sources
- `GET /api/v1/organisations/{id}/preferences/` - Get org defaults (admin only)
- `PATCH /api/v1/organisations/{id}/preferences/` - Update org defaults (admin only)

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Documentation deliverables**:
- `docs/i18n-preferences.md`: User guide (setting preferences, understanding precedence)
- `docs/i18n-integration.md`: Developer guide (API usage, background job activation, extending preferences)
- ADR: "Why store preferences in B10 settings system vs separate table" (justifies B10 integration for caching, validation, future extensibility)

**Violations Requiring Justification**: None

## Clarifications

### Session 2025-11-29

- Q: How should cache invalidation be triggered when preferences are updated? → A: B10 already provides automatic cache invalidation signals - just hook into existing mechanism. B10 is the central layer for settings and caching including lifecycle. B12 subscribes to existing "settings changed/preferences updated" signals from B10, keeping cache invalidation as an infrastructure responsibility (B10) while B12 remains a thin, agnostic preference layer.
- Q: What middleware implementation approach should B12 take? → A: Extend Django's built-in LocaleMiddleware and TimezoneMiddleware classes with preference resolution logic. This allows: (1) determining effective user/org preference first, (2) letting normal Django resolution (cookies, session, Accept-Language) run as fallback, (3) remaining compatible with existing Django knowledge, docs, and future updates. B12 stays "infrastructure on top of Django" rather than a custom i18n/timezone stack.
- Q: How should the API respond when users submit invalid preference values (e.g., unsupported language code)? → A: Return HTTP 400 with detailed validation error message (standard DRF serializer validation). Invalid preference values are hard validation errors, not silently corrected. This maintains predictable behavior, data consistency, and debuggability. Logging warnings may supplement but never replace explicit validation errors.
- Q: What existing data migration scenario should B12 support? → A: Migrate from custom User model fields (e.g., user.language, user.timezone) to B10 settings. This is the most realistic scenario for projects with existing User models. B12 provides reference migration for User fields; other projects can adapt this pattern for their own UserProfile-like tables.
- Q: What is the acceptable performance degradation when Redis cache is cold or unavailable? → A: < 50ms with cold cache (DB query), graceful degradation with warning logs if Redis unavailable. B12 is "nice to have fast" but not dependent on Redis for correctness. Warm cache achieves < 10ms target. Redis issues are logged as warnings/health signals, not reasons for HTTP 503 - preferences must be correctly applied regardless of cache availability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can set personal language and time zone preferences in under 30 seconds via profile page
- **SC-002**: Organisation admins can configure org-wide defaults in under 1 minute via admin interface
- **SC-003**: Preference resolution completes in under 10ms per request (95th percentile) with Redis cache warm, and under 50ms with cold cache or Redis unavailable (graceful degradation to DB query)
- **SC-004**: System handles 10,000 concurrent users with personalized locales without performance degradation (< 200ms p95 latency)
- **SC-005**: 100% of locale-related support tickets include effective preference debugging info (source attribution in logs/admin)
- **SC-006**: Zero data loss during preference updates (atomic transactions + cache invalidation)
- **SC-007**: API clients can determine effective locale with a single endpoint call (no client-side precedence logic needed)
- **SC-008**: Background jobs using explicit activation helpers render correct time zones 100% of the time (no implicit fallback errors)

### Qualitative Outcomes

- Developers report "preference resolution is intuitive and well-documented" (based on team feedback)
- Support team can debug locale issues without engineering escalation (admin inspection tools sufficient)
- Downstream products extend preference types without modifying core code (extension point validation)

## Assumptions

1. **Language/locale availability**: All supported languages are pre-configured in `settings.LANGUAGES` and Django locale files exist. Adding new languages is a deployment-time configuration, not a runtime feature.
2. **Time zone database**: System uses `pytz` (Django default) for time zone handling. All IANA time zones are available. Future Django versions may switch to `zoneinfo` - migration path documented.
3. **B10 settings system stability**: The unified settings system (B10) is production-ready and performant. Caching layer (Redis) is operational in production environments.
4. **Middleware execution order**: Django's middleware stack is correctly configured with `LocaleMiddleware` and `TimezoneMiddleware` after `AuthenticationMiddleware`. Incorrect ordering breaks preference activation.
5. **API authentication**: All API requests include valid authentication (session cookie, JWT, API key). Anonymous users fall back to global defaults.
6. **Organisation membership**: Users belong to exactly one organisation at a time (per B06 design). Multi-org scenarios are out of scope.
7. **Date/time best practices**: All application code uses timezone-aware datetimes (`USE_TZ = True`). Legacy naive datetimes are rare and handled with warnings.
8. **Browser locale detection**: The `Accept-Language` HTTP header is treated as a hint, not authoritative. Explicit user preferences always override header.
9. **Migration strategy**: Existing systems with user language/time zone fields can migrate via one-time data transformation script (provided as management command).
10. **Extension model**: Future preference types (e.g., "first day of week", "number format") follow the same precedence model and are added via B10 settings schema.

## Dependencies

- **B04 (Core Internationalization Base)**: Provides Django i18n/l10n foundation, locale files, translation utilities
- **B05 (Accounts & Authentication)**: Provides User model for user-level preferences
- **B06 (Organisation Management)**: Provides Organisation model for org-level defaults
- **B10 (Settings & Feature Flags)**: Provides unified settings storage, caching, validation, and API framework
- **B08 (Hierarchical Access Control)**: Provides permission framework for org admin actions (updating org defaults)

## Out of Scope

- **Content translation management**: This feature does NOT handle translation of user-generated content, product-specific strings, or dynamic text. Use Django's translation system (`gettext`) for static strings. Dynamic content translation is a product-specific concern.
- **Regional compliance automation**: Legal requirements (GDPR banners, cookie consent, region-specific terms) are not managed by this feature. Products must implement compliance separately.
- **Custom time zone business logic**: Office hours, cross-zone meeting scheduling, business-day calculations are product-specific and should be built on top of this generic layer.
- **Frontend-only i18n frameworks**: Client-side frameworks (i18next, FormatJS) are not integrated. This feature focuses on backend locale handling. Frontend can consume effective preferences via API.
- **Automatic language detection**: System does NOT auto-detect user language from IP geolocation or browser fingerprinting. Users must explicitly set preferences or rely on org/global defaults.
- **Preference synchronization across devices**: Preferences are server-side only. If a product requires device-specific settings (e.g., mobile app vs web), that logic is product-specific.
- **Historical preference changes**: System does NOT track preference change history or audit log. If audit is required, integrate with B09 (Audit Logging System) separately.
