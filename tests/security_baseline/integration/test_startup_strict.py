"""Integration test for strict enforcement mode."""

import pytest
from django.test import override_settings


@pytest.mark.django_db
@override_settings(DEBUG=True, ENVIRONMENT="production", SECURITY_ENFORCEMENT_MODE="strict")
def test_debug_in_production_strict_mode():
    """Verify DEBUG=True in production with strict mode blocks startup."""
    from django.conf import settings
    from security_baseline.rules.django_settings import DebugModeProductionRule

    rule = DebugModeProductionRule()
    context = {"settings": settings, "environment": "production"}

    violation = rule.validate(context)

    assert violation is not None
    assert violation.severity == "CRITICAL"
    # In WP08, this will raise exception to block Django startup


@pytest.mark.django_db
@override_settings(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=False,
    SESSION_COOKIE_SAMESITE="None",
    CSRF_COOKIE_SECURE=False,
    CSRF_COOKIE_HTTPONLY=False,
    MIDDLEWARE=[],  # No CSRF middleware
    ENVIRONMENT="production",
    SECURITY_ENFORCEMENT_MODE="strict",
)
def test_insecure_session_csrf_config_strict_mode():
    """Verify insecure session/CSRF config generates multiple violations in strict mode."""
    from django.conf import settings
    from security_baseline.rules.session_security import (
        SessionCookieSecureRule,
        SessionCookieHttpOnlyRule,
        SessionCookieSameSiteRule,
    )
    from security_baseline.rules.csrf_protection import (
        CsrfCookieSecureRule,
        CsrfCookieHttpOnlyRule,
        CsrfMiddlewareEnabledRule,
    )

    context = {"settings": settings, "environment": "production"}
    violations = []

    # Validate session rules
    violations.append(SessionCookieSecureRule().validate(context))
    violations.append(SessionCookieHttpOnlyRule().validate(context))
    violations.append(SessionCookieSameSiteRule().validate(context))

    # Validate CSRF rules
    violations.append(CsrfCookieSecureRule().validate(context))
    violations.append(CsrfCookieHttpOnlyRule().validate(context))
    violations.append(CsrfMiddlewareEnabledRule().validate(context))

    # Filter out None values (passed rules)
    violations = [v for v in violations if v is not None]

    # All 6 rules should fail with this config
    assert len(violations) == 6
    assert all(v.severity in ["HIGH", "CRITICAL"] for v in violations)

    # Verify specific violations
    rule_ids = {v.rule_id for v in violations}
    expected_ids = {
        "SEC004-SESSION-COOKIE-SECURE",
        "SEC005-SESSION-COOKIE-HTTPONLY",
        "SEC006-SESSION-COOKIE-SAMESITE",
        "SEC007-CSRF-COOKIE-SECURE",
        "SEC008-CSRF-COOKIE-HTTPONLY",
        "SEC009-CSRF-MIDDLEWARE",
    }
    assert rule_ids == expected_ids
    # In WP08, these violations will block Django startup
