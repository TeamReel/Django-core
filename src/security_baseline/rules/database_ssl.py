"""Database SSL validation rule for Django database connections.

This module validates database SSL/TLS configuration according to OWASP ASVS 4.0.3 Level 1.

OWASP ASVS References:
- V2.2.1: Database connection encryption
- V6.2.1: Cryptographic communications
"""

import os
from datetime import datetime

from security_baseline.rules.base import SecurityRule, SecurityRuleViolation
from security_baseline.rules.registry import register


@register
class DatabaseSSLValidationRule(SecurityRule):
    """Validates database connections use SSL/TLS.

    OWASP ASVS 4.0.3 Level 1 - V2.2.1, V6.2.1:
    Verify that database connections use TLS/SSL.
    """

    def __init__(self):
        super().__init__(
            rule_id="SEC016-DATABASE-SSL",
            name="Database SSL Configuration",
            category="database_ssl",
            severity="HIGH",
            owasp_asvs_refs=["V2.2.1", "V6.2.1"],
            description="Validates database connections use SSL/TLS",
            remediation=(
                "Configure SSL in DATABASES['default']['OPTIONS'] "
                "(sslmode for PostgreSQL, ssl_ca for MySQL)"
            ),
        )

    def validate(self, context: dict) -> SecurityRuleViolation | None:
        """Validate database SSL configuration for production environments."""
        settings = context.get("settings")
        environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

        if environment != "production":
            return None

        databases = getattr(settings, "DATABASES", {})
        default_db = databases.get("default", {})
        engine = default_db.get("ENGINE", "")
        options = default_db.get("OPTIONS", {})

        # SQLite doesn't need SSL (file-based)
        if "sqlite" in engine:
            return None

        # PostgreSQL: Check for sslmode
        if "postgresql" in engine or "psycopg" in engine:
            sslmode = options.get("sslmode", "")
            if sslmode not in ["require", "verify-ca", "verify-full"]:
                return SecurityRuleViolation(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    message="PostgreSQL database connection does not enforce SSL",
                    severity=self.severity,
                    violated_setting="DATABASES['default']['OPTIONS']['sslmode']",
                    current_value=sslmode or "<not set>",
                    expected_value="'require', 'verify-ca', or 'verify-full'",
                    owasp_asvs_refs=self.owasp_asvs_refs,
                    remediation=self.remediation,
                    timestamp=datetime.now(),
                    environment=environment,
                )

        # MySQL: Check for ssl_ca or ssl dict
        elif "mysql" in engine:
            has_ssl = "ssl_ca" in options or "ssl" in options
            if not has_ssl:
                return SecurityRuleViolation(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    message="MySQL database connection does not configure SSL",
                    severity=self.severity,
                    violated_setting="DATABASES['default']['OPTIONS']",
                    current_value="<no ssl_ca or ssl config>",
                    expected_value="ssl_ca or ssl dictionary configured",
                    owasp_asvs_refs=self.owasp_asvs_refs,
                    remediation=self.remediation,
                    timestamp=datetime.now(),
                    environment=environment,
                )

        return None
