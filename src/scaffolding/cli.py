"""
Core scaffolding CLI entrypoint using Click framework.

Provides both console script (django-core-scaffold) and Django management
command (python manage.py scaffold) with identical interfaces.
"""

from __future__ import annotations

import sys
from typing import Optional

import click
from scaffolding import __version__

# Exit code constants (CLI contract)
EXIT_SUCCESS = 0
EXIT_USER_ERROR = 1
EXIT_SYSTEM_ERROR = 2
EXIT_VALIDATION_FAILURE = 3
EXIT_TEMPLATE_NOT_FOUND = 4
EXIT_CONFLICT = 5


@click.group()
@click.option(
    "--no-interactive",
    is_flag=True,
    help="Run without prompts (use defaults, CI/CD mode)",
)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.version_option(version=__version__, prog_name="django-core-scaffold")
@click.pass_context
def scaffold(ctx: click.Context, no_interactive: bool, verbose: bool) -> None:
    """
    Core scaffolding CLI for Django apps and projects.

    Generate new Django modules, bootstrap projects, and enforce Core-App
    conventions with extensible templates and constitutional validation.
    """
    ctx.ensure_object(dict)
    ctx.obj["interactive"] = not no_interactive
    ctx.obj["verbose"] = verbose


@scaffold.command()
@click.argument("name")
@click.option(
    "--template",
    "-t",
    default="minimal",
    help="Template to use for generation (default: minimal)",
)
@click.option(
    "--validate/--no-validate",
    default=True,
    help="Run constitutional validation (default: validate)",
)
@click.option(
    "--force",
    is_flag=True,
    help="Bypass validation failures (generate code despite violations)",
)
@click.pass_context
def app(
    ctx: click.Context,
    name: str,
    template: str,
    validate: bool,
    force: bool,
) -> None:
    """
    Generate new Django app/module.

    Creates a new Django application in the existing project following
    Core-App structure, security baselines, and i18n patterns.

    Example:

        \b
        # Interactive mode (prompts for options)
        $ django-core-scaffold app payments

        \b
        # Non-interactive with explicit template
        $ django-core-scaffold app payments --template api-first

        \b
        # CI/CD mode (skip validation)
        $ django-core-scaffold app testdata --no-interactive --no-validate
    """
    if ctx.obj.get("verbose"):
        click.echo(f"Generating app '{name}' with template '{template}'...")

    # Placeholder implementation (WP04 will implement actual generation)
    click.secho(
        f"Not implemented: scaffold app {name} --template {template}",
        fg="yellow",
    )
    click.echo("Implementation coming in WP04 (Code Generation)")
    ctx.exit(EXIT_SYSTEM_ERROR)


@scaffold.command()
@click.argument("name")
@click.option(
    "--project-name",
    help="Custom project display name (default: derived from directory name)",
)
@click.option(
    "--validate/--no-validate",
    default=True,
    help="Run constitutional validation (default: validate)",
)
@click.pass_context
def init(
    ctx: click.Context,
    name: str,
    project_name: Optional[str],
    validate: bool,
) -> None:
    """
    Bootstrap new downstream project.

    Creates a complete project with Core-App skeleton, foundational modules,
    and deployment templates following B01 conventions.

    Example:

        \b
        # Interactive mode
        $ django-core-scaffold init my-product

        \b
        # Non-interactive with custom display name
        $ django-core-scaffold init my-product --project-name "My Product"
    """
    if ctx.obj.get("verbose"):
        display = project_name or name.replace("-", " ").replace("_", " ").title()
        click.echo(f"Bootstrapping project '{name}' (display: {display})...")

    # Placeholder implementation (WP04 will implement actual bootstrap)
    click.secho(
        f"Not implemented: scaffold init {name}",
        fg="yellow",
    )
    click.echo("Implementation coming in WP04 (Code Generation)")
    ctx.exit(EXIT_SYSTEM_ERROR)


@scaffold.command(name="list-templates")
@click.pass_context
def list_templates(ctx: click.Context) -> None:
    """
    List available templates with descriptions.

    Displays all templates discoverable from project-local directories,
    configured template paths, Core built-in templates, and installed
    template packages.

    Example:

        \b
        $ django-core-scaffold list-templates
        Available templates:
          minimal      - Minimal Django app (models, tests, i18n)
          api-first    - API-first module with DRF boilerplate
          service      - Service module with business logic
          ui-backed    - UI-backed module with views and forms
    """
    from scaffolding.templates import TemplateRegistry

    if ctx.obj.get("verbose"):
        click.echo("Discovering available templates...")

    try:
        registry = TemplateRegistry()
        registry.discover()
        templates = registry.list_templates()

        if not templates:
            click.echo("No templates found.")
            click.echo(
                "\nTemplates are discovered from:"
                "\n  1. Project-local templates/scaffold/"
                "\n  2. SCAFFOLD_TEMPLATE_DIRS (Django settings)"
                "\n  3. Core built-in templates"
                "\n  4. Installed plugin packages"
            )
            ctx.exit(EXIT_SUCCESS)

        click.secho("\nAvailable templates:", bold=True)
        for template in templates:
            # Format: name (padded to 15 chars) - description
            name_padded = template.name.ljust(15)
            click.echo(f"  {name_padded} - {template.description}")

            if ctx.obj.get("verbose"):
                # Show source and file count in verbose mode
                click.echo(f"    Source: {template._source}, Files: {len(template.files)}")
                if template.extends:
                    click.echo(f"    Extends: {template.extends}")

        ctx.exit(EXIT_SUCCESS)

    except Exception as e:
        click.secho(f"Error discovering templates: {e}", fg="red", err=True)
        if ctx.obj.get("verbose"):
            import traceback

            click.echo(traceback.format_exc(), err=True)
        ctx.exit(EXIT_SYSTEM_ERROR)


@scaffold.command()
@click.argument("path", type=click.Path(exists=True))
@click.pass_context
def validate(ctx: click.Context, path: str) -> None:
    """
    Run constitutional validation on existing code.

    Validates generated or existing code against Core-App standards including
    B01 structure, B03 security baseline, B04 i18n patterns, and code quality
    requirements (Ruff, mypy, tests).

    Example:

        \b
        $ django-core-scaffold validate src/payments/
        Running constitutional validation...
        [B01] Structure: PASS
        [B03] Security: PASS
        [B04] i18n: PASS
        [Code Quality] Ruff: PASS
        ✓ All checks passed!
    """
    if ctx.obj.get("verbose"):
        click.echo(f"Validating directory: {path}")

    # Placeholder implementation (WP05 will implement validation integration)
    click.secho("Not implemented: constitutional validation", fg="yellow")
    click.echo("Implementation coming in WP05 (Validation Integration)")
    ctx.exit(EXIT_SYSTEM_ERROR)


def main() -> None:
    """
    Main entry point for console script.

    Handles exceptions and converts them to appropriate exit codes following
    the CLI contract (0=success, 1=user error, 2=system error, 3=validation
    failure, 4=template not found, 5=conflict).
    """
    try:
        scaffold(standalone_mode=False)
    except click.ClickException as e:
        e.show()
        sys.exit(EXIT_USER_ERROR)
    except click.Abort:
        click.echo("Aborted!", err=True)
        sys.exit(EXIT_USER_ERROR)
    except KeyboardInterrupt:
        click.echo("\nInterrupted by user", err=True)
        sys.exit(EXIT_USER_ERROR)
    except Exception as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(EXIT_SYSTEM_ERROR)


if __name__ == "__main__":
    main()
