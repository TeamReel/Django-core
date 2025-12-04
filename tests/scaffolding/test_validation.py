"""
Unit tests for constitutional validation integration.

Tests ValidationRunner, report parsing, formatting, and integration
with CodeGenerator for --validate and --force flags.
"""

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from scaffolding.generation.exceptions import ValidationFailure
from scaffolding.generation.generator import CodeGenerator
from scaffolding.validation.formatter import format_validation_report
from scaffolding.validation.runner import ValidationRunner


class TestValidationRunner:
    """Test ValidationRunner subprocess execution and report parsing."""

    def test_runner_init_requires_existing_script(self, tmp_path):
        """Test ValidationRunner requires check_policy.py to exist."""
        check_policy = tmp_path / "check_policy.py"

        # Script doesn't exist yet
        with pytest.raises(FileNotFoundError, match="check_policy.py not found"):
            ValidationRunner(check_policy)

        # Create script
        check_policy.touch()

        # Now should succeed
        runner = ValidationRunner(check_policy)
        assert runner.check_policy_path == check_policy

    def test_validation_passes(self, tmp_path):
        """Test validation success (returncode 0)."""
        check_policy = tmp_path / "check_policy.py"
        check_policy.touch()

        runner = ValidationRunner(check_policy)

        # Mock subprocess returning success
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0, stdout="", stderr=""
            )

            report = runner.validate_directory(tmp_path)

            assert report["passed"] is True
            assert len(report["violations"]) == 0
            assert len(report["warnings"]) == 0

    def test_validation_fails_with_violations(self, tmp_path):
        """Test validation failure with violations parsed from JSON."""
        check_policy = tmp_path / "check_policy.py"
        check_policy.touch()

        runner = ValidationRunner(check_policy)

        # Mock subprocess returning failure with JSON
        mock_report = {
            "passed": False,
            "violations": [
                {
                    "file": "models.py",
                    "line": 10,
                    "rule": "B03-001",
                    "message": "Missing CSRF protection",
                }
            ],
            "warnings": [
                {
                    "file": "views.py",
                    "line": 25,
                    "rule": "B04-002",
                    "message": "Missing i18n marker",
                }
            ],
            "passed_checks": ["B01-001", "B01-002"],
        }

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1, stdout=json.dumps(mock_report), stderr=""
            )

            report = runner.validate_directory(tmp_path)

            assert report["passed"] is False
            assert len(report["violations"]) == 1
            assert report["violations"][0]["rule"] == "B03-001"
            assert report["violations"][0]["file"] == "models.py"
            assert len(report["warnings"]) == 1
            assert report["warnings"][0]["rule"] == "B04-002"
            assert len(report["passed_checks"]) == 2

    def test_validation_timeout(self, tmp_path):
        """Test validation timeout handling (>60 seconds)."""
        check_policy = tmp_path / "check_policy.py"
        check_policy.touch()

        runner = ValidationRunner(check_policy)

        # Mock subprocess raising timeout
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired("cmd", 60)

            with pytest.raises(TimeoutError, match="timed out"):
                runner.validate_directory(tmp_path)

    def test_validation_json_parse_error_fallback(self, tmp_path):
        """Test fallback when JSON parsing fails."""
        check_policy = tmp_path / "check_policy.py"
        check_policy.touch()

        runner = ValidationRunner(check_policy)

        # Mock subprocess returning invalid JSON
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout="Invalid JSON {{{",
                stderr="Validation error details",
            )

            report = runner.validate_directory(tmp_path)

            assert report["passed"] is False
            assert len(report["violations"]) == 1
            assert "PARSE_ERROR" in report["violations"][0]["rule"]
            assert "Validation error details" in report["violations"][0]["message"]


class TestValidationFormatter:
    """Test validation report formatting."""

    def test_format_validation_report_with_violations(self):
        """Test formatting report with violations and warnings."""
        report = {
            "passed": False,
            "violations": [
                {
                    "file": "models.py",
                    "line": 10,
                    "rule": "B03-001",
                    "message": "Missing CSRF protection",
                },
                {
                    "file": "views.py",
                    "line": 25,
                    "rule": "B03-002",
                    "message": "SQL injection risk",
                },
            ],
            "warnings": [
                {
                    "file": "tests.py",
                    "line": 15,
                    "rule": "B05-001",
                    "message": "Consider adding docstring",
                }
            ],
        }

        formatted = format_validation_report(report)

        # Check header
        assert "2 violations" in formatted
        assert "1 warning" in formatted

        # Check violations listed
        assert "models.py:10" in formatted
        assert "B03-001" in formatted
        assert "Missing CSRF protection" in formatted
        assert "views.py:25" in formatted
        assert "B03-002" in formatted

        # Check warnings listed
        assert "tests.py:15" in formatted
        assert "B05-001" in formatted
        assert "Consider adding docstring" in formatted

        # Check suggestion
        assert "--force" in formatted

    def test_format_empty_report(self):
        """Test formatting report with no violations (edge case)."""
        report = {"passed": True, "violations": [], "warnings": []}

        formatted = format_validation_report(report)

        assert "passed" in formatted.lower()

    def test_format_handles_missing_fields(self):
        """Test formatter handles violations missing optional fields."""
        report = {
            "passed": False,
            "violations": [
                {"file": "models.py"},  # Missing line, rule, message
                {"line": 10, "rule": "B03-001"},  # Missing file, message
            ],
        }

        formatted = format_validation_report(report)

        # Should not crash, uses defaults
        assert "models.py:?" in formatted or "unknown" in formatted
        assert "B03-001" in formatted


class MockRenderer:
    """Mock renderer for testing integration."""

    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail

    def render_directory(self, output_dir: Path) -> list[Path]:
        """Mock render_directory."""
        if self.should_fail:
            raise RuntimeError("Mock render error")

        # Create mock files
        (output_dir / "models.py").write_text("# models")
        (output_dir / "apps.py").write_text("# apps")

        return [output_dir / "models.py", output_dir / "apps.py"]


class TestValidationIntegration:
    """Test validation integration with CodeGenerator."""

    def test_generate_app_with_validation_passing(self, tmp_path):
        """Test app generation with validation enabled and passing."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Create mock check_policy.py
        check_policy = project_root / "check_policy.py"
        check_policy.touch()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Mock subprocess returning success
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0, stdout="", stderr=""
            )

            # Should succeed with validation
            generator.generate_app(
                "payments", "minimal", project_root, validate=True, force=False
            )

            # Verify app created
            assert (project_root / "src" / "payments").exists()

            # Verify subprocess called
            assert mock_run.called

    def test_generate_app_with_validation_failing_no_force(self, tmp_path):
        """Test app generation with validation failing and no --force flag."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Create mock check_policy.py
        check_policy = project_root / "check_policy.py"
        check_policy.touch()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Mock subprocess returning failure
        mock_report = {
            "passed": False,
            "violations": [
                {
                    "file": "models.py",
                    "line": 10,
                    "rule": "B03-001",
                    "message": "Missing CSRF",
                }
            ],
            "warnings": [],
        }

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1, stdout=json.dumps(mock_report), stderr=""
            )

            # Should raise ValidationFailure
            with pytest.raises(ValidationFailure, match="Constitutional validation failed"):
                generator.generate_app(
                    "payments", "minimal", project_root, validate=True, force=False
                )

            # Verify app was created (validation happens after move)
            assert (project_root / "src" / "payments").exists()

    def test_generate_app_with_validation_failing_with_force(self, tmp_path):
        """Test app generation with validation failing but --force flag set."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Create mock check_policy.py
        check_policy = project_root / "check_policy.py"
        check_policy.touch()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Mock subprocess returning failure
        mock_report = {
            "passed": False,
            "violations": [
                {
                    "file": "models.py",
                    "line": 10,
                    "rule": "B03-001",
                    "message": "Missing CSRF",
                }
            ],
            "warnings": [],
        }

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1, stdout=json.dumps(mock_report), stderr=""
            )

            # Should succeed with force=True
            generator.generate_app(
                "payments", "minimal", project_root, validate=True, force=True
            )

            # Verify app created
            assert (project_root / "src" / "payments").exists()

    def test_generate_app_with_no_validate_flag(self, tmp_path):
        """Test app generation with --no-validate flag skips validation."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # No check_policy.py needed
        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Should succeed without validation
        generator.generate_app(
            "payments", "minimal", project_root, validate=False, force=False
        )

        # Verify app created
        assert (project_root / "src" / "payments").exists()

    def test_generate_app_missing_check_policy(self, tmp_path):
        """Test app generation when check_policy.py is missing."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # No check_policy.py
        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Should succeed with warning (validation skipped)
        generator.generate_app(
            "payments", "minimal", project_root, validate=True, force=False
        )

        # Verify app created
        assert (project_root / "src" / "payments").exists()

    def test_validation_timeout_handling(self, tmp_path):
        """Test validation timeout is handled gracefully."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Create mock check_policy.py
        check_policy = project_root / "check_policy.py"
        check_policy.touch()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Mock subprocess timeout
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired("cmd", 60)

            # Should raise TimeoutError
            with pytest.raises(TimeoutError, match="timed out"):
                generator.generate_app(
                    "payments", "minimal", project_root, validate=True, force=False
                )


class TestFlagBehavior:
    """Test --validate and --force flag combinations."""

    def test_validate_true_force_false_fail(self, tmp_path):
        """Test validate=True, force=False with failure → raises ValidationFailure."""
        # Already covered in test_generate_app_with_validation_failing_no_force
        pass

    def test_validate_true_force_true_fail(self, tmp_path):
        """Test validate=True, force=True with failure → succeeds with warning."""
        # Already covered in test_generate_app_with_validation_failing_with_force
        pass

    def test_validate_false_any_force(self, tmp_path):
        """Test validate=False skips validation regardless of force flag."""
        # Already covered in test_generate_app_with_no_validate_flag
        pass
