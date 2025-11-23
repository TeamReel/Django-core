"""
Unit tests for structured logging with correlation IDs.
"""

import logging
from unittest.mock import Mock, patch

import pytest
from security_baseline.reports.logging import (
    CorrelationFilter,
    SecurityLogger,
    clear_correlation_id,
    get_correlation_id,
    security_logger,
    set_correlation_id,
)


class TestCorrelationFilter:
    """Test correlation ID logging filter."""

    def test_filter_adds_correlation_id(self):
        """Test that filter adds correlation ID to log records."""
        filter_obj = CorrelationFilter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="test message",
            args=(),
            exc_info=None,
        )

        # Set correlation ID
        set_correlation_id("test-correlation-id")

        # Apply filter
        result = filter_obj.filter(record)

        assert result is True
        assert hasattr(record, "correlation_id")
        assert record.correlation_id == "test-correlation-id"

        # Clean up
        clear_correlation_id()

    def test_filter_empty_correlation_id(self):
        """Test filter behavior when no correlation ID is set."""
        filter_obj = CorrelationFilter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="test message",
            args=(),
            exc_info=None,
        )

        # Ensure no correlation ID is set
        clear_correlation_id()

        # Apply filter
        result = filter_obj.filter(record)

        assert result is True
        assert hasattr(record, "correlation_id")
        assert record.correlation_id == ""


class TestSecurityLogger:
    """Test SecurityLogger functionality."""

    @pytest.fixture
    def logger(self):
        """Create SecurityLogger instance for testing."""
        return SecurityLogger("test_security")

    def test_logger_initialization(self, logger):
        """Test logger initialization."""
        assert logger.logger.name == "test_security"

        # Should have correlation filter
        has_correlation_filter = any(
            isinstance(f, CorrelationFilter) for f in logger.logger.filters
        )
        assert has_correlation_filter

    @patch("security_baseline.reports.logging.uuid.uuid4")
    def test_start_validation_run(self, mock_uuid, logger):
        """Test starting validation run with correlation ID."""
        mock_uuid.return_value.return_value = Mock()
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-123")

        with patch.object(logger.logger, "info") as mock_info:
            correlation_id = logger.start_validation_run("strict", "production")

            assert correlation_id == "test-uuid-123"

            # Check that info was logged with correct data
            mock_info.assert_called_once()
            call_args = mock_info.call_args
            assert call_args[0][0] == "Starting security validation run"

            extra_data = call_args[1]["extra"]
            assert extra_data["event_type"] == "validation_start"
            assert extra_data["enforcement_mode"] == "strict"
            assert extra_data["environment"] == "production"
            assert extra_data["correlation_id"] == "test-uuid-123"

    def test_log_rule_execution_pass(self, logger):
        """Test logging successful rule execution."""
        with patch.object(logger.logger, "debug") as mock_debug:
            logger.log_rule_execution(
                rule_id="SEC001-DEBUG-MODE",
                rule_name="Debug Mode Check",
                status="PASS",
                execution_time_ms=25,
            )

            mock_debug.assert_called_once()
            call_args = mock_debug.call_args
            assert "Security rule passed: SEC001-DEBUG-MODE" in call_args[0][0]

            extra_data = call_args[1]["extra"]
            assert extra_data["event_type"] == "rule_execution"
            assert extra_data["rule_id"] == "SEC001-DEBUG-MODE"
            assert extra_data["rule_name"] == "Debug Mode Check"
            assert extra_data["status"] == "PASS"
            assert extra_data["execution_time_ms"] == 25

    def test_log_rule_execution_fail(self, logger):
        """Test logging failed rule execution."""
        with patch.object(logger.logger, "warning") as mock_warning:
            logger.log_rule_execution(
                rule_id="SEC001-DEBUG-MODE", rule_name="Debug Mode Check", status="FAIL"
            )

            mock_warning.assert_called_once()
            call_args = mock_warning.call_args
            assert "Security rule failed: SEC001-DEBUG-MODE" in call_args[0][0]

            extra_data = call_args[1]["extra"]
            assert extra_data["status"] == "FAIL"
            assert "execution_time_ms" not in extra_data

    def test_log_rule_execution_error(self, logger):
        """Test logging rule execution error."""
        with patch.object(logger.logger, "error") as mock_error:
            logger.log_rule_execution(
                rule_id="SEC001-DEBUG-MODE", rule_name="Debug Mode Check", status="ERROR"
            )

            mock_error.assert_called_once()
            call_args = mock_error.call_args
            assert "Security rule error: SEC001-DEBUG-MODE" in call_args[0][0]

            extra_data = call_args[1]["extra"]
            assert extra_data["status"] == "ERROR"

    def test_log_violation(self, logger):
        """Test logging security violation."""
        with patch.object(logger.logger, "warning") as mock_warning:
            logger.log_violation(
                rule_id="SEC001-DEBUG-MODE",
                severity="CRITICAL",
                message="DEBUG must be False in production",
                violated_setting="DEBUG",
                current_value=True,
                expected_value=False,
            )

            mock_warning.assert_called_once()
            call_args = mock_warning.call_args
            assert "Security violation: DEBUG must be False in production" in call_args[0][0]

            extra_data = call_args[1]["extra"]
            assert extra_data["event_type"] == "security_violation"
            assert extra_data["rule_id"] == "SEC001-DEBUG-MODE"
            assert extra_data["severity"] == "CRITICAL"
            assert extra_data["violated_setting"] == "DEBUG"
            assert extra_data["current_value"] == "True"
            assert extra_data["expected_value"] == "False"

    def test_log_enforcement_action_block(self, logger):
        """Test logging enforcement action that blocks startup."""
        with patch.object(logger.logger, "log") as mock_log:
            logger.log_enforcement_action(
                action="BLOCK",
                reason="3 CRITICAL violations found",
                violation_count=5,
                critical_high_count=3,
            )

            mock_log.assert_called_once()
            call_args = mock_log.call_args

            # Should log at ERROR level for BLOCK actions
            assert call_args[0][0] == logging.ERROR
            assert "Enforcement action: BLOCK - 3 CRITICAL violations found" in call_args[0][1]

            extra_data = call_args[1]["extra"]
            assert extra_data["event_type"] == "enforcement_action"
            assert extra_data["action"] == "BLOCK"
            assert extra_data["violation_count"] == 5
            assert extra_data["critical_high_count"] == 3

    def test_log_enforcement_action_allow(self, logger):
        """Test logging enforcement action that allows startup."""
        with patch.object(logger.logger, "log") as mock_log:
            logger.log_enforcement_action(
                action="ALLOW",
                reason="Advisory mode - warnings only",
                violation_count=2,
                critical_high_count=1,
            )

            mock_log.assert_called_once()
            call_args = mock_log.call_args

            # Should log at INFO level for ALLOW actions
            assert call_args[0][0] == logging.INFO
            assert "Enforcement action: ALLOW - Advisory mode - warnings only" in call_args[0][1]

    def test_complete_validation_run(self, logger):
        """Test logging validation run completion."""
        with patch.object(logger.logger, "info") as mock_info:
            logger.complete_validation_run(
                status="WARN", total_rules=10, violations_count=3, execution_time_ms=250
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args
            assert "Security validation complete: WARN" in call_args[0][0]

            extra_data = call_args[1]["extra"]
            assert extra_data["event_type"] == "validation_complete"
            assert extra_data["status"] == "WARN"
            assert extra_data["total_rules"] == 10
            assert extra_data["violations_count"] == 3
            assert extra_data["execution_time_ms"] == 250


class TestCorrelationIdContext:
    """Test correlation ID context management."""

    def test_set_and_get_correlation_id(self):
        """Test setting and getting correlation ID."""
        test_id = "test-correlation-123"

        set_correlation_id(test_id)
        assert get_correlation_id() == test_id

        clear_correlation_id()
        assert get_correlation_id() is None

    def test_clear_correlation_id(self):
        """Test clearing correlation ID."""
        set_correlation_id("test-id")
        assert get_correlation_id() == "test-id"

        clear_correlation_id()
        assert get_correlation_id() is None

    def test_correlation_id_isolation(self):
        """Test that correlation IDs are properly isolated."""
        # This test would be more meaningful in an async environment
        # but we can still test basic functionality

        set_correlation_id("first-id")
        assert get_correlation_id() == "first-id"

        set_correlation_id("second-id")
        assert get_correlation_id() == "second-id"

        clear_correlation_id()
        assert get_correlation_id() is None


class TestDefaultSecurityLogger:
    """Test default security logger instance."""

    def test_default_logger_exists(self):
        """Test that default security logger is available."""
        assert security_logger is not None
        assert isinstance(security_logger, SecurityLogger)
        assert security_logger.logger.name == "security_baseline"

    def test_default_logger_has_filter(self):
        """Test that default logger has correlation filter."""
        has_correlation_filter = any(
            isinstance(f, CorrelationFilter) for f in security_logger.logger.filters
        )
        assert has_correlation_filter
