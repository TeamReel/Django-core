# Locale (Translation Files)

**Status**: ✅ Complete
**Location**: `src/locale/`

## Purpose

Provides compiled translation files for internationalization support across the Core-App.

## Scope

**✅ Included**:
- Compiled message catalogs (.mo files)
- Django/Gettext translation format
- Base translation strings for Core-App modules
- US English (en_US) locale by default

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific translation content
- Domain-specific terminology
- User-generated translations
- Translation management UI (use Django admin or external tools)

## Key Components

### Translation Files
- **`en_US/LC_MESSAGES/`**: US English translations (default locale)
- **`.po files`**: Source translation files (if present)
- **`.mo files`**: Compiled translation files used by Django

## Public Interface

**Safe to Import** (Stable API):
```python
from django.utils.translation import gettext as _

# Use translations
message = _("Welcome to Django Core-App")
```

**Internal Use Only** (May change):
```python
# Do NOT directly access .mo files
# Use Django's translation APIs instead
```

## Integration Example

**Use Translations in Code**:
```python
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy

# Standard translation
welcome_message = _("Welcome")

# Lazy translation (for class-level strings)
class MyModel(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name=gettext_lazy("Name"),
    )
```

**Use Translations in Templates**:
```django
{% load i18n %}

<h1>{% trans "Welcome" %}</h1>

{% blocktrans %}
    You have {{ count }} notifications.
{% endblocktrans %}
```

## Related Modules

**Dependencies** (This module requires):
- None - pure translation files

**Used By** (Modules that depend on this):
- All modules - provides translation content
- [B12 I18n Preferences] - Works with preference system

## Extension Points

**How Downstream Products Can Extend**:

1. **Add Custom Locales**:
   ```bash
   # your_product/locale/
   cd your_product
   django-admin makemessages -l nl  # Create Dutch translations
   django-admin compilemessages      # Compile to .mo files
   ```

2. **Override Core Translations**:
   ```python
   # settings.py
   LOCALE_PATHS = [
       BASE_DIR / "your_product" / "locale",  # Your translations first
       BASE_DIR / "src" / "locale",            # Core translations fallback
   ]
   ```

3. **Custom Translation Domains**:
   ```bash
   # Create separate translation domain
   django-admin makemessages -l en -d custom_domain

   # Use in code
   from django.utils.translation import gettext
   message = gettext("text", domain="custom_domain")
   ```

## Configuration

**Required Settings**:
```python
# settings.py
LANGUAGE_CODE = "en-us"
USE_I18N = True
USE_L10N = True

LOCALE_PATHS = [
    BASE_DIR / "src" / "locale",
]
```

**Environment Variables**:
```bash
# No environment variables required
```

**Optional Settings**:
```python
# settings.py (optional)
LANGUAGES = [
    ("en", "English"),
    ("nl", "Nederlands"),
    ("de", "Deutsch"),
]

LANGUAGE_COOKIE_NAME = "django_language"
LANGUAGE_COOKIE_AGE = 31536000  # 1 year
```

## Testing

**Run Module Tests**:
```bash
pytest tests/locale/ -v
```

**Key Test Coverage**:
- ✅ Translation files compile without errors
- ✅ Base translations exist for core functionality
- ✅ No untranslated strings in critical paths

## References

- **Django i18n Docs**: https://docs.djangoproject.com/en/stable/topics/i18n/
- **GNU Gettext**: https://www.gnu.org/software/gettext/
- **Module Doc**: [documents/04-modules/backend/B12-i18n-preferences.md](../../documents/04-modules/backend/B12-i18n-preferences.md)
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Translations not appearing
   - **Cause**: `.mo` files not compiled or not in `LOCALE_PATHS`
   - **Solution**: Run `django-admin compilemessages` and verify `LOCALE_PATHS`

2. **Issue**: "Translation missing" warnings
   - **Cause**: `.po` file exists but not compiled
   - **Solution**: Run `django-admin compilemessages` to generate `.mo` files

3. **Issue**: Wrong language being used
   - **Cause**: Language preference not set or middleware not configured
   - **Solution**: Check [B12 I18n Preferences] configuration

## Migration Notes

**Breaking Changes**:
- None - translation files are additive

**Deprecations**:
- None

## Adding New Translations

**Step-by-Step Process**:

1. **Extract translatable strings**:
   ```bash
   cd src
   django-admin makemessages -l nl --ignore=htmlcov --ignore=node_modules
   ```

2. **Edit translation files**:
   ```bash
   # Edit locale/nl/LC_MESSAGES/django.po
   # Add translations for msgid entries
   ```

3. **Compile translations**:
   ```bash
   django-admin compilemessages
   ```

4. **Test translations**:
   ```python
   from django.utils.translation import activate
   activate("nl")
   print(_("Welcome"))  # Should print Dutch translation
   ```
