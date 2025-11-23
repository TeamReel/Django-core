"""
SecurityReporter for Constitutional Engine integration.
Implements the ReporterProtocol and generates security baseline reports.
"""

import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from security_baseline.reports import (
    ASVSCoverageCalculator,
    SecurityReport,
    get_correlation_id,
    security_logger,
    validate_security_report,
)
from security_baseline.rules.base import SecurityRuleViolation
from security_baseline.rules.registry import _registry


class SecurityReporter:
    """
    Reporter for security baseline violations (implements ReporterProtocol).

    Generates comprehensive SecurityReport objects with OWASP ASVS coverage,
    structured logging, and JSON Schema validation.
    """

    name = "Security Baseline Reporter"

    def __init__(self):
        """Initialize the security reporter."""
        self.asvs_calculator = ASVSCoverageCalculator()
        self.start_time = None

    def report(self, results, context, config) -> SecurityReport:
        """
        Generate comprehensive security report from constitutional engine results.

        Args:
            results: Results from constitutional engine execution
            context: Execution context (settings, environment, etc.)
            config: Constitutional engine configuration

        Returns:
            SecurityReport object with all violations and metadata
        """
        # Track execution time
        execution_time_ms = self._calculate_execution_time()

        # Extract security violations from results
        violations = self._extract_security_violations(results)

        # Get all registered security rules
        all_rules = list(_registry.get_all_rules())

        # Determine passed rules (rules that executed without violations)
        violated_rule_ids = {v.rule_id for v in violations}
        passed_rules = [rule.rule_id for rule in all_rules if rule.rule_id not in violated_rule_ids]

        # Calculate OWASP ASVS coverage
        asvs_coverage = self.asvs_calculator.calculate_coverage(all_rules, violations)

        # Extract environment and enforcement mode from context
        environment = self._extract_environment(context)
        enforcement_mode = context.get("enforcement_mode", "strict")

        # Create comprehensive security report
        report = SecurityReport(
            report_id=f"security-{int(time.time())}",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment=environment,
            enforcement_mode=enforcement_mode,
            violations=violations,
            passed_rules=passed_rules,
            overall_status="",  # Will be calculated in __post_init__
            execution_time_ms=execution_time_ms,
            owasp_asvs_coverage=asvs_coverage,
            correlation_id=get_correlation_id(),
            metadata={
                "total_rules_executed": len(all_rules),
                "constitutional_engine_version": getattr(config, "version", "unknown"),
                "django_settings_module": os.getenv("DJANGO_SETTINGS_MODULE", "unknown"),
            },
        )

        # Validate report against JSON schema
        is_valid, validation_errors = validate_security_report(report)
        if not is_valid:
            security_logger.logger.warning(
                f"Generated security report failed validation: {validation_errors}"
            )

        # Log report generation
        security_logger.complete_validation_run(
            status=report.overall_status,
            total_rules=len(all_rules),
            violations_count=len(violations),
            execution_time_ms=execution_time_ms,
        )

        return report

    def _extract_security_violations(self, results) -> List[SecurityRuleViolation]:
        """
        Extract SecurityRuleViolation objects from constitutional engine results.

        Args:
            results: Raw results from constitutional engine

        Returns:
            List of SecurityRuleViolation objects
        """
        violations = []

        for result in results:
            # Handle SecurityRuleViolation objects directly
            if isinstance(result, SecurityRuleViolation):
                violations.append(result)
            # Handle other engine results that represent failures
            elif (
                hasattr(result, "rule_identifier")
                and result.rule_identifier.startswith("SEC")
                and getattr(result, "is_failure", False)
            ):
                # Create SecurityRuleViolation from engine result
                violation = SecurityRuleViolation(
                    rule_id=result.rule_identifier,
                    rule_name=getattr(result, "rule_name", result.rule_identifier),
                    message=getattr(result, "message", "Security rule violation"),
                    severity=getattr(result, "severity", "MEDIUM"),
                    violated_setting=getattr(result, "violated_setting", "unknown"),
                    current_value=str(getattr(result, "current_value", "")),
                    expected_value=str(getattr(result, "expected_value", "")),
                    owasp_asvs_refs=getattr(result, "owasp_asvs_refs", []),
                    remediation=getattr(result, "remediation", "See rule documentation"),
                    timestamp=datetime.utcnow(),
                    environment=getattr(result, "environment", "unknown"),
                )
                violations.append(violation)

        return violations

    def _extract_environment(self, context: Dict[str, Any]) -> str:
        """
        Extract environment name from context.

        Args:
            context: Execution context

        Returns:
            Environment name (local, staging, production, ci)
        """
        # Check context first
        if "environment" in context:
            return context["environment"]

        # Try to determine from Django settings module
        settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
        if "local" in settings_module:
            return "local"
        elif "staging" in settings_module:
            return "staging"
        elif "production" in settings_module:
            return "production"
        elif "test" in settings_module or os.getenv("CI"):
            return "ci"

        return "unknown"

    def _calculate_execution_time(self) -> int:
        """
        Calculate execution time in milliseconds.

        Returns:
            Execution time in milliseconds
        """
        if self.start_time is None:
            return 0

        return int((time.time() - self.start_time) * 1000)

    def start_timing(self) -> None:
        """Start execution timing."""
        self.start_time = time.time()

    def write_output(
        self, report: SecurityReport, output_path: Optional[str] = None, output_format: str = "json"
    ) -> None:
        """
        Write security report to file or stdout.

        Args:
            report: SecurityReport to write
            output_path: Optional file path (writes to stdout if None)
            output_format: Output format ('json' or 'yaml')
        """
        if output_format.lower() == "yaml":
            output = report.to_yaml()
        else:
            output = report.to_json()

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(output)
            security_logger.logger.info("Security report written to %s", output_path)
        else:
            print(output)
