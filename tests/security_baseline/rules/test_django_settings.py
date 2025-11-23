"""Unit tests for Django settings security rules."""

from unittest.mock import Mock

from security_baseline.rules.django_settings import (
    AllowedHostsValidationRule,
    DebugModeProductionRule,
    SecretKeyValidationRule,
)


class TestDebugModeProductionRule:
    """Tests for DebugModeProductionRule."""

    def test_debug_true_in_production_fails(self):
        """Verify DEBUG=True in production fails validation."""
        rule = DebugModeProductionRule()
        settings = Mock(DEBUG=True)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC001-DEBUG-MODE"
        assert violation.severity == "CRITICAL"
        assert "DEBUG mode" in violation.message

    def test_debug_false_in_production_passes(self):
        """Verify DEBUG=False in production passes validation."""
        rule = DebugModeProductionRule()
        settings = Mock(DEBUG=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is None

    def test_debug_true_in_local_passes(self):
        """Verify DEBUG=True in local environment passes validation."""
        rule = DebugModeProductionRule()
        settings = Mock(DEBUG=True)
        context = {"settings": settings, "environment": "local"}

        violation = rule.validate(context)

        assert violation is None

    def test_debug_true_in_staging_passes(self):
        """Verify DEBUG=True in staging environment passes validation."""
        rule = DebugModeProductionRule()
        settings = Mock(DEBUG=True)
        context = {"settings": settings, "environment": "staging"}

        violation = rule.validate(context)

        assert violation is None


class TestSecretKeyValidationRule:
    """Tests for SecretKeyValidationRule."""

    def test_missing_secret_key_fails(self):
        """Verify missing SECRET_KEY fails validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(spec=[])  # No SECRET_KEY attribute
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "not set" in violation.message
        assert violation.rule_id == "SEC002-SECRET-KEY"

    def test_default_django_key_fails(self):
        """Verify Django default SECRET_KEY fails validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(SECRET_KEY="django-insecure-12345")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "default prefix" in violation.message

    def test_short_key_fails(self):
        """Verify short SECRET_KEY fails validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(SECRET_KEY="short")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "too short" in violation.message

    def test_minimum_length_key_passes(self):
        """Verify SECRET_KEY at minimum length passes validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(SECRET_KEY="a" * 50)  # Exactly 50 chars
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is None

    def test_valid_key_passes(self):
        """Verify valid SECRET_KEY passes validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(SECRET_KEY="a" * 51)  # 51 chars
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is None

    def test_empty_secret_key_fails(self):
        """Verify empty SECRET_KEY fails validation."""
        rule = SecretKeyValidationRule()
        settings = Mock(SECRET_KEY="")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "not set" in violation.message


class TestAllowedHostsValidationRule:
    """Tests for AllowedHostsValidationRule."""

    def test_wildcard_in_production_fails(self):
        """Verify wildcard in ALLOWED_HOSTS fails validation in production."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=["*"])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "wildcard" in violation.message
        assert violation.rule_id == "SEC003-ALLOWED-HOSTS"

    def test_empty_allowed_hosts_fails(self):
        """Verify empty ALLOWED_HOSTS fails validation in production."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "empty" in violation.message

    def test_valid_hosts_passes(self):
        """Verify valid ALLOWED_HOSTS passes validation."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=["example.com", "www.example.com"])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is None

    def test_single_valid_host_passes(self):
        """Verify single valid host passes validation."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=["example.com"])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is None

    def test_wildcard_in_local_passes(self):
        """Verify wildcard in ALLOWED_HOSTS passes validation in local environment."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=["*"])
        context = {"settings": settings, "environment": "local"}

        violation = rule.validate(context)

        assert violation is None

    def test_empty_hosts_in_local_passes(self):
        """Verify empty ALLOWED_HOSTS passes validation in local environment."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=[])
        context = {"settings": settings, "environment": "local"}

        violation = rule.validate(context)

        assert violation is None

    def test_wildcard_mixed_with_domains_fails(self):
        """Verify wildcard mixed with specific domains fails validation."""
        rule = AllowedHostsValidationRule()
        settings = Mock(ALLOWED_HOSTS=["example.com", "*"])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "wildcard" in violation.message
