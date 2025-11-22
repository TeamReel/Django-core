"""
Built-in rule: Mypy Type Checking

This rule ensures that mypy type checking passes for the repository.
"""

import subprocess

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["MypyRule"]


class MypyRule:
    """
    Constitutional rule: Mypy must pass.

    This rule runs mypy type checking and reports any type errors as violations.
    """

    identifier = "mypy-must-pass"
    description = "Ensures mypy type checking passes"
    enabled = True

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Execute mypy type checking.

        Args:
            context: Repository context
            config: Engine configuration

        Returns:
            List of check results
        """
        results = []

        # Check if mypy is available
        try:
            subprocess.run(
                ["mypy", "--version"],
                capture_output=True,
                check=True,
                timeout=5,
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.SKIP,
                    message="mypy is not installed or not available in PATH",
                    severity=Severity.WARNING,
                    details={"suggestion": "Install mypy: pip install mypy"},
                )
            )
            return results

        # Run mypy on the repository
        try:
            result = subprocess.run(
                ["mypy", str(context.root_path)],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.PASS,
                        message="mypy type checking passed",
                        severity=Severity.INFO,
                        details={"passed": True},
                    )
                )
            else:
                # Parse mypy output for specific errors
                error_lines = [line for line in result.stdout.split("\n") if line.strip()]

                if error_lines:
                    # Group errors by file
                    for line in error_lines[:10]:  # Limit to first 10 errors
                        results.append(
                            CheckResult(
                                rule_identifier=self.identifier,
                                status=CheckStatus.FAIL,
                                message=f"mypy error: {line}",
                                severity=Severity.ERROR,
                                details={"full_output": result.stdout},
                            )
                        )
                else:
                    results.append(
                        CheckResult(
                            rule_identifier=self.identifier,
                            status=CheckStatus.FAIL,
                            message="mypy type checking failed",
                            severity=Severity.ERROR,
                            details={"exit_code": result.returncode},
                        )
                    )

        except subprocess.TimeoutExpired:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message="mypy execution timed out (60s limit)",
                    severity=Severity.ERROR,
                    details={},
                )
            )
        except Exception as e:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message=f"Failed to run mypy: {e}",
                    severity=Severity.ERROR,
                    details={},
                )
            )

        return results
