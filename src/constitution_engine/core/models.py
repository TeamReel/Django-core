"""
Core data models for the Constitutional Enforcement Engine.

This module defines the primary entities used throughout the engine:
- ConstitutionRule: Represents a single enforceable rule
- CheckResult: Represents the outcome of running a rule
- ConfigurationProfile: Represents the engine's configuration
- RepositoryContext: Represents information about the repository under test
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

__all__ = [
    "CheckResult",
    "CheckStatus",
    "ConfigurationProfile",
    "ConstitutionRule",
    "RepositoryContext",
    "Severity",
]


class Severity(str, Enum):
    """Severity level for rules and check results."""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class CheckStatus(str, Enum):
    """Status of a check result."""

    PASS = "pass"  # noqa: S105
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


@dataclass(frozen=True)
class ConstitutionRule:
    """
    Represents a single constitutional rule or constraint.

    Attributes:
        identifier: Unique rule identifier (e.g., "CONST-001", "PY-MYPY")
        description: Human-readable description of the rule
        severity: Severity level (error, warning, info)
        category: Optional category for grouping (e.g., "security", "style")
        enabled: Whether the rule is enabled by default
    """

    identifier: str
    description: str
    severity: Severity = Severity.ERROR
    category: str | None = None
    enabled: bool = True

    def __post_init__(self) -> None:
        """Validate rule configuration."""
        if not self.identifier:
            raise ValueError("Rule identifier cannot be empty")
        if not self.description:
            raise ValueError("Rule description cannot be empty")


@dataclass(frozen=True)
class CheckResult:
    """
    Represents the outcome of running a single rule or validator.

    Attributes:
        rule_identifier: The rule that was checked
        status: Pass/fail/skip/error status
        message: Human-readable result message
        affected_paths: Paths relevant to this result
        severity: Severity level (inherited from rule or overridden)
        details: Additional structured data about the result
    """

    rule_identifier: str
    status: CheckStatus
    message: str
    affected_paths: list[Path] = field(default_factory=list)
    severity: Severity = Severity.ERROR
    details: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate check result."""
        if not self.rule_identifier:
            raise ValueError("Rule identifier cannot be empty")
        if not self.message:
            raise ValueError("Result message cannot be empty")

    @property
    def is_failure(self) -> bool:
        """Check if this result represents a failure."""
        return self.status in (CheckStatus.FAIL, CheckStatus.ERROR)

    @property
    def is_success(self) -> bool:
        """Check if this result represents success."""
        return self.status == CheckStatus.PASS


@dataclass
class ConfigurationProfile:
    """
    Represents the effective configuration for the engine.

    Attributes:
        enabled_rules: List of rule identifiers to execute
        target_directories: Directories to scan (relative to repo root)
        excluded_patterns: Glob patterns to exclude from checks
        constitution_path: Path to constitution file
        spec_kitty_enabled: Whether to check Spec Kitty artefacts
        fail_on_warning: Whether warnings should cause non-zero exit
        config_source: Path to the config file that was loaded
    """

    enabled_rules: list[str] = field(default_factory=list)
    target_directories: list[Path] = field(default_factory=lambda: [Path()])
    excluded_patterns: list[str] = field(
        default_factory=lambda: ["venv/", ".git/", "__pycache__/", "*.pyc"]
    )
    constitution_path: Path | None = None
    spec_kitty_enabled: bool = True
    fail_on_warning: bool = False
    config_source: Path | None = None


@dataclass
class RepositoryContext:
    """
    Represents high-level information about the repository under test.

    Attributes:
        root_path: Absolute path to repository root
        detected_languages: Programming languages detected in the repo
        has_git: Whether the repository is a Git repository
        spec_kitty_features: Detected Spec Kitty feature directories
        constitution_file: Path to constitution file if found
        metadata: Additional repository metadata
    """

    root_path: Path
    detected_languages: set[str] = field(default_factory=set)
    has_git: bool = False
    spec_kitty_features: list[Path] = field(default_factory=list)
    constitution_file: Path | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate repository context."""
        if not self.root_path.exists():
            raise ValueError(f"Repository root does not exist: {self.root_path}")
        if not self.root_path.is_absolute():
            raise ValueError(f"Repository root must be absolute: {self.root_path}")
