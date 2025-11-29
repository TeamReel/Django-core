---
lane: "for_review"
agent: "copilot"
shell_pid: "17932"
---
# Work Package 02: Core Preference Resolution

**Status**: ✅ For Review
**Priority**: P0 (Critical)
**Owner**: Feature developer
**Dependencies**: WP01 (requires USER scope in B10)
**Location**: `src/i18n_preferences/`

---

## Metadata

```yaml
work_package_id: WP02
feature: 012-user-organisation-i18n
subtasks: [T009, T010, T011, T012, T013, T014, T015]
lane: planned
estimated_effort: 5-7 days
risk_level: medium
parallel_safe: false
blocking_for: [WP03, WP04, WP05, WP06]
```

## History

- **2025-11-29**: Work package created from planning phase

---

## Objective

Create the `i18n_preferences` Django app with preference resolution service that implements precedence logic (user > org > global) and integrates with B10's caching layer. This is the core business logic that all other components depend on.

---

## Context

### Architecture

```
PreferenceResolutionService
  ├─► get_effective_preferences(user, org) → EffectivePreferences
  ├─► Queries B10 Setting table (USER, ORG, GLOBAL scopes)
  ├─► Applies independent fallback per field (language, locale, timezone)
  ├─► Leverages B10's Redis cache (keys: i18n:user:{id}, i18n:org:{id})
  └─► Returns with source attribution (for debugging)
```

### Precedence Rules

Independent fallback per preference field:
- **Language**: user.language OR org.language OR global.language
- **Locale**: user.locale OR org.locale OR global.locale
- **Timezone**: user.timezone OR org.timezone OR global.timezone

Example valid combinations:
- User sets language only → use user.language + org.locale + org.timezone
- User sets language + timezone → use user.language + org.locale + user.timezone

---

## Subtask Breakdown

### T009: Create Django App Scaffolding

**Commands**:
```bash
cd src/
python manage.py startapp i18n_preferences
```

**File Structure**:
```
src/i18n_preferences/
├── __init__.py
├── apps.py
├── models.py          # Empty (uses B10's Setting model)
├── services.py        # PreferenceResolutionService
├── middleware.py      # (WP03)
├── serializers.py     # (WP04)
├── views.py           # (WP04)
├── urls.py            # (WP04)
├── permissions.py     # (WP04)
├── helpers.py         # (WP05)
├── validators.py      # This WP
└── admin.py           # (WP06)
```

**Register in `config/settings/base.py`**:
```python
INSTALLED_APPS = [
    # ...
    "settings",  # B10
    "i18n_preferences",  # NEW: B12
    # ...
]
```

**Acceptance**:
- `python manage.py check` passes
- Import `from i18n_preferences import services` succeeds

---

### T010: Implement `PreferenceResolutionService`

**File**: `src/i18n_preferences/services.py`

**Implementation**:
```python
from dataclasses import dataclass
from typing import Literal, Optional
from django.conf import settings
from accounts.models import User
from organisations.models import Organisation
from settings.models import Setting, ScopeType


@dataclass
class EffectivePreferences:
    """Resolved preferences with source attribution."""
    language: str
    locale: str
    timezone: str
    language_source: Literal["user", "organisation", "global"]
    locale_source: Literal["user", "organisation", "global"]
    timezone_source: Literal["user", "organisation", "global"]


class PreferenceResolutionService:
    """Service for resolving user/org i18n preferences with precedence."""

    KEY = "i18n.preferences"

    @classmethod
    def get_effective_preferences(
        cls,
        user: Optional[User] = None,
        organisation: Optional[Organisation] = None,
    ) -> EffectivePreferences:
        """
        Resolve effective i18n preferences with precedence: user > org > global.

        Independent fallback per field: user.language may combine with org.timezone.

        Args:
            user: User instance (optional for anonymous users)
            organisation: Organisation instance (optional)

        Returns:
            EffectivePreferences with resolved values + source attribution
        """
        # Fetch preferences from B10 (will use cache if available)
        user_prefs = cls._get_user_preferences(user) if user else {}
        org_prefs = cls._get_org_preferences(organisation) if organisation else {}
        global_prefs = cls._get_global_preferences()

        # Independent fallback per field
        language, lang_source = cls._resolve_field(
            "language", user_prefs, org_prefs, global_prefs
        )
        locale, locale_source = cls._resolve_field(
            "locale", user_prefs, org_prefs, global_prefs
        )
        timezone, tz_source = cls._resolve_field(
            "timezone", user_prefs, org_prefs, global_prefs
        )

        return EffectivePreferences(
            language=language,
            locale=locale,
            timezone=timezone,
            language_source=lang_source,
            locale_source=locale_source,
            timezone_source=tz_source,
        )

    @classmethod
    def _get_user_preferences(cls, user: User) -> dict:
        """Fetch user-scoped preferences from B10."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.USER,
                user=user,
            )
            return setting.value  # JSON dict
        except Setting.DoesNotExist:
            return {}

    @classmethod
    def _get_org_preferences(cls, organisation: Organisation) -> dict:
        """Fetch org-scoped preferences from B10."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.ORGANISATION,
                organisation=organisation,
            )
            return setting.value
        except Setting.DoesNotExist:
            return {}

    @classmethod
    def _get_global_preferences(cls) -> dict:
        """Fetch global preferences from B10 or Django settings."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.GLOBAL,
            )
            return setting.value
        except Setting.DoesNotExist:
            # Fall back to Django settings
            return {
                "language": settings.LANGUAGE_CODE,
                "locale": settings.LANGUAGE_CODE,  # or settings.LOCALE if exists
                "timezone": settings.TIME_ZONE,
            }

    @classmethod
    def _resolve_field(cls, field: str, user: dict, org: dict, global_: dict) -> tuple[str, str]:
        """Resolve single field with precedence: user > org > global."""
        if field in user and user[field]:
            return user[field], "user"
        if field in org and org[field]:
            return org[field], "organisation"
        return global_[field], "global"
```

**Acceptance**:
- Method returns `EffectivePreferences` dataclass
- Source attribution is correct (e.g., `language_source="user"` when user has language set)
- Independent fallback works (user.language + org.timezone is valid)

---

### T011: Implement Independent Fallback Logic

**Already covered in T010** - the `_resolve_field()` method implements independent fallback per field.

**Test Scenario**:
```python
# User sets language only, org sets timezone only
user_prefs = {"language": "nl"}
org_prefs = {"timezone": "Europe/Amsterdam"}
global_prefs = {"language": "en", "locale": "en-US", "timezone": "UTC"}

# Result should mix sources
result = get_effective_preferences(user, org)
assert result.language == "nl" and result.language_source == "user"
assert result.timezone == "Europe/Amsterdam" and result.timezone_source == "organisation"
assert result.locale == "en-US" and result.locale_source == "global"
```

---

### T012: Add Validation Functions

**File**: `src/i18n_preferences/validators.py`

**Implementation**:
```python
import pytz
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import translation


def validate_language_code(language: str) -> None:
    """Validate language code against settings.LANGUAGES."""
    valid_languages = [code for code, _ in settings.LANGUAGES]
    if language not in valid_languages:
        raise ValidationError(
            f"Invalid language code '{language}'. "
            f"Must be one of: {', '.join(valid_languages)}"
        )


def validate_locale_code(locale: str) -> None:
    """Validate locale code by attempting activation."""
    try:
        # Django's activate() will raise if locale is invalid
        translation.activate(locale)
    except Exception as e:
        raise ValidationError(
            f"Invalid locale code '{locale}'. "
            f"Must be a valid Django locale."
        ) from e


def validate_timezone(timezone: str) -> None:
    """Validate timezone against pytz.all_timezones."""
    if timezone not in pytz.all_timezones:
        raise ValidationError(
            f"Invalid timezone '{timezone}'. "
            f"Must be a valid IANA timezone name."
        )
```

**Acceptance**:
- `validate_language_code("nl")` passes (if nl in settings.LANGUAGES)
- `validate_language_code("invalid")` raises ValidationError
- `validate_timezone("Europe/Amsterdam")` passes
- `validate_timezone("Invalid/Zone")` raises ValidationError

---

### T013: Create `EffectivePreferences` Dataclass

**Already covered in T010** - dataclass is defined in `services.py`.

**Attributes**:
- `language: str` - ISO 639-1 code
- `locale: str` - BCP 47 locale code
- `timezone: str` - IANA timezone name
- `language_source: Literal["user", "organisation", "global"]`
- `locale_source: Literal["user", "organisation", "global"]`
- `timezone_source: Literal["user", "organisation", "global"]`

---

### T014: Integrate with B10 Cache Layer

**Context**: B10 already caches `Setting` model queries via Redis. No custom cache logic needed - B10 handles it automatically.

**Cache Keys** (B10's responsibility):
- `settings:i18n.preferences:USER:{user_id}`
- `settings:i18n.preferences:ORGANISATION:{org_id}`
- `settings:i18n.preferences:GLOBAL`

**Cache Invalidation**: B10's signals automatically invalidate cache when settings are updated.

**This Task**: Verify B10's caching works for user-scoped settings.

**Implementation**:
- No code changes needed (B10 handles caching)
- Add integration test to verify cache hit/miss behavior

**Test**:
```python
def test_preference_cache_hit():
    """Verify B10 cache is used for repeated queries."""
    user = User.objects.create(username="testuser")
    Setting.objects.create(
        key="i18n.preferences",
        value={"language": "nl"},
        scope_type=ScopeType.USER,
        user=user,
    )

    # First call: cache miss
    with assertNumQueries(1):
        result1 = get_effective_preferences(user)

    # Second call: cache hit (should not query DB)
    with assertNumQueries(0):
        result2 = get_effective_preferences(user)

    assert result1 == result2
```

---

### T015: Write Resolution Unit Tests

**File**: `tests/i18n_preferences/test_services.py`

**Test Cases** (15 minimum):

1. **test_user_full_preferences**: User has all preferences set, all returned from user scope
2. **test_org_full_preferences**: User has no preferences, org has all, all returned from org scope
3. **test_global_fallback**: No user/org preferences, global defaults returned
4. **test_partial_user_language_only**: User sets language only, org provides locale/timezone
5. **test_partial_user_timezone_only**: User sets timezone only, org provides language/locale
6. **test_mixed_sources**: User language + org locale + global timezone
7. **test_user_overrides_org**: User and org both have language, user wins
8. **test_user_overrides_global**: User and global both have timezone, user wins
9. **test_org_overrides_global**: Org and global both have locale, org wins
10. **test_anonymous_user**: user=None, should use org/global only
11. **test_no_organisation**: user has preferences but org=None, should use user + global
12. **test_invalid_stored_preference**: User has invalid timezone in storage, log warning and fall back
13. **test_empty_preference_values**: User has `{"language": ""}`, treat as not set, fall back
14. **test_source_attribution**: Verify `*_source` fields are correct for each scenario
15. **test_cache_behavior**: Verify B10 cache is used (covered in T014)

**Coverage Target**: 95% coverage for `services.py`

---

## Implementation Sequence

**Day 1: Scaffolding**
1. T009 (create app, register in INSTALLED_APPS)

**Day 2-3: Core Service**
2. T013 (define EffectivePreferences dataclass)
3. T010 (implement PreferenceResolutionService.get_effective_preferences())
4. T011 (verify independent fallback works)

**Day 3-4: Validation**
5. T012 (add validators for language/locale/timezone)

**Day 4-5: Caching & Testing**
6. T014 (verify B10 cache integration)
7. T015 (write comprehensive unit tests)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache stampede on cold cache | Medium | B10's cache handles this; verify no N+1 queries |
| Invalid stored preferences | Medium | Add validation in resolution service, log warnings |
| Performance regression | High | Benchmark: < 10ms warm, < 50ms cold; add integration tests |
| Incorrect precedence logic | High | Comprehensive unit tests (15 scenarios) |

---

## Dependencies

**Upstream** (required before starting):
- WP01 complete (USER scope in B10)

**Downstream** (blocked until this completes):
- WP03: Middleware (needs `get_effective_preferences()`)
- WP04: API (needs `get_effective_preferences()`)
- WP05: Helpers (needs `get_effective_preferences()`)
- WP06: Migration (needs preference resolution)

---

## Definition of Done

- [ ] `i18n_preferences` app created and registered
- [ ] `EffectivePreferences` dataclass defined
- [ ] `PreferenceResolutionService.get_effective_preferences()` implemented
- [ ] Independent fallback logic works (15 test cases pass)
- [ ] Validators for language/locale/timezone implemented
- [ ] B10 cache integration verified (cache hit test passes)
- [ ] 15+ unit tests pass (95% coverage for services.py)
- [ ] Performance benchmarks met (< 10ms warm cache)
- [ ] Code review approved

---

## Reviewer Guidance

**Critical Checks**:
1. **Precedence Logic**: Verify user > org > global is correctly implemented
2. **Independent Fallback**: Confirm fields can fallback independently
3. **Source Attribution**: Check `*_source` fields are accurate for debugging
4. **Edge Cases**: Anonymous users, missing orgs, invalid stored values

**Test Scenarios to Verify**:
- User with all prefs, org with all prefs → user wins
- User with language only, org with timezone only → mixed sources
- Anonymous user → no user scope queries
- Invalid stored timezone → logged warning, fallback to next level

## Activity Log

- 2025-11-29T10:26:08Z – copilot – shell_pid=17932 – lane=doing – Started implementation of preference resolution service
- 2025-11-29T11:45:00Z – copilot – shell_pid=17932 – lane=for_review – Implementation complete: 7/7 subtasks, 21/21 tests passing (commit 0072be7)
