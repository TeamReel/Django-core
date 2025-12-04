"""
Custom exceptions for code generation.
"""


class ConflictError(Exception):
    """Raised when target directory already exists."""

    pass


class ValidationError(Exception):
    """Raised when validation fails (app name, project name, etc.)."""

    pass


class ValidationFailure(Exception):
    """
    Raised when constitutional validation fails.

    Used to signal that generated code does not meet constitutional
    requirements. Exit code 3 should be returned to the CLI when this
    is raised (unless --force flag is set).
    """

    pass
