---
work_package_id: WP02
title: Django Settings Configuration
lane: planned
subtasks:
  - T006
  - T007
  - T008
  - T009
  - T010
  - T011
  - T012
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
---

# WP02: Django Settings Configuration

## Objective

Configure Django's internationalization (i18n) and localization (l10n) settings across all environment configurations (base, local, production, staging) to enable the translation infrastructure.

## Context

This work package implements the core Django settings required for i18n/l10n functionality. These settings enable translation framework, configure default language and timezone, define available languages, and integrate middleware for language detection.

**Files to modify**:
- `src/config/settings/base.py` (primary configuration)
- `src/config/settings/local.py` (verify inheritance)
- `src/config/settings/production.py` (verify inheritance)
- `src/config/settings/staging.py` (verify inheritance)

**Settings to configure**:
1. `LANGUAGE_CODE`: Default language (English US)
2. `TIME_ZONE`: Default timezone (UTC)
3. `USE_I18N`: Enable internationalization
4. `USE_L10N`: Enable localization (deprecated in Django 5.0+ but harmless)
5. `USE_TZ`: Enable timezone support
6. `LANGUAGES`: Tuple of available languages
7. `LOCALE_PATHS`: List of directories containing translation files
8. `MIDDLEWARE`: Add LocaleMiddleware for language detection

**Reference**:
- Django i18n settings: https://docs.djangoproject.com/en/5.1/ref/settings/#globalization-i18n-l10n
- Constitution: No breaking changes to existing functionality

## Subtask Guidance

### T006: Set LANGUAGE_CODE='en-us' in settings/base.py

**What to deliver**: LANGUAGE_CODE configured to English (US) as default.

**Implementation**:
1. Open `src/config/settings/base.py`
2. Locate existing LANGUAGE_CODE setting (if present) or add in i18n section
3. Set value: `LANGUAGE_CODE = 'en-us'`
4. Add comment if helpful: `# Default language for all server-rendered content`

**Expected location**: Near other i18n/l10n settings, typically after database configuration and before middleware.

**Acceptance**:
- LANGUAGE_CODE = 'en-us' present in base.py
- Setting is properly formatted (single quotes, lowercase with hyphen)

---

### T007: Set TIME_ZONE='UTC' in settings/base.py

**What to deliver**: TIME_ZONE configured to UTC for all datetime operations.

**Implementation**:
1. In `src/config/settings/base.py`
2. Locate existing TIME_ZONE setting (may default to 'America/Chicago' in Django projects)
3. Update to: `TIME_ZONE = 'UTC'`
4. Add comment: `# UTC for all server-side datetime operations`

**Rationale**: UTC ensures consistent time handling across geographic boundaries and prepares for future per-user timezone preferences (B12).

**Acceptance**:
- TIME_ZONE = 'UTC' present in base.py
- No hardcoded timezone references elsewhere in settings

---

### T008: Enable i18n/l10n Flags in settings/base.py

**What to deliver**: USE_I18N, USE_L10N, USE_TZ all set to True.

**Implementation**:
1. In `src/config/settings/base.py`
2. Set these three flags (create if missing, update if present):
   ```python
   # Internationalization
   USE_I18N = True  # Enable Django translation system

   # Localization
   USE_L10N = True  # Enable localized formatting (deprecated Django 5.0+, but harmless)

   # Timezone support
   USE_TZ = True  # Store datetimes as timezone-aware (UTC)
   ```
3. Add comments explaining each flag
4. Keep flags together in a clear "Internationalization" section

**Note**: USE_L10N is deprecated in Django 5.0+ (localization is always on), but including it explicitly documents intent and maintains backward compatibility.

**Acceptance**:
- All three flags present and set to True
- Flags grouped together with clear comments
- No conflicting settings elsewhere

---

### T009: Configure LANGUAGES List in settings/base.py

**What to deliver**: LANGUAGES tuple with English (US) as initial supported language.

**Implementation**:
1. In `src/config/settings/base.py`
2. Add LANGUAGES setting:
   ```python
   # Available languages for content translation
   LANGUAGES = [
       ('en', 'English'),
   ]
   ```
3. Add comment noting this is extensible: `# Additional languages can be added without code changes`
4. Use list format for easier future additions (vs tuple)

**Design notes**:
- Format: List of tuples (language_code, display_name)
- Language code 'en' matches 'en-us' via fallback (Django handles this)
- Future additions: [('en', 'English'), ('fr', 'French'), ('de', 'German')]
- Matches FR-007: "System MUST support addition of new languages through configuration without code changes"

**Acceptance**:
- LANGUAGES list present with English entry
- Comment indicates extensibility
- Format matches Django expectations: list of (code, name) tuples

---

### T010: Configure LOCALE_PATHS in settings/base.py [P]

**What to deliver**: LOCALE_PATHS pointing to centralized translation directory.

**Implementation**:
1. In `src/config/settings/base.py`
2. Ensure BASE_DIR is defined (should exist already): `BASE_DIR = Path(__file__).resolve().parent.parent.parent`
3. Add LOCALE_PATHS setting:
   ```python
   # Translation file directories
   LOCALE_PATHS = [
       BASE_DIR / 'locale',  # Centralized translations for core messages
   ]
   ```
4. Add comment noting per-app locale/ directories are auto-detected
5. Verify BASE_DIR points to `src/` directory (parent of `config/`)

**Path structure**:
- BASE_DIR: `src/`
- LOCALE_PATHS: `['src/locale']`
- Per-app paths auto-detected: `src/<app>/locale` (no configuration needed)

**Parallel opportunity**: Can be done simultaneously with T006-T009 (different sections of base.py).

**Acceptance**:
- LOCALE_PATHS list present with BASE_DIR / 'locale' entry
- Path is relative to BASE_DIR (not hardcoded)
- Comment documents centralized vs per-app distinction

---

### T011: Add LocaleMiddleware to MIDDLEWARE in settings/base.py

**What to deliver**: LocaleMiddleware inserted at correct position in MIDDLEWARE list.

**Implementation**:
1. In `src/config/settings/base.py`
2. Locate MIDDLEWARE list (should exist with Django defaults)
3. Add LocaleMiddleware **after SessionMiddleware** and **before CommonMiddleware**:
   ```python
   MIDDLEWARE = [
       'django.middleware.security.SecurityMiddleware',
       'django.contrib.sessions.middleware.SessionMiddleware',  # Must be before LocaleMiddleware
       'django.middleware.locale.LocaleMiddleware',  # <-- ADD THIS
       'django.middleware.common.CommonMiddleware',
       # ... rest of middleware
   ]
   ```
4. Add inline comment: `# Language detection and activation`

**Critical ordering**:
- **After SessionMiddleware**: LocaleMiddleware may use session to store language preference
- **Before CommonMiddleware**: Language must be active before CommonMiddleware processes URLs
- Incorrect ordering = language detection fails or session issues

**Reference**: https://docs.djangoproject.com/en/5.1/topics/i18n/translation/#how-django-discovers-language-preference

**Acceptance**:
- LocaleMiddleware present in MIDDLEWARE list
- Position: After SessionMiddleware, before CommonMiddleware
- Comment documents purpose

---

### T012: Verify Settings Inheritance in local.py, production.py, staging.py [P]

**What to deliver**: Confirmation that all environment configs inherit i18n/l10n settings from base.py.

**Implementation**:
1. Open `src/config/settings/local.py`
   - Verify it imports from base: `from .base import *`
   - Verify no i18n/l10n settings are overridden
   - If overrides exist, document rationale (e.g., development-only behavior)

2. Open `src/config/settings/production.py`
   - Verify it imports from base: `from .base import *`
   - Verify no i18n/l10n settings are overridden
   - Production MUST use same i18n config as base

3. Open `src/config/settings/staging.py`
   - Verify it imports from base: `from .base import *`
   - Verify no i18n/l10n settings are overridden
   - Staging MUST match production i18n config

4. If any overrides are found:
   - Evaluate if override is necessary
   - Document in comment why environment-specific config is needed
   - Ensure override doesn't break i18n functionality

**Parallel opportunity**: Can be done after T006-T011 are complete (independent verification task).

**Acceptance**:
- All three environment configs import from base
- No i18n/l10n overrides unless justified and documented
- Settings inheritance verified (no accidental overrides)

---

## Verification & Testing

After completing all subtasks, verify configuration:

1. **Django Check Command**:
   ```bash
   python manage.py check
   ```
   Expected: No errors, no warnings related to i18n/l10n

2. **Settings Inspection**:
   ```bash
   python manage.py shell
   >>> from django.conf import settings
   >>> settings.LANGUAGE_CODE
   'en-us'
   >>> settings.TIME_ZONE
   'UTC'
   >>> settings.USE_I18N
   True
   >>> settings.LANGUAGES
   [('en', 'English')]
   >>> settings.LOCALE_PATHS
   [PosixPath('/path/to/src/locale')]
   >>> 'django.middleware.locale.LocaleMiddleware' in settings.MIDDLEWARE
   True
   ```

3. **Middleware Order Check**:
   ```python
   from django.conf import settings
   mw_list = settings.MIDDLEWARE
   session_idx = mw_list.index('django.contrib.sessions.middleware.SessionMiddleware')
   locale_idx = mw_list.index('django.middleware.locale.LocaleMiddleware')
   common_idx = mw_list.index('django.middleware.common.CommonMiddleware')
   assert session_idx < locale_idx < common_idx, "Middleware ordering incorrect"
   ```

4. **No Breaking Changes**:
   - Run existing test suite: `pytest`
   - Expected: All tests pass (no regressions)

## Definition of Done

- [ ] LANGUAGE_CODE = 'en-us' in base.py
- [ ] TIME_ZONE = 'UTC' in base.py
- [ ] USE_I18N = True in base.py
- [ ] USE_L10N = True in base.py (harmless even if deprecated)
- [ ] USE_TZ = True in base.py
- [ ] LANGUAGES = [('en', 'English')] in base.py
- [ ] LOCALE_PATHS = [BASE_DIR / 'locale'] in base.py
- [ ] LocaleMiddleware in MIDDLEWARE list (correct position)
- [ ] local.py inherits settings correctly (no overrides or justified overrides)
- [ ] production.py inherits settings correctly (no overrides)
- [ ] staging.py inherits settings correctly (no overrides)
- [ ] `python manage.py check` passes with no i18n-related errors/warnings
- [ ] Settings inspection shows correct values
- [ ] Middleware ordering verified (SessionMiddleware < LocaleMiddleware < CommonMiddleware)
- [ ] Existing test suite passes (no regressions)

## Risks & Mitigations

**Risk**: LocaleMiddleware positioned incorrectly → language detection fails
**Mitigation**: Clear ordering requirement documented, verification step checks position

**Risk**: Settings already configured differently → conflict with new config
**Mitigation**: Review existing settings before modifying, document any intentional differences

**Risk**: BASE_DIR path incorrect → LOCALE_PATHS points to wrong directory
**Mitigation**: Verify BASE_DIR definition first, test path resolution

**Risk**: Environment configs override base settings → inconsistent behavior across environments
**Mitigation**: T012 explicitly verifies no unintended overrides

## Dependencies

- None (can run in parallel with WP01)

## Reviewer Guidance

**What to verify**:
1. All 7 i18n/l10n settings present in base.py
2. LocaleMiddleware correctly positioned (after Session, before Common)
3. LOCALE_PATHS uses BASE_DIR (relative, not hardcoded)
4. LANGUAGES is a list (not tuple) for future extensibility
5. No environment configs override i18n/l10n settings (unless justified)
6. `python manage.py check` passes
7. No regression in existing tests

**What NOT to focus on**:
- Translation files don't exist yet (WP03 handles that)
- Logging infrastructure not yet implemented (WP04 handles that)
- Tests for i18n not yet written (WP05 handles that)

**Red flags**:
- LocaleMiddleware in wrong position
- Hardcoded paths instead of BASE_DIR
- Missing any of the 7 core settings
- Environment configs with unexplained overrides
- Django check command shows warnings/errors
- Existing test suite fails after changes
