"""
Configuration schema and data structures for the Constitutional Enforcement Engine.

This module defines the configuration schema that captures rules, modules,
reporters, and adapters as specified in WP02 T010.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

__all__ = [
    "AdapterConfig",
    "ConfigSchema",
    "ConfigurationError",
    "ModuleConfig",
    "ReporterConfig",
    "RuleConfig",
    "ValidatorConfig",
]


class ConfigurationError(Exception):
    """Exception raised for configuration-related errors."""

    pass


@dataclass
class RuleConfig:
    """
    Configuration for a single rule.

    Attributes:
        identifier: Unique rule identifier (e.g. "RULE-001")
        enabled: Whether the rule is active
        severity: Override the rule's default severity
        parameters: Rule-specific parameters
        description: Optional description override
    """

    identifier: str
    enabled: bool = True
    severity: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)
    description: str | None = None

    def __post_init__(self) -> None:
        """Validate rule configuration."""
        if not self.identifier:
            raise ConfigurationError("Rule identifier cannot be empty")

        # Validate severity if provided
        if self.severity is not None:
            valid_severities = {
                "low",
                "medium",
                "high",
                "critical",
                "info",
                "warning",
                "error",
                "fatal",
            }
            if self.severity.lower() not in valid_severities:
                raise ConfigurationError(
                    f"Invalid severity '{self.severity}' for rule {self.identifier}"
                )


@dataclass
class ValidatorConfig:
    """
    Configuration for a validator.

    Attributes:
        identifier: Unique validator identifier
        enabled: Whether the validator is active
        parameters: Validator-specific parameters
        description: Optional description
    """

    identifier: str
    enabled: bool = True
    parameters: dict[str, Any] = field(default_factory=dict)
    description: str | None = None

    def __post_init__(self) -> None:
        """Validate validator configuration."""
        if not self.identifier:
            raise ConfigurationError("Validator identifier cannot be empty")


@dataclass
class ReporterConfig:
    """
    Configuration for a reporter.

    Attributes:
        name: Reporter name (e.g. "console", "json", "junit")
        enabled: Whether the reporter is active
        output_path: Optional output file path
        parameters: Reporter-specific parameters
    """

    name: str
    enabled: bool = True
    output_path: Path | None = None
    parameters: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate reporter configuration."""
        if not self.name:
            raise ConfigurationError("Reporter name cannot be empty")

        # Convert string path to Path object
        if isinstance(self.output_path, str):
            self.output_path = Path(self.output_path)


@dataclass
class ModuleConfig:
    """
    Configuration for a module/plugin.

    Attributes:
        name: Module name
        enabled: Whether the module is active
        source_type: Type of module source ("builtin", "entry_point", "path")
        source_location: Location of the module (path for "path" type)
        parameters: Module-specific parameters
    """

    name: str
    enabled: bool = True
    source_type: Literal["builtin", "entry_point", "path"] = "builtin"
    source_location: str | Path | None = None
    parameters: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate module configuration."""
        if not self.name:
            raise ConfigurationError("Module name cannot be empty")

        if self.source_type not in ("builtin", "entry_point", "path"):
            raise ConfigurationError(
                f"Invalid source_type '{self.source_type}' for module {self.name}"
            )

        if self.source_type == "path" and not self.source_location:
            raise ConfigurationError(
                f"Module {self.name} with source_type 'path' requires source_location"
            )

        # Convert string path to Path object for path-based modules
        if self.source_type == "path" and isinstance(self.source_location, str):
            self.source_location = Path(self.source_location)


@dataclass
class AdapterConfig:
    """
    Configuration for repository adapters.

    Attributes:
        name: Adapter name (e.g. "git", "django_core")
        enabled: Whether the adapter is active
        parameters: Adapter-specific parameters
        priority: Adapter priority (higher runs first)
    """

    name: str
    enabled: bool = True
    parameters: dict[str, Any] = field(default_factory=dict)
    priority: int = 0

    def __post_init__(self) -> None:
        """Validate adapter configuration."""
        if not self.name:
            raise ConfigurationError("Adapter name cannot be empty")


@dataclass
class ConfigSchema:
    """
    Complete configuration schema for the Constitutional Enforcement Engine.

    This represents the structure of a constitution_engine.yaml configuration file.
    """

    # Engine behavior
    fail_fast: bool = False
    constitution_path: Path | None = None
    target_directories: list[Path] = field(default_factory=list)
    exclude_patterns: list[str] = field(default_factory=list)

    # Component configurations
    rules: list[RuleConfig] = field(default_factory=list)
    validators: list[ValidatorConfig] = field(default_factory=list)
    reporters: list[ReporterConfig] = field(default_factory=list)
    modules: list[ModuleConfig] = field(default_factory=list)
    adapters: list[AdapterConfig] = field(default_factory=list)

    # Environment and overrides
    environment_overrides: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate and normalize configuration schema."""
        # Convert string paths to Path objects
        if isinstance(self.constitution_path, str):
            self.constitution_path = Path(self.constitution_path)

        self.target_directories = [
            Path(path) if isinstance(path, str) else path for path in self.target_directories
        ]

        # Validate that required safety rules are not disabled
        self._validate_constitutional_compliance()

    def _validate_constitutional_compliance(self) -> None:
        """
        Validate that configuration doesn't violate constitutional requirements.

        This enforces that certain safety-critical rules cannot be disabled.
        """
        # Define constitutional rules that cannot be disabled
        constitutional_rules = {
            "CONST-001",  # Constitution file must exist
            "CONST-002",  # Constitution must be well-formed
            "SEC-001",  # No hardcoded secrets
            "SEC-002",  # Secure dependencies only
        }

        # Check for disabled constitutional rules
        disabled_constitutional_rules = []
        for rule in self.rules:
            if rule.identifier in constitutional_rules and not rule.enabled:
                disabled_constitutional_rules.append(rule.identifier)

        if disabled_constitutional_rules:
            raise ConfigurationError(
                "Constitutional rules cannot be disabled: "
                f"{', '.join(disabled_constitutional_rules)}. "
                f"These rules are required for constitutional compliance."
            )

    def get_enabled_rules(self) -> list[RuleConfig]:
        """Get list of enabled rules."""
        return [rule for rule in self.rules if rule.enabled]

    def get_enabled_validators(self) -> list[ValidatorConfig]:
        """Get list of enabled validators."""
        return [validator for validator in self.validators if validator.enabled]

    def get_enabled_reporters(self) -> list[ReporterConfig]:
        """Get list of enabled reporters."""
        return [reporter for reporter in self.reporters if reporter.enabled]

    def get_enabled_modules(self) -> list[ModuleConfig]:
        """Get list of enabled modules."""
        return [module for module in self.modules if module.enabled]

    def get_enabled_adapters(self) -> list[AdapterConfig]:
        """Get list of enabled adapters, sorted by priority (highest first)."""
        enabled_adapters = [adapter for adapter in self.adapters if adapter.enabled]
        return sorted(enabled_adapters, key=lambda a: a.priority, reverse=True)

    def get_rule_by_id(self, identifier: str) -> RuleConfig | None:
        """Get rule configuration by identifier."""
        for rule in self.rules:
            if rule.identifier == identifier:
                return rule
        return None

    def is_rule_enabled(self, identifier: str) -> bool:
        """Check if a rule is enabled."""
        rule = self.get_rule_by_id(identifier)
        return rule.enabled if rule else True  # Default to enabled if not found
