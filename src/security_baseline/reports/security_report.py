"""Security report generation and logging functionality.

This module provides comprehensive security report generation with:
- SecurityReport dataclass with all violations and metadata
- JSON/YAML serialization with sensitive value sanitization
- OWASP ASVS coverage calculation
- Structured logging with correlation IDs
"""

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import yaml
from security_baseline.rules.base import SecurityRuleViolation

logger = logging.getLogger(__name__)


@dataclass
class ASVSCoverage:
    """OWASP ASVS coverage information for a security report."""

    category: str
    total_rules: int
    passed_rules: int
    failed_rules: int
    coverage_percentage: float
    violations: List[SecurityRuleViolation] = field(default_factory=list)


@dataclass
class SecurityReport:
    """
    Comprehensive security validation report.

    Contains all security violations, passed rules, OWASP ASVS coverage,
    and execution metadata. Supports JSON/YAML serialization with
    sensitive value sanitization.
    """

    # Required fields per JSON Schema
    report_id: str
    report_type: str
    timestamp: datetime
    environment: str
    enforcement_mode: str
    violations: List[SecurityRuleViolation]
    passed_rules: List[str]
    overall_status: str
    execution_time_ms: int

    # Optional fields
    owasp_asvs_coverage: Optional[Dict[str, ASVSCoverage]] = None
    metadata: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None

    def __post_init__(self):
        """Initialize calculated fields after dataclass creation."""
        if not self.correlation_id:
            self.correlation_id = str(uuid.uuid4())

        # Calculate overall status if not provided
        if not hasattr(self, "_status_calculated"):
            self._calculate_overall_status()

    def _calculate_overall_status(self):
        """Calculate overall status based on violations and enforcement mode."""
        if not self.violations:
            self.overall_status = "PASS"
        else:
            critical_high = [v for v in self.violations if v.severity in ["CRITICAL", "HIGH"]]

            if critical_high and self.enforcement_mode == "strict":
                self.overall_status = "FAIL"
            elif self.violations:
                self.overall_status = "WARN"
            else:
                self.overall_status = "PASS"

        self._status_calculated = True

    def to_dict(self, sanitize_sensitive: bool = True) -> Dict[str, Any]:
        """
        Convert report to dictionary with optional sensitive value sanitization.

        Args:
            sanitize_sensitive: If True, sanitize sensitive values like SECRET_KEY

        Returns:
            Dictionary representation of the report
        """
        data = asdict(self)

        # Convert datetime to ISO string
        if isinstance(data.get("timestamp"), datetime):
            data["timestamp"] = self.timestamp.isoformat()

        # Sanitize sensitive values if requested
        if sanitize_sensitive:
            data = self._sanitize_sensitive_values(data)

        return data

    def _sanitize_sensitive_values(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize sensitive values in report data.

        Shows last 4 characters of SECRET_KEY, masks passwords, etc.
        """
        # Recursively sanitize violations
        if "violations" in data and isinstance(data["violations"], list):
            for violation in data["violations"]:
                if isinstance(violation, dict):
                    self._sanitize_violation_values(violation)

        # Sanitize metadata
        if "metadata" in data and isinstance(data["metadata"], dict):
            self._sanitize_dict_values(data["metadata"])

        return data

    def _sanitize_violation_values(self, violation: Dict[str, Any]) -> None:
        """Sanitize sensitive values in a single violation."""
        if "current_value" in violation:
            violation["current_value"] = self._sanitize_value(
                violation.get("violated_setting", ""), violation["current_value"]
            )

        if "expected_value" in violation:
            violation["expected_value"] = self._sanitize_value(
                violation.get("violated_setting", ""), violation["expected_value"]
            )

    def _sanitize_dict_values(self, data: Dict[str, Any]) -> None:
        """Recursively sanitize sensitive values in a dictionary."""
        for key, value in data.items():
            if isinstance(value, dict):
                self._sanitize_dict_values(value)
            else:
                data[key] = self._sanitize_value(key, value)

    def _sanitize_value(self, key: str, value: Any) -> Any:
        """
        Sanitize a single value based on its key name.

        Args:
            key: The setting/field name
            value: The value to potentially sanitize

        Returns:
            Sanitized value
        """
        if not isinstance(value, str):
            return value

        key_lower = key.lower()

        # SECRET_KEY: show last 4 characters
        if "secret" in key_lower and "key" in key_lower:
            if len(value) > 4:
                return f"***{value[-4:]}"
            elif len(value) > 0:
                return f"***{value[-1:]}"
            return "***"

        # Passwords: mask completely
        if any(word in key_lower for word in ["password", "passwd", "pwd"]):
            return "***MASKED***"

        # Tokens and API keys: show first and last 4 chars if long enough
        if any(word in key_lower for word in ["token", "api_key", "auth"]):
            if len(value) > 8:
                return f"{value[:4]}***{value[-4:]}"
            return "***"

        return value

    def to_json(self, sanitize_sensitive: bool = True, indent: int = 2) -> str:
        """
        Serialize report to JSON string.

        Args:
            sanitize_sensitive: If True, sanitize sensitive values
            indent: JSON indentation level

        Returns:
            JSON string representation
        """
        data = self.to_dict(sanitize_sensitive=sanitize_sensitive)
        return json.dumps(data, indent=indent, default=str)

    def to_yaml(self, sanitize_sensitive: bool = True) -> str:
        """
        Serialize report to YAML string.

        Args:
            sanitize_sensitive: If True, sanitize sensitive values

        Returns:
            YAML string representation
        """
        data = self.to_dict(sanitize_sensitive=sanitize_sensitive)
        return yaml.dump(data, default_flow_style=False, sort_keys=False)
