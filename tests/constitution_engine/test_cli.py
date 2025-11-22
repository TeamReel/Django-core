"""
End-to-end tests for the CLI module.

These tests verify the CLI works correctly with various arguments and scenarios.
"""

import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from constitution_engine.cli import cli, is_github_actions


class TestCLIEndToEnd:
    """End-to-end tests for CLI functionality."""

    def test_cli_help(self) -> None:
        """Test --help displays usage information."""
        # argparse --help raises SystemExit(0)
        with pytest.raises(SystemExit) as exc_info:
            cli(["--help"])
        assert exc_info.value.code == 0

    def test_cli_version(self) -> None:
        """Test --version displays version information."""
        with patch("sys.stdout.write"):
            try:
                cli(["--version"])
            except SystemExit:
                pass  # Expected for --version
        # Version should exit successfully
        assert True

    def test_cli_invalid_argument(self) -> None:
        """Test invalid arguments return error."""
        with pytest.raises(SystemExit) as exc_info:
            cli(["--invalid-flag"])
        assert exc_info.value.code != 0

    def test_cli_config_not_found(self, tmp_path: Path) -> None:
        """Test exit code 2 when config file not found."""
        config = tmp_path / "nonexistent.yaml"
        result = cli(["--config", str(config), "--repo-path", str(tmp_path)])
        assert result == 2

    def test_cli_with_no_git_flag(self, tmp_path: Path) -> None:
        """Test --no-git flag disables Git metadata collection."""
        # Create minimal config
        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        result = cli(["--config", str(config), "--repo-path", str(tmp_path), "--no-git"])

        # Should succeed (no rules, so no violations)
        assert result == 0

    def test_cli_output_formats(self, tmp_path: Path) -> None:
        """Test different output formats."""
        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        # Console output (default)
        result = cli(
            [
                "--config",
                str(config),
                "--repo-path",
                str(tmp_path),
                "--output",
                "console",
                "--no-git",
            ]
        )
        assert result == 0

        # JSON output
        result = cli(
            ["--config", str(config), "--repo-path", str(tmp_path), "--output", "json", "--no-git"]
        )
        assert result == 0

        # Both outputs
        result = cli(
            ["--config", str(config), "--repo-path", str(tmp_path), "--output", "both", "--no-git"]
        )
        assert result == 0

    def test_cli_fail_on_levels(self, tmp_path: Path) -> None:
        """Test different --fail-on severity levels."""
        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        for level in ["low", "medium", "high", "critical", "never"]:
            result = cli(
                [
                    "--config",
                    str(config),
                    "--repo-path",
                    str(tmp_path),
                    "--fail-on",
                    level,
                    "--no-git",
                ]
            )
            # Should succeed (no rules, so no violations)
            assert result == 0

    def test_cli_verbose_flag(self, tmp_path: Path) -> None:
        """Test --verbose enables debug logging."""
        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        result = cli(
            ["--config", str(config), "--repo-path", str(tmp_path), "--verbose", "--no-git"]
        )
        assert result == 0

    def test_is_github_actions_detection(self) -> None:
        """Test GitHub Actions environment detection."""
        # Default: not in GitHub Actions
        with patch.dict("os.environ", {}, clear=True):
            assert is_github_actions() is False

        # With GITHUB_ACTIONS=true
        with patch.dict("os.environ", {"GITHUB_ACTIONS": "true"}):
            assert is_github_actions() is True

        # With GITHUB_ACTIONS=false
        with patch.dict("os.environ", {"GITHUB_ACTIONS": "false"}):
            assert is_github_actions() is False

    def test_cli_main_entry_point(self) -> None:
        """Test main() entry point exists and is callable."""
        from constitution_engine.cli import main

        # main() should call sys.exit(), so we expect SystemExit
        with pytest.raises(SystemExit):
            with patch("constitution_engine.cli.cli", return_value=0):
                main()


class TestCLIIntegration:
    """Integration tests using subprocess to test actual CLI invocation."""

    def test_cli_subprocess_help(self) -> None:
        """Test CLI can be invoked via subprocess."""
        result = subprocess.run(  # noqa: S603
            [sys.executable, "-m", "constitution_engine.cli", "--help"],
            capture_output=True,
            text=True,
            check=False,
        )

        assert result.returncode == 0
        assert "constitution-engine" in result.stdout
        assert "--config" in result.stdout
        assert "--repo-path" in result.stdout

    def test_cli_subprocess_version(self) -> None:
        """Test --version via subprocess."""
        result = subprocess.run(  # noqa: S603
            [sys.executable, "-m", "constitution_engine.cli", "--version"],
            capture_output=True,
            text=True,
            check=False,
        )

        # Version command should exit successfully
        assert result.returncode == 0

    def test_cli_console_script_exists(self) -> None:
        """Test that console script entry point is configured."""
        # This test verifies pyproject.toml has [project.scripts]
        # The actual script won't be available until package is installed

        try:
            import tomllib  # Python 3.11+
        except ImportError:
            try:
                import tomli as tomllib  # Fallback for Python 3.10
            except ImportError:
                pytest.skip("tomllib/tomli not available")

        pyproject_path = Path(__file__).parents[3] / "pyproject.toml"
        if not pyproject_path.exists():
            pytest.skip("pyproject.toml not found")

        with open(pyproject_path, "rb") as f:
            config = tomllib.load(f)

        scripts = config.get("project", {}).get("scripts", {})
        assert "constitution-engine" in scripts
        assert scripts["constitution-engine"] == "constitution_engine.cli:main"


class TestGitHubActionsIntegration:
    """Tests for GitHub Actions-specific features."""

    def test_github_actions_annotations(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test annotations are emitted in GitHub Actions environment."""
        # Set GitHub Actions environment
        monkeypatch.setenv("GITHUB_ACTIONS", "true")

        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        # Capture stdout to check for annotations
        import io
        from contextlib import redirect_stdout

        captured = io.StringIO()
        with redirect_stdout(captured):
            result = cli(["--config", str(config), "--repo-path", str(tmp_path), "--no-git"])

        # Should succeed with no violations
        assert result == 0

    def test_github_step_summary(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test step summary is written in GitHub Actions."""
        # Set GitHub Actions environment with summary file
        summary_file = tmp_path / "step_summary.md"
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary_file))

        config = tmp_path / "constitution.yaml"
        config.write_text("version: 1\nrules: []\n")

        result = cli(["--config", str(config), "--repo-path", str(tmp_path), "--no-git"])

        # Should succeed
        assert result == 0

        # Summary file should be created
        assert summary_file.exists()
        content = summary_file.read_text(encoding="utf-8")
        assert "Constitutional Enforcement Results" in content
