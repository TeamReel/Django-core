"""
Error message formatting utilities for scaffolding CLI.

Provides clear, actionable error messages for common CLI mistakes including
invalid app names, missing templates, file conflicts, and system errors.
"""

from __future__ import annotations

from typing import Optional

import click


def format_user_error(message: str, suggestion: Optional[str] = None) -> str:
    """
    Format user error message with optional suggestion.

    Args:
        message: Primary error message
        suggestion: Optional suggestion for how to fix the error

    Returns:
        Formatted error message suitable for CLI output
    """
    formatted = f"Error: {message}"
    if suggestion:
        formatted += f"\n\nSuggestion: {suggestion}"
    return formatted


def format_invalid_name_error(
    name: str,
    reason: str,
    valid_pattern: str = "lowercase letters, numbers, underscores",
) -> str:
    """
    Format error message for invalid app/project name.

    Args:
        name: The invalid name provided by user
        reason: Why the name is invalid
        valid_pattern: Description of valid name pattern

    Returns:
        Formatted error message with examples
    """
    return format_user_error(
        f"Invalid name '{name}': {reason}",
        f"Use {valid_pattern}. Examples: payments, user_auth, api_v2",
    )


def format_template_not_found_error(
    template_name: str,
    available_templates: Optional[list[str]] = None,
) -> str:
    """
    Format error message for missing template.

    Args:
        template_name: The template name that wasn't found
        available_templates: Optional list of available templates

    Returns:
        Formatted error message with available templates
    """
    message = f"Template '{template_name}' not found"

    if available_templates:
        templates_list = ", ".join(available_templates)
        suggestion = (
            f"Available templates: {templates_list}\n"
            "Run 'django-core-scaffold list-templates'"
            " for descriptions"
        )
    else:
        suggestion = "Run 'django-core-scaffold list-templates' to see available templates"

    return format_user_error(message, suggestion)


def format_conflict_error(path: str, item_type: str = "directory") -> str:
    """
    Format error message for file/directory conflicts.

    Args:
        path: The conflicting path
        item_type: Type of item (directory, file, etc.)

    Returns:
        Formatted error message with resolution suggestion
    """
    return format_user_error(
        f"{item_type.capitalize()} already exists: {path}",
        "Choose a different name or remove the existing directory",
    )


def format_validation_error(
    violations: list[str],
    force_flag_available: bool = True,
) -> str:
    """
    Format constitutional validation error with violation list.

    Args:
        violations: List of validation violations
        force_flag_available: Whether --force flag is available to bypass

    Returns:
        Formatted error message with violation details
    """
    message = "Constitutional validation failed:\n\n"
    message += "\n".join(f"  • {v}" for v in violations)

    if force_flag_available:
        message += "\n\nTo generate code despite violations, use --force flag"
        message += "\n(Not recommended - violations should be addressed)"

    return message


def format_system_error(error: Exception, verbose: bool = False) -> str:
    """
    Format system error message.

    Args:
        error: The exception that occurred
        verbose: Whether to include full traceback

    Returns:
        Formatted error message
    """
    message = f"System error: {type(error).__name__}"

    if str(error):
        message += f" - {error}"

    if verbose:
        import traceback

        message += "\n\nTraceback:\n"
        message += traceback.format_exc()

    return message


def echo_error(message: str) -> None:
    """
    Echo error message to stderr with red color.

    Args:
        message: Error message to display
    """
    click.secho(message, fg="red", err=True)


def echo_warning(message: str) -> None:
    """
    Echo warning message to stderr with yellow color.

    Args:
        message: Warning message to display
    """
    click.secho(message, fg="yellow", err=True)


def echo_success(message: str) -> None:
    """
    Echo success message with green color.

    Args:
        message: Success message to display
    """
    click.secho(message, fg="green")


def echo_info(message: str, verbose: bool = False) -> None:
    """
    Echo informational message (optionally only in verbose mode).

    Args:
        message: Info message to display
        verbose: Only show if verbose mode is enabled
    """
    if verbose or not verbose:  # Always show for now, can gate later
        click.echo(message)
