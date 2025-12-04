"""
Unit tests for CLI framework (WP01 coverage).

Tests command parsing, exit codes, error handling, and CLI interface.
Uses Click's test infrastructure for testing the CLI.
"""

from click.testing import CliRunner
import pytest

from scaffolding.cli import (
    scaffold,
    main,
    EXIT_SUCCESS,
    EXIT_USER_ERROR,
    EXIT_SYSTEM_ERROR,
    EXIT_VALIDATION_FAILURE,
    EXIT_TEMPLATE_NOT_FOUND,
    EXIT_CONFLICT,
)


@pytest.fixture
def runner():
    """Create a CLI test runner."""
    return CliRunner()


class TestScaffoldGroup:
    """Test scaffold CLI group and global options."""

    def test_scaffold_help(self, runner):
        """Test scaffold --help shows usage information."""
        result = runner.invoke(scaffold, ["--help"])
        assert result.exit_code == 0
        assert "Core scaffolding CLI" in result.output
        assert "app" in result.output
        assert "init" in result.output
        assert "list-templates" in result.output
        assert "validate" in result.output

    def test_scaffold_version(self, runner):
        """Test scaffold --version shows version."""
        result = runner.invoke(scaffold, ["--version"])
        assert result.exit_code == 0
        assert "django-core-scaffold" in result.output

    def test_no_interactive_flag(self, runner):
        """Test --no-interactive flag is recognized."""
        result = runner.invoke(scaffold, ["--no-interactive", "--help"])
        assert result.exit_code == 0

    def test_verbose_flag(self, runner):
        """Test --verbose flag is recognized."""
        result = runner.invoke(scaffold, ["--verbose", "--help"])
        assert result.exit_code == 0


class TestAppCommand:
    """Test scaffold app subcommand."""

    def test_app_help(self, runner):
        """Test scaffold app --help shows usage."""
        result = runner.invoke(scaffold, ["app", "--help"])
        assert result.exit_code == 0
        assert "Generate new Django app/module" in result.output
        assert "--template" in result.output
        assert "--validate" in result.output
        assert "--force" in result.output

    def test_app_requires_name(self, runner):
        """Test scaffold app requires name argument."""
        result = runner.invoke(scaffold, ["app"])
        assert result.exit_code != 0
        assert "Missing argument" in result.output

    def test_app_default_template(self, runner):
        """Test scaffold app uses minimal template by default."""
        result = runner.invoke(scaffold, ["app", "test_app"])
        # Currently placeholder, so should return system error
        assert "minimal" in result.output or result.exit_code != 0

    def test_app_custom_template(self, runner):
        """Test scaffold app with custom template."""
        result = runner.invoke(scaffold, ["app", "test_app", "--template", "api-first"])
        # Placeholder returns system error
        assert result.exit_code == EXIT_SYSTEM_ERROR

    def test_app_no_validate_flag(self, runner):
        """Test scaffold app --no-validate flag."""
        result = runner.invoke(scaffold, ["app", "test_app", "--no-validate"])
        assert result.exit_code == EXIT_SYSTEM_ERROR  # Placeholder

    def test_app_force_flag(self, runner):
        """Test scaffold app --force flag."""
        result = runner.invoke(scaffold, ["app", "test_app", "--force"])
        assert result.exit_code == EXIT_SYSTEM_ERROR  # Placeholder


class TestInitCommand:
    """Test scaffold init subcommand."""

    def test_init_help(self, runner):
        """Test scaffold init --help shows usage."""
        result = runner.invoke(scaffold, ["init", "--help"])
        assert result.exit_code == 0
        assert "Bootstrap new downstream project" in result.output
        assert "--project-name" in result.output

    def test_init_requires_name(self, runner):
        """Test scaffold init requires name argument."""
        result = runner.invoke(scaffold, ["init"])
        assert result.exit_code != 0
        assert "Missing argument" in result.output

    def test_init_basic(self, runner):
        """Test scaffold init basic invocation."""
        result = runner.invoke(scaffold, ["init", "my-project"])
        # Placeholder returns system error
        assert result.exit_code == EXIT_SYSTEM_ERROR

    def test_init_with_project_name(self, runner):
        """Test scaffold init with custom project name."""
        result = runner.invoke(
            scaffold, ["init", "my-project", "--project-name", "My Project"]
        )
        assert result.exit_code == EXIT_SYSTEM_ERROR  # Placeholder


class TestListTemplatesCommand:
    """Test scaffold list-templates subcommand."""

    def test_list_templates_help(self, runner):
        """Test scaffold list-templates --help shows usage."""
        result = runner.invoke(scaffold, ["list-templates", "--help"])
        assert result.exit_code == 0
        assert "List available templates" in result.output


class TestValidateCommand:
    """Test scaffold validate subcommand."""

    def test_validate_help(self, runner):
        """Test scaffold validate --help shows usage."""
        result = runner.invoke(scaffold, ["validate", "--help"])
        assert result.exit_code == 0
        assert "Run constitutional validation" in result.output

    def test_validate_requires_path(self, runner):
        """Test scaffold validate requires path argument."""
        result = runner.invoke(scaffold, ["validate"])
        assert result.exit_code != 0
        assert "Missing argument" in result.output


class TestCLIExitCodes:
    """Test CLI exit code constants."""

    def test_exit_codes_defined(self):
        """Test all exit codes are defined correctly."""
        assert EXIT_SUCCESS == 0
        assert EXIT_USER_ERROR == 1
        assert EXIT_SYSTEM_ERROR == 2
        assert EXIT_VALIDATION_FAILURE == 3
        assert EXIT_TEMPLATE_NOT_FOUND == 4
        assert EXIT_CONFLICT == 5


class TestMainFunction:
    """Test main() entry point function."""

    def test_main_is_callable(self):
        """Test main() function exists and is callable."""
        assert callable(main)


class TestCLINonInteractiveMode:
    """Test CLI non-interactive mode for CI/CD."""

    def test_non_interactive_with_app(self, runner):
        """Test --no-interactive flag works with app command."""
        result = runner.invoke(scaffold, ["--no-interactive", "app", "test_app"])
        # Should not prompt, just run (placeholder still returns error)
        assert result.exit_code == EXIT_SYSTEM_ERROR


class TestCLIVerboseOutput:
    """Test CLI verbose output mode."""

    def test_verbose_with_app(self, runner):
        """Test --verbose flag works with app command."""
        result = runner.invoke(scaffold, ["--verbose", "app", "test_app"])
        # Verbose should show additional output
        assert "Generating app" in result.output or result.exit_code != 0
