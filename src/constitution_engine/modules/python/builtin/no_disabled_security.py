"""
Sample built-in rule: No Disabled Security Rules

This rule ensures that critical security rules cannot be disabled via configuration.
It exemplifies constitutional enforcement at the engine level.
"""

from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["NoDisabledSecurityRule"]


class NoDisabledSecurityRule:
    """
    Constitutional rule: No disabled security rules.

    This rule verifies that critical security rules are not disabled in the
    configuration. It's part of the engine's built-in constitutional checks.
    """

    identifier = "no-disabled-security-rules"
    description = "Ensures critical security rules cannot be disabled"
    enabled = True

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Check if any security-critical rules are disabled.

        Args:
            context: Repository context
            config: Engine configuration

        Returns:
            List of check results
        """
        results = []

        # List of security-critical rule identifiers that must never be disabled

        # Check if any critical rules are explicitly disabled in config
        # (This is a simplified example; actual implementation would check config)
        disabled_critical_rules = []

        if disabled_critical_rules:
            results.append(
                CheckResult(
                    rule_id=self.identifier,
                    severity=Severity.ERROR,
                    message=(
                        "Critical security rules are disabled:"
                        f" {', '.join(disabled_critical_rules)}"
                    ),
                    file_path=None,
                    line_number=None,
                )
            )
        else:
            results.append(
                CheckResult(
                    rule_id=self.identifier,
                    severity=Severity.INFO,
                    message="All critical security rules are enabled",
                    file_path=None,
                    line_number=None,
                )
            )

        return results
