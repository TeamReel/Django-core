"""Password validation rules for Django AUTH_PASSWORD_VALIDATORS configuration.

This module validates that Django's password validators are properly configured
according to OWASP ASVS 4.0.3 Level 1 requirements.

OWASP ASVS References:
- V2.1.1: Password length requirements
- V2.1.7: Password complexity and similarity checks
- V2.1.8: Password breach detection
"""

import os
from datetime import datetime

from security_baseline.rules.base import SecurityRule, SecurityRuleViolation
from security_baseline.rules.registry import register


@register
class PasswordLengthRule(SecurityRule):
    """Validates minimum password length of 12 characters configured.

    OWASP ASVS 4.0.3 Level 1 - V2.1.1:
    Verify that user set passwords are at least 12 characters in length.
    """

    MINIMUM_LENGTH = 12

    def __init__(self):
        super().__init__(
            rule_id="SEC017-PASSWORD-LENGTH",
            name="Password Length Requirement",
            category="password_validation",
            severity="HIGH",
            owasp_asvs_refs=["V2.1.1"],
            description="Validates minimum password length of 12 characters configured",
            remediation=(
                "Add MinimumLengthValidator with min_length=12"
                " to AUTH_PASSWORD_VALIDATORS in config/settings/base.py"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate minimum password length is configured."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        validators = getattr(settings, "AUTH_PASSWORD_VALIDATORS", [])

        # Find MinimumLengthValidator
        for validator in validators:
            if "MinimumLengthValidator" in validator.get("NAME", ""):
                min_length = validator.get("OPTIONS", {}).get("min_length", 0)
                if min_length >= self.MINIMUM_LENGTH:
                    return None

        return SecurityRuleViolation(
            rule_id=self.rule_id,
            rule_name=self.name,
            message=f"Minimum password length {self.MINIMUM_LENGTH} not configured",
            severity=self.severity,
            violated_setting="AUTH_PASSWORD_VALIDATORS",
            current_value="MinimumLengthValidator not found or too short",
            expected_value=f"MinimumLengthValidator with min_length>={self.MINIMUM_LENGTH}",
            owasp_asvs_refs=self.owasp_asvs_refs,
            remediation=self.remediation,
            timestamp=datetime.now(),
            environment=environment,
        )


@register
class PasswordComplexityRule(SecurityRule):
    """Validates password complexity validator configured.

    OWASP ASVS 4.0.3 Level 1 - V2.1.7:
    Verify that passwords submitted during account registration, login, and password change
    are checked against a set of breached passwords either locally or via an API.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC018-PASSWORD-COMPLEXITY",
            name="Password Complexity Requirement",
            category="password_validation",
            severity="MEDIUM",
            owasp_asvs_refs=["V2.1.7"],
            description="Validates password complexity validator configured",
            remediation=(
                "Add CommonPasswordValidator to"
                " AUTH_PASSWORD_VALIDATORS in config/settings/base.py"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate password complexity validator is configured."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        validators = getattr(settings, "AUTH_PASSWORD_VALIDATORS", [])

        # Check for CommonPasswordValidator
        for validator in validators:
            if "CommonPasswordValidator" in validator.get("NAME", ""):
                return None

        return SecurityRuleViolation(
            rule_id=self.rule_id,
            rule_name=self.name,
            message="Password complexity validator not configured",
            severity=self.severity,
            violated_setting="AUTH_PASSWORD_VALIDATORS",
            current_value="CommonPasswordValidator not found",
            expected_value="CommonPasswordValidator in AUTH_PASSWORD_VALIDATORS",
            owasp_asvs_refs=self.owasp_asvs_refs,
            remediation=self.remediation,
            timestamp=datetime.now(),
            environment=environment,
        )


@register
class PasswordSimilarityRule(SecurityRule):
    """Validates UserAttributeSimilarityValidator configured.

    OWASP ASVS 4.0.3 Level 1 - V2.1.7:
    Verify that passwords submitted during account registration, login, and password change
    are checked against a set of breached passwords either locally or via an API.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC019-PASSWORD-SIMILARITY",
            name="Password Similarity Check",
            category="password_validation",
            severity="MEDIUM",
            owasp_asvs_refs=["V2.1.7"],
            description="Validates UserAttributeSimilarityValidator configured",
            remediation=(
                "Add UserAttributeSimilarityValidator to"
                " AUTH_PASSWORD_VALIDATORS in config/settings/base.py"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate password similarity validator is configured."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        validators = getattr(settings, "AUTH_PASSWORD_VALIDATORS", [])

        # Check for UserAttributeSimilarityValidator
        for validator in validators:
            if "UserAttributeSimilarityValidator" in validator.get("NAME", ""):
                return None

        return SecurityRuleViolation(
            rule_id=self.rule_id,
            rule_name=self.name,
            message="Password similarity validator not configured",
            severity=self.severity,
            violated_setting="AUTH_PASSWORD_VALIDATORS",
            current_value="UserAttributeSimilarityValidator not found",
            expected_value="UserAttributeSimilarityValidator in AUTH_PASSWORD_VALIDATORS",
            owasp_asvs_refs=self.owasp_asvs_refs,
            remediation=self.remediation,
            timestamp=datetime.now(),
            environment=environment,
        )


@register
class PasswordBreachRule(SecurityRule):
    """Validates password breach detection available.

    OWASP ASVS 4.0.3 Level 1 - V2.1.8:
    Verify that a password breach detection service is in use.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC020-PASSWORD-BREACH",
            name="Password Breach Detection",
            category="password_validation",
            severity="HIGH",
            owasp_asvs_refs=["V2.1.8"],
            description="Validates password breach detection available",
            remediation=(
                "Ensure breach detector bloom filter exists"
                " at .security/data/breached-passwords.bloom"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate breach detection bloom filter is available."""
        from security_baseline.validators.breach_detector import BreachDetector

        context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        detector = BreachDetector()

        # Check if bloom filter loaded
        if detector._bloom_filter is None:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="Password breach detection bloom filter not available",
                severity=self.severity,
                violated_setting="BREACH_DETECTOR_BLOOM_FILTER",
                current_value="<not loaded>",
                expected_value="Bloom filter at .security/data/breached-passwords.bloom",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None
