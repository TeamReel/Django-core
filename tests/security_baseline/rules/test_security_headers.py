"""Unit tests for security headers rules."""

import pytest
from unittest.mock import Mock

from security_baseline.rules.security_headers import (
    HSTSHeaderRule,
    ContentTypeNosniffRule,
    XFrameOptionsRule,
    XSSFilterRule,
    CSPHeaderRule,
    SSLRedirectRule,
)


class TestHSTSHeaderRule:
    """Test HSTSHeaderRule validation logic."""

    def test_hsts_too_short_in_production_fails(self):
        """Test that HSTS max-age < 1 year fails in production."""
        rule = HSTSHeaderRule()
        settings = Mock(SECURE_HSTS_SECONDS=3600)  # 1 hour
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC010-HSTS-HEADER"
        assert "too short" in violation.message

    def test_hsts_minimum_passes(self):
        """Test that HSTS max-age == 1 year passes."""
        rule = HSTSHeaderRule()
        settings = Mock(SECURE_HSTS_SECONDS=31536000)  # Exactly 1 year
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_hsts_longer_than_minimum_passes(self):
        """Test that HSTS max-age > 1 year passes."""
        rule = HSTSHeaderRule()
        settings = Mock(SECURE_HSTS_SECONDS=63072000)  # 2 years
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_hsts_zero_in_production_fails(self):
        """Test that HSTS max-age=0 fails in production."""
        rule = HSTSHeaderRule()
        settings = Mock(SECURE_HSTS_SECONDS=0)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_hsts_in_local_passes(self):
        """Test that HSTS check skipped in local environment."""
        rule = HSTSHeaderRule()
        settings = Mock(SECURE_HSTS_SECONDS=0)
        context = {"settings": settings, "environment": "local"}

        assert rule.validate(context) is None


class TestContentTypeNosniffRule:
    """Test ContentTypeNosniffRule validation logic."""

    def test_nosniff_false_fails(self):
        """Test that SECURE_CONTENT_TYPE_NOSNIFF=False fails."""
        rule = ContentTypeNosniffRule()
        settings = Mock(SECURE_CONTENT_TYPE_NOSNIFF=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC011-CONTENT-TYPE-NOSNIFF"

    def test_nosniff_true_passes(self):
        """Test that SECURE_CONTENT_TYPE_NOSNIFF=True passes."""
        rule = ContentTypeNosniffRule()
        settings = Mock(SECURE_CONTENT_TYPE_NOSNIFF=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_nosniff_missing_fails(self):
        """Test that missing SECURE_CONTENT_TYPE_NOSNIFF fails."""
        rule = ContentTypeNosniffRule()
        settings = Mock(spec=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_nosniff_applies_in_all_environments(self):
        """Test that nosniff rule applies in all environments."""
        rule = ContentTypeNosniffRule()
        settings = Mock(SECURE_CONTENT_TYPE_NOSNIFF=False)

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestXFrameOptionsRule:
    """Test XFrameOptionsRule validation logic."""

    def test_x_frame_options_deny_passes(self):
        """Test that X_FRAME_OPTIONS='DENY' passes."""
        rule = XFrameOptionsRule()
        settings = Mock(X_FRAME_OPTIONS="DENY")
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_x_frame_options_sameorigin_passes(self):
        """Test that X_FRAME_OPTIONS='SAMEORIGIN' passes."""
        rule = XFrameOptionsRule()
        settings = Mock(X_FRAME_OPTIONS="SAMEORIGIN")
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_x_frame_options_allow_from_fails(self):
        """Test that X_FRAME_OPTIONS='ALLOW-FROM' fails."""
        rule = XFrameOptionsRule()
        settings = Mock(X_FRAME_OPTIONS="ALLOW-FROM")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC012-X-FRAME-OPTIONS"

    def test_x_frame_options_none_fails(self):
        """Test that missing X_FRAME_OPTIONS fails."""
        rule = XFrameOptionsRule()
        settings = Mock(spec=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_x_frame_options_case_sensitive(self):
        """Test that X_FRAME_OPTIONS validation is case-sensitive."""
        rule = XFrameOptionsRule()

        # lowercase should fail
        settings = Mock(X_FRAME_OPTIONS="deny")
        context = {"settings": settings, "environment": "production"}
        violation = rule.validate(context)
        assert violation is not None


class TestXSSFilterRule:
    """Test XSSFilterRule validation logic."""

    def test_xss_filter_false_fails(self):
        """Test that SECURE_BROWSER_XSS_FILTER=False fails."""
        rule = XSSFilterRule()
        settings = Mock(SECURE_BROWSER_XSS_FILTER=False)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC013-XSS-FILTER"

    def test_xss_filter_true_passes(self):
        """Test that SECURE_BROWSER_XSS_FILTER=True passes."""
        rule = XSSFilterRule()
        settings = Mock(SECURE_BROWSER_XSS_FILTER=True)
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_xss_filter_missing_fails(self):
        """Test that missing SECURE_BROWSER_XSS_FILTER fails."""
        rule = XSSFilterRule()
        settings = Mock(spec=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_xss_filter_applies_in_all_environments(self):
        """Test that XSS filter rule applies in all environments."""
        rule = XSSFilterRule()
        settings = Mock(SECURE_BROWSER_XSS_FILTER=False)

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestCSPHeaderRule:
    """Test CSPHeaderRule validation logic."""

    def test_csp_with_unsafe_inline_fails(self):
        """Test that CSP with 'unsafe-inline' fails."""
        rule = CSPHeaderRule()
        settings = Mock(CSP_DEFAULT_SRC="'self' 'unsafe-inline'")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC014-CSP-HEADER"
        assert "unsafe-inline" in violation.message

    def test_csp_with_unsafe_eval_fails(self):
        """Test that CSP with 'unsafe-eval' fails."""
        rule = CSPHeaderRule()
        settings = Mock(CSP_SCRIPT_SRC="'self' 'unsafe-eval'")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "unsafe-eval" in violation.message

    def test_csp_safe_policy_passes(self):
        """Test that CSP without unsafe directives passes."""
        rule = CSPHeaderRule()
        settings = Mock(CSP_DEFAULT_SRC="'self'", CSP_SCRIPT_SRC="'self' https://cdn.example.com")
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_csp_no_policy_passes(self):
        """Test that missing CSP settings passes (CSP is optional)."""
        rule = CSPHeaderRule()
        settings = Mock(spec=[])
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_csp_list_format_with_unsafe_inline_fails(self):
        """Test that CSP as list with 'unsafe-inline' fails."""
        rule = CSPHeaderRule()
        settings = Mock(CSP_STYLE_SRC=["'self'", "'unsafe-inline'"])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_csp_multiple_directives_checked(self):
        """Test that CSP validates multiple directives."""
        rule = CSPHeaderRule()
        # default-src is safe, but script-src has unsafe-inline
        settings = Mock(CSP_DEFAULT_SRC="'self'", CSP_SCRIPT_SRC="'self' 'unsafe-inline'")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "script-src" in violation.message


class TestSSLRedirectRule:
    """Test SSLRedirectRule validation logic."""

    def test_ssl_redirect_false_in_production_fails(self):
        """Test that SECURE_SSL_REDIRECT=False fails in production."""
        rule = SSLRedirectRule()
        settings = Mock(
            SECURE_SSL_REDIRECT=False, SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https")
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC015-SSL-REDIRECT"

    def test_ssl_redirect_without_proxy_header_fails(self):
        """Test that SECURE_SSL_REDIRECT without proxy header fails."""
        rule = SSLRedirectRule()
        settings = Mock(SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER=None)
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "SECURE_PROXY_SSL_HEADER" in violation.message

    def test_ssl_redirect_with_invalid_proxy_header_fails(self):
        """Test that invalid proxy header format fails."""
        rule = SSLRedirectRule()
        settings = Mock(SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER="HTTP_X_FORWARDED_PROTO")
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_ssl_redirect_complete_config_passes(self):
        """Test that proper SSL redirect configuration passes."""
        rule = SSLRedirectRule()
        settings = Mock(
            SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https")
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_ssl_redirect_in_local_passes(self):
        """Test that SSL redirect check skipped in local environment."""
        rule = SSLRedirectRule()
        settings = Mock(SECURE_SSL_REDIRECT=False, SECURE_PROXY_SSL_HEADER=None)
        context = {"settings": settings, "environment": "local"}

        assert rule.validate(context) is None

    def test_ssl_redirect_alternative_proxy_header_passes(self):
        """Test that alternative proxy headers pass."""
        rule = SSLRedirectRule()
        settings = Mock(
            SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_SSL", "on")
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None
