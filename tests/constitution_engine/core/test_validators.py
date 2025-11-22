"""
Unit tests for built-in validators.

Tests the DeduplicatorValidator and WorkflowConfigValidator.
"""

from pathlib import Path

import pytest

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)
from constitution_engine.modules.python.builtin.deduplicator import (
    DeduplicatorValidator,
)
from constitution_engine.modules.python.builtin.workflow_validator import (
    WorkflowConfigValidator,
)


class TestDeduplicatorValidator:
    """Tests for DeduplicatorValidator."""

    def test_no_duplicates(self):
        """Test when there are no duplicate results."""
        validator = DeduplicatorValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        results = [
            CheckResult(
                rule_identifier="rule1",
                status=CheckStatus.FAIL,
                message="Error 1",
                affected_paths=[Path("file1.py")],
                severity=Severity.ERROR,
                details={},
            ),
            CheckResult(
                rule_identifier="rule2",
                status=CheckStatus.FAIL,
                message="Error 2",
                affected_paths=[Path("file2.py")],
                severity=Severity.ERROR,
                details={},
            ),
        ]

        deduplicated = validator.validate(results, context, config)

        # All unique results should be preserved
        assert len(deduplicated) == 2
        assert deduplicated[0].message == "Error 1"
        assert deduplicated[1].message == "Error 2"

    def test_duplicate_removal(self):
        """Test removal of duplicate results."""
        validator = DeduplicatorValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        results = [
            CheckResult(
                rule_identifier="rule1",
                status=CheckStatus.FAIL,
                message="Duplicate error",
                affected_paths=[Path("file1.py")],
                severity=Severity.ERROR,
                details={},
            ),
            CheckResult(
                rule_identifier="rule1",
                status=CheckStatus.FAIL,
                message="Duplicate error",
                affected_paths=[Path("file1.py")],
                severity=Severity.ERROR,
                details={},
            ),
            CheckResult(
                rule_identifier="rule2",
                status=CheckStatus.FAIL,
                message="Unique error",
                affected_paths=[Path("file2.py")],
                severity=Severity.ERROR,
                details={},
            ),
        ]

        deduplicated = validator.validate(results, context, config)

        # Should keep only first occurrence of duplicate
        assert len(deduplicated) == 2
        assert deduplicated[0].message == "Duplicate error"
        assert deduplicated[1].message == "Unique error"

    def test_different_paths_not_duplicates(self):
        """Test that same error on different files is not considered duplicate."""
        validator = DeduplicatorValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        results = [
            CheckResult(
                rule_identifier="rule1",
                status=CheckStatus.FAIL,
                message="Missing type annotation",
                affected_paths=[Path("file1.py")],
                severity=Severity.ERROR,
                details={},
            ),
            CheckResult(
                rule_identifier="rule1",
                status=CheckStatus.FAIL,
                message="Missing type annotation",
                affected_paths=[Path("file2.py")],
                severity=Severity.ERROR,
                details={},
            ),
        ]

        deduplicated = validator.validate(results, context, config)

        # Should keep both because they affect different files
        assert len(deduplicated) == 2

    def test_empty_results(self):
        """Test with empty results list."""
        validator = DeduplicatorValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile()

        deduplicated = validator.validate([], context, config)

        assert len(deduplicated) == 0


class TestWorkflowConfigValidator:
    """Tests for WorkflowConfigValidator."""

    def test_valid_configuration(self):
        """Test with a valid configuration."""
        validator = WorkflowConfigValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile(
            enabled_rules=[
                "no-disabled-security-rules",
                "mypy-must-pass",
                "ruff-must-pass",
                "no-unpinned-production-dependencies",
            ]
        )

        results = validator.validate([], context, config)

        # Should have one PASS result
        assert len(results) == 1
        assert results[0].status == CheckStatus.PASS
        assert "valid" in results[0].message.lower()

    def test_missing_required_rules(self):
        """Test detection of missing required rules."""
        validator = WorkflowConfigValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile(
            enabled_rules=[
                "ruff-must-pass"
            ]  # Missing no-disabled-security-rules and mypy-must-pass
        )

        results = validator.validate([], context, config)

        # Should have at least one FAIL result for missing rule
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) >= 2
        assert any("no-disabled-security-rules" in r.message for r in failures)
        assert any("mypy-must-pass" in r.message for r in failures)

    def test_duplicate_rule_ids(self):
        """Test detection of duplicate rule IDs."""
        validator = WorkflowConfigValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile(
            enabled_rules=[
                "no-disabled-security-rules",
                "mypy-must-pass",
                "ruff-must-pass",
                "mypy-must-pass",  # Duplicate
            ]
        )

        results = validator.validate([], context, config)

        # Should have at least one FAIL result for duplicate
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) >= 1
        assert any("duplicate" in r.message.lower() for r in failures)

    def test_empty_enabled_rules(self):
        """Test with no enabled rules."""
        validator = WorkflowConfigValidator()
        context = RepositoryContext(root_path=Path("/tmp/test"))
        config = ConfigurationProfile(enabled_rules=[])

        results = validator.validate([], context, config)

        # Should have FAIL results for missing required rules
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) >= 3  # no-disabled-security-rules, mypy, ruff should be required
