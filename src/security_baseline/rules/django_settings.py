"""Django settings security rules for runtime validation."""

import os
from datetime import datetime

from security_baseline.rules import SecurityRule, SecurityRuleViolation, register


@register
class DebugModeProductionRule(SecurityRule):
    """Validates DEBUG=False in production environments."""

    def __init__(self):
        super().__init__(
            rule_id="SEC001-DEBUG-MODE",
            name="Debug Mode Production Check",
            category="django_settings",
            severity="CRITICAL",
            owasp_asvs_refs=["V14.1.1"],
            description="Validates DEBUG=False in production environments",
            remediation="Set DEBUG=False in config/settings/production.py",
            enforcement_mode="strict",
            enabled=True,
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate DEBUG setting in production."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        # Only enforce in production
        if environment != "production":
            return None

        if settings.DEBUG:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="DEBUG mode is enabled in production environment",
                severity=self.severity,
                violated_setting="DEBUG",
                current_value=str(settings.DEBUG),
                expected_value="False",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class SecretKeyValidationRule(SecurityRule):
    """Validates SECRET_KEY is present, non-default, and has sufficient entropy."""

    # Django's default SECRET_KEY from startproject
    DJANGO_DEFAULT_KEY = "django-insecure-"
    MINIMUM_LENGTH = 50

    def __init__(self):
        super().__init__(
            rule_id="SEC002-SECRET-KEY",
            name="Secret Key Validation",
            category="django_settings",
            severity="CRITICAL",
            owasp_asvs_refs=["V1.2.2", "V6.2.1"],
            description="Validates SECRET_KEY is present, non-default, and has sufficient entropy",
            remediation=(
                "Generate new SECRET_KEY using: python -c"
                " 'from django.core.management.utils import"
                " get_random_secret_key; print(get_random_secret_key())'"
            ),
            enforcement_mode="strict",
            enabled=True,
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate SECRET_KEY configuration."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        secret_key = getattr(settings, "SECRET_KEY", "")

        # Check if SECRET_KEY exists
        if not secret_key:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SECRET_KEY is not set",
                severity=self.severity,
                violated_setting="SECRET_KEY",
                current_value="<empty>",
                expected_value=f"Random string with {self.MINIMUM_LENGTH}+ characters",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        # Check for Django default key
        if secret_key.startswith(self.DJANGO_DEFAULT_KEY):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SECRET_KEY uses Django default prefix (insecure)",
                severity=self.severity,
                violated_setting="SECRET_KEY",
                current_value="<django-insecure-...>",
                expected_value=f"Random string with {self.MINIMUM_LENGTH}+ characters",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        # Check minimum length
        if len(secret_key) < self.MINIMUM_LENGTH:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message=(
                    f"SECRET_KEY is too short"
                    f" ({len(secret_key)} chars,"
                    f" minimum {self.MINIMUM_LENGTH})"
                ),
                severity=self.severity,
                violated_setting="SECRET_KEY",
                current_value=f"<{len(secret_key)} characters>",
                expected_value=f"{self.MINIMUM_LENGTH}+ characters",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class AllowedHostsValidationRule(SecurityRule):
    """Validates ALLOWED_HOSTS does not use wildcard in production."""

    def __init__(self):
        super().__init__(
            rule_id="SEC003-ALLOWED-HOSTS",
            name="Allowed Hosts Validation",
            category="django_settings",
            severity="CRITICAL",
            owasp_asvs_refs=["V14.1.1"],
            description=(
                "Validates ALLOWED_HOSTS does not use"
                " wildcard ('*') in production"
            ),
            remediation=(
                "Set ALLOWED_HOSTS to specific domain names"
                " in config/settings/production.py"
            ),
            enforcement_mode="strict",
            enabled=True,
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate ALLOWED_HOSTS configuration."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        # Only enforce in production
        if environment != "production":
            return None

        allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])

        # Check for wildcard
        if "*" in allowed_hosts:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="ALLOWED_HOSTS contains wildcard '*' in production",
                severity=self.severity,
                violated_setting="ALLOWED_HOSTS",
                current_value=str(allowed_hosts),
                expected_value=(
                    "List of specific domain names"
                    " (e.g., ['example.com', 'www.example.com'])"
                ),
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        # Check for empty list
        if not allowed_hosts:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="ALLOWED_HOSTS is empty in production",
                severity=self.severity,
                violated_setting="ALLOWED_HOSTS",
                current_value="[]",
                expected_value="List of specific domain names",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None
