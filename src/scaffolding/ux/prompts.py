"""
Interactive prompts for CLI using Click.

Provides template selection, app name confirmation, and variable
prompts with automatic fallback to defaults in non-interactive mode.
"""

from typing import Dict, List, Optional

import click


def prompt_for_template(
    available_templates: List[str],
    default: str = "minimal",
    interactive: bool = True,
) -> str:
    """
    Prompt user to select template from list.

    In interactive mode, displays list of templates and prompts for selection.
    In non-interactive mode, returns default template.

    Args:
        available_templates: List of template names to choose from
        default: Default template if non-interactive (default: "minimal")
        interactive: Whether to show interactive prompt (from is_interactive())

    Returns:
        Selected template name

    Examples:
        >>> # Interactive mode
        >>> prompt_for_template(['minimal', 'api-first', 'service'])
        # User sees: "Select template: 1) minimal 2) api-first 3) service"
        # Returns: user selection

        >>> # Non-interactive mode (CI/CD)
        >>> prompt_for_template(['minimal', 'api-first'], default='minimal', interactive=False)
        'minimal'
    """
    if not interactive:
        # Non-interactive: use default
        click.echo(f"Using default template: {default}")
        return default

    if not available_templates:
        click.secho("⚠ No templates available", fg="yellow")
        return default

    # Interactive: prompt with choices
    click.echo("\nAvailable templates:")
    for i, template in enumerate(available_templates, 1):
        click.echo(f"  {i}. {template}")

    template_choice = click.prompt(
        "\nSelect template",
        type=click.Choice(available_templates, case_sensitive=False),
        default=default,
        show_choices=False,  # Already displayed above
    )

    return template_choice


def prompt_for_app_name(default: Optional[str] = None, interactive: bool = True) -> str:
    """
    Prompt user for app name with validation.

    In interactive mode, prompts for app name and validates format.
    In non-interactive mode, returns default or raises error if no default.

    Args:
        default: Default app name if non-interactive (optional)
        interactive: Whether to show interactive prompt (from is_interactive())

    Returns:
        App name (validated snake_case)

    Raises:
        click.UsageError: If non-interactive and no default provided

    Examples:
        >>> # Interactive mode
        >>> prompt_for_app_name()
        # User sees: "Enter app name:"
        # Returns: user input (e.g., "my_app")

        >>> # Non-interactive with default
        >>> prompt_for_app_name(default='payments', interactive=False)
        'payments'

        >>> # Non-interactive without default (error)
        >>> prompt_for_app_name(interactive=False)
        UsageError: App name required in non-interactive mode
    """
    if not interactive:
        if default is None:
            raise click.UsageError(
                "App name required in non-interactive mode. "
                "Use: scaffold app <name> or provide --name flag"
            )
        click.echo(f"Using app name: {default}")
        return default

    # Interactive: prompt for name
    app_name = click.prompt(
        "\nEnter app name (snake_case)",
        type=str,
        default=default if default else "",
    )

    return app_name.strip()


def prompt_for_confirmation(message: str, default: bool = True, interactive: bool = True) -> bool:
    """
    Prompt user for yes/no confirmation.

    In interactive mode, displays message and waits for y/n response.
    In non-interactive mode, returns default value.

    Args:
        message: Confirmation message to display
        default: Default value if non-interactive (default: True)
        interactive: Whether to show interactive prompt (from is_interactive())

    Returns:
        True if confirmed, False otherwise

    Examples:
        >>> # Interactive mode
        >>> prompt_for_confirmation("Generate app 'payments'?")
        # User sees: "Generate app 'payments'? [Y/n]:"
        # Returns: True or False based on input

        >>> # Non-interactive mode
        >>> prompt_for_confirmation("Overwrite?", default=False, interactive=False)
        False
    """
    if not interactive:
        # Non-interactive: use default
        return default

    # Interactive: prompt for confirmation
    return click.confirm(message, default=default)


def prompt_for_template_variables(
    required_vars: Dict[str, str],
    optional_vars: Dict[str, str],
    interactive: bool = True,
) -> Dict[str, str]:
    """
    Prompt user for template variable values.

    In interactive mode, prompts for each required variable and optionally
    for optional variables. In non-interactive mode, uses defaults only.

    Args:
        required_vars: Dict of {var_name: description} for required variables
        optional_vars: Dict of {var_name: default_value} for optional variables
        interactive: Whether to show interactive prompts (from is_interactive())

    Returns:
        Dict of variable name → value

    Examples:
        >>> # Interactive mode
        >>> prompt_for_template_variables(
        ...     required_vars={'model_name': 'Model class name'},
        ...     optional_vars={'author': 'Your Name'},
        ...     interactive=True
        ... )
        # User prompted for: model_name (required), author (optional)
        # Returns: {'model_name': 'Payment', 'author': 'John Doe'}

        >>> # Non-interactive mode
        >>> prompt_for_template_variables(
        ...     required_vars={},
        ...     optional_vars={'author': 'Default'},
        ...     interactive=False
        ... )
        {'author': 'Default'}
    """
    values = {}

    if not interactive:
        # Non-interactive: use optional defaults only, skip required
        click.echo("Using default variable values (non-interactive mode)")
        return dict(optional_vars)

    # Interactive: prompt for required variables
    if required_vars:
        click.echo("\nRequired template variables:")
        for var_name, description in required_vars.items():
            value = click.prompt(f"  {var_name} ({description})", type=str)
            values[var_name] = value

    # Interactive: prompt for optional variables
    if optional_vars:
        click.echo("\nOptional template variables (press Enter to use defaults):")
        for var_name, default_value in optional_vars.items():
            value = click.prompt(
                f"  {var_name}",
                type=str,
                default=default_value,
                show_default=True,
            )
            values[var_name] = value

    return values
