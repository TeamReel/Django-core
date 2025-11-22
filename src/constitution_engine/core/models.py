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

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    # Alternative names for compatibility
    INFO = "low"
    WARNING = "medium"
    ERROR = "high"
    FATAL = "critical"


class CheckStatus(str, Enum):
    """Status of a check result."""

    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


@dataclass(frozen=True)
class ConstitutionRule:
    """
    Represents a single enforceable rule from the project constitution.

    Attributes:
        identifier: Unique rule identifier (e.g. "RULE-001")
        description: Human-readable description
        severity: Severity level for violations
        category: Rule category (e.g. "security", "quality")
        enabled: Whether the rule is active
        metadata: Additional rule metadata
    """

    identifier: str
    description: str
    severity: Severity = Severity.ERROR
    category: str = "general"
    enabled: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate rule data."""
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
            raise ValueError("Message cannot be empty")

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
    Represents the engine's effective configuration.

    Attributes:
        enabled_rules: List of rule identifiers to run (empty = all enabled rules)
        target_directories: Directories to analyze (empty = root directory)
        adapter_options: Configuration for specific adapters
        output_formats: List of output format preferences
        constitution_path: Path to constitution file
        metadata: Additional configuration metadata
    """

    enabled_rules: list[str] = field(default_factory=list)
    target_directories: list[Path] = field(default_factory=list)
    adapter_options: dict[str, Any] = field(default_factory=dict)
    output_formats: list[str] = field(default_factory=lambda: ["console"])
    constitution_path: Path | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate and normalize configuration."""
        # Convert string paths to Path objects
        self.target_directories = [
            Path(path) if isinstance(path, str) else path for path in self.target_directories
        ]
        if isinstance(self.constitution_path, str):
            self.constitution_path = Path(self.constitution_path)


@dataclass
class RepositoryContext:
    """
    Represents information about the repository under analysis.

    Attributes:
        root_path: Absolute path to repository root
        constitution_path: Path to constitution file if found
        detected_languages: Set of detected programming languages
        git_branch: Current Git branch (if available)
        git_commit: Current Git commit hash (if available)
        tags: Repository tags/labels
        metadata: Additional context metadata
    """

    root_path: Path
    constitution_path: Path | None = None
    detected_languages: set[str] = field(default_factory=set)
    git_branch: str | None = None
    git_commit: str | None = None
    tags: set[str] = field(default_factory=set)
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate and normalize context."""
        if isinstance(self.root_path, str):
            self.root_path = Path(self.root_path)

        # Ensure root_path is absolute
        if not self.root_path.is_absolute():
            self.root_path = self.root_path.absolute()

        if isinstance(self.constitution_path, str):
            self.constitution_path = Path(self.constitution_path)
