# I18n Preferences (B12 - Internationalization Preferences)

**Status**: ✅ Complete
**Location**: `src/i18n_preferences/`

## Purpose

Provides user and organisation-level internationalization preference management with hierarchical resolution (user > organisation > global).

## Scope

**✅ Included**:
- Language preference management (ISO 639-1 codes)
- Locale preference management (BCP 47 codes)
- Timezone preference management (IANA names)
- Hierarchical preference resolution service
- Middleware for automatic preference activation
- API endpoints for preference management

**❌ Excluded** (Product-Agnostic Constraint):
- Translation content (handled by locale module)
- Product-specific language options
- Custom date/time formatting rules
- Currency or measurement unit preferences

## Key Components

### Models
- No database models - preferences stored in [B10 Settings] module

### Services
- **`PreferenceResolutionService`**: Resolves effective preferences using user > org > global hierarchy
- **`EffectivePreferences`**: Dataclass containing resolved language, locale, timezone with source attribution

### Middleware
- **`I18nPreferencesMiddleware`**: Automatically activates user/org preferences for each request

### APIs/Views
- **`GET /api/i18n/preferences/`**: Get effective preferences for current user/org context
- **`PUT /api/i18n/preferences/`**: Update user or organisation preferences

### Utilities
- **`helpers.py`**: Preference formatting and validation helpers
- **`validators.py`**: Validates language codes, locale codes, and timezone names

## Public Interface

**Safe to Import** (Stable API):
```python
from i18n_preferences.services import PreferenceResolutionService, EffectivePreferences
from i18n_preferences.middleware import I18nPreferencesMiddleware
from i18n_preferences.validators import validate_language_code, validate_timezone
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from i18n_preferences.helpers import _format_preference_key  # Internal formatting
```

## Integration Example

**Resolve User Preferences**:
```python
from i18n_preferences.services import PreferenceResolutionService

# Get effective preferences for user in organisation
prefs = PreferenceResolutionService.get_effective_preferences(
    user=request.user,
    organisation=current_org,
)

# Access resolved values with source tracking
language = prefs.language  # e.g., "en"
locale = prefs.locale  # e.g., "en-US"
timezone = prefs.timezone  # e.g., "America/New_York"

# Check where preference came from
if prefs.language_source == "user":
    print("Using user's personal language preference")
elif prefs.language_source == "organisation":
    print("Using organisation's language preference")
else:
    print("Using global default language")
```

**API Usage**:
```bash
# Get effective preferences
GET /api/i18n/preferences/?organisation_id=123
Authorization: Bearer <token>

# Response
{
    "language": "en",
    "locale": "en-US",
    "timezone": "America/New_York",
    "language_source": "user",
    "locale_source": "organisation",
    "timezone_source": "global"
}

# Update user preferences
PUT /api/i18n/preferences/
{
    "language": "nl",
    "locale": "nl-NL",
    "timezone": "Europe/Amsterdam"
}
```

## Related Modules

**Dependencies** (This module requires):
- [B05 Accounts] - User model
- [B06 Organisations] - Organisation model and multi-tenancy
- [B10 Settings] - Stores preference data

**Used By** (Modules that depend on this):
- [B04 Locale] - Translation content delivery
- All modules - Request-level i18n context

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Preference Sources**:
   ```python
   # your_product/preferences.py
   from i18n_preferences.services import PreferenceResolutionService

   class ExtendedPreferenceService(PreferenceResolutionService):
       """Add product-specific preference sources."""

       @classmethod
       def get_effective_preferences(cls, user=None, organisation=None, project=None):
           """Add project-level preferences to hierarchy."""
           prefs = super().get_effective_preferences(user, organisation)
           if project and project.language:
               prefs.language = project.language
               prefs.language_source = "project"
           return prefs
   ```

2. **Custom Validators**:
   ```python
   # your_product/validators.py
   from i18n_preferences.validators import validate_language_code

   def validate_product_language(language_code):
       """Validate against product's supported languages."""
       validate_language_code(language_code)  # Base validation

       if language_code not in PRODUCT_SUPPORTED_LANGUAGES:
           raise ValidationError(f"Language {language_code} not supported")
   ```

3. **Preference Change Signals**:
   ```python
   # your_product/signals.py
   from django.db.models.signals import post_save
   from django.dispatch import receiver
   from settings.models import Setting

   @receiver(post_save, sender=Setting)
   def handle_i18n_preference_change(sender, instance, **kwargs):
       """React to i18n preference changes."""
       if instance.key == "i18n.preferences":
           invalidate_user_cache(instance.user)
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    # ...
    "settings",  # Required for preference storage
    "i18n_preferences",
]

MIDDLEWARE = [
    # ...
    "i18n_preferences.middleware.I18nPreferencesMiddleware",  # After auth middleware
]

# Global defaults
LANGUAGE_CODE = "en"
TIME_ZONE = "UTC"
```

**Environment Variables**:
```bash
# No environment variables required
```

**Optional Settings**:
```python
# settings.py (optional)
I18N_DEFAULT_LOCALE = "en-US"  # Default locale if not specified
I18N_SUPPORTED_LANGUAGES = ["en", "nl", "de"]  # Restrict available languages
```

## Testing

**Run Module Tests**:
```bash
pytest tests/i18n_preferences/ -v
```

**Key Test Coverage**:
- ✅ Preference resolution hierarchy (user > org > global)
- ✅ Independent fallback per field (language, locale, timezone)
- ✅ Language code validation (ISO 639-1)
- ✅ Locale code validation (BCP 47)
- ✅ Timezone validation (IANA database)
- ✅ Middleware activation of preferences
- ✅ API endpoint authentication and authorization

## References

- **Spec**: [documents/02-roadmap/modules/done/004-Bxx-core-internationalization-base.md](../../documents/02-roadmap/modules/done/004-Bxx-core-internationalization-base.md)
- **Module Doc**: [documents/04-modules/backend/B12-i18n-preferences.md](../../documents/04-modules/backend/B12-i18n-preferences.md)
- **ISO 639-1**: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- **BCP 47**: https://tools.ietf.org/html/bcp47
- **IANA Time Zones**: https://www.iana.org/time-zones
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Preferences not activating for requests
   - **Cause**: Middleware not in `MIDDLEWARE` list or placed incorrectly
   - **Solution**: Add `I18nPreferencesMiddleware` after `AuthenticationMiddleware`

2. **Issue**: Invalid language code error
   - **Cause**: Non-standard language code provided
   - **Solution**: Use ISO 639-1 two-letter codes (e.g., "en", not "eng")

3. **Issue**: Timezone not recognized
   - **Cause**: Invalid IANA timezone name
   - **Solution**: Use standard IANA names like "America/New_York", not abbreviations like "EST"

4. **Issue**: Organisation preference not applying
   - **Cause**: User has personal preference set, which takes precedence
   - **Solution**: Clear user preference to fall back to organisation level

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
