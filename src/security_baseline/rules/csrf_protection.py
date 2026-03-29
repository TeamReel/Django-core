"""CSRF protection rules for Django CSRF middleware and cookies.

This module validates CSRF cookie security settings and middleware configuration
according to OWASP ASVS 4.0.3 Level 1.

OWASP ASVS References:
- V4.2.2: CSRF protection and secure cookie attributes
"""

import os
from datetime import datetime

from security_baseline.rules.base import SecurityRule, SecurityRuleViolation
from security_baseline.rules.registry import register


@register
class CsrfCookieSecureRule(SecurityRule):
    """Validates CSRF_COOKIE_SECURE=True in production.

    OWASP ASVS 4.0.3 Level 1 - V4.2.2:
    Verify that CSRF tokens use secure attributes in production.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC007-CSRF-COOKIE-SECURE",
            name="CSRF Cookie Secure Flag",
            category="csrf_protection",
            severity="HIGH",
            owasp_asvs_refs=["V4.2.2"],
            description="Validates CSRF_COOKIE_SECURE=True in production",
            remediation="Set CSRF_COOKIE_SECURE = True in config/settings/production.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate CSRF_COOKIE_SECURE is True in production."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        # Only enforce in production
        if environment != "production":
            return None

        if not getattr(settings, "CSRF_COOKIE_SECURE", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="CSRF_COOKIE_SECURE is not enabled in production",
                severity=self.severity,
                violated_setting="CSRF_COOKIE_SECURE",
                current_value=str(getattr(settings, "CSRF_COOKIE_SECURE", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class CsrfCookieHttpOnlyRule(SecurityRule):
    """Validates CSRF_COOKIE_HTTPONLY=True.

    OWASP ASVS 4.0.3 Level 1 - V4.2.2:
    Verify that CSRF tokens use HttpOnly attribute for defense in depth.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC008-CSRF-COOKIE-HTTPONLY",
            name="CSRF Cookie HttpOnly Flag",
            category="csrf_protection",
            severity="HIGH",
            owasp_asvs_refs=["V4.2.2"],
            description="Validates CSRF_COOKIE_HTTPONLY=True",
            remediation="Set CSRF_COOKIE_HTTPONLY = True in config/settings/base.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate CSRF_COOKIE_HTTPONLY is True."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if not getattr(settings, "CSRF_COOKIE_HTTPONLY", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="CSRF_COOKIE_HTTPONLY is not enabled",
                severity=self.severity,
                violated_setting="CSRF_COOKIE_HTTPONLY",
                current_value=str(getattr(settings, "CSRF_COOKIE_HTTPONLY", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class CsrfMiddlewareEnabledRule(SecurityRule):
    """Validates CsrfViewMiddleware is enabled in MIDDLEWARE.

    OWASP ASVS 4.0.3 Level 1 - V4.2.2:
    Verify that the application has defenses against CSRF attacks.
    """

    CSRF_MIDDLEWARE = "django.middleware.csrf.CsrfViewMiddleware"

    def __init__(self):
        super().__init__(
            rule_id="SEC009-CSRF-MIDDLEWARE",
            name="CSRF Middleware Enabled",
            category="csrf_protection",
            severity="CRITICAL",
            owasp_asvs_refs=["V4.2.2"],
            description="Validates CsrfViewMiddleware is enabled in MIDDLEWARE",
            remediation=(
                "Add 'django.middleware.csrf.CsrfViewMiddleware' "
                "to MIDDLEWARE in config/settings/base.py"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate CSRF middleware is present in MIDDLEWARE list."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        middleware = getattr(settings, "MIDDLEWARE", [])

        if self.CSRF_MIDDLEWARE not in middleware:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="CSRF middleware is not enabled",
                severity=self.severity,
                violated_setting="MIDDLEWARE",
                current_value="CsrfViewMiddleware not found",
                expected_value=f"'{self.CSRF_MIDDLEWARE}' in MIDDLEWARE list",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None
