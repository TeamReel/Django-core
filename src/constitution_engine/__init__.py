"""
Constitutional Enforcement Engine

A technology-agnostic constitutional enforcement engine that validates
repositories against constitutions, workflow rules, and hygiene checks.
"""

__version__ = "0.1.0"

from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    ConstitutionRule,
    RepositoryContext,
)

__all__ = [
    "CheckResult",
    "ConfigurationProfile",
    "ConstitutionRule",
    "RepositoryContext",
]
