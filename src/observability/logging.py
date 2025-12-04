"""Structured JSON logging with PII redaction and correlation ID support."""

import contextvars
import json
import logging
import re
from datetime import datetime, timezone

# T016: Correlation ID contextvar
correlation_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    'correlation_id',
    default=None
)


def get_correlation_id() -> str | None:
    """Get correlation ID for current context."""
    return correlation_id_var.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_var.set(correlation_id)


# T017: JSONFormatter
class JSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging (FR-006).

    Emits log records as JSON with required fields:
    - timestamp (ISO 8601)
    - severity
    - message
    - correlation_id
    - context
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON with required fields."""
        log_data = {
            "timestamp": datetime.fromtimestamp(
                record.created,
                tz=timezone.utc
            ).isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "correlation_id": getattr(record, 'correlation_id', None),
            "logger_name": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "context": getattr(record, 'context', {}),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }

        return json.dumps(log_data, default=str)


# T018: PIIRedactionFilter
class PIIRedactionFilter(logging.Filter):
    """
    Filter to redact PII fields from log records (FR-007).

    Redacts sensitive fields: password, secret, token, api_key, email,
    ssn, phone_number, credit_card, date_of_birth.
    """

    REDACTED_FIELDS = {
        'password', 'secret', 'token', 'api_key', 'private_key',
        'email', 'ssn', 'phone_number', 'credit_card', 'date_of_birth'
    }

    def filter(self, record: logging.LogRecord) -> bool:
        """Redact PII from record context and exception details."""
        context = getattr(record, 'context', {})
        if context:
            record.context = self._redact_dict(context)

        # Redact message if contains email patterns
        if hasattr(record, 'msg'):
            record.msg = self._redact_string(str(record.msg))

        if record.exc_info and record.exc_info[1]:
            # Redact exception message if contains PII patterns
            exc_msg = self._redact_string(str(record.exc_info[1]))
            record.exc_info = (
                record.exc_info[0],
                type(record.exc_info[1])(exc_msg),
                record.exc_info[2]
            )

        return True

    def _redact_dict(self, data: dict) -> dict:
        """Recursively redact sensitive fields in dictionary."""
        redacted = {}
        for key, value in data.items():
            # Check exact match or substring patterns
            if (key.lower() in self.REDACTED_FIELDS or
                any(pattern in key.lower() for pattern in ['_token', '_secret', '_key', '_password'])):
                redacted[key] = "[REDACTED]"
            elif isinstance(value, dict):
                redacted[key] = self._redact_dict(value)
            elif isinstance(value, list):
                redacted[key] = [
                    self._redact_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                # Check if value looks like email or sensitive data
                if isinstance(value, str):
                    redacted[key] = self._redact_string(value)
                else:
                    redacted[key] = value
        return redacted

    def _redact_string(self, text: str) -> str:
        """Redact email patterns and potential tokens from string."""
        # Redact email addresses
        text = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            '[REDACTED_EMAIL]',
            text
        )
        # Redact credit card patterns (4 groups of 4 digits)
        text = re.sub(
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            '[REDACTED_CC]',
            text
        )
        # Redact SSN patterns (###-##-#### or ######### )
        text = re.sub(
            r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b',
            '[REDACTED_SSN]',
            text
        )
        return text


# T019: CorrelationIDFilter
class CorrelationIDFilter(logging.Filter):
    """Filter to inject correlation ID into log records (FR-008)."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add correlation ID from contextvar to record."""
        record.correlation_id = get_correlation_id()
        return True


# T027: SQL parameter stripping
def redact_sql_params(sql: str) -> str:
    """
    Strip parameters from SQL queries for FR-015.

    Replaces numeric and string literals with placeholders.
    """
    # Replace numeric literals: WHERE id=123 → WHERE id=?
    sql = re.sub(r'=\s*\d+', '=?', sql)
    # Replace string literals: WHERE email='user@example.com' → WHERE email=?
    sql = re.sub(r"=\s*'[^']*'", "=?", sql)
    sql = re.sub(r'=\s*"[^"]*"', '=?', sql)
    # Replace IN clauses: WHERE id IN (1,2,3) → WHERE id IN (?)
    sql = re.sub(r'IN\s*\([^)]+\)', 'IN (?)', sql, flags=re.IGNORECASE)
    return sql
