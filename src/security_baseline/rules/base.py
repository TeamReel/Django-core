"""Base classes for security rules and violations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


class SecurityRule(ABC):
    """
    Abstract base class for security validation rules.

    All security rules must inherit from this class and implement the validate() method.
    Rules are automatically registered with SecurityRuleRegistry using the @register decorator.

    Attributes:
        rule_id: Unique identifier (e.g., SEC001-DEBUG-MODE)
        name: Human-readable rule name
        category: Rule category (django_settings, session_security, etc.)
        severity: Violation severity (CRITICAL, HIGH, MEDIUM, LOW)
        owasp_asvs_refs: List of OWASP ASVS control references (e.g., ['V1.2.2'])
        description: Detailed rule description
        remediation: Guidance on fixing violations
        enforcement_mode: 'strict' or 'advisory'
        enabled: Whether rule is active
    """

    def __init__(
        self,
        rule_id: str,
        name: str,
        category: str,
        severity: str,
        owasp_asvs_refs: list[str],
        description: str,
        remediation: str,
        enforcement_mode: str = "strict",
        enabled: bool = True,
    ):
        self.rule_id = rule_id
        self.name = name
        self.category = category
        self.severity = severity
        self.owasp_asvs_refs = owasp_asvs_refs
        self.description = description
        self.remediation = remediation
        self.enforcement_mode = enforcement_mode
        self.enabled = enabled

    @property
    def identifier(self) -> str:
        """Return the unique identifier for the rule (for engine compatibility)."""
        return self.rule_id

    def validate_with_exemptions(
        self, context: dict
    ) -> tuple[Optional["SecurityRuleViolation"], bool, str | None]:
        """Validate rule with exemption checking (WP13).

        Checks if rule is exempt before validation. If exempt, returns early with
        exemption justification for audit logging.

        Args:
            context: Dictionary containing Django settings and environment info

        Returns:
            Tuple of (violation, is_exempt, justification)
            - violation: SecurityRuleViolation if rule violated, None otherwise
            - is_exempt: True if rule is currently exempt
            - justification: Exemption justification if exempt, None otherwise
        """
        # Check if rule is exempt
        from security_baseline.rules.registry import _registry

        is_exempt, justification = _registry.is_rule_exempt(self.rule_id)

        if is_exempt:
            # Rule is exempt - skip validation but log for audit trail
            return None, True, justification

        # Not exempt - perform normal validation
        violation = self.validate(context)
        return violation, False, None

    @abstractmethod
    def validate(self, context: dict) -> Optional["SecurityRuleViolation"]:
        """
        Validate security rule against provided context.

        Args:
            context: Dictionary containing Django settings and environment info
                    Example: {'settings': django.conf.settings, 'environment': 'production'}

        Returns:
            SecurityRuleViolation if rule is violated, None if rule passes
        """
        ...


@dataclass(frozen=True)
class SecurityRuleViolation:
    """
    Immutable record of a security rule violation.

    Attributes:
        rule_id: ID of violated rule
        rule_name: Name of violated rule
        message: Human-readable violation message
        severity: Violation severity (CRITICAL, HIGH, MEDIUM, LOW)
        violated_setting: Django setting that violated the rule
        current_value: Current value of violated setting
        expected_value: Expected value per rule requirement
        owasp_asvs_refs: OWASP ASVS control references
        remediation: Remediation guidance
        timestamp: Violation detection timestamp
        environment: Environment context (local, staging, production)
    """

    rule_id: str
    rule_name: str
    message: str
    severity: str
    violated_setting: str
    current_value: str
    expected_value: str
    owasp_asvs_refs: list[str]
    remediation: str
    timestamp: datetime
    environment: str
