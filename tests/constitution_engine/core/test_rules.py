"""
Unit tests for built-in rules.

Tests the MypyRule, RuffRule, and PinnedDependenciesRule.
"""

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

from constitution_engine.core.models import (
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
)
from constitution_engine.modules.python.builtin.mypy_rule import MypyRule
from constitution_engine.modules.python.builtin.pinned_dependencies_rule import (
    PinnedDependenciesRule,
)
from constitution_engine.modules.python.builtin.ruff_rule import RuffRule


class TestMypyRule:
    """Tests for MypyRule."""

    def test_mypy_not_available(self):
        """Test when mypy is not installed."""
        rule = MypyRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()

            results = rule.execute(context, config)

            assert len(results) == 1
            assert results[0].rule_identifier == "mypy-must-pass"
            assert results[0].status == CheckStatus.SKIP
            assert "not installed" in results[0].message.lower()

    def test_mypy_passes(self):
        """Test when mypy checking passes."""
        rule = MypyRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            # First call: mypy --version (success)
            # Second call: mypy check (success)
            mock_run.side_effect = [
                MagicMock(returncode=0),  # version check
                MagicMock(returncode=0, stdout="", stderr=""),  # mypy check
            ]

            results = rule.execute(context, config)

            assert len(results) == 1
            assert results[0].rule_identifier == "mypy-must-pass"
            assert results[0].status == CheckStatus.PASS
            assert "passed" in results[0].message.lower()

    def test_mypy_fails(self):
        """Test when mypy checking fails."""
        rule = MypyRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(returncode=0),  # version check
                MagicMock(
                    returncode=1,
                    stdout="test.py:1: error: Missing type annotation\n",
                    stderr="",
                ),
            ]

            results = rule.execute(context, config)

            assert len(results) >= 1
            assert results[0].rule_identifier == "mypy-must-pass"
            assert results[0].status == CheckStatus.FAIL
            assert "error" in results[0].message.lower()

    def test_mypy_timeout(self):
        """Test when mypy times out."""
        rule = MypyRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(returncode=0),  # version check
                subprocess.TimeoutExpired("mypy", 60),
            ]

            results = rule.execute(context, config)

            assert len(results) == 1
            assert results[0].status == CheckStatus.ERROR
            assert "timed out" in results[0].message.lower()


class TestRuffRule:
    """Tests for RuffRule."""

    def test_ruff_not_available(self):
        """Test when Ruff is not installed."""
        rule = RuffRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()

            results = rule.execute(context, config)

            assert len(results) == 1
            assert results[0].rule_identifier == "ruff-must-pass"
            assert results[0].status == CheckStatus.SKIP
            assert "not installed" in results[0].message.lower()

    def test_ruff_passes(self):
        """Test when Ruff linting passes."""
        rule = RuffRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(returncode=0),  # version check
                MagicMock(returncode=0, stdout="", stderr=""),  # ruff check
            ]

            results = rule.execute(context, config)

            assert len(results) == 1
            assert results[0].rule_identifier == "ruff-must-pass"
            assert results[0].status == CheckStatus.PASS
            assert "passed" in results[0].message.lower()

    def test_ruff_fails(self):
        """Test when Ruff linting fails."""
        rule = RuffRule()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(returncode=0),  # version check
                MagicMock(
                    returncode=1,
                    stdout="test.py:1:1: E501 Line too long\n",
                    stderr="",
                ),
            ]

            results = rule.execute(context, config)

            assert len(results) >= 1
            assert results[0].rule_identifier == "ruff-must-pass"
            assert results[0].status == CheckStatus.FAIL


class TestPinnedDependenciesRule:
    """Tests for PinnedDependenciesRule."""

    def test_no_dependency_files(self, tmp_path):
        """Test when no dependency files are found."""
        rule = PinnedDependenciesRule()
        context = RepositoryContext(root_path=tmp_path)
        config = ConfigurationProfile()

        results = rule.execute(context, config)

        assert len(results) == 1
        assert results[0].status == CheckStatus.SKIP
        assert "no dependency files" in results[0].message.lower()

    def test_requirements_all_pinned(self, tmp_path):
        """Test when all requirements are properly pinned."""
        rule = PinnedDependenciesRule()

        # Create a requirements file with pinned dependencies
        req_file = tmp_path / "requirements.txt"
        req_file.write_text("django==4.2.0\npsycopg2-binary==2.9.5\n")

        context = RepositoryContext(root_path=tmp_path)
        config = ConfigurationProfile()

        results = rule.execute(context, config)

        # Should have no failures for pinned deps
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) == 0

    def test_requirements_unpinned_detected(self, tmp_path):
        """Test detection of unpinned dependencies."""
        rule = PinnedDependenciesRule()

        # Create a requirements file with unpinned dependency
        req_file = tmp_path / "requirements.txt"
        req_file.write_text("django==4.2.0\nrequests\npsycopg2-binary>=2.9.0\n")

        context = RepositoryContext(root_path=tmp_path)
        config = ConfigurationProfile()

        results = rule.execute(context, config)

        # Should detect 'requests' as unpinned
        unpinned_results = [
            r for r in results if r.status == CheckStatus.FAIL and "requests" in r.message
        ]
        assert len(unpinned_results) == 1
        assert "unpinned" in unpinned_results[0].message.lower()

    def test_pyproject_toml_unpinned(self, tmp_path):
        """Test detection of unpinned dependencies in pyproject.toml."""
        rule = PinnedDependenciesRule()

        # Create a pyproject.toml with unpinned dependency
        pyproject = tmp_path / "pyproject.toml"
        pyproject.write_text(
            "[project.dependencies]\n" 'django = "4.2.0"\n' 'requests = "*"\n' 'celery = "^5.0"\n'
        )

        context = RepositoryContext(root_path=tmp_path)
        config = ConfigurationProfile()

        results = rule.execute(context, config)

        # Should detect unpinned dependencies
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) >= 1

    def test_comments_and_empty_lines_ignored(self, tmp_path):
        """Test that comments and empty lines are properly ignored."""
        rule = PinnedDependenciesRule()

        req_file = tmp_path / "requirements.txt"
        req_file.write_text(
            "# This is a comment\n"
            "\n"
            "django==4.2.0\n"
            "# Another comment\n"
            "\n"
            "requests==2.28.0\n"
        )

        context = RepositoryContext(root_path=tmp_path)
        config = ConfigurationProfile()

        results = rule.execute(context, config)

        # Should have no failures - all real deps are pinned
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) == 0
