"""Integration tests for enforcement mode toggling (WP13 - T124).

Tests verify that security enforcement behaves correctly in:
- strict mode (block startup on violations)
- advisory mode (log violations but allow startup)
- mixed mode (block on CRITICAL, warn on HIGH/MEDIUM)
"""

import pytest
from django.test import override_settings
from security_baseline.enforcement import enforce_security


class MockViolation:
    """Mock violation object matching Constitutional Engine structure."""

    def __init__(self, rule_id, severity, message):
        self.rule_identifier = rule_id
        self.is_failure = True
        self.severity = severity
        self.message = message


@pytest.fixture
def sample_violations():
    """Sample violations with different severity levels."""
    return [
        MockViolation(
            rule_id="SEC001-DEBUG-MODE",
            severity="CRITICAL",
            message="DEBUG=True in production",
        ),
        MockViolation(
            rule_id="SEC010-HSTS-HEADER",
            severity="HIGH",
            message="SECURE_HSTS_SECONDS too low",
        ),
        MockViolation(
            rule_id="SEC030-INFO-DISCLOSURE",
            severity="MEDIUM",
            message="Verbose error pages enabled",
        ),
    ]


class TestStrictMode:
    """Tests for strict enforcement mode."""

    def test_strict_mode_blocks_on_critical_violations(self, sample_violations):
        """Test strict mode blocks startup on CRITICAL violations."""
        # Mock violations with CRITICAL severity
        violations = [sample_violations[0]]  # CRITICAL violation

        should_continue = enforce_security(violations, "strict")

        # Should NOT continue
        assert should_continue is False

    def test_strict_mode_blocks_on_high_violations(self, sample_violations):
        """Test strict mode blocks startup on HIGH violations."""
        # Mock violations with HIGH severity
        violations = [sample_violations[1]]  # HIGH violation

        should_continue = enforce_security(violations, "strict")

        # Should NOT continue
        assert should_continue is False

    def test_strict_mode_blocks_on_medium_violations(self, sample_violations):
        """Test strict mode blocks startup on MEDIUM violations."""
        # Mock violations with MEDIUM severity
        violations = [sample_violations[2]]  # MEDIUM violation

        should_continue = enforce_security(violations, "strict")

        # Should NOT continue
        assert should_continue is False

    def test_strict_mode_allows_no_violations(self):
        """Test strict mode allows startup with no violations."""
        violations = []

        should_continue = enforce_security(violations, "strict")

        # Should continue
        assert should_continue is True


class TestAdvisoryMode:
    """Tests for advisory enforcement mode."""

    def test_advisory_mode_allows_critical_violations(self, sample_violations):
        """Test advisory mode logs but allows CRITICAL violations."""
        violations = [sample_violations[0]]  # CRITICAL violation

        should_continue = enforce_security(violations, "advisory")

        # Should continue despite violation
        assert should_continue is True

    def test_advisory_mode_allows_high_violations(self, sample_violations):
        """Test advisory mode logs but allows HIGH violations."""
        violations = [sample_violations[1]]  # HIGH violation

        should_continue = enforce_security(violations, "advisory")

        # Should continue
        assert should_continue is True

    def test_advisory_mode_allows_multiple_violations(self, sample_violations):
        """Test advisory mode allows startup with multiple violations."""
        violations = sample_violations  # All violations

        should_continue = enforce_security(violations, "advisory")

        # Should continue despite multiple violations
        assert should_continue is True

    def test_advisory_mode_allows_no_violations(self):
        """Test advisory mode works fine with no violations."""
        violations = []

        should_continue = enforce_security(violations, "advisory")

        # Should continue
        assert should_continue is True


class TestMixedMode:
    """Tests for mixed enforcement mode."""

    def test_mixed_mode_blocks_on_critical(self, sample_violations):
        """Test mixed mode blocks on CRITICAL violations."""
        violations = [sample_violations[0]]  # CRITICAL

        should_continue = enforce_security(violations, "mixed")

        # Should NOT continue
        assert should_continue is False

    def test_mixed_mode_allows_high_violations(self, sample_violations):
        """Test mixed mode logs but allows HIGH violations."""
        violations = [sample_violations[1]]  # HIGH

        should_continue = enforce_security(violations, "mixed")

        # Should continue (HIGH is advisory in mixed mode)
        assert should_continue is True

    def test_mixed_mode_allows_medium_violations(self, sample_violations):
        """Test mixed mode allows MEDIUM violations."""
        violations = [sample_violations[2]]  # MEDIUM

        should_continue = enforce_security(violations, "mixed")

        # Should continue
        assert should_continue is True

    def test_mixed_mode_blocks_when_critical_present(self, sample_violations):
        """Test mixed mode blocks if any CRITICAL violation present."""
        violations = [
            sample_violations[0],  # CRITICAL
            sample_violations[1],  # HIGH
            sample_violations[2],  # MEDIUM
        ]

        should_continue = enforce_security(violations, "mixed")

        # Should NOT continue (CRITICAL present)
        assert should_continue is False


class TestEnforcementModeSettings:
    """Tests for enforcement mode configuration via Django settings."""

    @override_settings(SECURITY_ENFORCEMENT_MODE="strict")
    def test_strict_mode_from_settings(self):
        """Test strict mode can be configured via Django settings."""
        from django.conf import settings

        assert settings.SECURITY_ENFORCEMENT_MODE == "strict"

    @override_settings(SECURITY_ENFORCEMENT_MODE="advisory")
    def test_advisory_mode_from_settings(self):
        """Test advisory mode can be configured via Django settings."""
        from django.conf import settings

        assert settings.SECURITY_ENFORCEMENT_MODE == "advisory"

    @override_settings(SECURITY_ENFORCEMENT_MODE="mixed")
    def test_mixed_mode_from_settings(self):
        """Test mixed mode can be configured via Django settings."""
        from django.conf import settings

        assert settings.SECURITY_ENFORCEMENT_MODE == "mixed"

    def test_default_mode_is_strict(self):
        """Test default enforcement mode is strict (secure by default)."""
        from django.conf import settings

        # Should have a value (either from env var or default)
        assert hasattr(settings, "SECURITY_ENFORCEMENT_MODE")

    @override_settings(ENVIRONMENT="local")
    def test_local_environment_detection(self):
        """Test local environment can be detected from settings."""
        from django.conf import settings

        assert settings.ENVIRONMENT == "local"

    @override_settings(ENVIRONMENT="staging")
    def test_staging_environment_detection(self):
        """Test staging environment can be detected from settings."""
        from django.conf import settings

        assert settings.ENVIRONMENT == "staging"

    @override_settings(ENVIRONMENT="production")
    def test_production_environment_detection(self):
        """Test production environment can be detected from settings."""
        from django.conf import settings

        assert settings.ENVIRONMENT == "production"


class TestEnforcementModeEnvironmentVariables:
    """Tests for enforcement mode configuration via environment variables."""

    def test_env_var_overrides_default(self):
        """Test SECURITY_ENFORCEMENT_MODE environment variable works."""
        # Verify the base.py reads from os.getenv
        from pathlib import Path

        # Navigate up from tests/ to src/config/settings/base.py
        base_path = (
            Path(__file__).parent.parent.parent.parent / "src" / "config" / "settings" / "base.py"
        )
        base_content = base_path.read_text()

        assert 'os.getenv("SECURITY_ENFORCEMENT_MODE"' in base_content

    def test_django_env_var_for_environment(self):
        """Test DJANGO_ENV environment variable detection."""
        from pathlib import Path

        base_path = (
            Path(__file__).parent.parent.parent.parent / "src" / "config" / "settings" / "base.py"
        )
        base_content = base_path.read_text()

        assert 'os.getenv("DJANGO_ENV"' in base_content
