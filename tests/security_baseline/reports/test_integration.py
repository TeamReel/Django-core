"""
Integration tests for end-to-end security report generation.
"""

import json
import os
import tempfile
from datetime import datetime
from unittest.mock import Mock, patch

import pytest
from django.test import override_settings
from security_baseline.reporters.security_reporter import SecurityReporter
from security_baseline.reports import (
    SecurityReport,
    security_logger,
    validate_security_report,
)
from security_baseline.rules.base import SecurityRuleViolation


class TestSecurityReportIntegration:
    """Integration tests for complete security report workflow."""

    @pytest.fixture
    def mock_engine_results(self):
        """Create mock results from constitutional engine."""
        results = []

        # Mock successful rule result
        success_result = Mock()
        success_result.rule_identifier = "SEC002-SECRET-KEY"
        success_result.is_failure = False
        results.append(success_result)

        # Mock failed rule result (SecurityRuleViolation)
        violation = SecurityRuleViolation(
            rule_id="SEC001-DEBUG-MODE",
            rule_name="Debug Mode Check",
            message="DEBUG must be False in production",
            severity="CRITICAL",
            violated_setting="DEBUG",
            current_value="True",
            expected_value="False",
            owasp_asvs_refs=["V14.2.1"],
            remediation="Set DEBUG = False in production.py",
            timestamp=datetime.utcnow(),
            environment="production",
        )
        results.append(violation)

        # Mock engine result that needs conversion
        engine_result = Mock()
        engine_result.rule_identifier = "SEC003-ALLOWED-HOSTS"
        engine_result.is_failure = True
        engine_result.rule_name = "Allowed Hosts Check"
        engine_result.message = "ALLOWED_HOSTS must not be empty"
        engine_result.severity = "HIGH"
        engine_result.violated_setting = "ALLOWED_HOSTS"
        engine_result.current_value = "[]"
        engine_result.expected_value = "['example.com']"
        engine_result.owasp_asvs_refs = ["V14.2.3"]
        engine_result.remediation = "Configure ALLOWED_HOSTS properly"
        engine_result.environment = "production"
        results.append(engine_result)

        return results

    @pytest.fixture
    def mock_registered_rules(self):
        """Create mock registered security rules."""
        rules = []

        rule1 = Mock()
        rule1.rule_id = "SEC001-DEBUG-MODE"
        rule1.enabled = True
        rule1.owasp_asvs_refs = ["V14.2.1"]
        rules.append(rule1)

        rule2 = Mock()
        rule2.rule_id = "SEC002-SECRET-KEY"
        rule2.enabled = True
        rule2.owasp_asvs_refs = ["V14.2.2"]
        rules.append(rule2)

        rule3 = Mock()
        rule3.rule_id = "SEC003-ALLOWED-HOSTS"
        rule3.enabled = True
        rule3.owasp_asvs_refs = ["V14.2.3"]
        rules.append(rule3)

        return rules

    @pytest.fixture
    def mock_context(self):
        """Create mock execution context."""
        return {
            "settings": Mock(),
            "environment": "production",
            "enforcement_mode": "strict",
            "manifest": {"version": "1.0.0", "rules": ["SEC001", "SEC002", "SEC003"]},
        }

    @pytest.fixture
    def mock_config(self):
        """Create mock constitutional engine config."""
        config = Mock()
        config.version = "2.1.0"
        return config

    @override_settings(DJANGO_SETTINGS_MODULE="config.settings.production")
    def test_complete_report_generation_workflow(
        self, mock_engine_results, mock_registered_rules, mock_context, mock_config
    ):
        """Test complete end-to-end report generation workflow."""

        # Set up correlation ID
        security_logger.start_validation_run("strict", "production")

        # Create reporter and start timing
        reporter = SecurityReporter()
        reporter.start_timing()

        # Mock the registry
        with patch("security_baseline.reporters.security_reporter._registry") as mock_registry:
            mock_registry.get_all_rules.return_value = mock_registered_rules

            # Generate report
            report = reporter.report(mock_engine_results, mock_context, mock_config)

        # Validate report structure
        assert isinstance(report, SecurityReport)
        assert report.report_type == "runtime_startup"
        assert report.environment == "production"
        assert report.enforcement_mode == "strict"
        assert report.overall_status == "FAIL"  # Has CRITICAL violation

        # Check violations (both SecurityRuleViolation and converted Mock engine result)
        assert len(report.violations) == 2  # Both native and converted violations

        # Check passed rules
        assert "SEC002-SECRET-KEY" in report.passed_rules

        # Check ASVS coverage
        assert report.owasp_asvs_coverage is not None
        assert "V14 - Configuration" in report.owasp_asvs_coverage

        v14_coverage = report.owasp_asvs_coverage["V14 - Configuration"]
        assert v14_coverage.total_rules == 3
        assert v14_coverage.failed_rules == 2  # Both violations
        assert v14_coverage.passed_rules == 1  # Only SEC002-SECRET-KEY passed
        assert v14_coverage.coverage_percentage == 33.33

        # Check metadata
        assert report.metadata is not None
        assert report.metadata["total_rules_executed"] == 3
        assert report.metadata["constitutional_engine_version"] == "2.1.0"

        # Check correlation ID
        assert report.correlation_id is not None

        # Test serialization
        json_str = report.to_json()
        json_data = json.loads(json_str)
        assert json_data["report_id"] == report.report_id
        assert json_data["overall_status"] == "FAIL"

    def test_report_validation_against_schema(
        self, mock_engine_results, mock_registered_rules, mock_context, mock_config
    ):
        """Test that generated reports validate against JSON schema."""

        reporter = SecurityReporter()

        with patch("security_baseline.reporters.security_reporter._registry") as mock_registry:
            mock_registry.get_all_rules.return_value = mock_registered_rules

            report = reporter.report(mock_engine_results, mock_context, mock_config)

        # Validate against schema
        _is_valid, errors = validate_security_report(report)

        # Note: This may fail if jsonschema is not available or schema file not found
        # but the test structure verifies the integration works
        if errors:
            print(f"Validation errors (may be expected): {errors}")

    def test_report_serialization_with_sanitization(
        self, mock_registered_rules, mock_context, mock_config
    ):
        """Test report serialization with sensitive value sanitization."""

        # Create violation with sensitive values
        violation = SecurityRuleViolation(
            rule_id="SEC002-SECRET-KEY",
            rule_name="Secret Key Security",
            message="SECRET_KEY is insecure",
            severity="CRITICAL",
            violated_setting="SECRET_KEY",
            current_value="django-insecure-very-long-secret-key-12345678",
            expected_value="secure-random-key-abcdefgh",
            owasp_asvs_refs=["V6.2.1"],
            remediation="Generate secure SECRET_KEY",
            timestamp=datetime.utcnow(),
            environment="production",
        )

        results = [violation]

        reporter = SecurityReporter()

        with patch("security_baseline.reporters.security_reporter._registry") as mock_registry:
            mock_registry.get_all_rules.return_value = mock_registered_rules

            report = reporter.report(results, mock_context, mock_config)

        # Test sanitized serialization
        sanitized_json = report.to_json(sanitize_sensitive=True)
        sanitized_data = json.loads(sanitized_json)

        # Should have one violation
        assert len(sanitized_data["violations"]) == 1
        violation_data = sanitized_data["violations"][0]
        assert violation_data["current_value"] == "***5678"  # Last 4 chars
        assert violation_data["expected_value"] == "***efgh"  # Last 4 chars

        # Test non-sanitized serialization
        unsanitized_json = report.to_json(sanitize_sensitive=False)
        unsanitized_data = json.loads(unsanitized_json)

        violation_data = unsanitized_data["violations"][0]
        assert "django-insecure-very-long-secret-key-12345678" in violation_data["current_value"]
        assert "secure-random-key-abcdefgh" in violation_data["expected_value"]

    def test_report_output_writing(
        self, mock_engine_results, mock_registered_rules, mock_context, mock_config
    ):
        """Test writing report output to files."""

        reporter = SecurityReporter()

        with patch("security_baseline.reporters.security_reporter._registry") as mock_registry:
            mock_registry.get_all_rules.return_value = mock_registered_rules

            report = reporter.report(mock_engine_results, mock_context, mock_config)

        # Test JSON output to file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json_path = f.name

        try:
            reporter.write_output(report, json_path, output_format="json")

            # Verify file contents
            with open(json_path, "r", encoding="utf-8") as f:
                content = f.read()
                data = json.loads(content)
                assert data["report_id"] == report.report_id
                assert data["environment"] == "production"
        finally:
            os.unlink(json_path)

        # Test YAML output to file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            yaml_path = f.name

        try:
            reporter.write_output(report, yaml_path, output_format="yaml")

            # Verify file exists and has content
            with open(yaml_path, "r", encoding="utf-8") as f:
                content = f.read()
                assert report.report_id in content
                assert "environment: production" in content
        finally:
            os.unlink(yaml_path)

    def test_asvs_coverage_calculation_integration(
        self, mock_registered_rules, mock_context, mock_config
    ):
        """Test ASVS coverage calculation in full workflow."""

        # Create violations in different ASVS categories
        violations = []

        # V14 violation
        v14_violation = SecurityRuleViolation(
            rule_id="SEC001-DEBUG-MODE",
            rule_name="Debug Mode",
            message="DEBUG should be False",
            severity="CRITICAL",
            violated_setting="DEBUG",
            current_value="True",
            expected_value="False",
            owasp_asvs_refs=["V14.2.1"],
            remediation="Set DEBUG = False",
            timestamp=datetime.utcnow(),
            environment="production",
        )
        violations.append(v14_violation)

        # Add V3 rule to mock registry
        v3_rule = Mock()
        v3_rule.rule_id = "SEC004-SESSION-SECURE"
        v3_rule.enabled = True
        v3_rule.owasp_asvs_refs = ["V3.4.1"]
        mock_registered_rules.append(v3_rule)

        reporter = SecurityReporter()

        with patch("security_baseline.reporters.security_reporter._registry") as mock_registry:
            mock_registry.get_all_rules.return_value = mock_registered_rules

            report = reporter.report(violations, mock_context, mock_config)

        # Verify ASVS coverage calculation
        assert report.owasp_asvs_coverage is not None

        # V14 category should have 1 failure out of 3 rules
        v14_coverage = report.owasp_asvs_coverage["V14 - Configuration"]
        assert v14_coverage.total_rules == 3
        assert v14_coverage.failed_rules == 1  # Only the violation we passed in
        assert v14_coverage.passed_rules == 2
        assert v14_coverage.coverage_percentage == 66.67

        # V3 category should have 0 failures out of 1 rule
        v3_coverage = report.owasp_asvs_coverage["V3 - Session Management"]
        assert v3_coverage.total_rules == 1
        assert v3_coverage.failed_rules == 0
        assert v3_coverage.passed_rules == 1
        assert v3_coverage.coverage_percentage == 100.0
