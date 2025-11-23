"""
Translation logging utilities for observability.

Provides structured logging for translation events to enable monitoring
of translation infrastructure health, including fallback warnings and
error handling for malformed translation files.

Usage:
    from common.translation_logging import (
        log_translation_event,
        log_translation_fallback,
        log_translation_error,
    )

    # Log a translation fallback
    log_translation_fallback(
        translation_key='user.login.success',
        requested_language='fr',
        fallback_language='en-us',
        reason='missing_translation'
    )

    # Log a translation error
    log_translation_error(
        error_type='malformed_po_file',
        file_path='src/locale/fr/LC_MESSAGES/django.po',
        error_details='Syntax error at line 42: Unterminated string',
        language_code='fr'
    )
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger("django.translation")


def log_translation_event(
    translation_key: str,
    language_code: str,
    event_type: str,
    details: Optional[dict] = None,
) -> None:
    """
    Log a translation event with structured fields.

    Args:
        translation_key: Message ID being translated (e.g., 'user.created.success')
        language_code: Target language (e.g., 'fr-CA')
        event_type: Type of event (e.g., 'rendered', 'cached', 'loaded')
        details: Optional additional context

    Example:
        log_translation_event(
            translation_key='user.login.success',
            language_code='en-us',
            event_type='rendered'
        )
    """
    extra = {
        "translation_key": translation_key,
        "language_code": language_code,
        "event_type": event_type,
    }
    if details:
        extra.update(details)

    logger.info("Translation event: %s", event_type, extra=extra)


def log_translation_fallback(
    translation_key: str,
    requested_language: str,
    fallback_language: str,
    reason: str,
) -> None:
    """
    Log translation fallback event (WARNING level).

    Called when a translation is not found in the requested language
    and Django falls back to another language.

    Args:
        translation_key: Message ID being translated
        requested_language: Language originally requested
        fallback_language: Language used as fallback
        reason: Why fallback occurred

    Fallback reasons:
        - 'missing_translation': String not translated in target language
        - 'language_not_configured': Language not in settings.LANGUAGES
        - 'malformed_file': .po file has syntax errors
        - 'missing_mo_file': Compiled .mo file not found
        - 'partial_translation': Some strings translated, this one missing

    Example:
        log_translation_fallback(
            translation_key='user.password.reset',
            requested_language='fr',
            fallback_language='en-us',
            reason='missing_translation'
        )
    """
    logger.warning(
        "Translation fallback: '%s' not found in %s, using %s",
        translation_key,
        requested_language,
        fallback_language,
        extra={
            "translation_key": translation_key,
            "language_code": requested_language,
            "fallback_language": fallback_language,
            "fallback_reason": reason,
        },
    )


def log_translation_error(
    error_type: str,
    file_path: str,
    error_details: str,
    language_code: Optional[str] = None,
) -> None:
    """
    Log translation file errors (ERROR level).

    Called when translation files cannot be loaded or compiled due to
    errors in the file format or missing files.

    Args:
        error_type: Type of error encountered
        file_path: Path to the problematic translation file
        error_details: Detailed error message
        language_code: Optional language code if known

    Error types:
        - 'malformed_po_file': Syntax errors in .po file
        - 'missing_mo_file': Compiled .mo file not found
        - 'compilation_failed': django-admin compilemessages failed
        - 'invalid_format': Translation string has format issues

    Example:
        log_translation_error(
            error_type='malformed_po_file',
            file_path='src/locale/de/LC_MESSAGES/django.po',
            error_details='msgstr on line 89 is not properly closed',
            language_code='de'
        )
    """
    extra = {
        "error_type": error_type,
        "file_path": file_path,
        "error_details": error_details,
    }
    if language_code:
        extra["language_code"] = language_code

    logger.error("Translation error: %s in %s", error_type, file_path, extra=extra)
