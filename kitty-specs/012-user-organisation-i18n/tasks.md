# Tasks: User & Organisation i18n Preferences (B12)

**Feature**: 012-user-organisation-i18n
**Last Updated**: 2025-11-29
**Status**: Ready for implementation

## Overview

This feature extends Django's i18n layer to support user and organisation-specific language, locale, and time zone preferences with precedence resolution (user > org > global). Implementation integrates with B10 (Settings System) for storage/caching and extends Django's built-in middleware for automatic locale activation.

**Key Deliverables**:
- Extended B10 Setting model with USER scope support
- New `i18n_preferences` Django app with preference resolution service
- Custom middleware extending Django's LocaleMiddleware/TimezoneMiddleware
- DRF API endpoints for preference management
- Explicit activation helpers for API/background jobs
- Data migration command from User model fields to B10 settings

**Critical Path**: WP01 (Extend B10) is BLOCKING - all other work depends on USER scope support

---

## Work Package Summary

| ID | Title | Priority | Dependencies | Subtasks | Status |
|----|-------|----------|--------------|----------|--------|
| WP01 | Extend B10 with USER Scope | P0 (Critical) | None | T001-T008 | ✅ Done |
| WP02 | Core Preference Resolution | P0 (Critical) | WP01 | T009-T015 | ✅ Done |
| WP03 | Middleware Integration | P1 (High) | WP02 | T016-T021 | 📋 Planned |
| WP04 | API Endpoints | P1 (High) | WP02 | T022-T030 | ✅ Done |
| WP05 | Explicit Activation Helpers | P2 (Medium) | WP02 | T031-T035 | ✅ Done |
| WP06 | Migration & Documentation | P2 (Medium) | WP02-WP04 | T036-T041 | ✅ Done |

**MVP Scope**: WP01 + WP02 + WP03 (Settings extension, resolution service, middleware) enables basic user preference functionality

---

## Phase 0: Foundation (CRITICAL - BLOCKING)

### WP01: Extend B10 with USER Scope ✅ COMPLETE
**Owner**: Settings app maintainer
**Priority**: P0 (Critical - all other work blocked until complete)
**Location**: `src/settings/`
**Prompt**: [`tasks/done/WP01-extend-b10-user-scope.md`](tasks/done/WP01-extend-b10-user-scope.md)

**Objective**: Add USER scope support to B10's Setting model, enabling user-level settings storage with same infrastructure as org/project/global scopes.

**Included Subtasks**:
- [x] T001: Add `ScopeType.USER` enum value to `settings/models.py`
- [x] T002: Add `user` ForeignKey to `Setting` model (nullable, CASCADE)
- [x] T003: Update unique constraint to include `user` field
- [x] T004: Add composite indexes for efficient user-scoped queries
- [x] T005: Extend `_resolve_scope_hierarchy()` in `settings/api.py` for user precedence (user > org > project > global)
- [x] T006: Update `SettingPermission` to allow users to manage own settings (block access to others)
- [x] T007: Create migration `0005_add_user_scope.py`
- [x] T008: Write unit tests for USER scope (10 test cases covering all scenarios)

**Review Status**: ✅ Approved (2025-11-29, commit 3facc8a)
**Test Coverage**: 17 test methods (170% of requirement)
- [ ] T003: Update unique constraint to include `user` field
- [ ] T004: Add composite indexes for user-scoped queries
- [ ] T005: Extend `_resolve_scope_hierarchy()` in `settings/api.py` to support user scope precedence
- [ ] T006: Update `SettingPermission` to allow users to manage own settings
- [ ] T007: Create migration `0005_add_user_scope.py`
- [ ] T008: Add unit tests for USER scope resolution (10 test cases)

**Implementation Sketch**:
1. Modify `ScopeType` enum, add `user` field with proper constraints
2. Update B10's resolution API to traverse user → org → project → global
3. Extend permission classes for self-service user settings
4. Write migration ensuring backwards compatibility
5. Test all scope combinations (user+org, user-only, org-only, global fallback)

**Parallel Opportunities**: None - this is the critical first step

**Dependencies**: None (foundational work)

**Risks**:
- Breaking existing B10 functionality (mitigated by comprehensive tests)
- Performance impact from additional FK (mitigated by indexes)
- Permission system edge cases (mitigated by explicit permission tests)

**Success Criteria**:
- `Setting.objects.create(key="test", scope_type=ScopeType.USER, user=user)` succeeds
- B10's `get_setting()` API returns user-scoped values with correct precedence
- All existing B10 tests pass (backwards compatibility)
- New tests cover user scope edge cases (10+ scenarios)

---

## Phase 1: Core Functionality

### WP02: Core Preference Resolution ✅ COMPLETE
**Owner**: Feature developer
**Priority**: P0 (Critical - enables all preference features)
**Location**: `src/i18n_preferences/`
**Dependencies**: WP01 (requires USER scope in B10)
**Prompt**: [`tasks/done/WP02-preference-resolution-service.md`](tasks/done/WP02-preference-resolution-service.md)

**Objective**: Create `i18n_preferences` Django app with preference resolution service that implements precedence logic (user > org > global) and integrates with B10's caching layer.

**Included Subtasks**:
- [x] T009: Create Django app scaffolding (`python manage.py startapp i18n_preferences`)
- [x] T010: Implement `PreferenceResolutionService` with `get_effective_preferences(user, org)` method
- [x] T011: Implement independent fallback logic (per-field precedence: language, locale, timezone)
- [x] T012: Add validation functions for language/locale/timezone codes
- [x] T013: Create `EffectivePreferences` dataclass with source attribution
- [x] T014: Integrate with B10 cache layer (Redis keys: `i18n:user:{id}`, `i18n:org:{id}`)
- [x] T015: Write unit tests for resolution logic (21 test cases covering all precedence scenarios)

**Implementation Sketch**:
1. Create app structure, register in `INSTALLED_APPS`
2. Implement `get_effective_preferences()` that queries B10 for user, org, global settings
3. Apply independent fallback per field (e.g., user.language + org.timezone is valid)
4. Add source attribution for debugging (`language_source="user"`)
5. Leverage B10's cache layer, handle Redis unavailability gracefully
6. Test all precedence combinations: full preferences, partial preferences, missing scopes

**Parallel Opportunities**: None - other components depend on this service

**Dependencies**: WP01 (USER scope must exist)

**Risks**:
- Cache stampede on cold cache (mitigated by B10's existing cache warming)
- Invalid stored preferences from legacy data (mitigated by validation in resolution service)
- Performance regression on high load (mitigated by caching + performance tests)

**Success Criteria**:
- `get_effective_preferences(user, org)` returns correct precedence in all scenarios
- Cache hit rate > 95% under normal load
- Resolution completes in < 10ms (p95 warm cache), < 50ms (cold/degraded)
- Unit tests achieve 95% coverage for resolution module

---

### WP03: Middleware Integration
**Owner**: Feature developer
**Priority**: P1 (High - enables automatic locale activation for web requests)
**Location**: `src/i18n_preferences/middleware.py`
**Dependencies**: WP02 (requires preference resolution service)
**Prompt**: [`tasks/planned/WP03-middleware-integration.md`](tasks/planned/WP03-middleware-integration.md)

**Objective**: Create custom middleware classes that extend Django's `LocaleMiddleware` and `TimezoneMiddleware` to automatically activate user/org preferences for authenticated web requests.

**Included Subtasks**:
- [ ] T016: Create `PreferenceLocaleMiddleware` extending Django's `LocaleMiddleware` (note: Django's LocaleMiddleware activates **language**, not formatting locale, despite the name)
- [ ] T017: Create `PreferenceTimezoneMiddleware` extending Django's `TimezoneMiddleware`
- [ ] T018: Override `process_request()` to inject preference resolution before Django's fallback chain
- [ ] T019: Add graceful degradation for anonymous users (fall back to Django's standard resolution)
- [ ] T020: Add DEBUG-level logging for locale activation events
- [ ] T021: Write integration tests for middleware (10 test cases: authenticated/anonymous, full/partial preferences, fallback scenarios)

**Implementation Sketch**:
1. Subclass Django's built-in middleware, override `process_request()`
2. Check if user is authenticated, resolve effective preferences via `PreferenceResolutionService`
3. Activate language/timezone using Django's standard APIs (`translation.activate()`, `timezone.activate()`)
4. Call `super().process_request()` to preserve Django's fallback chain (cookies, session, Accept-Language)
5. Log activation at DEBUG level for troubleshooting
6. Test with Django test client: authenticated requests, anonymous requests, partial preferences

**Parallel Opportunities**: Can be developed in parallel with WP04 (API endpoints) after WP02 completes

**Dependencies**: WP02 (requires `PreferenceResolutionService`)

**Risks**:
- Middleware ordering issues (mitigated by clear documentation in settings template)
- Breaking Django's standard locale resolution (mitigated by calling `super()`)
- Performance impact from middleware overhead (mitigated by caching + performance tests)

**Success Criteria**:
- Authenticated users see preferences applied automatically
- Anonymous users fall back to Django's standard resolution (no errors)
- Middleware preserves compatibility with `Accept-Language` headers, locale cookies
- Integration tests cover request lifecycle from middleware to view

---

## Phase 2: API & User Interface

### WP04: API Endpoints ✅ COMPLETE
**Owner**: Feature developer
**Priority**: P1 (High - enables preference management via API)
**Location**: `src/i18n_preferences/views.py`, `serializers.py`, `urls.py`
**Dependencies**: WP02 (requires preference resolution service)
**Prompt**: [`tasks/done/WP04-api-endpoints.md`](tasks/done/WP04-api-endpoints.md)

**Objective**: Implement DRF API endpoints for viewing/updating user/org preferences and querying effective preferences with source attribution.

**Included Subtasks**:
- [x] T022: Create `PreferenceSerializer` with validation for language/locale/timezone codes
- [x] T023: Implement `GET /api/v1/preferences/me/` (get current user's preferences)
- [x] T024: Implement `PATCH /api/v1/preferences/me/` (update current user's preferences)
- [x] T025: Implement `GET /api/v1/preferences/effective/` (get resolved effective preferences)
- [x] T026: Implement `GET /api/v1/organisations/{id}/preferences/` (get org defaults, admin only)
- [x] T027: Implement `PATCH /api/v1/organisations/{id}/preferences/` (update org defaults, admin only)
- [x] T028: Add permission classes (self for `/me/`, org admin for org endpoints via B08)
- [x] T029: Register URLs in `i18n_preferences/urls.py`, include in main `urls.py`
- [x] T030: Write API integration tests (12 test cases: CRUD operations, permissions, validation errors)

**Implementation Sketch**:
1. Create DRF serializers with field-level validation (language in `settings.LANGUAGES`, timezone in `pytz.all_timezones`)
2. Implement user preference views (self-service read/update via B10 API)
3. Implement org preference views with permission checks (B08 org admin role)
4. Implement effective preference view (calls `PreferenceResolutionService`, returns with source attribution)
5. Return HTTP 400 for invalid preference codes (no silent correction)
6. Test with DRF APIClient: authenticated CRUD, permission errors, validation errors

**Parallel Opportunities**: Can be developed in parallel with WP03 (middleware) after WP02 completes

**Dependencies**: WP02 (requires `PreferenceResolutionService`)

**Risks**:
- Permission bypass vulnerabilities (mitigated by explicit permission tests)
- Validation inconsistency between API and middleware (mitigated by shared validators)
- Performance issues with org admin checks (mitigated by caching org membership)

**Success Criteria**:
- Users can view/update their own preferences via `/me/` endpoints
- Org admins can manage org defaults via `/organisations/{id}/` endpoints
- Effective preference endpoint returns correct precedence with source attribution
- API returns HTTP 400 for invalid preference codes with clear error messages
- Integration tests achieve 90% coverage for API views

---

### WP05: Explicit Activation Helpers ✅ COMPLETE
**Owner**: Feature developer
**Priority**: P2 (Medium - enables correct locale handling in API/background jobs)
**Location**: `src/i18n_preferences/helpers.py`
**Dependencies**: WP02 (requires preference resolution service)
**Prompt**: [`tasks/done/WP05-explicit-activation-helpers.md`](tasks/done/WP05-explicit-activation-helpers.md)

**Objective**: Provide utility functions and context managers for explicitly activating user/org locale in API requests and background jobs where middleware doesn't apply.

**Included Subtasks**:
- [x] T031: Implement `activate_user_locale(user_id)` function
- [x] T032: Implement `activate_org_locale(org_id)` function
- [x] T033: Create `user_locale_context(user_id)` context manager for Celery tasks
- [x] T034: Add error handling for non-existent users/orgs (graceful fallback to global)
- [x] T035: Write unit tests for activation helpers (5 test cases: valid user, missing user, context manager, error handling)

**Implementation Sketch**:
1. Create helper functions that resolve effective preferences and activate via Django APIs
2. Implement context managers for `with user_locale_context(user_id):` usage in background jobs
3. Handle edge cases: user not found, org deleted, invalid preferences in storage
4. Document usage patterns in docstrings and developer guide
5. Test activation behavior: verify `translation.get_language()` and `timezone.get_current_timezone()` return expected values

**Parallel Opportunities**: Can be developed in parallel with WP03/WP04 after WP02 completes

**Dependencies**: WP02 (requires `PreferenceResolutionService`)

**Risks**:
- Misuse by developers (mitigated by clear documentation + examples)
- Memory leaks in long-running tasks (mitigated by context manager pattern)
- Thread safety issues in async contexts (mitigated by Django's thread-local storage)

**Success Criteria**:
- Background jobs using helpers render correct locales 100% of the time
- Context managers properly restore previous locale after exit
- Error handling prevents crashes on invalid user/org IDs
- Documentation includes usage examples for common scenarios

---

## Phase 3: Migration & Polish

### WP06: Migration & Documentation ✅ COMPLETE
**Owner**: Feature developer
**Priority**: P2 (Medium - enables smooth adoption + knowledge transfer)
**Location**: `src/i18n_preferences/management/commands/`, `docs/`
**Dependencies**: WP02, WP04 (requires core functionality + API)
**Prompt**: [`tasks/done/WP06-migration-documentation.md`](tasks/done/WP06-migration-documentation.md)

**Objective**: Provide data migration command for existing User model fields, comprehensive documentation, and Django admin integration.

**Included Subtasks**:
- [x] T036: Create management command `migrate_user_i18n_preferences` (read User fields, write to B10)
- [x] T037: Add dry-run mode + progress reporting to migration command
- [x] T038: Create Django admin inline for viewing user/org preferences
- [x] T039: Write user guide (`docs/i18n-preferences.md`: setting preferences, understanding precedence)
- [x] T040: Write developer guide (`docs/i18n-integration.md`: API usage, background jobs, extending preferences)
- [x] T041: Write ADR (`docs/adr/012-b10-preference-storage.md`: justification for B10 integration)

**Review Status**: ✅ Approved (2025-11-29, commit 9e60494)
**Implementation**:
- Migration command: 221 lines with dry-run, validation, progress reporting
- Admin integration: 75 lines with effective preference display
- Documentation: User guide (209 lines), Developer guide (485 lines), ADR (311 lines)

**Implementation Sketch**:
1. Implement management command that queries User model, transforms to B10 settings format
2. Add validation, error handling, progress bars for large datasets
3. Create Django admin integration: show stored + effective preferences side-by-side
4. Write comprehensive docs covering all user stories from spec
5. Document extension points for downstream products

**Parallel Opportunities**: Documentation can be written in parallel with implementation

**Dependencies**: WP02 (migration requires resolution service), WP04 (docs reference API)

**Risks**:
- Data loss during migration (mitigated by dry-run mode + transaction safety)
- Incomplete documentation (mitigated by spec-driven doc structure)
- Admin performance with large user counts (mitigated by pagination)

**Success Criteria**:
- Migration command successfully transforms User fields to B10 settings
- Django admin displays effective preferences with source attribution
- User guide covers all acceptance scenarios from spec
- Developer guide includes code examples for common patterns
- ADR explains architectural rationale clearly

---

## Subtask Reference

### Foundation (WP01)
- **T001**: Add `ScopeType.USER` enum value
- **T002**: Add `user` ForeignKey to Setting model
- **T003**: Update unique constraint to include user
- **T004**: Add composite indexes for performance
- **T005**: Extend `_resolve_scope_hierarchy()` for user scope
- **T006**: Update permissions for user self-service
- **T007**: Create migration `0005_add_user_scope.py`
- **T008**: Write unit tests for USER scope (10 cases)

### Core Resolution (WP02)
- **T009**: Create `i18n_preferences` app scaffolding
- **T010**: Implement `PreferenceResolutionService.get_effective_preferences()`
- **T011**: Implement independent fallback per field
- **T012**: Add validation for language/locale/timezone codes
- **T013**: Create `EffectivePreferences` dataclass
- **T014**: Integrate with B10 cache layer
- **T015**: Write resolution unit tests (15 cases)

### Middleware (WP03)
- **T016**: Create `PreferenceLocaleMiddleware`
- **T017**: Create `PreferenceTimezoneMiddleware`
- **T018**: Override `process_request()` with preference injection
- **T019**: Add graceful degradation for anonymous users
- **T020**: Add DEBUG logging for activation events
- **T021**: Write middleware integration tests (10 cases)

### API (WP04)
- **T022**: Create `PreferenceSerializer` with validation
- **T023**: Implement `GET /api/v1/preferences/me/`
- **T024**: Implement `PATCH /api/v1/preferences/me/`
- **T025**: Implement `GET /api/v1/preferences/effective/`
- **T026**: Implement `GET /api/v1/organisations/{id}/preferences/`
- **T027**: Implement `PATCH /api/v1/organisations/{id}/preferences/`
- **T028**: Add permission classes (self, org admin)
- **T029**: Register URLs in routing
- **T030**: Write API integration tests (12 cases)

### Helpers (WP05)
- **T031**: Implement `activate_user_locale(user_id)`
- **T032**: Implement `activate_org_locale(org_id)`
- **T033**: Create `user_locale_context()` context manager
- **T034**: Add error handling for missing users/orgs
- **T035**: Write helper unit tests (5 cases)

### Migration & Docs (WP06)
- **T036**: Create `migrate_user_i18n_preferences` command
- **T037**: Add dry-run mode + progress reporting
- **T038**: Create Django admin integration
- **T039**: Write user guide (`docs/i18n-preferences.md`)
- **T040**: Write developer guide (`docs/i18n-integration.md`)
- **T041**: Write ADR (`docs/adr/012-b10-preference-storage.md`)

---

## Parallelization Strategy

**Phase 0 (Sequential)**:
1. WP01 must complete first (BLOCKING)

**Phase 1 (After WP01)**:
2. WP02 must complete next (required by all subsequent work)

**Phase 2 (After WP02 - PARALLEL)**:
3. WP03 (Middleware) [P]
4. WP04 (API) [P]
5. WP05 (Helpers) [P]

**Phase 3 (After WP02/WP04 - PARALLEL)**:
6. WP06 (Migration + Docs) [P] - can start docs early, migration requires WP02

**Maximum Parallelism**: 3 work packages (WP03, WP04, WP05) can be developed simultaneously after WP02 completes

---

## Next Steps

1. **Start with WP01**: Assign to settings app maintainer, complete USER scope extension
2. **Then WP02**: Core preference resolution (enables all other features)
3. **Parallelize Phase 2**: Distribute WP03, WP04, WP05 across team members
4. **Polish in WP06**: Migration + documentation as final integration step

**Recommended First Sprint**: WP01 + WP02 (foundation + core resolution)
**Recommended Second Sprint**: WP03 + WP04 (middleware + API for MVP)
**Recommended Third Sprint**: WP05 + WP06 (helpers + migration + docs)

**Command to start implementation**: Move work package prompts from `planned/` to `doing/` as work begins
