"""
High-level configuration and engine integration for the Constitutional Enforcement Engine.

This module provides convenient functions to wire together configuration loading,
context building, plugin discovery, and engine execution as specified in WP02 T016
and WP03 T023.
"""

import logging
from pathlib import Path
from typing import List, Optional

from constitution_engine.core.config import ConfigSchema
from constitution_engine.core.context import RepositoryContextBuilder
from constitution_engine.core.engine import Engine
from constitution_engine.core.loaders import load_config_with_overrides
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)
from constitution_engine.core.plugins import (
    discover_builtin_plugins,
    discover_entry_point_plugins,
    get_global_registry,
)
from constitution_engine.core.validation import validate_config_schema

__all__ = [
    "EngineFactory",
    "run_with_config",
    "create_engine_from_config",
    "ConfigurationError",
]

logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Exception raised for configuration-related errors during engine setup."""

    pass


class EngineFactory:
    """Factory for creating configured Engine instances."""

    def __init__(
        self,
        include_git_metadata: bool = True,
        validate_config: bool = True,
        apply_env_overrides: bool = True,
        discover_plugins: bool = True,
        discover_entry_points: bool = False,
    ) -> None:
        """
        Initialize the engine factory.

        Args:
            include_git_metadata: Whether to include Git metadata in repository context
            validate_config: Whether to validate configuration before use
            apply_env_overrides: Whether to apply environment variable overrides
            discover_plugins: Whether to automatically discover built-in plugins
            discover_entry_points: Whether to discover plugins via entry points
        """
        self.include_git_metadata = include_git_metadata
        self.validate_config = validate_config
        self.apply_env_overrides = apply_env_overrides
        self.discover_plugins = discover_plugins
        self.discover_entry_points = discover_entry_points
        self._context_builder = RepositoryContextBuilder(include_git_metadata=include_git_metadata)
        self._plugins_discovered = False

    def create_engine(
        self,
        repo_path: Path,
        config_path: Optional[Path] = None,
        config_search_paths: Optional[List[Path]] = None,
    ) -> Engine:
        """
        Create a fully configured Engine instance.

        Args:
            repo_path: Path to the repository to analyze
            config_path: Optional explicit path to configuration file
            config_search_paths: Optional list of directories to search for config files

        Returns:
            Configured Engine instance ready for execution

        Raises:
            ConfigurationError: If configuration loading or validation fails
        """
        try:
            # Load configuration
            if config_search_paths is None:
                config_search_paths = [repo_path, Path.cwd()]

            logger.info(f"Loading configuration for repository: {repo_path}")
            config_schema = load_config_with_overrides(
                config_path=config_path,
                apply_env_overrides=self.apply_env_overrides,
                search_paths=config_search_paths,
            )

            # Validate configuration if requested
            if self.validate_config:
                logger.debug("Validating configuration schema")
                validate_config_schema(config_schema, repo_path=repo_path, raise_on_error=True)

            # Build repository context
            logger.info("Building repository context")
            exclude_patterns = (
                set(config_schema.exclude_patterns) if config_schema.exclude_patterns else None
            )
            context = self._context_builder.build_context(
                repo_path=repo_path,
                constitution_path=config_schema.constitution_path,
                exclude_patterns=exclude_patterns,
            )

            # Convert ConfigSchema to ConfigurationProfile
            config_profile = self._config_schema_to_profile(config_schema, context)

            # Create engine
            logger.info("Creating engine instance")
            engine = Engine(config=config_profile, context=context)

            # Discover and register plugins (T023)
            self._ensure_plugins_discovered()
            self._register_plugins_from_config(engine, config_schema)

            logger.info("Engine created successfully")
            return engine

        except Exception as e:
            error_msg = f"Failed to create engine for repository {repo_path}: {e}"
            logger.error(error_msg)
            raise ConfigurationError(error_msg) from e

    def _ensure_plugins_discovered(self) -> None:
        """
        Ensure plugins have been discovered.

        This is idempotent - it only runs discovery once per factory instance.
        """
        if self._plugins_discovered:
            return

        if self.discover_plugins:
            logger.info("Discovering built-in plugins")
            discover_builtin_plugins()

        if self.discover_entry_points:
            logger.info("Discovering entry point plugins")
            discover_entry_point_plugins()

        self._plugins_discovered = True

    def _register_plugins_from_config(self, engine: Engine, config_schema: ConfigSchema) -> None:
        """
        Register plugins with the engine based on configuration.

        Args:
            engine: Engine instance to register plugins with
            config_schema: Configuration schema specifying which plugins to enable
        """
        registry = get_global_registry()

        # Register enabled rules
        enabled_rules = config_schema.get_enabled_rules()
        logger.info(f"Registering {len(enabled_rules)} rules from configuration")
        for rule_config in enabled_rules:
            rule = registry.get_rule(rule_config.identifier)
            if rule:
                engine.register_rule(rule)
                logger.debug(f"Registered rule: {rule_config.identifier}")
            else:
                logger.warning(f"Rule not found in registry: {rule_config.identifier}")

        # Register enabled validators
        enabled_validators = config_schema.get_enabled_validators()
        logger.info(f"Registering {len(enabled_validators)} validators from configuration")
        for validator_config in enabled_validators:
            validator = registry.get_validator(validator_config.identifier)
            if validator:
                engine.register_validator(validator)
                logger.debug(f"Registered validator: {validator_config.identifier}")
            else:
                logger.warning(f"Validator not found in registry: {validator_config.identifier}")

        # Register enabled reporters
        enabled_reporters = config_schema.get_enabled_reporters()
        logger.info(f"Registering {len(enabled_reporters)} reporters from configuration")
        for reporter_config in enabled_reporters:
            reporter = registry.get_reporter(reporter_config.name)
            if reporter:
                engine.register_reporter(reporter)
                logger.debug(f"Registered reporter: {reporter_config.name}")
            else:
                logger.warning(f"Reporter not found in registry: {reporter_config.name}")

    def _config_schema_to_profile(
        self, config_schema: ConfigSchema, context: RepositoryContext
    ) -> ConfigurationProfile:
        """
        Convert ConfigSchema to ConfigurationProfile.

        Args:
            config_schema: Loaded configuration schema
            context: Repository context

        Returns:
            ConfigurationProfile for engine use
        """
        # Extract enabled rule identifiers
        enabled_rules = [rule.identifier for rule in config_schema.get_enabled_rules()]

        # Build adapter options from adapter configs
        adapter_options = {}
        for adapter in config_schema.get_enabled_adapters():
            adapter_options[adapter.name] = adapter.parameters

        # Extract output formats from enabled reporters
        output_formats = [reporter.name for reporter in config_schema.get_enabled_reporters()]

        return ConfigurationProfile(
            enabled_rules=enabled_rules,
            target_directories=config_schema.target_directories or [context.root_path],
            adapter_options=adapter_options,
            output_formats=output_formats,
            constitution_path=config_schema.constitution_path or context.constitution_path,
            metadata={
                "config_metadata": config_schema.metadata,
                "fail_fast": config_schema.fail_fast,
                "exclude_patterns": config_schema.exclude_patterns,
            },
        )


def create_engine_from_config(
    repo_path: Path,
    config_path: Optional[Path] = None,
    config_search_paths: Optional[List[Path]] = None,
    include_git_metadata: bool = True,
    validate_config: bool = True,
    apply_env_overrides: bool = True,
    discover_plugins: bool = True,
    discover_entry_points: bool = False,
) -> Engine:
    """
    Create a configured Engine instance from repository and configuration.

    This is a convenience function that creates an EngineFactory and uses it
    to create an Engine instance. It automatically discovers and registers
    plugins based on configuration (WP03 T023).

    Args:
        repo_path: Path to the repository to analyze
        config_path: Optional explicit path to configuration file
        config_search_paths: Optional list of directories to search for config files
        include_git_metadata: Whether to include Git metadata in repository context
        validate_config: Whether to validate configuration before use
        apply_env_overrides: Whether to apply environment variable overrides
        discover_plugins: Whether to automatically discover built-in plugins
        discover_entry_points: Whether to discover plugins via entry points

    Returns:
        Configured Engine instance ready for execution

    Raises:
        ConfigurationError: If configuration loading or validation fails
    """
    factory = EngineFactory(
        include_git_metadata=include_git_metadata,
        validate_config=validate_config,
        apply_env_overrides=apply_env_overrides,
        discover_plugins=discover_plugins,
        discover_entry_points=discover_entry_points,
    )

    return factory.create_engine(
        repo_path=repo_path, config_path=config_path, config_search_paths=config_search_paths
    )


def run_with_config(
    repo_path: Path,
    config_path: Optional[Path] = None,
    config_search_paths: Optional[List[Path]] = None,
    output_path: Optional[Path] = None,
    include_git_metadata: bool = True,
    validate_config: bool = True,
    apply_env_overrides: bool = True,
) -> tuple[list[CheckResult], list[str], int]:
    """
    Run the Constitutional Enforcement Engine with configuration.

    This is the main high-level entry point that loads configuration,
    builds context, creates engine, executes checks, and generates reports.

    Args:
        repo_path: Path to the repository to analyze
        config_path: Optional explicit path to configuration file
        config_search_paths: Optional list of directories to search for config files
        output_path: Optional path for file-based output
        include_git_metadata: Whether to include Git metadata in repository context
        validate_config: Whether to validate configuration before use
        apply_env_overrides: Whether to apply environment variable overrides

    Returns:
        Tuple of (check results, report strings, exit code)

    Raises:
        ConfigurationError: If configuration loading or validation fails
    """
    # Ensure repo_path is absolute
    repo_path = repo_path.absolute()

    logger.info(f"Starting constitutional enforcement engine run for: {repo_path}")

    try:
        # Create configured engine
        engine = create_engine_from_config(
            repo_path=repo_path,
            config_path=config_path,
            config_search_paths=config_search_paths,
            include_git_metadata=include_git_metadata,
            validate_config=validate_config,
            apply_env_overrides=apply_env_overrides,
        )

        # Execute engine and generate reports
        logger.info("Executing engine and generating reports")
        results, reports = engine.run_and_report(output_path=output_path)

        # Get exit code
        exit_code = engine.get_exit_code(results)

        logger.info(f"Engine run completed with {len(results)} results and exit code {exit_code}")
        return results, reports, exit_code

    except Exception as e:
        error_msg = f"Engine run failed: {e}"
        logger.error(error_msg)
        raise ConfigurationError(error_msg) from e


# Convenience function for backward compatibility and main API
def run_engine(
    repo_path: Path | str, config_path: Optional[Path | str] = None, **kwargs
) -> tuple[list[CheckResult], list[str], int]:
    """
    Run the Constitutional Enforcement Engine (backward compatibility wrapper).

    Args:
        repo_path: Path to the repository to analyze
        config_path: Optional path to configuration file
        **kwargs: Additional keyword arguments passed to run_with_config

    Returns:
        Tuple of (check results, report strings, exit code)
    """
    # Convert string paths to Path objects
    if isinstance(repo_path, str):
        repo_path = Path(repo_path)
    if isinstance(config_path, str):
        config_path = Path(config_path)

    return run_with_config(repo_path=repo_path, config_path=config_path, **kwargs)
