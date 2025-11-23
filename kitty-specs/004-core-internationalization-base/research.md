# Research: Core Internationalization Base Layer

**Feature**: 004-core-internationalization-base
**Date**: 2025-11-23
**Purpose**: Document framework decisions, architectural patterns, and testing strategy for Django i18n/l10n implementation

---

## Framework Selection

### Framework Selected

**Django's Built-in Internationalization (i18n) and Localization (l10n) Framework**

Django provides comprehensive internationalization and localization support through its built-in framework, leveraging the industry-standard GNU gettext toolchain.

### Rationale

1. **Battle-tested and Mature**: Django's i18n framework has been production-proven across thousands of applications since Django 1.0 (2008)
2. **Zero Additional Dependencies**: No third-party packages required - everything needed is included in Django
3. **Tight Integration**: Seamless integration with Django's ORM, template system, forms, and middleware stack
4. **Comprehensive Documentation**: Extensive official documentation with examples and best practices
5. **Active Maintenance**: Core Django feature with ongoing support and security updates
6. **Lazy Translation Support**: Built-in `gettext_lazy()` for deferred evaluation (critical for model fields, class attributes)
7. **Caching Built-in**: Translation lookups are cached automatically via Django's `CachedTranslation` loader
8. **Pluralization Support**: Handles complex pluralization rules for different languages
9. **Template Integration**: First-class support via `{% trans %}` and `{% blocktrans %}` template tags

### Alternatives Considered

#### 1. GNU gettext Alone
**Rejected**: While gettext is the underlying technology, using it directly lacks Django-specific integration:
- No ORM integration for model field verbose names
- No template tag support
- Manual middleware implementation required
- No lazy translation (would break model definitions)
- Reinventing features Django already provides

#### 2. Custom Translation Solution
**Rejected**: Building a custom solution introduces unnecessary complexity:
- Significant development and maintenance burden
- Risk of bugs and edge cases already solved by Django
- Poor interoperability with Django ecosystem packages
- Team learning curve for non-standard patterns

#### 3. Third-party Packages (django-rosetta, django-modeltranslation, django-hvad)
**Rejected for base layer**: While valuable for specific use cases, they're overkill for foundational i18n:
- **django-rosetta**: Web-based translation UI - useful for translation management but not needed for base infrastructure
- **django-modeltranslation**: Database model translation - out of scope (we're doing UI/system messages, not user-generated content)
- **django-hvad**: Similar to modeltranslation, focuses on translating database content
- **Concern**: Additional dependencies, potential maintenance issues, vendor lock-in

**Note**: Product-specific applications may choose to add these packages if needed, but the core infrastructure should use standard Django.

### Key Benefits for This Project

1. **Product-Agnostic** (Constitutional Principle I): Django's i18n is infrastructure, not product logic
2. **Minimal Complexity**: Follows "use framework features" philosophy
3. **Future-Compatible**: Will integrate seamlessly with B12 (user/org language preferences) feature
4. **Developer Familiarity**: Most Django developers already understand this framework
5. **Easy Testing**: Well-established patterns for testing translations

### References

- [Django i18n Documentation](https://docs.djangoproject.com/en/5.1/topics/i18n/)
- [Django Translation Documentation](https://docs.djangoproject.com/en/5.1/topics/i18n/translation/)
- [GNU gettext](https://www.gnu.org/software/gettext/)

---

## Translation Organization

### Hybrid Approach

This project uses a **hybrid translation organization strategy** combining centralized and per-app translation files.

### Centralized Translations (`src/locale/`)

**Location**: `src/locale/<language_code>/LC_MESSAGES/django.po`

**Use for**:
- Cross-cutting messages used by multiple apps (authentication, authorization)
- Common validation errors (required field, invalid format, etc.)
- Shared UI elements (buttons, labels, navigation)
- System-wide status messages and notifications
- HTTP error pages (404, 500, etc.)
- Generic CRUD operation messages (created, updated, deleted)

**Rationale**:
- **Consistency**: Single source of truth for common terminology
- **Maintainability**: One place to update frequently-used messages
- **Translation Efficiency**: Translators review all common messages together
- **Avoid Duplication**: Prevents same message being translated differently across apps

**Example Messages**:
- "This field is required."
- "Invalid email address format."
- "Save Changes"
- "Operation completed successfully."

### Per-App Translations (`src/<app>/locale/`)

**Location**: `src/<app_name>/locale/<language_code>/LC_MESSAGES/django.po`

**Use for**:
- App-specific domain terminology (e.g., "Constitution Engine" → "Rule validation failed: circular dependency detected")
- Feature-specific help text and descriptions
- App-unique workflows and processes
- Domain model verbose names specific to the app

**Rationale**:
- **Isolation**: App changes don't affect core translations
- **Modularity**: Apps can be deployed independently with their own translations
- **Clear Ownership**: App teams manage their own translation files
- **Scoping**: Reduces cognitive load - translators work on smaller, focused files

**Example Messages** (for `constitution_engine` app):
- "The Constitution Engine validates your project rules against defined constraints."
- "Rule priority must be between 1 and 100."
- "Circular dependency detected: Rule A depends on Rule B which depends on Rule A."

### Decision Matrix

| Message Type | Location | Rationale |
|--------------|----------|-----------|
| Login success message | Centralized | Used across all apps |
| "Constitution rule validation failed" | Per-app | Specific to constitution_engine domain |
| "This field is required" | Centralized | Generic validation, used everywhere |
| "Rule priority out of range" | Per-app | constitution_engine-specific logic |
| "Save" / "Cancel" / "Delete" buttons | Centralized | Common UI elements |
| "Analyze Constitution Health" | Per-app | Feature-specific action |
| HTTP 404 "Page Not Found" | Centralized | System-wide error |
| "Validator module not found" | Per-app | constitution_engine error |

### Tradeoffs

**Centralized Advantages**:
- ✅ Consistent terminology across entire application
- ✅ Efficient for translators (batch review)
- ✅ Single place to update common messages
- ❌ Can become large file if not disciplined
- ❌ Changes require coordinating with all apps

**Per-App Advantages**:
- ✅ Better isolation and modularity
- ✅ Smaller, more manageable translation files
- ✅ Clear ownership and responsibility
- ❌ Risk of inconsistent terminology if apps use similar concepts
- ❌ Potential duplication if not coordinated

### Implementation Note

**Phase 1** (this feature): Implement centralized translations only (`src/locale/`)
**Future**: Apps can add per-app translations as needed by creating `src/<app>/locale/` directories (Django auto-detects these)

---

## Translation Marking Patterns

### Python Code Patterns

#### Runtime Translation (Views, Functions, Services)

```python
from django.utils.translation import gettext

def my_view(request):
    message = gettext("Welcome to the application")
    return HttpResponse(message)

def process_data(data):
    if not data:
        raise ValueError(gettext("Data cannot be empty"))
```

**When to use**: Dynamic content that's evaluated at runtime (view functions, service methods).

#### Lazy Translation (Models, Forms, Class Attributes)

```python
from django.utils.translation import gettext_lazy
from django.db import models

class MyModel(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name=gettext_lazy("Name"),
        help_text=gettext_lazy("Enter the item name")
    )

    class Meta:
        verbose_name = gettext_lazy("My Model")
        verbose_name_plural = gettext_lazy("My Models")

class MyForm(forms.Form):
    email = forms.EmailField(
        label=gettext_lazy("Email Address"),
        error_messages={
            'required': gettext_lazy("Email is required"),
            'invalid': gettext_lazy("Enter a valid email address"),
        }
    )
```

**When to use**: Class-level definitions where translation occurs at module import time but must be deferred until request time (when language is known).

#### Translations with Variables

```python
from django.utils.translation import gettext

# Use Python % formatting (required for gettext)
message = gettext("Hello, %(username)s") % {'username': user.username}

# For multiple variables
message = gettext("%(count)d items found in %(category)s") % {
    'count': item_count,
    'category': category_name,
}
```

**Important**: Use `%` formatting, NOT f-strings. The gettext extraction tool cannot parse f-strings correctly.

#### Context for Disambiguation

```python
from django.utils.translation import pgettext

# "May" as month vs "may" as permission
month = pgettext("month name", "May")
permission = pgettext("permission", "may")
```

### Django Template Patterns

#### Load i18n Tags

```django
{% load i18n %}
```

Required at top of any template using translation tags.

#### Simple Translation

```django
<h1>{% trans "Welcome" %}</h1>
<p>{% trans "This is a simple translated string." %}</p>

{# With context for disambiguation #}
<button>{% trans "Close" context "close button" %}</button>
<span>{% trans "Close" context "adjective - opposite of far" %}</span>
```

#### Block Translation with Variables

```django
{% blocktrans with name=user.name %}
    Hello, {{ name }}!
{% endblocktrans %}

{% blocktrans with count=items|length category=category_name %}
    Found {{ count }} items in {{ category }}.
{% endblocktrans %}
```

#### Pluralization

```django
{% blocktrans count counter=items|length %}
    There is {{ counter }} item.
{% plural %}
    There are {{ counter }} items.
{% endblocktrans %}
```

Django automatically handles pluralization rules for different languages (e.g., Slavic languages with multiple plural forms).

### Anti-Patterns to Avoid

❌ **F-strings in gettext (breaks message extraction)**:
```python
# WRONG
message = gettext(f"Hello {username}")
```
✅ **Use % formatting instead**:
```python
# CORRECT
message = gettext("Hello %(username)s") % {'username': username}
```

❌ **String concatenation for translations**:
```python
# WRONG
message = gettext("Hello ") + username + gettext("!")
```
✅ **Use single translatable string with variables**:
```python
# CORRECT
message = gettext("Hello %(username)s!") % {'username': username}
```

❌ **HTML inside translatable strings**:
```python
# WRONG
message = gettext("<strong>Warning:</strong> This action is permanent")
```
✅ **Keep translations text-only, apply HTML in template**:
```python
# CORRECT (Python)
message = gettext("Warning: This action is permanent")

# CORRECT (Template)
<p><strong>{% trans "Warning:" %}</strong> {% trans "This action is permanent" %}</p>
```

❌ **Runtime gettext for class attributes**:
```python
# WRONG - evaluated at import time, before language is known
class MyForm(forms.Form):
    email = forms.EmailField(label=gettext("Email"))  # Will always be default language
```
✅ **Use gettext_lazy for class attributes**:
```python
# CORRECT
class MyForm(forms.Form):
    email = forms.EmailField(label=gettext_lazy("Email"))  # Evaluated at request time
```

---

## Language Fallback Strategy

### Fallback Chain

Django implements a **three-level fallback chain** for translation lookups:

**Level 1: Requested Specific Language**
- Example: User requests `fr-CA` (French Canadian)
- Django first looks for translation in `locale/fr_CA/LC_MESSAGES/django.mo`

**Level 2: Language Family**
- If Level 1 fails, try language family: `fr` (French generic)
- Django looks for `locale/fr/LC_MESSAGES/django.mo`

**Level 3: Default Language (English US)**
- If Level 2 fails, fall back to `settings.LANGUAGE_CODE = 'en-us'`
- Django looks for `locale/en/LC_MESSAGES/django.mo`
- If that fails too, Django uses the **source string** (untranslated message ID)

### Graceful Degradation

The system continues functioning normally in all scenarios:

1. **Missing Translation**: Falls back through chain, ultimately displaying English
2. **Malformed .po File**: Django logs error, skips the file, uses fallback
3. **Missing .mo File**: Django logs warning, uses source strings
4. **Unconfigured Language**: Django falls back to default language immediately

**Result**: Users always see content, even if not in their preferred language.

### Structured Logging for Translation Events

To enable observability and debugging, we implement structured logging for translation operations.

#### Log Fields

Every translation event includes these structured fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `translation_key` | string | Message ID being translated | `"user.created.success"` |
| `language_code` | string | Target language requested | `"fr-CA"` |
| `fallback_language` | string | Language actually used (if fallback occurred) | `"en-us"` |
| `fallback_reason` | string | Why fallback was necessary | `"missing_translation"` |

#### Log Levels

**WARNING**: Translation fallback occurred (expected during development)
```python
logger.warning(
    "Translation fallback occurred",
    extra={
        'translation_key': 'user.login.success',
        'language_code': 'fr',
        'fallback_language': 'en-us',
        'fallback_reason': 'missing_translation',
    }
)
```

**ERROR**: Translation file is malformed or cannot be loaded (requires immediate attention)
```python
logger.error(
    "Translation file compilation failed",
    extra={
        'file_path': 'src/locale/fr/LC_MESSAGES/django.po',
        'language_code': 'fr',
        'error_type': 'malformed_po_file',
        'error_details': 'Syntax error at line 42: Unterminated string',
    }
)
```

#### Fallback Reasons

- `missing_translation`: String not translated in target language
- `language_not_configured`: Language not in `settings.LANGUAGES`
- `malformed_file`: .po file has syntax errors
- `missing_mo_file`: Compiled .mo file not found
- `partial_translation`: Some strings translated, this one missing

#### Example Log Entries

**Successful translation** (INFO level, optional):
```json
{
  "timestamp": "2025-11-23T14:30:00Z",
  "level": "INFO",
  "logger": "django.translation",
  "translation_key": "user.login.success",
  "language_code": "en-us",
  "message": "Translation rendered successfully"
}
```

**Fallback occurred** (WARNING level):
```json
{
  "timestamp": "2025-11-23T14:30:15Z",
  "level": "WARNING",
  "logger": "django.translation",
  "translation_key": "user.password.reset",
  "language_code": "fr",
  "fallback_language": "en-us",
  "fallback_reason": "missing_translation",
  "message": "Translation not found, falling back to en-us"
}
```

**Translation error** (ERROR level):
```json
{
  "timestamp": "2025-11-23T14:30:30Z",
  "level": "ERROR",
  "logger": "django.translation",
  "file_path": "src/locale/de/LC_MESSAGES/django.po",
  "language_code": "de",
  "error_type": "malformed_po_file",
  "error_details": "msgstr on line 89 is not properly closed",
  "message": "Failed to load translation file"
}
```

### Monitoring and Alerts

These logs enable:
1. **Development**: Identify missing translations before production
2. **Operations**: Monitor translation coverage across languages
3. **Debugging**: Track down why a user saw English instead of their language
4. **Quality**: Alert on high fallback rates for specific languages

---

## Testing Strategy

### Test Coverage Target

**80% line coverage** for:
- `src/config/settings/base.py` (i18n/l10n configuration)
- `src/common/translation_logging.py` (structured logging utilities)

### Test Fixtures

#### Directory Structure

```
tests/fixtures/translations/
├── en_US/
│   └── LC_MESSAGES/
│       ├── django.po      # Complete translation (all test strings)
│       └── django.mo      # Compiled (run compilemessages)
├── fr/
│   └── LC_MESSAGES/
│       ├── django.po      # Partial translation (some strings missing for fallback tests)
│       └── django.mo      # Compiled
└── malformed/
    └── LC_MESSAGES/
        └── django.po      # Invalid syntax for error handling tests
```

#### Sample Test Fixture (English)

```po
# tests/fixtures/translations/en_US/LC_MESSAGES/django.po
msgid ""
msgstr ""
"Language: en\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"
"Content-Transfer-Encoding: 8bit\n"

msgid "test.greeting"
msgstr "Hello, World!"

msgid "test.farewell"
msgstr "Goodbye!"

msgid "test.with_variable"
msgstr "Welcome, %(name)s"
```

#### Sample Test Fixture (French - Partial)

```po
# tests/fixtures/translations/fr/LC_MESSAGES/django.po
msgid ""
msgstr ""
"Language: fr\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"

msgid "test.greeting"
msgstr "Bonjour, le monde!"

# test.farewell deliberately missing to test fallback behavior
# test.with_variable deliberately missing
```

### Test Categories

#### 1. Translation Loading Tests

**Purpose**: Verify .po files load correctly and translations render properly.

```python
from django.test import TestCase
from django.utils.translation import activate, gettext

class TranslationLoadingTest(TestCase):
    def test_english_translation_renders(self):
        activate('en')
        msg = gettext("test.greeting")
        self.assertEqual(msg, "Hello, World!")

    def test_french_translation_renders(self):
        activate('fr')
        msg = gettext("test.greeting")
        self.assertEqual(msg, "Bonjour, le monde!")

    def test_lazy_translation_evaluates_correctly(self):
        from django.utils.translation import gettext_lazy
        msg = gettext_lazy("test.greeting")
        activate('en')
        self.assertEqual(str(msg), "Hello, World!")
        activate('fr')
        self.assertEqual(str(msg), "Bonjour, le monde!")
```

#### 2. Fallback Behavior Tests

**Purpose**: Verify fallback chain works when translations are missing.

```python
class TranslationFallbackTest(TestCase):
    def test_fallback_to_english_for_missing_french_translation(self):
        activate('fr')
        # test.farewell missing in French .po, should fall back to English
        msg = gettext("test.farewell")
        self.assertEqual(msg, "Goodbye!")  # English fallback

    def test_fallback_for_unconfigured_language(self):
        activate('de')  # German not configured in LANGUAGES
        msg = gettext("test.greeting")
        # Should fall back to default language (English)
        self.assertEqual(msg, "Hello, World!")

    def test_fallback_logs_warning(self):
        with self.assertLogs('django.translation', level='WARNING') as cm:
            activate('fr')
            msg = gettext("test.farewell")  # Missing in French
            self.assertIn('fallback', cm.output[0].lower())
```

#### 3. Middleware Functionality Tests

**Purpose**: Verify LocaleMiddleware correctly detects and activates languages.

```python
from django.test import RequestFactory

class LocaleMiddlewareTest(TestCase):
    def test_middleware_respects_accept_language_header(self):
        factory = RequestFactory()
        request = factory.get('/', HTTP_ACCEPT_LANGUAGE='fr')
        response = self.client.get('/', HTTP_ACCEPT_LANGUAGE='fr')
        # Verify response content is in French (if configured)

    def test_middleware_ordering_is_correct(self):
        from django.conf import settings
        mw_list = settings.MIDDLEWARE
        session_idx = mw_list.index('django.contrib.sessions.middleware.SessionMiddleware')
        locale_idx = mw_list.index('django.middleware.locale.LocaleMiddleware')
        common_idx = mw_list.index('django.middleware.common.CommonMiddleware')
        # LocaleMiddleware must be after Session and before Common
        self.assertLess(session_idx, locale_idx)
        self.assertLess(locale_idx, common_idx)
```

#### 4. Timezone Handling Tests

**Purpose**: Verify datetime values use UTC consistently.

```python
from django.utils import timezone
from datetime import datetime

class TimezoneTest(TestCase):
    def test_now_returns_utc_datetime(self):
        now = timezone.now()
        self.assertEqual(now.tzinfo.zone, 'UTC')

    def test_use_tz_setting_is_enabled(self):
        from django.conf import settings
        self.assertTrue(settings.USE_TZ)

    def test_naive_datetime_awareness(self):
        # Naive datetimes should be treated as UTC when USE_TZ=True
        naive_dt = datetime(2025, 1, 1, 12, 0, 0)
        aware_dt = timezone.make_aware(naive_dt)
        self.assertEqual(aware_dt.tzinfo.zone, 'UTC')
```

#### 5. Integration Tests (Translation Workflow)

**Purpose**: Verify makemessages and compilemessages commands work correctly.

```python
import subprocess
from pathlib import Path

class TranslationWorkflowIntegrationTest(TestCase):
    def test_makemessages_creates_po_files(self):
        result = subprocess.run(
            ['python', 'manage.py', 'makemessages', '-l', 'en_US', '--dry-run'],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn('processing locale en_US', result.stdout)

    def test_compilemessages_creates_mo_files(self):
        result = subprocess.run(
            ['python', 'manage.py', 'compilemessages', '--locale=en_US'],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0)
        # Verify .mo file exists after compilation
        mo_path = Path('src/locale/en_US/LC_MESSAGES/django.mo')
        self.assertTrue(mo_path.exists())
```

### Running Coverage

```bash
# Run tests with coverage
pytest --cov=src/config/settings --cov=src/common/translation_logging \
       --cov-report=term --cov-report=html \
       tests/config/test_i18n_settings.py \
       tests/common/test_translation_logging.py

# View coverage report
open htmlcov/index.html  # or start htmlcov/index.html on Windows
```

### Coverage Scope

**Include**:
- Our configuration code in `src/config/settings/base.py`
- Our logging utilities in `src/common/translation_logging.py`
- Custom wrapper functions or middleware (if any)

**Exclude**:
- Django framework code (already tested by Django project)
- Third-party packages
- Test code itself

### Test Organization

```
tests/
├── config/
│   ├── __init__.py
│   └── test_i18n_settings.py          # Tests for Django settings configuration
├── common/
│   ├── __init__.py
│   └── test_translation_logging.py    # Tests for structured logging
└── fixtures/
    └── translations/                   # Test .po/.mo files
        ├── en_US/
        ├── fr/
        └── malformed/
```

---

## Summary

This research document establishes the foundation for implementing internationalization in the Django core application:

1. **Framework**: Django's built-in i18n/l10n (no additional dependencies)
2. **Organization**: Hybrid approach (centralized `src/locale/` + per-app `src/<app>/locale/`)
3. **Translation Patterns**: Python `gettext`/`gettext_lazy`, Django `{% trans %}`/`{% blocktrans %}`
4. **Fallback**: Three-level chain (requested → family → default) with graceful degradation
5. **Logging**: Structured logs with `translation_key`, `language_code`, `fallback_reason` fields
6. **Testing**: 80% coverage target, fixtures for complete/partial/malformed translations

All subsequent work packages (WP02-WP06) will implement the patterns and decisions documented here.
