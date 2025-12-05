"""
Code generation module for scaffolding CLI.

Provides Django app/project generation with atomic rollback, validation,
and staging directory management.
"""

from scaffolding.generation.exceptions import (
    ConflictError,
    ValidationError,
    ValidationFailure,
)
from scaffolding.generation.generator import CodeGenerator

__all__ = [
    "CodeGenerator",
    "ConflictError",
    "ValidationError",
    "ValidationFailure",
]
