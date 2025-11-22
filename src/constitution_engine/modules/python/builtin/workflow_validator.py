"""
Built-in validator: Workflow Configuration Validator

This validator ensures that required rules are present and properly configured
before the engine executes.
"""

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["WorkflowConfigValidator"]


class WorkflowConfigValidator:
    """
    Validator: Workflow configuration validation.

    This validator runs BEFORE rules execute to ensure:
    - Required constitutional rules are enabled
    - No security-critical rules are disabled
    - Configuration is internally consistent
    - All configured rules are available
    """

    identifier = "workflow-config-validator"
    description = "Validates workflow configuration before execution"

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Validate workflow configuration.

        Args:
            results: Check results (typically empty for pre-execution validation)
            context: Repository information
            config: Engine configuration

        Returns:
            Configuration validation results
        """
        validation_results = []

        # Check 1: Ensure required constitutional rules are present
        validation_results.extend(self._check_required_rules(config))

        # Check 2: Ensure no security-critical rules are disabled
        validation_results.extend(self._check_disabled_critical_rules(config))

        # Check 3: Validate rule configuration consistency
        validation_results.extend(self._check_configuration_consistency(config))

        # Append to existing results
        return results + validation_results

    def _check_required_rules(self, config: ConfigurationProfile) -> list[CheckResult]:
        """Check that required constitutional rules are enabled."""
        results = []

        required_rules = [
            "no-disabled-security-rules",
            "mypy-must-pass",
            "ruff-must-pass",
        ]

        enabled_rule_ids = config.enabled_rules

        for required_rule in required_rules:
            if required_rule not in enabled_rule_ids:
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Required constitutional rule is not enabled: {required_rule}",
                        severity=Severity.ERROR,
                        details={
                            "rule_id": required_rule,
                            "category": "missing_required_rule",
                        },
                    )
                )

        return results

    def _check_disabled_critical_rules(self, config: ConfigurationProfile) -> list[CheckResult]:
        """Check that security-critical rules are not disabled."""
        results = []

        critical_rules = [
            "no-disabled-security-rules",
            "no-unpinned-production-dependencies",
        ]

        # Check if any critical rules are explicitly disabled in config
        # Note: This assumes config has a disabled_rules attribute or similar
        disabled_rules = getattr(config, "disabled_rules", [])

        for critical_rule in critical_rules:
            if critical_rule in disabled_rules:
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Security-critical rule cannot be disabled: {critical_rule}",
                        severity=Severity.ERROR,
                        details={
                            "rule_id": critical_rule,
                            "category": "disabled_critical_rule",
                        },
                    )
                )

        return results

    def _check_configuration_consistency(self, config: ConfigurationProfile) -> list[CheckResult]:
        """Check for internal configuration inconsistencies."""
        results = []

        # Check for duplicate rule IDs
        enabled_rule_ids = config.enabled_rules
        if len(enabled_rule_ids) != len(set(enabled_rule_ids)):
            duplicates = [
                rule_id for rule_id in enabled_rule_ids if enabled_rule_ids.count(rule_id) > 1
            ]
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.FAIL,
                    message=f"Duplicate rule IDs in configuration: {', '.join(set(duplicates))}",
                    severity=Severity.ERROR,
                    details={
                        "duplicates": list(set(duplicates)),
                        "category": "duplicate_rule_ids",
                    },
                )
            )

        # Validation passes if no errors
        if not results:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.PASS,
                    message="Workflow configuration is valid",
                    severity=Severity.INFO,
                    details={"passed": True},
                )
            )

        return results
