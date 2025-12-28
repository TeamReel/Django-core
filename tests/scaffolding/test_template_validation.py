"""
Validation smoke tests for built-in templates.

Tests verify that generated code passes all validation checks:
- Ruff (linting)
- mypy (type checking)
- check_policy.py (constitutional validation)

NOTE: These tests are placeholders until WP04-WP05 implements
full code generation and validation integration.
"""

import subprocess
import tempfile
from pathlib import Path

import pytest
from scaffolding.validation.runner import ValidationRunner


@pytest.fixture
def temp_output_dir():
    """Provide temporary directory for generated output."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestValidationRunner:
    """Test ValidationRunner functionality."""

    def test_runner_instantiation(self):
        """Test ValidationRunner can be created."""
        runner = ValidationRunner()
        assert runner is not None

    def test_runner_has_run_ruff_method(self):
        """Test ValidationRunner has run_ruff method."""
        runner = ValidationRunner()
        assert callable(getattr(runner, "run_ruff", None))

    def test_runner_has_run_mypy_method(self):
        """Test ValidationRunner has run_mypy method."""
        runner = ValidationRunner()
        assert callable(getattr(runner, "run_mypy", None))


class TestRuffValidation:
    """Test Ruff linting validation."""

    def test_ruff_installed(self):
        """Test Ruff is available on PATH."""
        result = subprocess.run(
            ["ruff", "--version"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "ruff" in result.stdout.lower()


class TestMypyValidation:
    """Test mypy type checking validation."""

    def test_mypy_installed(self):
        """Test mypy is available on PATH."""
        result = subprocess.run(
            ["mypy", "--version"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "mypy" in result.stdout.lower()


class TestMinimalTemplateValidation:
    """Test minimal template passes validation."""

    @pytest.mark.skip(reason="WP04-WP05 will implement full validation")
    def test_minimal_passes_ruff(self, temp_output_dir):
        """Test minimal template generated code passes Ruff."""
        pass

    @pytest.mark.skip(reason="WP04-WP05 will implement full validation")
    def test_minimal_passes_mypy(self, temp_output_dir):
        """Test minimal template generated code passes mypy."""
        pass

    @pytest.mark.skip(reason="WP04-WP05 will implement full validation")
    def test_minimal_passes_constitutional(self, temp_output_dir):
        """Test minimal template passes constitutional checks."""
        pass


class TestApiFirstTemplateValidation:
    """Test api-first template passes validation."""

    @pytest.mark.skip(reason="WP04-WP05 will implement full validation")
    def test_api_first_passes_ruff(self, temp_output_dir):
        """Test api-first template generated code passes Ruff."""
        pass

    @pytest.mark.skip(reason="WP04-WP05 will implement full validation")
    def test_api_first_passes_mypy(self, temp_output_dir):
        """Test api-first template generated code passes mypy."""
        pass


class TestConstitutionalValidation:
    """Test constitutional validation integration."""

    def test_check_policy_exists(self):
        """Test check_policy.py exists in project root."""
        check_policy = Path(__file__).parents[2] / "check_policy.py"
        assert check_policy.exists(), "check_policy.py should exist in project root"

    @pytest.mark.skip(reason="WP05 will implement validation integration")
    def test_constitutional_check_runs(self, temp_output_dir):
        """Test constitutional check can be invoked."""
        pass
