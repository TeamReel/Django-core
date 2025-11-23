"""
Tests for translation logging utilities.

Verifies structured logging functions for translation events, fallback warnings,
and error handling.
"""

import logging
from unittest.mock import MagicMock, patch

import pytest
from django.test import TestCase

from common.translation_logging import (
    log_translation_error,
    log_translation_event,
    log_translation_fallback,
)


class TranslationLoggingTest(TestCase):
    """Test translation logging utilities."""

    def setUp(self):
        """Set up test fixtures."""
        self.logger_patcher = patch("common.translation_logging.logger")
        self.mock_logger = self.logger_patcher.start()

    def tearDown(self):
        """Clean up patches."""
        self.logger_patcher.stop()

    def test_log_translation_event_info_level(self):
        """Verify log_translation_event uses INFO level."""
        log_translation_event(
            translation_key="test.greeting",
            language_code="en-us",
            event_type="rendered",
        )

        self.mock_logger.info.assert_called_once()
        call_args = self.mock_logger.info.call_args
        # Verify message format
        self.assertIn("rendered", call_args[0])

    def test_log_translation_event_structured_fields(self):
        """Verify log_translation_event includes structured fields."""
        log_translation_event(
            translation_key="test.greeting",
            language_code="en-us",
            event_type="rendered",
        )

        call_kwargs = self.mock_logger.info.call_args.kwargs
        extra = call_kwargs["extra"]

        self.assertEqual(extra["translation_key"], "test.greeting")
        self.assertEqual(extra["language_code"], "en-us")
        self.assertEqual(extra["event_type"], "rendered")

    def test_log_translation_event_with_details(self):
        """Verify log_translation_event merges additional details."""
        log_translation_event(
            translation_key="test.greeting",
            language_code="en-us",
            event_type="cached",
            details={"cache_hit": True, "ttl": 3600},
        )

        call_kwargs = self.mock_logger.info.call_args.kwargs
        extra = call_kwargs["extra"]

        self.assertEqual(extra["translation_key"], "test.greeting")
        self.assertEqual(extra["cache_hit"], True)
        self.assertEqual(extra["ttl"], 3600)

    def test_log_translation_fallback_warning_level(self):
        """Verify log_translation_fallback uses WARNING level."""
        log_translation_fallback(
            translation_key="test.farewell",
            requested_language="fr",
            fallback_language="en-us",
            reason="missing_translation",
        )

        self.mock_logger.warning.assert_called_once()

    def test_log_translation_fallback_structured_fields(self):
        """Verify log_translation_fallback includes all required fields."""
        log_translation_fallback(
            translation_key="test.farewell",
            requested_language="fr",
            fallback_language="en-us",
            reason="missing_translation",
        )

        call_kwargs = self.mock_logger.warning.call_args.kwargs
        extra = call_kwargs["extra"]

        self.assertEqual(extra["translation_key"], "test.farewell")
        self.assertEqual(extra["language_code"], "fr")
        self.assertEqual(extra["fallback_language"], "en-us")
        self.assertEqual(extra["fallback_reason"], "missing_translation")

    def test_log_translation_fallback_message_format(self):
        """Verify log_translation_fallback message is readable."""
        log_translation_fallback(
            translation_key="test.farewell",
            requested_language="fr",
            fallback_language="en-us",
            reason="missing_translation",
        )

        call_args = self.mock_logger.warning.call_args[0]
        # Message should mention the key and languages
        self.assertIn("test.farewell", call_args)
        self.assertIn("fr", call_args)
        self.assertIn("en-us", call_args)

    def test_log_translation_error_error_level(self):
        """Verify log_translation_error uses ERROR level."""
        log_translation_error(
            error_type="malformed_po_file",
            file_path="src/locale/fr/LC_MESSAGES/django.po",
            error_details="Syntax error at line 42",
        )

        self.mock_logger.error.assert_called_once()

    def test_log_translation_error_structured_fields(self):
        """Verify log_translation_error includes error details."""
        log_translation_error(
            error_type="malformed_po_file",
            file_path="src/locale/fr/LC_MESSAGES/django.po",
            error_details="Syntax error at line 42",
            language_code="fr",
        )

        call_kwargs = self.mock_logger.error.call_args.kwargs
        extra = call_kwargs["extra"]

        self.assertEqual(extra["error_type"], "malformed_po_file")
        self.assertEqual(extra["file_path"], "src/locale/fr/LC_MESSAGES/django.po")
        self.assertEqual(extra["error_details"], "Syntax error at line 42")
        self.assertEqual(extra["language_code"], "fr")

    def test_log_translation_error_without_language_code(self):
        """Verify log_translation_error works without language_code."""
        log_translation_error(
            error_type="compilation_failed",
            file_path="src/locale/django.pot",
            error_details="Permission denied",
        )

        call_kwargs = self.mock_logger.error.call_args.kwargs
        extra = call_kwargs["extra"]

        self.assertNotIn("language_code", extra)
        self.assertEqual(extra["error_type"], "compilation_failed")

    def test_logger_namespace(self):
        """Verify logger uses django.translation namespace."""
        # Import the actual module (not mocked) to check logger initialization
        import importlib
        import common.translation_logging as tl_module

        # Reload to get actual logger instance
        importlib.reload(tl_module)

        self.assertEqual(tl_module.logger.name, "django.translation")


class TranslationLoggingIntegrationTest(TestCase):
    """Integration tests for translation logging."""

    def test_logging_functions_callable(self):
        """Verify all logging functions are callable."""
        # This test ensures functions exist and can be called
        # without mocking - they should not raise exceptions

        with self.assertLogs("django.translation", level="INFO") as cm:
            log_translation_event(
                translation_key="test.greeting",
                language_code="en-us",
                event_type="test",
            )
            # Should produce at least one log entry
            self.assertGreater(len(cm.output), 0)

    def test_fallback_logging_produces_warning(self):
        """Verify fallback logging produces WARNING level logs."""
        with self.assertLogs("django.translation", level="WARNING") as cm:
            log_translation_fallback(
                translation_key="test.key",
                requested_language="fr",
                fallback_language="en",
                reason="missing_translation",
            )
            # Should produce warning log
            self.assertGreater(len(cm.output), 0)
            self.assertTrue(any("WARNING" in msg for msg in cm.output))

    def test_error_logging_produces_error(self):
        """Verify error logging produces ERROR level logs."""
        with self.assertLogs("django.translation", level="ERROR") as cm:
            log_translation_error(
                error_type="test_error",
                file_path="test.po",
                error_details="Test error",
            )
            # Should produce error log
            self.assertGreater(len(cm.output), 0)
            self.assertTrue(any("ERROR" in msg for msg in cm.output))
