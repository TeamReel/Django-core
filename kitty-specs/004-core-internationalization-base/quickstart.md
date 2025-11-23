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

*Note: This document will be expanded in WP06 with complete workflow instructions for translation management.*
