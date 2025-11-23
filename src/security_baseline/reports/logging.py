"""Structured logging utilities with correlation ID support."""

import logging
import uuid
from contextvars import ContextVar
from typing import Any, Optional

# Context variable to store correlation ID across async operations
correlation_id_context: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)

logger = logging.getLogger(__name__)


class CorrelationFilter(logging.Filter):
    """
    Logging filter that adds correlation ID to log records.

    Automatically includes correlation_id in all log records when available
    in the current context or thread-local storage.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """Add correlation_id to log record if available."""
        correlation_id = get_correlation_id()
        if correlation_id:
            record.correlation_id = correlation_id
        else:
            record.correlation_id = ""
        return True


class SecurityLogger:
    """
    Structured logger for security events with correlation ID support.

    Provides convenience methods for logging security events with
    consistent structure and automatic correlation ID inclusion.
    """

    def __init__(self, name: str = "security_baseline"):
        """
        Initialize security logger.

        Args:
            name: Logger name (defaults to 'security_baseline')
        """
        self.logger = logging.getLogger(name)

        # Add correlation filter if not already added
        if not any(isinstance(f, CorrelationFilter) for f in self.logger.filters):
            self.logger.addFilter(CorrelationFilter())

    def start_validation_run(self, enforcement_mode: str, environment: str) -> str:
        """
        Start a new security validation run with correlation ID.

        Args:
            enforcement_mode: 'strict' or 'advisory'
            environment: Environment name (local, staging, production, etc.)

        Returns:
            Generated correlation ID for this validation run
        """
        correlation_id = str(uuid.uuid4())
        set_correlation_id(correlation_id)

        self.logger.info(
            "Starting security validation run",
            extra={
                "event_type": "validation_start",
                "enforcement_mode": enforcement_mode,
                "environment": environment,
                "correlation_id": correlation_id,
            },
        )

        return correlation_id

    def log_rule_execution(
        self, rule_id: str, rule_name: str, status: str, execution_time_ms: Optional[int] = None
    ) -> None:
        """
        Log security rule execution.

        Args:
            rule_id: Rule identifier (e.g., SEC001-DEBUG-MODE)
            rule_name: Human-readable rule name
            status: 'PASS', 'FAIL', or 'ERROR'
            execution_time_ms: Rule execution time in milliseconds
        """
        log_data = {
            "event_type": "rule_execution",
            "rule_id": rule_id,
            "rule_name": rule_name,
            "status": status,
        }

        if execution_time_ms is not None:
            log_data["execution_time_ms"] = execution_time_ms

        if status == "FAIL":
            self.logger.warning(f"Security rule failed: {rule_id}", extra=log_data)
        elif status == "ERROR":
            self.logger.error(f"Security rule error: {rule_id}", extra=log_data)
        else:
            self.logger.debug(f"Security rule passed: {rule_id}", extra=log_data)

    def log_violation(
        self,
        rule_id: str,
        severity: str,
        message: str,
        violated_setting: str,
        current_value: Any,
        expected_value: Any,
    ) -> None:
        """
        Log a security violation.

        Args:
            rule_id: Rule that was violated
            severity: Violation severity (CRITICAL, HIGH, MEDIUM, LOW)
            message: Human-readable violation message
            violated_setting: Setting that violated the rule
            current_value: Current (violating) value
            expected_value: Expected value per rule
        """
        self.logger.warning(
            f"Security violation: {message}",
            extra={
                "event_type": "security_violation",
                "rule_id": rule_id,
                "severity": severity,
                "violated_setting": violated_setting,
                "current_value": str(current_value),
                "expected_value": str(expected_value),
            },
        )

    def log_enforcement_action(
        self, action: str, reason: str, violation_count: int, critical_high_count: int
    ) -> None:
        """
        Log enforcement mode action.

        Args:
            action: 'BLOCK' or 'ALLOW'
            reason: Human-readable reason for action
            violation_count: Total violations found
            critical_high_count: Count of CRITICAL/HIGH violations
        """
        log_level = logging.ERROR if action == "BLOCK" else logging.INFO

        self.logger.log(
            log_level,
            f"Enforcement action: {action} - {reason}",
            extra={
                "event_type": "enforcement_action",
                "action": action,
                "reason": reason,
                "violation_count": violation_count,
                "critical_high_count": critical_high_count,
            },
        )

    def complete_validation_run(
        self, status: str, total_rules: int, violations_count: int, execution_time_ms: int
    ) -> None:
        """
        Log completion of security validation run.

        Args:
            status: Overall status ('PASS', 'WARN', 'FAIL')
            total_rules: Total number of rules executed
            violations_count: Number of violations found
            execution_time_ms: Total execution time in milliseconds
        """
        self.logger.info(
            f"Security validation complete: {status}",
            extra={
                "event_type": "validation_complete",
                "status": status,
                "total_rules": total_rules,
                "violations_count": violations_count,
                "execution_time_ms": execution_time_ms,
            },
        )


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID from context."""
    return correlation_id_context.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID in current context."""
    correlation_id_context.set(correlation_id)


def clear_correlation_id() -> None:
    """Clear the correlation ID from current context."""
    correlation_id_context.set(None)


# Default security logger instance
security_logger = SecurityLogger()
