"""
Custom exceptions for code generation.
"""


class ConflictError(Exception):
    """Raised when target directory already exists."""

    pass


class ValidationError(Exception):
    """Raised when validation fails (app name, project name, etc.)."""

    pass
