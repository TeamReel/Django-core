"""Session security rules for Django session cookies.

This module validates session cookie security settings according to OWASP ASVS 4.0.3 Level 1.

OWASP ASVS References:
- V3.4.1: Session Cookie Secure and SameSite attributes
- V3.4.2: Session Cookie HttpOnly attribute
"""

import os
from datetime import datetime

from security_baseline.rules.base import SecurityRule, SecurityRuleViolation
from security_baseline.rules.registry import register


@register
class SessionCookieSecureRule(SecurityRule):
    """Validates SESSION_COOKIE_SECURE=True in production.

    OWASP ASVS 4.0.3 Level 1 - V3.4.1:
    Verify that cookie-based session tokens use the 'Secure' attribute.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC004-SESSION-COOKIE-SECURE",
            name="Session Cookie Secure Flag",
            category="session_security",
            severity="HIGH",
            owasp_asvs_refs=["V3.4.1"],
            description="Validates SESSION_COOKIE_SECURE=True in production",
            remediation="Set SESSION_COOKIE_SECURE = True in config/settings/production.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate SESSION_COOKIE_SECURE is True in production."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        # Only enforce in production
        if environment != "production":
            return None

        if not getattr(settings, "SESSION_COOKIE_SECURE", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SESSION_COOKIE_SECURE is not enabled in production",
                severity=self.severity,
                violated_setting="SESSION_COOKIE_SECURE",
                current_value=str(getattr(settings, "SESSION_COOKIE_SECURE", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class SessionCookieHttpOnlyRule(SecurityRule):
    """Validates SESSION_COOKIE_HTTPONLY=True.

    OWASP ASVS 4.0.3 Level 1 - V3.4.2:
    Verify that cookie-based session tokens use the 'HttpOnly' attribute.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC005-SESSION-COOKIE-HTTPONLY",
            name="Session Cookie HttpOnly Flag",
            category="session_security",
            severity="HIGH",
            owasp_asvs_refs=["V3.4.2"],
            description="Validates SESSION_COOKIE_HTTPONLY=True",
            remediation="Set SESSION_COOKIE_HTTPONLY = True in config/settings/base.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate SESSION_COOKIE_HTTPONLY is True."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if not getattr(settings, "SESSION_COOKIE_HTTPONLY", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SESSION_COOKIE_HTTPONLY is not enabled",
                severity=self.severity,
                violated_setting="SESSION_COOKIE_HTTPONLY",
                current_value=str(getattr(settings, "SESSION_COOKIE_HTTPONLY", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class SessionCookieSameSiteRule(SecurityRule):
    """Validates SESSION_COOKIE_SAMESITE='Strict' or 'Lax'.

    OWASP ASVS 4.0.3 Level 1 - V3.4.1:
    Verify that cookie-based session tokens use the 'SameSite' attribute.
    """

    VALID_VALUES = ["Strict", "Lax"]

    def __init__(self):
        super().__init__(
            rule_id="SEC006-SESSION-COOKIE-SAMESITE",
            name="Session Cookie SameSite Attribute",
            category="session_security",
            severity="HIGH",
            owasp_asvs_refs=["V3.4.1"],
            description="Validates SESSION_COOKIE_SAMESITE='Strict' or 'Lax'",
            remediation=(
                "Set SESSION_COOKIE_SAMESITE = 'Strict' or 'Lax' "
                "in config/settings/base.py"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate SESSION_COOKIE_SAMESITE is 'Strict' or 'Lax'."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        samesite = getattr(settings, "SESSION_COOKIE_SAMESITE", None)

        if samesite not in self.VALID_VALUES:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message=f"SESSION_COOKIE_SAMESITE is '{samesite}', must be 'Strict' or 'Lax'",
                severity=self.severity,
                violated_setting="SESSION_COOKIE_SAMESITE",
                current_value=str(samesite),
                expected_value="'Strict' or 'Lax'",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None
