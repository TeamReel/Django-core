"""
Unit tests for SecurityReport dataclass and serialization.
"""

import json
from datetime import datetime

import pytest
import yaml
from security_baseline.reports.security_report import ASVSCoverage, SecurityReport
from security_baseline.rules.base import SecurityRuleViolation


class TestSecurityReport:
    """Test SecurityReport dataclass functionality."""

    @pytest.fixture
    def sample_violation(self):
        """Create a sample security violation for testing."""
        return SecurityRuleViolation(
            rule_id="SEC001-DEBUG-MODE",
            rule_name="Debug Mode Disabled",
            message="DEBUG must be False in production",
            severity="CRITICAL",
            violated_setting="DEBUG",
            current_value="True",
            expected_value="False",
            owasp_asvs_refs=["V14.2.1"],
            remediation="Set DEBUG = False in production settings",
            timestamp=datetime(2025, 11, 23, 10, 30, 45),
            environment="production",
        )

    @pytest.fixture
    def sample_asvs_coverage(self):
        """Create sample ASVS coverage for testing."""
        return {
            "V14 - Configuration": ASVSCoverage(
                category="V14 - Configuration",
                total_rules=5,
                passed_rules=4,
                failed_rules=1,
                coverage_percentage=80.0,
                violations=[],
            )
        }

    def test_security_report_creation(self, sample_violation, sample_asvs_coverage):
        """Test SecurityReport creation with all fields."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime(2025, 11, 23, 10, 30, 45),
            environment="production",
            enforcement_mode="strict",
            violations=[sample_violation],
            passed_rules=["SEC002-SECRET-KEY", "SEC003-ALLOWED-HOSTS"],
            overall_status="FAIL",
            execution_time_ms=150,
            owasp_asvs_coverage=sample_asvs_coverage,
            metadata={"test": "data"},
        )

        assert report.report_id == "test-123"
        assert report.report_type == "runtime_startup"
        assert report.environment == "production"
        assert report.enforcement_mode == "strict"
        assert len(report.violations) == 1
        assert len(report.passed_rules) == 2
        assert report.overall_status == "FAIL"
        assert report.execution_time_ms == 150
        assert report.correlation_id is not None  # Auto-generated UUID

    def test_auto_correlation_id_generation(self):
        """Test that correlation_id is auto-generated if not provided."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="advisory",
            violations=[],
            passed_rules=[],
            overall_status="PASS",
            execution_time_ms=0,
        )

        assert report.correlation_id is not None
        assert len(report.correlation_id) == 36  # UUID format

    def test_overall_status_calculation_pass(self):
        """Test overall status calculation with no violations."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="strict",
            violations=[],
            passed_rules=["SEC001", "SEC002"],
            overall_status="",  # Will be calculated
            execution_time_ms=100,
        )

        assert report.overall_status == "PASS"

    def test_overall_status_calculation_fail_strict(self, sample_violation):
        """Test overall status calculation with CRITICAL violation in strict mode."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="production",
            enforcement_mode="strict",
            violations=[sample_violation],  # CRITICAL severity
            passed_rules=[],
            overall_status="",  # Will be calculated
            execution_time_ms=100,
        )

        assert report.overall_status == "FAIL"

    def test_overall_status_calculation_warn_advisory(self, sample_violation):
        """Test overall status calculation with violations in advisory mode."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="advisory",
            violations=[sample_violation],
            passed_rules=[],
            overall_status="",  # Will be calculated
            execution_time_ms=100,
        )

        assert report.overall_status == "WARN"

    def test_to_dict_basic(self, sample_violation):
        """Test conversion to dictionary."""
        timestamp = datetime(2025, 11, 23, 10, 30, 45)
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=timestamp,
            environment="local",
            enforcement_mode="strict",
            violations=[sample_violation],
            passed_rules=["SEC002"],
            overall_status="FAIL",
            execution_time_ms=150,
        )

        data = report.to_dict(sanitize_sensitive=False)

        assert data["report_id"] == "test-123"
        assert data["timestamp"] == timestamp.isoformat()
        assert data["environment"] == "local"
        assert len(data["violations"]) == 1
        assert len(data["passed_rules"]) == 1

    def test_sensitive_value_sanitization(self):
        """Test sanitization of sensitive values."""
        violation = SecurityRuleViolation(
            rule_id="SEC002-SECRET-KEY",
            rule_name="Secret Key Security",
            message="SECRET_KEY is insecure",
            severity="CRITICAL",
            violated_setting="SECRET_KEY",
            current_value="django-insecure-very-long-secret-key-value-1234",
            expected_value="secure-random-secret-key",
            owasp_asvs_refs=["V6.2.1"],
            remediation="Generate a secure SECRET_KEY",
            timestamp=datetime.utcnow(),
            environment="local",
        )

        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="strict",
            violations=[violation],
            passed_rules=[],
            overall_status="FAIL",
            execution_time_ms=100,
            metadata={"SECRET_KEY": "another-secret-value-5678"},  # noqa: S105
        )

        data = report.to_dict(sanitize_sensitive=True)

        # Check violation sanitization
        violation_data = data["violations"][0]
        assert violation_data["current_value"] == "***1234"  # Last 4 chars
        assert violation_data["expected_value"] == "***-key"  # Last 4 chars for longer values

        # Check metadata sanitization
        assert data["metadata"]["SECRET_KEY"] == "***5678"  # noqa: S105

    def test_json_serialization(self, sample_violation):
        """Test JSON serialization."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime(2025, 11, 23, 10, 30, 45),
            environment="local",
            enforcement_mode="strict",
            violations=[sample_violation],
            passed_rules=["SEC002"],
            overall_status="FAIL",
            execution_time_ms=150,
        )

        json_str = report.to_json(sanitize_sensitive=False)

        # Should be valid JSON
        data = json.loads(json_str)
        assert data["report_id"] == "test-123"
        assert data["environment"] == "local"

    def test_yaml_serialization(self, sample_violation):
        """Test YAML serialization."""
        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime(2025, 11, 23, 10, 30, 45),
            environment="local",
            enforcement_mode="strict",
            violations=[sample_violation],
            passed_rules=["SEC002"],
            overall_status="FAIL",
            execution_time_ms=150,
        )

        yaml_str = report.to_yaml(sanitize_sensitive=False)

        # Should be valid YAML
        data = yaml.safe_load(yaml_str)
        assert data["report_id"] == "test-123"
        assert data["environment"] == "local"

    def test_password_sanitization(self):
        """Test that passwords are properly masked."""
        violation = SecurityRuleViolation(
            rule_id="SEC999-PASSWORD",
            rule_name="Password Security",
            message="Weak password detected",
            severity="HIGH",
            violated_setting="DATABASE_PASSWORD",
            current_value="secret123password",
            expected_value="strong-password-here",
            owasp_asvs_refs=["V2.1.1"],
            remediation="Use a strong password",
            timestamp=datetime.utcnow(),
            environment="local",
        )

        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="strict",
            violations=[violation],
            passed_rules=[],
            overall_status="FAIL",
            execution_time_ms=100,
        )

        data = report.to_dict(sanitize_sensitive=True)
        violation_data = data["violations"][0]

        assert violation_data["current_value"] == "***MASKED***"
        assert violation_data["expected_value"] == "***MASKED***"

    def test_token_sanitization(self):
        """Test that API tokens are partially masked."""
        violation = SecurityRuleViolation(
            rule_id="SEC998-TOKEN",
            rule_name="API Token Security",
            message="Insecure API token",
            severity="MEDIUM",
            violated_setting="API_TOKEN",
            current_value="sk_live_1234567890",
            expected_value="sk_test_secure_token_placeholder_here",
            owasp_asvs_refs=["V2.3.1"],
            remediation="Use secure token management",
            timestamp=datetime.utcnow(),
            environment="local",
        )

        report = SecurityReport(
            report_id="test-123",
            report_type="runtime_startup",
            timestamp=datetime.utcnow(),
            environment="local",
            enforcement_mode="strict",
            violations=[violation],
            passed_rules=[],
            overall_status="FAIL",
            execution_time_ms=100,
        )

        data = report.to_dict(sanitize_sensitive=True)
        violation_data = data["violations"][0]

        # Should show first 4 and last 4 characters
        assert violation_data["current_value"] == "sk_l***7890"
        assert violation_data["expected_value"] == "sk_t***here"
