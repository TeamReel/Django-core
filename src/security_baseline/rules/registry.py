"""Security rule registry for centralized rule management with exemption support."""

import logging
import threading
from datetime import datetime
from typing import Any, Optional, Type

from security_baseline.rules.base import SecurityRule

logger = logging.getLogger(__name__)


class SecurityRuleRegistry:
    """
    Singleton registry for security rules with exemption management.

    Provides centralized registration and retrieval of security rules,
    plus exemption tracking with justification and expiration validation.

    Thread-safe for concurrent registration during Django startup.

    OWASP ASVS 4.0.3 Level 1 Compliance:
    - V1.14.3: Secure configuration management
    - V1.14.5: Configuration change audit logging
    """

    _instance: Optional["SecurityRuleRegistry"] = None
    _lock = threading.Lock()
    _rules: dict[str, Type[SecurityRule]]
    _exemptions: dict[str, dict[str, Any]]
    _environment: str | None

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._rules = {}
                    cls._instance._exemptions = {}
                    cls._instance._environment = None
        return cls._instance

    def load_exemptions(self, exemptions: list[dict[str, Any]], environment: str) -> None:
        """Load rule exemptions from manifest configuration.

        Args:
            exemptions: List of exemption dictionaries from manifest
            environment: Current environment (production, staging, local)

        Example exemption format:
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Development environment requires DEBUG=True",
                "expires": "2025-12-31",
                "environments": ["local"],
                "approved_by": "security-team",
                "approved_date": "2025-01-15"
            }
        """
        self._environment = environment
        self._exemptions = {}

        for exemption in exemptions:
            rule_id = exemption.get("rule_id")
            if not rule_id:
                logger.warning("Skipping exemption without rule_id: %s", exemption)
                continue

            # Validate required fields
            if "justification" not in exemption:
                logger.error("Exemption for %s missing required 'justification' field", rule_id)
                continue

            if "expires" not in exemption:
                logger.error("Exemption for %s missing required 'expires' field", rule_id)
                continue

            # Check if exemption applies to current environment
            allowed_envs = exemption.get("environments", [])
            if allowed_envs and environment not in allowed_envs:
                logger.debug(
                    "Exemption for %s not applicable to %s environment",
                    rule_id,
                    environment,
                )
                continue

            # Parse expiration date
            try:
                expires_str = exemption.get("expires")
                expires = datetime.strptime(expires_str, "%Y-%m-%d").date()
                exemption["_parsed_expires"] = expires
            except (ValueError, TypeError) as e:
                logger.error(
                    "Exemption for %s has invalid expiration date '%s': %s",
                    rule_id,
                    exemption.get("expires"),
                    e,
                )
                continue

            # Check if expired
            today = datetime.now().date()
            if expires < today:
                logger.error("Exemption for %s has expired (expired: %s)", rule_id, expires)
                continue

            # Warn if expiring soon (within 30 days)
            days_until_expiry = (expires - today).days
            if days_until_expiry <= 30:
                logger.warning(
                    "Exemption for %s expires in %d days (on %s)",
                    rule_id,
                    days_until_expiry,
                    expires,
                )

            # Store exemption
            self._exemptions[rule_id] = exemption

            # Audit log
            logger.info(
                "Loaded exemption for %s in %s environment: %s (expires: %s)",
                rule_id,
                environment,
                exemption.get("justification"),
                expires,
            )

    def is_rule_exempt(self, rule_id: str) -> tuple[bool, str | None]:
        """Check if a rule is currently exempt.

        Args:
            rule_id: Security rule ID to check

        Returns:
            Tuple of (is_exempt: bool, justification: str | None)

        Example:
            is_exempt, justification = registry.is_rule_exempt("SEC001-DEBUG-MODE")
            if is_exempt:
                logger.info("Rule SEC001-DEBUG-MODE exempt: %s", justification)
        """
        if rule_id not in self._exemptions:
            return False, None

        exemption = self._exemptions[rule_id]

        # Double-check expiration (defensive)
        expires = exemption.get("_parsed_expires")
        if expires and expires < datetime.now().date():
            logger.error("Exemption for %s has expired but was not filtered", rule_id)
            return False, None

        justification = exemption.get("justification")
        return True, justification

    def get_all_exemptions(self) -> dict[str, dict[str, Any]]:
        """Get all active exemptions.

        Returns:
            Dictionary mapping rule_id to exemption details
        """
        return self._exemptions.copy()

    def register(self, rule_class: Type[SecurityRule]) -> Type[SecurityRule]:
        """
        Register a security rule class.

        Args:
            rule_class: SecurityRule subclass to register

        Returns:
            The rule class (for decorator usage)

        Raises:
            ValueError: If rule_id already registered
        """
        # Instantiate to get rule_id
        rule_instance = rule_class()
        rule_id = rule_instance.rule_id

        if rule_id in self._rules:
            raise ValueError(f"Rule {rule_id} already registered")

        self._rules[rule_id] = rule_class
        return rule_class

    def get_all_rules(self) -> list[SecurityRule]:
        """Get all registered rule instances."""
        return [rule_class() for rule_class in self._rules.values()]

    def get_rule(self, rule_id: str) -> Optional[SecurityRule]:
        """Get specific rule instance by ID."""
        rule_class = self._rules.get(rule_id)
        return rule_class() if rule_class else None

    def get_rules_by_category(self, category: str) -> list[SecurityRule]:
        """Get all rules in a specific category."""
        return [rule for rule in self.get_all_rules() if rule.category == category]


# Module-level registry instance
_registry = SecurityRuleRegistry()


def register(rule_class: Type[SecurityRule]) -> Type[SecurityRule]:
    """
    Decorator to automatically register a security rule.

    Usage:
        @register
        class MySecurityRule(SecurityRule):
            ...
    """
    return _registry.register(rule_class)
