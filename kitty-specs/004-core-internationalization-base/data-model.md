# Data Model: Core Internationalization Base Layer

## Overview

This feature is configuration-based with **no database models**. This document describes conceptual entities represented in files and Django settings.

The Core Internationalization Base Layer provides foundational i18n/l10n infrastructure through configuration rather than persistent data. All entities exist as files, settings, and runtime objects.

## Conceptual Entities

### Translation Catalog

**Representation**: `.po` (source) and `.mo` (compiled) files
**Location**: `src/locale/<language>/LC_MESSAGES/django.po`
**Purpose**: Store translatable strings and their translations for each supported language

**Structure**:
- **Message ID (msgid)**: Unique key for translatable string (e.g., `"user.created.success"`)
- **Translation (msgstr)**: Localized string for target language
- **Context (msgctxt)**: Optional disambiguation when same msgid has different meanings
- **Metadata**: Language code, character encoding, plural rules

**Example**:
```po
# Translation catalog for English (en_US)
msgid ""
msgstr ""
"Language: en\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"

msgid "user.created.success"
msgstr "User created successfully"

msgid "validation.required"
msgstr "This field is required"
```

**File Types**:
- `.po` files: Human-readable source format, edited by developers/translators
- `.mo` files: Binary compiled format, used by Django at runtime for performance

**Lifecycle**:
1. Developer marks strings with `gettext()` or `{% trans %}` tags
2. `makemessages` command extracts msgids into `.po` files
3. Translator edits msgstr values in `.po` files
4. `compilemessages` command compiles `.po` to `.mo` files
5. Django reads `.mo` files at runtime to display translations

---

### Locale Configuration

**Representation**: Django settings in `src/config/settings/base.py`
**Purpose**: Define global i18n/l10n behavior and available languages
**Type**: Application configuration (not persisted data)

**Settings**:

| Setting | Value | Purpose |
|---------|-------|---------|
| `LANGUAGE_CODE` | `'en-us'` | Default language when no user preference |
| `TIME_ZONE` | `'UTC'` | Default timezone for datetime objects |
| `LANGUAGES` | `[('en', 'English')]` | Available language choices |
| `USE_I18N` | `True` | Enable translation system |
| `USE_L10N` | `True` | Enable localization (date/number formatting) |
| `USE_TZ` | `True` | Enable timezone-aware datetimes |
| `LOCALE_PATHS` | `[BASE_DIR / "locale"]` | Directories containing translation files |

**Example**:
```python
# src/config/settings/base.py
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'

USE_I18N = True  # Enable translations
USE_L10N = True  # Enable localized formatting
USE_TZ = True    # Enable timezone support

# Available languages
LANGUAGES = [
    ('en', 'English'),
    ('fr', 'French'),
    ('es', 'Spanish'),
]

# Translation file locations
LOCALE_PATHS = [
    BASE_DIR / "locale",
]
```

**Middleware Integration**:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',  # Language detection
    'django.middleware.common.CommonMiddleware',
    # ...
]
```

**Behavior**:
- `LocaleMiddleware` detects user language from session, cookie, or Accept-Language header
- Active language persists across requests via session storage
- Settings are read once at application startup (require server restart for changes)

---

### Language Fallback Chain

**Representation**: Django's translation resolution algorithm
**Purpose**: Gracefully handle missing translations without displaying raw msgids
**Type**: Runtime behavior (not stored data)

**Resolution Sequence**:
1. **Requested language** (e.g., `'fr-CA'` for Canadian French)
2. **Language family** (e.g., `'fr'` for generic French)
3. **Default language** (e.g., `'en-us'` from `LANGUAGE_CODE`)
4. **msgid itself** (if all translations missing, display the key)

**Example Scenarios**:

| User Requests | Translation Exists | Django Uses |
|---------------|-------------------|-------------|
| `fr-CA` | ✅ `fr-CA` catalog has msgstr | `fr-CA` translation |
| `fr-CA` | ❌ `fr-CA` missing, ✅ `fr` exists | `fr` translation |
| `fr-CA` | ❌ Both `fr-CA` and `fr` missing | `en-us` (default) |
| `de` | ❌ No German translations | `en-us` (default) |

**Code Example**:
```python
from django.utils.translation import activate, gettext

# Scenario: fr-CA requested, but only fr and en-us exist
activate('fr-CA')

# msgid exists in fr catalog
msg = gettext("user.created.success")
# Returns: "Utilisateur créé avec succès" (from fr)

# msgid missing in fr catalog, exists in en-us
msg = gettext("user.deleted.success")
# Returns: "User deleted successfully" (from en-us)

# msgid missing everywhere
msg = gettext("user.unknown.action")
# Returns: "user.unknown.action" (msgid itself)
```

**Automatic Fallback**:
Django automatically walks the fallback chain without developer intervention. No error is raised for missing translations—the system gracefully degrades to the next available translation or the msgid key.

**Logging Integration**:
The `common.translation_logging` module provides structured logging for fallback events:
```python
from common.translation_logging import (
    log_translation_event,
    log_translation_fallback,
)

# Log when fallback occurs
log_translation_fallback(
    translation_key='user.deleted.success',
    requested_language='fr-CA',
    fallback_language='en-us',
    reason='Translation not found in fr-CA or fr catalogs'
)
```

---

## Entity Relationships

```
┌─────────────────────────┐
│  Locale Configuration   │
│  (Django Settings)      │
│  - LANGUAGE_CODE        │
│  - LANGUAGES            │
│  - LOCALE_PATHS         │
└────────┬────────────────┘
         │ defines
         ▼
┌─────────────────────────┐
│  Translation Catalog    │
│  (.po/.mo files)        │
│  - msgid: key           │
│  - msgstr: translation  │
└────────┬────────────────┘
         │ used by
         ▼
┌─────────────────────────┐
│  Language Fallback      │
│  (Runtime Algorithm)    │
│  1. Requested language  │
│  2. Language family     │
│  3. Default language    │
│  4. msgid key           │
└─────────────────────────┘
```

**Flow**:
1. **Configuration** defines available languages and catalog locations
2. **Catalogs** provide translations for each language
3. **Fallback** resolves missing translations using configured hierarchy

---

## No Database Persistence

**Key Principle**: This feature uses **file-based** storage, not database models.

**Why No Database?**:
- Translation catalogs are version-controlled with application code
- Changes require application restart (compiled `.mo` files are cached)
- No need for per-user customization—translations are global
- Performance: File-based `.mo` format is optimized for fast lookups

**Future Extensions**:
If per-user language preferences are needed, a lightweight model could store:
```python
# Future extension (not part of this feature)
class UserLanguagePreference(models.Model):
    user = models.OneToOneField(User)
    language_code = models.CharField(max_length=10, choices=LANGUAGES)
```

But the core translation system remains file-based.

---

## File Organization

```
django-core/
├── src/
│   ├── locale/                      # Centralized catalogs
│   │   ├── en_US/
│   │   │   └── LC_MESSAGES/
│   │   │       ├── django.po       # Source translations
│   │   │       └── django.mo       # Compiled (generated)
│   │   └── fr/
│   │       └── LC_MESSAGES/
│   │           ├── django.po
│   │           └── django.mo
│   ├── config/
│   │   └── settings/
│   │       └── base.py             # Locale Configuration
│   └── my_app/
│       └── locale/                  # Per-app catalogs (optional)
│           └── en_US/
│               └── LC_MESSAGES/
│                   ├── django.po
│                   └── django.mo
```

**Hybrid Strategy**:
- **Centralized** (`src/locale/`): Shared translations across all apps
- **Per-app** (`src/my_app/locale/`): App-specific translations (optional)
- Django merges both at runtime

---

## Summary

| Entity | Storage | Purpose | Lifecycle |
|--------|---------|---------|-----------|
| **Translation Catalog** | `.po`/`.mo` files | Store translations | Edit → Compile → Deploy |
| **Locale Configuration** | Django settings | Define behavior | Set once → Restart server |
| **Language Fallback** | Runtime algorithm | Resolve missing translations | Automatic per request |

All entities are **configuration-based** with **no database tables**. Changes to catalogs or settings require file edits and application restart.
