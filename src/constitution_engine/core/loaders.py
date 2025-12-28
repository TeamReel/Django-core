"""
Configuration loaders for the Constitutional Enforcement Engine.

This module implements file-based configuration loading with environment variable
overrides as specified in WP02 T011.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

import yaml

try:
    import tomllib  # Python 3.11+
except ImportError:
    try:
        import tomli as tomllib  # Fallback for Python < 3.11
    except ImportError:
        tomllib = None

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
    "ConfigLoader",
    "YamlConfigLoader",
    "TomlConfigLoader",
    "load_config_from_file",
    "load_config_with_overrides",
]

logger = logging.getLogger(__name__)


class ConfigLoader:
    """Base class for configuration loaders."""

    def __init__(self, apply_env_overrides: bool = True) -> None:
        """
        Initialize the config loader.

        Args:
            apply_env_overrides: Whether to apply environment variable overrides
        """
        self.apply_env_overrides = apply_env_overrides

    def load(self, config_path: Path) -> ConfigSchema:
        """
        Load configuration from a file.

        Args:
            config_path: Path to the configuration file

        Returns:
            Loaded and validated configuration schema

        Raises:
            ConfigurationError: If loading or validation fails
        """
        raise NotImplementedError("Subclasses must implement load method")

    def _apply_environment_overrides(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply environment variable overrides to configuration.

        Environment variables follow the pattern: CE_<SECTION>_<KEY>
        For example: CE_RULES_FAIL_FAST=true

        Args:
            config_dict: Configuration dictionary to modify

        Returns:
            Modified configuration dictionary
        """
        if not self.apply_env_overrides:
            return config_dict

        # Define mappings for environment variable overrides
        env_mappings = {
            "CE_FAIL_FAST": ("fail_fast", self._parse_bool),
            "CE_CONSTITUTION_PATH": ("constitution_path", str),
            "CE_TARGET_DIRECTORIES": ("target_directories", self._parse_list),
            "CE_EXCLUDE_PATTERNS": ("exclude_patterns", self._parse_list),
        }

        for env_var, (config_key, parser) in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                try:
                    parsed_value = parser(env_value)
                    config_dict[config_key] = parsed_value
                    logger.debug(f"Applied environment override: {env_var}={env_value}")
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Failed to parse environment variable {env_var}={env_value}: {e}"
                    )

        # Apply rule-specific overrides
        self._apply_rule_overrides(config_dict)

        return config_dict

    def _apply_rule_overrides(self, config_dict: Dict[str, Any]) -> None:
        """Apply rule-specific environment overrides."""
        # Look for CE_RULE_<RULE_ID>_ENABLED environment variables
        for env_var, value in os.environ.items():
            if env_var.startswith("CE_RULE_") and env_var.endswith("_ENABLED"):
                # Extract rule ID: CE_RULE_MYPY_001_ENABLED -> MYPY-001
                rule_id = env_var[8:-8].replace(
                    "_", "-"
                )  # Remove CE_RULE_ and _ENABLED, replace _ with -

                try:
                    enabled = self._parse_bool(value)

                    # Find and update the rule in the config
                    rules = config_dict.setdefault("rules", [])
                    for rule in rules:
                        if isinstance(rule, dict) and rule.get("identifier") == rule_id:
                            rule["enabled"] = enabled
                            logger.debug(f"Applied rule override: {rule_id} enabled={enabled}")
                            break
                    else:
                        # Rule not found, add it
                        rules.append({"identifier": rule_id, "enabled": enabled})
                        logger.debug(f"Added rule override: {rule_id} enabled={enabled}")

                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse rule override {env_var}={value}: {e}")

    def _parse_bool(self, value: str) -> bool:
        """Parse a string to boolean."""
        if value.lower() in ("true", "1", "yes", "on"):
            return True
        elif value.lower() in ("false", "0", "no", "off"):
            return False
        else:
            raise ValueError(f"Invalid boolean value: {value}")

    def _parse_list(self, value: str) -> List[str]:
        """Parse a comma-separated string to list."""
        return [item.strip() for item in value.split(",") if item.strip()]

    def _normalize_config_dict(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize configuration dictionary structure."""
        # Ensure all list fields exist
        for field in [
            "rules",
            "validators",
            "reporters",
            "modules",
            "adapters",
            "target_directories",
            "exclude_patterns",
        ]:
            config_dict.setdefault(field, [])

        # Ensure all dict fields exist
        for field in ["environment_overrides", "metadata"]:
            config_dict.setdefault(field, {})

        return config_dict


class YamlConfigLoader(ConfigLoader):
    """Configuration loader for YAML files."""

    def load(self, config_path: Path) -> ConfigSchema:
        """Load configuration from a YAML file."""
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config_dict = yaml.safe_load(f) or {}

            logger.info(f"Loaded YAML configuration from {config_path}")

            # Apply environment overrides
            config_dict = self._apply_environment_overrides(config_dict)
            config_dict = self._normalize_config_dict(config_dict)

            # Convert to structured configuration
            return self._dict_to_config_schema(config_dict)

        except (yaml.YAMLError, OSError) as e:
            raise ConfigurationError(
                f"Failed to load YAML configuration from {config_path}: {e}"
            ) from e


class TomlConfigLoader(ConfigLoader):
    """Configuration loader for TOML files."""

    def load(self, config_path: Path) -> ConfigSchema:
        """Load configuration from a TOML file."""
        if tomllib is None:
            raise ConfigurationError("TOML support requires Python 3.11+ or 'tomli' package")

        try:
            with open(config_path, "rb") as f:
                config_dict = tomllib.load(f)

            logger.info(f"Loaded TOML configuration from {config_path}")

            # Apply environment overrides
            config_dict = self._apply_environment_overrides(config_dict)
            config_dict = self._normalize_config_dict(config_dict)

            # Convert to structured configuration
            return self._dict_to_config_schema(config_dict)

        except (OSError, tomllib.TOMLDecodeError) as e:
            raise ConfigurationError(
                f"Failed to load TOML configuration from {config_path}: {e}"
            ) from e

    def _dict_to_config_schema(self, config_dict: Dict[str, Any]) -> ConfigSchema:
        """Convert dictionary to ConfigSchema with proper type conversion."""
        # Convert component configurations
        rules = [
            RuleConfig(**rule) if isinstance(rule, dict) else rule
            for rule in config_dict.get("rules", [])
        ]

        validators = [
            ValidatorConfig(**validator) if isinstance(validator, dict) else validator
            for validator in config_dict.get("validators", [])
        ]

        reporters = [
            ReporterConfig(**reporter) if isinstance(reporter, dict) else reporter
            for reporter in config_dict.get("reporters", [])
        ]

        modules = [
            ModuleConfig(**module) if isinstance(module, dict) else module
            for module in config_dict.get("modules", [])
        ]

        adapters = [
            AdapterConfig(**adapter) if isinstance(adapter, dict) else adapter
            for adapter in config_dict.get("adapters", [])
        ]

        # Create ConfigSchema
        return ConfigSchema(
            fail_fast=config_dict.get("fail_fast", False),
            constitution_path=config_dict.get("constitution_path"),
            target_directories=config_dict.get("target_directories", []),
            exclude_patterns=config_dict.get("exclude_patterns", []),
            rules=rules,
            validators=validators,
            reporters=reporters,
            modules=modules,
            adapters=adapters,
            environment_overrides=config_dict.get("environment_overrides", {}),
            metadata=config_dict.get("metadata", {}),
        )


# Add method to base class
ConfigLoader._dict_to_config_schema = TomlConfigLoader._dict_to_config_schema


def load_config_from_file(config_path: Path, apply_env_overrides: bool = True) -> ConfigSchema:
    """
    Load configuration from a file, auto-detecting the format.

    Args:
        config_path: Path to the configuration file
        apply_env_overrides: Whether to apply environment variable overrides

    Returns:
        Loaded and validated configuration schema

    Raises:
        ConfigurationError: If loading fails or format is unsupported
    """
    if not config_path.exists():
        raise ConfigurationError(f"Configuration file not found: {config_path}")

    # Determine loader based on file extension
    suffix = config_path.suffix.lower()

    if suffix in (".yaml", ".yml"):
        loader = YamlConfigLoader(apply_env_overrides=apply_env_overrides)
    elif suffix in (".toml",):
        loader = TomlConfigLoader(apply_env_overrides=apply_env_overrides)
    else:
        raise ConfigurationError(f"Unsupported configuration file format: {suffix}")

    return loader.load(config_path)


def load_config_with_overrides(
    config_path: Path | None = None,
    apply_env_overrides: bool = True,
    search_paths: List[Path] | None = None,
) -> ConfigSchema:
    """
    Load configuration with automatic file discovery and environment overrides.

    Args:
        config_path: Explicit path to configuration file (optional)
        apply_env_overrides: Whether to apply environment variable overrides
        search_paths: List of directories to search for config files

    Returns:
        Loaded configuration schema

    Raises:
        ConfigurationError: If no configuration file is found or loading fails
    """
    if config_path:
        return load_config_from_file(config_path, apply_env_overrides)

    # Search for configuration files
    if search_paths is None:
        search_paths = [Path.cwd()]

    config_filenames = [
        "constitution_engine.yaml",
        "constitution_engine.yml",
        "constitution-engine.yaml",
        "constitution-engine.yml",
        "constitution_engine.toml",
        "constitution-engine.toml",
        ".constitution_engine.yaml",
        ".constitution_engine.yml",
    ]

    for search_path in search_paths:
        for filename in config_filenames:
            config_file = search_path / filename
            if config_file.exists():
                logger.info(f"Found configuration file: {config_file}")
                return load_config_from_file(config_file, apply_env_overrides)

    # No configuration file found, return default configuration
    logger.info("No configuration file found, using default configuration")
    default_config = ConfigSchema()

    # Apply environment overrides to default config
    if apply_env_overrides:
        loader = ConfigLoader(apply_env_overrides=True)
        config_dict = loader._apply_environment_overrides(
            {
                "fail_fast": default_config.fail_fast,
                "constitution_path": (
                    str(default_config.constitution_path)
                    if default_config.constitution_path
                    else None
                ),
                "target_directories": [str(p) for p in default_config.target_directories],
                "exclude_patterns": default_config.exclude_patterns,
                "rules": [],
                "validators": [],
                "reporters": [],
                "modules": [],
                "adapters": [],
                "environment_overrides": default_config.environment_overrides,
                "metadata": default_config.metadata,
            }
        )
        config_dict = loader._normalize_config_dict(config_dict)
        return loader._dict_to_config_schema(config_dict)

    return default_config
