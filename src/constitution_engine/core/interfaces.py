"""
Core interfaces and protocols for the Constitutional Enforcement Engine.

These define the contracts that rules, validators, reporters, and adapters
must implement to integrate with the engine.
"""

from pathlib import Path
from typing import Protocol, runtime_checkable

from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

__all__ = [
    "ModuleProtocol",
    "ReporterProtocol",
    "RuleProtocol",
    "ValidatorProtocol",
]


@runtime_checkable
class RuleProtocol(Protocol):
    """
    Protocol for constitutional rules.

    Rules are the atomic unit of checking. They inspect the repository
    context and configuration, then return check results.
    """

    identifier: str
    description: str
    enabled: bool

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Execute the rule against the repository.

        Args:
            context: Information about the repository under test
            config: Engine configuration

        Returns:
            List of check results (may be empty if rule doesn't apply)
        """
        ...


@runtime_checkable
class ValidatorProtocol(Protocol):
    """
    Protocol for validators.

    Validators post-process check results or perform higher-level
    validation logic (e.g., workflow state validation).
    """

    identifier: str
    description: str

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Validate check results or repository state.

        Args:
            results: Check results from rules (may be empty)
            context: Information about the repository
            config: Engine configuration

        Returns:
            Additional check results or modified results
        """
        ...


@runtime_checkable
class ReporterProtocol(Protocol):
    """
    Protocol for result reporters.

    Reporters format and output check results for human or machine consumption.
    """

    name: str

    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> str:
        """
        Generate a report from check results.

        Args:
            results: All check results from the engine run
            context: Information about the repository
            config: Engine configuration

        Returns:
            Formatted report as a string
        """
        ...

    def write_output(self, report: str, output_path: Path | None = None) -> None:
        """
        Write the report to a file or stdout.

        Args:
            report: The formatted report string
            output_path: Optional path to write to (None = stdout)
        """
        ...


@runtime_checkable
class ModuleProtocol(Protocol):
    """
    Protocol for language/stack-specific modules.

    Modules bundle related rules and provide language-specific discovery.
    """

    name: str
    supported_languages: set[str]

    def discover_rules(
        self,
        context: RepositoryContext,
    ) -> list[RuleProtocol]:
        """
        Discover and return rules applicable to this repository.

        Args:
            context: Information about the repository

        Returns:
            List of rule instances to register
        """
        ...
