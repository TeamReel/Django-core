# Quickstart: User & Organisation i18n Preferences

**Feature**: B12 - User & Organisation i18n Preferences
**Last Updated**: 2025-11-29

## Overview

This feature extends the Django Core-App with user and organisation-specific language, locale, and time zone preferences. Users can set personal preferences that override organisation defaults, which in turn override global Django settings.

**Key Capabilities**:
- ✅ Per-user language, locale, and timezone preferences
- ✅ Per-organisation default preferences
- ✅ Precedence resolution: user > organisation > global
- ✅ Automatic locale activation via middleware (web requests)
- ✅ Explicit activation helpers for API/background jobs
- ✅ Redis caching with graceful degradation
- ✅ DRF API endpoints for preference management

---

## Prerequisites

Before implementing B12, ensure these features are complete:

| Feature | Purpose | Status Check |
|---------|---------|--------------|
| **B04** (Core i18n Base) | Django i18n/l10n foundation | ✅ Translations working, `USE_I18N=True` |
| **B05** (Accounts) | User model | ✅ Custom User model in place |
| **B06** (Organisations) | Organisation model | ✅ Orgs with member relationships |
| **B08** (Access Control) | Permissions | ✅ Org admin role checks |
| **B10** (Settings) | Storage + caching | ✅ Setting model, Redis cache, signals |

**Critical**: B10 must be extended to support USER scope before B12 implementation begins.

---

## Architecture At-A-Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                         Django Request                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PreferenceLocaleMiddleware (extends LocaleMiddleware)          │
│  PreferenceTimezoneMiddleware (extends TimezoneMiddleware)      │
├─────────────────────────────────────────────────────────────────┤
│  1. Check if user authenticated                                  │
│  2. Resolve effective preferences (user > org > global)          │
│  3. Activate locale (django.utils.translation.activate)          │
│  4. Activate timezone (django.utils.timezone.activate)           │
│  5. Fall back to Django's standard resolution (cookies, headers) │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preference Resolution Service                                   │
├─────────────────────────────────────────────────────────────────┤
│  get_effective_preferences(user, organisation)                   │
│    ├─► Check Redis cache (i18n:user:{id}, i18n:org:{id})        │
│    ├─► If miss: Query B10 Setting table (USER, ORG, GLOBAL)     │
│    ├─► Apply precedence: user.language or org.language or global│
│    └─► Return EffectivePreferences with source attribution      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  B10 Settings System (Extended with USER scope)                  │
├─────────────────────────────────────────────────────────────────┤
│  Setting model:                                                  │
│    - scope_type: USER, ORGANISATION, PROJECT, GLOBAL            │
│    - user: ForeignKey(User) [NEW]                               │
│    - value: JSONField (stores {language, locale, timezone})     │
│    - Cached in Redis with signal-based invalidation             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Extend B10 with USER Scope ⚠️ **CRITICAL FIRST**

**Owner**: Settings app maintainer
**Location**: `src/settings/`

**Tasks**:
1. Add `ScopeType.USER` enum value
2. Add `user = ForeignKey(User, ...)` to `Setting` model
3. Update unique constraint: `(key, scope_type, user, organisation, project)`
4. Extend `_resolve_scope_hierarchy()` in `api.py` to support user scope
5. Update permissions to allow users to manage their own settings
6. Create migration: `0005_add_user_scope.py`
7. Add composite indexes for performance

**Acceptance Criteria**:
- ✅ `Setting.objects.create(key="test", scope_type=ScopeType.USER, user=user)` succeeds
- ✅ B10's resolution API returns user-scoped settings when queried
- ✅ Existing tests pass (USER scope is backwards compatible)

**Files Modified**:
- `src/settings/models.py`
- `src/settings/api.py`
- `src/settings/permissions.py`
- `src/settings/migrations/0005_add_user_scope.py`

---

### Phase 2: Create i18n_preferences App

**Owner**: Feature developer
**Location**: `src/i18n_preferences/`

**Tasks**:
1. Create Django app: `python manage.py startapp i18n_preferences`
2. Register in `INSTALLED_APPS` after `settings`
3. Create app structure:
   ```
   src/i18n_preferences/
   ├── __init__.py
   ├── apps.py
   ├── models.py          # Empty (uses B10's Setting model)
   ├── services.py        # Preference resolution logic
   ├── middleware.py      # PreferenceLocaleMiddleware, PreferenceTimezoneMiddleware
   ├── serializers.py     # DRF serializers with validation
   ├── views.py           # API views
   ├── urls.py            # URL routing
   ├── permissions.py     # Org admin checks
   ├── helpers.py         # activate_user_locale(), activate_org_locale()
   ├── validators.py      # Language/locale/timezone validation
   ├── admin.py           # Django admin integration
   └── migrations/
       └── 0001_initial_global_default.py  # Data migration
   ```

**Acceptance Criteria**:
- ✅ App loads without errors
- ✅ Import `from i18n_preferences import services` succeeds

---

### Phase 3: Implement Preference Resolution

**Owner**: Feature developer
**Location**: `src/i18n_preferences/services.py`

**Core Functions**:

```python
def get_effective_preferences(user, organisation):
    """
    Resolve effective preferences following precedence: user > org > global.

    Returns EffectivePreferences dataclass with source attribution.
    Uses B10's caching layer (Redis) for performance.
    """
    pass

def get_user_preferences(user):
    """Fetch user's stored preferences from B10 (or None if not set)."""
    pass

def get_organisation_preferences(organisation):
    """Fetch organisation's default preferences from B10 (or None if not set)."""
    pass

def update_user_preferences(user, language=None, locale=None, timezone=None):
    """Update user preferences in B10, invalidate cache."""
    pass

def update_organisation_preferences(organisation, language=None, locale=None, timezone=None):
    """Update org defaults in B10, invalidate cache (admin only)."""
    pass
```

**Testing**:
- Unit tests: 15 test cases covering all precedence scenarios
- Cache tests: Warm/cold cache, Redis unavailable

**Acceptance Criteria**:
- ✅ User with all preferences set: returns user values
- ✅ User with partial preferences: falls back to org/global per field
- ✅ User with no preferences: returns org/global values
- ✅ Cache hit: < 10ms resolution time
- ✅ Cache miss: < 50ms resolution time

---

### Phase 4: Implement Middleware

**Owner**: Feature developer
**Location**: `src/i18n_preferences/middleware.py`

**Classes**:

```python
from django.middleware.locale import LocaleMiddleware
from django.middleware.timezone import TimezoneMiddleware

class PreferenceLocaleMiddleware(LocaleMiddleware):
    """Extends Django's LocaleMiddleware with user/org preference resolution."""

    def process_request(self, request):
        if request.user.is_authenticated:
            prefs = get_effective_preferences(request.user, request.user.organisation)
            request.LANGUAGE_CODE = prefs.language
        return super().process_request(request)

class PreferenceTimezoneMiddleware(TimezoneMiddleware):
    """Extends Django's TimezoneMiddleware with user/org preference resolution."""

    def process_request(self, request):
        if request.user.is_authenticated:
            prefs = get_effective_preferences(request.user, request.user.organisation)
            timezone.activate(pytz.timezone(prefs.timezone))
        return super().process_request(request)
```

**Configuration** (`settings.py`):
```python
MIDDLEWARE = [
    # ... other middleware ...
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'i18n_preferences.middleware.PreferenceLocaleMiddleware',  # After auth
    'i18n_preferences.middleware.PreferenceTimezoneMiddleware', # After auth
    # ... other middleware ...
]
```

**Testing**:
- Integration tests: 10 test cases covering authenticated/anonymous, cache behavior

**Acceptance Criteria**:
- ✅ Authenticated user with preferences: locale activated automatically
- ✅ Anonymous user: falls back to Django's standard resolution
- ✅ Middleware ordering correct (after `AuthenticationMiddleware`)

---

### Phase 5: Implement API Endpoints

**Owner**: Feature developer
**Location**: `src/i18n_preferences/views.py`, `serializers.py`, `urls.py`

**Endpoints** (see `contracts/api-preferences.yaml` for full spec):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/preferences/me/` | GET | Get user's stored preferences |
| `/api/v1/preferences/me/` | PATCH | Update user's preferences |
| `/api/v1/preferences/me/` | DELETE | Reset to defaults |
| `/api/v1/preferences/effective/` | GET | Get resolved preferences with sources |
| `/api/v1/organisations/{id}/preferences/` | GET | Get org defaults (member only) |
| `/api/v1/organisations/{id}/preferences/` | PATCH | Update org defaults (admin only) |
| `/api/v1/organisations/{id}/preferences/` | DELETE | Reset org to global (admin only) |

**Serializers**:
```python
class PreferenceSerializer(serializers.Serializer):
    language = serializers.CharField(max_length=10, required=False, allow_null=True)
    locale = serializers.CharField(max_length=20, required=False, allow_null=True)
    timezone = serializers.CharField(max_length=63, required=False, allow_null=True)

    def validate_language(self, value):
        if value and value not in dict(settings.LANGUAGES):
            raise serializers.ValidationError(f"Unsupported language: {value}")
        return value

    # ... similar validators for locale and timezone
```

**Testing**:
- API tests: 12 test cases covering CRUD, validation errors, permissions

**Acceptance Criteria**:
- ✅ User can set preferences via PATCH, see them via GET
- ✅ Invalid language/timezone returns HTTP 400 with clear error
- ✅ Non-admin cannot update org defaults (HTTP 403)
- ✅ Effective preference endpoint returns source attribution

---

### Phase 6: Implement Explicit Activation Helpers

**Owner**: Feature developer
**Location**: `src/i18n_preferences/helpers.py`

**Functions**:

```python
from contextlib import contextmanager

def activate_user_locale(user_id):
    """
    Activate locale for a specific user (for API requests, background jobs).

    Usage:
        activate_user_locale(user.id)
        # All subsequent translation.gettext(), timezone.now() use user's preferences
    """
    pass

def activate_org_locale(org_id):
    """Activate locale for organisation defaults (background jobs processing org data)."""
    pass

@contextmanager
def temporary_user_locale(user_id):
    """
    Context manager for temporary locale activation.

    Usage:
        with temporary_user_locale(user.id):
            send_email(user, subject=_("Welcome"))  # Uses user's language
    """
    pass
```

**Testing**:
- Unit tests: 8 test cases covering activation, context managers, background job scenarios

**Acceptance Criteria**:
- ✅ API endpoint calls `activate_user_locale()` and renders correct timezone
- ✅ Celery task activates locale without request context
- ✅ Context manager restores previous locale after exit

---

### Phase 7: Create Migration Command

**Owner**: Feature developer
**Location**: `src/i18n_preferences/management/commands/migrate_user_i18n_preferences.py`

**Purpose**: Migrate existing User model fields (language, timezone) to B10 settings

**Command**:
```bash
python manage.py migrate_user_i18n_preferences [--dry-run]
```

**Algorithm**:
1. Query all Users with `language` or `timezone` fields set
2. For each user, create B10 Setting record with `scope_type=USER`
3. Handle conflicts (skip if B10 setting already exists)
4. Report progress (e.g., "Migrated 1234/5000 users")

**Testing**:
- 5 test cases: migration success, idempotency, dry-run, missing data

**Acceptance Criteria**:
- ✅ Command migrates 1000 users in < 30 seconds
- ✅ Dry-run mode shows what would be migrated without changes
- ✅ Re-running command is safe (idempotent)

---

### Phase 8: Documentation

**Owner**: Feature developer
**Location**: `docs/`

**Deliverables**:

1. **User Guide** (`docs/i18n-preferences.md`):
   - How to set personal preferences (UI + API)
   - Understanding precedence (user > org > global)
   - Troubleshooting (why isn't my language applied?)

2. **Developer Integration Guide** (`docs/i18n-integration.md`):
   - API usage examples (curl, Python requests)
   - Background job activation pattern
   - Extending preference types (FR-027)
   - Performance considerations

3. **ADR** (`docs/adr/NNN-i18n-preferences-in-b10.md`):
   - Title: "Why store i18n preferences in B10 Settings System"
   - Decision: Use B10 with USER scope vs separate UserPreference model
   - Rationale: Caching, validation, signal infrastructure
   - Consequences: B10 schema change required, consistency across scopes

4. **App README** (`src/i18n_preferences/README.md`):
   - Quick overview of feature
   - Installation instructions (INSTALLED_APPS, MIDDLEWARE)
   - Link to full docs

**Acceptance Criteria**:
- ✅ Documentation reviewed by 2+ team members
- ✅ All code examples tested and working
- ✅ ADR merged before feature completion

---

## Testing Checklist

### Unit Tests (25 cases)

- [ ] Preference resolution: user only, org only, global only
- [ ] Partial preferences: user language + org timezone
- [ ] Invalid data handling: missing user, deleted org
- [ ] Validators: valid/invalid language, locale, timezone codes
- [ ] Serializers: valid payloads, HTTP 400 errors

### Integration Tests (20 cases)

- [ ] Middleware: authenticated user with preferences
- [ ] Middleware: anonymous user fallback
- [ ] Middleware: cache warm/cold scenarios
- [ ] API: CRUD operations for user preferences
- [ ] API: CRUD operations for org defaults (admin only)
- [ ] API: Effective preference resolution
- [ ] API: Permission checks (non-admin cannot update org)
- [ ] Cache invalidation: update triggers B10 signal

### Migration Tests (5 cases)

- [ ] Management command: successful migration
- [ ] Management command: dry-run mode
- [ ] Management command: idempotency
- [ ] Management command: handle missing data
- [ ] Data migration: global default populated

### Coverage Targets

- Preference resolution module: **95%**
- Overall i18n_preferences app: **90%**

---

## Performance Benchmarks

### Expected Performance

| Scenario | Target (p95) | Measurement |
|----------|--------------|-------------|
| Warm cache (Redis hit) | < 10ms | `i18n_preference_resolution_duration_ms` |
| Cold cache (DB query) | < 50ms | Same metric |
| Redis unavailable | < 50ms | Same metric + `i18n_cache_degradation_events` |
| 10k concurrent users | < 200ms total request latency | Load test with locust |

### Monitoring

**Metrics** (via django-prometheus):
- `i18n_preference_cache_hit_rate{scope="user"}`
- `i18n_preference_cache_hit_rate{scope="organisation"}`
- `i18n_preference_resolution_duration_ms` (histogram)
- `i18n_cache_degradation_events` (counter)

**Alerts**:
- Cache hit rate < 90% → investigate cache size or TTL
- Degradation events > 10/min → Redis health check

---

## Deployment Steps

### Pre-Deployment

1. ✅ Merge B10 USER scope changes to main
2. ✅ Run B10 migration on staging: `python manage.py migrate settings`
3. ✅ Verify B10 tests pass with USER scope
4. ✅ Load test preference resolution on staging (10k users)

### Deployment

1. Deploy B12 code to production
2. Run migrations: `python manage.py migrate i18n_preferences`
3. Verify global default created: Check `Setting.objects.filter(key="i18n.preferences", scope_type="GLOBAL")`
4. Update `settings.py` MIDDLEWARE configuration (add PreferenceLocaleMiddleware, PreferenceTimezoneMiddleware)
5. Restart application servers
6. Monitor metrics: Cache hit rate, resolution duration

### Post-Deployment

1. Smoke test: Set user preference via API, verify applied in web UI
2. Run migration command if needed: `python manage.py migrate_user_i18n_preferences`
3. Monitor error logs for validation errors (invalid codes)
4. Update user-facing docs (help center, onboarding)

### Rollback Plan

If issues arise:
1. Remove middleware from `settings.py` (disable auto-activation)
2. Preferences still accessible via API (no data loss)
3. Revert to previous deployment
4. Investigate issue in staging

---

## FAQ

**Q: What happens if a user's preference becomes invalid after a Django upgrade (e.g., time zone removed)?**
A: The system logs a warning and falls back to the next level (org or global). No HTTP 500. Update docs to recommend periodic audits via management command.

**Q: Can users set preferences before authenticating (anonymous sessions)?**
A: Not in MVP. Defer to future feature. Anonymous users get global defaults.

**Q: How do downstream products extend preference types (e.g., add "first day of week")?**
A: See FR-027 and `docs/i18n-integration.md`. Use same B10 pattern with different key (e.g., `i18n.advanced_preferences`).

**Q: Does this support multi-org users (one user, multiple orgs)?**
A: Not in MVP. Assumes user belongs to one org (per B06 design). Multi-org is out of scope.

**Q: What if Redis is down for extended period?**
A: System remains functional with DB queries (< 50ms). Monitor `i18n_cache_degradation_events` and alert ops team.

---

## Success Criteria Review

| Criterion | Target | Implementation |
|-----------|--------|----------------|
| SC-001: User sets preference | < 30s | ✅ API + UI form (Phase 5) |
| SC-002: Admin configures org | < 1 min | ✅ Admin interface + API (Phase 5) |
| SC-003: Resolution performance | < 10ms warm, < 50ms cold | ✅ B10 cache + graceful degradation (Phase 3) |
| SC-004: Scale to 10k users | < 200ms p95 | ✅ Load test in staging |
| SC-005: Debug info in logs | 100% | ✅ Source attribution in effective preferences |
| SC-006: Zero data loss | Atomic updates | ✅ B10 signals + cache invalidation (Phase 3) |
| SC-007: Single API call | `/preferences/effective/` | ✅ One endpoint (Phase 5) |
| SC-008: Correct timezone | 100% | ✅ Explicit activation helpers (Phase 6) |

---

**Quickstart Complete**: Ready for implementation! See `plan.md` for detailed work packages.
