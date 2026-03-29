"""
Error handling and user-friendly messaging for the Constitutional Enforcement Engine.

This module provides comprehensive error handling with clear, actionable messages
for missing/misconfigured files as specified in WP02 T017.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

__all__ = [
    "EngineError",
    "ConfigurationFileError",
    "RepositoryError",
    "ValidationError",
    "ErrorHandler",
    "format_user_friendly_error",
]

logger = logging.getLogger(__name__)


class EngineError(Exception):
    """Base exception for Constitutional Enforcement Engine errors."""

    def __init__(
        self,
        message: str,
        suggestion: Optional[str] = None,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize engine error.

        Args:
            message: Error message describing what went wrong
            suggestion: Optional suggestion for fixing the error
            error_code: Optional error code for programmatic handling
            context: Optional context information for debugging
        """
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion
        self.error_code = error_code
        self.context = context or {}

    def get_user_friendly_message(self) -> str:
        """Get a user-friendly error message with suggestions."""
        lines = [f"Error: {self.message}"]

        if self.suggestion:
            lines.append(f"Suggestion: {self.suggestion}")

        if self.error_code:
            lines.append(f"Error Code: {self.error_code}")

        return "\n".join(lines)


class ConfigurationFileError(EngineError):
    """Exception for configuration file related errors."""

    def __init__(
        self,
        message: str,
        config_path: Optional[Path] = None,
        suggestion: Optional[str] = None,
        **kwargs,
    ) -> None:
        """
        Initialize configuration file error.

        Args:
            message: Error message
            config_path: Path to the problematic configuration file
            suggestion: Suggested fix
            **kwargs: Additional arguments passed to EngineError
        """
        if config_path:
            context = kwargs.get("context", {})
            context["config_path"] = str(config_path)
            kwargs["context"] = context

        super().__init__(message=message, suggestion=suggestion, **kwargs)
        self.config_path = config_path


class RepositoryError(EngineError):
    """Exception for repository-related errors."""

    def __init__(
        self,
        message: str,
        repo_path: Optional[Path] = None,
        suggestion: Optional[str] = None,
        **kwargs,
    ) -> None:
        """
        Initialize repository error.

        Args:
            message: Error message
            repo_path: Path to the problematic repository
            suggestion: Suggested fix
            **kwargs: Additional arguments passed to EngineError
        """
        if repo_path:
            context = kwargs.get("context", {})
            context["repo_path"] = str(repo_path)
            kwargs["context"] = context

        super().__init__(message=message, suggestion=suggestion, **kwargs)
        self.repo_path = repo_path


class ValidationError(EngineError):
    """Exception for validation-related errors."""

    def __init__(
        self,
        message: str,
        validation_path: Optional[str] = None,
        suggestion: Optional[str] = None,
        **kwargs,
    ) -> None:
        """
        Initialize validation error.

        Args:
            message: Error message
            validation_path: Path in configuration where validation failed
            suggestion: Suggested fix
            **kwargs: Additional arguments passed to EngineError
        """
        if validation_path:
            context = kwargs.get("context", {})
            context["validation_path"] = validation_path
            kwargs["context"] = context

        super().__init__(message=message, suggestion=suggestion, **kwargs)
        self.validation_path = validation_path


class ErrorHandler:
    """Centralized error handling with user-friendly messaging."""

    @staticmethod
    def handle_missing_config_file(search_paths: List[Path]) -> ConfigurationFileError:
        """Handle missing configuration file error."""
        # Normalize paths to use forward slashes for cross-platform messages
        search_paths_str = ", ".join(p.as_posix() for p in search_paths)

        message = "No configuration file found"
        suggestion = (
            f"Create a configuration file in one of these locations:\n"
            f"  - constitution_engine.yaml\n"
            f"  - constitution_engine.yml\n"
            f"  - constitution-engine.yaml\n"
            f"  - .constitution_engine.yaml\n"
            f"Searched in: {search_paths_str}"
        )

        return ConfigurationFileError(
            message=message,
            suggestion=suggestion,
            error_code="CONFIG_FILE_NOT_FOUND",
            context={"search_paths": [str(p) for p in search_paths]},
        )

    @staticmethod
    def handle_invalid_config_file(
        config_path: Path, original_error: Exception
    ) -> ConfigurationFileError:
        """Handle invalid configuration file error."""
        message = f"Configuration file is invalid: {original_error}"

        suggestion = (
            f"Check the configuration file syntax:\n"
            f"  1. Ensure YAML/TOML syntax is correct\n"
            f"  2. Verify all required fields are present\n"
            f"  3. Check that rule identifiers are valid\n"
            f"  4. Validate file paths exist and are accessible\n"
            f"Configuration file: {config_path}"
        )

        return ConfigurationFileError(
            message=message,
            config_path=config_path,
            suggestion=suggestion,
            error_code="CONFIG_FILE_INVALID",
            context={"original_error": str(original_error)},
        )

    @staticmethod
    def handle_missing_repository(repo_path: Path) -> RepositoryError:
        """Handle missing repository error."""
        message = f"Repository path does not exist: {repo_path}"

        suggestion = (
            f"Ensure the repository path is correct:\n"
            f"  1. Check that the path exists: {repo_path}\n"
            f"  2. Verify you have read permissions\n"
            f"  3. Use absolute paths to avoid confusion\n"
            f"  4. Make sure you're pointing to the repository root"
        )

        return RepositoryError(
            message=message,
            repo_path=repo_path,
            suggestion=suggestion,
            error_code="REPOSITORY_NOT_FOUND",
        )

    @staticmethod
    def handle_invalid_repository(repo_path: Path, reason: str) -> RepositoryError:
        """Handle invalid repository error."""
        message = f"Repository path is invalid: {reason}"

        if "not a directory" in reason.lower():
            suggestion = (
                f"Repository path must be a directory:\n"
                f"  1. Path points to: {repo_path}\n"
                f"  2. Ensure you're pointing to a directory, not a file\n"
                f"  3. Use the repository root directory"
            )
        else:
            suggestion = (
                f"Fix the repository path issue:\n"
                f"  1. Repository path: {repo_path}\n"
                f"  2. Issue: {reason}\n"
                f"  3. Ensure the path is accessible and valid"
            )

        return RepositoryError(
            message=message,
            repo_path=repo_path,
            suggestion=suggestion,
            error_code="REPOSITORY_INVALID",
            context={"reason": reason},
        )

    @staticmethod
    def handle_missing_constitution(
        repo_path: Path, expected_paths: Optional[List[str]] = None
    ) -> RepositoryError:
        """Handle missing constitution file error."""
        message = "Constitution file not found in repository"

        if expected_paths:
            paths_str = "\n  - ".join(expected_paths)
            suggestion = (
                f"Create a constitution file in the repository:\n"
                f"  Expected locations:\n  - {paths_str}\n"
                f"  Repository: {repo_path}\n"
                f"  \n"
                f"  Example constitution file content:\n"
                f"  ```markdown\n"
                f"  # Project Constitution\n"
                f"  \n"
                f"  ## Rules\n"
                f"  1. All code must pass linting\n"
                f"  2. All code must have tests\n"
                f"  3. No hardcoded secrets\n"
                f"  ```"
            )
        else:
            suggestion = (
                f"Create a constitution file (CONSTITUTION.md) in: {repo_path}\n"
                f"This file should define the rules and standards for your project."
            )

        return RepositoryError(
            message=message,
            repo_path=repo_path,
            suggestion=suggestion,
            error_code="CONSTITUTION_NOT_FOUND",
            context={"expected_paths": expected_paths or []},
        )

    @staticmethod
    def handle_configuration_validation_error(
        validation_errors: List[str], config_path: Optional[Path] = None
    ) -> ValidationError:
        """Handle configuration validation errors."""
        if len(validation_errors) == 1:
            message = f"Configuration validation failed: {validation_errors[0]}"
        else:
            errors_str = "\n  - ".join(validation_errors)
            message = (
                f"Configuration validation failed with"
                f" {len(validation_errors)} errors:\n  - {errors_str}"
            )

        suggestion = (
            "Fix the configuration issues:\n"
            "  1. Review each validation error above\n"
            "  2. Check the configuration file syntax\n"
            "  3. Ensure all required fields are present\n"
            "  4. Verify that constitutional rules are not disabled"
        )

        if config_path:
            suggestion += f"\nConfiguration file: {config_path}"

        return ValidationError(
            message=message,
            suggestion=suggestion,
            error_code="CONFIG_VALIDATION_FAILED",
            context={
                "validation_errors": validation_errors,
                "config_path": str(config_path) if config_path else None,
            },
        )

    @staticmethod
    def handle_permission_error(path: Path, operation: str) -> EngineError:
        """Handle permission-related errors."""
        message = f"Permission denied: cannot {operation} {path}"

        suggestion = (
            f"Fix permission issues:\n"
            f"  1. Check file/directory permissions for: {path}\n"
            f"  2. Ensure you have {operation} access\n"
            f"  3. Try running with appropriate permissions\n"
            f"  4. Check if the file is locked by another process"
        )

        return EngineError(
            message=message,
            suggestion=suggestion,
            error_code="PERMISSION_DENIED",
            context={"path": str(path), "operation": operation},
        )

    @staticmethod
    def handle_dependency_error(
        dependency: str, operation: str, install_command: Optional[str] = None
    ) -> EngineError:
        """Handle missing dependency errors."""
        message = f"Required dependency '{dependency}' not available for {operation}"

        if install_command:
            suggestion = (
                f"Install the required dependency:\n"
                f"  {install_command}\n"
                f"  \n"
                f"  This dependency is required for: {operation}"
            )
        else:
            suggestion = (
                f"Install the required dependency '{dependency}':\n"
                f"  pip install {dependency}\n"
                f"  \n"
                f"  This dependency is required for: {operation}"
            )

        return EngineError(
            message=message,
            suggestion=suggestion,
            error_code="DEPENDENCY_MISSING",
            context={"dependency": dependency, "operation": operation},
        )


def format_user_friendly_error(error: Exception) -> str:
    """
    Format any exception as a user-friendly error message.

    Args:
        error: Exception to format

    Returns:
        User-friendly error message string
    """
    if isinstance(error, EngineError):
        return error.get_user_friendly_message()

    # Handle common Python exceptions
    if isinstance(error, FileNotFoundError):
        return ErrorHandler.handle_missing_repository(Path(str(error))).get_user_friendly_message()

    if isinstance(error, PermissionError):
        return ErrorHandler.handle_permission_error(
            Path(str(error)), "access"
        ).get_user_friendly_message()

    if isinstance(error, (ValueError, TypeError)):
        return EngineError(
            message=f"Invalid input: {error}",
            suggestion="Check your input values and try again",
            error_code="INVALID_INPUT",
        ).get_user_friendly_message()

    # Generic error handling
    return EngineError(
        message=f"Unexpected error: {error}",
        suggestion="Check the logs for more details or report this issue",
        error_code="UNEXPECTED_ERROR",
        context={"error_type": type(error).__name__},
    ).get_user_friendly_message()


# Context manager for converting exceptions to user-friendly errors
class UserFriendlyErrorContext:
    """Context manager that converts exceptions to user-friendly errors."""

    def __init__(self, operation: str, logger_instance: Optional[logging.Logger] = None):
        """
        Initialize the context manager.

        Args:
            operation: Description of the operation being performed
            logger_instance: Optional logger for error details
        """
        self.operation = operation
        self.logger = logger_instance or logger

    def __enter__(self):
        """Enter the context."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context and handle any exceptions."""
        if exc_type is not None and exc_val is not None:
            # Log the detailed error
            self.logger.error(f"Error during {self.operation}: {exc_val}", exc_info=True)

            # Convert to user-friendly error and re-raise
            if not isinstance(exc_val, EngineError):
                friendly_message = format_user_friendly_error(exc_val)
                raise EngineError(
                    message=f"Failed to {self.operation}",
                    suggestion=friendly_message,
                    error_code="OPERATION_FAILED",
                    context={"operation": self.operation, "original_error": str(exc_val)},
                ) from exc_val

        return False  # Don't suppress exceptions
