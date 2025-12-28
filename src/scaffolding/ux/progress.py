"""
Progress indicators for long-running operations.

Provides spinners, progress bars, and status messages for file generation,
validation, and other operations. Only shows in interactive mode.
"""

from contextlib import contextmanager
from typing import Iterator

import click


class ProgressReporter:
    """
    Report progress for scaffolding operations.

    Displays status messages, spinners, and progress indicators
    only when running in interactive mode. Suppresses output in
    non-interactive mode (CI/CD) to avoid cluttering logs.
    """

    def __init__(self, interactive: bool = True, verbose: bool = False):
        """
        Initialize progress reporter.

        Args:
            interactive: Whether to show progress indicators (from is_interactive())
            verbose: Whether to show detailed progress messages
        """
        self.interactive = interactive
        self.verbose = verbose

    def status(self, message: str, fg: str = "cyan") -> None:
        """
        Display status message.

        Args:
            message: Status message to display
            fg: Text color (cyan, green, yellow, red)

        Examples:
            >>> reporter = ProgressReporter(interactive=True)
            >>> reporter.status("Rendering templates...")
            # Output: "⏳ Rendering templates..." (in cyan)

            >>> # Non-interactive mode (no output)
            >>> reporter = ProgressReporter(interactive=False)
            >>> reporter.status("Rendering...")
            # Output: (nothing)
        """
        if not self.interactive:
            return

        icon = "⏳" if fg == "cyan" else "✓" if fg == "green" else "⚠"
        click.secho(f"{icon} {message}", fg=fg)

    def success(self, message: str) -> None:
        """
        Display success message (green checkmark).

        Args:
            message: Success message to display
        """
        self.status(message, fg="green")

    def warning(self, message: str) -> None:
        """
        Display warning message (yellow warning icon).

        Args:
            message: Warning message to display
        """
        self.status(message, fg="yellow")

    def verbose_log(self, message: str) -> None:
        """
        Display verbose log message (only if verbose=True).

        Args:
            message: Verbose message to display
        """
        if not self.verbose or not self.interactive:
            return

        click.secho(f"  → {message}", fg="white", dim=True)

    @contextmanager
    def spinner(self, message: str) -> Iterator[None]:
        """
        Context manager for spinner during long operation.

        Displays animated spinner with message while operation runs.
        Shows completion message when done.

        Args:
            message: Message to display with spinner

        Yields:
            None (operation runs in context)

        Examples:
            >>> reporter = ProgressReporter(interactive=True)
            >>> with reporter.spinner("Generating files"):
            ...     # Long operation here
            ...     generate_templates()
            # Output: "⏳ Generating files..." (animated)
            # Then: "✓ Generating files... done"

            >>> # Non-interactive mode (no spinner)
            >>> reporter = ProgressReporter(interactive=False)
            >>> with reporter.spinner("Generating"):
            ...     generate_templates()
            # Output: (nothing)
        """
        if not self.interactive:
            # Non-interactive: no spinner, just execute
            yield
            return

        # Interactive: show spinner
        click.echo(f"⏳ {message}...", nl=False)

        try:
            yield
            # Success
            click.echo("\r✓ " + message + "... " + click.style("done", fg="green"))
        except Exception:
            # Failure
            click.echo("\r✗ " + message + "... " + click.style("failed", fg="red"))
            raise

    @contextmanager
    def progress_bar(self, total: int, label: str = "Progress") -> Iterator[click.progressbar]:
        """
        Context manager for progress bar.

        Displays progress bar for operations with known total count.

        Args:
            total: Total number of items to process
            label: Label for progress bar

        Yields:
            click.progressbar instance to update

        Examples:
            >>> reporter = ProgressReporter(interactive=True)
            >>> files = ['a.py', 'b.py', 'c.py']
            >>> with reporter.progress_bar(len(files), "Copying files") as bar:
            ...     for file in files:
            ...         copy_file(file)
            ...         bar.update(1)
            # Output: "Copying files [####--------] 40%"

            >>> # Non-interactive mode (no progress bar)
            >>> reporter = ProgressReporter(interactive=False)
            >>> with reporter.progress_bar(3, "Copying") as bar:
            ...     for file in files:
            ...         copy_file(file)
            ...         bar.update(1)  # No-op
            # Output: (nothing)
        """
        if not self.interactive:
            # Non-interactive: provide dummy bar (no-op)
            class DummyBar:
                def update(self, n: int) -> None:
                    pass

            yield DummyBar()
            return

        # Interactive: show progress bar
        with click.progressbar(length=total, label=label, show_eta=True, show_percent=True) as bar:
            yield bar

    def file_created(self, file_path: str) -> None:
        """
        Report file creation in verbose mode.

        Args:
            file_path: Path to created file
        """
        self.verbose_log(f"Created: {file_path}")

    def validation_running(self) -> None:
        """Report that validation is running."""
        self.status("Running constitutional validation...")

    def validation_complete(self, passed: bool) -> None:
        """
        Report validation completion.

        Args:
            passed: Whether validation passed
        """
        if passed:
            self.success("Constitutional validation passed")
        else:
            self.warning("Constitutional validation failed (see details above)")
