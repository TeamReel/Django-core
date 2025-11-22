"""
Constitutional Enforcement Engine - Core Package

A technology-agnostic engine for enforcing project constitutional standards
through configurable rules, validators, and reporters.
"""

from .config import (
    AdapterConfig,
    ConfigSchema,
    ModuleConfig,
    ReporterConfig,
    RuleConfig,
    ValidatorConfig,
)
from .context import GitMetadata, LanguageDetector, RepositoryContextBuilder
from .errors import (
    ConfigurationFileError,
    EngineError,
    ErrorHandler,
    RepositoryError,
    UserFriendlyErrorContext,
    ValidationError,
    format_user_friendly_error,
)
from .integration import create_engine_from_config, run_with_config
from .loaders import TomlConfigLoader, YamlConfigLoader, load_config_with_overrides
from .models import CheckResult, ConfigurationProfile, RepositoryContext, Severity
from .validation import ConfigValidator, ValidationResult, validate_config_schema

__version__ = "0.1.0"

__all__ = [
    # Core data models
    "CheckResult",
    "Severity",
    "RepositoryContext",
    "ConfigurationProfile",
    # Configuration
    "ConfigSchema",
    "RuleConfig",
    "ValidatorConfig",
    "ReporterConfig",
    "ModuleConfig",
    "AdapterConfig",
    # Configuration loading
    "YamlConfigLoader",
    "TomlConfigLoader",
    "load_config_with_overrides",
    # Repository context
    "RepositoryContextBuilder",
    "GitMetadata",
    "LanguageDetector",
    # Validation
    "ConfigValidator",
    "ValidationResult",
    "validate_config_schema",
    # High-level integration API
    "run_with_config",
    "create_engine_from_config",
    # Error handling
    "EngineError",
    "ConfigurationFileError",
    "RepositoryError",
    "ValidationError",
    "ErrorHandler",
    "format_user_friendly_error",
    "UserFriendlyErrorContext",
]
