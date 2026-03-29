"""
Django management command for scaffolding CLI.

Provides 'python manage.py scaffold' as an alternative to the console script
'django-core-scaffold', with identical functionality and interface.
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from scaffolding.cli import scaffold


class Command(BaseCommand):
    """Django management command wrapper for scaffolding CLI."""

    help = "Core scaffolding CLI for Django apps and projects"

    def add_arguments(self, parser: Any) -> None:
        """
        Add arguments to management command parser.

        We capture all arguments to pass them to Click.
        We also explicitly define flags that precede the subcommand to satisfy Django's parser.
        """
        parser.add_argument(
            "--no-interactive",
            action="store_true",
            help="Run without prompts (use defaults, CI/CD mode)",
        )
        parser.add_argument("args", nargs=argparse.REMAINDER)

    def handle(self, *args: Any, **options: Any) -> None:
        """
        Run scaffolding CLI via Django management command.

        Delegates to Click-based CLI function, converting Click exit codes
        to Django management command exceptions as needed.
        """
        try:
            # Pass sys.argv to Click, skip 'manage.py scaffold' prefix
            # sys.argv = ['manage.py', 'scaffold', 'app', 'payments', ...]
            # We want Click to see: ['app', 'payments', ...]
            argv = sys.argv[2:]  # Skip 'manage.py' and 'scaffold'

            # Run Click CLI in non-standalone mode to catch exceptions
            scaffold(argv, standalone_mode=False)

        except SystemExit as e:
            # Convert Click exit codes to Django management command errors
            if e.code and e.code != 0:
                exit_code_messages = {
                    1: "User error (invalid input or aborted)",
                    2: "System error (not implemented or internal error)",
                    3: "Validation failure (constitutional checks failed)",
                    4: "Template not found",
                    5: "File conflict (target already exists)",
                }
                message = exit_code_messages.get(
                    e.code,
                    f"Unknown error (exit code {e.code})",
                )
                raise CommandError(f"Scaffolding failed: {message}") from None

        except Exception as e:
            # Catch any unhandled exceptions and convert to CommandError
            raise CommandError(f"Scaffolding error: {e}") from e
