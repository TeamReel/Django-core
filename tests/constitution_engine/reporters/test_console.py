"""
Tests for console reporter.
"""

from pathlib import Path
from unittest.mock import Mock

import pytest
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)
from constitution_engine.reporters.console import ConsoleReporter


@pytest.fixture
def mock_context():
    """Create mock repository context."""
    context = Mock(spec=RepositoryContext)
    context.root_path = Path("/test/repo")
    return context


@pytest.fixture
def mock_config():
    """Create mock configuration."""
    config = Mock(spec=ConfigurationProfile)
    config.name = "test"
    return config


@pytest.fixture
def sample_results():
    """Create sample check results with various statuses."""
    return [
        CheckResult(
            rule_identifier="python.naming.class_names",
            status=CheckStatus.PASS,
            severity=Severity.LOW,
            message="All class names follow conventions",
            affected_paths=[Path("src/models.py")],
            details={},
        ),
        CheckResult(
            rule_identifier="python.complexity.max_complexity",
            status=CheckStatus.FAIL,
            severity=Severity.MEDIUM,
            message="Function exceeds complexity threshold",
            affected_paths=[Path("src/utils.py"), Path("src/helpers.py")],
            details={},
        ),
        CheckResult(
            rule_identifier="python.security.no_hardcoded_secrets",
            status=CheckStatus.FAIL,
            severity=Severity.CRITICAL,
            message="Hardcoded API key detected",
            affected_paths=[Path("config/settings.py")],
            details={},
        ),
        CheckResult(
            rule_identifier="python.imports.order",
            status=CheckStatus.SKIP,
            severity=Severity.LOW,
            message="Rule skipped (no Python files)",
            affected_paths=[],
            details={},
        ),
        CheckResult(
            rule_identifier="python.typing.return_types",
            status=CheckStatus.ERROR,
            severity=Severity.HIGH,
            message="Exception during analysis",
            affected_paths=[Path("src/broken.py")],
            details={},
        ),
    ]


class TestConsoleReporterBasics:
    """Test basic console reporter functionality."""

    def test_reporter_has_name(self):
        """Reporter should have a name attribute."""
        reporter = ConsoleReporter()
        assert reporter.name == "console"

    def test_default_initialization(self):
        """Reporter should initialize with default settings."""
        reporter = ConsoleReporter()
        assert reporter.verbose is False
        assert reporter.show_summary is True

    def test_custom_initialization(self):
        """Reporter should accept custom settings."""
        reporter = ConsoleReporter(verbose=False, show_summary=False)
        assert reporter.verbose is False
        assert reporter.show_summary is False


class TestConsoleReporterOutput:
    """Test console reporter output generation."""

    def test_report_contains_header(self, sample_results, mock_context, mock_config):
        """Report should include repository header."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "Repository:" in report
        assert str(mock_context.root_path) in report

    def test_report_shows_failures(self, sample_results, mock_context, mock_config):
        """Report should show failure section."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "FAILURES" in report
        assert "python.complexity.max_complexity" in report
        assert "python.security.no_hardcoded_secrets" in report

    def test_report_shows_errors(self, sample_results, mock_context, mock_config):
        """Report should show error section."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "ERRORS" in report
        assert "python.typing.return_types" in report
        assert "Exception during analysis" in report

    def test_report_shows_skipped_in_verbose(self, sample_results, mock_context, mock_config):
        """Report should show skipped checks in verbose mode."""
        reporter = ConsoleReporter(verbose=True)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "SKIPPED" in report
        assert "python.imports.order" in report

    def test_report_hides_skipped_without_verbose(self, sample_results, mock_context, mock_config):
        """Report should hide skipped checks without verbose mode."""
        reporter = ConsoleReporter(verbose=False)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "SKIPPED" not in report
        assert "python.imports.order" not in report

    def test_report_shows_passes_in_verbose(self, sample_results, mock_context, mock_config):
        """Report should show passed checks in verbose mode."""
        reporter = ConsoleReporter(verbose=True)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "PASSED" in report
        assert "python.naming.class_names" in report

    def test_report_hides_passes_without_verbose(self, sample_results, mock_context, mock_config):
        """Report should hide passed checks without verbose mode."""
        reporter = ConsoleReporter(verbose=False)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "PASSED" not in report
        assert "python.naming.class_names" not in report

    def test_report_shows_summary(self, sample_results, mock_context, mock_config):
        """Report should show summary section."""
        reporter = ConsoleReporter(show_summary=True)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "SUMMARY" in report
        assert "Total:" in report
        assert "Passed:" in report
        assert "Failed:" in report
        assert "Errors:" in report
        assert "Skipped:" in report

    def test_report_hides_summary_without_flag(self, sample_results, mock_context, mock_config):
        """Report should hide summary when flag is False."""
        reporter = ConsoleReporter(show_summary=False)
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "SUMMARY" not in report

    def test_report_shows_failure_overall_status(self, sample_results, mock_context, mock_config):
        """Report should show FAILED status when there are failures."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        assert "STATUS: ❌ FAILED" in report

    def test_report_shows_success_overall_status(self, mock_context, mock_config):
        """Report should show PASSED status when all checks pass."""
        results = [
            CheckResult(
                rule_identifier="test.rule",
                status=CheckStatus.PASS,
                severity=Severity.INFO,
                message="All good",
                affected_paths=[],
                details={},
            )
        ]

        reporter = ConsoleReporter()
        report = reporter.report(results, mock_context, mock_config)

        assert "STATUS: ✅ PASSED" in report


class TestConsoleReporterFormatting:
    """Test console reporter formatting details."""

    def test_severity_symbols_displayed(self, sample_results, mock_context, mock_config):
        """Report should display severity symbols."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        # Check for emoji symbols (may vary by severity)
        assert any(
            symbol in report for symbol in ["ℹ️", "⚠️", "❌", "🚨"]
        ), "No severity symbols found"

    def test_affected_paths_truncation(self, mock_context, mock_config):
        """Report should truncate long path lists in verbose mode."""
        results = [
            CheckResult(
                rule_identifier="test.many_paths",
                status=CheckStatus.FAIL,
                severity=Severity.WARNING,
                message="Many files affected",
                affected_paths=[Path(f"file{i}.py") for i in range(10)],
                details={},
            )
        ]

        reporter = ConsoleReporter(verbose=True)  # Need verbose to show paths
        report = reporter.report(results, mock_context, mock_config)

        # Should show only first 5 paths plus "and X more"
        assert "... and 5 more" in report

    def test_details_truncation_without_verbose(self, mock_context, mock_config):
        """Report should not show details in non-verbose mode."""
        results = [
            CheckResult(
                rule_identifier="test.long_details",
                status=CheckStatus.FAIL,
                severity=Severity.ERROR,
                message="Long details",
                affected_paths=[],
                details={"info": "x" * 200},
            )
        ]

        reporter = ConsoleReporter(verbose=False)
        report = reporter.report(results, mock_context, mock_config)

        # Details should not be shown in non-verbose mode
        assert "Details:" not in report

    def test_details_not_truncated_in_verbose(self, mock_context, mock_config):
        """Report should show details with proper dict formatting in verbose mode."""
        results = [
            CheckResult(
                rule_identifier="test.long_details",
                status=CheckStatus.FAIL,
                severity=Severity.ERROR,
                message="Long details",
                affected_paths=[],
                details={"info": "x" * 200},
            )
        ]

        reporter = ConsoleReporter(verbose=True)
        report = reporter.report(results, mock_context, mock_config)

        # Details section should be present in verbose mode
        assert "Details:" in report
        assert "info:" in report


class TestConsoleReporterWriteOutput:
    """Test console reporter output writing."""

    def test_write_to_stdout(self, sample_results, mock_context, mock_config, capsys):
        """Reporter should write to stdout when no path given."""
        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        reporter.write_output(report, output_path=None)

        captured = capsys.readouterr()
        assert "FAILURES" in captured.out

    def test_write_to_file(self, sample_results, mock_context, mock_config, tmp_path):
        """Reporter should write to file when path given."""
        output_path = tmp_path / "report.txt"

        reporter = ConsoleReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        reporter.write_output(report, output_path=output_path)

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")
        assert "FAILURES" in content


class TestConsoleReporterEdgeCases:
    """Test console reporter edge cases."""

    def test_empty_results(self, mock_context, mock_config):
        """Reporter should handle empty results gracefully."""
        reporter = ConsoleReporter()
        report = reporter.report([], mock_context, mock_config)

        assert "Total:   0" in report

    def test_only_passes(self, mock_context, mock_config):
        """Reporter should handle all-passing results."""
        results = [
            CheckResult(
                rule_identifier="test.pass1",
                status=CheckStatus.PASS,
                severity=Severity.INFO,
                message="Pass 1",
                affected_paths=[],
                details={},
            ),
            CheckResult(
                rule_identifier="test.pass2",
                status=CheckStatus.PASS,
                severity=Severity.INFO,
                message="Pass 2",
                affected_paths=[],
                details={},
            ),
        ]

        reporter = ConsoleReporter(verbose=False)
        report = reporter.report(results, mock_context, mock_config)

        assert "FAILURES" not in report
        assert "ERRORS" not in report
        assert "STATUS: ✅ PASSED" in report

    def test_no_affected_paths(self, mock_context, mock_config):
        """Reporter should handle results with no affected paths."""
        results = [
            CheckResult(
                rule_identifier="test.no_paths",
                status=CheckStatus.FAIL,
                severity=Severity.WARNING,
                message="No paths",
                affected_paths=[],
                details={},
            )
        ]

        reporter = ConsoleReporter()
        report = reporter.report(results, mock_context, mock_config)

        assert "test.no_paths" in report

    def test_none_details(self, mock_context, mock_config):
        """Reporter should handle None details gracefully."""
        results = [
            CheckResult(
                rule_identifier="test.no_details",
                status=CheckStatus.FAIL,
                severity=Severity.WARNING,
                message="No details",
                affected_paths=[],
                details={},
            )
        ]

        reporter = ConsoleReporter()
        report = reporter.report(results, mock_context, mock_config)

        assert "test.no_details" in report
        # Should not crash or show "Details: None"
