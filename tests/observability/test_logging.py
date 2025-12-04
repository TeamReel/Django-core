"""Tests for structured logging with PII redaction and correlation IDs."""

import json
import logging
from io import StringIO

from observability.logging import (
    CorrelationIDFilter,
    JSONFormatter,
    PIIRedactionFilter,
    correlation_id_var,
    get_correlation_id,
    redact_sql_params,
    set_correlation_id,
)


class TestCorrelationIDContextVar:
    """Test correlation ID contextvar operations."""

    def test_get_correlation_id_default_none(self):
        """Test that get_correlation_id returns None by default."""
        correlation_id_var.set(None)  # Reset
        assert get_correlation_id() is None

    def test_set_and_get_correlation_id(self):
        """Test setting and retrieving correlation ID."""
        test_id = "test-correlation-123"
        set_correlation_id(test_id)
        assert get_correlation_id() == test_id

    def test_correlation_id_isolation(self):
        """Test that correlation IDs are context-isolated."""
        set_correlation_id("context-1")
        assert get_correlation_id() == "context-1"

        # Simulate new context (contextvars handle this automatically)
        set_correlation_id("context-2")
        assert get_correlation_id() == "context-2"


class TestJSONFormatter:
    """Test JSON log formatting."""

    def setup_method(self):
        """Set up test logger with JSON formatter."""
        self.logger = logging.getLogger("test_json")
        self.logger.setLevel(logging.INFO)
        self.logger.handlers = []  # Clear existing handlers

        self.stream = StringIO()
        handler = logging.StreamHandler(self.stream)
        handler.setFormatter(JSONFormatter())
        self.logger.addHandler(handler)

    def test_basic_log_format(self):
        """Test that logs are valid JSON with required fields."""
        set_correlation_id("test-123")
        self.logger.info("Test message")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert "timestamp" in log_data
        assert "severity" in log_data
        assert "message" in log_data
        assert "correlation_id" in log_data
        assert "logger_name" in log_data
        assert "module" in log_data
        assert "function" in log_data
        assert "line" in log_data
        assert "context" in log_data

        assert log_data["message"] == "Test message"
        assert log_data["severity"] == "INFO"
        assert log_data["logger_name"] == "test_json"

    def test_log_with_context(self):
        """Test logging with additional context."""
        self.logger.info(
            "User action",
            extra={"context": {"user_id": 123, "action": "login"}}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["user_id"] == 123
        assert log_data["context"]["action"] == "login"

    def test_log_with_exception(self):
        """Test exception logging includes traceback."""
        try:
            raise ValueError("Test error")
        except ValueError:
            self.logger.exception("Exception occurred")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert "exception" in log_data
        assert log_data["exception"]["type"] == "ValueError"
        assert "Test error" in log_data["exception"]["message"]
        assert "traceback" in log_data["exception"]

    def test_timestamp_iso8601_format(self):
        """Test that timestamp is in ISO 8601 format with timezone."""
        self.logger.info("Test")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        # Verify ISO 8601 format (e.g., 2025-12-03T14:00:00+00:00)
        assert "T" in log_data["timestamp"]
        assert "+" in log_data["timestamp"] or "Z" in log_data["timestamp"]


class TestPIIRedactionFilter:
    """Test PII redaction in log records."""

    def setup_method(self):
        """Set up logger with PII redaction filter."""
        self.logger = logging.getLogger("test_pii")
        self.logger.setLevel(logging.INFO)
        self.logger.handlers = []

        self.stream = StringIO()
        handler = logging.StreamHandler(self.stream)
        handler.setFormatter(JSONFormatter())
        handler.addFilter(PIIRedactionFilter())
        self.logger.addHandler(handler)

    def test_redact_password_field(self):
        """Test that password fields are redacted."""
        self.logger.info(
            "User login",
            extra={"context": {"username": "alice", "password": "secret123"}}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["password"] == "[REDACTED]"
        assert log_data["context"]["username"] == "alice"

    def test_redact_multiple_pii_fields(self):
        """Test redaction of multiple PII fields."""
        self.logger.info(
            "User data",
            extra={"context": {
                "email": "alice@example.com",
                "phone_number": "555-1234",
                "ssn": "123-45-6789",
                "credit_card": "1234-5678-9012-3456",
                "name": "Alice"
            }}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["email"] == "[REDACTED]"
        assert log_data["context"]["phone_number"] == "[REDACTED]"
        assert log_data["context"]["ssn"] == "[REDACTED]"
        assert log_data["context"]["credit_card"] == "[REDACTED]"
        assert log_data["context"]["name"] == "Alice"  # Not redacted

    def test_redact_nested_context(self):
        """Test redaction in nested dictionaries."""
        self.logger.info(
            "Payment",
            extra={"context": {
                "user": {
                    "email": "bob@example.com",
                    "api_key": "abc123"
                },
                "amount": 100
            }}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["user"]["email"] == "[REDACTED]"
        assert log_data["context"]["user"]["api_key"] == "[REDACTED]"
        assert log_data["context"]["amount"] == 100

    def test_redact_email_in_message(self):
        """Test email redaction in log message."""
        self.logger.info("User alice@example.com logged in")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert "[REDACTED_EMAIL]" in log_data["message"]
        assert "alice@example.com" not in log_data["message"]

    def test_redact_credit_card_pattern(self):
        """Test credit card pattern redaction."""
        self.logger.info("Card: 1234-5678-9012-3456")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert "[REDACTED_CC]" in log_data["message"]
        assert "1234-5678-9012-3456" not in log_data["message"]

    def test_redact_ssn_pattern(self):
        """Test SSN pattern redaction."""
        self.logger.info("SSN: 123-45-6789")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert "[REDACTED_SSN]" in log_data["message"]
        assert "123-45-6789" not in log_data["message"]

    def test_redact_fields_with_token_suffix(self):
        """Test redaction of fields ending with _token."""
        self.logger.info(
            "Auth",
            extra={"context": {
                "access_token": "xyz789",
                "refresh_token": "abc123",
                "user_id": 456
            }}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["access_token"] == "[REDACTED]"
        assert log_data["context"]["refresh_token"] == "[REDACTED]"
        assert log_data["context"]["user_id"] == 456

    def test_pii_redaction_with_list_in_context(self):
        """Test that lists in context are handled correctly."""
        self.logger.info(
            "Multiple users",
            extra={"context": {
                "users": [
                    {"name": "Alice", "email": "alice@example.com"},
                    {"name": "Bob", "email": "bob@example.com"}
                ]
            }}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["users"][0]["email"] == "[REDACTED]"
        assert log_data["context"]["users"][1]["email"] == "[REDACTED]"
        assert log_data["context"]["users"][0]["name"] == "Alice"

    def test_no_false_positives(self):
        """Test that non-PII fields are not redacted."""
        self.logger.info(
            "Safe data",
            extra={"context": {
                "username": "alice",
                "user_id": 123,
                "status": "active",
                "created_at": "2025-12-03T14:00:00Z"
            }}
        )

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["context"]["username"] == "alice"
        assert log_data["context"]["user_id"] == 123
        assert log_data["context"]["status"] == "active"


class TestCorrelationIDFilter:
    """Test correlation ID injection into log records."""

    def setup_method(self):
        """Set up logger with correlation ID filter."""
        self.logger = logging.getLogger("test_correlation")
        self.logger.setLevel(logging.INFO)
        self.logger.handlers = []

        self.stream = StringIO()
        handler = logging.StreamHandler(self.stream)
        handler.setFormatter(JSONFormatter())
        handler.addFilter(CorrelationIDFilter())
        self.logger.addHandler(handler)

    def test_correlation_id_injected(self):
        """Test that correlation ID is injected into log records."""
        set_correlation_id("test-456")
        self.logger.info("Test message")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["correlation_id"] == "test-456"

    def test_correlation_id_none_when_not_set(self):
        """Test that correlation ID is None when not set."""
        correlation_id_var.set(None)  # Reset
        self.logger.info("Test message")

        log_output = self.stream.getvalue().strip()
        log_data = json.loads(log_output)

        assert log_data["correlation_id"] is None


class TestRedactSQLParams:
    """Test SQL parameter redaction."""

    def test_redact_numeric_params(self):
        """Test redaction of numeric parameters."""
        sql = "SELECT * FROM users WHERE id=123 AND age=25"
        redacted = redact_sql_params(sql)
        assert redacted == "SELECT * FROM users WHERE id=? AND age=?"

    def test_redact_string_params_single_quotes(self):
        """Test redaction of string parameters with single quotes."""
        sql = "SELECT * FROM users WHERE email='alice@example.com'"
        redacted = redact_sql_params(sql)
        assert redacted == "SELECT * FROM users WHERE email=?"

    def test_redact_string_params_double_quotes(self):
        """Test redaction of string parameters with double quotes."""
        sql = 'SELECT * FROM users WHERE name="Alice"'
        redacted = redact_sql_params(sql)
        assert redacted == 'SELECT * FROM users WHERE name=?'

    def test_redact_in_clause(self):
        """Test redaction of IN clause."""
        sql = "SELECT * FROM users WHERE id IN (1,2,3,4,5)"
        redacted = redact_sql_params(sql)
        assert redacted == "SELECT * FROM users WHERE id IN (?)"

    def test_multiple_params(self):
        """Test redaction of multiple parameters."""
        sql = "SELECT * FROM users WHERE id=123 AND email='test@example.com' AND status='active'"
        redacted = redact_sql_params(sql)
        assert redacted == "SELECT * FROM users WHERE id=? AND email=? AND status=?"

    def test_preserve_sql_structure(self):
        """Test that SQL structure is preserved."""
        sql = "INSERT INTO logs (message, level) VALUES ('error', 'ERROR')"
        redacted = redact_sql_params(sql)
        # Should contain original structure with replaced params
        assert "INSERT INTO logs" in redacted
        assert "VALUES" in redacted


class TestJSONParsability:
    """Test JSON log parsing (SC-003: 100% parsability)."""

    def setup_method(self):
        """Set up logger with full filter chain."""
        self.logger = logging.getLogger("test_parse")
        self.logger.setLevel(logging.INFO)
        self.logger.handlers = []

        self.stream = StringIO()
        handler = logging.StreamHandler(self.stream)
        handler.setFormatter(JSONFormatter())
        handler.addFilter(CorrelationIDFilter())
        handler.addFilter(PIIRedactionFilter())
        self.logger.addHandler(handler)

    def test_1000_logs_parsable(self):
        """Test that 1,000 log samples are all valid JSON."""
        set_correlation_id("batch-test")

        for i in range(1000):
            self.logger.info(
                f"Log {i}",
                extra={"context": {
                    "iteration": i,
                    "email": f"user{i}@example.com",
                    "password": f"secret{i}"
                }}
            )

        # Parse all logs
        log_lines = self.stream.getvalue().strip().split('\n')
        assert len(log_lines) == 1000

        parse_errors = 0
        for line in log_lines:
            try:
                log_data = json.loads(line)
                # Verify required fields
                assert "timestamp" in log_data
                assert "severity" in log_data
                assert "message" in log_data
                assert "correlation_id" in log_data
                # Verify PII redacted
                assert log_data["context"]["email"] == "[REDACTED]"
                assert log_data["context"]["password"] == "[REDACTED]"
            except (json.JSONDecodeError, AssertionError):
                parse_errors += 1

        # SC-003: 100% parsability
        assert parse_errors == 0
