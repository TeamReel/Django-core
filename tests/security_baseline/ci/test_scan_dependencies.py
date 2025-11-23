"""Tests for dependency vulnerability scanner (WP10)

Tests scan_dependencies.py with fixture vulnerable requirements
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import yaml

# Add .security/scripts to path for imports (must be before scan_dependencies import)
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / ".security" / "scripts"))

import scan_dependencies  # noqa: E402


@pytest.fixture
def temp_manifest(tmp_path):
    """Create temporary pip-audit manifest."""
    manifest = {
        "version": "1.0",
        "severity_thresholds": {"block_on": ["CRITICAL", "HIGH"], "warn_on": ["MEDIUM"]},
        "timeout_seconds": 300,
        "exemptions": [],
    }
    manifest_path = tmp_path / "pip-audit.yaml"
    with open(manifest_path, "w", encoding="utf-8") as f:
        yaml.dump(manifest, f)
    return manifest_path


@pytest.fixture
def vulnerable_requirements(tmp_path):
    """Create requirements.txt with known vulnerable packages for testing."""
    requirements = tmp_path / "requirements.txt"
    # Using intentionally old versions with known CVEs for testing
    requirements.write_text(
        "django==2.2.0\n"  # Old version with known vulnerabilities
        "requests==2.6.0\n"  # Old version with SSL verification issues
        "pillow==6.0.0\n"  # Old version with known CVEs
    )
    return requirements


@pytest.fixture
def mock_pip_audit_output():
    """Mock pip-audit JSON output with vulnerabilities."""
    return {
        "version": "2.6.0",
        "dependencies": [
            {
                "name": "django",
                "version": "2.2.0",
                "vulns": [
                    {
                        "id": "CVE-2023-43665",
                        "fix_versions": ["3.2.22", "4.1.12", "4.2.6"],
                        "severity": "HIGH",
                        "description": "SQL injection vulnerability",
                        "advisory": "https://github.com/advisories/GHSA-qmf7-8qvw-g5w9",
                    }
                ],
            },
            {
                "name": "requests",
                "version": "2.6.0",
                "vulns": [
                    {
                        "id": "CVE-2015-2296",
                        "fix_versions": ["2.6.1"],
                        "severity": "CRITICAL",
                        "description": "Cookie injection attack",
                        "advisory": "https://github.com/advisories/GHSA-x84v-xcm2-53pg",
                    }
                ],
            },
            {
                "name": "pillow",
                "version": "6.0.0",
                "vulns": [
                    {
                        "id": "CVE-2020-10378",
                        "fix_versions": ["6.2.2"],
                        "severity": "MEDIUM",
                        "description": "Buffer overflow in image processing",
                        "advisory": "https://github.com/advisories/GHSA-qqjq-qw5q-qj5q",
                    }
                ],
            },
        ],
    }


class TestManifestLoading:
    """Test manifest loading and parsing."""

    def test_load_manifest_success(self, temp_manifest):
        """Test successful manifest loading."""
        manifest = scan_dependencies.load_manifest(temp_manifest)
        assert manifest["version"] == "1.0"
        assert "severity_thresholds" in manifest
        assert manifest["timeout_seconds"] == 300

    def test_load_manifest_not_found(self, tmp_path):
        """Test manifest loading with non-existent file."""
        with pytest.raises(FileNotFoundError):
            scan_dependencies.load_manifest(tmp_path / "nonexistent.yaml")

    def test_load_manifest_invalid_yaml(self, tmp_path):
        """Test manifest loading with invalid YAML."""
        invalid_yaml = tmp_path / "invalid.yaml"
        invalid_yaml.write_text("{ invalid: yaml: content:")
        with pytest.raises(yaml.YAMLError):
            scan_dependencies.load_manifest(invalid_yaml)


class TestIncrementalScanning:
    """Test incremental scanning with git diff."""

    @patch("scan_dependencies.subprocess.run")
    def test_get_changed_requirements_success(self, mock_run):
        """Test successful git diff parsing."""
        mock_run.return_value = Mock(
            stdout="requirements/base.txt\nrequirements/production.txt\n", returncode=0
        )

        changed = scan_dependencies.get_changed_requirements("main")

        assert len(changed) == 2
        assert Path("requirements/base.txt") in changed
        assert Path("requirements/production.txt") in changed
        mock_run.assert_called_once()

    @patch("scan_dependencies.subprocess.run")
    def test_get_changed_requirements_no_changes(self, mock_run):
        """Test git diff with no changed requirements."""
        mock_run.return_value = Mock(stdout="", returncode=0)

        changed = scan_dependencies.get_changed_requirements("main")

        assert len(changed) == 0

    @patch("scan_dependencies.subprocess.run")
    def test_get_changed_requirements_git_error(self, mock_run):
        """Test git diff with error (not a git repo)."""
        mock_run.side_effect = subprocess.CalledProcessError(128, "git diff")

        changed = scan_dependencies.get_changed_requirements("main")

        assert len(changed) == 0  # Should return empty list on error


class TestExemptions:
    """Test vulnerability exemption mechanism."""

    def test_is_exempted_active_exemption(self):
        """Test exemption that is still valid."""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exemptions = [
            {
                "package": "django",
                "cve": "CVE-2023-12345",
                "justification": "Test exemption",
                "expires": future_date,
            }
        ]

        assert scan_dependencies.is_exempted("django", "CVE-2023-12345", exemptions)

    def test_is_exempted_expired_exemption(self):
        """Test exemption that has expired."""
        past_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        exemptions = [
            {
                "package": "django",
                "cve": "CVE-2023-12345",
                "justification": "Test exemption",
                "expires": past_date,
            }
        ]

        assert not scan_dependencies.is_exempted("django", "CVE-2023-12345", exemptions)

    def test_is_exempted_no_match(self):
        """Test exemption check with no matching exemption."""
        exemptions = [
            {
                "package": "requests",
                "cve": "CVE-2023-99999",
                "justification": "Different package",
                "expires": "2025-12-31",
            }
        ]

        assert not scan_dependencies.is_exempted("django", "CVE-2023-12345", exemptions)

    def test_is_exempted_invalid_date(self):
        """Test exemption with invalid expiration date format."""
        exemptions = [
            {
                "package": "django",
                "cve": "CVE-2023-12345",
                "justification": "Test exemption",
                "expires": "invalid-date",
            }
        ]

        assert not scan_dependencies.is_exempted("django", "CVE-2023-12345", exemptions)


class TestSeverityFiltering:
    """Test severity threshold filtering."""

    def test_filter_by_severity_blocking(self):
        """Test filtering with blocking vulnerabilities."""
        vulnerabilities = [
            {
                "name": "django",
                "id": "CVE-2023-001",
                "severity": "CRITICAL",
                "version": "2.2.0",
            },
            {"name": "requests", "id": "CVE-2023-002", "severity": "HIGH", "version": "2.6.0"},
            {"name": "pillow", "id": "CVE-2023-003", "severity": "MEDIUM", "version": "6.0.0"},
        ]
        severity_thresholds = {"block_on": ["CRITICAL", "HIGH"], "warn_on": ["MEDIUM"]}

        blocking, warning = scan_dependencies.filter_by_severity(
            vulnerabilities, severity_thresholds, []
        )

        assert len(blocking) == 2
        assert len(warning) == 1
        assert blocking[0]["severity"] == "CRITICAL"
        assert warning[0]["severity"] == "MEDIUM"

    def test_filter_by_severity_with_exemptions(self):
        """Test filtering with exempted vulnerabilities."""
        vulnerabilities = [
            {
                "name": "django",
                "id": "CVE-2023-001",
                "severity": "CRITICAL",
                "version": "2.2.0",
            },
            {"name": "requests", "id": "CVE-2023-002", "severity": "HIGH", "version": "2.6.0"},
        ]
        severity_thresholds = {"block_on": ["CRITICAL", "HIGH"], "warn_on": []}
        exemptions = [
            {
                "package": "django",
                "cve": "CVE-2023-001",
                "justification": "Test",
                "expires": "2025-12-31",
            }
        ]

        blocking, warning = scan_dependencies.filter_by_severity(
            vulnerabilities, severity_thresholds, exemptions
        )

        assert len(blocking) == 1  # Only requests, django is exempted
        assert blocking[0]["name"] == "requests"


class TestSecurityReportGeneration:
    """Test security report generation."""

    def test_generate_security_report_with_violations(self, mock_pip_audit_output):
        """Test report generation with vulnerabilities."""
        blocking_vulns = [
            {
                "name": "django",
                "id": "CVE-2023-001",
                "version": "2.2.0",
                "severity": "CRITICAL",
                "fix_versions": ["3.2.22"],
                "advisory": "https://example.com/advisory",
            }
        ]
        warning_vulns = [
            {
                "name": "pillow",
                "id": "CVE-2023-002",
                "version": "6.0.0",
                "severity": "MEDIUM",
                "fix_versions": ["6.2.2"],
                "advisory": "https://example.com/advisory",
            }
        ]

        report = scan_dependencies.generate_security_report(
            mock_pip_audit_output, blocking_vulns, warning_vulns, Path("requirements.txt")
        )

        assert report["report_type"] == "ci_dependency_scan"
        assert report["overall_status"] == "FAIL"  # Has blocking vulnerabilities
        assert len(report["violations"]) == 2
        assert report["metadata"]["blocking_vulnerabilities"] == 1
        assert report["metadata"]["warning_vulnerabilities"] == 1

    def test_generate_security_report_no_violations(self, mock_pip_audit_output):
        """Test report generation with no vulnerabilities."""
        report = scan_dependencies.generate_security_report(
            mock_pip_audit_output, [], [], Path("requirements.txt")
        )

        assert report["report_type"] == "ci_dependency_scan"
        assert report["overall_status"] == "PASS"
        assert len(report["violations"]) == 0
        assert report["owasp_asvs_coverage"]["V14 - Configuration"]["coverage_percentage"] == 100.0


class TestPipAuditExecution:
    """Test pip-audit execution and output parsing."""

    @patch("scan_dependencies.subprocess.run")
    def test_run_pip_audit_success(self, mock_run, mock_pip_audit_output):
        """Test successful pip-audit execution."""
        mock_run.return_value = Mock(
            stdout=json.dumps(mock_pip_audit_output), stderr="", returncode=1  # 1 = vulns found
        )

        result = scan_dependencies.run_pip_audit(Path("requirements.txt"))

        assert result is not None
        assert result["version"] == "2.6.0"
        assert len(result["dependencies"]) == 3

    @patch("scan_dependencies.subprocess.run")
    def test_run_pip_audit_no_vulnerabilities(self, mock_run):
        """Test pip-audit with no vulnerabilities found."""
        clean_output = {"version": "2.6.0", "dependencies": []}
        mock_run.return_value = Mock(
            stdout=json.dumps(clean_output), stderr="", returncode=0  # 0 = no vulns
        )

        result = scan_dependencies.run_pip_audit(Path("requirements.txt"))

        assert result is not None
        assert len(result["dependencies"]) == 0

    @patch("scan_dependencies.subprocess.run")
    def test_run_pip_audit_timeout(self, mock_run):
        """Test pip-audit timeout handling."""
        mock_run.side_effect = subprocess.TimeoutExpired("pip-audit", 300)

        with pytest.raises(subprocess.TimeoutExpired):
            scan_dependencies.run_pip_audit(Path("requirements.txt"), timeout=300)

    @patch("scan_dependencies.subprocess.run")
    def test_run_pip_audit_invalid_json(self, mock_run):
        """Test pip-audit with invalid JSON output."""
        mock_run.return_value = Mock(stdout="invalid json", stderr="", returncode=1)

        result = scan_dependencies.run_pip_audit(Path("requirements.txt"))

        assert result is None  # Should return None on parse error


class TestEndToEnd:
    """Integration tests for full scan workflow."""

    @patch("scan_dependencies.run_pip_audit")
    @patch("scan_dependencies.load_manifest")
    def test_main_with_blocking_vulnerabilities(
        self, mock_load_manifest, mock_run_pip_audit, temp_manifest, mock_pip_audit_output, capsys
    ):
        """Test main() with blocking vulnerabilities found."""
        mock_load_manifest.return_value = {
            "severity_thresholds": {"block_on": ["CRITICAL", "HIGH"], "warn_on": ["MEDIUM"]},
            "timeout_seconds": 300,
            "exemptions": [],
        }
        mock_run_pip_audit.return_value = mock_pip_audit_output

        # Simulate command-line arguments
        with patch(
            "sys.argv",
            [
                "scan_dependencies.py",
                "--manifest",
                str(temp_manifest),
                "--requirements",
                "requirements/base.txt",
            ],
        ):
            exit_code = scan_dependencies.main()

        assert exit_code == 1  # Should fail due to blocking vulnerabilities

        captured = capsys.readouterr()
        assert "BLOCKING VULNERABILITIES FOUND" in captured.out

    @patch("scan_dependencies.run_pip_audit")
    @patch("scan_dependencies.load_manifest")
    def test_main_with_warnings_only(
        self, mock_load_manifest, mock_run_pip_audit, temp_manifest, capsys
    ):
        """Test main() with only warning-level vulnerabilities."""
        mock_load_manifest.return_value = {
            "severity_thresholds": {"block_on": ["CRITICAL"], "warn_on": ["HIGH", "MEDIUM"]},
            "timeout_seconds": 300,
            "exemptions": [],
        }
        mock_run_pip_audit.return_value = {
            "version": "2.6.0",
            "dependencies": [
                {
                    "name": "pillow",
                    "version": "6.0.0",
                    "vulns": [
                        {
                            "id": "CVE-2020-001",
                            "severity": "MEDIUM",
                            "fix_versions": ["6.2.2"],
                            "advisory": "https://example.com",
                        }
                    ],
                }
            ],
        }

        with patch(
            "sys.argv",
            [
                "scan_dependencies.py",
                "--manifest",
                str(temp_manifest),
                "--requirements",
                "requirements/base.txt",
            ],
        ):
            exit_code = scan_dependencies.main()

        assert exit_code == 0  # Should not fail on warnings

        captured = capsys.readouterr()
        assert "WARNING: Medium severity vulnerabilities found" in captured.out
