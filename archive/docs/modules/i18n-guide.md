# Developer Guide: i18n Preferences Integration

**Feature**: B12 - User & Organisation i18n Preferences
**Audience**: Backend developers, DevOps engineers
**Last Updated**: 2025-11-29

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Using the API](#using-the-api)
3. [Background Jobs](#background-jobs)
4. [Management Commands](#management-commands)
5. [Testing](#testing)
6. [Performance Considerations](#performance-considerations)
7. [Extending Preferences](#extending-preferences)

---

## Architecture Overview

The i18n preferences system consists of four main components:

```
┌─────────────┐
│ Django App  │
│ (i18n_preferences) │
└──────┬──────┘
       │
       ├── Services (PreferenceResolutionService)
       │   └── Resolves user > org > global precedence
       │
       ├── Middleware (I18nPreferenceMiddleware)
       │   └── Activates locale automatically per request
       │
       ├── API (DRF ViewSets)
       │   └── CRUD operations for preferences
       │
       └── Helpers (user_locale_context, etc.)
           └── Explicit activation for background jobs

┌─────────────┐
│   Storage   │
│  (B10 Settings) │
└─────────────┘
   └── USER scope for per-user preferences
   └── ORGANISATION scope for org defaults
   └── GLOBAL scope for platform defaults
```

### Key Design Decisions

1. **B10 Integration**: Preferences stored using Django-core's B10 (Settings & Feature Flags) system
2. **Middleware-Based**: Automatic activation via Django middleware for web requests
3. **Explicit Helpers**: Manual activation functions for background jobs/API endpoints
4. **Independent Fallback**: Each field (language, locale, timezone) falls back independently
5. **Source Attribution**: Resolution service tracks where each preference came from

---

## Using the API

### Endpoints

```python
# Base URL
BASE_URL = "/api/v1/preferences/"

# User preferences
GET    /me/                  # Get current user's stored preferences
PATCH  /me/                  # Update current user's preferences (partial)
DELETE /me/                  # Delete all user preferences (reset to defaults)

# Effective preferences (after resolution)
GET    /effective/           # Get effective preferences with source attribution

# Organisation preferences (admin only)
GET    /organisations/{id}/preferences/  # Get org defaults
PUT    /organisations/{id}/preferences/  # Set org defaults
DELETE /organisations/{id}/preferences/  # Delete org defaults
```

### Example: Get User Preferences

```python
from django.test import Client

client = Client()
client.force_login(user)

response = client.get("/api/v1/preferences/me/")
assert response.status_code == 200

data = response.json()
# {'language': 'nl', 'locale': 'nl-NL', 'timezone': 'Europe/Amsterdam'}
```

### Example: Update Preferences

```python
response = client.patch(
    "/api/v1/preferences/me/",
    data={"timezone": "America/New_York"},
    content_type="application/json",
)
assert response.status_code == 200
```

### Example: Get Effective Preferences

```python
response = client.get("/api/v1/preferences/effective/")
data = response.json()

# Response includes source attribution
# {
#   'language': 'nl',
#   'language_source': 'user',
#   'locale': 'nl-NL',
#   'locale_source': 'user',
#   'timezone': 'Europe/Amsterdam',
#   'timezone_source': 'user'
# }
```

### Serializers

```python
from i18n_preferences.serializers import PreferenceSerializer

# Validation
serializer = PreferenceSerializer(data={
    'language': 'nl',
    'locale': 'nl-NL',
    'timezone': 'Europe/Amsterdam',
})

if serializer.is_valid():
    # All fields validated (language code, locale format, timezone string)
    validated_data = serializer.validated_data
else:
    # Returns detailed validation errors
    errors = serializer.errors
```

---

## Background Jobs

Background jobs (Celery tasks, management commands) don't have access to Django's middleware. Use explicit activation helpers to ensure correct locale.

### Using Context Managers (Recommended)

```python
from celery import shared_task
from i18n_preferences.helpers import user_locale_context
from django.utils.translation import gettext as _
from django.utils import timezone

@shared_task
def send_user_email(user_id):
    """Send email in user's preferred language and timezone."""
    with user_locale_context(user_id):
        # Inside context: user's locale is active
        subject = _("Your Monthly Report")
        report_date = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")

        send_mail(
            subject=subject,
            message=f"Report generated at {report_date}",
            recipient_list=[user.email],
        )
    # Outside context: locale is restored to previous state
```

**Why Context Managers?**
- Automatic restoration prevents locale leakage between tasks
- Exception-safe: Locale restored even if exception occurs
- Clean syntax: Clear scope of locale activation

### Using Direct Activation

```python
from i18n_preferences.helpers import activate_user_locale

@shared_task
def generate_user_report(user_id):
    """Generate report in user's locale (manual activation)."""
    activate_user_locale(user_id)

    # Locale is now active for this task
    report_title = _("Monthly Report")

    # Generate report...
```

**⚠️ Warning**: Direct activation doesn't restore previous locale. Use context managers in shared worker pools.

### Safe Activation (Fallback to Global)

```python
from i18n_preferences.helpers import activate_user_locale_safe

@shared_task
def batch_process_users(user_ids):
    """Process multiple users safely (no exceptions on missing users)."""
    for user_id in user_ids:
        # Returns False if user not found, falls back to global settings
        success = activate_user_locale_safe(user_id)

        if success:
            # User locale activated
            process_user(user_id)
        else:
            # Global defaults used (user not found)
            logger.warning(f"User {user_id} not found, using global defaults")
```

### Organisation-Level Background Jobs

```python
from i18n_preferences.helpers import org_locale_context

@shared_task
def generate_org_report(org_id):
    """Generate org-wide report in organisation's default locale."""
    with org_locale_context(org_id):
        # Org default locale is active
        report_title = _("Quarterly Report")

        # Generate report for all org members...
```

---

## Management Commands

Management commands also need explicit locale activation.

### Example: Data Export Command

```python
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from i18n_preferences.helpers import user_locale_context
from django.utils.translation import gettext as _

User = get_user_model()

class Command(BaseCommand):
    help = "Export user data in each user's preferred language"

    def handle(self, *args, **options):
        for user in User.objects.all():
            with user_locale_context(user.id):
                # Generate export in user's language
                filename = self.generate_export(user)

                self.stdout.write(
                    self.style.SUCCESS(f"Exported {filename} for {user.email}")
                )

    def generate_export(self, user):
        """Generate export with translated headers."""
        headers = [
            _("Name"),
            _("Email"),
            _("Joined Date"),
        ]
        # ... export logic
```

### Example: Batch Email Command

```python
class Command(BaseCommand):
    help = "Send reminder emails to all users"

    def handle(self, *args, **options):
        users = User.objects.filter(is_active=True)

        for user in users:
            with user_locale_context(user.id):
                # Email content in user's language
                subject = _("Reminder: Complete Your Profile")
                message = _("Hi {name}, please complete your profile.").format(
                    name=user.get_full_name()
                )

                send_mail(
                    subject=subject,
                    message=message,
                    recipient_list=[user.email],
                )
```

---

## Testing

### Testing with Different Locales

```python
import pytest
from django.utils import translation, timezone
import pytz
from settings.models import Setting, ScopeType

@pytest.mark.django_db
def test_user_sees_translated_content(client, user):
    """Verify content displays in user's language."""
    # Set user preference
    Setting.objects.create(
        key="i18n.preferences",
        scope_type=ScopeType.USER,
        user=user,
        value={"language": "nl", "timezone": "Europe/Amsterdam"},
        value_type="JSON",
    )

    client.force_login(user)
    response = client.get("/dashboard/")

    # Verify Dutch content
    assert "Welkom" in response.content.decode()
```

### Mocking Preference Resolution

```python
from unittest.mock import patch
from i18n_preferences.services import EffectivePreferences

def test_email_generation():
    """Test email generation with mocked preferences."""
    mock_prefs = EffectivePreferences(
        language="nl",
        language_source="user",
        locale="nl-NL",
        locale_source="user",
        timezone="Europe/Amsterdam",
        timezone_source="user",
    )

    with patch(
        "i18n_preferences.services.PreferenceResolutionService.get_effective_preferences",
        return_value=mock_prefs,
    ):
        # Test code that uses preferences
        email = generate_email(user_id=123)
        assert "Welkom" in email.subject
```

### Testing Context Managers

```python
def test_locale_restored_after_context(user):
    """Verify locale is restored after context manager exits."""
    # Set initial locale
    translation.activate("en")
    timezone.activate(pytz.timezone("UTC"))

    # Create user preference
    Setting.objects.create(
        key="i18n.preferences",
        scope_type=ScopeType.USER,
        user=user,
        value={"language": "nl", "timezone": "Europe/Amsterdam"},
        value_type="JSON",
    )

    # Use context manager
    with user_locale_context(user.id):
        # Inside context
        assert translation.get_language() == "nl"
        assert str(timezone.get_current_timezone()) == "Europe/Amsterdam"

    # Outside context - restored
    assert translation.get_language() == "en"
    assert str(timezone.get_current_timezone()) == "UTC"
```

### Testing Exception Safety

```python
def test_locale_restored_on_exception(user):
    """Verify locale is restored even if exception occurs."""
    translation.activate("en")
    timezone.activate(pytz.timezone("UTC"))

    Setting.objects.create(
        key="i18n.preferences",
        scope_type=ScopeType.USER,
        user=user,
        value={"language": "nl", "timezone": "Europe/Amsterdam"},
        value_type="JSON",
    )

    try:
        with user_locale_context(user.id):
            assert translation.get_language() == "nl"
            raise ValueError("Test exception")
    except ValueError:
        pass

    # Locale still restored despite exception
    assert translation.get_language() == "en"
    assert str(timezone.get_current_timezone()) == "UTC"
```

---

## Performance Considerations

### Caching Behavior

Preferences are cached using B10's Redis cache layer:

```python
# Cache key format
CACHE_KEY = f"setting:{scope_type}:{scope_id}:i18n.preferences"

# Example keys
"setting:USER:123:i18n.preferences"        # User 123's preferences
"setting:ORGANISATION:456:i18n.preferences" # Org 456's defaults
"setting:GLOBAL:None:i18n.preferences"     # Global defaults
```

### Cache Invalidation

Cache is automatically invalidated when:
1. User updates their preferences (via API)
2. Organisation admin updates org defaults
3. Platform admin updates global defaults

**Implementation**: B10's signal handlers automatically invalidate cache on `Setting` model changes.

### Middleware Overhead

The middleware adds minimal overhead (~1-2ms per request):

```python
# Middleware execution flow
1. Authentication (AuthenticationMiddleware)      # ~5ms
2. i18n Preference Resolution                     # ~1-2ms (cached)
3. Locale Activation (translation + timezone)     # ~0.5ms
4. Request processing                             # (your code)
```

**Optimization**: First request per user does database query; subsequent requests use cache.

### Database Queries

```sql
-- User preference lookup (cached)
SELECT * FROM settings_setting
WHERE key = 'i18n.preferences'
  AND scope_type = 'USER'
  AND user_id = 123;

-- Organisation default lookup (cached, only if user pref missing)
SELECT * FROM settings_setting
WHERE key = 'i18n.preferences'
  AND scope_type = 'ORGANISATION'
  AND organisation_id = 456;
```

### Graceful Degradation

If Redis is unavailable:
1. Preferences are fetched from PostgreSQL
2. No caching occurs (higher latency)
3. System remains functional (no errors)

**Recommendation**: Monitor Redis health; preferences system degrades gracefully but performance suffers.

---

## Extending Preferences

### Adding New Preference Fields

To add a new field (e.g., date format):

**1. Update validators** (`src/i18n_preferences/validators.py`):

```python
SUPPORTED_DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]

def validate_date_format(value: str) -> None:
    """Validate date format string."""
    if value not in SUPPORTED_DATE_FORMATS:
        raise ValidationError(
            f"Date format '{value}' is not supported. "
            f"Choose from: {', '.join(SUPPORTED_DATE_FORMATS)}"
        )
```

**2. Update serializer** (`src/i18n_preferences/serializers.py`):

```python
class PreferenceSerializer(serializers.Serializer):
    language = serializers.CharField(required=False, validators=[validate_language_code])
    locale = serializers.CharField(required=False, validators=[validate_locale])
    timezone = serializers.CharField(required=False, validators=[validate_timezone])
    date_format = serializers.CharField(required=False, validators=[validate_date_format])  # NEW
```

**3. Update resolution service** (`src/i18n_preferences/services.py`):

```python
@dataclass
class EffectivePreferences:
    language: str
    language_source: str
    locale: str
    locale_source: str
    timezone: str
    timezone_source: str
    date_format: str  # NEW
    date_format_source: str  # NEW

class PreferenceResolutionService:
    @staticmethod
    def get_effective_preferences(...) -> EffectivePreferences:
        # ... existing code ...

        # Resolve date_format
        date_format = user_prefs.get("date_format")
        date_format_source = "user" if date_format else None

        if not date_format and org_prefs:
            date_format = org_prefs.get("date_format")
            date_format_source = "organisation" if date_format else None

        if not date_format:
            date_format = settings.DEFAULT_DATE_FORMAT  # Add to settings
            date_format_source = "global"

        return EffectivePreferences(
            # ... existing fields ...
            date_format=date_format,
            date_format_source=date_format_source,
        )
```

**4. Update Django settings**:

```python
# config/settings/base.py
DEFAULT_DATE_FORMAT = "YYYY-MM-DD"
```

**5. Update tests** to cover new field.

---

## Migration Guide

### Migrating from User Model Fields

If your project previously stored `language` and `timezone` on the User model:

```python
# Run migration command
python manage.py migrate_user_i18n_preferences --dry-run  # Preview
python manage.py migrate_user_i18n_preferences           # Execute
```

**What the command does**:
1. Reads `user.language` and `user.timezone` fields
2. Validates values (skips invalid data)
3. Creates B10 settings with USER scope
4. Reports progress and errors

**Post-migration**:
1. Verify preferences: `GET /api/v1/preferences/effective/`
2. Deprecate old User model fields (optional)
3. Update profile page to use new API

---

## Troubleshooting

### Preferences Not Applying in Background Jobs

**Symptom**: Background job generates content in wrong language.

**Cause**: Background jobs don't have middleware; locale must be activated explicitly.

**Solution**: Use `user_locale_context()` or `activate_user_locale()`.

### Cache Invalidation Not Working

**Symptom**: User updates preferences but old values still apply.

**Check**:
1. Redis is running: `redis-cli ping` → `PONG`
2. B10 signals are connected (check `settings/signals.py`)
3. Cache key format is correct

**Manual invalidation**:
```python
from django.core.cache import cache

cache.delete(f"setting:USER:123:i18n.preferences")
```

### Middleware Order Issues

**Symptom**: `AttributeError: 'AnonymousUser' object has no attribute 'id'`

**Cause**: `I18nPreferenceMiddleware` runs before `AuthenticationMiddleware`.

**Solution**: Ensure middleware order in settings:

```python
MIDDLEWARE = [
    # ...
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # MUST BE FIRST
    "i18n_preferences.middleware.I18nPreferenceMiddleware",      # AFTER AUTH
    # ...
]
```

---

## Related Documentation

- **User Guide**: [`docs/i18n-preferences.md`](./i18n-preferences.md) - End-user documentation
- **Architecture Decision Record**: [`docs/adr/012-b10-preference-storage.md`](./adr/012-b10-preference-storage.md) - Design rationale
- **B10 Documentation**: [`docs/b10-settings-system.md`](./b10-settings-system.md) - Settings system overview

---

## Support

For development issues:
- **Code Review**: Submit PR for new preference fields
- **Bug Reports**: File issue with reproduction steps
- **Performance Issues**: Include profiling data and cache hit rates
