---
lane: "doing"
agent: "copilot"
shell_pid: "17932"
---
# Work Package 03: Middleware Integration

**Status**: 📋 Planned
**Priority**: P1 (High)
**Owner**: Feature developer
**Dependencies**: WP02 (requires PreferenceResolutionService)
**Location**: `src/i18n_preferences/middleware.py`

---

## Metadata

```yaml
work_package_id: WP03
feature: 012-user-organisation-i18n
subtasks: [T016, T017, T018, T019, T020, T021]
lane: planned
estimated_effort: 3-4 days
risk_level: medium
parallel_safe: true
blocks: []
```

## Objective

Create custom middleware classes that extend Django's `LocaleMiddleware` and `TimezoneMiddleware` to automatically activate user/org preferences for authenticated web requests while preserving Django's standard fallback chain.

---

## Context

### Architecture

```
Django Request
  ↓
AuthenticationMiddleware (Django)
  ↓
PreferenceLocaleMiddleware (B12) ← extends LocaleMiddleware
  ├─► Check if user.is_authenticated
  ├─► Resolve effective preferences via PreferenceResolutionService
  ├─► Activate language: translation.activate(language)
  ├─► Call super().process_request() for Django fallback
  └─► Log activation at DEBUG level
  ↓
PreferenceTimezoneMiddleware (B12) ← extends TimezoneMiddleware
  ├─► Activate timezone: timezone.activate(tz)
  └─► Call super().process_request()
  ↓
View Processing
```

### Middleware Ordering

```python
# config/settings/base.py
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # ...
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # Must come first
    "i18n_preferences.middleware.PreferenceLocaleMiddleware",   # NEW: After auth
    "i18n_preferences.middleware.PreferenceTimezoneMiddleware", # NEW: After auth
    # ...
]
```

---

## Subtask Breakdown

### T016: Create `PreferenceLocaleMiddleware`

**File**: `src/i18n_preferences/middleware.py`

**Implementation**:
```python
import logging
from django.middleware.locale import LocaleMiddleware
from django.utils import translation
from .services import PreferenceResolutionService

logger = logging.getLogger(__name__)


class PreferenceLocaleMiddleware(LocaleMiddleware):
    """
    Extends Django's LocaleMiddleware to activate user/org language preferences.

    Precedence: user preference > org default > Django's standard resolution
    """

    def process_request(self, request):
        """Inject user/org preference resolution before Django's fallback."""
        if request.user.is_authenticated:
            try:
                # Resolve effective preferences
                prefs = PreferenceResolutionService.get_effective_preferences(
                    user=request.user,
                    organisation=getattr(request.user, 'organisation', None)
                )

                # Activate language
                translation.activate(prefs.language)
                request.LANGUAGE_CODE = prefs.language

                # Log activation for debugging
                logger.debug(
                    f"Activated language '{prefs.language}' "
                    f"(source: {prefs.language_source}) for user {request.user.id}"
                )

            except Exception as e:
                logger.warning(
                    f"Failed to activate user preference for user {request.user.id}: {e}"
                )
                # Fall through to Django's standard resolution

        # Call parent implementation for fallback chain
        return super().process_request(request)
```

**Acceptance**:
- Authenticated users with preferences see language activated
- Anonymous users fall back to Django's standard resolution
- Exceptions don't break request processing

---

### T017: Create `PreferenceTimezoneMiddleware`

**File**: `src/i18n_preferences/middleware.py` (same file)

**Implementation**:
```python
from django.middleware.timezone import TimezoneMiddleware
from django.utils import timezone
import pytz


class PreferenceTimezoneMiddleware(TimezoneMiddleware):
    """
    Extends Django's TimezoneMiddleware to activate user/org timezone preferences.

    Precedence: user preference > org default > Django's standard resolution
    """

    def process_request(self, request):
        """Inject user/org preference resolution before Django's fallback."""
        if request.user.is_authenticated:
            try:
                # Resolve effective preferences
                prefs = PreferenceResolutionService.get_effective_preferences(
                    user=request.user,
                    organisation=getattr(request.user, 'organisation', None)
                )

                # Activate timezone
                tzinfo = pytz.timezone(prefs.timezone)
                timezone.activate(tzinfo)

                # Log activation for debugging
                logger.debug(
                    f"Activated timezone '{prefs.timezone}' "
                    f"(source: {prefs.timezone_source}) for user {request.user.id}"
                )

            except Exception as e:
                logger.warning(
                    f"Failed to activate timezone for user {request.user.id}: {e}"
                )
                # Fall through to Django's standard resolution

        # Call parent implementation for fallback chain
        return super().process_request(request)
```

---

### T018: Override `process_request()` with Preference Injection

**Already covered in T016/T017** - the key pattern is:
1. Check authentication
2. Resolve preferences
3. Activate language/timezone
4. Call `super().process_request()` for Django's fallback

---

### T019: Add Graceful Degradation for Anonymous Users

**Already covered in T016/T017** - the `if request.user.is_authenticated` guard ensures anonymous users skip preference resolution and use Django's standard chain.

**Edge Cases**:
- Anonymous user → skip user/org lookup, use Django fallback
- User without organisation → skip org lookup, use user + global
- Preference resolution failure → log warning, continue with Django fallback

---

### T020: Add DEBUG-Level Logging

**Already covered in T016/T017** - `logger.debug()` calls log activation events.

**Log Format**:
```
DEBUG: Activated language 'nl' (source: user) for user 12345
DEBUG: Activated timezone 'Europe/Amsterdam' (source: organisation) for user 12345
```

**Production Behavior**:
- DEBUG logging disabled in production (standard Django practice)
- WARNING logs for errors ensure visibility

---

### T021: Write Middleware Integration Tests

**File**: `tests/i18n_preferences/test_middleware.py`

**Test Cases** (10 minimum):

1. **test_authenticated_user_with_language**: User has language preference, activated in request
2. **test_authenticated_user_with_timezone**: User has timezone preference, activated in request
3. **test_authenticated_user_partial_prefs**: User has language only, timezone falls back
4. **test_anonymous_user_uses_django_fallback**: Anonymous request uses Accept-Language header
5. **test_accept_language_fallback**: Authenticated user without prefs uses Accept-Language
6. **test_locale_cookie_fallback**: Authenticated user without prefs uses locale cookie
7. **test_middleware_ordering**: Verify middleware runs after AuthenticationMiddleware
8. **test_preference_resolution_error**: Resolution service raises error, request continues
9. **test_language_activated_in_view**: View can access `translation.get_language()` = user's preference
10. **test_timezone_activated_in_view**: View can access `timezone.get_current_timezone()` = user's timezone

**Test Framework**: Django `TestCase` with `Client`

**Example**:
```python
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from i18n_preferences.middleware import PreferenceLocaleMiddleware

User = get_user_model()


class PreferenceLocaleMiddlewareTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = PreferenceLocaleMiddleware(get_response=lambda r: r)
        self.user = User.objects.create(username="testuser")

    def test_authenticated_user_with_language(self):
        """User's language preference is activated in request."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl"},
            scope_type=ScopeType.USER,
            user=self.user,
        )

        # Simulate authenticated request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify language activated
        from django.utils import translation
        assert translation.get_language() == "nl"
        assert request.LANGUAGE_CODE == "nl"
```

---

## Implementation Sequence

**Day 1: Locale Middleware**
1. T016 (create PreferenceLocaleMiddleware)
2. T020 (add DEBUG logging)

**Day 2: Timezone Middleware**
3. T017 (create PreferenceTimezoneMiddleware)
4. T019 (verify graceful degradation)

**Day 3-4: Testing**
5. T021 (write 10 integration tests)
6. Test with Django test client (full request/response cycle)

---

## Configuration Required

**File**: `config/settings/base.py`

Add middleware after `AuthenticationMiddleware`:
```python
MIDDLEWARE = [
    # ...
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "i18n_preferences.middleware.PreferenceLocaleMiddleware",
    "i18n_preferences.middleware.PreferenceTimezoneMiddleware",
    # ...
]
```

**Logging** (optional, for development):
```python
LOGGING = {
    "loggers": {
        "i18n_preferences": {
            "level": "DEBUG",
            "handlers": ["console"],
        },
    },
}
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Middleware ordering breaks auth | High | Document required ordering, add test |
| Breaking Django's standard resolution | Medium | Call `super()`, preserve fallback chain |
| Performance overhead on every request | Medium | Leverage B10 cache (< 10ms target) |
| Exceptions breaking request processing | Medium | Catch exceptions, log warnings, continue |

---

## Definition of Done

- [ ] `PreferenceLocaleMiddleware` extends Django's `LocaleMiddleware`
- [ ] `PreferenceTimezoneMiddleware` extends Django's `TimezoneMiddleware`
- [ ] Authenticated users see preferences activated automatically
- [ ] Anonymous users fall back to Django's standard resolution
- [ ] DEBUG logging captures activation events
- [ ] 10+ integration tests pass
- [ ] Middleware registered in `MIDDLEWARE` setting
- [ ] Documentation updated (middleware ordering requirements)

---

## Reviewer Guidance

**Critical Checks**:
1. **Inheritance**: Verify middleware extends Django's built-in classes
2. **Fallback Chain**: Confirm `super().process_request()` is called
3. **Error Handling**: Check exceptions don't break request processing
4. **Performance**: Verify no N+1 queries per request

**Test Scenarios**:
- Authenticated user with preferences → activated
- Anonymous user → Django fallback works
- Preference resolution error → request continues
- View can access `translation.get_language()` = user's language

## Activity Log

- 2025-11-29T10:53:56Z – copilot – shell_pid=17932 – lane=doing – Started middleware implementation
