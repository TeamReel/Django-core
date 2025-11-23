---
work_package_id: WP04
title: Structured Logging for Translation Events
lane: planned
subtasks:
  - T016
  - T017
  - T018
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
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

- [ ] `src/common/translation_logging.py` created with all functions
- [ ] Structured logging includes required fields (translation_key, language_code, fallback_reason)
- [ ] Functions properly typed with type hints
- [ ] Docstrings explain usage and parameters
- [ ] Logger uses 'django.translation' namespace
- [ ] Appropriate log levels (INFO for events, WARNING for fallback, ERROR for errors)

## Dependencies

- WP02 (settings), WP03 (locale structure)

## Reviewer Guidance

Verify structured logging fields match spec requirements: translation_key, language_code, fallback_reason.
