"""Unit tests for CSRF protection rules."""

from unittest.mock import Mock

from security_baseline.rules.csrf_protection import (
    CsrfCookieHttpOnlyRule,
    CsrfCookieSecureRule,
    CsrfMiddlewareEnabledRule,
)


class TestCsrfCookieSecureRule:
    """Test CsrfCookieSecureRule validation logic."""

    def test_secure_false_in_production_fails(self):
        """Test that CSRF_COOKIE_SECURE=False fails in production."""
        rule = CsrfCookieSecureRule()
        settings = Mock(CSRF_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC007-CSRF-COOKIE-SECURE"
        assert "not enabled" in violation.message
        assert violation.severity == "HIGH"

    def test_secure_true_in_production_passes(self):
        """Test that CSRF_COOKIE_SECURE=True passes in production."""
        rule = CsrfCookieSecureRule()
        settings = Mock(CSRF_COOKIE_SECURE=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_secure_false_in_local_passes(self):
        """Test that CSRF_COOKIE_SECURE=False passes in local environment."""
        rule = CsrfCookieSecureRule()
        settings = Mock(CSRF_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "local"}

        assert rule.validate(context) is None

    def test_secure_false_in_staging_passes(self):
        """Test that CSRF_COOKIE_SECURE=False passes in staging environment."""
        rule = CsrfCookieSecureRule()
        settings = Mock(CSRF_COOKIE_SECURE=False)
        context = {"settings": settings, "environment": "staging"}

        assert rule.validate(context) is None


class TestCsrfCookieHttpOnlyRule:
    """Test CsrfCookieHttpOnlyRule validation logic."""

    def test_httponly_false_fails(self):
        """Test that CSRF_COOKIE_HTTPONLY=False fails."""
        rule = CsrfCookieHttpOnlyRule()
        settings = Mock(CSRF_COOKIE_HTTPONLY=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC008-CSRF-COOKIE-HTTPONLY"
        assert "not enabled" in violation.message

    def test_httponly_true_passes(self):
        """Test that CSRF_COOKIE_HTTPONLY=True passes."""
        rule = CsrfCookieHttpOnlyRule()
        settings = Mock(CSRF_COOKIE_HTTPONLY=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_httponly_default_false_fails(self):
        """Test that missing CSRF_COOKIE_HTTPONLY defaults to False and fails."""
        rule = CsrfCookieHttpOnlyRule()
        settings = Mock(spec=[])  # No CSRF_COOKIE_HTTPONLY attribute
        context = {"settings": settings, "environment": "local"}

        violation = rule.validate(context)

        assert violation is not None

    def test_httponly_applies_in_all_environments(self):
        """Test that HttpOnly rule applies in all environments."""
        rule = CsrfCookieHttpOnlyRule()
        settings = Mock(CSRF_COOKIE_HTTPONLY=False)

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestCsrfMiddlewareEnabledRule:
    """Test CsrfMiddlewareEnabledRule validation logic."""

    def test_middleware_missing_fails(self):
        """Test that missing CSRF middleware fails."""
        rule = CsrfMiddlewareEnabledRule()
        settings = Mock(
            MIDDLEWARE=[
                "django.middleware.security.SecurityMiddleware",
                "django.middleware.common.CommonMiddleware",
            ]
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC009-CSRF-MIDDLEWARE"
        assert "not enabled" in violation.message
        assert violation.severity == "CRITICAL"

    def test_middleware_present_passes(self):
        """Test that CSRF middleware present passes."""
        rule = CsrfMiddlewareEnabledRule()
        settings = Mock(
            MIDDLEWARE=[
                "django.middleware.security.SecurityMiddleware",
                "django.middleware.csrf.CsrfViewMiddleware",
                "django.middleware.common.CommonMiddleware",
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_middleware_empty_list_fails(self):
        """Test that empty MIDDLEWARE list fails."""
        rule = CsrfMiddlewareEnabledRule()
        settings = Mock(MIDDLEWARE=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_middleware_missing_attribute_fails(self):
        """Test that missing MIDDLEWARE attribute fails."""
        rule = CsrfMiddlewareEnabledRule()
        settings = Mock(spec=[])  # No MIDDLEWARE attribute
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_middleware_applies_in_all_environments(self):
        """Test that middleware rule applies in all environments."""
        rule = CsrfMiddlewareEnabledRule()
        settings = Mock(MIDDLEWARE=[])

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"

    def test_middleware_ordering_not_enforced(self):
        """Test that middleware ordering is not enforced, only presence."""
        rule = CsrfMiddlewareEnabledRule()

        # CSRF middleware at end of list
        settings = Mock(
            MIDDLEWARE=[
                "django.middleware.security.SecurityMiddleware",
                "django.middleware.common.CommonMiddleware",
                "django.middleware.csrf.CsrfViewMiddleware",
            ]
        )
        context = {"settings": settings, "environment": "production"}
        assert rule.validate(context) is None

        # CSRF middleware at beginning of list
        settings = Mock(
            MIDDLEWARE=[
                "django.middleware.csrf.CsrfViewMiddleware",
                "django.middleware.security.SecurityMiddleware",
                "django.middleware.common.CommonMiddleware",
            ]
        )
        context = {"settings": settings, "environment": "production"}
        assert rule.validate(context) is None
