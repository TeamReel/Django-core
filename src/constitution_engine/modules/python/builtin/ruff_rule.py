"""
Built-in rule: Ruff Linting

This rule ensures that Ruff linting passes for the repository.
"""

import subprocess

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["RuffRule"]


class RuffRule:
    """
    Constitutional rule: Ruff must pass.

    This rule runs Ruff linting and reports any violations.
    """

    identifier = "ruff-must-pass"
    description = "Ensures Ruff linting passes"
    enabled = True

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Execute Ruff linting.

        Args:
            context: Repository context
            config: Engine configuration

        Returns:
            List of check results
        """
        results = []

        # Check if Ruff is available
        try:
            subprocess.run(
                ["ruff", "--version"],
                capture_output=True,
                check=True,
                timeout=5,
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.SKIP,
                    message="Ruff is not installed or not available in PATH",
                    severity=Severity.WARNING,
                    details={"suggestion": "Install Ruff: pip install ruff"},
                )
            )
            return results

        # Run Ruff on the repository
        try:
            result = subprocess.run(
                ["ruff", "check", str(context.root_path)],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.PASS,
                        message="Ruff linting passed",
                        severity=Severity.INFO,
                        details={"passed": True},
                    )
                )
            else:
                # Parse Ruff output for specific violations
                error_lines = [line for line in result.stdout.split("\n") if line.strip()]

                if error_lines:
                    # Group errors by severity
                    for line in error_lines[:10]:  # Limit to first 10 errors
                        results.append(
                            CheckResult(
                                rule_identifier=self.identifier,
                                status=CheckStatus.FAIL,
                                message=f"Ruff violation: {line}",
                                severity=Severity.ERROR,
                                details={"full_output": result.stdout},
                            )
                        )
                else:
                    results.append(
                        CheckResult(
                            rule_identifier=self.identifier,
                            status=CheckStatus.FAIL,
                            message="Ruff linting failed",
                            severity=Severity.ERROR,
                            details={"exit_code": result.returncode},
                        )
                    )

        except subprocess.TimeoutExpired:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message="Ruff execution timed out (60s limit)",
                    severity=Severity.ERROR,
                    details={},
                )
            )
        except Exception as e:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message=f"Failed to run Ruff: {e}",
                    severity=Severity.ERROR,
                    details={},
                )
            )

        return results
