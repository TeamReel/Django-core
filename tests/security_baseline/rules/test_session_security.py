"""Unit tests for session security rules."""

import pytest
from unittest.mock import Mock

from security_baseline.rules.session_security import (
    SessionCookieSecureRule,
    SessionCookieHttpOnlyRule,
    SessionCookieSameSiteRule,
)


class TestSessionCookieSecureRule:
    """Test SessionCookieSecureRule validation logic."""

    def test_secure_false_in_production_fails(self):
        """Test that SESSION_COOKIE_SECURE=False fails in production."""
        rule = SessionCookieSecureRule()
        settings = Mock(SESSION_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC004-SESSION-COOKIE-SECURE"
        assert "not enabled" in violation.message
        assert violation.severity == "HIGH"

    def test_secure_true_in_production_passes(self):
        """Test that SESSION_COOKIE_SECURE=True passes in production."""
        rule = SessionCookieSecureRule()
        settings = Mock(SESSION_COOKIE_SECURE=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_secure_false_in_local_passes(self):
        """Test that SESSION_COOKIE_SECURE=False passes in local environment."""
        rule = SessionCookieSecureRule()
        settings = Mock(SESSION_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "local"}

        assert rule.validate(context) is None

    def test_secure_false_in_staging_passes(self):
        """Test that SESSION_COOKIE_SECURE=False passes in staging environment."""
        rule = SessionCookieSecureRule()
        settings = Mock(SESSION_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "staging"}

        assert rule.validate(context) is None


class TestSessionCookieHttpOnlyRule:
    """Test SessionCookieHttpOnlyRule validation logic."""

    def test_httponly_false_fails(self):
        """Test that SESSION_COOKIE_HTTPONLY=False fails."""
        rule = SessionCookieHttpOnlyRule()
        settings = Mock(SESSION_COOKIE_HTTPONLY=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC005-SESSION-COOKIE-HTTPONLY"
        assert "not enabled" in violation.message

    def test_httponly_true_passes(self):
        """Test that SESSION_COOKIE_HTTPONLY=True passes."""
        rule = SessionCookieHttpOnlyRule()
        settings = Mock(SESSION_COOKIE_HTTPONLY=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_httponly_default_false_fails(self):
        """Test that missing SESSION_COOKIE_HTTPONLY defaults to False and fails."""
        rule = SessionCookieHttpOnlyRule()
        settings = Mock(spec=[])  # No SESSION_COOKIE_HTTPONLY attribute
        context = {"settings": settings, "environment": "local"}

        violation = rule.validate(context)

        assert violation is not None

    def test_httponly_applies_in_all_environments(self):
        """Test that HttpOnly rule applies in all environments."""
        rule = SessionCookieHttpOnlyRule()
        settings = Mock(SESSION_COOKIE_HTTPONLY=False)

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestSessionCookieSameSiteRule:
    """Test SessionCookieSameSiteRule validation logic."""

    def test_samesite_none_fails(self):
        """Test that SESSION_COOKIE_SAMESITE='None' fails."""
        rule = SessionCookieSameSiteRule()
        settings = Mock(SESSION_COOKIE_SAMESITE="None")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC006-SESSION-COOKIE-SAMESITE"
        assert "must be 'Strict' or 'Lax'" in violation.message

    def test_samesite_strict_passes(self):
        """Test that SESSION_COOKIE_SAMESITE='Strict' passes."""
        rule = SessionCookieSameSiteRule()
        settings = Mock(SESSION_COOKIE_SAMESITE="Strict")
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_samesite_lax_passes(self):
        """Test that SESSION_COOKIE_SAMESITE='Lax' passes."""
        rule = SessionCookieSameSiteRule()
        settings = Mock(SESSION_COOKIE_SAMESITE="Lax")
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_samesite_missing_fails(self):
        """Test that missing SESSION_COOKIE_SAMESITE (None) fails."""
        rule = SessionCookieSameSiteRule()
        settings = Mock(spec=[])  # No SESSION_COOKIE_SAMESITE attribute
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_samesite_empty_string_fails(self):
        """Test that empty string SESSION_COOKIE_SAMESITE fails."""
        rule = SessionCookieSameSiteRule()
        settings = Mock(SESSION_COOKIE_SAMESITE="")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_samesite_case_sensitive(self):
        """Test that SameSite validation is case-sensitive."""
        rule = SessionCookieSameSiteRule()

        # lowercase should fail
        settings = Mock(SESSION_COOKIE_SAMESITE="strict")
        context = {"settings": settings, "environment": "production"}
        violation = rule.validate(context)
        assert violation is not None

        # uppercase should fail
        settings = Mock(SESSION_COOKIE_SAMESITE="STRICT")
        violation = rule.validate(context)
        assert violation is not None
