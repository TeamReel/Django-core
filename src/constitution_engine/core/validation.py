"""
Configuration validation for the Constitutional Enforcement Engine.

This module implements validation logic that rejects malformed or
constitution-violating configurations with helpful error messages as specified in WP02 T013.
"""

import logging
from pathlib import Path
from typing import List, Optional

from constitution_engine.core.config import (
    AdapterConfig,
    ConfigSchema,
    ConfigurationError,
    ModuleConfig,
    ReporterConfig,
    RuleConfig,
    ValidatorConfig,
)

__all__ = [
    "ConfigValidator",
    "ValidationResult",
    "ValidationError",
    "validate_config_schema",
]

logger = logging.getLogger(__name__)


class ValidationError:
    """Represents a single configuration validation error."""

    def __init__(
        self, message: str, path: str, severity: str = "error", suggestion: Optional[str] = None
    ) -> None:
        """
        Initialize validation error.

        Args:
            message: Error message describing the issue
            path: Configuration path where error occurred
            severity: Error severity (error, warning, info)
            suggestion: Optional suggestion for fixing the error
        """
        self.message = message
        self.path = path
        self.severity = severity
        self.suggestion = suggestion

    def __str__(self) -> str:
        """String representation of the error."""
        result = f"[{self.severity.upper()}] {self.path}: {self.message}"
        if self.suggestion:
            result += f"\n  Suggestion: {self.suggestion}"
        return result


class ValidationResult:
    """Result of configuration validation."""

    def __init__(self) -> None:
        """Initialize empty validation result."""
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []
        self.info: List[ValidationError] = []

    def add_error(self, message: str, path: str, suggestion: Optional[str] = None) -> None:
        """Add an error to the validation result."""
        self.errors.append(ValidationError(message, path, "error", suggestion))

    def add_warning(self, message: str, path: str, suggestion: Optional[str] = None) -> None:
        """Add a warning to the validation result."""
        self.warnings.append(ValidationError(message, path, "warning", suggestion))

    def add_info(self, message: str, path: str, suggestion: Optional[str] = None) -> None:
        """Add an info message to the validation result."""
        self.info.append(ValidationError(message, path, "info", suggestion))

    @property
    def is_valid(self) -> bool:
        """Check if validation passed (no errors)."""
        return len(self.errors) == 0

    @property
    def has_warnings(self) -> bool:
        """Check if validation has warnings."""
        return len(self.warnings) > 0

    def get_summary(self) -> str:
        """Get a summary of validation results."""
        if self.is_valid and not self.has_warnings:
            return "Configuration validation passed"

        summary_parts = []
        if self.errors:
            summary_parts.append(f"{len(self.errors)} error(s)")
        if self.warnings:
            summary_parts.append(f"{len(self.warnings)} warning(s)")
        if self.info:
            summary_parts.append(f"{len(self.info)} info message(s)")

        return f"Configuration validation completed with {', '.join(summary_parts)}"

    def get_detailed_report(self) -> str:
        """Get detailed validation report."""
        lines = [self.get_summary(), ""]

        for error in self.errors:
            lines.append(str(error))

        if self.errors and self.warnings:
            lines.append("")

        for warning in self.warnings:
            lines.append(str(warning))

        if (self.errors or self.warnings) and self.info:
            lines.append("")

        for info in self.info:
            lines.append(str(info))

        return "\n".join(lines)


class ConfigValidator:
    """Validates configuration schemas against constitutional requirements."""

    # Constitutional rules that cannot be disabled
    CONSTITUTIONAL_RULES = {
        "CONST-001": "Constitution file must exist and be accessible",
        "CONST-002": "Constitution must be well-formed and parseable",
        "SEC-001": "No hardcoded secrets or sensitive data",
        "SEC-002": "Only secure and approved dependencies",
        "SEC-003": "Secure communication protocols only",
    }

    # Required rules for different project types
    REQUIRED_RULES_BY_TAG = {
        "python-project": {"PYTHON-001", "PYTHON-002"},  # mypy, ruff/flake8
        "javascript-project": {"JS-001", "JS-002"},  # eslint, security
        "django-project": {"DJANGO-001", "DJANGO-002"},  # security checks
    }

    # Valid severity levels
    VALID_SEVERITIES = {"low", "medium", "high", "critical", "info", "warning", "error", "fatal"}

    # Valid output formats
    VALID_OUTPUT_FORMATS = {"console", "json", "junit", "html", "text"}

    def __init__(self, repo_path: Optional[Path] = None) -> None:
        """
        Initialize config validator.

        Args:
            repo_path: Repository path for context-aware validation
        """
        self.repo_path = repo_path

    def validate(self, config: ConfigSchema) -> ValidationResult:
        """
        Validate a configuration schema.

        Args:
            config: Configuration schema to validate

        Returns:
            ValidationResult with any errors, warnings, or info messages
        """
        result = ValidationResult()

        # Validate basic structure
        self._validate_basic_structure(config, result)

        # Validate constitutional compliance
        self._validate_constitutional_compliance(config, result)

        # Validate component configurations
        self._validate_rules(config.rules, result)
        self._validate_validators(config.validators, result)
        self._validate_reporters(config.reporters, result)
        self._validate_modules(config.modules, result)
        self._validate_adapters(config.adapters, result)

        # Validate paths and files
        self._validate_paths(config, result)

        # Validate consistency
        self._validate_consistency(config, result)

        # Context-aware validation
        if self.repo_path:
            self._validate_context_awareness(config, result)

        logger.info(f"Configuration validation completed: {result.get_summary()}")
        return result

    def _validate_basic_structure(self, config: ConfigSchema, result: ValidationResult) -> None:
        """Validate basic configuration structure."""
        # Check for required fields and reasonable values
        if config.fail_fast not in (True, False):
            result.add_error(
                "fail_fast must be a boolean value", "fail_fast", "Set to true or false"
            )

        # Validate exclude patterns
        for i, pattern in enumerate(config.exclude_patterns):
            if not isinstance(pattern, str) or not pattern.strip():
                result.add_error(
                    f"Exclude pattern at index {i} is empty or invalid",
                    f"exclude_patterns[{i}]",
                    "Provide a valid glob pattern string",
                )

        # Check for reasonable number of components
        if len(config.rules) > 200:
            result.add_warning(
                f"Large number of rules configured ({len(config.rules)})",
                "rules",
                "Consider grouping related rules or using modules",
            )

    def _validate_constitutional_compliance(
        self, config: ConfigSchema, result: ValidationResult
    ) -> None:
        """Validate that configuration doesn't violate constitutional requirements."""
        # Check for disabled constitutional rules
        disabled_constitutional_rules = []

        for rule in config.rules:
            if rule.identifier in self.CONSTITUTIONAL_RULES and not rule.enabled:
                disabled_constitutional_rules.append(rule.identifier)

        if disabled_constitutional_rules:
            for rule_id in disabled_constitutional_rules:
                description = self.CONSTITUTIONAL_RULES[rule_id]
                result.add_error(
                    f"Constitutional rule '{rule_id}' cannot be disabled: {description}",
                    f"rules.{rule_id}.enabled",
                    f"Set enabled=true for rule {rule_id} or remove the rule configuration",
                )

        # Validate that at least some constitutional rules are present
        constitutional_rules_present = set()
        for rule in config.rules:
            if rule.identifier in self.CONSTITUTIONAL_RULES:
                constitutional_rules_present.add(rule.identifier)

        missing_constitutional_rules = (
            set(self.CONSTITUTIONAL_RULES.keys()) - constitutional_rules_present
        )
        if missing_constitutional_rules:
            result.add_warning(
                f"Missing constitutional rules: {', '.join(missing_constitutional_rules)}",
                "rules",
                "Add configurations for missing constitutional rules to ensure compliance",
            )

    def _validate_rules(self, rules: List[RuleConfig], result: ValidationResult) -> None:
        """Validate rule configurations."""
        rule_ids = set()

        for i, rule in enumerate(rules):
            rule_path = f"rules[{i}]"

            # Check for duplicate rule IDs
            if rule.identifier in rule_ids:
                result.add_error(
                    f"Duplicate rule identifier: {rule.identifier}",
                    f"{rule_path}.identifier",
                    "Use unique identifiers for each rule",
                )
            rule_ids.add(rule.identifier)

            # Validate rule identifier format
            if (
                not rule.identifier
                or not rule.identifier.replace("-", "").replace("_", "").isalnum()
            ):
                result.add_error(
                    f"Invalid rule identifier format: '{rule.identifier}'",
                    f"{rule_path}.identifier",
                    "Use alphanumeric characters, hyphens, and underscores only",
                )

            # Validate severity if overridden
            if rule.severity and rule.severity.lower() not in self.VALID_SEVERITIES:
                result.add_error(
                    f"Invalid severity '{rule.severity}' for rule {rule.identifier}",
                    f"{rule_path}.severity",
                    f"Use one of: {', '.join(self.VALID_SEVERITIES)}",
                )

            # Validate description
            if rule.description and len(rule.description) > 500:
                result.add_warning(
                    f"Very long description for rule"
                    f" {rule.identifier} ({len(rule.description)} chars)",
                    f"{rule_path}.description",
                    "Consider shortening the description for better readability",
                )

    def _validate_validators(
        self, validators: List[ValidatorConfig], result: ValidationResult
    ) -> None:
        """Validate validator configurations."""
        validator_ids = set()

        for i, validator in enumerate(validators):
            validator_path = f"validators[{i}]"

            # Check for duplicate validator IDs
            if validator.identifier in validator_ids:
                result.add_error(
                    f"Duplicate validator identifier: {validator.identifier}",
                    f"{validator_path}.identifier",
                    "Use unique identifiers for each validator",
                )
            validator_ids.add(validator.identifier)

            # Validate identifier format
            if (
                not validator.identifier
                or not validator.identifier.replace("-", "").replace("_", "").isalnum()
            ):
                result.add_error(
                    f"Invalid validator identifier format: '{validator.identifier}'",
                    f"{validator_path}.identifier",
                    "Use alphanumeric characters, hyphens, and underscores only",
                )

    def _validate_reporters(
        self, reporters: List[ReporterConfig], result: ValidationResult
    ) -> None:
        """Validate reporter configurations."""
        reporter_names = set()

        for i, reporter in enumerate(reporters):
            reporter_path = f"reporters[{i}]"

            # Check for duplicate reporter names
            if reporter.name in reporter_names:
                result.add_error(
                    f"Duplicate reporter name: {reporter.name}",
                    f"{reporter_path}.name",
                    "Use unique names for each reporter",
                )
            reporter_names.add(reporter.name)

            # Validate reporter name
            if reporter.name not in self.VALID_OUTPUT_FORMATS:
                result.add_warning(
                    f"Unknown reporter type: {reporter.name}",
                    f"{reporter_path}.name",
                    f"Consider using one of: {', '.join(self.VALID_OUTPUT_FORMATS)}",
                )

            # Validate output path if specified
            if reporter.output_path:
                try:
                    # Check if path is reasonable
                    path = Path(reporter.output_path)
                    if path.is_absolute() and not path.parent.exists():
                        result.add_warning(
                            f"Output directory does not exist: {path.parent}",
                            f"{reporter_path}.output_path",
                            "Ensure the output directory exists or will be created",
                        )
                except (OSError, ValueError) as e:
                    result.add_error(
                        f"Invalid output path: {e}",
                        f"{reporter_path}.output_path",
                        "Provide a valid file path",
                    )

    def _validate_modules(self, modules: List[ModuleConfig], result: ValidationResult) -> None:
        """Validate module configurations."""
        module_names = set()

        for i, module in enumerate(modules):
            module_path = f"modules[{i}]"

            # Check for duplicate module names
            if module.name in module_names:
                result.add_error(
                    f"Duplicate module name: {module.name}",
                    f"{module_path}.name",
                    "Use unique names for each module",
                )
            module_names.add(module.name)

            # Validate source location for path-based modules
            if module.source_type == "path":
                if not module.source_location:
                    result.add_error(
                        f"Module {module.name} with source_type 'path' requires source_location",
                        f"{module_path}.source_location",
                        "Provide a path to the module file or directory",
                    )
                elif isinstance(module.source_location, (str, Path)):
                    try:
                        path = Path(module.source_location)
                        if not path.exists():
                            result.add_warning(
                                f"Module path does not exist: {path}",
                                f"{module_path}.source_location",
                                "Ensure the module path exists and is accessible",
                            )
                    except (OSError, ValueError) as e:
                        result.add_error(
                            f"Invalid module path: {e}",
                            f"{module_path}.source_location",
                            "Provide a valid file or directory path",
                        )

    def _validate_adapters(self, adapters: List[AdapterConfig], result: ValidationResult) -> None:
        """Validate adapter configurations."""
        adapter_names = set()

        for i, adapter in enumerate(adapters):
            adapter_path = f"adapters[{i}]"

            # Check for duplicate adapter names
            if adapter.name in adapter_names:
                result.add_error(
                    f"Duplicate adapter name: {adapter.name}",
                    f"{adapter_path}.name",
                    "Use unique names for each adapter",
                )
            adapter_names.add(adapter.name)

            # Validate priority
            if not isinstance(adapter.priority, int):
                result.add_error(
                    f"Adapter priority must be an integer: {adapter.priority}",
                    f"{adapter_path}.priority",
                    "Use an integer value for priority (higher numbers run first)",
                )
            elif adapter.priority < 0 or adapter.priority > 100:
                result.add_warning(
                    f"Unusual adapter priority: {adapter.priority}",
                    f"{adapter_path}.priority",
                    "Consider using priorities between 0-100",
                )

    def _validate_paths(self, config: ConfigSchema, result: ValidationResult) -> None:
        """Validate file and directory paths in configuration."""
        # Validate constitution path
        if config.constitution_path:
            try:
                path = Path(config.constitution_path)
                if not path.exists():
                    result.add_warning(
                        f"Constitution file does not exist: {path}",
                        "constitution_path",
                        "Ensure the constitution file exists and is accessible",
                    )
                elif not path.is_file():
                    result.add_error(
                        f"Constitution path is not a file: {path}",
                        "constitution_path",
                        "Provide a path to a constitution file, not a directory",
                    )
            except (OSError, ValueError) as e:
                result.add_error(
                    f"Invalid constitution path: {e}",
                    "constitution_path",
                    "Provide a valid file path",
                )

        # Validate target directories
        for i, target_dir in enumerate(config.target_directories):
            try:
                path = Path(target_dir)
                if not path.exists():
                    result.add_warning(
                        f"Target directory does not exist: {path}",
                        f"target_directories[{i}]",
                        "Ensure the target directory exists",
                    )
                elif not path.is_dir():
                    result.add_error(
                        f"Target path is not a directory: {path}",
                        f"target_directories[{i}]",
                        "Provide a path to a directory, not a file",
                    )
            except (OSError, ValueError) as e:
                result.add_error(
                    f"Invalid target directory path: {e}",
                    f"target_directories[{i}]",
                    "Provide a valid directory path",
                )

    def _validate_consistency(self, config: ConfigSchema, result: ValidationResult) -> None:
        """Validate internal configuration consistency."""
        # Check that if reporters are configured, at least one is enabled
        if config.reporters and not any(r.enabled for r in config.reporters):
            result.add_warning(
                "All reporters are disabled",
                "reporters",
                "Enable at least one reporter to see validation results",
            )

        # Check for circular dependencies or conflicts
        rule_ids = {rule.identifier for rule in config.rules if rule.enabled}
        validator_ids = {
            validator.identifier for validator in config.validators if validator.enabled
        }

        # Look for potential naming conflicts
        common_names = rule_ids & validator_ids
        if common_names:
            result.add_warning(
                f"Rules and validators share identifiers: {', '.join(common_names)}",
                "rules,validators",
                "Use distinct identifiers for rules and validators to avoid confusion",
            )

    def _validate_context_awareness(self, config: ConfigSchema, result: ValidationResult) -> None:
        """Validate configuration against repository context."""
        if not self.repo_path or not self.repo_path.exists():
            return

        # This would be expanded to check repository-specific requirements
        # For now, just basic existence checks

        # Check if constitution file is actually in the repository
        if config.constitution_path and not config.constitution_path.is_absolute():
            constitution_in_repo = self.repo_path / config.constitution_path
            if not constitution_in_repo.exists():
                result.add_warning(
                    f"Constitution file not found in repository: {config.constitution_path}",
                    "constitution_path",
                    "Ensure the constitution file exists in the repository",
                )


def validate_config_schema(
    config: ConfigSchema, repo_path: Optional[Path] = None, raise_on_error: bool = True
) -> ValidationResult:
    """
    Validate a configuration schema with helpful error messages.

    Args:
        config: Configuration schema to validate
        repo_path: Optional repository path for context-aware validation
        raise_on_error: Whether to raise ConfigurationError on validation errors

    Returns:
        ValidationResult with validation details

    Raises:
        ConfigurationError: If validation fails and raise_on_error is True
    """
    validator = ConfigValidator(repo_path)
    result = validator.validate(config)

    if not result.is_valid and raise_on_error:
        raise ConfigurationError(
            f"Configuration validation failed:\n{result.get_detailed_report()}"
        )

    return result
