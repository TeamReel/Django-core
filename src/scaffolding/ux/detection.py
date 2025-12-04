"""
TTY detection for interactive vs non-interactive mode.

Determines whether CLI is running in a terminal (interactive)
or in CI/CD pipeline (non-interactive) using sys.stdout.isatty().
"""

import sys


def is_interactive(force_interactive: bool = False) -> bool:
    """
    Detect if CLI is running in interactive terminal.

    Checks if stdout is connected to a TTY (terminal). Can be overridden
    with --no-interactive flag for automation scenarios.

    Args:
        force_interactive: Override TTY detection (default: False).
                          Set to False to force non-interactive mode.

    Returns:
        True if running in terminal (interactive), False if in CI/CD (non-interactive)

    Examples:
        >>> # In terminal
        >>> is_interactive()
        True

        >>> # In CI/CD pipeline (no TTY)
        >>> is_interactive()
        False

        >>> # Force non-interactive with --no-interactive flag
        >>> is_interactive(force_interactive=False)
        False

    Notes:
        - sys.stdout.isatty() returns True for terminals, False for pipes/files
        - Common non-TTY scenarios: CI/CD, cron jobs, subprocess.run()
        - Interactive prompts should check this before calling click.prompt()
    """
    if force_interactive is False:
        # Explicit override: force non-interactive mode
        return False

    # Check if stdout is a terminal
    return sys.stdout.isatty()
