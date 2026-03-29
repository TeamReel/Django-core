"""Security headers rules for Django HTTP security configuration.

This module validates HTTP security headers according to OWASP ASVS 4.0.3 Level 1.

OWASP ASVS References:
- V1.6.1: HTTP Strict Transport Security (HSTS)
- V2.2.1: HTTP security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- V14.4.3: Content Security Policy (CSP)
"""

import os
from datetime import datetime

from security_baseline.rules.base import SecurityRule, SecurityRuleViolation
from security_baseline.rules.registry import register


@register
class HSTSHeaderRule(SecurityRule):
    """Validates SECURE_HSTS_SECONDS >= 31536000 (1 year).

    OWASP ASVS 4.0.3 Level 1 - V1.6.1:
    Verify that HTTP Strict Transport Security headers are included on all responses
    with max-age of at least one year.
    """

    MINIMUM_SECONDS = 31536000  # 1 year

    def __init__(self):
        super().__init__(
            rule_id="SEC010-HSTS-HEADER",
            name="HSTS Header Configuration",
            category="security_headers",
            severity="HIGH",
            owasp_asvs_refs=["V1.6.1"],
            description="Validates SECURE_HSTS_SECONDS >= 31536000 (1 year)",
            remediation="Set SECURE_HSTS_SECONDS = 31536000 in config/settings/production.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate HSTS max-age is at least 1 year in production."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if environment != "production":
            return None

        hsts_seconds = getattr(settings, "SECURE_HSTS_SECONDS", 0)

        if hsts_seconds < self.MINIMUM_SECONDS:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message=(
                    f"HSTS max-age too short"
                    f" ({hsts_seconds}s,"
                    f" minimum {self.MINIMUM_SECONDS}s)"
                ),
                severity=self.severity,
                violated_setting="SECURE_HSTS_SECONDS",
                current_value=str(hsts_seconds),
                expected_value=f">= {self.MINIMUM_SECONDS}",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class ContentTypeNosniffRule(SecurityRule):
    """Validates SECURE_CONTENT_TYPE_NOSNIFF=True.

    OWASP ASVS 4.0.3 Level 1 - V2.2.1:
    Verify that X-Content-Type-Options: nosniff header is set.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC011-CONTENT-TYPE-NOSNIFF",
            name="Content Type Nosniff Header",
            category="security_headers",
            severity="MEDIUM",
            owasp_asvs_refs=["V2.2.1"],
            description="Validates SECURE_CONTENT_TYPE_NOSNIFF=True",
            remediation="Set SECURE_CONTENT_TYPE_NOSNIFF = True in config/settings/base.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate X-Content-Type-Options header is enabled."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if not getattr(settings, "SECURE_CONTENT_TYPE_NOSNIFF", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="X-Content-Type-Options: nosniff header not enabled",
                severity=self.severity,
                violated_setting="SECURE_CONTENT_TYPE_NOSNIFF",
                current_value=str(getattr(settings, "SECURE_CONTENT_TYPE_NOSNIFF", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class XFrameOptionsRule(SecurityRule):
    """Validates X_FRAME_OPTIONS='DENY' or 'SAMEORIGIN'.

    OWASP ASVS 4.0.3 Level 1 - V2.2.1:
    Verify that X-Frame-Options header is set to DENY or SAMEORIGIN.
    """

    VALID_VALUES = ["DENY", "SAMEORIGIN"]

    def __init__(self):
        super().__init__(
            rule_id="SEC012-X-FRAME-OPTIONS",
            name="X-Frame-Options Header",
            category="security_headers",
            severity="HIGH",
            owasp_asvs_refs=["V2.2.1"],
            description="Validates X_FRAME_OPTIONS='DENY' or 'SAMEORIGIN'",
            remediation="Set X_FRAME_OPTIONS = 'DENY' in config/settings/base.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate X-Frame-Options is set to DENY or SAMEORIGIN."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        x_frame_options = getattr(settings, "X_FRAME_OPTIONS", None)

        if x_frame_options not in self.VALID_VALUES:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message=f"X-Frame-Options is '{x_frame_options}', must be 'DENY' or 'SAMEORIGIN'",
                severity=self.severity,
                violated_setting="X_FRAME_OPTIONS",
                current_value=str(x_frame_options),
                expected_value="'DENY' or 'SAMEORIGIN'",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class XSSFilterRule(SecurityRule):
    """Validates SECURE_BROWSER_XSS_FILTER=True.

    OWASP ASVS 4.0.3 Level 1 - V2.2.1:
    Verify that X-XSS-Protection header is set.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC013-XSS-FILTER",
            name="XSS Filter Header",
            category="security_headers",
            severity="MEDIUM",
            owasp_asvs_refs=["V2.2.1"],
            description="Validates SECURE_BROWSER_XSS_FILTER=True",
            remediation="Set SECURE_BROWSER_XSS_FILTER = True in config/settings/base.py",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate X-XSS-Protection header is enabled."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if not getattr(settings, "SECURE_BROWSER_XSS_FILTER", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="X-XSS-Protection header not enabled",
                severity=self.severity,
                violated_setting="SECURE_BROWSER_XSS_FILTER",
                current_value=str(getattr(settings, "SECURE_BROWSER_XSS_FILTER", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None


@register
class CSPHeaderRule(SecurityRule):
    """Validates Content Security Policy with restrictive defaults.

    OWASP ASVS 4.0.3 Level 1 - V14.4.3:
    Verify that a suitable Content Security Policy is in place.
    """

    UNSAFE_VALUES = ["unsafe-inline", "unsafe-eval"]

    def __init__(self):
        super().__init__(
            rule_id="SEC014-CSP-HEADER",
            name="Content Security Policy",
            category="security_headers",
            severity="HIGH",
            owasp_asvs_refs=["V14.4.3"],
            description="Validates CSP with no unsafe-inline or unsafe-eval",
            remediation="Configure CSP_DEFAULT_SRC without 'unsafe-inline' or 'unsafe-eval'",
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate CSP policy does not contain unsafe directives."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        # Check common CSP directives
        csp_directives = [
            ("CSP_DEFAULT_SRC", "default-src"),
            ("CSP_SCRIPT_SRC", "script-src"),
            ("CSP_STYLE_SRC", "style-src"),
        ]

        for setting_name, directive_name in csp_directives:
            directive_value = getattr(settings, setting_name, None)

            if directive_value:
                # Convert to string if it's a list/tuple
                if isinstance(directive_value, (list, tuple)):
                    directive_value = " ".join(str(v) for v in directive_value)
                else:
                    directive_value = str(directive_value)

                # Check for unsafe values
                for unsafe_value in self.UNSAFE_VALUES:
                    if unsafe_value in directive_value:
                        return SecurityRuleViolation(
                            rule_id=self.rule_id,
                            rule_name=self.name,
                            message=f"CSP {directive_name} contains '{unsafe_value}'",
                            severity=self.severity,
                            violated_setting=setting_name,
                            current_value=directive_value,
                            expected_value=f"No '{unsafe_value}' in policy",
                            owasp_asvs_refs=self.owasp_asvs_refs,
                            remediation=self.remediation,
                            timestamp=datetime.now(),
                            environment=environment,
                        )

        return None


@register
class SSLRedirectRule(SecurityRule):
    """Validates SECURE_SSL_REDIRECT=True and SECURE_PROXY_SSL_HEADER configured.

    OWASP ASVS 4.0.3 Level 1 - V2.2.1:
    Verify that the application redirects HTTP requests to HTTPS.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC015-SSL-REDIRECT",
            name="SSL Redirect Configuration",
            category="security_headers",
            severity="HIGH",
            owasp_asvs_refs=["V2.2.1"],
            description="Validates SECURE_SSL_REDIRECT=True and SECURE_PROXY_SSL_HEADER configured",
            remediation=(
                "Set SECURE_SSL_REDIRECT = True and"
                " SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate SSL redirect is enabled with proper proxy header configuration."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if environment != "production":
            return None

        # Check SSL redirect
        if not getattr(settings, "SECURE_SSL_REDIRECT", False):
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SECURE_SSL_REDIRECT not enabled in production",
                severity=self.severity,
                violated_setting="SECURE_SSL_REDIRECT",
                current_value=str(getattr(settings, "SECURE_SSL_REDIRECT", False)),
                expected_value="True",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        # Check proxy SSL header
        proxy_header = getattr(settings, "SECURE_PROXY_SSL_HEADER", None)
        if not proxy_header or not isinstance(proxy_header, tuple) or len(proxy_header) != 2:
            return SecurityRuleViolation(
                rule_id=self.rule_id,
                rule_name=self.name,
                message="SECURE_PROXY_SSL_HEADER not properly configured",
                severity=self.severity,
                violated_setting="SECURE_PROXY_SSL_HEADER",
                current_value=str(proxy_header),
                expected_value="Tuple like ('HTTP_X_FORWARDED_PROTO', 'https')",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation=self.remediation,
                timestamp=datetime.now(),
                environment=environment,
            )

        return None
