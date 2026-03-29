"""
Post-generation summary display.

Formats and displays summary of generated files, next steps,
and helpful commands after successful scaffold operation.
"""

from pathlib import Path
from typing import List

import click


def print_generation_summary(
    app_name: str,
    template_name: str,
    files_created: List[Path],
    project_root: Path,
    interactive: bool = True,
) -> None:
    """
    Print post-generation summary with files and next steps.

    Displays list of created files, success message, and suggested
    next steps (run tests, start server, etc.). Only shows in
    interactive mode.

    Args:
        app_name: Name of generated app
        template_name: Template used for generation
        files_created: List of file paths created
        project_root: Project root directory (for relative paths)
        interactive: Whether to show summary (from is_interactive())

    Examples:
        >>> files = [Path('src/payments/models.py'), Path('src/payments/apps.py')]
        >>> print_generation_summary(
        ...     app_name='payments',
        ...     template_name='minimal',
        ...     files_created=files,
        ...     project_root=Path('/project'),
        ...     interactive=True
        ... )
        # Output:
        # ✓ Successfully generated app 'payments' using 'minimal' template
        #
        # Files created (2):
        #   • src/payments/models.py
        #   • src/payments/apps.py
        #
        # Next steps:
        #   1. Review generated files: src/payments/
        #   2. Run tests: pytest src/payments/tests/
        #   3. Add app to INSTALLED_APPS in settings.py
        #   4. Run migrations: python manage.py makemigrations payments
    """
    if not interactive:
        # Non-interactive: minimal output
        click.echo(f"Generated app '{app_name}' using '{template_name}' template")
        return

    # Interactive: full summary

    # Success header
    click.echo()
    click.secho(
        f"✓ Successfully generated app '{app_name}' using '{template_name}' template",
        fg="green",
        bold=True,
    )
    click.echo()

    # Files created section
    file_count = len(files_created)
    click.secho(f"Files created ({file_count}):", fg="cyan", bold=True)

    # Show relative paths (limited to first 20 files)
    display_files = files_created[:20]
    for file_path in display_files:
        try:
            # Try to make path relative to project root
            rel_path = file_path.relative_to(project_root)
        except ValueError:
            # If not under project root, show absolute path
            rel_path = file_path

        click.echo(f"  • {rel_path}")

    if file_count > 20:
        remaining = file_count - 20
        click.echo(f"  ... and {remaining} more file(s)")

    click.echo()

    # Next steps section
    click.secho("Next steps:", fg="cyan", bold=True)

    steps = [
        f"Review generated files: src/{app_name}/",
        f"Run tests: pytest src/{app_name}/tests/",
        f"Add app to INSTALLED_APPS in settings.py:"
        f" '{app_name}.apps.{_to_pascal_case(app_name)}Config'",
        f"Run migrations: python manage.py makemigrations {app_name}",
        "Start development server: python manage.py runserver",
    ]

    for i, step in enumerate(steps, 1):
        click.echo(f"  {i}. {step}")

    click.echo()

    # Additional tips based on template
    if template_name == "api-first":
        click.secho("API-specific tips:", fg="yellow")
        click.echo(
            f"  • Add app URLs to project urls.py:"
            f" path('api/{app_name}/',"
            f" include('{app_name}.urls'))"
        )
        click.echo("  • Test API endpoints: python manage.py test")
        click.echo()

    elif template_name == "ui-backed":
        click.secho("UI-specific tips:", fg="yellow")
        click.echo(
            f"  • Add app URLs to project urls.py: path('{app_name}/', include('{app_name}.urls'))"
        )
        click.echo("  • Collect static files: python manage.py collectstatic")
        click.echo(f"  • View UI at: http://localhost:8000/{app_name}/")
        click.echo()

    # Help message
    click.secho("For more help:", fg="white", dim=True)
    click.echo("  django-core-scaffold --help")
    click.echo("  django-core-scaffold list-templates")
    click.echo()


def _to_pascal_case(snake_str: str) -> str:
    """
    Convert snake_case to PascalCase.

    Args:
        snake_str: String in snake_case

    Returns:
        String in PascalCase

    Examples:
        >>> _to_pascal_case("my_app")
        'MyApp'
        >>> _to_pascal_case("user_auth")
        'UserAuth'
    """
    return "".join(word.capitalize() for word in snake_str.split("_"))


def print_error_summary(
    error_message: str, suggestions: List[str], interactive: bool = True
) -> None:
    """
    Print error summary with suggestions.

    Displays error message with helpful suggestions for resolution.

    Args:
        error_message: Main error message
        suggestions: List of suggested fixes
        interactive: Whether to show detailed summary (from is_interactive())

    Examples:
        >>> print_error_summary(
        ...     error_message="App 'payments' already exists",
        ...     suggestions=[
        ...         "Choose a different app name",
        ...         "Remove existing app: rm -rf src/payments/",
        ...         "Use --force to overwrite (not recommended)"
        ...     ],
        ...     interactive=True
        ... )
        # Output:
        # ✗ Error: App 'payments' already exists
        #
        # Suggestions:
        #   • Choose a different app name
        #   • Remove existing app: rm -rf src/payments/
        #   • Use --force to overwrite (not recommended)
    """
    if not interactive:
        # Non-interactive: minimal error
        click.echo(f"Error: {error_message}", err=True)
        return

    # Interactive: detailed error with suggestions

    click.echo()
    click.secho(f"✗ Error: {error_message}", fg="red", bold=True, err=True)
    click.echo()

    if suggestions:
        click.secho("Suggestions:", fg="yellow", bold=True)
        for suggestion in suggestions:
            click.echo(f"  • {suggestion}")
        click.echo()
