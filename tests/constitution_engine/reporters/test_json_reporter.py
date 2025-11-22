"""
Tests for JSON reporter.
"""

import json
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
from constitution_engine.reporters.json_reporter import JsonReporter


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
    """Create sample check results."""
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
            details={"complexity": "15", "max_allowed": "10"},
        ),
    ]


class TestJsonReporterBasics:
    """Test basic JSON reporter functionality."""

    def test_reporter_has_name(self):
        """Reporter should have a name attribute."""
        reporter = JsonReporter()
        assert reporter.name == "json"

    def test_default_initialization(self):
        """Reporter should initialize with default settings."""
        reporter = JsonReporter()
        assert reporter.pretty is True
        assert reporter.include_metadata is True

    def test_custom_initialization(self):
        """Reporter should accept custom settings."""
        reporter = JsonReporter(pretty=False, include_metadata=False)
        assert reporter.pretty is False
        assert reporter.include_metadata is False


class TestJsonReporterSchema:
    """Test JSON reporter schema structure."""

    def test_report_is_valid_json(self, sample_results, mock_context, mock_config):
        """Report should be valid JSON."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)

        # Should not raise exception
        data = json.loads(report)
        assert isinstance(data, dict)

    def test_report_has_version(self, sample_results, mock_context, mock_config):
        """Report should include schema version."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "version" in data
        assert data["version"] == "1.0"

    def test_report_has_timestamp(self, sample_results, mock_context, mock_config):
        """Report should include ISO timestamp."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "timestamp" in data
        # Should be valid ISO format (contains T and Z)
        assert "T" in data["timestamp"]
        assert data["timestamp"].endswith("+00:00") or data["timestamp"].endswith("Z")

    def test_report_has_results_array(self, sample_results, mock_context, mock_config):
        """Report should include results array."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) == len(sample_results)

    def test_report_has_summary(self, sample_results, mock_context, mock_config):
        """Report should include summary object."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "summary" in data
        assert isinstance(data["summary"], dict)

    def test_report_includes_metadata_by_default(self, sample_results, mock_context, mock_config):
        """Report should include metadata by default."""
        reporter = JsonReporter(include_metadata=True)
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "metadata" in data

    def test_report_excludes_metadata_when_disabled(
        self, sample_results, mock_context, mock_config
    ):
        """Report should exclude metadata when disabled."""
        reporter = JsonReporter(include_metadata=False)
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "metadata" not in data


class TestJsonReporterResults:
    """Test JSON reporter result serialization."""

    def test_result_has_all_fields(self, sample_results, mock_context, mock_config):
        """Each result should have all required fields."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][0]
        assert "rule_identifier" in result
        assert "status" in result
        assert "severity" in result
        assert "message" in result
        assert "affected_paths" in result
        assert "details" in result

    def test_result_rule_identifier(self, sample_results, mock_context, mock_config):
        """Result should include correct rule identifier."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][0]
        assert result["rule_identifier"] == "python.naming.class_names"

    def test_result_status_value(self, sample_results, mock_context, mock_config):
        """Result should include status as string value."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][0]
        assert result["status"] == "pass"

        result2 = data["results"][1]
        assert result2["status"] == "fail"

    def test_result_severity_value(self, sample_results, mock_context, mock_config):
        """Result should include severity as string value."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][0]
        assert result["severity"] == "low"

        result2 = data["results"][1]
        assert result2["severity"] == "medium"

    def test_result_affected_paths_as_strings(self, sample_results, mock_context, mock_config):
        """Result should serialize paths as strings."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][1]
        assert isinstance(result["affected_paths"], list)
        assert all(isinstance(p, str) for p in result["affected_paths"])
        assert "src/utils.py" in result["affected_paths"]

    def test_result_details_preserved(self, sample_results, mock_context, mock_config):
        """Result should preserve details field."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][1]
        assert "complexity" in result["details"]
        assert result["details"]["complexity"] == "15"

    def test_result_none_details(self, mock_context, mock_config):
        """Result should handle empty details dict."""
        results = [
            CheckResult(
                rule_identifier="test.no_details",
                status=CheckStatus.FAIL,
                severity=Severity.MEDIUM,
                message="No details",
                affected_paths=[],
                details={},
            )
        ]

        reporter = JsonReporter()
        report = reporter.report(results, mock_context, mock_config)
        data = json.loads(report)

        result = data["results"][0]
        assert result["details"] == {}


class TestJsonReporterSummary:
    """Test JSON reporter summary generation."""

    def test_summary_has_total(self, sample_results, mock_context, mock_config):
        """Summary should include total count."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["total"] == 2

    def test_summary_has_passed(self, sample_results, mock_context, mock_config):
        """Summary should include passed count."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["passed"] == 1

    def test_summary_has_failed(self, sample_results, mock_context, mock_config):
        """Summary should include failed count."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["failed"] == 1

    def test_summary_has_errors(self, sample_results, mock_context, mock_config):
        """Summary should include errors count."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["errors"] == 0

    def test_summary_has_skipped(self, sample_results, mock_context, mock_config):
        """Summary should include skipped count."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["skipped"] == 0

    def test_summary_success_false_with_failures(self, sample_results, mock_context, mock_config):
        """Summary should mark success=false when there are failures."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["success"] is False

    def test_summary_success_true_without_failures(self, mock_context, mock_config):
        """Summary should mark success=true when no failures/errors."""
        results = [
            CheckResult(
                rule_identifier="test.pass",
                status=CheckStatus.PASS,
                severity=Severity.LOW,
                message="Pass",
                affected_paths=[],
                details={},
            )
        ]

        reporter = JsonReporter()
        report = reporter.report(results, mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["success"] is True


class TestJsonReporterMetadata:
    """Test JSON reporter metadata generation."""

    def test_metadata_has_repository(self, sample_results, mock_context, mock_config):
        """Metadata should include repository info."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "repository" in data["metadata"]
        assert "root_path" in data["metadata"]["repository"]

    def test_metadata_repository_root_path(self, sample_results, mock_context, mock_config):
        """Metadata should include repository root path."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert data["metadata"]["repository"]["root_path"] == "/test/repo"

    def test_metadata_includes_git_when_available(self, sample_results, mock_context, mock_config):
        """Metadata should include git info when available."""
        # Add git metadata to context
        git_meta = Mock()
        git_meta.current_branch = "main"
        git_meta.current_commit = "abc123"
        mock_context.git_metadata = git_meta

        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "git" in data["metadata"]
        assert data["metadata"]["git"]["branch"] == "main"
        assert data["metadata"]["git"]["commit"] == "abc123"

    def test_metadata_includes_languages_when_available(
        self, sample_results, mock_context, mock_config
    ):
        """Metadata should include language info when available."""
        mock_context.languages = {"python": Mock(), "javascript": Mock()}

        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        data = json.loads(report)

        assert "languages" in data["metadata"]
        assert "python" in data["metadata"]["languages"]
        assert "javascript" in data["metadata"]["languages"]


class TestJsonReporterFormatting:
    """Test JSON reporter formatting options."""

    def test_pretty_formatting(self, sample_results, mock_context, mock_config):
        """Report should be pretty-printed when enabled."""
        reporter = JsonReporter(pretty=True)
        report = reporter.report(sample_results, mock_context, mock_config)

        # Pretty JSON should have newlines and indentation
        assert "\n" in report
        assert "  " in report

    def test_compact_formatting(self, sample_results, mock_context, mock_config):
        """Report should be compact when pretty is disabled."""
        reporter = JsonReporter(pretty=False)
        report = reporter.report(sample_results, mock_context, mock_config)

        # Compact JSON should be single line (or at least minimal whitespace)
        # Count newlines - should be 0 or very few
        assert report.count("\n") == 0

    def test_pretty_output_is_parseable(self, sample_results, mock_context, mock_config):
        """Pretty output should still be valid JSON."""
        reporter = JsonReporter(pretty=True)
        report = reporter.report(sample_results, mock_context, mock_config)

        # Should not raise
        data = json.loads(report)
        assert data["version"] == "1.0"

    def test_compact_output_is_parseable(self, sample_results, mock_context, mock_config):
        """Compact output should be valid JSON."""
        reporter = JsonReporter(pretty=False)
        report = reporter.report(sample_results, mock_context, mock_config)

        # Should not raise
        data = json.loads(report)
        assert data["version"] == "1.0"


class TestJsonReporterWriteOutput:
    """Test JSON reporter output writing."""

    def test_write_to_stdout(self, sample_results, mock_context, mock_config, capsys):
        """Reporter should write to stdout when no path given."""
        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        reporter.write_output(report, output_path=None)

        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["version"] == "1.0"

    def test_write_to_file(self, sample_results, mock_context, mock_config, tmp_path):
        """Reporter should write to file when path given."""
        output_path = tmp_path / "report.json"

        reporter = JsonReporter()
        report = reporter.report(sample_results, mock_context, mock_config)
        reporter.write_output(report, output_path=output_path)

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")
        data = json.loads(content)
        assert data["version"] == "1.0"


class TestJsonReporterEdgeCases:
    """Test JSON reporter edge cases."""

    def test_empty_results(self, mock_context, mock_config):
        """Reporter should handle empty results."""
        reporter = JsonReporter()
        report = reporter.report([], mock_context, mock_config)
        data = json.loads(report)

        assert data["summary"]["total"] == 0
        assert len(data["results"]) == 0

    def test_large_result_set(self, mock_context, mock_config):
        """Reporter should handle large result sets."""
        results = [
            CheckResult(
                rule_identifier=f"test.rule{i}",
                status=CheckStatus.PASS,
                severity=Severity.LOW,
                message=f"Message {i}",
                affected_paths=[],
                details={},
            )
            for i in range(1000)
        ]

        reporter = JsonReporter()
        report = reporter.report(results, mock_context, mock_config)
        data = json.loads(report)

        assert len(data["results"]) == 1000
        assert data["summary"]["total"] == 1000

    def test_special_characters_in_message(self, mock_context, mock_config):
        """Reporter should handle special characters in messages."""
        results = [
            CheckResult(
                rule_identifier="test.special",
                status=CheckStatus.FAIL,
                severity=Severity.MEDIUM,
                message='Message with "quotes" and \\backslashes\\',
                affected_paths=[],
                details={},
            )
        ]

        reporter = JsonReporter()
        report = reporter.report(results, mock_context, mock_config)
        data = json.loads(report)

        assert data["results"][0]["message"] == 'Message with "quotes" and \\backslashes\\'

    def test_unicode_in_paths(self, mock_context, mock_config):
        """Reporter should handle unicode in paths."""
        results = [
            CheckResult(
                rule_identifier="test.unicode",
                status=CheckStatus.FAIL,
                severity=Severity.MEDIUM,
                message="Unicode path",
                affected_paths=[Path("src/mödule.py"), Path("src/测试.py")],
                details={},
            )
        ]

        reporter = JsonReporter()
        report = reporter.report(results, mock_context, mock_config)
        data = json.loads(report)

        assert "src/mödule.py" in data["results"][0]["affected_paths"]
        assert "src/测试.py" in data["results"][0]["affected_paths"]
