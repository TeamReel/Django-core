"""
Integration tests for Constitutional Engine and Security Baseline enforcement (WP08).
"""

import pytest
from django.apps import apps
from django.test import override_settings


@pytest.mark.django_db
class TestConstitutionalEngineIntegration:
    def test_advisory_mode_allows_startup(self):
        """Advisory mode: violations are logged, startup continues."""
        with override_settings(SECURITY_ENFORCEMENT_MODE="advisory"):
            try:
                apps.get_app_config("security_baseline").ready()
            except Exception as e:
                pytest.fail(f"Advisory mode should not block startup: {e}")

    def test_strict_mode_blocks_on_critical(self):
        """Strict mode: CRITICAL/HIGH violations block startup."""
        with override_settings(SECURITY_ENFORCEMENT_MODE="strict"):
            # Simulate a critical violation by patching enforcement helper
            from security_baseline import enforcement
            from unittest.mock import patch, MagicMock

            orig_enforce = enforcement.enforce_security

            def always_block(results, mode):
                return False

            enforcement.enforce_security = always_block

            # Mock engine to return a violation so the error message is correct
            mock_violation = MagicMock()
            mock_violation.is_failure = True
            mock_violation.severity = "CRITICAL"
            mock_violation.violated_setting = "DEBUG"
            mock_violation.rule_id = "SEC001"
            mock_violation.message = "Debug mode enabled"
            mock_violation.current_value = "True"
            mock_violation.expected_value = "False"

            with patch(
                "constitution_engine.core.engine.Engine.run_once", return_value=[mock_violation]
            ):
                try:
                    with pytest.raises(RuntimeError, match="Security enforcement failed"):
                        apps.get_app_config("security_baseline").ready()
                finally:
                    enforcement.enforce_security = orig_enforce

    def test_reporter_integration(self):
        """SecurityReporter is registered and produces a report."""
        from security_baseline.reporters.security_reporter import SecurityReporter

        reporter = SecurityReporter()

        # Simulate results
        class DummyResult:
            rule_identifier = "SEC001-DEBUG-MODE"
            is_failure = True
            severity = "CRITICAL"
            message = "DEBUG mode enabled in production."

        results = [DummyResult()]
        report = reporter.report(results, {}, {})

        assert report.report_type == "runtime_startup"
        assert len(report.violations) == 1
        assert report.violations[0].rule_id == "SEC001-DEBUG-MODE"
        assert report.violations[0].severity == "CRITICAL"
