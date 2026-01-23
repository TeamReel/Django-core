# Django Internationalization Quick Start

## Translation File Organization

This project uses a **hybrid translation organization** approach:

### Centralized Translations (src/locale/)

**Location**: `src/locale/<language_code>/LC_MESSAGES/`

**Use for**:
- Cross-cutting messages (authentication, authorization, common errors)
- Validation messages for shared models
- Common UI elements used across multiple apps
- System-wide status messages and notifications

**Example**:
```
src/locale/
├── en_US/
│   └── LC_MESSAGES/
│       ├── django.po
│       └── django.mo
└── fr/
    └── LC_MESSAGES/
        ├── django.po
        └── django.mo
```

### Per-App Translations (src/<app>/locale/)

**Location**: `src/<app_name>/locale/<language_code>/LC_MESSAGES/`

**Use for**:
- App-specific domain messages (e.g., constitution_engine rule descriptions)
- Feature-specific terminology unique to one app
- Messages that may evolve independently per app

**Example**:
```
src/constitution_engine/
├── locale/
│   ├── en_US/
│   │   └── LC_MESSAGES/
│   │       ├── django.po
│   │       └── django.mo
│   └── fr/
│       └── LC_MESSAGES/
│           ├── django.po
│           └── django.mo
└── core/
    └── engine.py
```

**Note**: Per-app locale directories are auto-detected by Django. You do NOT need to add them to `LOCALE_PATHS` in settings.

### Decision Matrix

| Message Type | Location | Example |
|--------------|----------|---------|
| Login success | Centralized | "You have successfully logged in" |
| Constitution rule error | Per-app | "Rule validation failed: circular dependency detected" |
| Generic validation | Centralized | "This field is required" |
| App feature help text | Per-app | "The Constitution Engine validates your project rules" |

### Creating Per-App Locale Directories

When you need app-specific translations:

1. Create directory structure:
   ```bash
   mkdir -p src/my_app/locale/en_US/LC_MESSAGES
   ```

2. Django auto-detects this directory (no settings change needed)

3. Run makemessages from app directory:
   ```bash
   cd src/my_app
   django-admin makemessages -l en_US
   ```

4. This creates `src/my_app/locale/en_US/LC_MESSAGES/django.po` with app-specific strings

---

## Marking Strings as Translatable

### Python Code

Import translation functions at the top of your Python files:

```python
from django.utils.translation import gettext, gettext_lazy
```

**For runtime translation** (views, functions executed per request):
```python
def my_view(request):
    message = gettext("Welcome to the application")
    return HttpResponse(message)
```

**For lazy evaluation** (model fields, class attributes, module-level constants):
```python
from django.db import models
from django.utils.translation import gettext_lazy

class MyModel(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name=gettext_lazy("Name")
    )
    description = models.TextField(
        help_text=gettext_lazy("Enter a detailed description")
    )
```

**Why lazy?** `gettext_lazy()` delays translation until the string is rendered, ensuring it uses the active language at request time (not at module import time).

**With variables** (use Python % formatting):
```python
from django.utils.translation import gettext

def welcome_user(username):
    message = gettext("Hello, %(username)s") % {'username': username}
    return message
```

**Pluralization** (use `ngettext`):
```python
from django.utils.translation import ngettext

def item_count_message(count):
    return ngettext(
        "There is %(count)d item",
        "There are %(count)d items",
        count
    ) % {'count': count}
```

### Django Templates

Load the i18n template tags at the top of your template:

```django
{% load i18n %}
```

**Simple translation**:
```django
<h1>{% trans "Welcome" %}</h1>
<p>{% trans "This is a simple message" %}</p>
```

**With variables**:
```django
{% blocktrans with name=user.name %}
    Hello, {{ name }}! Welcome back.
{% endblocktrans %}
```

**Multiple variables**:
```django
{% blocktrans with username=user.username count=messages.count %}
    {{ username }}, you have {{ count }} new messages.
{% endblocktrans %}
```

**Pluralization**:
```django
{% blocktrans count counter=items|length %}
    There is {{ counter }} item in your cart.
{% plural %}
    There are {{ counter }} items in your cart.
{% endblocktrans %}
```

**With context** (for disambiguation):
```django
{# "May" as the month #}
<p>{% trans "May" context "month" %}</p>

{# "May" as the modal verb #}
<p>{% trans "May" context "verb" %}</p>
```

**Translation in template tags**:
```django
<input type="text" placeholder="{% trans 'Enter your name' %}">
<button title="{% trans 'Click to submit' %}">{% trans "Submit" %}</button>
```

---

## Generating Translation Files

### Extract Translatable Strings

Run `makemessages` to scan your codebase and extract all marked strings into `.po` files:

**For centralized translations**:
```bash
# From project root
django-admin makemessages -l en_US

# This creates/updates: src/locale/en_US/LC_MESSAGES/django.po
```

**For per-app translations**:
```bash
# Navigate to app directory
cd src/my_app

# Extract strings for this app only
django-admin makemessages -l en_US

# This creates/updates: src/my_app/locale/en_US/LC_MESSAGES/django.po
```

**For multiple languages at once**:
```bash
django-admin makemessages -l en_US -l fr -l es
```

**Include/exclude specific file types**:
```bash
# Extract from Python and template files (default)
django-admin makemessages -l en_US

# Exclude specific paths
django-admin makemessages -l en_US --ignore=venv/* --ignore=tests/*
```

**Output**: This command creates or updates `.po` files with entries like:
```po
msgid "Welcome to the application"
msgstr ""
```

The `msgstr` is empty for new messages—translators fill this in.

### Edit Translation Files

Open the generated `.po` file in a text editor or specialized tool like [Poedit](https://poedit.net/):

```po
# src/locale/en_US/LC_MESSAGES/django.po

msgid ""
msgstr ""
"Language: en\n"
"Content-Type: text/plain; charset=UTF-8\n"

msgid "Welcome to the application"
msgstr "Welcome to the application"  # Edit this line

msgid "Hello, %(username)s"
msgstr "Hello, %(username)s"

msgid "There is %(count)d item"
msgid_plural "There are %(count)d items"
msgstr[0] "There is %(count)d item"
msgstr[1] "There are %(count)d items"
```

**For non-English translations** (e.g., French):
```po
# src/locale/fr/LC_MESSAGES/django.po

msgid "Welcome to the application"
msgstr "Bienvenue dans l'application"

msgid "Hello, %(username)s"
msgstr "Bonjour, %(username)s"
```

**Tips**:
- Keep variable placeholders like `%(username)s` unchanged
- Preserve the order and format of placeholders
- Use proper Unicode characters (the file is UTF-8)
- Add translator comments with `#` for context

---

## Compiling Translations

After editing `.po` files, compile them to binary `.mo` format for Django to use:

```bash
# From project root (compiles all locales)
django-admin compilemessages
```

This creates/updates `.mo` files:
```
src/locale/en_US/LC_MESSAGES/django.mo
src/locale/fr/LC_MESSAGES/django.mo
```

**Per-app compilation**:
```bash
cd src/my_app
django-admin compilemessages
```

**Verify compilation**:
```bash
# Check that .mo files are newer than .po files
ls -la src/locale/en_US/LC_MESSAGES/
```

**When to compile**:
- ✅ After editing any `.po` file
- ✅ Before deploying to production
- ✅ After pulling translation updates from version control
- ✅ Before running tests that verify translations

**Important**: Django reads `.mo` files, not `.po` files. Always compile after changes!

**Troubleshooting**:
If `compilemessages` fails with "Can't find msgfmt":
- **Linux/Mac**: Install `gettext` package
  ```bash
  # Ubuntu/Debian
  sudo apt-get install gettext

  # macOS
  brew install gettext
  ```
- **Windows**: Install [gettext for Windows](http://gnuwin32.sourceforge.net/packages/gettext.htm)

---

## Adding a New Language

### Step 1: Update LANGUAGES setting

Edit `src/config/settings/base.py`:

```python
LANGUAGES = [
    ('en', 'English'),
    ('fr', 'French'),  # Add new language
    ('es', 'Spanish'), # Add another
]
```

### Step 2: Generate translation file

```bash
# From project root
django-admin makemessages -l fr

# This creates: src/locale/fr/LC_MESSAGES/django.po
```

### Step 3: Translate strings

Open `src/locale/fr/LC_MESSAGES/django.po` and fill in translations:

```po
msgid "Welcome to the application"
msgstr "Bienvenue dans l'application"

msgid "Hello, %(username)s"
msgstr "Bonjour, %(username)s"
```

### Step 4: Compile translations

```bash
django-admin compilemessages
```

### Step 5: Restart Django server

```bash
# Kill the running server (Ctrl+C) and restart
python manage.py runserver
```

**Verify**: The new language is now available. Django's `LocaleMiddleware` will detect it from:
1. User's session language preference (if stored)
2. Browser's `Accept-Language` header
3. Or use default (`LANGUAGE_CODE`)

---

## Testing Translations

### In Automated Tests

Use Django's test utilities to verify translations:

```python
from django.test import TestCase
from django.utils.translation import activate, gettext

class TranslationTest(TestCase):
    def test_french_translation(self):
        # Activate French
        activate('fr')

        # Test translation
        msg = gettext("Welcome to the application")
        self.assertEqual(msg, "Bienvenue dans l'application")

    def test_pluralization(self):
        activate('en')

        from django.utils.translation import ngettext

        # Singular
        msg = ngettext(
            "There is %(count)d item",
            "There are %(count)d items",
            1
        ) % {'count': 1}
        self.assertIn("is", msg)

        # Plural
        msg = ngettext(
            "There is %(count)d item",
            "There are %(count)d items",
            5
        ) % {'count': 5}
        self.assertIn("are", msg)
```

**Test fallback behavior**:
```python
def test_translation_fallback(self):
    # Request language that doesn't exist
    activate('de')

    # Should fall back to default (en-us)
    msg = gettext("Welcome to the application")
    self.assertEqual(msg, "Welcome to the application")
```

**Use test fixtures** for translation files:
```python
# tests/fixtures/translations/en_US/LC_MESSAGES/django.po
LOCALE_PATHS = [
    BASE_DIR / "tests" / "fixtures" / "translations"
]
```

### Manual Testing

**Method 1: Browser Developer Tools**

1. Open browser dev tools (F12)
2. Go to Network tab → Enable "Preserve log"
3. Add custom `Accept-Language` header:
   ```
   Accept-Language: fr,fr-FR;q=0.9,en;q=0.8
   ```
4. Reload page
5. Verify French content appears

**Method 2: Django Admin Language Selector**

If you have user language preferences implemented:
1. Log in to Django admin
2. Select language from user preferences
3. Navigate site to verify translations

**Method 3: URL Language Prefix**

If using Django's i18n URL patterns:
1. Visit `/fr/` instead of `/`
2. Language is set for the session
3. All pages now show French

**Method 4: Python Shell**

```python
python manage.py shell

from django.utils.translation import activate, gettext

activate('fr')
print(gettext("Welcome to the application"))
# Output: "Bienvenue dans l'application"
```

**Check for missing translations**:
```bash
# Run makemessages with --all to see untranslated strings
django-admin makemessages -l fr --all

# Open the .po file and search for empty msgstr entries
grep -A 1 "msgstr \"\"" src/locale/fr/LC_MESSAGES/django.po
```

**Logging translation events**:

The project includes structured logging for translation operations (see `src/common/translation_logging.py`):

```python
import logging
from common.translation_logging import log_translation_event

# Log translation loading
log_translation_event(
    event_type='translation_loaded',
    language_code='fr',
    translation_key='user.created.success',
    message='Translation loaded successfully'
)
```

Check logs for fallback warnings:
```bash
# In local development
tail -f logs/django.log | grep translation

# Look for WARNING level logs indicating fallback occurred
```

---

*Note: This document will be expanded in WP06 with complete workflow instructions for translation management.*
