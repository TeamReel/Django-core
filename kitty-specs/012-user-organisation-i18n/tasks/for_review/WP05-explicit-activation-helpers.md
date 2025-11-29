---
lane: "for_review"
agent: "copilot"
shell_pid: "17932"
---
# Work Package 05: Explicit Activation Helpers

**Status**: 📋 Planned
**Priority**: P2 (Medium)
**Owner**: Feature developer
**Dependencies**: WP02 (requires PreferenceResolutionService)
**Location**: `src/i18n_preferences/helpers.py`

---

## Metadata

```yaml
work_package_id: WP05
feature: 012-user-organisation-i18n
subtasks: [T031, T032, T033, T034, T035]
lane: planned
estimated_effort: 2-3 days
risk_level: low
parallel_safe: true
blocks: []
```

## Objective

Provide utility functions and context managers for explicitly activating user/org locale in API requests and background jobs where middleware doesn't apply. Essential for correct locale handling in Celery tasks, management commands, and async operations.

---

## Context

### Use Cases

1. **Celery Background Jobs**: Email generation, report generation, scheduled tasks
2. **Management Commands**: Data exports, batch operations
3. **API Endpoints**: Custom views that need to format data for specific users
4. **Testing**: Test code that needs to simulate user locale context

### Pattern

```python
# In Celery task
@shared_task
def send_user_email(user_id):
    with user_locale_context(user_id):
        # All translation and datetime operations use user's locale
        message = _("Hello, your report is ready")
        timestamp = timezone.localtime(timezone.now())
        # ...
```

---

## Subtask Breakdown

### T031: Implement `activate_user_locale(user_id)`

**File**: `src/i18n_preferences/helpers.py`

**Implementation**:
```python
import logging
from django.contrib.auth import get_user_model
from django.utils import translation, timezone
import pytz
from .services import PreferenceResolutionService

logger = logging.getLogger(__name__)
User = get_user_model()


def activate_user_locale(user_id: int | str):
    """
    Explicitly activate a user's effective locale (language + timezone).

    Use in background jobs, API endpoints, or anywhere middleware doesn't apply.

    Args:
        user_id: User's primary key

    Raises:
        User.DoesNotExist: If user not found (caller should handle)
    """
    user = User.objects.get(pk=user_id)

    # Resolve effective preferences
    prefs = PreferenceResolutionService.get_effective_preferences(
        user=user,
        organisation=getattr(user, 'organisation', None)
    )

    # Activate language
    translation.activate(prefs.language)

    # Activate timezone
    tzinfo = pytz.timezone(prefs.timezone)
    timezone.activate(tzinfo)

    logger.debug(
        f"Activated user {user_id} locale: "
        f"language={prefs.language}, timezone={prefs.timezone}"
    )
```

**Acceptance**:
- After calling `activate_user_locale(user_id)`, `translation.get_language()` returns user's language
- `timezone.get_current_timezone()` returns user's timezone
- Function raises `User.DoesNotExist` if user not found (caller handles)

---

### T032: Implement `activate_org_locale(org_id)`

**File**: `src/i18n_preferences/helpers.py` (same file)

**Implementation**:
```python
from organisations.models import Organisation


def activate_org_locale(org_id: int | str):
    """
    Explicitly activate an organisation's default locale.

    Use when processing org-wide operations (reports, exports) without user context.

    Args:
        org_id: Organisation's primary key

    Raises:
        Organisation.DoesNotExist: If org not found (caller should handle)
    """
    org = Organisation.objects.get(pk=org_id)

    # Resolve org preferences (no user)
    prefs = PreferenceResolutionService.get_effective_preferences(
        user=None,
        organisation=org
    )

    # Activate language + timezone
    translation.activate(prefs.language)
    tzinfo = pytz.timezone(prefs.timezone)
    timezone.activate(tzinfo)

    logger.debug(
        f"Activated org {org_id} locale: "
        f"language={prefs.language}, timezone={prefs.timezone}"
    )
```

**Use Case**: Org-wide reports, exports where there's no specific user context

---

### T033: Create `user_locale_context()` Context Manager

**File**: `src/i18n_preferences/helpers.py` (same file)

**Implementation**:
```python
from contextlib import contextmanager


@contextmanager
def user_locale_context(user_id: int | str):
    """
    Context manager for temporarily activating a user's locale.

    Automatically restores previous locale on exit (important for shared workers).

    Usage:
        with user_locale_context(user_id):
            # Code here runs with user's locale
            message = _("Translated string")

    Args:
        user_id: User's primary key

    Yields:
        EffectivePreferences: The activated preferences
    """
    # Save current locale
    previous_language = translation.get_language()
    previous_timezone = timezone.get_current_timezone()

    try:
        # Activate user locale
        user = User.objects.get(pk=user_id)
        prefs = PreferenceResolutionService.get_effective_preferences(
            user=user,
            organisation=getattr(user, 'organisation', None)
        )

        translation.activate(prefs.language)
        tzinfo = pytz.timezone(prefs.timezone)
        timezone.activate(tzinfo)

        yield prefs  # Return prefs to caller

    finally:
        # Restore previous locale (critical for worker processes)
        translation.activate(previous_language)
        timezone.activate(previous_timezone)
```

**Acceptance**:
- Locale is activated inside `with` block
- Locale is restored after `with` block exits
- Restoration happens even if exception occurs inside block

**Why This Matters**: Worker processes (Celery) handle multiple tasks. Without restoration, task A's locale would leak into task B.

---

### T034: Add Error Handling for Missing Users/Orgs

**Implementation**: Add try/except to handle graceful fallback

```python
def activate_user_locale_safe(user_id: int | str):
    """
    Activate user locale with fallback to global if user not found.

    Use when you want safe activation (no exceptions).
    """
    try:
        activate_user_locale(user_id)
    except User.DoesNotExist:
        logger.warning(f"User {user_id} not found, using global defaults")
        # Fall back to global settings
        translation.activate(settings.LANGUAGE_CODE)
        timezone.activate(pytz.timezone(settings.TIME_ZONE))
```

**Acceptance**:
- Non-existent user → log warning, activate global defaults
- No exception raised (safe for batch operations)

---

### T035: Write Helper Unit Tests

**File**: `tests/i18n_preferences/test_helpers.py`

**Test Cases** (5 minimum):

1. **test_activate_user_locale**: Activates user's language and timezone
2. **test_activate_user_locale_missing_user**: Raises User.DoesNotExist
3. **test_activate_org_locale**: Activates org's defaults
4. **test_user_locale_context_manager**: Locale activated inside, restored after
5. **test_context_manager_restores_on_exception**: Locale restored even if exception occurs

**Example**:
```python
from django.test import TestCase
from django.utils import translation, timezone
from i18n_preferences.helpers import user_locale_context


class UserLocaleContextTest(TestCase):
    def test_context_manager_restores_on_exception(self):
        """Locale is restored even if exception occurs inside context."""
        user = User.objects.create(username="testuser")
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl", "timezone": "Europe/Amsterdam"},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Set initial locale
        translation.activate("en")
        timezone.activate(pytz.timezone("UTC"))

        # Use context manager with exception
        try:
            with user_locale_context(user.id):
                assert translation.get_language() == "nl"
                raise ValueError("Test exception")
        except ValueError:
            pass

        # Verify locale was restored
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "UTC"
```

---

## Implementation Sequence

**Day 1: Core Functions**
1. T031 (activate_user_locale)
2. T032 (activate_org_locale)

**Day 2: Context Manager**
3. T033 (user_locale_context)
4. T034 (error handling)

**Day 3: Testing**
5. T035 (write 5 unit tests)

---

## Usage Examples

### Celery Task
```python
@shared_task
def send_user_report(user_id):
    with user_locale_context(user_id):
        # Generate report in user's locale
        report_title = _("Monthly Report")
        generated_at = timezone.localtime(timezone.now())
        # ...
```

### Management Command
```python
class Command(BaseCommand):
    def handle(self, *args, **options):
        for user in User.objects.all():
            with user_locale_context(user.id):
                # Process each user with their locale
                send_email(user, _("Hello"))
```

### API Endpoint
```python
@api_view(["GET"])
def generate_user_pdf(request, user_id):
    with user_locale_context(user_id):
        # Generate PDF in target user's locale
        pdf = render_to_pdf(template, context)
    return FileResponse(pdf)
```

---

## Definition of Done

- [ ] `activate_user_locale(user_id)` implemented
- [ ] `activate_org_locale(org_id)` implemented
- [ ] `user_locale_context()` context manager implemented
- [ ] Error handling for missing users/orgs
- [ ] 5+ unit tests pass
- [ ] Documentation includes usage examples
- [ ] Developer guide (`docs/i18n-integration.md`) references helpers

---

## Reviewer Guidance

**Critical Checks**:
1. **Locale Restoration**: Context manager restores previous locale in `finally` block
2. **Exception Safety**: Restoration happens even if exception occurs
3. **Thread Safety**: Uses Django's thread-local storage (built-in)
4. **Error Handling**: Missing users handled gracefully

**Test Scenarios**:
- Context manager restores locale after normal exit
- Context manager restores locale after exception
- Nested context managers work correctly
- Background job using helper renders correct locale

## Activity Log

- 2025-11-29T11:45:00Z – copilot – shell_pid=17932 – lane=doing – Started implementation: Explicit activation helpers for background jobs/API
- 2025-11-29T11:50:15Z – copilot – shell_pid=17932 – lane=for_review – Ready for review: 13/13 tests passing, all helpers implemented
