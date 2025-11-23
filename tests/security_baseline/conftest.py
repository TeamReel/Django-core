"""Test configuration for security_baseline tests.

Provides fixtures and configuration for all security baseline tests.
WP14-T126: Comprehensive pytest fixtures for testing infrastructure.
"""

import tempfile
from pathlib import Path

import pytest
import yaml


@pytest.fixture
def mock_django_settings():
    """Provide mock Django settings for testing security rules."""
    return {
        "DEBUG": False,
        "SECRET_KEY": "django-insecure-test-key-min-50-chars" * 2,
        "ALLOWED_HOSTS": ["example.com"],
        "SESSION_COOKIE_SECURE": True,
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Strict",
        "CSRF_COOKIE_SECURE": True,
        "CSRF_COOKIE_HTTPONLY": True,
        "MIDDLEWARE": [
            "django.middleware.security.SecurityMiddleware",
            "django.middleware.csrf.CsrfViewMiddleware",
        ],
        "SECURE_HSTS_SECONDS": 31536000,
        "SECURE_CONTENT_TYPE_NOSNIFF": True,
        "X_FRAME_OPTIONS": "DENY",
        "SECURE_BROWSER_XSS_FILTER": True,
    }


@pytest.fixture
def mock_insecure_django_settings():
    """Provide insecure Django settings for testing violation detection.

    WP14-T126: Fixture for testing security rule violations.
    """
    return {
        "DEBUG": True,  # Violation: DEBUG in production
        "SECRET_KEY": "insecure-key",  # Violation: Too short
        "ALLOWED_HOSTS": ["*"],  # Violation: Wildcard
        "SESSION_COOKIE_SECURE": False,  # Violation: Not secure
        "SESSION_COOKIE_HTTPONLY": False,  # Violation: Not HttpOnly
        "SESSION_COOKIE_SAMESITE": None,  # Violation: No SameSite
        "CSRF_COOKIE_SECURE": False,  # Violation: Not secure
        "CSRF_COOKIE_HTTPONLY": False,  # Violation: Not HttpOnly
        "MIDDLEWARE": [],  # Violation: Missing CSRF middleware
        "SECURE_HSTS_SECONDS": 0,  # Violation: HSTS disabled
    }


@pytest.fixture
def mock_security_manifest():
    """Provide mock security manifest for testing manifest parsing."""
    return {
        "version": "1.0",
        "rules": {
            "SEC001-DEBUG-MODE": {
                "id": "SEC001-DEBUG-MODE",
                "severity": "CRITICAL",
                "enforcement_mode": "strict",
            }
        },
    }


@pytest.fixture
def temp_manifest_file(tmp_path):
    """Create a temporary manifest YAML file for testing.

    WP14-T126: Fixture for testing manifest file loading.

    Args:
        tmp_path: pytest's temporary directory fixture

    Returns:
        Path to temporary manifest file
    """
    manifest_content = {
        "version": "1.0",
        "environment": "local",
        "enforcement_mode": "advisory",
        "rules": {
            "SEC001-DEBUG-MODE": {
                "enabled": False,
                "enforcement_mode": "advisory",
            }
        },
        "exemptions": [],
    }

    manifest_file = tmp_path / "manifest.yaml"
    with open(manifest_file, "w") as f:
        yaml.dump(manifest_content, f)

    return manifest_file


@pytest.fixture
def mock_production_settings():
    """Provide production-grade Django settings for testing.

    WP14-T126: Fixture for testing production configuration validation.
    """
    return {
        "DEBUG": False,
        "SECRET_KEY": "django-insecure-prod-key-must-be-at-least-50-chars-long-for-security",
        "ALLOWED_HOSTS": ["example.com", "www.example.com"],
        "SESSION_COOKIE_SECURE": True,
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Strict",
        "CSRF_COOKIE_SECURE": True,
        "CSRF_COOKIE_HTTPONLY": True,
        "CSRF_USE_SESSIONS": True,
        "MIDDLEWARE": [
            "django.middleware.security.SecurityMiddleware",
            "django.contrib.sessions.middleware.SessionMiddleware",
            "django.middleware.common.CommonMiddleware",
            "django.middleware.csrf.CsrfViewMiddleware",
        ],
        "SECURE_HSTS_SECONDS": 31536000,
        "SECURE_HSTS_INCLUDE_SUBDOMAINS": True,
        "SECURE_HSTS_PRELOAD": True,
        "SECURE_CONTENT_TYPE_NOSNIFF": True,
        "SECURE_SSL_REDIRECT": True,
        "SECURE_PROXY_SSL_HEADER": ("HTTP_X_FORWARDED_PROTO", "https"),
        "X_FRAME_OPTIONS": "DENY",
        "SECURE_BROWSER_XSS_FILTER": True,
        "DATABASES": {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "OPTIONS": {"sslmode": "require"},
            }
        },
    }


@pytest.fixture
def mock_rule_violation():
    """Create a mock security rule violation for testing.

    WP14-T126: Fixture for testing violation handling and reporting.
    """
    from security_baseline.rules.base import SecurityRuleViolation

    return SecurityRuleViolation(
        rule_id="SEC001-DEBUG-MODE",
        message="DEBUG mode enabled in production",
        severity="CRITICAL",
        category="Django Settings",
        asvs_references=["V1.14.3"],
        remediation="Set DEBUG=False in production settings",
    )
