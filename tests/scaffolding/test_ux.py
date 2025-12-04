"""
Unit tests for UX utilities (TTY detection, prompts, progress, summary).

Tests interactive vs non-interactive behavior, prompt logic, progress
indicators, and summary formatting.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scaffolding.ux.detection import is_interactive
from scaffolding.ux.progress import ProgressReporter
from scaffolding.ux.prompts import (
    prompt_for_app_name,
    prompt_for_confirmation,
    prompt_for_template,
    prompt_for_template_variables,
)
from scaffolding.ux.summary import (
    print_error_summary,
    print_generation_summary,
)


class TestTTYDetection:
    """Test TTY detection for interactive mode."""

    def test_is_interactive_in_terminal(self):
        """Test is_interactive returns True when stdout is TTY."""
        with patch("sys.stdout.isatty", return_value=True):
            assert is_interactive() is True

    def test_is_interactive_in_ci(self):
        """Test is_interactive returns False when stdout is not TTY (CI/CD)."""
        with patch("sys.stdout.isatty", return_value=False):
            assert is_interactive() is False

    def test_is_interactive_force_override(self):
        """Test force_interactive=False overrides TTY detection."""
        with patch("sys.stdout.isatty", return_value=True):
            # Even though TTY is True, force non-interactive
            assert is_interactive(force_interactive=False) is False


class TestPrompts:
    """Test interactive prompts with Click."""

    def test_prompt_for_template_interactive(self):
        """Test template selection in interactive mode."""
        templates = ["minimal", "api-first", "service"]

        with patch("click.prompt", return_value="api-first"):
            result = prompt_for_template(templates, interactive=True)
            assert result == "api-first"

    def test_prompt_for_template_non_interactive(self):
        """Test template selection in non-interactive mode uses default."""
        templates = ["minimal", "api-first", "service"]

        result = prompt_for_template(
            templates, default="minimal", interactive=False
        )
        assert result == "minimal"

    def test_prompt_for_template_empty_list(self):
        """Test template prompt with no templates available."""
        result = prompt_for_template([], default="minimal", interactive=True)
        assert result == "minimal"

    def test_prompt_for_app_name_interactive(self):
        """Test app name prompt in interactive mode."""
        with patch("click.prompt", return_value="payments"):
            result = prompt_for_app_name(interactive=True)
            assert result == "payments"

    def test_prompt_for_app_name_non_interactive_with_default(self):
        """Test app name in non-interactive mode with default."""
        result = prompt_for_app_name(default="payments", interactive=False)
        assert result == "payments"

    def test_prompt_for_app_name_non_interactive_no_default(self):
        """Test app name in non-interactive mode without default raises error."""
        with pytest.raises(Exception, match="required in non-interactive mode"):
            prompt_for_app_name(interactive=False)

    def test_prompt_for_confirmation_interactive_yes(self):
        """Test confirmation prompt returns True when user confirms."""
        with patch("click.confirm", return_value=True):
            result = prompt_for_confirmation(
                "Generate app?", interactive=True
            )
            assert result is True

    def test_prompt_for_confirmation_interactive_no(self):
        """Test confirmation prompt returns False when user declines."""
        with patch("click.confirm", return_value=False):
            result = prompt_for_confirmation(
                "Overwrite?", interactive=True
            )
            assert result is False

    def test_prompt_for_confirmation_non_interactive(self):
        """Test confirmation in non-interactive mode uses default."""
        result = prompt_for_confirmation(
            "Generate?", default=True, interactive=False
        )
        assert result is True

        result = prompt_for_confirmation(
            "Overwrite?", default=False, interactive=False
        )
        assert result is False

    def test_prompt_for_template_variables_interactive(self):
        """Test variable prompts in interactive mode."""
        required = {"model_name": "Model class name"}
        optional = {"author": "Default Author"}

        with patch("click.prompt", side_effect=["Payment", "John Doe"]):
            result = prompt_for_template_variables(
                required, optional, interactive=True
            )
            assert result == {"model_name": "Payment", "author": "John Doe"}

    def test_prompt_for_template_variables_non_interactive(self):
        """Test variables in non-interactive mode use defaults only."""
        required = {"model_name": "Model class name"}
        optional = {"author": "Default Author"}

        result = prompt_for_template_variables(
            required, optional, interactive=False
        )
        # Non-interactive: only optional defaults returned
        assert result == {"author": "Default Author"}
        assert "model_name" not in result  # Required skipped


class TestProgressReporter:
    """Test progress indicators and status messages."""

    def test_reporter_interactive_mode(self):
        """Test progress reporter shows messages in interactive mode."""
        reporter = ProgressReporter(interactive=True, verbose=False)

        with patch("click.secho") as mock_secho:
            reporter.status("Rendering templates...")
            assert mock_secho.called

    def test_reporter_non_interactive_mode(self):
        """Test progress reporter suppresses messages in non-interactive mode."""
        reporter = ProgressReporter(interactive=False, verbose=False)

        with patch("click.secho") as mock_secho:
            reporter.status("Rendering...")
            assert not mock_secho.called

    def test_reporter_success_message(self):
        """Test success message formatting."""
        reporter = ProgressReporter(interactive=True)

        with patch("click.secho") as mock_secho:
            reporter.success("Generation complete")
            mock_secho.assert_called_once()
            args, kwargs = mock_secho.call_args
            assert "Generation complete" in args[0]
            assert kwargs["fg"] == "green"

    def test_reporter_warning_message(self):
        """Test warning message formatting."""
        reporter = ProgressReporter(interactive=True)

        with patch("click.secho") as mock_secho:
            reporter.warning("Validation skipped")
            mock_secho.assert_called_once()
            args, kwargs = mock_secho.call_args
            assert "Validation skipped" in args[0]
            assert kwargs["fg"] == "yellow"

    def test_reporter_verbose_logging(self):
        """Test verbose logging only shows when verbose=True."""
        # Non-verbose: no output
        reporter = ProgressReporter(interactive=True, verbose=False)
        with patch("click.secho") as mock_secho:
            reporter.verbose_log("Created file")
            assert not mock_secho.called

        # Verbose: shows output
        reporter = ProgressReporter(interactive=True, verbose=True)
        with patch("click.secho") as mock_secho:
            reporter.verbose_log("Created file")
            assert mock_secho.called

    def test_reporter_spinner_context(self):
        """Test spinner context manager."""
        reporter = ProgressReporter(interactive=True)

        with patch("click.echo") as mock_echo:
            with reporter.spinner("Generating files"):
                pass  # Operation
            # Should show start and completion
            assert mock_echo.call_count >= 2

    def test_reporter_spinner_non_interactive(self):
        """Test spinner suppressed in non-interactive mode."""
        reporter = ProgressReporter(interactive=False)

        with patch("click.echo") as mock_echo:
            with reporter.spinner("Generating"):
                pass
            # No output in non-interactive
            assert not mock_echo.called

    def test_reporter_progress_bar_interactive(self):
        """Test progress bar in interactive mode."""
        reporter = ProgressReporter(interactive=True)

        with patch("click.progressbar") as mock_bar:
            mock_bar.return_value.__enter__ = lambda self: self
            mock_bar.return_value.__exit__ = lambda *args: None

            with reporter.progress_bar(10, "Copying files") as bar:
                pass

            mock_bar.assert_called_once()

    def test_reporter_progress_bar_non_interactive(self):
        """Test progress bar returns dummy in non-interactive mode."""
        reporter = ProgressReporter(interactive=False)

        with reporter.progress_bar(10, "Copying") as bar:
            # Should not raise error
            bar.update(1)
            # Dummy bar, no-op


class TestSummaryFormatting:
    """Test post-generation summary display."""

    def test_print_generation_summary_interactive(self, tmp_path):
        """Test summary display in interactive mode."""
        files = [
            tmp_path / "src" / "payments" / "models.py",
            tmp_path / "src" / "payments" / "apps.py",
        ]

        with patch("click.echo") as mock_echo, patch("click.secho"):
            print_generation_summary(
                app_name="payments",
                template_name="minimal",
                files_created=files,
                project_root=tmp_path,
                interactive=True,
            )

            # Should show multiple sections
            assert mock_echo.call_count > 0

    def test_print_generation_summary_non_interactive(self, tmp_path):
        """Test summary is minimal in non-interactive mode."""
        files = [tmp_path / "models.py"]

        with patch("click.echo") as mock_echo:
            print_generation_summary(
                app_name="payments",
                template_name="minimal",
                files_created=files,
                project_root=tmp_path,
                interactive=False,
            )

            # Minimal output (single line)
            assert mock_echo.call_count == 1

    def test_print_generation_summary_many_files(self, tmp_path):
        """Test summary truncates large file lists."""
        # Create 30 file paths
        files = [tmp_path / f"file_{i}.py" for i in range(30)]

        with patch("click.echo") as mock_echo, patch("click.secho"):
            print_generation_summary(
                app_name="test_app",
                template_name="minimal",
                files_created=files,
                project_root=tmp_path,
                interactive=True,
            )

            # Should mention "and X more files"
            output = "".join(str(call) for call in mock_echo.call_args_list)
            assert "more file" in output.lower()

    def test_print_generation_summary_api_first_tips(self, tmp_path):
        """Test API-specific tips shown for api-first template."""
        files = [tmp_path / "serializers.py"]

        with patch("click.echo") as mock_echo, patch("click.secho"):
            print_generation_summary(
                app_name="api",
                template_name="api-first",
                files_created=files,
                project_root=tmp_path,
                interactive=True,
            )

            # Should show API tips
            output = "".join(str(call) for call in mock_echo.call_args_list)
            assert "api" in output.lower() or "url" in output.lower()

    def test_print_error_summary_interactive(self):
        """Test error summary with suggestions."""
        suggestions = [
            "Choose different name",
            "Remove existing directory",
        ]

        with patch("click.echo") as mock_echo, patch("click.secho"):
            print_error_summary(
                error_message="App already exists",
                suggestions=suggestions,
                interactive=True,
            )

            # Should show error and suggestions
            assert mock_echo.call_count > 0

    def test_print_error_summary_non_interactive(self):
        """Test error summary is minimal in non-interactive mode."""
        suggestions = ["Fix it"]

        with patch("click.echo") as mock_echo:
            print_error_summary(
                error_message="Error occurred",
                suggestions=suggestions,
                interactive=False,
            )

            # Minimal error output
            assert mock_echo.call_count == 1


class TestManualUXScenarios:
    """
    Manual UX test scenarios (documented for human testing).

    These tests document expected UX behavior for manual verification.
    Run these scenarios in a real terminal to verify interactive mode.
    """

    def test_scenario_interactive_app_generation(self):
        """
        MANUAL TEST: Interactive app generation with prompts.

        Steps:
        1. Run: django-core-scaffold app
        2. Should prompt: "Select template: 1) minimal 2) api-first..."
        3. Should prompt: "Enter app name (snake_case):"
        4. Should show progress: "⏳ Rendering templates..."
        5. Should show success: "✓ Successfully generated app..."
        6. Should list files created
        7. Should suggest next steps

        Expected: Interactive prompts, progress indicators, summary
        """
        pass  # Manual test - run in terminal

    def test_scenario_non_interactive_ci_mode(self):
        """
        MANUAL TEST: Non-interactive mode for CI/CD.

        Steps:
        1. Run: django-core-scaffold app payments --template minimal
        2. Should NOT prompt (use defaults)
        3. Should show minimal output
        4. Should exit with code 0 on success

        Expected: No prompts, minimal output, automation-friendly
        """
        pass  # Manual test - run in CI script

    def test_scenario_force_non_interactive_flag(self):
        """
        MANUAL TEST: --no-interactive flag override.

        Steps:
        1. Run in terminal: django-core-scaffold app --no-interactive
        2. Should NOT show prompts despite being in TTY
        3. Should use defaults silently

        Expected: No prompts even in terminal
        """
        pass  # Manual test - run with flag

    def test_scenario_validation_progress(self):
        """
        MANUAL TEST: Progress indicators during validation.

        Steps:
        1. Run: django-core-scaffold app payments
        2. Should show: "⏳ Running constitutional validation..."
        3. Should show: "✓ Constitutional validation passed" (or failed)

        Expected: Clear status updates for long operations
        """
        pass  # Manual test - watch validation

    def test_scenario_error_with_suggestions(self):
        """
        MANUAL TEST: Error display with helpful suggestions.

        Steps:
        1. Run: django-core-scaffold app existing_app
        2. Should show: "✗ Error: App 'existing_app' already exists"
        3. Should show suggestions:
           • Choose a different app name
           • Remove existing app: rm -rf src/existing_app/
        4. Exit code should be 5 (conflict)

        Expected: Clear error message with actionable suggestions
        """
        pass  # Manual test - trigger conflict
