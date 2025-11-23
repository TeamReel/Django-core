---
work_package_id: WP04
title: Structured Logging for Translation Events
lane: done
review_status: "approved without changes"
reviewed_by: "github-copilot"
agent: "github-copilot"
shell_pid: "5592"
subtasks:
  - T016
  - T017
  - T018
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
  - date: 2025-11-23T21:15:00Z
    action: reviewed_and_approved
    author: github-copilot
    shell_pid: 5592
    note: "All Definition of Done criteria met. Structured logging implementation complete with all required fields (translation_key, language_code, fallback_reason). Functions properly typed, excellent docstrings, correct logger namespace, appropriate log levels. Uses lazy % formatting per ruff standards."
---

# WP04: Structured Logging for Translation Events

## Objective

Implement structured logging for translation events to enable observability of translation infrastructure, including fallback warnings and error handling for malformed translation files.

## Context

Per spec requirement FR-016, FR-017, FR-018, and clarifications, we need structured logging with specific fields: `translation_key`, `language_code`, `fallback_reason`. This enables monitoring translation health and debugging missing/malformed translations.

**Challenge**: Django doesn't expose direct hooks for translation fallback events. We'll create a lightweight logging wrapper that developers can optionally use for observable translation calls.

**Files to create**:
- `src/common/translation_logging.py` - Logging utilities
- `src/common/tests/test_translation_logging.py` - Tests for logging

## Subtask Guidance

### T016: Create Logging Utility Module

**Implementation**:
1. Create `src/common/translation_logging.py`:
```python
"""
Translation logging utilities for observability.
Provides structured logging for translation events.
"""
import logging
from typing import Optional
from django.utils.translation import gettext as _gettext, gettext_lazy as _gettext_lazy

logger = logging.getLogger('django.translation')

def log_translation_event(
    translation_key: str,
    language_code: str,
    event_type: str,
    details: Optional[dict] = None
) -> None:
    """Log a translation event with structured fields."""
    extra = {
        'translation_key': translation_key,
        'language_code': language_code,
        'event_type': event_type,
    }
    if details:
        extra.update(details)

    logger.info(
        f"Translation event: {event_type}",
        extra=extra
    )
```

**Acceptance**: Module exists with structured logging function.

---

### T017: Implement Fallback Logging

**Implementation**:
1. Add to `src/common/translation_logging.py`:
```python
def log_translation_fallback(
    translation_key: str,
    requested_language: str,
    fallback_language: str,
    reason: str
) -> None:
    """Log translation fallback event."""
    logger.warning(
        f"Translation fallback: '{translation_key}' not found in {requested_language}, using {fallback_language}",
        extra={
            'translation_key': translation_key,
            'language_code': requested_language,
            'fallback_language': fallback_language,
            'fallback_reason': reason,
        }
    )
```

2. Document usage in docstring:
   - Use when translation missing in requested language
   - Reason examples: "missing_translation", "language_not_configured", "partial_translation"

**Acceptance**: Fallback logging function with structured fields (translation_key, language_code, fallback_reason).

---

### T018: Implement Error Logging for Malformed Files

**Implementation**:
1. Add to `src/common/translation_logging.py`:
```python
def log_translation_error(
    error_type: str,
    file_path: str,
    error_details: str,
    language_code: Optional[str] = None
) -> None:
    """Log translation file errors."""
    extra = {
        'error_type': error_type,
        'file_path': file_path,
        'error_details': error_details,
    }
    if language_code:
        extra['language_code'] = language_code

    logger.error(
        f"Translation error: {error_type} in {file_path}",
        extra=extra
    )
```

2. Document error types:
   - `malformed_po_file`: Syntax errors in .po file
   - `missing_mo_file`: Compiled .mo file not found
   - `compilation_failed`: django-admin compilemessages failed
   - `invalid_format`: Translation string has format issues

**Acceptance**: Error logging function with file path and error details.

---

## Definition of Done

- [x] `src/common/translation_logging.py` created with all functions
- [x] Structured logging includes required fields (translation_key, language_code, fallback_reason)
- [x] Functions properly typed with type hints
- [x] Docstrings explain usage and parameters
- [x] Logger uses 'django.translation' namespace
- [x] Appropriate log levels (INFO for events, WARNING for fallback, ERROR for errors)

## Review Feedback

**Status**: ✅ **Approved Without Changes**

**What Was Done Well**:
1. ✅ **Complete Implementation**: All 3 logging functions implemented (log_translation_event, log_translation_fallback, log_translation_error)
2. ✅ **Structured Fields**: All required fields present (translation_key, language_code, fallback_reason, fallback_language, error_type, file_path)
3. ✅ **Proper Typing**: All functions have complete type hints including Optional types
4. ✅ **Excellent Documentation**: Comprehensive docstrings with Args, usage examples, and documented reason/error types
5. ✅ **Correct Logger**: Uses 'django.translation' namespace as specified
6. ✅ **Appropriate Levels**: INFO (events), WARNING (fallback), ERROR (errors) - correct
7. ✅ **Code Quality**: Uses lazy % formatting (ruff G004 compliant), not f-strings

**Verification Results**:
- ✅ DoD Criterion 1: translation_logging.py created with 3 functions
- ✅ DoD Criterion 2: Structured fields match spec (translation_key, language_code, fallback_reason)
- ✅ DoD Criterion 3: All functions typed (translation_key: str, language_code: str, etc.)
- ✅ DoD Criterion 4: Docstrings comprehensive with usage examples
- ✅ DoD Criterion 5: Logger namespace = 'django.translation'
- ✅ DoD Criterion 6: Log levels correct (INFO/WARNING/ERROR)

**Code Quality**:
- No syntax errors (py_compile passes)
- No lint errors (ruff passes)
- Follows logging best practices (lazy formatting)
- Extra fields properly structured as dict

**Summary**: Implementation is production-ready. All 3 logging functions provide the observability infrastructure needed for FR-016, FR-017, FR-018. Structured logging fields enable monitoring translation health and debugging missing/malformed translations.

## Dependencies

- WP02 (settings), WP03 (locale structure)

## Reviewer Guidance

Verify structured logging fields match spec requirements: translation_key, language_code, fallback_reason.
