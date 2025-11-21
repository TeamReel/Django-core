"""
Core engine and pipeline orchestrator.

The Engine class wires together configuration loading, rule discovery,
execution, validation, and reporting.
"""

import logging
from pathlib import Path

from constitution_engine.core.interfaces import (
    ReporterProtocol,
    RuleProtocol,
    ValidatorProtocol,
)
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

__all__ = ["Engine"]

logger = logging.getLogger(__name__)


class Engine:
    """
    Constitutional Enforcement Engine orchestrator.

    Coordinates configuration loading, rule execution, validation,
    and reporting for a single repository.
    """

    def __init__(
        self,
        config: ConfigurationProfile,
        context: RepositoryContext,
    ) -> None:
        """
        Initialize the engine.

        Args:
            config: Configuration profile for this run
            context: Repository context
        """
        self.config = config
        self.context = context
        self._rules: list[RuleProtocol] = []
        self._validators: list[ValidatorProtocol] = []
        self._reporters: list[ReporterProtocol] = []

    def register_rule(self, rule: RuleProtocol) -> None:
        """Register a rule for execution."""
        logger.debug(f"Registering rule: {rule.identifier}")
        self._rules.append(rule)

    def register_validator(self, validator: ValidatorProtocol) -> None:
        """Register a validator for post-processing."""
        logger.debug(f"Registering validator: {validator.identifier}")
        self._validators.append(validator)

    def register_reporter(self, reporter: ReporterProtocol) -> None:
        """Register a reporter for output."""
        logger.debug(f"Registering reporter: {reporter.name}")
        self._reporters.append(reporter)

    def run_once(self) -> list[CheckResult]:
        """
        Execute the engine pipeline once.

        Returns:
            List of all check results from rules and validators

        Workflow:
            1. Execute all registered rules
            2. Run validators on the results
            3. Return combined results
        """
        logger.info(f"Starting engine run for repository: {self.context.root_path}")

        # Phase 1: Execute rules
        rule_results: list[CheckResult] = []
        for rule in self._rules:
            if not rule.enabled:
                logger.debug(f"Skipping disabled rule: {rule.identifier}")
                continue

            if self.config.enabled_rules and rule.identifier not in self.config.enabled_rules:
                logger.debug(f"Skipping rule not in enabled list: {rule.identifier}")
                continue

            try:
                logger.debug(f"Executing rule: {rule.identifier}")
                results = rule.execute(self.context, self.config)
                rule_results.extend(results)
                logger.debug(f"Rule {rule.identifier} produced {len(results)} results")
            except Exception:
                logger.exception(f"Error executing rule: {rule.identifier}")
                # Continue with other rules even if one fails

        logger.info(f"Rules produced {len(rule_results)} results")

        # Phase 2: Run validators
        all_results = rule_results.copy()
        for validator in self._validators:
            try:
                logger.debug(f"Running validator: {validator.identifier}")
                validator_results = validator.validate(all_results, self.context, self.config)
                all_results.extend(validator_results)
                logger.debug(
                    f"Validator {validator.identifier} produced "
                    f"{len(validator_results)} results"
                )
            except Exception:
                logger.exception(f"Error running validator: {validator.identifier}")
                # Continue with other validators even if one fails

        logger.info(f"Engine run complete: {len(all_results)} total results")
        return all_results

    def run_and_report(
        self, output_path: Path | None = None
    ) -> tuple[list[CheckResult], list[str]]:
        """
        Execute the engine and generate reports.

        Args:
            output_path: Optional path for file-based reporters

        Returns:
            Tuple of (check results, list of report strings)
        """
        results = self.run_once()

        reports: list[str] = []
        for reporter in self._reporters:
            try:
                logger.debug(f"Generating report: {reporter.name}")
                report = reporter.report(results, self.context, self.config)
                reports.append(report)

                if output_path:
                    reporter.write_output(report, output_path)
                else:
                    reporter.write_output(report, None)

            except Exception:
                logger.exception(f"Error generating report: {reporter.name}")
                # Continue with other reporters even if one fails

        return results, reports

    def get_exit_code(self, results: list[CheckResult]) -> int:
        """
        Determine exit code based on check results.

        Args:
            results: All check results from a run

        Returns:
            0 if all checks passed, 1 if any failures
        """
        has_failures = any(r.is_failure for r in results)

        if has_failures:
            return 1

        if self.config.fail_on_warning:
            from constitution_engine.core.models import Severity

            has_warnings = any(r.severity == Severity.WARNING for r in results)
            if has_warnings:
                return 1

        return 0
