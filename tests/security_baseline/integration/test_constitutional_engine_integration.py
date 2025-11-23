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

            orig_enforce = enforcement.enforce_security

            def always_block(results, mode):
                return False

            enforcement.enforce_security = always_block
            try:
                with pytest.raises(RuntimeError, match="blocking startup"):
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
        report = reporter.report(results, None, None)
        assert "Security Baseline Report" in report
        assert "SEC001-DEBUG-MODE" in report
        assert "CRITICAL" in report
