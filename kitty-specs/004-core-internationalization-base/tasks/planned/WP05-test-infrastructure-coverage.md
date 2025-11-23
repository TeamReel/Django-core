---
work_package_id: WP05
title: Test Infrastructure & Coverage
lane: planned
subtasks:
  - T019
  - T020
  - T021
  - T022
  - T023
  - T024
  - T025
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
---

# WP05: Test Infrastructure & Coverage

## Objective

Create comprehensive test suite for i18n/l10n functionality including fixtures, unit tests, integration tests, and achieve 80% line coverage target as specified in clarifications.

## Context

Per spec requirements and clarifications, target 80% line coverage for i18n configuration and logging utilities. Tests must cover translation loading, rendering, fallback behavior, middleware functionality, timezone handling, and workflow integration.

**Test Categories**:
1. Translation loading and rendering
2. Fallback behavior (missing translations)
3. Locale middleware functionality
4. Timezone handling (UTC storage)
5. Integration tests (makemessages/compilemessages workflow)

**Files to create**:
- `tests/fixtures/translations/en_US/LC_MESSAGES/django.po` (complete translation)
- `tests/fixtures/translations/fr/LC_MESSAGES/django.po` (partial translation for fallback testing)
- `tests/config/test_i18n_settings.py` (settings tests)
- `tests/common/test_translation_logging.py` (logging tests)

## Subtask Guidance

### T019: Create Test Fixtures with Sample .po Files

**Implementation**:
1. Create directory: `tests/fixtures/translations/en_US/LC_MESSAGES/`
2. Create `django.po` with sample translations:
```po
# Test translations for English
msgid ""
msgstr ""
"Language: en\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"

msgid "test.greeting"
msgstr "Hello, World!"

msgid "test.farewell"
msgstr "Goodbye!"
```

3. Create `tests/fixtures/translations/fr/LC_MESSAGES/django.po` (partial):
```po
# Partial French translations for fallback testing
msgid ""
msgstr ""
"Language: fr\n"

msgid "test.greeting"
msgstr "Bonjour, le monde!"

# test.farewell deliberately missing to test fallback
```

4. Compile fixtures: `django-admin compilemessages -l en_US -l fr` in tests/fixtures/translations/

**Acceptance**: Test fixtures with complete and partial translations for fallback testing.

---

### T020: Write Tests for Translation Loading and Rendering [P]

**Implementation** in `tests/config/test_i18n_settings.py`:
```python
import pytest
from django.test import TestCase, override_settings
from django.utils.translation import gettext, activate

class TranslationLoadingTest(TestCase):
    def test_english_translation_renders(self):
        activate('en')
        msg = gettext("test.greeting")
        self.assertEqual(msg, "Hello, World!")

    def test_translation_lazy_evaluation(self):
        from django.utils.translation import gettext_lazy
        msg = gettext_lazy("test.greeting")
        activate('en')
        self.assertEqual(str(msg), "Hello, World!")
```

**Acceptance**: Tests verify translation loading and rendering for configured languages.

---

### T021: Write Tests for Fallback Behavior [P]

**Implementation**:
```python
class TranslationFallbackTest(TestCase):
    def test_fallback_to_english_for_missing_translation(self):
        activate('fr')
        # test.farewell missing in French, should fall back
        msg = gettext("test.farewell")
        self.assertEqual(msg, "Goodbye!")  # English fallback

    def test_fallback_for_unconfigured_language(self):
        activate('de')  # German not configured
        msg = gettext("test.greeting")
        # Should fall back to English
        self.assertEqual(msg, "Hello, World!")
```

**Acceptance**: Tests verify fallback chain works correctly for missing translations.

---

### T022: Write Tests for Locale Middleware [P]

**Implementation**:
```python
from django.test import RequestFactory

class LocaleMiddlewareTest(TestCase):
    def test_middleware_activates_language(self):
        factory = RequestFactory()
        request = factory.get('/', HTTP_ACCEPT_LANGUAGE='fr')
        # Test that middleware processes Accept-Language header
        # Middleware should activate 'fr' if configured

    def test_middleware_ordering(self):
        from django.conf import settings
        mw = settings.MIDDLEWARE
        session_idx = mw.index('django.contrib.sessions.middleware.SessionMiddleware')
        locale_idx = mw.index('django.middleware.locale.LocaleMiddleware')
        self.assertLess(session_idx, locale_idx)
```

**Acceptance**: Tests verify middleware is present and correctly ordered.

---

### T023: Write Tests for Timezone Handling [P]

**Implementation**:
```python
from django.utils import timezone
from datetime import datetime

class TimezoneTest(TestCase):
    def test_datetime_stored_as_utc(self):
        now = timezone.now()
        self.assertEqual(now.tzinfo.zone, 'UTC')

    def test_naive_datetime_raises_warning(self):
        from django.conf import settings
        self.assertTrue(settings.USE_TZ)
        # Naive datetimes should trigger warnings with USE_TZ=True
```

**Acceptance**: Tests verify UTC timezone configuration and timezone-aware datetime handling.

---

### T024: Write Integration Tests for Translation Workflow [P]

**Implementation**:
```python
import subprocess
from pathlib import Path

class TranslationWorkflowTest(TestCase):
    def test_makemessages_creates_po_file(self):
        # Run makemessages command
        result = subprocess.run(
            ['python', 'manage.py', 'makemessages', '-l', 'en_US', '--dry-run'],
            capture_output=True
        )
        self.assertEqual(result.returncode, 0)

    def test_compilemessages_creates_mo_file(self):
        # Run compilemessages command
        result = subprocess.run(
            ['python', 'manage.py', 'compilemessages', '--locale=en_US'],
            capture_output=True
        )
        self.assertEqual(result.returncode, 0)
```

**Acceptance**: Integration tests verify makemessages and compilemessages commands work correctly.

---

### T025: Verify 80% Line Coverage Achieved

**Implementation**:
1. Run coverage:
```bash
pytest --cov=src/config/settings --cov=src/common/translation_logging --cov-report=term --cov-report=html
```

2. Check coverage report:
   - `src/config/settings/base.py`: i18n configuration lines covered
   - `src/common/translation_logging.py`: all logging functions covered

3. If coverage < 80%, add tests for uncovered lines

**Acceptance**: Coverage report shows ≥80% for config/settings and translation_logging modules.

---

## Definition of Done

- [ ] Test fixtures created with complete and partial translations
- [ ] Tests for translation loading and rendering passing
- [ ] Tests for fallback behavior passing
- [ ] Tests for locale middleware passing
- [ ] Tests for timezone handling passing
- [ ] Integration tests for makemessages/compilemessages passing
- [ ] Coverage report generated
- [ ] 80% line coverage achieved for target modules
- [ ] All tests pass: `pytest tests/config/test_i18n_settings.py tests/common/test_translation_logging.py`

## Dependencies

- WP02 (settings), WP03 (locale structure), WP04 (logging)

## Reviewer Guidance

Verify 80% coverage target met. Check test fixtures are properly formatted .po files.
