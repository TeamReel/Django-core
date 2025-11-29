# Research: User & Organisation i18n Preferences

**Feature**: B12 - User & Organisation i18n Preferences
**Date**: 2025-11-29
**Status**: Complete

## Planning Decisions

This document captures all technical decisions made during the planning phase that inform the implementation.

---

### Decision 1: App Structure

**Question**: Should B12 live as a standalone Django app or be integrated into existing apps?

**Decision**: Create dedicated `src/i18n_preferences/` Django app

**Rationale**:
- Clear separation of concerns following existing workspace pattern
- Easier testing and maintenance with isolated codebase
- Existing apps (accounts/, organisations/, projects/, permissions/) all follow single-responsibility principle
- Avoids coupling i18n preference logic to user profiles or common utilities
- Provides clean import paths and API routing structure

**Alternatives Considered**:
- **Extend src/accounts/**: Rejected - would couple user authentication concerns with i18n preferences
- **Extend src/common/**: Rejected - common is for shared utilities, not feature logic

**Impact**: New Django app will be registered in INSTALLED_APPS, requires own migrations, admin, API views

---

### Decision 2: Data Storage - B10 Integration Approach

**Question**: How should B12 store user-level preferences given B10 currently only supports GLOBAL, ORGANISATION, PROJECT scopes?

**Decision**: Extend B10's Setting model to add USER scope (new `ScopeType.USER` enum value + `user` ForeignKey)

**Rationale**:
- **Cleanest architecture**: Maintains consistency - all settings (user, org, project, global) use same infrastructure
- **Leverages B10 benefits**: Automatic caching (Redis), validation framework, signal-based cache invalidation
- **Future-proof**: Other features may need user-scoped settings (notification preferences, UI customization)
- **Single query path**: Preference resolution uses same B10 API for all scopes

**B10 Investigation Findings**:
- `Setting` model already has `value = models.JSONField(default=dict)` - supports structured data
- `SettingType.JSON` enum exists for validation
- Current scopes: GLOBAL, ORGANISATION, PROJECT (lines 10-14 in models.py)
- Unique constraint pattern: `fields=["key", "scope_type", "organisation", "project"]` will extend to include `user`

**Alternatives Considered**:
- **Composite keys at ORGANISATION scope** (e.g., `i18n.user.{user_id}.preferences`): Rejected - makes queries more complex, doesn't follow B10's scope pattern
- **Separate UserPreference model**: Rejected - loses B10's caching/validation benefits, duplicates infrastructure

**Migration Requirements**:
- Add `USER` to `ScopeType` enum
- Add `user` ForeignKey to `Setting` and `FeatureFlag` models (nullable for backwards compatibility)
- Update unique constraints to include `user` field
- Update B10's resolution hierarchy API to support user scope: `user → organisation → global`
- Extend B10's permission system to handle user-scoped settings

**Data Format**: Store as single JSON blob per user/org:
```json
{
  "language": "nl",
  "locale": "nl-NL",
  "timezone": "Europe/Amsterdam"
}
```

---

### Decision 3: Middleware Implementation Strategy

**Question**: How should B12's custom middleware integrate with Django's LocaleMiddleware and TimezoneMiddleware?

**Decision**: Inherit from Django's built-in middleware classes, override `process_request()` to inject preference resolution before calling `super().process_request()`

**Rationale**:
- **Maximum compatibility**: Preserves Django's existing locale resolution fallback chain (cookies, session, Accept-Language)
- **Minimal code**: Only override preference lookup logic, reuse Django's activation mechanisms
- **Future-proof**: Benefits from Django updates/bug fixes to base middleware
- **Documented pattern**: Middleware subclassing is standard Django extension approach

**Implementation Pattern**:
```python
from django.middleware.locale import LocaleMiddleware

class PreferenceLocaleMiddleware(LocaleMiddleware):
    def process_request(self, request):
        if request.user.is_authenticated:
            # Resolve user/org preference from B10
            effective_lang = get_effective_language(request.user)
            if effective_lang:
                request.LANGUAGE_CODE = effective_lang
        # Fall back to Django's standard resolution
        return super().process_request(request)
```

**Alternatives Considered**:
- **Separate middleware before Django's**: Rejected - requires complex thread-local state management
- **Replace Django middleware entirely**: Rejected - high maintenance burden, loses compatibility

**Configuration**:
- `MIDDLEWARE` setting order: `PreferenceLocaleMiddleware` and `PreferenceTimezoneMiddleware` must run after `AuthenticationMiddleware`
- Document ordering requirement in FR-012

---

### Decision 4: Testing Strategy

**Question**: What level of test coverage for this infrastructure feature?

**Decision**: Unit tests + Integration tests (no separate E2E/UI tests)

**Rationale**:
- **Complex feature**: B12 extends B10, integrates with Django middleware, multiple layers of precedence
- **Integration risks**: Cache invalidation, middleware ordering, precedence resolution need full request/response testing
- **CI balance**: Integration tests catch real-world issues without E2E overhead
- **Infrastructure layer**: No UI components to test end-to-end

**Test Categories** (50 test cases):

1. **Unit Tests** (25 cases):
   - Preference resolution logic (15 cases covering all precedence scenarios: user only, org only, partial preferences, invalid data)
   - Validators (5 cases: valid codes, invalid codes, edge cases)
   - Serializers (5 cases: valid payloads, HTTP 400 errors, partial updates)

2. **Integration Tests** (20 cases):
   - Middleware activation (10 cases: authenticated user, anonymous, partial preferences, cache warm/cold)
   - API endpoints (8 cases: CRUD operations, permission checks, effective preference resolution)
   - B10 integration (2 cases: cache invalidation on update, graceful degradation)

3. **Migration Tests** (5 cases):
   - Management command: User fields → B10 settings
   - Handle missing data
   - Idempotency

**Coverage Targets**:
- Preference resolution module: 95%
- Overall B12 code: 90%
- Integration tests use Django TestCase with test database

**Alternatives Considered**:
- **Unit tests only**: Rejected - would miss middleware/cache integration issues
- **Full E2E with UI**: Rejected - B12 is backend-only, no UI to test

---

### Decision 5: Performance & Caching Strategy

**Question**: What happens when Redis cache is cold or unavailable?

**Decision**: Graceful degradation - < 50ms with cold cache (DB query), no HTTP 503 on Redis failure

**Rationale**:
- **Resilience**: i18n preferences are non-critical - system must remain functional without Redis
- **User experience**: Better to serve slightly slower than fail completely
- **Core-App philosophy**: Infrastructure should degrade gracefully, not cascade failures

**Performance Targets**:
- **Warm cache**: < 10ms (p95) - achievable with single Redis GET
- **Cold cache**: < 50ms (p95) - single DB query to B10's Setting table with indexes
- **Redis unavailable**: Same < 50ms target, log warning as health signal

**Cache Strategy** (via B10):
- Cache keys: `i18n:user:{user_id}`, `i18n:org:{org_id}`
- TTL: Indefinite (invalidate on update via B10 signals)
- Invalidation: B10 emits `setting_updated` signal → cache deletion
- Fallback: On cache miss or Redis error, query PostgreSQL directly

**Metrics** (via django-prometheus):
- `i18n_preference_cache_hit_rate`: Monitor cache effectiveness
- `i18n_preference_resolution_duration_ms`: Track performance (histogram)
- `i18n_cache_degradation_events`: Count Redis failures for alerting

**Alternatives Considered**:
- **Hard Redis dependency with HTTP 503**: Rejected - too fragile for infrastructure layer
- **Same < 10ms target with cold cache**: Rejected - unrealistic without pre-warming

---

## Technical Constraints Summary

### Must Modify B10 (Settings App)

**Changes Required**:
1. Add `ScopeType.USER` enum value
2. Add `user = models.ForeignKey(AUTH_USER_MODEL, ...)` to `Setting` and `FeatureFlag` models
3. Update unique constraint: `["key", "scope_type", "user", "organisation", "project"]`
4. Extend `_resolve_scope_hierarchy()` in api.py to support user scope
5. Update permissions.py to allow users to manage their own settings
6. Create migration: `0005_add_user_scope.py`

**Testing Impact**: B10 tests must cover new USER scope resolution

---

### Dependencies

| Feature | Purpose | Integration Point |
|---------|---------|-------------------|
| B04 (Core i18n Base) | Django i18n foundation | Uses Django's `activate()`, `get_language()` |
| B05 (Accounts) | User model | ForeignKey on B10's Setting model |
| B06 (Organisations) | Organisation model | Already integrated with B10 |
| B08 (Access Control) | Org admin permissions | Check org admin role before allowing org default updates |
| B10 (Settings) | Storage + caching | Extends to add USER scope, uses for all preference storage |

---

## Best Practices Research

### Django Middleware Extension Pattern

**Source**: Django docs - Writing Middleware
**Key Points**:
- Subclass existing middleware to extend behavior
- Call `super()` to preserve parent functionality
- Order in MIDDLEWARE list matters (auth before locale)

**Example from Django ecosystem**:
```python
from django.utils.translation import activate

class CustomLocaleMiddleware(LocaleMiddleware):
    def process_request(self, request):
        # Custom logic first
        if hasattr(request, 'custom_language'):
            activate(request.custom_language)
        # Then Django's fallback chain
        return super().process_request(request)
```

### IANA Time Zone Handling

**Library**: `pytz` (Django's default for USE_TZ=True)
**Validation**: `pytz.all_timezones` contains all valid IANA names
**Edge Case**: Future Django versions may migrate to `zoneinfo` (Python 3.9+)
**Recommendation**: Abstract time zone activation behind helper function for future compatibility

### DRF Validation Patterns

**Pattern**: Use serializer validators with clear error messages
```python
class PreferenceSerializer(serializers.Serializer):
    language = serializers.CharField(max_length=10)

    def validate_language(self, value):
        if value not in dict(settings.LANGUAGES):
            raise serializers.ValidationError(
                f"Unsupported language: {value}. "
                f"Allowed: {list(dict(settings.LANGUAGES).keys())}"
            )
        return value
```
**Result**: HTTP 400 with `{"language": ["Unsupported language: xx. Allowed: [...]"]}`

---

## Open Questions for Implementation Phase

1. **B10 Migration Coordination**: Should B10's USER scope migration happen in B10's migration folder or B12's? (Recommend: B10's, as it's a core schema change)
2. **Preference key naming**: `i18n.preferences` (single key) or `i18n.language`, `i18n.locale`, `i18n.timezone` (separate keys)? (Recommendation: single key for atomic updates)
3. **Anonymous user handling**: Should API support setting preferences via session for anonymous users before login? (Recommend: defer to future feature, not MVP)

---

## Success Criteria Validation

All planning decisions support the spec's success criteria:

- ✅ SC-001: < 30s preference setting (API + UI forms planned)
- ✅ SC-003: < 10ms warm / < 50ms cold (cache strategy + graceful degradation)
- ✅ SC-004: 10k concurrent users (B10's proven caching layer)
- ✅ SC-006: Zero data loss (B10 signals for cache invalidation, atomic updates)
- ✅ SC-007: Single API call (effective preference endpoint: `/api/v1/preferences/effective/`)
- ✅ SC-008: 100% correct timezone (explicit activation helpers documented)

---

**Research Complete**: All critical unknowns resolved, ready for Phase 1 (Design & Contracts)
