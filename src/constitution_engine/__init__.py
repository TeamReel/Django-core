"""
Constitutional Enforcement Engine.

A technology-agnostic engine for enforcing constitution rules across software projects.
"""

from constitution_engine.core.config import (
    ConfigSchema,
    ConfigurationError,
)
from constitution_engine.core.integration import (
    create_engine_from_config,
    run_engine,
    run_with_config,
)
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    ConstitutionRule,
    RepositoryContext,
    Severity,
)

__all__ = [
    "CheckResult",
    "CheckStatus",
    "ConfigurationProfile",
    "ConfigSchema",
    "ConfigurationError",
    "ConstitutionRule",
    "RepositoryContext",
    "Severity",
    "run_with_config",
    "create_engine_from_config",
    "run_engine",
]

__version__ = "0.1.0"
